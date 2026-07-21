import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePermission("MANAGE_FINANCE");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to share receipts." },
      { status: 403 },
    );
  const { id } = await params;
  const receipt = await db.receipt.findFirst({
    where: { id, payment: { practiceId: session.practiceId } },
    include: { payment: { include: { patient: true } } },
  });
  if (!receipt)
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const token = randomBytes(24).toString("base64url");
  const expiresAt = addDays(new Date(), 14);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  await db.$transaction(async (tx) => {
    await tx.generatedDocument.updateMany({
      where: {
        practiceId: session.practiceId,
        receiptId: id,
        type: "RECEIPT_SHARE",
        status: "ISSUED",
      },
      data: { status: "REVOKED" },
    });
    await tx.generatedDocument.create({
      data: {
        practiceId: session.practiceId,
        number: `SHARE-${receipt.number}-${Date.now()}`,
        type: "RECEIPT_SHARE",
        receiptId: id,
        secureToken: createHash("sha256").update(token).digest("hex"),
        expiresAt,
      },
    });
    await tx.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: "RECEIPT_SHARE_CREATED",
        entityType: "Receipt",
        entityId: id,
        summary: `Secure share link prepared for ${receipt.number}`,
      },
    });
  });
  const link = `${origin}/d/${token}`;
  const message = `Hello ${receipt.payment.patient.fullName.split(" ")[0]},\n\nYour receipt ${receipt.number} is ready.\n\nAmount: NAD ${receipt.payment.amount.toFixed(2)}\n\nView it securely:\n${link}\n\nThis message has been prepared for manual sharing by Mondesa Health Polyclinic.`;
  return NextResponse.json({
    link,
    message,
    whatsapp: `https://wa.me/${(receipt.payment.patient.whatsapp || receipt.payment.patient.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
    email: receipt.payment.patient.email
      ? `mailto:${encodeURIComponent(receipt.payment.patient.email)}?subject=${encodeURIComponent(`Receipt ${receipt.number} · Mondesa Health`)}&body=${encodeURIComponent(message)}`
      : null,
  });
}
