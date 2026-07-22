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
  portal: z.enum(["PLATFORM", "PRACTICE"]),
  practiceSlug: z.string().trim().min(1).max(120).optional(),
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
    include: { platformMembership: true, practiceMemberships: true },
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
  const hasPlatformAccess = Boolean(user.platformMembership?.active);
  let practiceId: string | null = null;
  let destination: string;

  if (parsed.data.portal === "PLATFORM") {
    if (!hasPlatformAccess) {
      const membership = user.practiceMemberships.find((item) => item.active);
      const practice = membership
        ? await db.practice.findUnique({ where: { id: membership.practiceId }, select: { slug: true } })
        : null;
      return NextResponse.json(
        {
          error: "This account belongs to a Practice Portal, not Platform Administration.",
          correctPortal: practice ? `/practices/${practice.slug}/login` : null,
        },
        { status: 403, headers: noStore },
      );
    }
    await createSession(
      { id: user.id, sessionVersion: user.sessionVersion },
      { scope: "PLATFORM" },
    );
    destination = user.mustChangePassword ? "/platform/profile?required=1" : "/platform";
  } else {
    if (!parsed.data.practiceSlug) {
      return NextResponse.json(
        { error: "Choose a practice before signing in." },
        { status: 400, headers: noStore },
      );
    }
    const practice = await db.practice.findUnique({
      where: { slug: parsed.data.practiceSlug },
      select: { id: true, slug: true },
    });
    const membership = practice
      ? user.practiceMemberships.find(
          (item) => item.practiceId === practice.id && item.active,
        )
      : null;
    if (!practice || !membership) {
      return NextResponse.json(
        {
          error: hasPlatformAccess
            ? "This is a Platform Administration account. It has no permanent access to this practice."
            : "This account is not active for the selected practice.",
          correctPortal: hasPlatformAccess ? "/platform/login" : null,
        },
        { status: 403, headers: noStore },
      );
    }
    practiceId = practice.id;
    await createSession(
      { id: user.id, sessionVersion: user.sessionVersion },
      { scope: "PRACTICE", practiceId },
    );
    destination = user.mustChangePassword ? "/dashboard/profile?required=1" : "/dashboard";
  }
  await db.activityLog.create({
    data: {
      userId: user.id,
      practiceId,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      summary: `Signed in to ${parsed.data.portal.toLowerCase()} portal`,
    },
  });
  if (formRequest)
    return NextResponse.redirect(new URL(destination, request.url), 303);
  return NextResponse.json({ ok: true, destination }, { headers: noStore });
}
