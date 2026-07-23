import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail as deliverInvitationEmail } from "@/lib/invitation-email";
import { consumeRateLimit, requestRateLimitKey } from "@/lib/rate-limit";
import { requestAuditInfo } from "@/lib/tenant";
import { genericPracticeContent } from "@/lib/generic-practice-content";
import { notifyPlatformAdmins } from "@/lib/notifications";
import { publicPracticeApplicationSchema } from "@/lib/practice-registration";
import { normaliseNamibianPhone } from "@/lib/phone-utils";
import { rejectionCategoryLabel } from "@/lib/rejection-categories";

const application = publicPracticeApplicationSchema;
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

let referenceCounter = 0;
let referenceCounterReset = new Date();

function generateReference(): string {
  const now = new Date();
  if (
    now.getFullYear() !== referenceCounterReset.getFullYear() ||
    now.getMonth() !== referenceCounterReset.getMonth()
  ) {
    referenceCounter = 0;
    referenceCounterReset = now;
  }
  referenceCounter++;
  const year = now.getFullYear();
  const padded = String(referenceCounter).padStart(6, "0");
  return `MH-APP-${year}-${padded}`;
}

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
  // Normalise Namibian phone numbers
  const normalisedPhone =
    normaliseNamibianPhone(parsed.data.phone) || parsed.data.phone;

  const reference = generateReference();
  const created = await db.practiceApplication.create({
    data: {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      phone: normalisedPhone,
      reference,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  await db.activityLog.create({
    data: {
      action: "PRACTICE_APPLICATION_SUBMITTED",
      entityType: "PracticeApplication",
      entityId: created.id,
      summary: `New application ${reference} from ${created.practiceName}`,
      requestInfo: requestAuditInfo(request),
    },
  });
  await notifyPlatformAdmins({
    type: "PRACTICE_APPLICATION",
    title: "New practice application",
    message: `${created.practiceName}${created.town ? ` · ${created.town}` : ""} is ready for review.`,
    href: "/platform/applications",
  });
  return NextResponse.json({ id: created.id, reference }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requirePlatformPermission("MANAGE_APPLICATIONS");
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
      rejectionCategory: z.string().optional(),
      rejectionReason: z.string().trim().max(2000).optional(),
      planId: z.string().optional(),
      initialServiceIds: z.array(z.string().min(1)).max(20).default([]),
      sendInvitationEmail: z.boolean().default(false),
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

    if (status === "REJECTED" && !parsed.data.rejectionCategory) {
      return NextResponse.json(
        { error: "A rejection category is required when rejecting an application." },
        { status: 400 },
      );
    }

    const rejectionSummary = parsed.data.rejectionCategory
      ? ` (${rejectionCategoryLabel(parsed.data.rejectionCategory)})`
      : "";

    await db.practiceApplication.update({
      where: { id: current.id },
      data: {
        status,
        reviewNotes: parsed.data.reviewNotes,
        rejectionCategory: parsed.data.rejectionCategory ?? null,
        rejectionReason: parsed.data.rejectionReason ?? null,
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
        summary: `Provider application for ${current.practiceName} marked ${status.toLowerCase().replaceAll("_", " ")}${rejectionSummary}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return NextResponse.json({ ok: true, status });
  }
  const serviceTemplates = parsed.data.initialServiceIds.length
    ? await db.departmentService.findMany({
        where: {
          id: { in: parsed.data.initialServiceIds },
          practiceId: "mondesa-health",
          active: true,
        },
        select: {
          id: true,
          departmentId: true,
          name: true,
          description: true,
          durationMinutes: true,
        },
      })
    : [];
  if (serviceTemplates.length !== new Set(parsed.data.initialServiceIds).size)
    return NextResponse.json(
      { error: "One or more selected initial services are unavailable." },
      { status: 400 },
    );
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
        status: "PENDING_SETUP",
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
        content: {
          create: { content: genericPracticeContent(current.practiceName, current.practiceType) },
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
        services: serviceTemplates.length
          ? {
              create: serviceTemplates.map((service, sortOrder) => ({
                departmentId: service.departmentId,
                name: service.name,
                description: service.description,
                durationMinutes: service.durationMinutes,
                public: false,
                active: true,
                sortOrder,
              })),
            }
          : undefined,
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
  const invitePath = `/invite/${rawToken}`;
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin}${invitePath}`;
  const emailDelivery = parsed.data.sendInvitationEmail
    ? await deliverInvitationEmail({
        to: current.email,
        name: current.ownerName,
        practiceName: current.practiceName,
        inviteUrl,
      }).catch(() => ({
        sent: false as const,
        reason: "The invitation was created, but email delivery failed.",
      }))
    : null;
  if (emailDelivery) {
    await db.activityLog.create({
      data: {
        userId: session.id,
        practiceId: result.id,
        action: emailDelivery.sent
          ? "OWNER_INVITATION_EMAILED"
          : "OWNER_INVITATION_EMAIL_FAILED",
        entityType: "Practice",
        entityId: result.id,
        summary: emailDelivery.sent
          ? `Emailed the owner invitation for ${result.name}`
          : `Owner invitation email for ${result.name} was not delivered`,
        requestInfo: requestAuditInfo(request),
      },
    });
  }
  return NextResponse.json({
    ok: true,
    status: "APPROVED",
    practiceId: result.id,
    inviteUrl: invitePath,
    emailDelivery,
  });
}
