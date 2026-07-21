import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

export async function POST(request: Request) {
  const session = await requirePlatformOwner();
  if (!session) return NextResponse.json({ error: "Platform-owner access is required." }, { status: 403 });
  const parsed = z.object({ practiceId: z.string(), patientNumber: z.string().trim().min(2).max(80), reason: z.string().trim().min(10).max(1000), durationMinutes: z.number().int().min(5).max(60) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Add a patient reference, reason, and short access duration." }, { status: 400 });
  const patient = await db.patient.findFirst({ where: { practiceId: parsed.data.practiceId, patientNumber: parsed.data.patientNumber, archivedAt: null }, select: { id: true, patientNumber: true } });
  if (!patient) return NextResponse.json({ error: "No patient with that exact practice reference was found." }, { status: 404 });
  const grant = await db.$transaction(async (tx) => {
    const created = await tx.supportAccessGrant.create({ data: { practiceId: parsed.data.practiceId, patientId: patient.id, reason: parsed.data.reason, grantedToId: session.id, grantedById: session.id, expiresAt: addMinutes(new Date(), parsed.data.durationMinutes) } });
    await tx.activityLog.create({ data: { userId: session.id, practiceId: parsed.data.practiceId, action: "EXCEPTIONAL_SUPPORT_ACCESS_GRANTED", entityType: "Patient", entityId: patient.id, summary: `Time-limited support access granted for patient reference ${patient.patientNumber}`, requestInfo: requestAuditInfo(request) } });
    return created;
  });
  return NextResponse.json({ id: grant.id, expiresAt: grant.expiresAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requirePlatformOwner();
  if (!session) return NextResponse.json({ error: "Platform-owner access is required." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Support grant is required." }, { status: 400 });
  const grant = await db.supportAccessGrant.findFirst({ where: { id, grantedToId: session.id, revokedAt: null } });
  if (!grant) return NextResponse.json({ error: "Support grant not found." }, { status: 404 });
  await db.$transaction([db.supportAccessGrant.update({ where: { id }, data: { revokedAt: new Date() } }), db.activityLog.create({ data: { userId: session.id, practiceId: grant.practiceId, action: "EXCEPTIONAL_SUPPORT_ACCESS_REVOKED", entityType: "Patient", entityId: grant.patientId, summary: "Time-limited support access revoked", requestInfo: requestAuditInfo(request) } })]);
  return NextResponse.json({ ok: true });
}
