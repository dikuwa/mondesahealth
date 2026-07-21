import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { PageHeading, Stat } from "@/components/dashboard";
import { SickNotesList } from "@/components/sick-notes-list";
import { db } from "@/lib/db";
import { requireSickNoteViewer } from "@/lib/sick-note-access";

export const dynamic = "force-dynamic";
export default async function SickNotesPage() {
  const session = await requireSickNoteViewer();
  if (!session) return null;
  const notes = await db.sickNote.findMany({
    where: { practiceId: session.practiceId },
    include: {
      patient: {
        select: { fullName: true, phone: true, whatsapp: true, email: true },
      },
      doctor: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const canManage =
    session.role === "OWNER" ||
    (["ADMIN", "DOCTOR"].includes(session.role) &&
      session.permissions.includes("MANAGE_SICK_NOTES"));
  return (
    <>
      <PageHeading
        eyebrow="Clinical documents"
        title="Sick notes"
        action={
          canManage ? (
            <Link className="btn btn-primary" href="/dashboard/sick-notes/new">
              <FilePlus2 size={17} /> Create sick note
            </Link>
          ) : undefined
        }
      />
      <div className="dashboard-stats" style={{ marginBottom: 18 }}>
        <Stat
          label="Drafts"
          value={notes.filter((note) => note.status === "DRAFT").length}
        />
        <Stat
          label="Issued"
          value={notes.filter((note) => note.status === "ISSUED").length}
        />
        <Stat
          label="Revoked"
          value={notes.filter((note) => note.status === "REVOKED").length}
        />
        <Stat label="Total certificates" value={notes.length} />
      </div>
      <SickNotesList
        canManage={canManage}
        rows={notes.map((note) => ({
          id: note.id,
          certificateNumber: note.certificateNumber,
          patient: note.patient.fullName,
          patientPhone: note.patient.phone,
          patientWhatsapp: note.patient.whatsapp,
          patientEmail: note.patient.email,
          purpose: note.purpose,
          status: note.status,
          consultationDate: note.consultationDate.toISOString(),
          leaveFrom: note.leaveFrom.toISOString(),
          leaveTo: note.leaveTo.toISOString(),
          doctor: note.doctor.name,
        }))}
      />
    </>
  );
}
