import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptionAccess } from "@/lib/subscription-access";
import { requestAuditInfo } from "@/lib/tenant";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_CLINICAL_RECORDS");
  if (!session)
    return NextResponse.json(
      { error: "Only authorised clinicians can upload clinical attachments." },
      { status: 403 },
    );
  const access = await subscriptionAccess(session.practiceId);
  if (!access.allowed)
    return NextResponse.json(
      { error: access.warning, code: "SUBSCRIPTION_RESTRICTED" },
      { status: 402 },
    );
  const form = await request.formData();
  const encounterId = String(form.get("encounterId") || "");
  const file = form.get("file");
  if (!(file instanceof File) || !encounterId)
    return NextResponse.json(
      { error: "Choose a clinical attachment." },
      { status: 400 },
    );
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes)
    return NextResponse.json(
      { error: "Upload a PDF, JPEG or PNG no larger than 10 MB." },
      { status: 400 },
    );
  const encounter = await db.clinicalEncounter.findFirst({
    where: { id: encounterId, practiceId: session.practiceId },
    select: { id: true, status: true },
  });
  if (!encounter)
    return NextResponse.json(
      { error: "Encounter not found." },
      { status: 404 },
    );
  if (["COMPLETED", "AMENDED"].includes(encounter.status))
    return NextResponse.json(
      {
        error:
          "Attachments can only be added before the encounter is completed.",
      },
      { status: 409 },
    );
  const attachment = await db.$transaction(async (tx) => {
    const created = await tx.encounterAttachment.create({
      data: {
        encounterId,
        filename:
          file.name.replace(/[\r\n"/\\]/g, "_").slice(0, 180) || "attachment",
        mimeType: file.type,
        fileSize: file.size,
        data: Buffer.from(await file.arrayBuffer()),
        uploadedById: session.id,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "ENCOUNTER_ATTACHMENT_UPLOADED",
        entityType: "EncounterAttachment",
        entityId: created.id,
        summary: `Uploaded clinical attachment ${created.filename}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return created;
  });
  return NextResponse.json({ attachment }, { status: 201 });
}

export async function GET(request: Request) {
  const session = await requirePermission("VIEW_CLINICAL_RECORDS");
  if (!session)
    return NextResponse.json(
      { error: "Clinical-record access is required." },
      { status: 403 },
    );
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 400 },
    );
  const attachment = await db.encounterAttachment.findFirst({
    where: { id, encounter: { practiceId: session.practiceId } },
  });
  if (!attachment)
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 },
    );
  await db.activityLog.create({
    data: {
      userId: session.id,
      practiceId: session.practiceId,
      action: "ATTACHMENT_OPENED",
      entityType: "EncounterAttachment",
      entityId: attachment.id,
      summary: `Opened clinical attachment ${attachment.filename}`,
      requestInfo: requestAuditInfo(request),
    },
  });
  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.filename.replace(/["\r\n]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
