import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  batchCandidateIsEligible,
  calculateClaimTotal,
} from "@/lib/claim-rules";
import { ref } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_CLAIM_BATCHES");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to create batches." },
      { status: 403 },
    );
  const parsed = z
    .object({
      medicalAidFundId: z.string(),
      submissionMethod: z.enum([
        "MANUAL",
        "EMAIL",
        "PORTAL",
        "MEDISWITCH",
        "EDI",
        "OTHER",
      ]),
      submissionType: z.enum(["FIRST_SUBMISSION", "RESUBMISSION"]),
      claimIds: z.array(z.string()).min(1),
      notes: z.string().max(1000).optional(),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Batch details are incomplete." },
      { status: 400 },
    );
  const [fund, claims] = await Promise.all([
    db.medicalAid.findUnique({ where: { id: parsed.data.medicalAidFundId } }),
    db.claim.findMany({
      where: {
        id: { in: parsed.data.claimIds },
        practiceId: session.practiceId,
      },
    }),
  ]);
  if (!fund || !fund.active)
    return NextResponse.json(
      { error: "Choose an active medical-aid fund." },
      { status: 400 },
    );
  if (
    claims.length !== parsed.data.claimIds.length ||
    claims.some(
      (claim) =>
        !batchCandidateIsEligible(claim, fund.id, parsed.data.submissionType),
    )
  )
    return NextResponse.json(
      {
        error:
          "Every claim must be validated, ready, for the selected fund, and match the submission type.",
      },
      { status: 409 },
    );
  const activeItems = await db.claimBatchItem.findMany({
    where: {
      claimId: { in: parsed.data.claimIds },
      batch: {
        practiceId: session.practiceId,
        status: { in: ["DRAFT", "READY", "SUBMITTED", "ACKNOWLEDGED"] },
      },
    },
  });
  if (activeItems.length)
    return NextResponse.json(
      { error: "A selected claim is already in an active batch." },
      { status: 409 },
    );
  const starts = claims.map(
      (claim) => claim.serviceDateFrom || claim.consultationDate,
    ),
    ends = claims.map((claim) => claim.serviceDateTo || claim.consultationDate),
    total = calculateClaimTotal(
      claims.map((claim) => ({ quantity: 1, rate: claim.amountSubmitted })),
    );
  const batch = await db.$transaction(async (tx) => {
    const created = await tx.claimBatch.create({
      data: {
        practiceId: session.practiceId,
        reference: ref(`MHC-${fund.abbreviation || "AID"}`),
        medicalAidName: fund.name,
        medicalAidFundId: fund.id,
        periodStart: new Date(Math.min(...starts.map(Number))),
        periodEnd: new Date(Math.max(...ends.map(Number))),
        serviceDateFrom: new Date(Math.min(...starts.map(Number))),
        serviceDateTo: new Date(Math.max(...ends.map(Number))),
        totalAmount: total,
        totalClaims: claims.length,
        submissionMethod: parsed.data.submissionMethod,
        submissionType: parsed.data.submissionType,
        status: "READY",
        notes: parsed.data.notes,
        items: { create: claims.map((claim) => ({ claimId: claim.id })) },
      },
    });
    await tx.claim.updateMany({
      where: { id: { in: parsed.data.claimIds }, practiceId: session.practiceId },
      data: { status: "BATCHED" },
    });
    await tx.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: "CLAIM_BATCH_CREATED",
        entityType: "ClaimBatch",
        entityId: created.id,
        summary: `Batch ${created.reference} prepared with ${claims.length} claims`,
      },
    });
    return created;
  });
  return NextResponse.json(batch, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requirePermission("SUBMIT_CLAIMS");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to submit batches." },
      { status: 403 },
    );
  const parsed = z
    .object({
      id: z.string(),
      action: z.enum(["SUBMIT", "ACKNOWLEDGE", "COMPLETE", "CANCEL"]),
      submissionReference: z.string().trim().min(2).max(160).optional(),
      submittedAt: z.coerce.date().optional(),
      notes: z.string().max(1000).optional(),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Batch status details are incomplete." },
      { status: 400 },
    );
  const batch = await db.claimBatch.findFirst({
    where: { id: parsed.data.id, practiceId: session.practiceId },
    include: { items: true },
  });
  if (!batch)
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  const allowedFrom: Record<string, string[]> = {
    SUBMIT: ["READY"],
    ACKNOWLEDGE: ["SUBMITTED"],
    COMPLETE: ["ACKNOWLEDGED"],
    CANCEL: ["DRAFT", "READY"],
  };
  if (!allowedFrom[parsed.data.action].includes(batch.status))
    return NextResponse.json(
      {
        error: `A ${batch.status.toLowerCase()} batch cannot perform this action.`,
      },
      { status: 409 },
    );
  const status = {
    SUBMIT: "SUBMITTED",
    ACKNOWLEDGE: "ACKNOWLEDGED",
    COMPLETE: "COMPLETED",
    CANCEL: "CANCELLED",
  }[parsed.data.action];
  if (parsed.data.action === "SUBMIT" && !parsed.data.submissionReference)
    return NextResponse.json(
      { error: "Submission reference is required." },
      { status: 400 },
    );
  await db.$transaction(async (tx) => {
    const submittedAt =
      parsed.data.action === "SUBMIT"
        ? parsed.data.submittedAt || new Date()
        : batch.submittedAt;
    await tx.claimBatch.update({
      where: { id: batch.id },
      data: {
        status,
        submissionReference:
          parsed.data.submissionReference || batch.submissionReference,
        submittedAt,
        submittedByUserId:
          parsed.data.action === "SUBMIT"
            ? session.id
            : batch.submittedByUserId,
        acknowledgedAt:
          parsed.data.action === "ACKNOWLEDGE"
            ? new Date()
            : batch.acknowledgedAt,
        notes: parsed.data.notes ?? batch.notes,
      },
    });
    const claimStatus =
      parsed.data.action === "SUBMIT"
        ? "SUBMITTED"
        : parsed.data.action === "ACKNOWLEDGE"
          ? "ACKNOWLEDGED"
          : parsed.data.action === "CANCEL"
            ? "READY_TO_SUBMIT"
            : undefined;
    if (claimStatus) {
      for (const item of batch.items) {
        const claim = await tx.claim.findUnique({
          where: { id: item.claimId },
        });
        if (!claim || claim.practiceId !== session.practiceId) continue;
        await tx.claim.update({
          where: { id: claim.id },
          data: {
            status: claimStatus,
            submittedAt:
              parsed.data.action === "SUBMIT" ? submittedAt : claim.submittedAt,
            acknowledgedAt:
              parsed.data.action === "ACKNOWLEDGE"
                ? new Date()
                : claim.acknowledgedAt,
          },
        });
        await tx.claimStatusEvent.create({
          data: {
            claimId: claim.id,
            previousStatus: claim.status,
            newStatus: claimStatus,
            reason: `Batch ${batch.reference} ${status.toLowerCase()}`,
            changedByUserId: session.id,
          },
        });
      }
    }
    await tx.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: `CLAIM_BATCH_${status}`,
        entityType: "ClaimBatch",
        entityId: batch.id,
        summary: `Batch ${batch.reference} marked ${status.toLowerCase()}`,
      },
    });
  });
  return NextResponse.json({ ok: true });
}
