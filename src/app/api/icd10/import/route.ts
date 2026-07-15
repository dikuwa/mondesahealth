import { NextResponse } from "next/server";
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
