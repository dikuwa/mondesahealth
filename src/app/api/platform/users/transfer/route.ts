import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLATFORM_PERMISSIONS, platformRoleDefaults } from "@/lib/platform-permissions";
import { requestAuditInfo } from "@/lib/tenant";

export async function POST(request: Request) {
  const session = await requirePlatformPermission("TRANSFER_PLATFORM_OWNERSHIP");
  if (!session?.isPrimaryPlatformOwner) return NextResponse.json({ error: "Only the Primary Owner can transfer platform ownership." }, { status: 403 });
  const parsed = z.object({ targetMembershipId: z.string().min(1), password: z.string().min(1), confirmation: z.literal("TRANSFER PLATFORM OWNERSHIP") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your password and the exact transfer confirmation." }, { status: 400 });
  const [actor, current, target] = await Promise.all([
    db.user.findUnique({ where: { id: session.id } }),
    db.platformMembership.findUnique({ where: { userId: session.id } }),
    db.platformMembership.findUnique({ where: { id: parsed.data.targetMembershipId }, include: { user: true } }),
  ]);
  if (!actor || !(await compare(parsed.data.password, actor.passwordHash))) return NextResponse.json({ error: "Your password is incorrect." }, { status: 403 });
  if (!current?.isPrimary || !target?.active || target.isPrimary || !target.user.active) return NextResponse.json({ error: "Choose an active eligible platform-team member." }, { status: 409 });
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.allow_primary_owner_transfer', 'true', true)`;
    await tx.platformMembership.update({ where: { id: current.id }, data: { isPrimary: false, role: "PLATFORM_ADMIN", permissions: JSON.stringify(platformRoleDefaults.PLATFORM_ADMIN) } });
    await tx.platformMembership.update({ where: { id: target.id }, data: { isPrimary: true, role: "PRIMARY_OWNER", permissions: JSON.stringify(PLATFORM_PERMISSIONS) } });
    await tx.user.update({ where: { id: actor.id }, data: { platformRole: null, sessionVersion: { increment: 1 } } });
    await tx.user.update({ where: { id: target.userId }, data: { platformRole: "PLATFORM_OWNER", sessionVersion: { increment: 1 } } });
    await tx.activityLog.create({ data: { userId: actor.id, practiceId: null, action: "PLATFORM_OWNERSHIP_TRANSFERRED", entityType: "User", entityId: target.userId, summary: `Transferred Primary Owner status to ${target.user.name}`, requestInfo: requestAuditInfo(request) } });
  });
  return NextResponse.json({ ok: true, sessionInvalidated: true });
}
