import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import type { PrismaClient } from "@prisma/client";

const REQUIRED = ["ICD10_Code", "WHO_Full_Desc", "Valid_ICD10_ClinicalUse", "Valid_ICD10_Primary"];
const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const yes = (value: unknown) => clean(value).toUpperCase() === "Y";
const date = (value: unknown) => value instanceof Date ? value : clean(value) ? new Date(clean(value)) : null;
const safeDate = (value: unknown) => { const parsed = date(value), year = parsed?.getUTCFullYear() || 0; return parsed && !Number.isNaN(parsed.getTime()) && year >= 1900 && year <= 2200 ? parsed : null; };

function ages(value: string) {
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  return { minimumAge: numbers[0] ?? null, maximumAge: numbers[1] ?? null };
}

export async function importIcd10Workbook({ db, input, versionName, sourceFilename, userId }: { db: PrismaClient; input: string | Readable; versionName: string; sourceFilename: string; userId?: string }) {
  const existing = await db.icd10Import.findUnique({ where: { versionName } });
  if (existing?.importedRows) return existing;
  if (existing) await db.icd10Code.deleteMany({ where: { importId: existing.id } });
  const record = existing ?? await db.icd10Import.create({ data: { versionName, sourceFilename, importedByUserId: userId } });
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(input, { worksheets: "emit", sharedStrings: "cache", hyperlinks: "ignore", styles: "ignore" });
  let totalRows = 0, importedRows = 0, skippedRows = 0, invalidRows = 0;
  let foundSheet = false;
  for await (const worksheet of reader) {
    if ((worksheet as unknown as { name: string }).name !== "SA ICD-10 MIT 2021") continue;
    foundSheet = true;
    const columns: Record<string, number> = {};
    let chunk: Array<Record<string, unknown>> = [];
    for await (const row of worksheet) {
      const values = row.values as unknown[];
      if (row.number === 1) {
        values.forEach((value, index) => { const heading = clean(value); if (heading) columns[heading] = index; });
        const missing = REQUIRED.filter((heading) => !columns[heading]);
        if (missing.length) throw new Error(`The ICD-10 worksheet is missing: ${missing.join(", ")}`);
        continue;
      }
      totalRows++;
      const get = (heading: string) => values[columns[heading]];
      const code = clean(get("ICD10_Code")).toUpperCase();
      const description = clean(get("WHO_Full_Desc"));
      if (!code || !description) { invalidRows++; continue; }
      const ageRange = clean(get("Age_Range"));
      chunk.push({
        importId: record.id, code, description,
        threeCharacterCode: clean(get("ICD10_3_Code")) || null,
        threeCharacterDescription: clean(get("ICD10_3_Code_Desc")) || null,
        chapter: clean(get("Chapter_No")) || null,
        chapterDescription: clean(get("Chapter_Desc")) || null,
        groupCode: clean(get("Group_Code")) || null,
        groupDescription: clean(get("Group_Desc")) || null,
        validForClinicalUse: yes(get("Valid_ICD10_ClinicalUse")),
        validForPrimary: yes(get("Valid_ICD10_Primary")),
        validAsterisk: yes(get("Valid_ICD10_Asterisk")), validDagger: yes(get("Valid_ICD10_Dagger")), validSequelae: yes(get("Valid_ICD10_Sequelae")),
        ageRange: ageRange || null, ...ages(ageRange), genderRestriction: clean(get("Gender")) || null,
        status: clean(get("Status")) || null, startDate: safeDate(get("WHO_Start_date")), endDate: safeDate(get("WHO_End_date")), comment: clean(get("Comment")) || null,
      });
      if (chunk.length >= 750) {
        const result = await db.icd10Code.createMany({ data: chunk as never[], skipDuplicates: true });
        importedRows += result.count; skippedRows += chunk.length - result.count; chunk = [];
      }
    }
    if (chunk.length) { const result = await db.icd10Code.createMany({ data: chunk as never[], skipDuplicates: true }); importedRows += result.count; skippedRows += chunk.length - result.count; }
  }
  if (!foundSheet) throw new Error("The workbook does not contain the SA ICD-10 MIT 2021 worksheet.");
  return db.$transaction(async (tx) => {
    const imported = await tx.icd10Import.update({ where: { id: record.id }, data: { totalRows, importedRows, skippedRows, invalidRows, active: false } });
    if (userId) await tx.activityLog.create({ data: { userId, action: "ICD10_DATASET_VALIDATED", entityType: "Icd10Import", entityId: record.id, summary: `${versionName} validated with ${importedRows} codes; activation pending` } });
    return imported;
  });
}

export const bufferStream = (buffer: Buffer) => Readable.from(buffer);
