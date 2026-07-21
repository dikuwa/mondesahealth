import { PageHeading } from "@/components/dashboard";
import { StaffManager } from "@/components/staff-manager";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePermissions } from "@/lib/permissions";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Users(){const session=await requirePermission("MANAGE_USERS");if(!session)notFound();const users=await db.user.findMany({where:{practiceId:session.practiceId},orderBy:{createdAt:"asc"}});return <><PageHeading eyebrow="Access & permissions" title="Staff users"/><StaffManager currentId={session.id} currentRole={session.role} initial={users.map(user=>({...user,permissions:parsePermissions(user.permissions,user.role)}))}/></>}
