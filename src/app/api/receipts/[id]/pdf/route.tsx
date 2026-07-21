import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getFinanceSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReceiptDocument } from "@/lib/receipt-document";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getFinanceSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  const [receipt, practice] = await Promise.all([
    db.receipt.findFirst({
      where: { id, payment: { practiceId: session.practiceId } },
      include: {
        payment: { include: { patient: true, invoice: true, claim: true } },
      },
    }),
    db.practiceSetting.findUnique({
      where: { practiceId: session.practiceId },
    }),
  ]);
  if (!receipt || !practice)
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const buffer = await renderToBuffer(
    <ReceiptDocument receipt={receipt} practice={practice} />,
  );
  await db.activityLog.create({
    data: {
      practiceId: session.practiceId,
      userId: session.id,
      action: download ? "RECEIPT_DOWNLOADED" : "RECEIPT_VIEWED",
      entityType: "Receipt",
      entityId: receipt.id,
      summary: `${download ? "Downloaded" : "Viewed"} ${receipt.number}`,
    },
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${receipt.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
