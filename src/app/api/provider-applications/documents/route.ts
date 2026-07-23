import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { processUploadedFile, generateStorageKey, isDuplicateUpload } from "@/lib/storage";
import { APPLICATION_DOCUMENT_CATEGORY_VALUES } from "@/lib/application-document-categories";
import { requestAuditInfo } from "@/lib/tenant";
import { consumeRateLimit, requestRateLimitKey } from "@/lib/rate-limit";

const MAX_DOCUMENTS = 8;

export async function POST(request: Request) {
  const limit = consumeRateLimit(
    requestRateLimitKey(request, "application-document-upload"),
    20,
    60 * 60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many upload attempts. Please try again later." },
      { status: 429 },
    );

  const form = await request.formData();
  const applicationId = String(form.get("applicationId") || "");
  const category = String(form.get("category") || "");
  const file = form.get("file");

  if (!applicationId || !category || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Application, category, and file are required." },
      { status: 400 },
    );
  }

  if (!(APPLICATION_DOCUMENT_CATEGORY_VALUES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: "Select a valid document category." },
      { status: 400 },
    );
  }

  const application = await db.practiceApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  }

  if (!["DRAFT", "SUBMITTED", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED"].includes(application.status)) {
    return NextResponse.json(
      { error: "Documents can no longer be uploaded for this application." },
      { status: 409 },
    );
  }

  // Count existing documents
  const documentCount = await db.applicationDocument.count({
    where: { applicationId },
  });

  if (documentCount >= MAX_DOCUMENTS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_DOCUMENTS} documents allowed. Remove one before adding another.` },
      { status: 409 },
    );
  }

  const processed = await processUploadedFile(file);
  if (!processed.ok) {
    return NextResponse.json({ error: processed.error }, { status: 400 });
  }

  // Check for duplicate by checksum
  const existingVersions = await db.applicationDocumentVersion.findMany({
    where: {
      document: { applicationId },
    },
    select: { checksum: true },
  });

  if (isDuplicateUpload(processed.checksum, existingVersions.map((v) => v.checksum))) {
    return NextResponse.json(
      { error: "A file with identical content has already been uploaded." },
      { status: 409 },
    );
  }

  const storageKey = generateStorageKey(applicationId, category, file.name);

  const result = await db.$transaction(async (tx) => {
    // Find or create the document record
    let document = await tx.applicationDocument.findFirst({
      where: { applicationId, category },
    });

    if (document) {
      // Create a new version
      const version = document.currentVersion + 1;
      const docVersion = await tx.applicationDocumentVersion.create({
        data: {
          documentId: document.id,
          version,
          originalFilename: file.name.replace(/[\r\n"/\\]/g, "_").slice(0, 180),
          storageKey,
          mimeType: processed.mimeType,
          size: processed.data.byteLength,
          data: new Uint8Array(processed.data),
          checksum: processed.checksum,
          documentStatus: "UPLOADED",
        },
      });

      await tx.applicationDocument.update({
        where: { id: document.id },
        data: { currentVersion: version, reviewStatus: "UPLOADED", updatedAt: new Date() },
      });

      return { document, version: docVersion, isNew: false as const };
    } else {
      // Create new document with version 1
      document = await tx.applicationDocument.create({
        data: {
          applicationId,
          category,
          currentVersion: 1,
        },
      });

      const docVersion = await tx.applicationDocumentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          originalFilename: file.name.replace(/[\r\n"/\\]/g, "_").slice(0, 180),
          storageKey,
          mimeType: processed.mimeType,
          size: processed.data.byteLength,
          data: new Uint8Array(processed.data),
          checksum: processed.checksum,
          documentStatus: "UPLOADED",
        },
      });

      return { document, version: docVersion, isNew: true as const };
    }
  });

  await db.activityLog.create({
    data: {
      action: "APPLICATION_DOCUMENT_UPLOADED",
      entityType: "ApplicationDocumentVersion",
      entityId: result.version.id,
      summary: `Uploaded ${result.document.category} document for application ${applicationId}`,
      requestInfo: requestAuditInfo(request),
    },
  });

  return NextResponse.json(
    {
      documentId: result.document.id,
      versionId: result.version.id,
      category: result.document.category,
      isNew: result.isNew,
      version: result.version.version,
    },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const session = await requirePlatformPermission("VIEW_APPLICATIONS");
  if (!session)
    return NextResponse.json(
      { error: "Access denied." },
      { status: 403 },
    );

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");

  if (!applicationId) {
    return NextResponse.json(
      { error: "Application ID is required." },
      { status: 400 },
    );
  }

  const documents = await db.applicationDocument.findMany({
    where: { applicationId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: {
          reviewer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ documents });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json(
      { error: "Document ID is required." },
      { status: 400 },
    );
  }

  const document = await db.applicationDocument.findUnique({
    where: { id: documentId },
    include: { application: { select: { status: true } } },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 },
    );
  }

  if (!["DRAFT", "SUBMITTED"].includes(document.application.status)) {
    return NextResponse.json(
      { error: "Documents can only be removed while the application is in draft or submitted state." },
      { status: 409 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.applicationDocumentVersion.deleteMany({
      where: { documentId },
    });
    await tx.applicationDocument.delete({
      where: { id: documentId },
    });
    await tx.activityLog.create({
      data: {
        action: "APPLICATION_DOCUMENT_REMOVED",
        entityType: "ApplicationDocument",
        entityId: documentId,
        summary: `Removed ${document.category} document from application`,
        requestInfo: requestAuditInfo(request),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
