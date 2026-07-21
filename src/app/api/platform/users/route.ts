import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLES,
  canGrantPlatformPermissions,
  platformRoleDefaults,
  type PlatformPermission,
  type PlatformRole,
} from "@/lib/platform-permissions";
import { requestAuditInfo } from "@/lib/tenant";

const role = z.enum(PLATFORM_ROLES.filter((item) => item !== "PRIMARY_OWNER") as [Exclude<PlatformRole, "PRIMARY_OWNER">, ...Exclude<PlatformRole, "PRIMARY_OWNER">[]]);
const permissions = z.array(z.enum(PLATFORM_PERMISSIONS));
const createInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  role,
  permissions: permissions.optional(),
});
const updateInput = z.object({
  id: z.string().min(1),
  role: role.optional(),
  permissions: permissions.optional(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PLATFORM_USERS");
  if (!session) return NextResponse.json({ error: "Platform-team administration is required." }, { status: 403 });
  const parsed = createInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the invitation details." }, { status: 400 });
  const requested = (parsed.data.permissions || platformRoleDefaults[parsed.data.role]) as PlatformPermission[];
  if (!canGrantPlatformPermissions(session.platformPermissions, requested)) {
    return NextResponse.json({ error: "You cannot grant platform permissions you do not hold." }, { status: 403 });
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, include: { platformMembership: true } });
  if (existing?.platformMembership) return NextResponse.json({ error: "That account already belongs to the platform team." }, { status: 409 });
  const rawToken = randomBytes(32).toString("base64url");
  await db.$transaction(async (tx) => {
    await tx.platformInvitation.updateMany({
      where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date(0) },
    });
    await tx.platformInvitation.create({
      data: {
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        permissions: JSON.stringify(requested),
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        invitedById: session.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: null,
        action: "PLATFORM_USER_INVITED",
        entityType: "PlatformInvitation",
        entityId: email,
        summary: `Invited ${parsed.data.name} as ${parsed.data.role}`,
        requestInfo: requestAuditInfo(request),
      },
    });
  });
  return NextResponse.json({ inviteUrl: `/platform-invite/${rawToken}` }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PLATFORM_USERS");
  if (!session) return NextResponse.json({ error: "Platform-team administration is required." }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a platform-team member." }, { status: 400 });
  const target = await db.platformMembership.findUnique({ where: { id: parsed.data.id }, include: { user: true } });
  if (!target) return NextResponse.json({ error: "Platform-team member not found." }, { status: 404 });
  if (target.isPrimary && target.userId !== session.id) return NextResponse.json({ error: "Only the Primary Owner can reset their own password from Profile & security." }, { status: 409 });
  if (!target.active || !target.user.active) return NextResponse.json({ error: "Enable this account before issuing a password-reset invitation." }, { status: 409 });
  const rawToken = randomBytes(32).toString("base64url");
  await db.$transaction(async (tx) => {
    await tx.platformInvitation.updateMany({ where: { email: target.user.email, kind: "PASSWORD_RESET", acceptedAt: null, expiresAt: { gt: new Date() } }, data: { expiresAt: new Date(0) } });
    await tx.platformInvitation.create({ data: { email: target.user.email, name: target.user.name, role: target.role, kind: "PASSWORD_RESET", permissions: target.permissions, tokenHash: createHash("sha256").update(rawToken).digest("hex"), invitedById: session.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await tx.activityLog.create({ data: { userId: session.id, practiceId: null, action: "PLATFORM_PASSWORD_RESET_INVITED", entityType: "User", entityId: target.userId, summary: `Issued a password-reset invitation for ${target.user.email}`, requestInfo: requestAuditInfo(request) } });
  });
  return NextResponse.json({ inviteUrl: `/platform-invite/${rawToken}`, passwordReset: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PLATFORM_USERS");
  if (!session) return NextResponse.json({ error: "Platform-team administration is required." }, { status: 403 });
  const parsed = updateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the platform-team changes." }, { status: 400 });
  const target = await db.platformMembership.findUnique({ where: { id: parsed.data.id }, include: { user: true } });
  if (!target) return NextResponse.json({ error: "Platform-team member not found." }, { status: 404 });
  if (target.isPrimary) return NextResponse.json({ error: "The Primary Owner can only be changed through protected ownership transfer." }, { status: 409 });
  if (target.userId === session.id && parsed.data.active === false) return NextResponse.json({ error: "You cannot disable your own signed-in platform access." }, { status: 400 });
  const nextRole = (parsed.data.role || target.role) as PlatformRole;
  const requested = (parsed.data.permissions || (parsed.data.role ? platformRoleDefaults[nextRole] : JSON.parse(target.permissions))) as PlatformPermission[];
  if (!canGrantPlatformPermissions(session.platformPermissions, requested)) {
    return NextResponse.json({ error: "You cannot grant platform permissions you do not hold." }, { status: 403 });
  }
  await db.$transaction([
    db.platformMembership.update({
      where: { id: target.id },
      data: { role: nextRole, permissions: JSON.stringify(requested), active: parsed.data.active },
    }),
    db.user.update({ where: { id: target.userId }, data: { sessionVersion: { increment: 1 } } }),
    db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: null,
        action: "PLATFORM_USER_UPDATED",
        entityType: "User",
        entityId: target.userId,
        summary: `Updated platform access for ${target.user.email}`,
        requestInfo: requestAuditInfo(request),
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PLATFORM_USERS");
  if (!session) return NextResponse.json({ error: "Platform-team administration is required." }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1), confirmation: z.literal("REMOVE PLATFORM ACCESS") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type REMOVE PLATFORM ACCESS to confirm." }, { status: 400 });
  const target = await db.platformMembership.findUnique({ where: { id: parsed.data.id }, include: { user: true } });
  if (!target) return NextResponse.json({ error: "Platform-team member not found." }, { status: 404 });
  if (target.isPrimary) return NextResponse.json({ error: "The Primary Owner cannot be deleted." }, { status: 409 });
  if (target.userId === session.id) return NextResponse.json({ error: "You cannot remove your own signed-in platform access." }, { status: 400 });
  const [practiceMemberships, references] = await Promise.all([
    db.practiceUser.count({ where: { userId: target.userId } }),
    db.activityLog.count({ where: { userId: target.userId } }),
  ]);
  try {
    await db.$transaction(async (tx) => {
      await tx.platformMembership.delete({ where: { id: target.id } });
      if (!practiceMemberships && !references && !target.user.practiceId) await tx.user.delete({ where: { id: target.userId } });
      else await tx.user.update({ where: { id: target.userId }, data: { platformRole: null, sessionVersion: { increment: 1 } } });
      await tx.activityLog.create({
        data: {
          userId: session.id,
          practiceId: null,
          action: "PLATFORM_USER_REMOVED",
          entityType: "User",
          entityId: target.userId,
          summary: `Removed platform access for ${target.user.email}`,
          requestInfo: requestAuditInfo(request),
        },
      });
    });
    return NextResponse.json({ ok: true, accountRetained: Boolean(practiceMemberships || references || target.user.practiceId) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) console.error("Remove platform user failed", error.code);
    return NextResponse.json({ error: "Could not safely remove platform access." }, { status: 500 });
  }
}
