import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { EncounterEditor } from "@/components/encounter-editor";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function NewEncounter({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; appointment?: string }>;
}) {
  const session = await requirePermission("MANAGE_CLINICAL_RECORDS");
  if (!session) notFound();
  const query = await searchParams;
  const appointment = query.appointment
    ? await db.appointment.findFirst({
        where: { id: query.appointment, practiceId: session.practiceId },
        include: { patient: true, patientIntake: true, encounters: { include: { diagnoses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } } } },
      })
    : null;
  if (appointment?.encounters[0])
    return (
      <EncounterEditor
        patientName={appointment.patient.fullName}
        initial={{
          ...appointment.encounters[0],
          patientId: appointment.patientId,
          appointmentId: appointment.id,
        }}
      />
    );
  const patient =
    appointment?.patient ||
    (await db.patient.findFirst({
      where: {
        id: query.patient,
        practiceId: session.practiceId,
        archivedAt: null,
      },
    }));
  if (!patient) notFound();
  return (
    <>
      <PageHeading eyebrow="Consultation" title="New clinical encounter" />
      <EncounterEditor
        patientName={patient.fullName}
        initial={{
          patientId: patient.id,
          appointmentId: appointment?.id,
          presentingComplaint: appointment?.reason,
          patientReportedHistory: appointment?.patientIntake?.originalReason,
          aiBookingSummary: appointment?.patientIntake?.approvedSummary,
        }}
      />
    </>
  );
}
