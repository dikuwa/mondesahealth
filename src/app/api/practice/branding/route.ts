import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";
import { practiceWriteDenied } from "@/lib/practice-write-access";

const logo = z.union([
  z.string().max(1_500_000).regex(/^data:image\/(png|jpeg|webp);base64,/),
  z.null(),
]);

export async function PATCH(request: Request) {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session) return NextResponse.json({ error: "Practice-management access is required." }, { status: 403 });
  const restricted = await practiceWriteDenied(session.practiceId);
  if (restricted) return restricted;
  const parsed = z.object({ logoData: logo }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a PNG, JPEG or WebP logo smaller than 1 MB." }, { status: 400 });
  await db.$transaction([
    db.practice.update({ where: { id: session.practiceId }, data: { logoData: parsed.data.logoData } }),
    db.activityLog.create({ data: { userId: session.id, practiceId: session.practiceId, action: "PRACTICE_BRANDING_UPDATED", entityType: "Practice", entityId: session.practiceId, summary: parsed.data.logoData ? "Updated practice logo" : "Removed practice logo", requestInfo: requestAuditInfo(request) } }),
  ]);
  return NextResponse.json({ ok: true });
}
