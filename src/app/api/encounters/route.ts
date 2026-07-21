import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";
import { subscriptionAccess } from "@/lib/subscription-access";

const diagnosisSchema = z.object({
  code: z.string().trim().max(20).optional(),
  description: z.string().trim().min(2).max(500),
  clinicianDescription: z.string().trim().max(500).optional(),
  diagnosisType: z.enum(["PROVISIONAL", "CONFIRMED"]),
  isPrimary: z.boolean().default(false),
  summaryDisposition: z
    .enum(["ACTIVE", "HISTORICAL", "DO_NOT_ADD"])
    .default("DO_NOT_ADD"),
});
const fields = z.object({
  presentingComplaint: z.string().max(4000).optional(),
  patientReportedHistory: z.string().max(6000).optional(),
  historyPresentIllness: z.string().max(6000).optional(),
  relevantHistory: z.string().max(6000).optional(),
  allergiesReviewed: z.boolean().optional(),
  medicationReviewed: z.boolean().optional(),
  vitalSigns: z
    .record(z.string(), z.union([z.string(), z.number(), z.null()]))
    .optional(),
  examinationFindings: z.string().max(8000).optional(),
  clinicalObservations: z.string().max(8000).optional(),
  assessment: z.string().max(8000).optional(),
  provisionalDiagnosis: z.string().max(4000).optional(),
  confirmedDiagnosis: z.string().max(4000).optional(),
  treatmentProvided: z.string().max(6000).optional(),
  medicationPrescribed: z.string().max(6000).optional(),
  proceduresPerformed: z.string().max(6000).optional(),
  testsRequested: z.string().max(4000).optional(),
  laboratoryRequests: z.string().max(4000).optional(),
  imagingRequests: z.string().max(4000).optional(),
  referrals: z.string().max(4000).optional(),
  followUpInstructions: z.string().max(4000).optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  patientSummary: z.string().max(6000).optional(),
  privateNotes: z.string().max(10000).optional(),
  diagnoses: z.array(diagnosisSchema).max(30).optional(),
});

const createSchema = fields.extend({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  action: z.enum(["SAVE_DRAFT", "COMPLETE"]).default("SAVE_DRAFT"),
});
const updateSchema = fields.extend({
  id: z.string(),
  action: z.enum(["SAVE_DRAFT", "COMPLETE", "AMEND"]),
  amendmentReason: z.string().trim().max(1000).optional(),
});

function encounterData(
  input: z.infer<typeof fields> & {
    id?: string;
    action?: string;
    amendmentReason?: string;
    patientId?: string;
    appointmentId?: string;
  },
) {
  const {
    diagnoses: _diagnoses,
    followUpDate,
    id: _id,
    action: _action,
    amendmentReason: _reason,
    patientId: _patientId,
    appointmentId: _appointmentId,
    ...data
  } = input;
  void [_diagnoses, _id, _action, _reason, _patientId, _appointmentId];
  return {
    ...data,
    ...(followUpDate !== undefined
      ? { followUpDate: followUpDate ? new Date(followUpDate) : null }
      : {}),
  };
}

