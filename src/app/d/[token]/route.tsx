import { createHash } from "crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceDocument } from "@/lib/invoice-document";
import { ReceiptDocument } from "@/lib/receipt-document";
import QRCode from "qrcode";
import { SickNoteDocument } from "@/lib/sick-note-document";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const document = await db.generatedDocument.findFirst({ where: { secureToken: createHash("sha256").update(token).digest("hex"), status: "ISSUED", expiresAt: { gt: new Date() } }, include: { invoice: { include: { patient: true, lines: true } }, receipt: { include: { payment: { include: { patient: true, invoice: true, claim: true } } } }, sickNote: { include: { patient: { select: { fullName: true, patientNumber: true, identityNumber: true } }, doctor: { select: { name: true } } } } } });
  if (!document?.invoice && !document?.receipt && !document?.sickNote) return NextResponse.json({ error: "This document link is invalid or expired." }, { status: 404 });
  const practice = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  if (!practice) return NextResponse.json({ error: "Document unavailable." }, { status: 404 });
  if (document.sickNote?.status !== undefined && document.sickNote.status !== "ISSUED") return NextResponse.json({ error: "This medical certificate is no longer available for sharing." }, { status: 410 });
  const verificationUrl = document.sickNote?.verificationToken ? `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin}/verify/sick-note/${encodeURIComponent(document.sickNote.verificationToken)}` : undefined;
  const qrDataUrl = verificationUrl ? await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 240, color: { dark: "#18332d", light: "#ffffff" } }) : undefined;
  const buffer = document.invoice ? await renderToBuffer(<InvoiceDocument invoice={document.invoice} practice={practice} />) : document.receipt ? await renderToBuffer(<ReceiptDocument receipt={document.receipt} practice={practice} />) : await renderToBuffer(<SickNoteDocument note={document.sickNote!} practice={practice} qrDataUrl={qrDataUrl} verificationUrl={verificationUrl} />);
  const number = document.invoice?.number || document.receipt?.number || document.sickNote!.certificateNumber;
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${number}.pdf"`, "Cache-Control": "private, no-store" } });
}
