import { createHash, randomBytes } from "crypto";
import { addDays, addMinutes, format, isValid, parse } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { availableSlots } from "@/lib/slots";
import { normalizePhone, ref, validNamibianPhone } from "@/lib/utils";
import { notifyStaff } from "@/lib/notifications";
import { Prisma } from "@prisma/client";
import { patientSummarySchema } from "@/lib/ai-provider";
import { aiIntakeAvailable, detectRedFlags, INTAKE_CONSENT_VERSION, INTAKE_SAFETY_POLICY_VERSION } from "@/lib/intake-safety";
import { INTAKE_IMAGE_LIMIT, validateIntakeImage } from "@/lib/intake-files";
import { patientMatchWhere } from "@/lib/patient-matching";

const intakeMessageSchema = z.object({ role: z.enum(["PATIENT", "ASSISTANT"]), content: z.string().trim().min(1).max(1200), skipped: z.boolean().optional() });
const intakeImageSchema = z.object({ filename: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), fileSize: z.number().int().positive().max(4 * 1024 * 1024), data: z.string().min(4).max(6_000_000) });
const intakeSchema = z.object({
  messages: z.array(intakeMessageSchema).max(14).default([]),
  approvedSummary: z.string().trim().max(1600).default(""),
  structured: patientSummarySchema.shape.fields.partial().default({}),
  unansweredQuestions: z.array(z.string().trim().max(160)).max(8).default([]),
  redFlags: z.array(z.string().trim().max(80)).max(12).default([]),
  emergencyNoticeShown: z.boolean().default(false),
  emergencyNoticeAcknowledged: z.boolean().default(false),
  aiConsent: z.boolean().default(false), imageConsent: z.boolean().default(false),
  consentVersion: z.literal(INTAKE_CONSENT_VERSION),
  aiProvider: z.string().trim().max(80).default(""), aiModel: z.string().trim().max(120).default(""),
  summaryGeneratedAt: z.string().datetime().nullable().default(null), patientApprovedAt: z.string().datetime().nullable().default(null),
  images: z.array(intakeImageSchema).max(INTAKE_IMAGE_LIMIT).default([]),
}).default({ messages: [], approvedSummary: "", structured: {}, unansweredQuestions: [], redFlags: [], emergencyNoticeShown: false, emergencyNoticeAcknowledged: false, aiConsent: false, imageConsent: false, consentVersion: INTAKE_CONSENT_VERSION, aiProvider: "", aiModel: "", summaryGeneratedAt: null, patientApprovedAt: null, images: [] });

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
};

