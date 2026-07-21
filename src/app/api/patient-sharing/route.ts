import { NextResponse } from "next/server";
import { z } from "zod";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PATIENT_SHARE_CONSENT_STATEMENT,
  PATIENT_SHARE_SCOPES,
} from "@/lib/patient-sharing";
import { requestAuditInfo } from "@/lib/tenant";

const createConsent = z.object({
  patientId: z.string().min(1),
  destinationPracticeId: z.string().min(1),
  scopes: z.array(z.enum(PATIENT_SHARE_SCOPES)).min(1).max(3),
  patientOrGuardianName: z.string().trim().min(2).max(140),
  relationshipToPatient: z.string().trim().max(100).optional(),
  consentMethod: z.enum(["IN_PERSON", "SIGNED_FORM", "VERBAL_RECORDED"]),
  expiresAt: z.coerce.date(),
  consentConfirmed: z.literal(true),
});

const revokeConsent = z.object({
  id: z.string().min(1),
  action: z.literal("REVOKE"),
  reason: z.string().trim().min(3).max(500),
});

function canManageSharing(session: Awaited<ReturnType<typeof getPracticeSession>>) {
  return Boolean(
    session &&
      (session.role === "OWNER" ||
        (session.permissions.includes("MANAGE_CONSENTS") &&
          session.permissions.includes("VIEW_CLINICAL_RECORDS"))),
  );
}

export async function POST(request: Request) {
  const session = await getPracticeSession();
  if (!canManageSharing(session) || !session)
    return NextResponse.json(
      { error: "Consent-management and clinical-record access are required." },
      { status: 403 },
    );
  const parsed = createConsent.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Check the consent details." },
      { status: 400 },
    );
  const input = parsed.data;
  const now = new Date();
  const latestExpiry = new Date(now);
  latestExpiry.setFullYear(latestExpiry.getFullYear() + 1);
  if (input.expiresAt <= now || input.expiresAt > latestExpiry)
    return NextResponse.json(
      { error: "Consent expiry must be in the future and no more than one year away." },
      { status: 400 },
    );
  if (input.destinationPracticeId === session.practiceId)
    return NextResponse.json(
      { error: "Choose a different destination practice." },
      { status: 400 },
    );
  const [patient, destination, existing] = await Promise.all([
    db.patient.findFirst({
      where: {
        id: input.patientId,
        practiceId: session.practiceId,
        archivedAt: null,
      },
      select: { id: true, fullName: true, patientNumber: true },
    }),
    db.practice.findFirst({
      where: {
        id: input.destinationPracticeId,
        status: { in: ["APPROVED", "ACTIVE"] },
      },
      select: { id: true, name: true },
    }),
    db.patientShareConsent.findFirst({
      where: {
        patientId: input.patientId,
        sourcePracticeId: session.practiceId,
        destinationPracticeId: input.destinationPracticeId,
        status: "ACTIVE",
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    }),
  ]);
  if (!patient)
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  if (!destination)
    return NextResponse.json(
      { error: "Destination practice is not available for sharing." },
      { status: 404 },
    );
  if (existing)
    return NextResponse.json(
      { error: "An active consent already exists for this destination practice." },
      { status: 409 },
    );
  const consent = await db.$transaction(async (tx) => {
    const created = await tx.patientShareConsent.create({
      data: {
        patientId: patient.id,
        sourcePracticeId: session.practiceId,
        destinationPracticeId: destination.id,
        scopes: JSON.stringify([...new Set(input.scopes)]),
        patientOrGuardianName: input.patientOrGuardianName,
        relationshipToPatient: input.relationshipToPatient || null,
        consentMethod: input.consentMethod,
        consentStatement: PATIENT_SHARE_CONSENT_STATEMENT,
        grantedById: session.id,
        expiresAt: input.expiresAt,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "PATIENT_SHARE_CONSENT_GRANTED",
        entityType: "PatientShareConsent",
        entityId: created.id,
        summary: `Granted ${destination.name} read-only access to selected records for ${patient.patientNumber}`,
        afterJson: JSON.stringify({
          destinationPracticeId: destination.id,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
        }),
        requestInfo: requestAuditInfo(request),
      },
    });
    return created;
  });
  return NextResponse.json({ id: consent.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getPracticeSession();
  if (!canManageSharing(session) || !session)
    return NextResponse.json(
      { error: "Consent-management and clinical-record access are required." },
      { status: 403 },
    );
  const parsed = revokeConsent.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Add a clear reason for revoking this consent." },
      { status: 400 },
    );
  const consent = await db.patientShareConsent.findFirst({
    where: {
      id: parsed.data.id,
      sourcePracticeId: session.practiceId,
      status: "ACTIVE",
      revokedAt: null,
    },
    include: {
      patient: { select: { patientNumber: true } },
      destinationPractice: { select: { name: true } },
    },
  });
  if (!consent)
    return NextResponse.json(
      { error: "Active sharing consent not found." },
      { status: 404 },
    );
  await db.$transaction([
    db.patientShareConsent.update({
      where: { id: consent.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: session.id,
        revocationReason: parsed.data.reason,
      },
    }),
    db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "PATIENT_SHARE_CONSENT_REVOKED",
        entityType: "PatientShareConsent",
        entityId: consent.id,
        summary: `Revoked ${consent.destinationPractice.name}'s shared access for ${consent.patient.patientNumber}`,
        afterJson: JSON.stringify({ reason: parsed.data.reason }),
        requestInfo: requestAuditInfo(request),
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
