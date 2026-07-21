import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_PATIENTS");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to merge patient records." },
      { status: 403 },
    );
  const parsed = z
    .object({
      sourceId: z.string(),
      targetPatientNumber: z.string().trim().min(2),
      confirmation: z.literal("MERGE"),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter the target patient reference and confirm the merge." },
      { status: 400 },
    );
  const [source, target] = await Promise.all([
    db.patient.findFirst({
      where: {
        id: parsed.data.sourceId,
        practiceId: session.practiceId,
        archivedAt: null,
      },
    }),
    db.patient.findFirst({
      where: {
        patientNumber: parsed.data.targetPatientNumber,
        practiceId: session.practiceId,
        archivedAt: null,
      },
    }),
  ]);
  if (!source || !target || source.id === target.id)
    return NextResponse.json(
      {
        error:
          "Source and target must be two active patients in this practice.",
      },
      { status: 404 },
    );
  try {
    await db.$transaction(async (tx) => {
      await Promise.all([
        tx.appointment.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.patientMedicalAid.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id, current: false },
        }),
        tx.claim.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.invoice.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.payment.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.sickNote.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.clinicalEncounter.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.medicalAidConsent.updateMany({
          where: { patientId: source.id },
          data: { patientId: target.id },
        }),
        tx.patientAllergy.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.patientCondition.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
        tx.patientMedication.updateMany({
          where: { patientId: source.id, practiceId: session.practiceId },
          data: { patientId: target.id },
        }),
      ]);
      await tx.patient.update({
        where: { id: source.id },
        data: {
          archivedAt: new Date(),
          status: "MERGED",
          updatedById: session.id,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: session.id,
          practiceId: session.practiceId,
          action: "PATIENT_MERGED",
          entityType: "Patient",
          entityId: target.id,
          summary: `Merged duplicate patient reference ${source.patientNumber} into ${target.patientNumber}`,
          beforeJson: JSON.stringify({
            sourcePatientId: source.id,
            sourcePatientNumber: source.patientNumber,
          }),
          afterJson: JSON.stringify({
            targetPatientId: target.id,
            targetPatientNumber: target.patientNumber,
          }),
          requestInfo: requestAuditInfo(request),
        },
      });
    });
    return NextResponse.json({ ok: true, targetId: target.id });
  } catch {
    return NextResponse.json(
      {
        error:
          "The records could not be merged safely. Resolve conflicting linked records first.",
      },
      { status: 409 },
    );
  }
}
