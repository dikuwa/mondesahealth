import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

const onboardingSchema = z.object({
  currentStep: z.number().min(0).max(9),
  draftData: z.any().optional(),
  submitted: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json({ error: "Access denied." }, { status: 403 });

  const progress = await db.onboardingProgress.findUnique({
    where: { practiceId: id },
  });
  if (!progress)
    return NextResponse.json({ currentStep: 0, completedSteps: "[]" });

  return NextResponse.json({
    currentStep: progress.currentStep,
    completedSteps: JSON.parse(progress.completedSteps),
    draftData: progress.draftData,
    lastSavedAt: progress.lastSavedAt,
    submittedAt: progress.submittedAt,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json({ error: "Access denied." }, { status: 403 });

  const parsed = onboardingSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data." },
      { status: 400 },
    );

  const { currentStep, draftData } = parsed.data;

  await db.onboardingProgress.upsert({
    where: { practiceId: id },
    update: {
      currentStep,
      draftData: draftData || undefined,
      lastSavedAt: new Date(),
    },
    create: {
      practiceId: id,
      currentStep,
      draftData: draftData || undefined,
      lastSavedAt: new Date(),
      completedSteps: "[]",
    },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json({ error: "Access denied." }, { status: 403 });

  const parsed = onboardingSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data." },
      { status: 400 },
    );

  const { draftData, submitted } = parsed.data;

  if (submitted) {
    // Validate minimum requirements
    if (!draftData?.practiceIdentity?.name) {
      return NextResponse.json(
        { error: "Practice name is required before submission." },
        { status: 400 },
      );
    }
    if (!draftData?.practitioners?.length) {
      return NextResponse.json(
        { error: "At least one practitioner is required." },
        { status: 400 },
      );
    }
    if (!draftData?.locations?.length) {
      return NextResponse.json(
        { error: "At least one location is required." },
        { status: 400 },
      );
    }
    if (!draftData?.services?.length) {
      return NextResponse.json(
        { error: "At least one service is required." },
        { status: 400 },
      );
    }
  }

  await db.$transaction(async (tx) => {
    await tx.onboardingProgress.upsert({
      where: { practiceId: id },
      update: {
        currentStep: submitted ? 9 : parsed.data.currentStep,
        draftData: draftData || undefined,
        lastSavedAt: new Date(),
        submittedAt: submitted ? new Date() : undefined,
      },
      create: {
        practiceId: id,
        currentStep: submitted ? 9 : parsed.data.currentStep,
        draftData: draftData || undefined,
        lastSavedAt: new Date(),
        submittedAt: submitted ? new Date() : undefined,
        completedSteps: "[]",
      },
    });

    if (submitted) {
      await tx.practice.update({
        where: { id },
        data: { status: "PENDING_VERIFICATION" },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: id,
        action: submitted ? "ONBOARDING_SUBMITTED" : "ONBOARDING_SAVED",
        entityType: "Practice",
        entityId: id,
        summary: submitted
          ? "Onboarding submitted for verification"
          : "Onboarding progress saved",
        requestInfo: requestAuditInfo(request),
      },
    });
  });

  return NextResponse.json({
    ok: true,
    status: submitted ? "PENDING_VERIFICATION" : "SAVED",
  });
}
