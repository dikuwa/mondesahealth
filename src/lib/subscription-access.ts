import { db } from "@/lib/db";

export type SubscriptionAccess = {
  allowed: boolean;
  status: string;
  graceUntil: Date | null;
  warning: string | null;
};

export function evaluateSubscriptionAccess(
  practiceStatus: string,
  subscription: { status: string; graceUntil: Date | null } | undefined,
  now = new Date(),
): SubscriptionAccess {
  if (!subscription)
    return {
      allowed: true,
      status: practiceStatus,
      graceUntil: null,
      warning: null,
    };
  const status = subscription.status || practiceStatus;
  if (status === "ACTIVE")
    return {
      allowed: true,
      status,
      graceUntil: subscription.graceUntil,
      warning: null,
    };
  if (
    status === "OVERDUE" &&
    subscription.graceUntil &&
    subscription.graceUntil >= now
  )
    return {
      allowed: true,
      status,
      graceUntil: subscription.graceUntil,
      warning: `Subscription payment is overdue. New actions remain available until ${subscription.graceUntil.toLocaleDateString("en-NA")}.`,
    };
  return {
    allowed: false,
    status,
    graceUntil: subscription.graceUntil,
    warning:
      "New records are restricted because the practice subscription is inactive. Existing clinical records remain available.",
  };
}

export async function subscriptionAccess(
  practiceId: string,
  now = new Date(),
): Promise<SubscriptionAccess> {
  const practice = await db.practice.findUnique({
    where: { id: practiceId },
    select: {
      subscriptionStatus: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, graceUntil: true },
      },
    },
  });
  if (!practice)
    return {
      allowed: false,
      status: "CLOSED",
      graceUntil: null,
      warning: "Practice not found.",
    };
  return evaluateSubscriptionAccess(
    practice.subscriptionStatus,
    practice.subscriptions[0],
    now,
  );
}
