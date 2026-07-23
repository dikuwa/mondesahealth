import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidLifecycleTransition } from "@/lib/practice-lifecycle";
import { requestAuditInfo } from "@/lib/tenant";

const activateSchema = z.object({
  status: z.enum(["ACTIVE_PRIVATE", "ACTIVE_PUBLIC"]),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requirePlatformPermission("MANAGE_APPLICATIONS");
  if (!session)
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );

  const parsed = activateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );

  const practice = await db.practice.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });

  if (!practice)
    return NextResponse.json(
      { error: "Practice not found." },
      { status: 404 },
    );

  if (!isValidLifecycleTransition(practice.status, parsed.data.status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${practice.status} to ${parsed.data.status}.`,
      },
      { status: 409 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.practice.update({
      where: { id },
      data: {
        status: parsed.data.status,
        activatedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: id,
        action: `PRACTICE_${parsed.data.status}`,
        entityType: "Practice",
        entityId: id,
        summary: `Practice ${practice.name} set to ${parsed.data.status === "ACTIVE_PRIVATE" ? "active (private)" : "active (public)"}${parsed.data.note ? `: ${parsed.data.note}` : ""}`,
        requestInfo: requestAuditInfo(request),
      },
    });
  });

  return NextResponse.json({
    ok: true,
    status: parsed.data.status,
  });
}
