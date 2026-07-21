import { NextResponse } from "next/server";
import { subscriptionAccess } from "@/lib/subscription-access";

export async function practiceWriteDenied(practiceId: string) {
  const access = await subscriptionAccess(practiceId);
  if (access.allowed) return null;
  return NextResponse.json(
    { error: access.warning, code: "SUBSCRIPTION_RESTRICTED" },
    { status: 402 },
  );
}
