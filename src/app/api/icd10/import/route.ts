import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { bufferStream, importIcd10Workbook } from "@/lib/icd10-import";

export const maxDuration = 300;
export async function POST(request: Request) {
  const session = await requirePermission("IMPORT_ICD10");
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Only the owner can import ICD-10 datasets." }, { status: 403 });
  const form = await request.formData(), file = form.get("file"), versionName = String(form.get("versionName") || "").trim();
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || !versionName) return NextResponse.json({ error: "Choose an XLSX workbook and enter a version name." }, { status: 400 });
  if (file.size > 30 * 1024 * 1024) return NextResponse.json({ error: "The workbook must be smaller than 30 MB." }, { status: 413 });
  try {
    const result = await importIcd10Workbook({ db, input: bufferStream(Buffer.from(await file.arrayBuffer())), versionName, sourceFilename: file.name, userId: session.id });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The ICD-10 import failed." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const session = await requirePermission("IMPORT_ICD10");
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Only the owner can activate ICD-10 datasets." }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1), confirmation: z.literal("REPLACE ICD10") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type REPLACE ICD10 to activate this dataset." }, { status: 400 });
  const dataset = await db.icd10Import.findUnique({ where: { id: parsed.data.id } });
  if (!dataset || !dataset.importedRows) return NextResponse.json({ error: "Choose a successfully validated dataset." }, { status: 404 });
  const result = await db.$transaction(async (tx) => {
    await tx.icd10Import.updateMany({ where: { id: { not: dataset.id } }, data: { active: false } });
    const active = await tx.icd10Import.update({ where: { id: dataset.id }, data: { active: true } });
    await tx.activityLog.create({ data: { userId: session.id, action: "ICD10_DATASET_ACTIVATED", entityType: "Icd10Import", entityId: dataset.id, summary: `${dataset.versionName} activated after explicit replacement confirmation` } });
    return active;
  });
  return NextResponse.json(result);
}
