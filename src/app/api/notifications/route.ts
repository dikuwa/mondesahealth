import { NextResponse } from "next/server";
import { z } from "zod";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";

async function session() { return getPracticeSession(); }
export async function GET() {
  const user = await session();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const notifications = await db.notification.findMany({ where: { userId: user.id, practiceId:user.practiceId }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ notifications, unread: notifications.filter((item) => !item.readAt).length });
}
export async function PATCH(request: Request) {
  const user = await session();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["READ", "READ_ALL"]), id: z.string().optional() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });
  if (parsed.data.action === "READ_ALL") await db.notification.updateMany({ where: { userId: user.id, practiceId:user.practiceId, readAt: null }, data: { readAt: new Date() } });
  else if (parsed.data.id) await db.notification.updateMany({ where: { id: parsed.data.id, userId: user.id, practiceId:user.practiceId }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request) {
  const user = await session();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const parsed = z.object({ id: z.string().optional() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
  await db.notification.deleteMany({ where: { userId: user.id, practiceId:user.practiceId, ...(parsed.data.id ? { id: parsed.data.id } : {}) } });
  return NextResponse.json({ ok: true });
}
