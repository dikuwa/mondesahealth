import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { SickNoteDetailActions } from "@/components/sick-note-detail-actions";
import { SickNoteForm } from "@/components/sick-note-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { requireSickNoteViewer } from "@/lib/sick-note-access";
import { dateInput } from "@/lib/sick-notes";

export const dynamic = "force-dynamic";
export default async function SickNoteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSickNoteViewer();
  if (!session) return null;
  const { id } = await params;
  const [note, patients, appointments, doctors] = await Promise.all([
    db.sickNote.findFirst({
      where: { id, practiceId: session.practiceId },
      include: { patient: true, doctor: true },
    }),
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
  if (!note) notFound();
  const canManage =
    session.role === "OWNER" ||
    (["ADMIN", "DOCTOR"].includes(session.role) &&
      session.permissions.includes("MANAGE_SICK_NOTES"));
  if (note.status === "DRAFT" && canManage)
    return (
      <>
        <PageHeading
          eyebrow={note.certificateNumber}
          title="Edit sick-note draft"
        />
        <SickNoteForm
          patients={patients.map((item) => ({
            id: item.id,
            label: `${item.fullName} · ${item.patientNumber}`,
          }))}
          appointments={appointments.map((item) => ({
            id: item.id,
            patientId: item.patientId,
            label: `${item.reference} · ${item.startAt ? item.startAt.toLocaleString("en-NA") : "Date pending"}`,
            consultationDate: (
              item.startAt ||
              item.preferredDate ||
              note.consultationDate
            )
              .toISOString()
              .slice(0, 10),
            consultationTime: item.startAt?.toISOString().slice(11, 16) || "",
          }))}
          doctors={doctors.map((item) => ({
            id: item.id,
            label: `${item.name} · ${item.role.toLowerCase()}`,
          }))}
          initial={{
            id: note.id,
            patientId: note.patientId,
            appointmentId: note.appointmentId || "",
            doctorUserId: note.doctorUserId,
            purpose: note.purpose,
            consultationDate: dateInput(note.consultationDate),
            consultationTime: note.consultationTime || "",
            leaveFrom: dateInput(note.leaveFrom),
            leaveTo: dateInput(note.leaveTo),
            returnDate: dateInput(note.returnDate),
            fitnessStatus: note.fitnessStatus,
            restrictions: note.restrictions || "",
            diagnosisDisclosure: note.diagnosisDisclosure,
            diagnosisPlainText: note.diagnosisPlainText || "",
            doctorNotes: note.doctorNotes,
            certificateWording: note.certificateWording,
            aiDraftUsed: note.aiDraftUsed,
          }}
        />
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="Medical certificate"
        title={note.certificateNumber}
        action={<StatusBadge value={note.status} />}
      />
      <section className="card sick-note-detail">
        <div className="sick-note-detail-grid">
          <div>
            <span>Patient</span>
            <b>{note.patient.fullName}</b>
            <small>{note.patient.patientNumber}</small>
          </div>
          <div>
            <span>Doctor</span>
            <b>{note.doctor.name}</b>
          </div>
          <div>
            <span>Consultation</span>
            <b>{note.consultationDate.toLocaleDateString("en-NA")}</b>
          </div>
          <div>
            <span>Purpose</span>
            <b>{note.purpose.toLowerCase()}</b>
          </div>
          <div>
            <span>Leave period</span>
            <b>
              {note.leaveFrom.toLocaleDateString("en-NA")} –{" "}
              {note.leaveTo.toLocaleDateString("en-NA")}
            </b>
          </div>
          <div>
            <span>Return date</span>
            <b>{note.returnDate.toLocaleDateString("en-NA")}</b>
          </div>
        </div>
        <div className="sick-note-wording">
          <span>Certificate wording</span>
          <p>{note.certificateWording}</p>
        </div>
        {note.restrictions && (
          <div className="sick-note-wording">
            <span>Restrictions</span>
            <p>{note.restrictions}</p>
          </div>
        )}
        {note.diagnosisDisclosure === "CONSENTED" &&
          note.diagnosisPlainText && (
            <div className="sick-note-wording">
              <span>Diagnosis disclosed with consent</span>
              <p>{note.diagnosisPlainText}</p>
            </div>
          )}
        <div className="sick-note-wording">
          <span>Private clinician notes</span>
          <p>{note.doctorNotes}</p>
        </div>
        {note.aiDraftUsed && (
          <p className="muted">
            AI-assisted wording was used and reviewed by the issuing clinician.
          </p>
        )}
        {note.status === "REVOKED" && (
          <div className="notice-warning">
            <b>Revoked</b>
            <p>{note.revokedReason}</p>
          </div>
        )}
        <SickNoteDetailActions
          id={note.id}
          number={note.certificateNumber}
          status={note.status}
          canManage={canManage}
          patientPhone={note.patient.phone}
          patientWhatsapp={note.patient.whatsapp}
          patientEmail={note.patient.email}
        />
      </section>
    </>
  );
}
