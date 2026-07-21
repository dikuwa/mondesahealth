import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSickNoteViewer } from "@/lib/sick-note-access";
import { SickNoteDocument } from "@/lib/sick-note-document";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSickNoteViewer();
  if (!session) return NextResponse.json({ error: "You do not have permission to view sick notes." }, { status: 403 });
  const { id } = await params;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const preview = url.searchParams.get("preview") === "1";
  const [note, practice] = await Promise.all([
    db.sickNote.findFirst({ where: { id, practiceId: session.practiceId }, include: { patient: { select: { fullName: true, patientNumber: true, identityNumber: true } }, doctor: { select: { name: true } } } }),
    db.practiceSetting.findUnique({ where: { practiceId: session.practiceId } }),
  ]);
  if (!note || !practice) return NextResponse.json({ error: "Sick note not found." }, { status: 404 });
  if (note.status !== "ISSUED" && !preview) return NextResponse.json({ error: note.status === "REVOKED" ? "This sick note has been revoked and cannot be downloaded." : "Only issued sick notes can be downloaded." }, { status: 409 });
  if (download && note.status !== "ISSUED") return NextResponse.json({ error: "Only currently issued sick notes can be downloaded." }, { status: 409 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const verificationUrl = note.verificationToken ? `${origin}/verify/sick-note/${encodeURIComponent(note.verificationToken)}` : undefined;
  const qrDataUrl = verificationUrl ? await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 240, color: { dark: "#18332d", light: "#ffffff" } }) : undefined;
  const buffer = await renderToBuffer(<SickNoteDocument note={note} practice={practice} qrDataUrl={qrDataUrl} verificationUrl={verificationUrl} />);
  await db.activityLog.create({ data: { userId: session.id, action: download ? "SICK_NOTE_DOWNLOADED" : "SICK_NOTE_VIEWED", entityType: "SickNote", entityId: note.id, summary: `${download ? "Downloaded" : "Viewed"} ${note.certificateNumber}` } });
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${note.certificateNumber}.pdf"`, "Cache-Control": "private, no-store" } });
}
