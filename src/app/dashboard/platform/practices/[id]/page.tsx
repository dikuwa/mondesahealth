import { notFound } from "next/navigation";
import { PageHeading, Stat } from "@/components/dashboard";
import { PracticeDetailManager } from "@/components/practice-detail-manager";
import { PracticeOwnershipTransfer } from "@/components/practice-ownership-transfer";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PracticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlatformPermission("VIEW_PRACTICES");
  if (!session) notFound();
  const { id } = await params;
  const practice = await db.practice.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, patients: true, appointments: true, services: true, providers: true } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
      setting: { select: { email: true } },
    },
  });
  if (!practice) notFound();
  const independentOwnerReady = Boolean(await db.user.findFirst({
    where: { practiceId: practice.id, role: "OWNER", active: true, platformRole: null },
    select: { id: true },
  }));
  const legacyAccess = Boolean(await db.user.findFirst({ where: { id: session.id, practiceId: practice.id }, select: { id: true } }));
  return <>
    <PageHeading eyebrow="Platform practice management" title={practice.name} />
    <div className="dashboard-stats">
      <Stat label="Staff" value={practice._count.users} /><Stat label="Patients" value={practice._count.patients} />
      <Stat label="Appointments" value={practice._count.appointments} /><Stat label="Services" value={practice._count.services} />
      <Stat label="Providers" value={practice._count.providers} /><Stat label="Subscription" value={practice.subscriptions[0]?.plan.name || "Unassigned"} />
    </div>
    {session.platformPermissions.includes("MANAGE_PRACTICES") ? <PracticeDetailManager practice={practice} /> : <p className="notice-info">This role has read-only access to verified practice details.</p>}
    {session.platformPermissions.includes("MANAGE_PRACTICES") && <PracticeOwnershipTransfer practiceId={practice.id} practiceName={practice.name} registeredEmail={practice.email || practice.setting?.email || null} independentOwnerReady={independentOwnerReady} canFinalize={legacyAccess} />}
  </>;
}
