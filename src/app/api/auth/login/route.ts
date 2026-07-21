import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkLoginThrottle,
  clearCredentialThrottle,
  loginThrottleKeys,
  pruneLoginThrottles,
  recordFailedLogin,
  requestAddress,
} from "@/lib/login-throttle";

const input = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});
const noStore = { "Cache-Control": "no-store" };
const limited = (retryAfter: number) =>
  NextResponse.json(
    { error: "Too many sign-in attempts. Try again later." },
    { status: 429, headers: { ...noStore, "Retry-After": String(retryAfter) } },
  );

export async function POST(request: Request) {
  const formRequest =
    request.headers
      .get("content-type")
      ?.includes("application/x-www-form-urlencoded") ||
    request.headers.get("content-type")?.includes("multipart/form-data");
  const body = formRequest
    ? Object.fromEntries(await request.formData())
    : await request.json().catch(() => null);
  const parsed = input.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid email and password." },
      { status: 400, headers: noStore },
    );
  const email = parsed.data.email.toLowerCase(),
    keys = loginThrottleKeys(email, requestAddress(request));
  const throttle = await checkLoginThrottle(keys);
  if (!throttle.allowed) return limited(throttle.retryAfter);
  const user = await db.user.findUnique({
    where: { email },
    include: { platformMembership: true },
  });
  if (
    !user ||
    !user.active ||
    !(await compare(parsed.data.password, user.passwordHash))
  ) {
    const failed = await recordFailedLogin(keys);
    await db.activityLog.create({
      data: {
        action: "USER_LOGIN_FAILED",
        entityType: "Authentication",
        entityId: keys[0].key.slice(-32),
        summary: "Rejected staff sign-in attempt",
      },
    });
    return failed.blocked
      ? limited(failed.retryAfter)
      : NextResponse.json(
          { error: "The email or password is incorrect." },
          { status: 401, headers: noStore },
        );
  }
  await clearCredentialThrottle(keys);
  await pruneLoginThrottles();
  const hasPlatformAccess = Boolean(
    user.platformMembership?.active || user.platformRole === "PLATFORM_OWNER",
  );
  await createSession(
    { id: user.id, sessionVersion: user.sessionVersion },
    hasPlatformAccess
      ? { scope: "PLATFORM" }
      : { scope: "PRACTICE", practiceId: user.practiceId! },
  );
  await db.activityLog.create({
    data: {
      userId: user.id,
      practiceId: user.practiceId,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      summary: "Signed in to dashboard",
    },
  });
  const destination = hasPlatformAccess ? "/platform" : "/dashboard";
  if (formRequest)
    return NextResponse.redirect(new URL(destination, request.url), 303);
  return NextResponse.json({ ok: true, destination }, { headers: noStore });
}
