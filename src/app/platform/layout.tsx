import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform-shell";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformOwner();
  if (!session) redirect("/login");
  const memberships = await db.practiceUser.findMany({
    where: { userId: session.id, active: true },
    include: { practice: { select: { id: true, name: true } } },
    orderBy: { practice: { name: "asc" } },
  });
  return (
    <PlatformShell
      user={{ name: session.name, avatarData: session.avatarData }}
      role={session.platformRole}
      permissions={session.platformPermissions}
      practices={memberships.map(({ practice }) => practice)}
    >
      {children}
    </PlatformShell>
  );
}
