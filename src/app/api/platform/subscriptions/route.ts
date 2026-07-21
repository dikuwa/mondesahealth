import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, addMonths, addYears } from "date-fns";
const plan = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  billingFrequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "FIXED"]),
  fee: z.number().min(0),
  gracePeriodDays: z.number().int().min(0).max(90),
});
export async function POST(request: Request) {
  const body = await request.json(),
    payment = z
      .object({
        subscriptionId: z.string(),
        amount: z.number().positive(),
        method: z.string().max(50).optional(),
        reference: z.string().max(100).optional(),
        notes: z.string().max(1000).optional(),
      })
      .safeParse(body);
  const session = await requirePlatformPermission(payment.success ? "RECORD_SUBSCRIPTION_PAYMENTS" : "MANAGE_SUBSCRIPTIONS");
  if (!session) return NextResponse.json({ error: "You do not have permission to manage this platform finance action." }, { status: 403 });
  if (payment.success) {
    const subscription = await db.practiceSubscription.findUnique({
      where: { id: payment.data.subscriptionId },
      include: { plan: true },
    });
    if (!subscription)
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 },
      );
    const saved = await db.$transaction(async (tx) => {
      const record = await tx.subscriptionPayment.create({
        data: { ...payment.data, recordedById: session.id },
      });
      const base = subscription.renewalDate && subscription.renewalDate > new Date() ? subscription.renewalDate : new Date();
      const renewalDate = subscription.plan.billingFrequency === "MONTHLY" ? addMonths(base, 1) : subscription.plan.billingFrequency === "QUARTERLY" ? addMonths(base, 3) : subscription.plan.billingFrequency === "ANNUAL" ? addYears(base, 1) : subscription.renewalDate;
      await tx.practiceSubscription.update({
        where: { id: subscription.id },
        data: { status: "ACTIVE", renewalDate, graceUntil: null },
      });
      await tx.practice.update({
        where: { id: subscription.practiceId },
        data: { subscriptionStatus: "ACTIVE" },
      });
      await tx.activityLog.create({
        data: {
          userId: session.id,
          practiceId: subscription.practiceId,
          action: "SUBSCRIPTION_PAYMENT_RECORDED",
          entityType: "PracticeSubscription",
          entityId: subscription.id,
          summary: `Recorded subscription payment of N$${payment.data.amount.toFixed(2)}`,
        },
      });
      return record;
    });
    return NextResponse.json({ id: saved.id }, { status: 201 });
  }
  const parsed = plan.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Check the plan details." },
      { status: 400 },
    );
  const created = await db.subscriptionPlan.create({ data: parsed.data });
  await db.activityLog.create({
    data: {
      userId: session.id,
      practiceId: session.practiceId,
      action: "SUBSCRIPTION_PLAN_CREATED",
      entityType: "SubscriptionPlan",
      entityId: created.id,
      summary: `Created subscription plan ${created.name}`,
    },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
export async function PATCH(request: Request) {
  const session = await requirePlatformPermission("MANAGE_SUBSCRIPTIONS");
  if (!session)
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  const parsed = z
    .object({
      practiceId: z.string(),
      status: z.enum(["ACTIVE", "OVERDUE", "SUSPENDED", "CANCELLED"]),
      renewalDate: z.string().datetime().optional(),
      planId: z.string().optional(),
      internalNotes: z.string().trim().max(1000).optional(),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the subscription update." },
      { status: 400 },
    );
  const [practice, subscription, planRow] = await Promise.all([db.practice.findUnique({ where: { id: parsed.data.practiceId }, select: { id: true } }), db.practiceSubscription.findFirst({
    where: { practiceId: parsed.data.practiceId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  }), parsed.data.planId ? db.subscriptionPlan.findUnique({ where: { id: parsed.data.planId } }) : null]);
  if (!practice || (parsed.data.planId && !planRow)) return NextResponse.json({ error: "Practice or subscription plan not found." }, { status: 404 });
  const selectedPlan = planRow || subscription?.plan;
  if (!selectedPlan) return NextResponse.json({ error: "Select a subscription plan." }, { status: 400 });
  const graceUntil = parsed.data.status === "OVERDUE" ? addDays(new Date(), selectedPlan.gracePeriodDays) : null;
  const saved = await db.$transaction(async (tx) => {
    const record = subscription ? await tx.practiceSubscription.update({
      where: { id: subscription.id },
      data: { planId: selectedPlan.id, status: parsed.data.status, renewalDate: parsed.data.renewalDate ? new Date(parsed.data.renewalDate) : undefined, graceUntil, cancelledAt: parsed.data.status === "CANCELLED" ? new Date() : null, internalNotes: parsed.data.internalNotes },
    }) : await tx.practiceSubscription.create({ data: { practiceId: parsed.data.practiceId, planId: selectedPlan.id, status: parsed.data.status, renewalDate: parsed.data.renewalDate ? new Date(parsed.data.renewalDate) : undefined, graceUntil, internalNotes: parsed.data.internalNotes } });
    await tx.practice.update({
      where: { id: parsed.data.practiceId },
      data: { subscriptionStatus: parsed.data.status },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: parsed.data.practiceId,
        action: "SUBSCRIPTION_UPDATED",
        entityType: "PracticeSubscription",
        entityId: record.id,
        summary: `Subscription marked ${parsed.data.status.toLowerCase()} on ${selectedPlan.name}`,
      },
    });
    return record;
  });
  return NextResponse.json({ ok: true, id: saved.id, graceUntil });
}

export async function PUT(request: Request) {
  const session = await requirePlatformPermission("MANAGE_SUBSCRIPTIONS");
  if (!session) return NextResponse.json({ error: "Subscription-plan administration is required." }, { status: 403 });
  const parsed = plan.extend({ id: z.string().min(1), active: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the plan details." }, { status: 400 });
  const { id, ...data } = parsed.data;
  const current = await db.subscriptionPlan.findUnique({ where: { id }, include: { _count: { select: { subscriptions: true } } } });
  if (!current) return NextResponse.json({ error: "Subscription plan not found." }, { status: 404 });
  if (!data.active && current._count.subscriptions > 0) {
    const activeSubscriptions = await db.practiceSubscription.count({ where: { planId: id, status: { in: ["ACTIVE", "OVERDUE", "SUSPENDED"] } } });
    if (activeSubscriptions) return NextResponse.json({ error: "Reassign active subscriptions before archiving this plan." }, { status: 409 });
  }
  const updated = await db.subscriptionPlan.update({ where: { id }, data });
  await db.activityLog.create({ data: { userId: session.id, practiceId: null, action: "SUBSCRIPTION_PLAN_UPDATED", entityType: "SubscriptionPlan", entityId: id, summary: `Updated subscription plan ${updated.name}` } });
  return NextResponse.json({ ok: true });
}
