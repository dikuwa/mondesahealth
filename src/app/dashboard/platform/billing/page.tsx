import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PlatformBillingManager } from "@/components/platform-billing-manager";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PlatformBillingPage() {
  const session = await requirePlatformPermission("VIEW_PLATFORM_FINANCE");
  if (!session) notFound();
  const [practices, plans, payments] = await Promise.all([
    db.practice.findMany({ include: { subscriptions: { include: { plan: true, payments: true }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { name: "asc" } }),
    db.subscriptionPlan.findMany({ where: { active: true }, orderBy: { fee: "asc" } }),
    db.subscriptionPayment.findMany({ include: { subscription: { include: { practice: { select: { name: true } }, plan: { select: { name: true } } } } }, orderBy: { paidAt: "desc" }, take: 500 }),
  ]);
  return <><PageHeading eyebrow="Platform administration" title="Finance & billing"/><PlatformBillingManager canManage={session.platformPermissions.includes("MANAGE_SUBSCRIPTIONS")} canRecord={session.platformPermissions.includes("RECORD_SUBSCRIPTION_PAYMENTS")} plans={plans.map(({ id, name }) => ({ id, name }))} payments={payments.map((payment) => ({ id: payment.id, practice: payment.subscription.practice.name, plan: payment.subscription.plan.name, amount: payment.amount, paidAt: payment.paidAt.toISOString(), reference: payment.reference }))} rows={practices.map((practice) => { const subscription = practice.subscriptions[0]; return { practiceId: practice.id, practice: practice.name, status: subscription?.status || practice.subscriptionStatus, subscriptionId: subscription?.id || null, planId: subscription?.planId || "", plan: subscription?.plan.name || "", renewalDate: subscription?.renewalDate?.toISOString().slice(0, 10) || "", graceUntil: subscription?.graceUntil?.toISOString() || null, paid: subscription?.payments.reduce((total, payment) => total + payment.amount, 0) || 0, internalNotes: subscription?.internalNotes || "" }; })}/></>;
}
