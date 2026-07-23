import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PracticeRecordView } from "@/components/practice-record-view";
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
      handovers: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!practice) notFound();

  const independentOwnerReady = Boolean(await db.practiceUser.findFirst({
    where: { practiceId: practice.id, role: "OWNER", active: true, userId: { not: session.id } },
    select: { id: true },
  }));
  const legacyAccess = Boolean(await db.practiceUser.findFirst({
    where: { userId: session.id, practiceId: practice.id, active: true },
    select: { id: true },
  }));
  const handoverStatus = practice.handovers[0]?.status ||
    (independentOwnerReady && !legacyAccess ? "COMPLETED" : "DRAFT");

  return (
    <>
      <PageHeading
        eyebrow="Platform practice management"
        title={practice.name}
      />
      <PracticeRecordView
        practice={{
          id: practice.id,
          name: practice.name,
          type: practice.type,
          slug: practice.slug,
          ownerName: practice.ownerName,
          email: practice.email,
          phone: practice.phone,
          whatsapp: practice.whatsapp,
          registrationNumber: practice.registrationNumber,
          licenceInformation: practice.licenceInformation,
          address: practice.address,
          town: practice.town,
          region: practice.region,
          description: practice.description,
          status: practice.status,
          publicVisible: practice.publicVisible,
          suspensionReason: practice.suspensionReason,
          createdAt: practice.createdAt.toISOString(),
          activatedAt: practice.activatedAt?.toISOString() ?? null,
          _count: practice._count,
          subscription: practice.subscriptions[0]
            ? {
                planName: practice.subscriptions[0].plan.name,
                status: practice.subscriptions[0].status,
              }
            : null,
        }}
        canManage={session.platformPermissions.includes("MANAGE_PRACTICES")}
      />
      {session.platformPermissions.includes("MANAGE_PRACTICES") && (
        <PracticeOwnershipTransfer
          practiceId={practice.id}
          practiceName={practice.name}
          registeredEmail={practice.email || practice.setting?.email || null}
          independentOwnerReady={independentOwnerReady}
          canFinalize={legacyAccess}
          handoverStatus={handoverStatus}
          publicUrl={`/practices/${practice.slug}`}
          isPrimaryPlatformOwner={session.isPrimaryPlatformOwner}
        />
      )}
    </>
  );
}
