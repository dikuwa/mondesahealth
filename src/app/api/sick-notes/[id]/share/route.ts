import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSickNoteManager } from "@/lib/sick-note-access";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSickNoteManager();
  if (!session) return NextResponse.json({ error: "You do not have permission to share sick notes." }, { status: 403 });
  const { id } = await params;
  const note = await db.sickNote.findUnique({ where: { id }, include: { patient: { select: { fullName: true, phone: true, whatsapp: true, email: true } } } });
  if (!note) return NextResponse.json({ error: "Sick note not found." }, { status: 404 });
  if (note.status !== "ISSUED" || !note.verificationToken) return NextResponse.json({ error: "Only a currently issued sick note can be shared." }, { status: 409 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const verifyUrl = `${origin}/verify/sick-note/${encodeURIComponent(note.verificationToken)}`;
  const pdfUrl = `${origin}/api/sick-notes/${note.id}/pdf?download=1`;
  const message = `Hello ${note.patient.fullName}, your medical certificate ${note.certificateNumber} has been issued by Mondesa Health Polyclinic. Verify it securely here: ${verifyUrl}`;
  const whatsappNumber = (note.patient.whatsapp || note.patient.phone).replace(/[^\d]/g, "");
  await db.activityLog.create({ data: { userId: session.id, action: "SICK_NOTE_SHARED", entityType: "SickNote", entityId: note.id, summary: `Secure sharing options prepared for ${note.certificateNumber}` } });
  return NextResponse.json({ verifyUrl, pdfUrl, message, whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, emailUrl: note.patient.email ? `mailto:${note.patient.email}?subject=${encodeURIComponent(`Medical certificate ${note.certificateNumber}`)}&body=${encodeURIComponent(message)}` : null });
}
