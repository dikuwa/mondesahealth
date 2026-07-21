import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clinicianAssistantSchema,
  requestStructuredAi,
} from "@/lib/ai-provider";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("MARK_REVIEWED"), intakeId: z.string().min(1) }),
  z.object({
    action: z.literal("EDIT_SUMMARY"),
    intakeId: z.string().min(1),
    summary: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal("ACCEPT_DRAFT"),
    intakeId: z.string().min(1),
    draftId: z.string().min(1),
    content: z.string().trim().min(10).max(6000),
  }),
  z.object({
    action: z.literal("DISMISS_DRAFT"),
    intakeId: z.string().min(1),
    draftId: z.string().min(1),
  }),
]);

export async function PATCH(request: Request) {
  const session = await requirePermission("VIEW_CLINICAL_INTAKE");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to review clinical intake." },
      { status: 403 },
    );
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the intake update." },
      { status: 400 },
    );
  const intake = await db.patientIntake.findFirst({
    where: { id: parsed.data.intakeId, practiceId: session.practiceId },
  });
  if (!intake)
    return NextResponse.json(
      { error: "Patient intake not found." },
      { status: 404 },
    );
  if (parsed.data.action === "MARK_REVIEWED") {
    await db.$transaction([
      db.patientIntake.update({
        where: { id: intake.id },
        data: {
          reviewStatus: "REVIEWED",
          clinicianReviewedAt: new Date(),
          clinicianReviewedByUserId: session.id,
        },
      }),
      db.activityLog.create({
        data: {
          practiceId: session.practiceId,
          userId: session.id,
          action: "PATIENT_INTAKE_REVIEWED",
          entityType: "PatientIntake",
          entityId: intake.id,
          summary: "Patient symptom intake marked reviewed by clinician",
        },
      }),
    ]);
  } else if (parsed.data.action === "EDIT_SUMMARY") {
    await db.$transaction([
      db.patientIntake.update({
        where: { id: intake.id },
        data: {
          clinicianCorrections: parsed.data.summary,
          reviewStatus: "EDITED_BY_CLINICIAN",
          clinicianReviewedAt: new Date(),
          clinicianReviewedByUserId: session.id,
        },
      }),
      db.activityLog.create({
        data: {
          practiceId: session.practiceId,
          userId: session.id,
          action: "PATIENT_INTAKE_SUMMARY_EDITED",
          entityType: "PatientIntake",
          entityId: intake.id,
          summary:
            "Clinician corrections saved separately from patient-approved AI summary",
        },
      }),
    ]);
  } else {
    const draft = await db.clinicalAiDraft.findFirst({
      where: {
        id: parsed.data.draftId,
        intakeId: intake.id,
        userId: session.id,
      },
    });
    if (!draft)
      return NextResponse.json(
        { error: "AI draft not found." },
        { status: 404 },
      );
    const status =
      parsed.data.action === "ACCEPT_DRAFT" ? "ACCEPTED_AS_DRAFT" : "DISMISSED";
    await db.$transaction([
      db.clinicalAiDraft.update({
        where: { id: draft.id },
        data: {
          status,
          content:
            parsed.data.action === "ACCEPT_DRAFT"
              ? parsed.data.content
              : draft.content,
        },
      }),
      db.activityLog.create({
        data: {
          practiceId: session.practiceId,
          userId: session.id,
          action:
            parsed.data.action === "ACCEPT_DRAFT"
              ? "CLINICAL_AI_DRAFT_ACCEPTED"
              : "CLINICAL_AI_DRAFT_DISMISSED",
          entityType: "ClinicalAiDraft",
          entityId: draft.id,
          summary:
            parsed.data.action === "ACCEPT_DRAFT"
              ? "AI output accepted as an unsigned clinician draft"
              : "AI output dismissed by clinician",
        },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}

const assistSchema = z.object({
  intakeId: z.string().min(1),
  requestType: z.enum([
    "MISSING_QUESTIONS",
    "DIFFERENTIALS",
    "EXAMINATION",
    "INVESTIGATIONS",
    "DRAFT_NOTES",
    "SOAP_NOTES",
    "ICD10_SEARCH",
  ]),
  workingDiagnosis: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const session = await requirePermission("USE_CLINICAL_AI");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to use the clinical AI assistant." },
      { status: 403 },
    );
  const limit = consumeRateLimit(`clinical-ai:${session.id}`, 30, 60 * 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Clinical AI rate limit reached. Please try again later." },
      { status: 429 },
    );
  const parsed = assistSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a valid clinical assistance request." },
      { status: 400 },
    );
  if (
    parsed.data.requestType === "ICD10_SEARCH" &&
    (!parsed.data.workingDiagnosis || parsed.data.workingDiagnosis.length < 3)
  )
    return NextResponse.json(
      {
        error:
          "Enter a clinician working or confirmed diagnosis before requesting ICD-10 search terms.",
      },
      { status: 400 },
    );
  const intake = await db.patientIntake.findFirst({
    where: { id: parsed.data.intakeId, practiceId: session.practiceId },
    include: {
      appointment: {
        include: { patient: { select: { dateOfBirth: true, gender: true } } },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!intake)
    return NextResponse.json(
      { error: "Patient intake not found." },
      { status: 404 },
    );
  const source = {
    originalReason: intake.originalReason,
    approvedSummary: intake.approvedSummary,
    structuredAnswers: JSON.parse(intake.structuredAnswers || "{}"),
    redFlags: JSON.parse(intake.redFlags || "[]"),
    patientAgeDataAvailable: Boolean(intake.appointment.patient.dateOfBirth),
    gender: intake.appointment.patient.gender,
    workingDiagnosis: parsed.data.workingDiagnosis || null,
  };
  try {
    const result = await requestStructuredAi({
      schema: clinicianAssistantSchema,
      system: `You provide AI-generated assistance for independent clinician review. Request type: ${parsed.data.requestType}. Never confirm diagnosis, prescribe, calculate dosage, finalise notes, save ICD-10 codes, or claim interaction checking. State missing information and uncertainty. ICD-10 output must be search terms only, based on a clinician-entered working diagnosis. Return JSON: content, sourceInformationUsed[], limitations[], icd10SearchTerms[].`,
      payload: source,
    });
    const draft = await db.$transaction(async (tx) => {
      const created = await tx.clinicalAiDraft.create({
        data: {
          intakeId: intake.id,
          userId: session.id,
          requestType: parsed.data.requestType,
          sourceUsed: JSON.stringify(result.data.sourceInformationUsed),
          content: result.data.content,
          limitations: JSON.stringify(result.data.limitations),
        },
      });
      await tx.activityLog.create({
        data: {
          practiceId: session.practiceId,
          userId: session.id,
          action: "CLINICAL_AI_ASSISTANT_USED",
          entityType: "PatientIntake",
          entityId: intake.id,
          summary: `${parsed.data.requestType.replaceAll("_", " ").toLowerCase()} assistance generated for clinician review`,
        },
      });
      return created;
    });
    return NextResponse.json({
      id: draft.id,
      content: result.data.content,
      sourceInformationUsed: result.data.sourceInformationUsed,
      limitations: result.data.limitations,
      icd10SearchTerms: result.data.icd10SearchTerms,
      status: draft.status,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Clinical AI is unavailable or returned an invalid response. No clinical record was changed.",
      },
      { status: 503 },
    );
  }
}
