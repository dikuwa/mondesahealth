import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/invitation-email";
import { requestAuditInfo } from "@/lib/tenant";
import { canFinalizePlatformSeparation } from "@/lib/account-scope";

const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("INVITE"),
    practiceId: z.string().min(1),
    sendInvitationEmail: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("FINALIZE"),
    practiceId: z.string().min(1),
    confirmation: z.literal("SEPARATE PLATFORM AND PRACTICE"),
  }),
]);

export async function POST(request: Request) {
  const session = await requirePlatformOwner();
  if (!session)
    return NextResponse.json({ error: "Platform-owner access is required." }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Check the ownership-transfer request." }, { status: 400 });
  const practice = await db.practice.findUnique({
    where: { id: parsed.data.practiceId },
    include: { setting: { select: { email: true } } },
  });
  if (!practice) return NextResponse.json({ error: "Practice not found." }, { status: 404 });

  if (parsed.data.action === "INVITE") {
    const registeredEmail = practice.email || practice.setting?.email;
    const validEmail = z.string().email().safeParse(registeredEmail);
    if (!validEmail.success)
      return NextResponse.json({ error: "Add a registered practice email before inviting its owner." }, { status: 400 });
    const email = validEmail.data.toLowerCase();
    const existingOwner = await db.user.findFirst({
      where: { practiceId: practice.id, role: "OWNER", active: true, platformRole: null },
      select: { id: true },
    });
    if (existingOwner)
      return NextResponse.json({ error: "This practice already has an independent active owner." }, { status: 409 });
    if (await db.user.findUnique({ where: { email } }))
      return NextResponse.json({ error: "The registered practice email already belongs to another account." }, { status: 409 });
    const rawToken = randomBytes(32).toString("base64url");
    await db.$transaction(async (tx) => {
      if (!practice.email) await tx.practice.update({ where: { id: practice.id }, data: { email } });
      await tx.userInvitation.updateMany({
        where: { practiceId: practice.id, email, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date(0) },
      });
      await tx.userInvitation.create({
        data: {
          practiceId: practice.id,
          email,
          name: practice.ownerName || "Practice owner",
          role: "OWNER",
          tokenHash: createHash("sha256").update(rawToken).digest("hex"),
          expiresAt: addDays(new Date(), 7),
          invitedById: session.id,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: session.id,
          practiceId: null,
          action: "PRACTICE_OWNER_TRANSFER_INVITED",
          entityType: "Practice",
          entityId: practice.id,
          summary: `Invited the registered owner for ${practice.name}`,
          requestInfo: requestAuditInfo(request),
        },
      });
    });
    const invitePath = `/invite/${rawToken}`;
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin}${invitePath}`;
    const emailDelivery = parsed.data.sendInvitationEmail
      ? await sendInvitationEmail({
          to: email,
          name: practice.ownerName || "Practice owner",
          practiceName: practice.name,
          inviteUrl,
        }).catch(() => ({ sent: false as const, reason: "Invitation created, but email delivery failed." }))
      : null;
    return NextResponse.json({ inviteUrl: invitePath, emailDelivery });
  }

  const independentOwner = await db.user.findFirst({
    where: { practiceId: practice.id, role: "OWNER", active: true, platformRole: null },
    select: { id: true },
  });
  if (!canFinalizePlatformSeparation({
    scope: session.scope,
    sessionPracticeId: session.practiceId,
    targetPracticeId: practice.id,
    hasIndependentOwner: Boolean(independentOwner),
  }))
    return NextResponse.json({ error: "The independent practice owner must accept the invitation first." }, { status: 409 });
  await db.$transaction([
    db.practiceUser.updateMany({
      where: { practiceId: practice.id, userId: session.id },
      data: { active: false },
    }),
    db.user.update({
      where: { id: session.id },
      data: { practiceId: null, sessionVersion: { increment: 1 } },
    }),
    db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: null,
        action: "PLATFORM_PRACTICE_SEPARATION_COMPLETED",
        entityType: "Practice",
        entityId: practice.id,
        summary: `Separated platform ownership from ${practice.name}`,
        requestInfo: requestAuditInfo(request),
      },
    }),
  ]);
  return NextResponse.json({ ok: true, sessionInvalidated: true });
}
