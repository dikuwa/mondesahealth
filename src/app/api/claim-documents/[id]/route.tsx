import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { BatchDocument, ClaimStatementDocument } from "@/lib/claim-documents";
import { db } from "@/lib/db";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("EXPORT_CLAIM_DOCUMENTS"); if (!session) return NextResponse.json({ error: "You do not have permission to export claim documents." }, { status: 403 });
  const { id } = await params, type = new URL(request.url).searchParams.get("type") || "claim", practice = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  if (!practice) return NextResponse.json({ error: "Practice settings are missing." }, { status: 409 });
  if (type === "claim") {
    const claim = await db.claim.findUnique({ where: { id }, include: { patient: true, medicalAidFund: true, lines: { include: { diagnosisCodes: { orderBy: { sortOrder: "asc" } } } } } }); if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    const buffer = await renderToBuffer(<ClaimStatementDocument claim={claim} practice={practice} />); await db.activityLog.create({ data: { userId: session.id, action: "CLAIM_PDF_EXPORTED", entityType: "Claim", entityId: id, summary: `Claim statement ${claim.claimNumber} exported` } }); return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${claim.claimNumber}-statement.pdf"`, "Cache-Control": "private, no-store" } });
  }
  const batch = await db.claimBatch.findUnique({ where: { id }, include: { items: { include: { claim: { include: { patient: true, lines: { include: { diagnosisCodes: true } } } } } } } }); if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  if (type === "csv") {
    const headings = ["Claim reference", "Patient", "Membership", "Dependant code", "Service date", "Primary ICD-10", "Claim amount", "Status"], rows = batch.items.map(({ claim }) => [claim.claimNumber, claim.patient.fullName, claim.membershipSnapshot ? `****${claim.membershipSnapshot.slice(-4)}` : "", claim.dependantSnapshot, claim.serviceDateFrom?.toISOString().slice(0, 10), claim.lines[0]?.diagnosisCodes.find((code) => code.isPrimary)?.codeSnapshot, claim.amountSubmitted.toFixed(2), claim.status]); const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"); await db.activityLog.create({ data: { userId: session.id, action: "BATCH_MANIFEST_EXPORTED", entityType: "ClaimBatch", entityId: id, summary: `Batch manifest ${batch.reference} exported as CSV` } }); return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${batch.reference}-manifest.csv"`, "Cache-Control": "private, no-store" } });
  }
  const kind = type === "cover" ? "COVER" : "MANIFEST", buffer = await renderToBuffer(<BatchDocument batch={batch} practice={practice} kind={kind} />); await db.activityLog.create({ data: { userId: session.id, action: kind === "COVER" ? "BATCH_COVER_EXPORTED" : "BATCH_MANIFEST_EXPORTED", entityType: "ClaimBatch", entityId: id, summary: `${kind === "COVER" ? "Batch cover sheet" : "Batch manifest"} ${batch.reference} exported` } }); return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${batch.reference}-${kind.toLowerCase()}.pdf"`, "Cache-Control": "private, no-store" } });
}
