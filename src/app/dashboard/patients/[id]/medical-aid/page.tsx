import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PatientMedicalAidManager } from "@/components/patient-medical-aid-manager";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function PatientAidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("MANAGE_MEMBERSHIPS");
  if (!session) notFound();
  const { id } = await params;
  const [patient, funds, settings] = await Promise.all([
    db.patient.findFirst({
      where: { id, practiceId: session.practiceId },
      include: {
        memberships: {
          where: { practiceId: session.practiceId },
          include: {
            medicalAid: true,
            consents: { orderBy: { consentDate: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.medicalAid.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.practiceSetting.findUnique({ where: { practiceId: session.practiceId } }),
  ]);
  if (!patient || !settings) notFound();
  return (
    <>
      <PageHeading eyebrow="Patient medical aid" title={patient.fullName} />
      <PatientMedicalAidManager
        patientId={patient.id}
        funds={funds.map((item) => ({ id: item.id, name: item.name }))}
        consentWording={settings.consentWording}
        memberships={patient.memberships.map((item) => ({
          id: item.id,
          medicalAidId: item.medicalAidId,
          fund: item.medicalAid?.name || item.customFundName || "Other fund",
          membershipNumber: item.membershipNumber,
          plan: item.plan,
          principalName: item.principalName,
          principalId: item.principalId,
          relationship: item.relationship,
          dependantCode: item.dependantCode,
          beneficiarySuffix: item.beneficiarySuffix,
          effectiveDate: item.effectiveDate?.toISOString() || "",
          expiryDate: item.expiryDate?.toISOString() || "",
          preAuthorisationNumber: item.preAuthorisationNumber,
          directBillingEnabled: item.directBillingEnabled,
          reimbursementOnly: item.reimbursementOnly,
          current: item.current,
          notes: item.notes,
          consents: item.consents.map((consent) => ({
            status: consent.consentStatus,
            date: consent.consentDate.toISOString(),
            name: consent.patientOrGuardianName,
          })),
        }))}
      />
    </>
  );
}
