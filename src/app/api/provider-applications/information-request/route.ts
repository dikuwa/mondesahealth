import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";
import { APPLICATION_DOCUMENT_CATEGORY_VALUES } from "@/lib/application-document-categories";
import { isValidApplicationTransition } from "@/lib/application-document-categories";
import { notifyPlatformAdmins } from "@/lib/notifications";

const createSchema = z.object({
  applicationId: z.string(),
  applicantMessage: z.string().trim().min(10, "Enter a clear message for the applicant.").max(2000),
  privateNote: z.string().trim().max(1000).optional(),
  deadlineDays: z.number().min(1).max(30).default(14),
  requestedCategories: z.array(z.string()).optional(),
  replacementDocumentIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const session = await requirePlatformPermission("MANAGE_APPLICATIONS");
  if (!session) {
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Check the request details." },
      { status: 400 },
    );
  }

  const { applicationId, applicantMessage, privateNote, deadlineDays, requestedCategories, replacementDocumentIds } = parsed.data;

  const application = await db.practiceApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, email: true, practiceName: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (!isValidApplicationTransition(application.status, "MORE_INFORMATION_REQUIRED")) {
    return NextResponse.json(
      { error: `Cannot request more information when status is ${application.status.replaceAll("_", " ")}.` },
      { status: 409 },
    );
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = randomBytes(32).toString("hex"); // Simple hash for the token

  const result = await db.$transaction(async (tx) => {
    // Mark requested documents for replacement
    if (replacementDocumentIds?.length) {
      await tx.applicationDocumentVersion.updateMany({
        where: { id: { in: replacementDocumentIds } },
        data: { documentStatus: "REPLACEMENT_REQUESTED", replacementReason: applicantMessage.slice(0, 500) },
      });
    }

    const request_ = await tx.informationRequest.create({
      data: {
        applicationId,
        applicantMessage,
        privateNote: privateNote || null,
        deadline: addDays(new Date(), deadlineDays),
        secureToken: rawToken,
        tokenExpiresAt: addDays(new Date(), deadlineDays + 14), // Token lasts longer than deadline
        status: "PENDING",
        requestedCategories: JSON.stringify(requestedCategories || []),
        replacementDocumentIds: JSON.stringify(replacementDocumentIds || []),
        createdById: session.id,
      },
    });

    // Update application status
    await tx.practiceApplication.update({
      where: { id: applicationId },
      data: {
        status: "MORE_INFORMATION_REQUIRED",
        secureAccessToken: rawToken,
        secureAccessTokenExpiresAt: addDays(new Date(), deadlineDays + 14),
      },
    });

    // Create review record
    await tx.applicationReview.create({
      data: {
        applicationId,
        actorId: session.id,
        previousStatus: application.status,
        newStatus: "MORE_INFORMATION_REQUIRED",
        internalNote: privateNote || null,
        applicantReason: applicantMessage,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.id,
        action: "INFORMATION_REQUEST_CREATED",
        entityType: "InformationRequest",
        entityId: request_.id,
        summary: `Requested more information for application ${application.practiceName}`,
        requestInfo: requestAuditInfo(request),
      },
    });

    return request_;
  });

  const respondUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin}/apply/respond/${rawToken}`;

  return NextResponse.json(
    {
      ok: true,
      id: result.id,
      respondUrl,
      status: "MORE_INFORMATION_REQUIRED",
    },
    { status: 201 },
  );
}

// Handle applicant response
export async function PUT(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") || "");
  const applicantMessage = String(form.get("applicantMessage") || "");

  if (!token) {
    return NextResponse.json({ error: "Response token is required." }, { status: 400 });
  }

  const infoRequest = await db.informationRequest.findUnique({
    where: { secureToken: token },
    include: { application: { select: { id: true, status: true } } },
  });

  if (!infoRequest) {
    return NextResponse.json({ error: "Information request not found." }, { status: 404 });
  }

  if (infoRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been responded to or closed." }, { status: 409 });
  }

  if (infoRequest.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This response link has expired." }, { status: 410 });
  }

  await db.$transaction(async (tx) => {
    await tx.applicantResponse.create({
      data: {
        informationRequestId: infoRequest.id,
        applicantMessage: applicantMessage || null,
      },
    });

    await tx.informationRequest.update({
      where: { id: infoRequest.id },
      data: { status: "RESPONDED" },
    });

    await tx.practiceApplication.update({
      where: { id: infoRequest.applicationId },
      data: {
        status: "UNDER_REVIEW",
        secureAccessToken: null,
        secureAccessTokenExpiresAt: null,
      },
    });

    await tx.applicationReview.create({
      data: {
        applicationId: infoRequest.applicationId,
        actorId: "__applicant__",
        previousStatus: "MORE_INFORMATION_REQUIRED",
        newStatus: "UNDER_REVIEW",
        internalNote: "Applicant responded to information request.",
      },
    });

    await tx.activityLog.create({
      data: {
        action: "APPLICANT_RESPONSE_SUBMITTED",
        entityType: "InformationRequest",
        entityId: infoRequest.id,
        summary: "Applicant responded to information request",
        requestInfo: requestAuditInfo(request),
      },
    });
  });

  return NextResponse.json({ ok: true, status: "UNDER_REVIEW" });
}
