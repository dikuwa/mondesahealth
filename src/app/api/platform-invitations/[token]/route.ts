import { createHash } from "crypto";
import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { passwordSchema } from "@/lib/password";
import { db } from "@/lib/db";

const lookup = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invitation = await db.platformInvitation.findUnique({ where: { tokenHash: lookup(token) } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
    return NextResponse.json({ error: "This platform invitation is invalid or has expired." }, { status: 404 });
  }
  const existing = await db.user.findUnique({ where: { email: invitation.email } });
  return NextResponse.json({ name: invitation.name, email: invitation.email, role: invitation.role, existingAccount: Boolean(existing), passwordReset: invitation.kind === "PASSWORD_RESET" });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const parsed = passwordSchema.safeParse((await request.json().catch(() => null))?.password);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Enter a secure password." }, { status: 400 });
  const invitation = await db.platformInvitation.findUnique({ where: { tokenHash: lookup(token) } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "This platform invitation is invalid or has expired." }, { status: 404 });
  const existing = await db.user.findUnique({ where: { email: invitation.email }, include: { platformMembership: true } });
  if (invitation.kind === "PASSWORD_RESET") {
    if (!existing?.platformMembership?.active || !existing.active) return NextResponse.json({ error: "This account is no longer eligible for password reset." }, { status: 409 });
    await db.$transaction([
      db.user.update({ where: { id: existing.id }, data: { passwordHash: await hash(parsed.data, 12), mustChangePassword: false, sessionVersion: { increment: 1 } } }),
      db.platformInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
      db.activityLog.create({ data: { userId: existing.id, practiceId: null, action: "PLATFORM_PASSWORD_RESET_COMPLETED", entityType: "User", entityId: existing.id, summary: "Completed secure platform password reset" } }),
    ]);
    return NextResponse.json({ ok: true, passwordReset: true });
  }
  if (existing?.platformMembership) return NextResponse.json({ error: "This account already has platform access." }, { status: 409 });
  if (existing && !(await compare(parsed.data, existing.passwordHash))) return NextResponse.json({ error: "Enter the existing account password to accept this invitation." }, { status: 403 });
  const passwordHash = existing ? null : await hash(parsed.data, 12);
  await db.$transaction(async (tx) => {
    const user = existing || await tx.user.create({
      data: {
        name: invitation.name,
        email: invitation.email,
        passwordHash: passwordHash!,
        role: "RECEPTIONIST",
        permissions: "[]",
        practiceId: null,
        mustChangePassword: false,
      },
    });
    await tx.platformMembership.create({ data: { userId: user.id, role: invitation.role, permissions: invitation.permissions, active: true, isPrimary: false } });
    await tx.platformInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await tx.activityLog.create({ data: { userId: user.id, practiceId: null, action: "PLATFORM_INVITATION_ACCEPTED", entityType: "User", entityId: user.id, summary: `Activated ${invitation.role} platform access` } });
  });
  return NextResponse.json({ ok: true });
}
