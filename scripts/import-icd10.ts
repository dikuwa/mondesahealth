import { PrismaClient } from "@prisma/client";
import { importIcd10Workbook } from "../src/lib/icd10-import";

const db = new PrismaClient();
const path = process.argv[2] || "/Users/stunna/Downloads/ICD-10_MIT_2021_Excel_16-March_2021.xlsx";
importIcd10Workbook({ db, input: path, versionName: "MIT 2021 (16 March 2021)", sourceFilename: path.split("/").pop() || "ICD-10 MIT 2021.xlsx" })
  .then((result) => console.log(JSON.stringify({ version: result.versionName, imported: result.importedRows, skipped: result.skippedRows, invalid: result.invalidRows })))
  .finally(() => db.$disconnect());
