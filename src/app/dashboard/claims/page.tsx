import { PageHeading, Stat } from "@/components/dashboard";
import { ClaimsManager } from "@/components/claims-manager";
import { db } from "@/lib/db";
import { getPracticeSession } from "@/lib/auth";
import { money } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function Claims() {
  const session = await getPracticeSession();
  if (!session) return null;
  const [
    claims,
    appointments,
    patients,
    practice,
    activeIcd10,
    procedureCount,
  ] = await Promise.all([
    db.claim.findMany({
      where: { practiceId: session.practiceId },
      include: {
        patient: true,
        lines: true,
        batches: {
          include: { batch: true },
          orderBy: { batch: { createdAt: "desc" } },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.appointment.findMany({
      where: { practiceId: session.practiceId, status: "COMPLETED", claim: null },
      include: { patient: true },
      orderBy: { startAt: "desc" },
    }),
    db.patient.findMany({
      where: { practiceId: session.practiceId, archivedAt: null },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, patientNumber: true },
    }),
    db.practiceSetting.findUnique({ where: { practiceId: session.practiceId } }),
    db.icd10Import.count({ where: { active: true } }),
    db.medicalAidProcedureItem.count({ where: { active: true } }),
  ]);
  const submittedValue = claims
    .filter(
      (c) =>
        !["DRAFT", "NEEDS_INFORMATION"].includes(c.status) &&
        c.lines.length > 0,
    )
    .reduce((n, c) => n + c.amountSubmitted, 0);
  const missing = [] as string[];
  if (
    !practice?.claimContactName ||
    !practice.claimPhone ||
    !practice.claimEmail
  )
    missing.push("claim contact details");
  if (!activeIcd10) missing.push("an active ICD-10 dataset");
  if (!procedureCount) missing.push("procedure items and tariffs");
  return (
    <>
      <PageHeading eyebrow="Medical aid" title="Claims" />
      {missing.length > 0 && (
        <p className="notice-warning" role="status">
          Claim setup is incomplete: {missing.join(", ")}.{" "}
          <a href="/dashboard/medical-aid">Open medical-aid settings</a>
          {missing.includes("claim contact details") && (
            <>
              {" "}
              or <a href="/dashboard/settings">practice settings</a>
            </>
          )}
          .
        </p>
      )}
      <div className="dashboard-stats" style={{ marginBottom: 18 }}>
        <Stat
          label="Draft"
          value={claims.filter((c) => c.status === "DRAFT").length}
        />
        <Stat
          label="Needs information"
          value={
            claims.filter((c) =>
              ["NEEDS_INFORMATION", "MISSING_INFORMATION"].includes(c.status),
            ).length
          }
        />
        <Stat
          label="Ready"
          value={claims.filter((c) => c.status === "READY_TO_SUBMIT").length}
        />
        <Stat label="Submitted value" value={money(submittedValue)} />
      </div>
      <ClaimsManager
        claims={claims.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          patient: c.patient.fullName,
          fund: c.medicalAidSnapshot,
          membership: c.membershipSnapshot,
          lines: c.lines.length,
          amount: c.amountSubmitted,
          status: c.status,
          updatedAt: c.updatedAt.toISOString(),
          batch: c.batches[0]?.batch.reference || null,
        }))}
        appointments={appointments.map((a) => ({
          id: a.id,
          label: `${a.reference} · ${a.patient.fullName}`,
        }))}
        patients={patients.map((p) => ({
          id: p.id,
          label: `${p.fullName} · ${p.patientNumber}`,
        }))}
      />
    </>
  );
}
