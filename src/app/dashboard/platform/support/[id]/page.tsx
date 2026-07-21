import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SupportPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlatformPermission("MANAGE_SUPPORT_ACCESS");
  if (!session) notFound();
  const { id } = await params;
  const grant = await db.supportAccessGrant.findFirst({ where: { id, grantedToId: session.id, revokedAt: null, expiresAt: { gt: new Date() } } });
  if (!grant) notFound();
  const patient = await db.patient.findFirst({ where: { id: grant.patientId, practiceId: grant.practiceId }, include: { allergies: true, conditions: true, medications: true, encounters: { include: { diagnoses: true, clinician: { select: { name: true } } }, orderBy: { startedAt: "desc" }, take: 20 } } });
  if (!patient) notFound();
  await db.$transaction([
    db.supportAccessGrant.update({ where: { id: grant.id }, data: { lastUsedAt: new Date() } }),
    db.activityLog.create({ data: { userId: session.id, practiceId: grant.practiceId, action: "EXCEPTIONAL_SUPPORT_ACCESS_USED", entityType: "Patient", entityId: patient.id, summary: `Read-only support access used for patient reference ${patient.patientNumber}` } }),
  ]);
  return <><PageHeading eyebrow="Exceptional support access · Read only" title={patient.fullName}/><p className="notice-warning">Reason: {grant.reason}. Access expires {grant.expiresAt.toLocaleString("en-NA")}.</p><div className="patient-overview-grid"><section className="card dashboard-card"><h2>Allergies</h2><p>{patient.allergies.map((item) => item.substance).join(", ") || "None recorded"}</p></section><section className="card dashboard-card"><h2>Conditions</h2><p>{patient.conditions.map((item) => item.name).join(", ") || "None recorded"}</p></section><section className="card dashboard-card"><h2>Medication</h2><p>{patient.medications.map((item) => item.name).join(", ") || "None recorded"}</p></section></div><div className="card dashboard-card"><h2>Recent encounters</h2><div className="record-stack">{patient.encounters.map((encounter) => <article className="record-row" key={encounter.id}><div><b>{encounter.startedAt.toLocaleString("en-NA")} · {encounter.status}</b><small>{encounter.clinician.name} · {encounter.diagnoses.map((diagnosis) => diagnosis.description).join(", ") || "No structured diagnosis"}</small><p>{encounter.patientSummary || encounter.assessment || "No summary recorded"}</p></div></article>)}</div></div></>;
}
