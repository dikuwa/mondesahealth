import { createHash, randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/invitation-email";
import { requestAuditInfo } from "@/lib/tenant";

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
  z.object({ action: z.literal("READY"), practiceId: z.string().min(1) }),
  z.object({ action: z.literal("ROLLBACK_PREVIEW"), practiceId: z.string().min(1) }),
  z.object({
    action: z.literal("ROLLBACK"),
    practiceId: z.string().min(1),
    password: z.string().min(1).max(200),
    confirmation: z.literal("RESET HANDOVER SAFELY"),
  }),
]);

const temporaryPassword = () => `${randomBytes(12).toString("base64url")}!7a`;

async function recordCounts(practiceId: string) {
  const [patients, appointments, encounters, invoices, claims, services, content] = await Promise.all([
    db.patient.count({ where: { practiceId } }),
    db.appointment.count({ where: { practiceId } }),
    db.clinicalEncounter.count({ where: { practiceId } }),
    db.invoice.count({ where: { practiceId } }),
    db.claim.count({ where: { practiceId } }),
    db.departmentService.count({ where: { practiceId } }),
    db.practiceContent.count({ where: { practiceId } }),
  ]);
  return { patients, appointments, encounters, invoices, claims, services, content };
}

export async function POST(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PRACTICES");
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

  if (parsed.data.action === "ROLLBACK_PREVIEW" || parsed.data.action === "ROLLBACK") {
    if (!session.isPrimaryPlatformOwner)
      return NextResponse.json({ error: "Only the primary platform owner can reset a handover." }, { status: 403 });
    const ownerMembership = await db.practiceUser.findFirst({
      where: { practiceId: practice.id, role: "OWNER", active: true, userId: { not: session.id } },
      include: { user: { select: { id: true, email: true, name: true, passwordHash: true } } },
    });
    const counts = await recordCounts(practice.id);
    if (parsed.data.action === "ROLLBACK_PREVIEW") {
      return NextResponse.json({
        practice: { id: practice.id, name: practice.name, slug: practice.slug },
        independentOwner: ownerMembership ? { name: ownerMembership.user.name, email: ownerMembership.user.email } : null,
        preservedRecords: counts,
      });
    }
    const platformUser = await db.user.findUnique({ where: { id: session.id }, select: { passwordHash: true, email: true } });
    if (!platformUser || !(await compare(parsed.data.password, platformUser.passwordHash)))
      return NextResponse.json({ error: "Your platform password is incorrect." }, { status: 403 });
    if (!ownerMembership)
      return NextResponse.json({ error: "No active independent owner exists to roll back." }, { status: 409 });
    const platformPassword = temporaryPassword();
    const practicePassword = temporaryPassword();
    const rawToken = randomBytes(32).toString("base64url");
    const [platformHash, practiceHash] = await Promise.all([hash(platformPassword, 12), hash(practicePassword, 12)]);
    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.practiceHandover.updateMany({
        where: { practiceId: practice.id, status: { notIn: ["ROLLED_BACK"] } },
        data: { status: "ROLLED_BACK", rolledBackAt: now, rollbackReason: "Primary owner requested a safe handover reset" },
      });
      await tx.practiceUser.upsert({
        where: { practiceId_userId: { practiceId: practice.id, userId: session.id } },
        create: { practiceId: practice.id, userId: session.id, role: "OWNER", permissions: "[]", active: true },
        update: { role: "OWNER", permissions: "[]", active: true },
      });
      await tx.user.update({
        where: { id: session.id },
        data: { practiceId: practice.id, passwordHash: platformHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
      });
      await tx.practiceUser.update({ where: { id: ownerMembership.id }, data: { active: false } });
      await tx.user.update({
        where: { id: ownerMembership.user.id },
        data: { passwordHash: practiceHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
      });
      await tx.userInvitation.updateMany({
        where: { practiceId: practice.id, acceptedAt: null, expiresAt: { gt: now } },
        data: { expiresAt: new Date(0) },
      });
      await tx.userInvitation.create({
        data: {
          practiceId: practice.id,
          email: ownerMembership.user.email,
          name: ownerMembership.user.name,
          role: "OWNER",
          tokenHash: createHash("sha256").update(rawToken).digest("hex"),
          expiresAt: addDays(now, 7),
          invitedById: session.id,
        },
      });
      await tx.practiceHandover.create({
        data: { practiceId: practice.id, status: "OWNER_INVITED", ownerEmail: ownerMembership.user.email, invitedAt: now, createdById: session.id },
      });
      await tx.activityLog.create({
        data: {
          userId: session.id,
          action: "PRACTICE_HANDOVER_ROLLED_BACK",
          entityType: "Practice",
          entityId: practice.id,
          summary: `Safely reset the handover for ${practice.name}; all practice records were preserved`,
          requestInfo: requestAuditInfo(request),
        },
      });
    });
    return NextResponse.json({
      ok: true,
      credentials: {
        platform: { email: platformUser.email, password: platformPassword, loginUrl: "/platform/login" },
        practice: { email: ownerMembership.user.email, password: practicePassword, loginUrl: `/practices/${practice.slug}/login`, invitationUrl: `/invite/${rawToken}` },
      },
      preservedRecords: counts,
      sessionInvalidated: true,
    });
  }

  if (parsed.data.action === "INVITE") {
    const registeredEmail = practice.email || practice.setting?.email;
    const validEmail = z.string().email().safeParse(registeredEmail);
    if (!validEmail.success)
      return NextResponse.json({ error: "Add a registered practice email before inviting its owner." }, { status: 400 });
    const email = validEmail.data.toLowerCase();
    const existingOwner = await db.practiceUser.findFirst({
      where: { practiceId: practice.id, role: "OWNER", active: true, userId: { not: session.id } },
      select: { id: true },
    });
    if (existingOwner)
      return NextResponse.json({ error: "This practice already has an independent active owner." }, { status: 409 });
    const existingUser = await db.user.findUnique({ where: { email }, include: { practiceMemberships: true } });
    if (existingUser?.practiceMemberships.some((membership) => membership.active && membership.practiceId !== practice.id))
      return NextResponse.json({ error: "The registered email has active access to another practice." }, { status: 409 });
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
      const handover = await tx.practiceHandover.findFirst({ where: { practiceId: practice.id, status: { not: "ROLLED_BACK" } }, orderBy: { createdAt: "desc" } });
      if (handover) await tx.practiceHandover.update({ where: { id: handover.id }, data: { status: "OWNER_INVITED", ownerEmail: email, invitedAt: new Date() } });
      else await tx.practiceHandover.create({ data: { practiceId: practice.id, status: "OWNER_INVITED", ownerEmail: email, invitedAt: new Date(), createdById: session.id } });
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

  if (parsed.data.action === "READY") {
    const owner = await db.practiceUser.findFirst({ where: { practiceId: practice.id, role: "OWNER", active: true, userId: { not: session.id } } });
    if (!owner) return NextResponse.json({ error: "The practice owner must activate their account first." }, { status: 409 });
    const handover = await db.practiceHandover.findFirst({ where: { practiceId: practice.id, status: { in: ["OWNER_INVITED", "OWNER_ACTIVATED"] } }, orderBy: { createdAt: "desc" } });
    if (!handover) return NextResponse.json({ error: "Create an owner invitation first." }, { status: 409 });
    await db.$transaction([
      db.practiceHandover.update({ where: { id: handover.id }, data: { status: "READY", readyAt: new Date() } }),
      db.activityLog.create({ data: { userId: session.id, action: "PRACTICE_HANDOVER_READY", entityType: "Practice", entityId: practice.id, summary: `Verified ${practice.name} for handover`, requestInfo: requestAuditInfo(request) } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const independentOwner = await db.practiceUser.findFirst({
    where: { practiceId: practice.id, role: "OWNER", active: true, userId: { not: session.id } },
    select: { userId: true },
  });
  const legacyUser = await db.practiceUser.findFirst({ where: { userId: session.id, practiceId: practice.id, active: true }, select: { id: true } });
  if (!legacyUser || !independentOwner)
    return NextResponse.json({ error: "The independent practice owner must accept the invitation first." }, { status: 409 });
  const handover = await db.practiceHandover.findFirst({ where: { practiceId: practice.id, status: "READY" }, orderBy: { createdAt: "desc" } });
  if (!handover) return NextResponse.json({ error: "Verify the practice setup before finalising handover." }, { status: 409 });
  await db.$transaction([
    db.practiceUser.updateMany({
      where: { practiceId: practice.id, userId: session.id },
      data: { active: false },
    }),
    db.user.update({
      where: { id: session.id },
      data: { practiceId: null, sessionVersion: { increment: 1 } },
    }),
    db.practiceHandover.update({ where: { id: handover.id }, data: { status: "COMPLETED", completedAt: new Date(), completedById: session.id } }),
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
