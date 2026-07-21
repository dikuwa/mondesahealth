import { notFound } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { PageHeading } from "@/components/dashboard";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PATIENT_SHARE_SCOPE_LABELS,
  parsePatientShareScopes,
} from "@/lib/patient-sharing";

export default async function SharedRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPracticeSession();
  if (
    !session ||
    (session.role !== "OWNER" &&
      !session.permissions.includes("VIEW_CLINICAL_RECORDS"))
  )
    notFound();
  const { id } = await params;
  const consent = await db.patientShareConsent.findFirst({
    where: {
      id,
      destinationPracticeId: session.practiceId,
      status: "ACTIVE",
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      patient: { select: { id: true, fullName: true, patientNumber: true } },
      sourcePractice: { select: { name: true } },
      destinationPractice: { select: { name: true } },
    },
  });
  if (!consent) notFound();
  const scopes = parsePatientShareScopes(consent.scopes);
  const [summary, encounters, documents] = await Promise.all([
    scopes.includes("SUMMARY")
      ? db.patient.findFirst({
          where: {
            id: consent.patientId,
            practiceId: consent.sourcePracticeId,
          },
          select: {
            dateOfBirth: true,
            sex: true,
            gender: true,
            knownAllergies: true,
            chronicConditions: true,
            currentMedication: true,
            previousProcedures: true,
            medicalAlerts: true,
            medicalHistorySummary: true,
            allergies: {
              where: { status: "ACTIVE" },
              select: { substance: true, reaction: true, severity: true },
            },
            conditions: {
              where: { status: "ACTIVE" },
              select: { name: true, icd10Code: true },
            },
            medications: {
              where: { status: "ACTIVE" },
              select: { name: true, dose: true, frequency: true },
            },
          },
        })
      : null,
    scopes.includes("CLINICAL_HISTORY")
      ? db.clinicalEncounter.findMany({
          where: {
            patientId: consent.patientId,
            practiceId: consent.sourcePracticeId,
            status: { in: ["COMPLETED", "AMENDED"] },
          },
          select: {
            id: true,
            startedAt: true,
            presentingComplaint: true,
            assessment: true,
            confirmedDiagnosis: true,
            treatmentProvided: true,
            medicationPrescribed: true,
            patientSummary: true,
            clinician: { select: { name: true } },
            diagnoses: {
              select: {
                code: true,
                description: true,
                diagnosisType: true,
                isPrimary: true,
              },
            },
          },
          orderBy: { startedAt: "desc" },
        })
      : [],
    scopes.includes("DOCUMENTS")
      ? db.sickNote.findMany({
          where: {
            patientId: consent.patientId,
            practiceId: consent.sourcePracticeId,
          },
          select: {
            id: true,
            certificateNumber: true,
            purpose: true,
            consultationDate: true,
            leaveFrom: true,
            leaveTo: true,
            status: true,
          },
          orderBy: { consultationDate: "desc" },
        })
      : [],
  ]);
  await db.$transaction([
    db.patientShareConsent.update({
      where: { id: consent.id },
      data: { lastViewedAt: new Date() },
    }),
    db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: consent.sourcePracticeId,
        action: "SHARED_PATIENT_RECORD_VIEWED",
        entityType: "PatientShareConsent",
        entityId: consent.id,
        summary: `${session.name} from ${consent.destinationPractice.name} viewed the consent-shared record for ${consent.patient.patientNumber}`,
        afterJson: JSON.stringify({
          destinationPracticeId: consent.destinationPracticeId,
          scopes,
        }),
      },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow={`Shared by ${consent.sourcePractice.name}`}
        title={consent.patient.fullName}
      />
      <div className="notice-warning shared-record-notice">
        <LockKeyhole size={18} />
        Read-only consent access · {scopes.map((scope) => PATIENT_SHARE_SCOPE_LABELS[scope]).join(" · ")} · Expires {consent.expiresAt.toLocaleDateString("en-NA")}
      </div>
      {summary && (
        <div className="patient-overview-grid">
          <SharedSection title="Patient summary">
            <p>{summary.medicalHistorySummary || "No summary recorded."}</p>
            <small>
              {summary.dateOfBirth?.toLocaleDateString("en-NA") || "Birth date not recorded"} · {summary.sex || summary.gender || "Sex not recorded"}
            </small>
          </SharedSection>
          <SharedSection title="Important alerts" warning>
            <p>{summary.medicalAlerts || "No alerts recorded."}</p>
          </SharedSection>
          <SharedSection title="Allergies">
            <p>
              {summary.knownAllergies ||
                summary.allergies.map((item) => item.substance).join(", ") ||
                "None recorded."}
            </p>
          </SharedSection>
          <SharedSection title="Conditions">
            <p>
              {summary.chronicConditions ||
                summary.conditions.map((item) => item.name).join(", ") ||
                "None recorded."}
            </p>
          </SharedSection>
          <SharedSection title="Medication">
            <p>
              {summary.currentMedication ||
                summary.medications.map((item) => item.name).join(", ") ||
                "None recorded."}
            </p>
          </SharedSection>
          <SharedSection title="Previous procedures">
            <p>{summary.previousProcedures || "None recorded."}</p>
          </SharedSection>
        </div>
      )}
      {scopes.includes("CLINICAL_HISTORY") && (
        <section className="card dashboard-card">
          <h2>Clinical history</h2>
          <div className="record-stack">
            {encounters.map((encounter) => (
              <article className="record-row shared-record-detail" key={encounter.id}>
                <div>
                  <b>{encounter.presentingComplaint || "Consultation"}</b>
                  <small>{encounter.startedAt.toLocaleString("en-NA")} · {encounter.clinician.name}</small>
                  <p>{encounter.patientSummary || encounter.assessment || "No shared summary recorded."}</p>
                  {!!encounter.diagnoses.length && (
                    <small>Diagnoses: {encounter.diagnoses.map((diagnosis) => `${diagnosis.code ? `${diagnosis.code} · ` : ""}${diagnosis.description}`).join(", ")}</small>
                  )}
                </div>
              </article>
            ))}
            {!encounters.length && <div className="dashboard-empty">No completed clinical history was shared.</div>}
          </div>
        </section>
      )}
      {scopes.includes("DOCUMENTS") && (
        <section className="card dashboard-card">
          <h2>Document list</h2>
          <p className="section-intro">Metadata only. Source documents are not copied or downloadable through this consent.</p>
          <div className="record-stack">
            {documents.map((document) => (
              <article className="record-row" key={document.id}>
                <div>
                  <b>{document.certificateNumber} · {document.status}</b>
                  <small>{document.purpose.replaceAll("_", " ")} · {document.consultationDate.toLocaleDateString("en-NA")}</small>
                </div>
              </article>
            ))}
            {!documents.length && <div className="dashboard-empty">No document metadata was shared.</div>}
          </div>
        </section>
      )}
    </>
  );
}

function SharedSection({
  title,
  children,
  warning = false,
}: {
  title: string;
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <article className={`card dashboard-card${warning ? " summary-warning" : ""}`}>
      <h2>{title}</h2>
      {children}
    </article>
  );
}
