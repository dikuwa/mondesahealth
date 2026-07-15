import { createHash, randomBytes } from "crypto";
import { addDays, addMinutes, format, isValid, parse } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { availableSlots } from "@/lib/slots";
import { normalizePhone, ref, validNamibianPhone } from "@/lib/utils";

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
  reason: z.string().trim().min(3).max(160),
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
    const settings = await db.practiceSetting.findUnique({
      where: { id: "practice" },
    });
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
    const startAt =
      settings.bookingMode === "AVAILABLE_TIME" && body.time
        ? new Date(`${body.date}T${body.time}:00`)
        : null;
    if (startAt) {
      const slots = await availableSlots(body.date);
      if (!slots.includes(body.time!))
        return NextResponse.json(
          { error: "That time has just been taken. Please choose another." },
          { status: 409 },
        );
    }
    const token = randomBytes(16).toString("base64url");
    const result = await db.$transaction(async (tx) => {
      let patient = await tx.patient.findFirst({
        where: {
          phone: normalizePhone(body.phone),
          dateOfBirth: new Date(body.dateOfBirth),
        },
      });
      if (!patient)
        patient = await tx.patient.create({
          data: {
            patientNumber: ref("PAT"),
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
          where: { patientId: patient.id, current: true },
          data: { current: false, expiryDate: new Date() },
        });
        await tx.patientMedicalAid.create({
          data: {
            patientId: patient.id,
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
          patientId: patient.id,
          startAt,
          endAt: startAt ? addMinutes(startAt, 30) : null,
          preferredDate: new Date(`${body.date}T00:00:00`),
          preferredPeriod: body.period,
          status: startAt ? "CONFIRMED" : "NEW_REQUEST",
          bookingMode: settings.bookingMode,
          reason: body.reason,
          notes: body.notes || null,
        },
      });
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
          action: "APPOINTMENT_CREATED",
          entityType: "Appointment",
          entityId: appointment.id,
          summary: `Public booking ${appointment.reference} created`,
        },
      });
      return appointment;
    });
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
    return NextResponse.json(
      { error: "We could not complete the booking. Please call the practice." },
      { status: 500 },
    );
  }
}