export async function GET(request: Request) {
  const session = await requirePermission("VIEW_CLINICAL_RECORDS");
  if (!session)
    return NextResponse.json(
      { error: "You do not have access to clinical records." },
      { status: 403 },
    );
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Encounter not found." },
      { status: 400 },
    );
  const encounter = await db.clinicalEncounter.findFirst({
    where: { id, practiceId: session.practiceId },
    include: {
      patient: true,
      clinician: { select: { id: true, name: true } },
      diagnoses: true,
      amendments: {
        include: { amendedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!encounter)
    return NextResponse.json(
      { error: "Encounter not found." },
      { status: 404 },
    );
  await db.activityLog.create({
    data: {
      userId: session.id,
      practiceId: session.practiceId,
      action: "CLINICAL_RECORD_VIEWED",
      entityType: "ClinicalEncounter",
      entityId: encounter.id,
      summary: `Viewed encounter for ${encounter.patient.patientNumber}`,
      requestInfo: requestAuditInfo(request),
    },
  });
  return NextResponse.json(encounter);
}

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_CLINICAL_RECORDS");
  if (!session)
    return NextResponse.json(
      { error: "Only authorised clinicians can start consultations." },
      { status: 403 },
    );
  const subscription = await subscriptionAccess(session.practiceId);
  if (!subscription.allowed)
    return NextResponse.json(
      { error: subscription.warning, code: "SUBSCRIPTION_RESTRICTED" },
      { status: 402 },
    );
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the consultation details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  if (
    input.action === "COMPLETE" &&
    !input.assessment?.trim() &&
    !input.confirmedDiagnosis?.trim() &&
    !input.provisionalDiagnosis?.trim() &&
    !input.diagnoses?.length
  )
    return NextResponse.json(
      {
        error:
          "Add an assessment or diagnosis before completing the encounter.",
      },
      { status: 400 },
    );
  const patient = await db.patient.findFirst({
    where: {
      id: input.patientId,
      practiceId: session.practiceId,
      archivedAt: null,
    },
  });
  const appointment = input.appointmentId
    ? await db.appointment.findFirst({
        where: {
          id: input.appointmentId,
          patientId: input.patientId,
          practiceId: session.practiceId,
        },
        include: { patientIntake: true },
      })
    : null;
  if (!patient || (input.appointmentId && !appointment))
    return NextResponse.json(
      { error: "Patient or appointment not found." },
      { status: 404 },
    );
  const encounter = await db.$transaction(async (tx) => {
    const created = await tx.clinicalEncounter.create({
      data: {
        practiceId: session.practiceId,
        patientId: patient.id,
        appointmentId: appointment?.id,
        clinicianId: session.id,
        serviceId: appointment?.serviceId,
        presentingComplaint: input.presentingComplaint || appointment?.reason,
        patientReportedHistory:
          input.patientReportedHistory ||
          appointment?.patientIntake?.originalReason,
        aiBookingSummary: appointment?.patientIntake?.approvedSummary,
        ...encounterData(input),
        createdById: session.id,
        updatedById: session.id,
        status: input.action === "COMPLETE" ? "COMPLETED" : "DRAFT",
        completedAt: input.action === "COMPLETE" ? new Date() : null,
        diagnoses: input.diagnoses?.length
          ? { create: input.diagnoses }
          : undefined,
      },
    });
    if (input.action === "COMPLETE" && appointment)
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "COMPLETED" },
      });
    if (input.action === "COMPLETE") {
      for (const diagnosis of (input.diagnoses || []).filter(
        (item) => item.summaryDisposition !== "DO_NOT_ADD",
      ))
        await tx.patientCondition.create({
          data: {
            practiceId: session.practiceId,
            patientId: patient.id,
            name: diagnosis.description,
            icd10Code: diagnosis.code || null,
            status:
              diagnosis.summaryDisposition === "ACTIVE"
                ? "ACTIVE"
                : "HISTORICAL",
            source: "ENCOUNTER",
            createdById: session.id,
          },
        });
      if (input.diagnoses?.length)
        await tx.activityLog.create({
          data: {
            userId: session.id,
            practiceId: session.practiceId,
            action: "DIAGNOSIS_ADDED",
            entityType: "ClinicalEncounter",
            entityId: created.id,
            summary: `${input.diagnoses.length} structured diagnosis record(s) confirmed by clinician`,
            requestInfo: requestAuditInfo(request),
          },
        });
      if (input.medicationPrescribed?.trim())
        await tx.activityLog.create({
          data: {
            userId: session.id,
            practiceId: session.practiceId,
            action: "PRESCRIPTION_ADDED",
            entityType: "ClinicalEncounter",
            entityId: created.id,
            summary: "Clinician recorded prescription information",
            requestInfo: requestAuditInfo(request),
          },
        });
    }
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action:
          input.action === "COMPLETE"
            ? "ENCOUNTER_COMPLETED"
            : "ENCOUNTER_CREATED",
        entityType: "ClinicalEncounter",
        entityId: created.id,
        summary: `${input.action === "COMPLETE" ? "Consultation completed" : "Consultation started"} for ${patient.patientNumber}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return created;
  });
  return NextResponse.json({ id: encounter.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requirePermission("MANAGE_CLINICAL_RECORDS");
  if (!session)
    return NextResponse.json(
      { error: "Only authorised clinicians can update consultations." },
      { status: 403 },
    );
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the consultation details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  if (
    input.action === "AMEND" &&
    !(await requirePermission("AMEND_CLINICAL_RECORDS"))
  )
    return NextResponse.json(
      {
        error:
          "You do not have permission to amend completed clinical records.",
      },
      { status: 403 },
    );
  const current = await db.clinicalEncounter.findFirst({
    where: { id: input.id, practiceId: session.practiceId },
    include: { diagnoses: true },
  });
  if (!current)
    return NextResponse.json(
      { error: "Encounter not found." },
      { status: 404 },
    );
  if (
    ["COMPLETED", "AMENDED"].includes(current.status) &&
    input.action !== "AMEND"
  )
    return NextResponse.json(
      {
        error:
          "Completed encounters can only be changed through a reasoned amendment.",
      },
      { status: 409 },
    );
  if (
    input.action === "AMEND" &&
    !["COMPLETED", "AMENDED"].includes(current.status)
  )
    return NextResponse.json(
      { error: "Only completed encounters require amendments." },
      { status: 409 },
    );
  if (
    input.action === "AMEND" &&
    (!input.amendmentReason || input.amendmentReason.length < 5)
  )
    return NextResponse.json(
      { error: "Enter a clear amendment reason." },
      { status: 400 },
    );
  if (
    input.action === "COMPLETE" &&
    !input.assessment?.trim() &&
    !input.confirmedDiagnosis?.trim() &&
    !input.provisionalDiagnosis?.trim()
  )
    return NextResponse.json(
      {
        error:
          "Add an assessment or diagnosis before completing the encounter.",
      },
      { status: 400 },
    );
  const updated = await db.$transaction(async (tx) => {
    const nextData = encounterData(input);
    if (input.action === "AMEND")
      await tx.encounterAmendment.create({
        data: {
          encounterId: current.id,
          amendedById: session.id,
          reason: input.amendmentReason!,
          originalContent: current as never,
          updatedContent: {
            ...current,
            ...nextData,
            diagnoses: input.diagnoses || current.diagnoses,
          } as never,
        },
      });
    if (input.diagnoses) {
      await tx.encounterDiagnosis.deleteMany({
        where: { encounterId: current.id },
      });
      await tx.encounterDiagnosis.createMany({
        data: input.diagnoses.map((item) => ({
          ...item,
          encounterId: current.id,
        })),
      });
      if (["COMPLETE", "AMEND"].includes(input.action)) {
        for (const diagnosis of input.diagnoses.filter(
          (item) => item.summaryDisposition !== "DO_NOT_ADD",
        )) {
          const existing = await tx.patientCondition.findFirst({
            where: {
              practiceId: session.practiceId,
              patientId: current.patientId,
              ...(diagnosis.code
                ? { icd10Code: diagnosis.code }
                : {
                    name: {
                      equals: diagnosis.description,
                      mode: "insensitive",
                    },
                  }),
            },
          });
          const summary = {
            name: diagnosis.description,
            icd10Code: diagnosis.code || null,
            status:
              diagnosis.summaryDisposition === "ACTIVE"
                ? "ACTIVE"
                : "HISTORICAL",
          };
          if (existing)
            await tx.patientCondition.update({
              where: { id: existing.id },
              data: summary,
            });
          else
            await tx.patientCondition.create({
              data: {
                practiceId: session.practiceId,
                patientId: current.patientId,
                ...summary,
                source: "ENCOUNTER",
                createdById: session.id,
              },
            });
        }
        await tx.activityLog.create({
          data: {
            userId: session.id,
            practiceId: session.practiceId,
            action: "DIAGNOSIS_ADDED",
            entityType: "ClinicalEncounter",
            entityId: current.id,
            summary: `${input.diagnoses.length} structured diagnosis record(s) confirmed by clinician`,
            requestInfo: requestAuditInfo(request),
          },
        });
      }
    }
    const saved = await tx.clinicalEncounter.update({
      where: { id: current.id, practiceId: session.practiceId },
      data: {
        ...nextData,
        status:
          input.action === "COMPLETE"
            ? "COMPLETED"
            : input.action === "AMEND"
              ? "AMENDED"
              : current.status === "DRAFT"
                ? "DRAFT"
                : "IN_PROGRESS",
        completedAt:
          input.action === "COMPLETE" ? new Date() : current.completedAt,
        updatedById: session.id,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action:
          input.action === "COMPLETE"
            ? "ENCOUNTER_COMPLETED"
            : input.action === "AMEND"
              ? "ENCOUNTER_AMENDED"
              : "ENCOUNTER_DRAFT_SAVED",
        entityType: "ClinicalEncounter",
        entityId: current.id,
        summary:
          input.action === "AMEND"
            ? `Encounter amended: ${input.amendmentReason}`
            : `Encounter ${input.action === "COMPLETE" ? "completed" : "draft saved"}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    if (
      input.medicationPrescribed?.trim() &&
      input.medicationPrescribed !== current.medicationPrescribed
    )
      await tx.activityLog.create({
        data: {
          userId: session.id,
          practiceId: session.practiceId,
          action: "PRESCRIPTION_ADDED",
          entityType: "ClinicalEncounter",
          entityId: current.id,
          summary: "Clinician recorded prescription information",
          requestInfo: requestAuditInfo(request),
        },
      });
    return saved;
  });
  return NextResponse.json({ id: updated.id, status: updated.status });
}
