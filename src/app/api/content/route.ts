import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_PRACTICE_CONTENT } from "../../../../prisma/polyclinic-data";

const contentSchema = z.object({
  hero: z.object({
    eyebrow: z.string().max(120),
    headline: z.string().max(240),
    description: z.string().max(1000),
    bookingLabel: z.string().max(80),
    servicesLabel: z.string().max(80),
    trustPoints: z.array(z.string().max(120)).length(2),
  }),
  about: z.object({
    eyebrow: z.string().max(120),
    heading: z.string().max(240),
    lead: z.string().max(1000),
    body: z.string().max(1500),
    values: z
      .array(
        z.object({ title: z.string().max(100), text: z.string().max(240) }),
      )
      .length(2),
  }),
  appointment: z.object({
    eyebrow: z.string().max(120),
    heading: z.string().max(240),
    ctaLabel: z.string().max(100),
    steps: z
      .array(
        z.object({
          number: z.string().max(4),
          title: z.string().max(160),
          text: z.string().max(500),
        }),
      )
      .length(3),
  }),
  contact: z.object({
    eyebrow: z.string().max(120),
    heading: z.string().max(240),
    phoneLabel: z.string().max(40),
    directionsLabel: z.string().max(80),
  }),
  closing: z.object({
    eyebrow: z.string().max(120),
    heading: z.string().max(240),
    description: z.string().max(500),
    bookingLabel: z.string().max(100),
  }),
});

export async function GET() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  const record = await db.practiceContent.findUnique({
    where: { practiceId: session.practiceId },
  });
  return NextResponse.json(record?.content || DEFAULT_PRACTICE_CONTENT);
}

export async function PATCH(request: Request) {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  const parsed = contentSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Check the content fields." },
      { status: 400 },
    );
  const record = await db.practiceContent.upsert({
    where: { practiceId: session.practiceId },
    update: { content: parsed.data },
    create: { practiceId: session.practiceId, content: parsed.data },
  });
  await db.activityLog.create({
    data: {
      practiceId: session.practiceId,
      userId: session.id,
      action: "PRACTICE_CONTENT_UPDATED",
      entityType: "PracticeContent",
      entityId: record.id,
      summary: "Website content updated",
    },
  });
  return NextResponse.json({ ok: true });
}
