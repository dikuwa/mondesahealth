import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit, requestRateLimitKey } from "@/lib/rate-limit";
import { requestAuditInfo } from "@/lib/tenant";

const application = z.object({
  practiceName: z.string().trim().min(2).max(140),
  practiceType: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(30).optional(),
  registrationNumber: z.string().trim().max(100).optional(),
  town: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
});
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export async function POST(request: Request) {
  const limit = consumeRateLimit(
    requestRateLimitKey(request, "provider-application"),
    5,
    60 * 60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      {
        error: "Too many applications were submitted. Please try again later.",
      },
      { status: 429 },
    );
  const parsed = application.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the application details.",
      },
      { status: 400 },
    );
  const duplicate = await db.practiceApplication.findFirst({
    where: {
      email: parsed.data.email.toLowerCase(),
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
    },
  });
  if (duplicate)
    return NextResponse.json(
      { error: "An active application already exists for this email address." },
      { status: 409 },
    );
  const created = await db.practiceApplication.create({
    data: { ...parsed.data, email: parsed.data.email.toLowerCase() },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requirePlatformOwner();
  if (!session)
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  const parsed = z
    .object({
      id: z.string(),
      action: z.enum(["REVIEW", "APPROVE", "REJECT"]),
      reviewNotes: z.string().trim().max(1000).optional(),
      planId: z.string().optional(),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the application decision." },
      { status: 400 },
    );
  const current = await db.practiceApplication.findUnique({
    where: { id: parsed.data.id },
  });
  if (!current)
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  if (parsed.data.action !== "APPROVE") {
    const status =
      parsed.data.action === "REVIEW" ? "UNDER_REVIEW" : "REJECTED";
    await db.practiceApplication.update({
      where: { id: current.id },
      data: {
        status,
        reviewNotes: parsed.data.reviewNotes,
        reviewedById: session.id,
        reviewedAt: new Date(),
      },
    });
    await db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: session.practiceId,
        action: `PRACTICE_APPLICATION_${status}`,
        entityType: "PracticeApplication",
        entityId: current.id,
        summary: `Provider application for ${current.practiceName} marked ${status.toLowerCase().replaceAll("_", " ")}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return NextResponse.json({ ok: true, status });
  }
  const rawToken = randomBytes(32).toString("base64url");
  const result = await db.$transaction(async (tx) => {
    let slug = slugify(current.practiceName);
    if (await tx.practice.findUnique({ where: { slug } }))
      slug = `${slug}-${randomBytes(3).toString("hex")}`;
    const practice = await tx.practice.create({
      data: {
        slug,
        name: current.practiceName,
        type: current.practiceType,
        ownerName: current.ownerName,
        email: current.email,
        phone: current.phone,
        registrationNumber: current.registrationNumber,
        town: current.town,
        region: current.region,
        description: current.description,
        status: "APPROVED",
        publicVisible: false,
        setting: {
          create: {
            id: `practice-${slug}`,
            practiceName: current.practiceName,
            doctorName: current.ownerName,
            email: current.email,
            phone: current.phone || "Pending configuration",
            whatsapp: current.phone || "Pending configuration",
            address: "Pending configuration",
          },
        },
        availabilityRules: {
          create: [1, 2, 3, 4, 5].map((weekday) => ({
            weekday,
            active: true,
            openTime: "08:00",
            closeTime: "17:00",
            lunchStart: "13:00",
            lunchEnd: "14:00",
            durationMinutes: 30,
          })),
        },
      },
    });
    await tx.userInvitation.create({
      data: {
        practiceId: practice.id,
        email: current.email,
        name: current.ownerName,
        role: "OWNER",
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: addDays(new Date(), 7),
        invitedById: session.id,
      },
    });
    if (parsed.data.planId)
      await tx.practiceSubscription.create({
        data: {
          practiceId: practice.id,
          planId: parsed.data.planId,
          status: "ACTIVE",
          renewalDate: addDays(new Date(), 30),
        },
      });
    await tx.practiceApplication.update({
      where: { id: current.id },
      data: {
        status: "APPROVED",
        reviewNotes: parsed.data.reviewNotes,
        reviewedById: session.id,
        reviewedAt: new Date(),
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: practice.id,
        action: "PRACTICE_APPLICATION_APPROVED",
        entityType: "PracticeApplication",
        entityId: current.id,
        summary: `Approved application and created practice ${practice.name}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return practice;
  });
  return NextResponse.json({
    ok: true,
    status: "APPROVED",
    practiceId: result.id,
    inviteUrl: `/invite/${rawToken}`,
  });
}
