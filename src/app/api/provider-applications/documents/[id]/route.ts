import { NextResponse } from "next/server";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const serve = url.searchParams.get("serve") === "true";

  const session = await requirePlatformPermission("VIEW_APPLICATIONS");
  if (!session) {
    // Try token-based access
    const token = url.searchParams.get("token");
    if (token) {
      const version = await db.applicationDocumentVersion.findFirst({
        where: { id, document: { application: { secureAccessToken: token } } },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          size: true,
          version: true,
          documentStatus: true,
          uploadedAt: true,
          data: true,
          document: {
            select: {
              application: { select: { secureAccessTokenExpiresAt: true } },
            },
          },
        },
      });
      if (!version) {
        return NextResponse.json(
          { error: "Document not found or access denied." },
          { status: 404 },
        );
      }
      if (
        !version.document.application.secureAccessTokenExpiresAt ||
        version.document.application.secureAccessTokenExpiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: "Access token has expired." },
          { status: 403 },
        );
      }
      if (serve && version.data) {
        return new Response(version.data, {
          status: 200,
          headers: {
            "Content-Type": version.mimeType,
            "Content-Disposition": `inline; filename="${encodeURIComponent(version.originalFilename)}"`,
            "Content-Length": String(version.size),
          },
        });
      }
      return NextResponse.json({
        filename: version.originalFilename,
        mimeType: version.mimeType,
        size: version.size,
        version: version.version,
        documentStatus: version.documentStatus,
        uploadedAt: version.uploadedAt,
      });
    }
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  }

  const version = await db.applicationDocumentVersion.findUnique({
    where: { id },
    include: {
      reviewer: { select: { id: true, name: true } },
      document: {
        include: {
          application: {
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!version) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 },
    );
  }

  // Serve raw file bytes if ?serve=true
  if (serve && version.data) {
    return new Response(version.data, {
      status: 200,
      headers: {
        "Content-Type": version.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(version.originalFilename)}"`,
        "Content-Length": String(version.size),
      },
    });
  }

  await db.activityLog.create({
    data: {
      userId: session.id,
      action: "APPLICATION_DOCUMENT_PREVIEWED",
      entityType: "ApplicationDocumentVersion",
      entityId: id,
      summary: `Previewed document ${version.originalFilename}`,
      requestInfo: requestAuditInfo(request),
    },
  });

  return NextResponse.json({
    id: version.id,
    documentId: version.documentId,
    version: version.version,
    filename: version.originalFilename,
    mimeType: version.mimeType,
    size: version.size,
    checksum: version.checksum,
    documentStatus: version.documentStatus,
    rejectionReason: version.rejectionReason,
    replacementReason: version.replacementReason,
    internalNote: version.internalNote,
    uploadedAt: version.uploadedAt,
    reviewedById: version.reviewedById,
    reviewedAt: version.reviewedAt,
    reviewer: version.reviewer
      ? { id: version.reviewer.id, name: version.reviewer.name }
      : null,
  });
}
