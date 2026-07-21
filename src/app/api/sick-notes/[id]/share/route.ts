import { createHash, randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSickNoteManager } from "@/lib/sick-note-access";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSickNoteManager();
  if (!session) return NextResponse.json({ error: "You do not have permission to share sick notes." }, { status: 403 });
  const { id } = await params;
  const note = await db.sickNote.findFirst({ where: { id, practiceId:session.practiceId }, include: { patient: { select: { fullName: true, phone: true, whatsapp: true, email: true } } } });
  if (!note) return NextResponse.json({ error: "Sick note not found." }, { status: 404 });
  if (note.status !== "ISSUED" || !note.verificationToken) return NextResponse.json({ error: "Only a currently issued sick note can be shared." }, { status: 409 });
  const token = randomBytes(24).toString("base64url");
  const expiresAt = addDays(new Date(), 14);
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  await db.$transaction(async (tx) => {
    await tx.generatedDocument.updateMany({ where: { sickNoteId: id, type: "SICK_NOTE_SHARE", status: "ISSUED" }, data: { status: "REVOKED" } });
    await tx.generatedDocument.create({ data: { number: `SHARE-${note.certificateNumber}-${Date.now()}`, type: "SICK_NOTE_SHARE", sickNoteId: id, secureToken: createHash("sha256").update(token).digest("hex"), expiresAt } });
    await tx.activityLog.create({ data: { userId: session.id, action: "SICK_NOTE_SHARE_CREATED", entityType: "SickNote", entityId: note.id, summary: `Secure share link created for ${note.certificateNumber}` } });
  });
  const link = `${origin}/d/${token}`;
  const message = `Hello ${note.patient.fullName.split(" ")[0]},\n\nYour medical certificate ${note.certificateNumber} from Mondesa Health Polyclinic is ready.\n\nView the document securely:\n${link}\n\nThis link expires in 14 days. No private clinical details are included in this message.`;
  return NextResponse.json({ link, message, whatsapp: `https://wa.me/${(note.patient.whatsapp || note.patient.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, email: note.patient.email ? `mailto:${encodeURIComponent(note.patient.email)}?subject=${encodeURIComponent(`Medical certificate ${note.certificateNumber} · Mondesa Health`)}&body=${encodeURIComponent(message)}` : null });
}