const schema = z
  .object({
  fullName: z.string().trim().min(3).max(120),
  phone: z
    .string()
    .refine(validNamibianPhone, "Enter a valid Namibian phone number."),
  sameWhatsapp: z.boolean(),
  whatsapp: z.string().max(30).optional(),
  email: z.union([z.literal(""), z.string().email()]),
  dateOfBirth: z
    .string()
    .refine(validDate, "Enter a valid date of birth.")
    .refine(
      (value) => new Date(`${value}T00:00:00`) <= new Date(),
      "Date of birth cannot be in the future.",
    ),
  gender: z.enum(["", "Female", "Male", "Other", "Prefer not to say"]),
  communication: z.enum(["WHATSAPP", "SMS", "EMAIL", "PHONE"]),
  reason: z.string().trim().min(3).max(2000),
  notes: z.string().max(800).optional(),
  paymentType: z.enum(["PRIVATE", "MEDICAL_AID", "NOT_SURE"]),
  medicalAidId: z.string().optional(),
  customFundName: z.string().max(100).optional(),
  membershipNumber: z.string().max(60).optional(),
  date: z.string().refine(validDate, "Choose a valid appointment date."),
  time: z.string().optional(),
  period: z.enum(["ANYTIME", "MORNING", "AFTERNOON"]),
  consent: z.literal(true),
  emergency: z.literal(true),
  departmentId: z.string().optional(),
  serviceId: z.string().optional(),
  providerId: z.string().optional(),
  practiceId: z.string().default("mondesa-health"),
  intake: intakeSchema,
  })
  .superRefine((body, context) => {
    if (
      body.communication === "WHATSAPP" &&
      !body.sameWhatsapp &&
      !validNamibianPhone(body.whatsapp || "")
    )
      context.addIssue({
        code: "custom",
        path: ["whatsapp"],
        message: "Enter a valid WhatsApp number.",
      });
    if (body.communication === "EMAIL" && !body.email)
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Add an email address for email communication.",
      });
    if (body.paymentType === "MEDICAL_AID" && !body.medicalAidId)
      context.addIssue({
        code: "custom",
        path: ["medicalAidId"],
        message: "Choose your medical aid fund.",
      });
    if (
      body.paymentType === "MEDICAL_AID" &&
      body.medicalAidId === "OTHER" &&
      !body.customFundName?.trim()
    )
      context.addIssue({
        code: "custom",
        path: ["customFundName"],
        message: "Enter the name of your medical aid fund.",
      });
  });
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const practice = await db.practice.findFirst({ where: { id: body.practiceId, status: "ACTIVE", publicVisible: true } });
    if (!practice) return NextResponse.json({ error: "The selected practice is not available for public booking." }, { status: 404 });
    const settings = await db.practiceSetting.findUnique({ where: { practiceId: practice.id } });
    if (!settings)
      return NextResponse.json(
        { error: "Booking is temporarily unavailable." },
        { status: 503 },
      );
    if (settings.bookingMode === "AVAILABLE_TIME" && !body.time)
      return NextResponse.json(
        { error: "Choose an available appointment time." },
        { status: 400 },
      );
    const [department, service, provider] = await Promise.all([
      body.departmentId ? db.department.findFirst({ where: { id: body.departmentId, public: true, bookingEnabled: true, status: "ACTIVE" } }) : null,
      body.serviceId ? db.departmentService.findFirst({ where: { id: body.serviceId, practiceId: practice.id, departmentId: body.departmentId, public: true, active: true } }) : null,
      body.providerId ? db.provider.findFirst({ where: { id: body.providerId, practiceId: practice.id, departmentId: body.departmentId, public: true } }) : null,
    ]);
    if (body.departmentId && !department) return NextResponse.json({ error: "The selected service area is not available for online booking." }, { status: 400 });
    if (body.serviceId && !service) return NextResponse.json({ error: "The selected service is not available." }, { status: 400 });
    if (body.providerId && !provider) return NextResponse.json({ error: "The selected provider is not available." }, { status: 400 });
    const deterministicFlags = detectRedFlags([body.reason, ...body.intake.messages.filter((item) => item.role === "PATIENT").map((item) => item.content)].join("\n"));
    if ((deterministicFlags.length || body.intake.redFlags.length) && !body.intake.emergencyNoticeAcknowledged)
      return NextResponse.json({ error: "Acknowledge the urgent safety notice before continuing." }, { status: 400 });
    if ((body.intake.messages.length || body.intake.approvedSummary) && !body.intake.aiConsent)
      return NextResponse.json({ error: "AI-assisted intake consent is required before saving an AI conversation or summary." }, { status: 400 });
    if (body.intake.approvedSummary && !body.intake.patientApprovedAt)
      return NextResponse.json({ error: "Approve the AI-organised summary before booking." }, { status: 400 });
    if ((body.intake.messages.length || body.intake.approvedSummary) && !aiIntakeAvailable({ globalEnabled: settings.aiIntakeEnabled, serviceEnabled: service?.aiIntakeEnabled, providerEnabled: provider?.aiIntakeEnabled }))
      return NextResponse.json({ error: "AI-assisted intake is no longer available for the selected service. Your reason for visit is still available; discard the AI summary to continue manually." }, { status: 409 });
    if (body.intake.images.length && (!settings.aiImageEnabled || !body.intake.imageConsent))
      return NextResponse.json({ error: "Photo consent is required and photo intake must be enabled." }, { status: 400 });
    const preparedImages = body.intake.images.map((image) => {
      const data = Buffer.from(image.data, "base64");
      const error = validateIntakeImage({ filename: image.filename, mimeType: image.mimeType, data });
      if (error || data.byteLength !== image.fileSize) throw new z.ZodError([{ code: "custom", path: ["intake", "images"], message: error || "The image size could not be verified.", input: image }]);
      return { filename: image.filename, mimeType: image.mimeType, fileSize: data.byteLength, data };
    });
    const attachmentLimitMb = Number(process.env.ATTACHMENT_STORAGE_LIMIT_MB || 1024);
    const [claimStorage, intakeStorage] = await Promise.all([db.claimAttachment.aggregate({ _sum: { fileSize: true } }), db.patientIntakeImage.aggregate({ _sum: { fileSize: true } })]);
    if ((claimStorage._sum.fileSize || 0) + (intakeStorage._sum.fileSize || 0) + preparedImages.reduce((sum, image) => sum + image.fileSize, 0) > attachmentLimitMb * 1024 * 1024)
      return NextResponse.json({ error: "Protected attachment storage is full. Continue without photos or contact the practice." }, { status: 413 });
    const startAt =
      settings.bookingMode === "AVAILABLE_TIME" && body.time
        ? new Date(`${body.date}T${body.time}:00`)
        : null;
    if (startAt) {
      const slots = await availableSlots(body.date, new Date(), practice.id, provider?.id, service?.id);
      if (!slots.includes(body.time!))
        return NextResponse.json(
          { error: "That time has just been taken. Please choose another." },
          { status: 409 },
        );
    }
    const token = randomBytes(16).toString("base64url");
    const result = await db.$transaction(async (tx) => {
      if (preparedImages.length) {
        const [claimUsage, intakeUsage] = await Promise.all([tx.claimAttachment.aggregate({ _sum: { fileSize: true } }), tx.patientIntakeImage.aggregate({ _sum: { fileSize: true } })]);
        if ((claimUsage._sum.fileSize || 0) + (intakeUsage._sum.fileSize || 0) + preparedImages.reduce((sum, image) => sum + image.fileSize, 0) > attachmentLimitMb * 1024 * 1024) throw new Error("ATTACHMENT_QUOTA");
      }
      let patient = await tx.patient.findFirst({ where: patientMatchWhere(practice.id, { phone: body.phone, email: body.email, fullName: body.fullName, dateOfBirth: new Date(body.dateOfBirth) }) });
      if (!patient)
        patient = await tx.patient.create({
          data: {
            patientNumber: ref("PAT"),
            practiceId: practice.id,
            fullName: body.fullName,
            surname: body.fullName.trim().split(" ").pop() || "",
            initials: body.fullName
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 4),
            dateOfBirth: new Date(body.dateOfBirth),
            gender: body.gender || null,
            phone: normalizePhone(body.phone),
            normalizedPhone: normalizePhone(body.phone),
            whatsapp: body.sameWhatsapp
              ? normalizePhone(body.phone)
              : normalizePhone(body.whatsapp || body.phone),
            email: body.email || null,
            preferredMethod: body.communication,
          },
        });
      if (
        body.paymentType === "MEDICAL_AID" &&
        (body.medicalAidId || body.customFundName)
      ) {
        await tx.patientMedicalAid.updateMany({
          where: { patientId: patient.id, practiceId: practice.id, current: true },
          data: { current: false, expiryDate: new Date() },
        });
        await tx.patientMedicalAid.create({
          data: {
            patientId: patient.id,
            practiceId: practice.id,
            medicalAidId:
              body.medicalAidId && body.medicalAidId !== "OTHER"
                ? body.medicalAidId
                : null,
            customFundName:
              body.medicalAidId === "OTHER" ? body.customFundName : null,
            membershipNumber: body.membershipNumber || null,
            current: true,
            verified: false,
          },
        });
      }
      const appointment = await tx.appointment.create({
        data: {
          reference: ref("APT"),
          practiceId: practice.id,
          patientId: patient.id,
          startAt,
          endAt: startAt ? addMinutes(startAt, service?.durationMinutes || 30) : null,
          preferredDate: new Date(`${body.date}T00:00:00`),
          preferredPeriod: body.period,
          status: startAt ? "CONFIRMED" : "NEW_REQUEST",
          bookingMode: settings.bookingMode,
          reason: body.reason,
          notes: body.notes || null,
          departmentId: department?.id || null,
          serviceId: service?.id || null,
          providerId: provider?.id || null,
        },
      });
      const hasIntake = body.intake.messages.length > 0 || Boolean(body.intake.approvedSummary) || preparedImages.length > 0 || deterministicFlags.length > 0 || body.intake.redFlags.length > 0;
      if (hasIntake) {
        const fields = body.intake.structured;
        const intake = await tx.patientIntake.create({ data: {
          practiceId: practice.id,
          appointmentId: appointment.id, originalReason: body.reason, approvedSummary: body.intake.approvedSummary || null,
          symptomOnset: fields.symptomOnset || null, symptomDuration: fields.symptomDuration || null, symptomLocation: fields.symptomLocation || null,
          severity: fields.severity ?? null, symptomPattern: fields.symptomPattern || null, associatedSymptoms: fields.associatedSymptoms || null,
          aggravatingFactors: fields.aggravatingFactors || null, relievingFactors: fields.relievingFactors || null, treatmentsTried: fields.treatmentsTried || null,
          knownAllergies: fields.knownAllergies || null, existingConditions: fields.existingConditions || null, currentMedication: fields.currentMedication || null,
          structuredAnswers: JSON.stringify(fields), questionsSkipped: JSON.stringify(body.intake.messages.filter((item) => item.skipped).map((item) => item.content)),
          redFlags: JSON.stringify([...new Set([...body.intake.redFlags, ...deterministicFlags])]), emergencyNoticeShown: deterministicFlags.length > 0 || body.intake.redFlags.length > 0 || body.intake.emergencyNoticeShown,
          emergencyNoticeAcknowledged: body.intake.emergencyNoticeAcknowledged, aiConsent: body.intake.aiConsent, imageConsent: body.intake.imageConsent,
          consentVersion: body.intake.aiConsent || body.intake.imageConsent ? body.intake.consentVersion : null, consentAt: body.intake.aiConsent || body.intake.imageConsent ? new Date() : null,
          aiUsed: body.intake.messages.length > 0 || Boolean(body.intake.approvedSummary), imageUsed: preparedImages.length > 0,
          aiProvider: body.intake.aiProvider || null, aiModel: body.intake.aiModel || null, safetyPolicyVersion: INTAKE_SAFETY_POLICY_VERSION,
          summaryGeneratedAt: body.intake.summaryGeneratedAt ? new Date(body.intake.summaryGeneratedAt) : null, patientApprovedAt: body.intake.patientApprovedAt ? new Date(body.intake.patientApprovedAt) : null,
          messages: { create: body.intake.messages.map((item) => ({ role: item.role, content: item.content, skipped: item.skipped || false })) },
          images: { create: preparedImages },
        } });
        if (body.intake.aiConsent) await tx.activityLog.create({ data: { practiceId: practice.id, action: "AI_INTAKE_CONSENT_CAPTURED", entityType: "PatientIntake", entityId: intake.id, summary: `AI intake consent recorded for ${appointment.reference}` } });
        if (body.intake.summaryGeneratedAt) await tx.activityLog.create({ data: { practiceId: practice.id, action: "AI_INTAKE_SUMMARY_GENERATED", entityType: "PatientIntake", entityId: intake.id, summary: `AI-organised intake summary generated for ${appointment.reference}` } });
        if (body.intake.approvedSummary) await tx.activityLog.create({ data: { practiceId: practice.id, action: "AI_INTAKE_SUMMARY_APPROVED", entityType: "PatientIntake", entityId: intake.id, summary: `Patient-approved AI intake summary attached to ${appointment.reference}` } });
        if (deterministicFlags.length || body.intake.redFlags.length) { await tx.activityLog.create({ data: { practiceId: practice.id, action: "RED_FLAG_NOTICE_DISPLAYED", entityType: "PatientIntake", entityId: intake.id, summary: `Urgent safety notice displayed for ${appointment.reference}` } }); await tx.activityLog.create({ data: { practiceId: practice.id, action: "RED_FLAG_NOTICE_ACKNOWLEDGED", entityType: "PatientIntake", entityId: intake.id, summary: `Urgent safety notice acknowledged for ${appointment.reference}` } }); }
        if (preparedImages.length) await tx.activityLog.create({ data: { practiceId: practice.id, action: "INTAKE_IMAGES_UPLOADED", entityType: "PatientIntake", entityId: intake.id, summary: `${preparedImages.length} private intake image(s) attached to ${appointment.reference}` } });
      }
      await tx.secureLink.create({
        data: {
          tokenHash: createHash("sha256").update(token).digest("hex"),
          appointmentId: appointment.id,
          purpose: "MANAGE_APPOINTMENT",
          expiresAt: addDays(new Date(), 60),
        },
      });
      await tx.activityLog.create({
        data: {
          practiceId: practice.id,
          action: "APPOINTMENT_CREATED",
          entityType: "Appointment",
          entityId: appointment.id,
          summary: `Public booking ${appointment.reference} created`,
        },
      });
      return appointment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await notifyStaff({ type: "APPOINTMENT", title: "New appointment", message: `${result.reference} was booked. Additional intake information may be available to authorised clinical staff.`, href: `/dashboard/appointments?appointment=${result.id}` }).catch(() => undefined);
    return NextResponse.json(
      { reference: result.reference, manageUrl: `/a/${token}` },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Check your booking details." },
        { status: 400 },
      );
    if (error instanceof Error && error.message.includes("Unique constraint"))
      return NextResponse.json(
        { error: "That time has just been taken. Please choose another." },
        { status: 409 },
      );
    if (error instanceof Error && error.message === "ATTACHMENT_QUOTA")
      return NextResponse.json({ error: "Protected attachment storage is full. Continue without photos or contact the practice." }, { status: 413 });
    return NextResponse.json(
      { error: "We could not complete the booking. Please call the practice." },
      { status: 500 },
    );
  }
}
