import { PageHeading } from "@/components/dashboard";
import { StaffManager } from "@/components/staff-manager";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePermissions } from "@/lib/permissions";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Users(){const session=await requirePermission("MANAGE_USERS");if(!session)notFound();const memberships=await db.practiceUser.findMany({where:{practiceId:session.practiceId},include:{user:{include:{platformMembership:true}}},orderBy:{createdAt:"asc"}});return <><PageHeading eyebrow="Access & permissions" title="Staff users"/><StaffManager currentId={session.id} currentRole={session.role} initial={memberships.map(({user,...membership})=>({id:user.id,name:user.name,email:user.email,role:membership.role,permissions:parsePermissions(membership.permissions,membership.role),active:membership.active&&user.active,mustChangePassword:user.mustChangePassword,avatarData:user.avatarData,platformAccount:Boolean(user.platformMembership)}))}/></>}
