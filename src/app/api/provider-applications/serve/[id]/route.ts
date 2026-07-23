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
  const token = url.searchParams.get("token");

  // Platform session access
  const session = await requirePlatformPermission("VIEW_APPLICATIONS");
  if (!session) {
    // Token-based access for applicants
    if (token) {
      const version = await db.applicationDocumentVersion.findFirst({
        where: {
          id,
          document: { application: { secureAccessToken: token } },
        },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          size: true,
          data: true,
          document: {
            select: {
              application: { select: { secureAccessTokenExpiresAt: true } },
            },
          },
        },
      });

      if (!version)
        return NextResponse.json(
          { error: "Document not found or access denied." },
          { status: 404 },
        );

      if (
        !version.document.application.secureAccessTokenExpiresAt ||
        version.document.application.secureAccessTokenExpiresAt < new Date()
      )
        return NextResponse.json(
          { error: "Access token has expired." },
          { status: 403 },
        );

      if (!version.data)
        return NextResponse.json(
          { error: "Document content is not available." },
          { status: 410 },
        );

      const filename = version.originalFilename.replace(/[\r\n"\\]/g, "_");
      return new Response(version.data, {
        headers: {
          "Content-Type": version.mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
          "Content-Length": String(version.size),
          "Cache-Control": "private, no-store",
        },
      });
    }
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  }

  // Platform reviewer access — includes audit logging
  const version = await db.applicationDocumentVersion.findUnique({
    where: { id },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      size: true,
      data: true,
      document: {
        select: { application: { select: { id: true, practiceName: true } } },
      },
    },
  });

  if (!version)
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 },
    );

  if (!version.data)
    return NextResponse.json(
      { error: "Document content is not available." },
      { status: 410 },
    );

  // Audit the download/preview
  await db.activityLog.create({
    data: {
      userId: session.id,
      action: "APPLICATION_DOCUMENT_SERVED",
      entityType: "ApplicationDocumentVersion",
      entityId: id,
      summary: `Served document ${version.originalFilename} for application ${version.document.application.practiceName}`,
      requestInfo: requestAuditInfo(request),
    },
  });

  const filename = version.originalFilename.replace(/[\r\n"\\]/g, "_");
  return new Response(version.data, {
    headers: {
      "Content-Type": version.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(version.size),
      "Cache-Control": "private, no-store",
    },
  });
}
