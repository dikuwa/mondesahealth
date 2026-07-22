import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { SupportAccessManager } from "@/components/support-access-manager";
import { PlatformPracticeSupportManager } from "@/components/platform-practice-support-manager";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePracticeSupportScopes } from "@/lib/practice-support";

export default async function SupportPage() {
  const session = await requirePlatformPermission("MANAGE_SUPPORT_ACCESS");
  if (!session) notFound();
  const [practices, grants, administrationRequests] = await Promise.all([
    db.practice.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.supportAccessGrant.findMany({ where: { grantedToId: session.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.practiceSupportRequest.findMany({ where: { requestedById: session.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const patients = await db.patient.findMany({ where: { id: { in: grants.map((grant) => grant.patientId) } }, select: { id: true, patientNumber: true } });
  const practiceNames = new Map(practices.map((practice) => [practice.id, practice.name]));
  const patientNumbers = new Map(patients.map((patient) => [patient.id, patient.patientNumber]));
  return <><PageHeading eyebrow="Security & governance" title="Support access"/><PlatformPracticeSupportManager practices={practices} requests={administrationRequests.map(item=>({id:item.id,practice:practiceNames.get(item.practiceId)||"Practice",reason:item.reason,scopes:parsePracticeSupportScopes(item.scopes),durationMinutes:item.durationMinutes,status:item.status,expiresAt:item.expiresAt?.toISOString()||null,revokedAt:item.revokedAt?.toISOString()||null,createdAt:item.createdAt.toISOString()}))}/><p className="notice-warning">The separate option below is for an exceptional, patient-specific, read-only support case. It does not grant practice administration.</p><SupportAccessManager practices={practices} grants={grants.map((grant) => ({ id: grant.id, practice: practiceNames.get(grant.practiceId) || "Practice", patientNumber: patientNumbers.get(grant.patientId) || "Unknown", reason: grant.reason, expiresAt: grant.expiresAt.toISOString(), revokedAt: grant.revokedAt?.toISOString() || null }))}/></>;
}
