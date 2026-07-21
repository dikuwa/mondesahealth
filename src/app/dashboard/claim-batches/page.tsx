import { notFound } from "next/navigation";
import { ClaimBatchManager } from "@/components/claim-batch-manager";
import { PageHeading, Stat } from "@/components/dashboard";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function ClaimBatches() {
  const session = await requirePermission("MANAGE_CLAIM_BATCHES");
  if (!session) notFound();
  const [claims, funds, batches] = await Promise.all([
    db.claim.findMany({
      where: { practiceId: session.practiceId, status: "READY_TO_SUBMIT", medicalAidFundId: { not: null } },
      include: { patient: true, medicalAidFund: true },
      orderBy: { updatedAt: "asc" },
    }),
    db.medicalAid.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.claimBatch.findMany({
      where: { practiceId: session.practiceId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <>
      <PageHeading eyebrow="Medical aid" title="Claim batches" />
      <div className="dashboard-stats" style={{ marginBottom: 18 }}>
        <Stat label="Ready claims" value={claims.length} />
        <Stat
          label="Draft or ready batches"
          value={
            batches.filter((item) => ["DRAFT", "READY"].includes(item.status))
              .length
          }
        />
        <Stat
          label="Submitted batches"
          value={batches.filter((item) => item.status === "SUBMITTED").length}
        />
        <Stat
          label="Batch value"
          value={money(
            batches.reduce((sum, item) => sum + item.totalAmount, 0),
          )}
        />
      </div>
      <ClaimBatchManager
        claims={claims.map((item) => ({
          id: item.id,
          reference: item.claimNumber,
          patient: item.patient.fullName,
          fundId: item.medicalAidFundId!,
          fund: item.medicalAidFund?.name || item.medicalAidSnapshot || "",
          amount: item.amountSubmitted,
          serviceDate: (
            item.serviceDateFrom || item.consultationDate
          ).toLocaleDateString("en-NA"),
          isResubmission: item.isResubmission,
        }))}
        funds={funds.map((item) => ({ id: item.id, name: item.name }))}
        batches={batches.map((item) => ({
          id: item.id,
          reference: item.reference,
          fund: item.medicalAidName,
          method: item.submissionMethod,
          type: item.submissionType,
          claims: item._count.items,
          amount: item.totalAmount,
          status: item.status,
          submittedAt: item.submittedAt?.toISOString() || null,
          submissionReference: item.submissionReference,
        }))}
      />
    </>
  );
}
