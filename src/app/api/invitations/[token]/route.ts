import { createHash } from "crypto";
import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/password";
import { roleDefaults } from "@/lib/permissions";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await db.userInvitation.findFirst({
    where: { tokenHash: tokenHash(token), acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { practice: { select: { name: true, status: true } } },
  });
  if (!invitation) return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 404 });
  const existing = await db.user.findUnique({ where: { email: invitation.email }, include: { platformMembership: true } });
  return NextResponse.json({ name: invitation.name, email: invitation.email, practice: invitation.practice.name, existingAccount: Boolean(existing), canLinkExisting: Boolean(existing?.platformMembership?.active) });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = z.object({ password: passwordSchema }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Choose a secure password." }, { status: 400 });
  const invitation = await db.userInvitation.findFirst({ where: { tokenHash: tokenHash(token), acceptedAt: null, expiresAt: { gt: new Date() } } });
  if (!invitation) return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 404 });
  const existing = await db.user.findUnique({ where: { email: invitation.email }, include: { platformMembership: true } });
  if (existing && !existing.platformMembership?.active) return NextResponse.json({ error: "That email already belongs to another practice account." }, { status: 409 });
  if (existing && !(await compare(parsed.data.password, existing.passwordHash))) return NextResponse.json({ error: "Enter the existing platform-account password to accept this practice membership." }, { status: 403 });
  // Password hashing intentionally happens before the database transaction so a
  // slow hash cannot exhaust the interactive-transaction timeout.
  const passwordHash = existing ? null : await hash(parsed.data.password, 12);
  try {
    await db.$transaction(async (tx) => {
      const user = existing || await tx.user.create({
        data: {
          name: invitation.name,
          email: invitation.email,
          passwordHash: passwordHash!,
          role: invitation.role,
          permissions: JSON.stringify(roleDefaults[invitation.role as keyof typeof roleDefaults] || []),
          practiceId: invitation.practiceId,
        },
      });
      await tx.practiceUser.upsert({ where: { practiceId_userId: { practiceId: invitation.practiceId, userId: user.id } }, create: { practiceId: invitation.practiceId, userId: user.id, role: invitation.role, permissions: JSON.stringify(roleDefaults[invitation.role as keyof typeof roleDefaults] || []) }, update: { role: invitation.role, permissions: JSON.stringify(roleDefaults[invitation.role as keyof typeof roleDefaults] || []), active: true } });
      await tx.userInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      await tx.activityLog.create({ data: { userId: user.id, practiceId: invitation.practiceId, action: "PRACTICE_INVITATION_ACCEPTED", entityType: "Practice", entityId: invitation.practiceId, summary: "Practice owner account activated" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Practice invitation acceptance failed", error);
    return NextResponse.json({ error: "The owner account could not be activated. Contact platform support." }, { status: 409 });
  }
}
