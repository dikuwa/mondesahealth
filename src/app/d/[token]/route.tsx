import { createHash } from "crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceDocument } from "@/lib/invoice-document";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const document = await db.generatedDocument.findFirst({ where: { secureToken: createHash("sha256").update(token).digest("hex"), type: "INVOICE_SHARE", status: "ISSUED", expiresAt: { gt: new Date() } }, include: { invoice: { include: { patient: true, lines: true } } } });
  if (!document?.invoice) return NextResponse.json({ error: "This document link is invalid or expired." }, { status: 404 });
  const practice = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  if (!practice) return NextResponse.json({ error: "Document unavailable." }, { status: 404 });
  const buffer = await renderToBuffer(<InvoiceDocument invoice={document.invoice} practice={practice} />);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${document.invoice.number}.pdf"`, "Cache-Control": "private, no-store" } });
}
