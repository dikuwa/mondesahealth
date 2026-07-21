import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getPracticeSession, hasSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hadCookie = await hasSessionCookie();
  const session = await getPracticeSession();
  if (!session) redirect(hadCookie ? "/platform" : "/login");
  const practice = await db.practice.findUnique({
    where: { id: session.practiceId },
    select: {
      name: true,
      type: true,
      logoData: true,
      slug: true,
      setting: { select: { practiceName: true } },
    },
  });
  if (!practice) redirect("/login?reason=session-expired");
  const memberships = await db.practiceUser.findMany({
    where: { userId: session.id, active: true },
    include: { practice: { select: { id: true, name: true } } },
    orderBy: { practice: { name: "asc" } },
  });
  return (
    <DashboardShell
      name={session.name}
      role={session.role}
      permissions={session.permissions}
      avatarData={session.avatarData}
      practice={{
        id: session.practiceId,
        name: practice.setting?.practiceName || practice.name,
        type: practice.type,
        logoData: practice.logoData,
        slug: practice.slug,
      }}
      hasPlatformAccess={session.hasPlatformAccess}
      workspaces={memberships.map(({ practice: workspace }) => workspace)}
    >
      {children}
    </DashboardShell>
  );
}
