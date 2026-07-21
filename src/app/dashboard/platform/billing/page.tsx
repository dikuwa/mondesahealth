import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PlatformBillingManager } from "@/components/platform-billing-manager";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PlatformBillingPage() {
  if (!await requirePlatformOwner()) notFound();
  const [practices, plans] = await Promise.all([
    db.practice.findMany({ include: { subscriptions: { include: { plan: true, payments: true }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { name: "asc" } }),
    db.subscriptionPlan.findMany({ where: { active: true }, orderBy: { fee: "asc" } }),
  ]);
  return <><PageHeading eyebrow="Platform administration" title="Practice billing"/><PlatformBillingManager plans={plans.map(({ id, name }) => ({ id, name }))} rows={practices.map((practice) => { const subscription = practice.subscriptions[0]; return { practiceId: practice.id, practice: practice.name, status: subscription?.status || practice.subscriptionStatus, subscriptionId: subscription?.id || null, planId: subscription?.planId || "", plan: subscription?.plan.name || "", renewalDate: subscription?.renewalDate?.toISOString().slice(0, 10) || "", graceUntil: subscription?.graceUntil?.toISOString() || null, paid: subscription?.payments.reduce((total, payment) => total + payment.amount, 0) || 0 }; })}/></>;
}
