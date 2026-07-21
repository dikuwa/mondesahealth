import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PATIENT_SHARE_SCOPE_LABELS,
  parsePatientShareScopes,
} from "@/lib/patient-sharing";

export default async function SharedRecordsPage() {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "OWNER" &&
      !session.permissions.includes("VIEW_CLINICAL_RECORDS"))
  )
    notFound();
  const now = new Date();
  const consents = await db.patientShareConsent.findMany({
    where: {
      destinationPracticeId: session.practiceId,
      status: "ACTIVE",
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      patient: { select: { fullName: true, patientNumber: true } },
      sourcePractice: { select: { name: true, town: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <PageHeading
        eyebrow="Consent-controlled access"
        title="Shared patient records"
      />
      <div className="card dashboard-card">
        <div className="record-stack">
          {consents.map((consent) => (
            <article className="record-row" key={consent.id}>
              <div>
                <b>{consent.patient.fullName}</b>
                <small>
                  {consent.sourcePractice.name}
                  {consent.sourcePractice.town
                    ? ` · ${consent.sourcePractice.town}`
                    : ""}
                  {" · "}
                  {parsePatientShareScopes(consent.scopes)
                    .map((scope) => PATIENT_SHARE_SCOPE_LABELS[scope])
                    .join(" · ")}
                  {" · Expires "}
                  {consent.expiresAt.toLocaleDateString("en-NA")}
                </small>
              </div>
              <Link
                className="btn btn-primary"
                href={`/dashboard/shared-records/${consent.id}`}
                prefetch={false}
              >
                Open read-only record
              </Link>
            </article>
          ))}
          {!consents.length && (
            <div className="dashboard-empty">
              No patients are currently shared with this practice.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
