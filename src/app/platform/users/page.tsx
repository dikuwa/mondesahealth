import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PlatformUsersManager } from "@/components/platform-users-manager";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePlatformPermissions, type PlatformRole } from "@/lib/platform-permissions";

export default async function PlatformUsersPage() {
  const session = await requirePlatformPermission("MANAGE_PLATFORM_USERS");
  if (!session) notFound();
  const members = await db.platformMembership.findMany({ include: { user: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
  return <><PageHeading eyebrow="Platform administration" title="Platform team & roles"/><PlatformUsersManager canTransfer={session.platformPermissions.includes("TRANSFER_PLATFORM_OWNERSHIP")} members={members.map((member) => ({ id: member.id, userId: member.userId, name: member.user.name, email: member.user.email, role: member.role as PlatformRole, permissions: parsePlatformPermissions(member.permissions, member.role), active: member.active && member.user.active, isPrimary: member.isPrimary, createdAt: member.createdAt.toISOString() }))}/></>;
}
