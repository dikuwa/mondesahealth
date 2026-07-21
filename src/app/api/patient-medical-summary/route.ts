import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptionAccess } from "@/lib/subscription-access";
import { requestAuditInfo } from "@/lib/tenant";

const schema = z.object({
  patientId: z.string().min(1),
  type: z.enum(["ALLERGY", "CONDITION", "MEDICATION"]),
  name: z.string().trim().min(2).max(200),
  detail: z.string().trim().max(500).optional(),
  secondary: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_CLINICAL_RECORDS");
  if (!session)
    return NextResponse.json(
      { error: "Only authorised clinicians can update the medical summary." },
      { status: 403 },
    );
  const access = await subscriptionAccess(session.practiceId);
  if (!access.allowed)
    return NextResponse.json(
      { error: access.warning, code: "SUBSCRIPTION_RESTRICTED" },
      { status: 402 },
    );
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the medical summary item.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  const patient = await db.patient.findFirst({
    where: {
      id: input.patientId,
      practiceId: session.practiceId,
      archivedAt: null,
    },
    select: { id: true, patientNumber: true },
  });
  if (!patient)
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });

  const item = await db.$transaction(async (tx) => {
    const created =
      input.type === "ALLERGY"
        ? await tx.patientAllergy.create({
            data: {
              practiceId: session.practiceId,
              patientId: patient.id,
              substance: input.name,
              reaction: input.detail || null,
              severity: input.secondary || null,
              source: "CLINICIAN",
              createdById: session.id,
            },
          })
        : input.type === "CONDITION"
          ? await tx.patientCondition.create({
              data: {
                practiceId: session.practiceId,
                patientId: patient.id,
                name: input.name,
                icd10Code: input.secondary || null,
                source: "CLINICIAN",
                createdById: session.id,
              },
            })
          : await tx.patientMedication.create({
              data: {
                practiceId: session.practiceId,
                patientId: patient.id,
                name: input.name,
                dose: input.secondary || null,
                instructions: input.detail || null,
                source: "CLINICIAN",
                createdById: session.id,
              },
            });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action:
          input.type === "MEDICATION"
            ? "MEDICATION_ADDED"
            : input.type === "ALLERGY"
              ? "ALLERGY_ADDED"
              : "CONDITION_ADDED",
        entityType: `Patient${input.type[0]}${input.type.slice(1).toLowerCase()}`,
        entityId: itemId(created),
        summary: `${input.type.toLowerCase()} added to ${patient.patientNumber}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return created;
  });
  return NextResponse.json({ id: item.id }, { status: 201 });
}

function itemId(item: { id: string }) {
  return item.id;
}
