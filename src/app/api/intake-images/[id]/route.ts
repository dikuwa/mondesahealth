import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("VIEW_CLINICAL_INTAKE");
  if (!session) return NextResponse.json({ error: "You do not have permission to view patient intake images." }, { status: 403 });
  const { id } = await params;
  const image = await db.patientIntakeImage.findFirst({ where: { id, intake: { practiceId: session.practiceId } } });
  if (!image) return NextResponse.json({ error: "Intake image not found." }, { status: 404 });
  await db.activityLog.create({ data: { practiceId: session.practiceId, userId: session.id, action: "PATIENT_INTAKE_IMAGE_VIEWED", entityType: "PatientIntakeImage", entityId: image.id, summary: "Restricted patient intake image viewed" } });
  const filename = image.filename.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(image.data, { headers: { "Content-Type": image.mimeType, "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
