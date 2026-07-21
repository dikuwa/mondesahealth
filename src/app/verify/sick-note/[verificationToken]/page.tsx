import type { Metadata } from "next";
import { createHash } from "node:crypto";
import {
  CalendarCheck,
  CheckCircle2,
  FileCheck2,
  ShieldX,
  Stethoscope,
} from "lucide-react";
import { db } from "@/lib/db";
import { maskedPatientName } from "@/lib/sick-notes";
import { ORIGINAL_PRACTICE_ID } from "@/lib/practice-constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verify medical certificate",
  robots: { index: false, follow: false },
};
const date = (value: Date) =>
  new Intl.DateTimeFormat("en-NA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);

export default async function VerifySickNote({
  params,
}: {
  params: Promise<{ verificationToken: string }>;
}) {
  const { verificationToken } = await params;
  const note = await db.sickNote.findUnique({
    where: { verificationToken },
    include: {
      patient: { select: { fullName: true } },
      doctor: { select: { name: true } },
    },
  });
  const practice = note
    ? await db.practiceSetting.findUnique({
        where: { practiceId: note.practiceId },
      })
    : null;
  const fingerprint = createHash("sha256")
    .update(verificationToken)
    .digest("hex")
    .slice(0, 24);
  await db.activityLog
    .create({
      data: {
        practiceId: note?.practiceId || ORIGINAL_PRACTICE_ID,
        action: "SICK_NOTE_VERIFICATION_VIEWED",
        entityType: "SickNoteVerification",
        entityId: note?.id || fingerprint,
        summary: note
          ? `Public verification checked for ${note.certificateNumber}`
          : "Unknown medical-certificate verification token checked",
      },
    })
    .catch(() => null);
  if (!note || !practice)
    return (
      <main id="main-content" className="verification-page">
        <section className="verification-card is-invalid">
          <div className="verification-icon">
            <ShieldX size={28} />
          </div>
          <span className="eyebrow">Verification result</span>
          <h1>Certificate not found</h1>
          <p>
            This verification link does not match a medical certificate issued
            by Mondesa Health Polyclinic. Check the full link or contact the
            practice directly.
          </p>
        </section>
      </main>
    );
  const revoked = note.status === "REVOKED";
  return (
    <main id="main-content" className="verification-page">
      <section className={`verification-card${revoked ? " is-invalid" : ""}`}>
        <div className="verification-result">
          <div className="verification-icon">
            {revoked ? <ShieldX size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <div>
            <span className="eyebrow">Verification result</span>
            <h1>{revoked ? "Certificate revoked" : "Certificate verified"}</h1>
            <p>
              {revoked
                ? "This medical certificate is no longer valid. Contact the practice if you need clarification."
                : "This is an authentic medical certificate issued by Mondesa Health Polyclinic."}
            </p>
          </div>
        </div>
        <div className="verification-details">
          <div>
            <FileCheck2 size={18} />
            <span>Certificate number</span>
            <b>{note.certificateNumber}</b>
          </div>
          <div>
            <Stethoscope size={18} />
            <span>Issued by</span>
            <b>{note.doctor.name}</b>
            <small>{practice.signatureTitle}</small>
          </div>
          <div>
            <CalendarCheck size={18} />
            <span>Leave period</span>
            <b>
              {date(note.leaveFrom)} – {date(note.leaveTo)}
            </b>
            <small>Return: {date(note.returnDate)}</small>
          </div>
          <div>
            <span>Patient</span>
            <b>{maskedPatientName(note.patient.fullName)}</b>
            <small>Purpose: {note.purpose.toLowerCase()}</small>
          </div>
          <div>
            <span>Issued on</span>
            <b>{note.issuedAt ? date(note.issuedAt) : "Not recorded"}</b>
          </div>
          <div>
            <span>Practice contact</span>
            <b>{practice.phone}</b>
            <small>{practice.email}</small>
          </div>
        </div>
        <p className="verification-privacy">
          For patient privacy, this page intentionally excludes diagnosis,
          clinical notes, contact details and identity numbers.
        </p>
      </section>
    </main>
  );
}
