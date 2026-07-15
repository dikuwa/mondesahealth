import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await requirePermission("SEARCH_ICD10");
  if (!session) return NextResponse.json({ error: "You do not have permission to search ICD-10 codes." }, { status: 403 });
  const url = new URL(request.url), query = url.searchParams.get("q")?.trim() || "", page = Math.max(1, Number(url.searchParams.get("page")) || 1), take = 20;
  if (query.length < 2) return NextResponse.json({ results: [], page, hasMore: false });
  const active = await db.icd10Import.findFirst({ where: { active: true }, orderBy: { importedAt: "desc" } });
  if (!active) return NextResponse.json({ results: [], page, hasMore: false, warning: "No active ICD-10 dataset." });
  const where = { importId: active.id, OR: [{ code: { startsWith: query.toUpperCase(), mode: "insensitive" as const } }, { description: { contains: query, mode: "insensitive" as const } }] };
  const rows = await db.icd10Code.findMany({ where, orderBy: [{ validForClinicalUse: "desc" }, { code: "asc" }], skip: (page - 1) * take, take: take + 1, select: { id: true, code: true, description: true, validForClinicalUse: true, validForPrimary: true, ageRange: true, genderRestriction: true, comment: true } });
  return NextResponse.json({ results: rows.slice(0, take), page, hasMore: rows.length > take, version: active.versionName });
}
