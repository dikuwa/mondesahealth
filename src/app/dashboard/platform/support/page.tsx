import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { SupportAccessManager } from "@/components/support-access-manager";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SupportPage() {
  const session = await requirePlatformPermission("MANAGE_SUPPORT_ACCESS");
  if (!session) notFound();
  const [practices, grants] = await Promise.all([
    db.practice.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.supportAccessGrant.findMany({ where: { grantedToId: session.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const patients = await db.patient.findMany({ where: { id: { in: grants.map((grant) => grant.patientId) } }, select: { id: true, patientNumber: true } });
  const practiceNames = new Map(practices.map((practice) => [practice.id, practice.name]));
  const patientNumbers = new Map(patients.map((patient) => [patient.id, patient.patientNumber]));
  return <><PageHeading eyebrow="Security & governance" title="Exceptional support access"/><p className="notice-warning">Platform access does not grant routine clinical access. Every exceptional grant is patient-specific, read-only, automatically expires, and is audited.</p><SupportAccessManager practices={practices} grants={grants.map((grant) => ({ id: grant.id, practice: practiceNames.get(grant.practiceId) || "Practice", patientNumber: patientNumbers.get(grant.patientId) || "Unknown", reason: grant.reason, expiresAt: grant.expiresAt.toISOString(), revokedAt: grant.revokedAt?.toISOString() || null }))}/></>;
}
