import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail as deliverInvitationEmail } from "@/lib/invitation-email";
import { requestAuditInfo } from "@/lib/tenant";
import { genericPracticeContent } from "@/lib/generic-practice-content";

const status = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "ACTIVE",
  "PAYMENT_OVERDUE",
  "SUSPENDED",
  "REJECTED",
  "CLOSED",
]);
const create = z.object({
  name: z.string().trim().min(2).max(140),
  type: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().email(),
  registrationNumber: z.string().trim().max(100).optional(),
  licenceInformation: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  town: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  status: status.default("DRAFT"),
  publicVisible: z.boolean().default(false),
  planId: z.string().optional(),
  initialServiceIds: z.array(z.string().min(1)).max(20).default([]),
  sendInvitationEmail: z.boolean().default(false),
});
const update = create
  .partial()
  .extend({
    id: z.string(),
    suspensionReason: z.string().trim().max(1000).optional(),
  });
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
export async function POST(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PRACTICES");
  if (!session)
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  const parsed = create.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Check the practice details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  if (input.publicVisible && !["APPROVED", "ACTIVE"].includes(input.status))
    return NextResponse.json(
      { error: "Only approved or active practices can be public." },
      { status: 400 },
    );
  const serviceTemplates = input.initialServiceIds.length
    ? await db.departmentService.findMany({
        where: {
          id: { in: input.initialServiceIds },
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
  if (serviceTemplates.length !== new Set(input.initialServiceIds).size)
    return NextResponse.json(
      { error: "One or more selected initial services are unavailable." },
      { status: 400 },
    );
  const rawToken = randomBytes(32).toString("base64url");
  const practice = await db.$transaction(async (tx) => {
    let slug = slugify(input.name);
    if (await tx.practice.findUnique({ where: { slug } }))
      slug = `${slug}-${randomBytes(3).toString("hex")}`;
    const created = await tx.practice.create({
      data: {
        slug,
        name: input.name,
        type: input.type,
        ownerName: input.ownerName,
        registrationNumber: input.registrationNumber,
        licenceInformation: input.licenceInformation,
        email: input.ownerEmail.toLowerCase(),
        phone: input.phone,
        whatsapp: input.whatsapp,
        address: input.address,
        town: input.town,
        region: input.region,
        description: input.description,
        status: input.status,
        publicVisible: input.publicVisible,
        activatedAt: input.status === "ACTIVE" ? new Date() : null,
        setting: {
          create: {
            id: `practice-${slug}`,
            practiceName: input.name,
            doctorName: input.ownerName,
            email: input.ownerEmail.toLowerCase(),
            phone: input.phone || "Pending configuration",
            whatsapp: input.whatsapp || input.phone || "Pending configuration",
            address: input.address || "Pending configuration",
          },
        },
        content: {
          create: { content: genericPracticeContent(input.name, input.type) },
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
        practiceId: created.id,
        email: input.ownerEmail.toLowerCase(),
        name: input.ownerName,
        role: "OWNER",
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: addDays(new Date(), 7),
        invitedById: session.id,
      },
    });
    if (input.planId)
      await tx.practiceSubscription.create({
        data: {
          practiceId: created.id,
          planId: input.planId,
          status: "ACTIVE",
          renewalDate: addDays(new Date(), 30),
        },
      });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: created.id,
        action: "PRACTICE_CREATED",
        entityType: "Practice",
        entityId: created.id,
        summary: `Created practice ${created.name} and invited its owner`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return created;
  });
  const invitePath = `/invite/${rawToken}`;
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin}${invitePath}`;
  const emailDelivery = input.sendInvitationEmail
    ? await deliverInvitationEmail({
        to: input.ownerEmail.toLowerCase(),
        name: input.ownerName,
        practiceName: input.name,
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
        practiceId: practice.id,
        action: emailDelivery.sent
          ? "OWNER_INVITATION_EMAILED"
          : "OWNER_INVITATION_EMAIL_FAILED",
        entityType: "Practice",
        entityId: practice.id,
        summary: emailDelivery.sent
          ? `Emailed the owner invitation for ${practice.name}`
          : `Owner invitation email for ${practice.name} was not delivered`,
        requestInfo: requestAuditInfo(request),
      },
    });
  }
  return NextResponse.json(
    { id: practice.id, inviteUrl: invitePath, emailDelivery },
    { status: 201 },
  );
}
export async function PATCH(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PRACTICES");
  if (!session)
    return NextResponse.json(
      { error: "Platform-owner access is required." },
      { status: 403 },
    );
  const parsed = update.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Check the practice changes.",
      },
      { status: 400 },
    );
  const {
    id,
    ownerEmail,
    planId: _planId,
    initialServiceIds: _initialServiceIds,
    sendInvitationEmail: _sendInvitationEmail,
    ...input
  } = parsed.data;
  void _planId;
  void _initialServiceIds;
  void _sendInvitationEmail;
  const current = await db.practice.findUnique({ where: { id } });
  if (!current)
    return NextResponse.json({ error: "Practice not found." }, { status: 404 });
  if (
    input.publicVisible &&
    !["APPROVED", "ACTIVE"].includes(input.status || current.status)
  )
    return NextResponse.json(
      { error: "Only approved or active practices can be public." },
      { status: 400 },
    );
  const practice = await db.$transaction(async (tx) => {
    const saved = await tx.practice.update({
      where: { id },
      data: {
        ...input,
        ...(ownerEmail ? { email: ownerEmail.toLowerCase() } : {}),
        activatedAt:
          input.status === "ACTIVE" && !current.activatedAt
            ? new Date()
            : undefined,
        publicVisible:
          input.status && !["APPROVED", "ACTIVE"].includes(input.status)
            ? false
            : input.publicVisible,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.id,
        practiceId: id,
        action:
          input.status === "SUSPENDED"
            ? "PRACTICE_SUSPENDED"
            : input.status === "ACTIVE"
              ? "PRACTICE_APPROVED"
              : "PRACTICE_UPDATED",
        entityType: "Practice",
        entityId: id,
        summary: `Updated practice ${saved.name}`,
        requestInfo: requestAuditInfo(request),
      },
    });
    return saved;
  });
  return NextResponse.json({ id: practice.id, status: practice.status });
}
