import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

const input = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("PLATFORM") }),
  z.object({ scope: z.literal("PRACTICE"), practiceId: z.string().min(1) }),
]);

export async function POST(request: Request) {
  const current = await getSession();
  if (!current) return NextResponse.json({ error: "Sign in again to switch workspace." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an available workspace." }, { status: 400 });
  const user = await db.user.findUnique({
    where: { id: current.id },
    include: { platformMembership: true },
  });
  if (!user?.active) return NextResponse.json({ error: "Account access is disabled." }, { status: 403 });

  if (parsed.data.scope === "PLATFORM") {
    if (!user.platformMembership?.active && user.platformRole !== "PLATFORM_OWNER") {
      return NextResponse.json({ error: "Platform access is not assigned to this account." }, { status: 403 });
    }
    await createSession({ id: user.id, sessionVersion: user.sessionVersion }, { scope: "PLATFORM" });
    await db.activityLog.create({
      data: {
        userId: user.id,
        practiceId: null,
        action: "WORKSPACE_SCOPE_CHANGED",
        entityType: "Authentication",
        entityId: user.id,
        summary: "Switched to Platform Administration",
        requestInfo: requestAuditInfo(request),
      },
    });
    return NextResponse.json({ destination: "/platform" });
  }

  const membership = await db.practiceUser.findUnique({
    where: { practiceId_userId: { practiceId: parsed.data.practiceId, userId: user.id } },
    include: { practice: { select: { name: true, status: true } } },
  });
  if (!membership?.active) {
    return NextResponse.json({ error: "You do not have active membership in that practice." }, { status: 403 });
  }
  await createSession(
    { id: user.id, sessionVersion: user.sessionVersion },
    { scope: "PRACTICE", practiceId: membership.practiceId },
  );
  await db.activityLog.create({
    data: {
      userId: user.id,
      practiceId: membership.practiceId,
      action: "WORKSPACE_SCOPE_CHANGED",
      entityType: "Practice",
      entityId: membership.practiceId,
      summary: `Switched to ${membership.practice.name}`,
      requestInfo: requestAuditInfo(request),
    },
  });
  return NextResponse.json({ destination: "/dashboard" });
}
