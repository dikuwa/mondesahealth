import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { bufferStream, importIcd10Workbook } from "@/lib/icd10-import";

export const maxDuration = 300;
export async function POST(request: Request) {
  const session = await requirePermission("IMPORT_ICD10");
  if (!session || session.role !== "OWNER")
    return NextResponse.json(
      { error: "Only the owner can import ICD-10 datasets." },
      { status: 403 },
    );
  const form = await request.formData(),
    file = form.get("file"),
    versionName = String(form.get("versionName") || "").trim();
  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".xlsx") ||
    !versionName
  )
    return NextResponse.json(
      { error: "Choose an XLSX workbook and enter a version name." },
      { status: 400 },
    );
  if (file.size > 30 * 1024 * 1024)
    return NextResponse.json(
      { error: "The workbook must be smaller than 30 MB." },
      { status: 413 },
    );
  try {
    const result = await importIcd10Workbook({
      db,
      input: bufferStream(Buffer.from(await file.arrayBuffer())),
      versionName,
      sourceFilename: file.name,
      userId: session.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The ICD-10 import failed.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requirePermission("IMPORT_ICD10");
  if (!session || session.role !== "OWNER")
    return NextResponse.json(
      { error: "Only the owner can activate ICD-10 datasets." },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  const metaParsed = z
    .object({
      id: z.string().min(1),
      versionName: z.string().trim().min(2).max(160).optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    })
    .safeParse(body);
  if (metaParsed.success && !("confirmation" in (body || {}))) {
    const dataset = await db.icd10Import.findUnique({
      where: { id: metaParsed.data.id },
    });
    if (!dataset)
      return NextResponse.json(
        { error: "ICD-10 dataset not found." },
        { status: 404 },
      );
    const updated = await db.icd10Import.update({
      where: { id: dataset.id },
      data: {
        versionName: metaParsed.data.versionName || dataset.versionName,
        notes: metaParsed.data.notes ?? dataset.notes,
      },
    });
    await db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "ICD10_DATASET_UPDATED",
        entityType: "Icd10Import",
        entityId: dataset.id,
        summary: `${updated.versionName} metadata updated`,
      },
    });
    return NextResponse.json(updated);
  }
  const parsed = z
    .object({ id: z.string().min(1), confirmation: z.literal("REPLACE ICD10") })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Type REPLACE ICD10 to activate this dataset." },
      { status: 400 },
    );
  const dataset = await db.icd10Import.findUnique({
    where: { id: parsed.data.id },
  });
  if (!dataset || !dataset.importedRows)
    return NextResponse.json(
      { error: "Choose a successfully validated dataset." },
      { status: 404 },
    );
  const result = await db.$transaction(async (tx) => {
    await tx.icd10Import.updateMany({
      where: { id: { not: dataset.id } },
      data: { active: false },
    });
    const active = await tx.icd10Import.update({
      where: { id: dataset.id },
      data: { active: true },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "ICD10_DATASET_ACTIVATED",
        entityType: "Icd10Import",
        entityId: dataset.id,
        summary: `${dataset.versionName} activated after explicit replacement confirmation`,
      },
    });
    return active;
  });
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const session = await requirePermission("IMPORT_ICD10");
  if (!session || session.role !== "OWNER")
    return NextResponse.json(
      { error: "Only the owner can delete ICD-10 datasets." },
      { status: 403 },
    );
  const parsed = z
    .object({ id: z.string().min(1), confirmation: z.literal("DELETE ICD10") })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Type DELETE ICD10 to delete this dataset." },
      { status: 400 },
    );
  const dataset = await db.icd10Import.findUnique({
    where: { id: parsed.data.id },
    include: {
      codes: {
        include: { claimLines: { select: { claimLineId: true }, take: 1 } },
      },
    },
  });
  if (!dataset)
    return NextResponse.json(
      { error: "ICD-10 dataset not found." },
      { status: 404 },
    );
  if (dataset.active)
    return NextResponse.json(
      {
        error:
          "The active ICD-10 dataset cannot be deleted. Activate a replacement first.",
      },
      { status: 409 },
    );
  if (dataset.codes.some((code) => code.claimLines.length))
    return NextResponse.json(
      {
        error:
          "This dataset is referenced by historical claims and cannot be deleted.",
      },
      { status: 409 },
    );
  await db.$transaction(async (tx) => {
    await tx.icd10Import.delete({ where: { id: dataset.id } });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "ICD10_DATASET_DELETED",
        entityType: "Icd10Import",
        entityId: dataset.id,
        summary: `${dataset.versionName} deleted`,
      },
    });
  });
  return NextResponse.json({ ok: true });
}
