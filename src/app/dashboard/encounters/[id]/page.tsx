import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { EncounterEditor } from "@/components/encounter-editor";
import { EncounterAttachments } from "@/components/encounter-attachments";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function EncounterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("VIEW_CLINICAL_RECORDS");
  if (!session) notFound();
  const { id } = await params;
  const encounter = await db.clinicalEncounter.findFirst({
    where: { id, practiceId: session.practiceId },
    include: {
      patient: true,
      diagnoses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      attachments: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!encounter) notFound();
  return (
    <>
      <PageHeading
        eyebrow="Clinical encounter"
        title={`${encounter.patient.fullName} · ${encounter.startedAt.toLocaleDateString("en-NA")}`}
      />
      <EncounterEditor
        patientName={encounter.patient.fullName}
        initial={{
          ...encounter,
          patientId: encounter.patientId,
          appointmentId: encounter.appointmentId || undefined,
        }}
      />
      <EncounterAttachments
        encounterId={encounter.id}
        initial={encounter.attachments}
        readOnly={["COMPLETED", "AMENDED"].includes(encounter.status)}
      />
    </>
  );
}
