import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

const verifySchema = z.object({
  versionId: z.string(),
  action: z.enum(["VERIFY", "REJECT", "REQUEST_REPLACEMENT"]),
  rejectionReason: z.string().trim().max(1000).optional(),
  replacementReason: z.string().trim().max(1000).optional(),
  internalNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: Request) {
  const session = await requirePlatformPermission("MANAGE_APPLICATIONS");
  if (!session) {
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  }

  const parsed = verifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Check the verification decision." },
      { status: 400 },
    );
  }

  const { versionId, action, rejectionReason, replacementReason, internalNote } = parsed.data;

  const version = await db.applicationDocumentVersion.findUnique({
    where: { id: versionId },
    include: {
      document: {
        include: {
          application: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!version) {
    return NextResponse.json(
      { error: "Document version not found." },
      { status: 404 },
    );
  }

  if (version.documentStatus !== "UPLOADED" && version.documentStatus !== "REPLACEMENT_REQUESTED") {
    return NextResponse.json(
      { error: "This document version has already been reviewed." },
      { status: 409 },
    );
  }

  let newStatus: string;
  let documentReviewStatus: string;

  switch (action) {
    case "VERIFY":
      newStatus = "VERIFIED";
      documentReviewStatus = "VERIFIED";
      break;
    case "REJECT":
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "A rejection reason is required." },
          { status: 400 },
        );
      }
      newStatus = "REJECTED";
      documentReviewStatus = "REJECTED";
      break;
    case "REQUEST_REPLACEMENT":
      if (!replacementReason) {
        return NextResponse.json(
          { error: "A reason for replacement is required." },
          { status: 400 },
        );
      }
      newStatus = "REPLACEMENT_REQUESTED";
      documentReviewStatus = "REPLACEMENT_REQUESTED";
      break;
    default:
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.applicationDocumentVersion.update({
      where: { id: versionId },
      data: {
        documentStatus: newStatus,
        reviewedById: session.id,
        reviewedAt: new Date(),
        rejectionReason: action === "REJECT" ? rejectionReason : null,
        replacementReason: action === "REQUEST_REPLACEMENT" ? replacementReason : null,
        internalNote: internalNote || null,
      },
    });

    // Update parent document review status
    await tx.applicationDocument.update({
      where: { id: version.documentId },
      data: {
        reviewStatus: documentReviewStatus,
        updatedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.id,
        action: `APPLICATION_DOCUMENT_${newStatus}`,
        entityType: "ApplicationDocumentVersion",
        entityId: versionId,
        summary: `Document ${version.originalFilename} marked ${newStatus.toLowerCase().replaceAll("_", " ")}`,
        requestInfo: requestAuditInfo(request),
      },
    });
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
