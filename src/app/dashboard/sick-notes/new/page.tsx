import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { SickNoteForm } from "@/components/sick-note-form";
import { db } from "@/lib/db";
import { requireSickNoteManager } from "@/lib/sick-note-access";

export const dynamic = "force-dynamic";
export default async function NewSickNote({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; appointment?: string }>;
}) {
  const session = await requireSickNoteManager();
  if (!session) redirect("/dashboard/sick-notes");
  const query = await searchParams;
  const [patients, appointments, doctors] = await Promise.all([
    db.patient.findMany({
      where: { practiceId: session.practiceId, archivedAt: null },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, patientNumber: true },
    }),
    db.appointment.findMany({
      where: { practiceId: session.practiceId },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        patientId: true,
        reference: true,
        startAt: true,
        preferredDate: true,
      },
    }),
    db.user.findMany({
      where: { practiceId: session.practiceId, active: true, role: { in: ["OWNER", "ADMIN", "DOCTOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);
  const linked = appointments.find((item) => item.id === query.appointment);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const consultation = linked?.startAt || linked?.preferredDate;
  return (
    <>
      <PageHeading eyebrow="Clinical documents" title="Create sick note" />
      <SickNoteForm
        patients={patients.map((item) => ({
          id: item.id,
          label: `${item.fullName} · ${item.patientNumber}`,
        }))}
        appointments={appointments.map((item) => ({
          id: item.id,
          patientId: item.patientId,
          label: `${item.reference} · ${item.startAt ? item.startAt.toLocaleString("en-NA") : "Date pending"}`,
          consultationDate: (item.startAt || item.preferredDate || now)
            .toISOString()
            .slice(0, 10),
          consultationTime: item.startAt?.toISOString().slice(11, 16) || "",
        }))}
        doctors={doctors.map((item) => ({
          id: item.id,
          label: `${item.name} · ${item.role.toLowerCase()}`,
        }))}
        initial={{
          id: "",
          patientId:
            linked?.patientId || query.patient || patients[0]?.id || "",
          appointmentId: linked?.id || "",
          doctorUserId:
            doctors.find((doctor) => doctor.id === session.id)?.id ||
            doctors[0]?.id ||
            "",
          purpose: "WORK",
          consultationDate: consultation?.toISOString().slice(0, 10) || today,
          consultationTime:
            consultation?.toISOString().slice(11, 16) ||
            now.toTimeString().slice(0, 5),
          leaveFrom: today,
          leaveTo: today,
          returnDate: new Date(now.getTime() + 86400000)
            .toISOString()
            .slice(0, 10),
          fitnessStatus: "UNFIT_FOR_WORK",
          restrictions: "",
          diagnosisDisclosure: "NOT_DISCLOSED",
          diagnosisPlainText: "",
          doctorNotes: "",
          certificateWording: "",
          aiDraftUsed: false,
        }}
      />
    </>
  );
}
