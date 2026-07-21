import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
async function allowed() {
  return requirePermission("MANAGE_AVAILABILITY");
}
export async function PATCH(request: Request) {
  const session = await allowed();
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to manage availability." },
      { status: 403 },
    );
  const body = await request.json();
  const providerParsed = z.object({ providerId: z.string(), rules: z.array(z.object({ weekday: z.number().int().min(0).max(6), active: z.boolean(), openTime: z.string().regex(/^\d{2}:\d{2}$/), closeTime: z.string().regex(/^\d{2}:\d{2}$/), breakStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), breakEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional() })).length(7) }).safeParse(body);
  if (providerParsed.success) {
    const provider = await db.provider.findFirst({ where: { id: providerParsed.data.providerId, practiceId: session.practiceId }, select: { id: true, displayName: true } });
    if (!provider) return NextResponse.json({ error: "Provider not found." }, { status: 404 });
    const invalid = new Set(providerParsed.data.rules.map((rule) => rule.weekday)).size !== 7 || providerParsed.data.rules.some((rule) => rule.active && (rule.closeTime <= rule.openTime || Boolean(rule.breakStart) !== Boolean(rule.breakEnd) || (rule.breakStart && rule.breakEnd && (rule.breakStart <= rule.openTime || rule.breakEnd >= rule.closeTime || rule.breakEnd <= rule.breakStart))));
    if (invalid) return NextResponse.json({ error: "Each active provider day needs valid hours and an optional break inside those hours." }, { status: 400 });
    await db.$transaction([...providerParsed.data.rules.map((rule) => db.providerAvailability.upsert({ where: { providerId_weekday: { providerId: provider.id, weekday: rule.weekday } }, update: { ...rule, practiceId: session.practiceId }, create: { ...rule, practiceId: session.practiceId, providerId: provider.id } })), db.activityLog.create({ data: { userId: session.id, practiceId: session.practiceId, action: "PROVIDER_AVAILABILITY_UPDATED", entityType: "Provider", entityId: provider.id, summary: `Provider availability updated for ${provider.displayName}` } })]);
    return NextResponse.json({ ok: true });
  }
  const parsed = z
    .object({
      rules: z
        .array(
          z.object({
            weekday: z.number().int().min(0).max(6),
            active: z.boolean(),
            openTime: z.string().regex(/^\d{2}:\d{2}$/),
            closeTime: z.string().regex(/^\d{2}:\d{2}$/),
            durationMinutes: z.number().int().min(10).max(180),
          }),
        )
        .length(7),
    })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the weekly hours." },
      { status: 400 },
    );
  const weekdays = new Set(parsed.data.rules.map((rule) => rule.weekday));
  if (
    weekdays.size !== 7 ||
    parsed.data.rules.some(
      (rule) => rule.active && rule.closeTime <= rule.openTime,
    )
  )
    return NextResponse.json(
      { error: "Each active day needs valid opening and closing times." },
      { status: 400 },
    );
  await db.$transaction([
    ...parsed.data.rules.map((rule) =>
      db.availabilityRule.upsert({
        where: {
          practiceId_weekday: {
            practiceId: session.practiceId,
            weekday: rule.weekday,
          },
        },
        update: rule,
        create: { ...rule, practiceId: session.practiceId },
      }),
    ),
    db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: "AVAILABILITY_UPDATED",
        entityType: "AvailabilityRule",
        entityId: "weekly",
        summary: "Weekly availability rules updated",
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
export async function POST(request: Request) {
  const session = await allowed();
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to manage availability." },
      { status: 403 },
    );
  const parsed = z
    .object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      reason: z.string().trim().max(200).optional(),
    })
    .safeParse(await request.json());
  if (
    !parsed.success ||
    new Date(parsed.data.endAt) <= new Date(parsed.data.startAt)
  )
    return NextResponse.json(
      { error: "Enter a valid start and end time." },
      { status: 400 },
    );
  const reason = parsed.data.reason || null;
  const block = await db.blockedTime.create({
    data: {
      practiceId: session.practiceId,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      reason,
    },
  });
  await db.activityLog.create({
    data: {
      userId: session.id,
      practiceId: session.practiceId,
      action: "BLOCKED_TIME_CREATED",
      entityType: "BlockedTime",
      entityId: block.id,
      summary: reason ? `Blocked time added: ${reason}` : "Blocked time added",
    },
  });
  return NextResponse.json(block, { status: 201 });
}
export async function DELETE(request: Request) {
  const session = await allowed();
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to manage availability." },
      { status: 403 },
    );
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Blocked time is required." },
      { status: 400 },
    );
  const result = await db.blockedTime.deleteMany({
    where: { id, practiceId: session.practiceId },
  });
  if (!result.count)
    return NextResponse.json(
      { error: "Blocked time was already removed." },
      { status: 404 },
    );
  await db.activityLog.create({
    data: {
      userId: session.id,
      practiceId: session.practiceId,
      action: "BLOCKED_TIME_REMOVED",
      entityType: "BlockedTime",
      entityId: id,
      summary: "Blocked time removed",
    },
  });
  return NextResponse.json({ ok: true });
}
