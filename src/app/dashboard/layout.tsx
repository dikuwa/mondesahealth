import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSession, hasSessionCookie } from "@/lib/auth";
export default async function DashboardLayout({children}:{children:React.ReactNode}){const hadCookie=await hasSessionCookie();const session=await getSession();if(!session)redirect(hadCookie?"/login?reason=session-expired":"/login");return <DashboardShell name={session.name} role={session.role} permissions={session.permissions} avatarData={session.avatarData} platformRole={session.platformRole}>{children}</DashboardShell>}
