import { createHash } from "crypto";
import { addHours, addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { availableSlots } from "@/lib/slots";
import { normalizePhone, ref, validNamibianPhone } from "@/lib/utils";
import {
  canTransition,
  nextAppointmentStatus,
  type AppointmentAction,
} from "@/lib/appointment-state";

const staffSession = () => requirePermission("MANAGE_APPOINTMENTS");
const createSchema = z.object({
  patientMode: z.enum(["EXISTING", "NEW"]),
  patientId: z.string().optional(),
  fullName: z.string().trim().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  source: z.enum(["PHONE", "WALK_IN", "WHATSAPP", "STAFF"]),
  timing: z.enum(["NOW", "SCHEDULED"]),
  date: z.string().optional(),
  time: z.string().optional(),
  reason: z.string().trim().min(2).max(2000),
  notes: z.string().trim().max(600).optional(),
  departmentId: z.string().optional(),
  serviceId: z.string().optional(),
  providerId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await staffSession();
  if (!session)
    return NextResponse.json(
      { error: "Your session has expired." },
      { status: 401 },
    );
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the appointment details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  if (input.patientMode === "EXISTING" && !input.patientId)
    return NextResponse.json({ error: "Select a patient." }, { status: 400 });
  if (
    input.patientMode === "NEW" &&
    (!input.fullName ||
      input.fullName.length < 3 ||
      !input.phone ||
      !validNamibianPhone(input.phone))
  )
    return NextResponse.json(
      {
        error:
          "Enter the new patient's name and a valid Namibian cellphone number.",
      },
      { status: 400 },
    );
  if (input.email && !z.string().email().safeParse(input.email).success)
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  let startAt: Date;
  let duration = 30;
  if (input.timing === "NOW") {
    startAt = new Date();
    startAt.setSeconds(0, 0);
  } else {
    if (!input.date || !input.time)
      return NextResponse.json(
        { error: "Choose an appointment date and time." },
        { status: 400 },
      );
    const slots = await availableSlots(input.date);
    if (!slots.includes(input.time))
      return NextResponse.json(
        { error: "That time is no longer available." },
        { status: 409 },
      );
    const rule = await db.availabilityRule.findUnique({
      where: { weekday: new Date(`${input.date}T00:00:00`).getDay() },
    });
    duration = rule?.durationMinutes || 30;
    startAt = new Date(`${input.date}T${input.time}:00`);
  }
  const [department, service, provider] = await Promise.all([
    input.departmentId ? db.department.findFirst({ where: { id: input.departmentId, bookingEnabled: true, status: "ACTIVE" } }) : null,
    input.serviceId ? db.departmentService.findFirst({ where: { id: input.serviceId, departmentId: input.departmentId } }) : null,
    input.providerId ? db.provider.findFirst({ where: { id: input.providerId, departmentId: input.departmentId } }) : null,
  ]);
  if (input.departmentId && !department) return NextResponse.json({ error: "The selected service area is not bookable." }, { status: 400 });
  if (input.serviceId && !service) return NextResponse.json({ error: "The selected service does not belong to that service area." }, { status: 400 });
  if (input.providerId && !provider) return NextResponse.json({ error: "The selected provider does not belong to that service area." }, { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      let patient = input.patientId
        ? await tx.patient.findFirst({
            where: { id: input.patientId, archivedAt: null },
          })
        : null;
      if (!patient && input.patientMode === "NEW")
        patient = await tx.patient.create({
          data: {
            patientNumber: ref("PAT"),
            fullName: input.fullName!,
            surname: input.fullName!.split(" ").pop() || "",
            initials: input
              .fullName!.split(" ")
              .map((v) => v[0])
              .join("")
              .slice(0, 4),
            phone: normalizePhone(input.phone!),
            whatsapp: input.whatsapp
              ? normalizePhone(input.whatsapp)
              : normalizePhone(input.phone!),
            email: input.email || null,
            preferredMethod: input.source === "WHATSAPP" ? "WHATSAPP" : "PHONE",
          },
        });
      if (!patient) throw new Error("PATIENT_NOT_FOUND");
      const appointment = await tx.appointment.create({
        data: {
          reference: ref("APT"),
          patientId: patient.id,
          startAt,
          endAt: addMinutes(startAt, duration),
          preferredDate: new Date(
            startAt.getFullYear(),
            startAt.getMonth(),
            startAt.getDate(),
          ),
          status: "CONFIRMED",
          bookingMode: "AVAILABLE_TIME",
          source: input.source,
          reason: input.reason,
          internalNote: input.notes || null,
          createdById: session.id,
          departmentId: department?.id || null,
          serviceId: service?.id || null,
          providerId: provider?.id || null,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: session.id,
          action: "APPOINTMENT_CREATED",
          entityType: "Appointment",
          entityId: appointment.id,
          summary: `${input.source} appointment ${appointment.reference} created for ${patient.fullName}`,
        },
      });
      return appointment;
    });
    return NextResponse.json({ reference: result.reference }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PATIENT_NOT_FOUND")
      return NextResponse.json(
        { error: "Patient record not found." },
        { status: 404 },
      );
    if (error instanceof Error && error.message.includes("Unique constraint"))
      return NextResponse.json(
        {
          error:
            input.timing === "NOW"
              ? "Another appointment already starts at this minute. Confirm the overlap and choose a nearby time."
              : "That time is no longer available.",
        },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Could not create the appointment." },
      { status: 500 },
    );
  }
}

const staffAction = z.object({
  id: z.string(),
  action: z.enum([
    "CONFIRM",
    "CANCEL",
    "COMPLETE",
    "NO_SHOW",
    "PROPOSE_RESCHEDULE",
    "APPROVE_CHANGE",
    "DECLINE_CHANGE",
  ]),
  date: z.string().optional(),
  time: z.string().optional(),
  reason: z.string().max(400).optional(),
  changeRequestId: z.string().optional(),
});
export async function PATCH(request: Request) {
  const body = await request.json();
  const parsedStaff = staffAction.safeParse(body);
  if (parsedStaff.success) {
    const session = await staffSession();
    if (!session)
      return NextResponse.json(
        { error: "You do not have permission to update appointments." },
        { status: 403 },
      );
    const input = parsedStaff.data;
    const appointment = await db.appointment.findUnique({
      where: { id: input.id },
      include: { patient: true },
    });
    if (!appointment)
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 },
      );
    if (input.action === "PROPOSE_RESCHEDULE") {
      if (!input.date || !input.time)
        return NextResponse.json(
          { error: "Choose the proposed date and time." },
          { status: 400 },
        );
      const slots = await availableSlots(input.date);
      if (!slots.includes(input.time))
        return NextResponse.json(
          { error: "That proposed time is no longer available." },
          { status: 409 },
        );
      const proposedStartAt = new Date(`${input.date}T${input.time}:00`);
      const duration =
        appointment.startAt && appointment.endAt
          ? Math.max(
              1,
              (appointment.endAt.getTime() - appointment.startAt.getTime()) /
                60000,
            )
          : 30;
      await db.$transaction([
        db.appointmentChangeRequest.updateMany({
          where: { appointmentId: input.id, status: "PENDING" },
          data: {
            status: "SUPERSEDED",
            respondedAt: new Date(),
            respondedById: session.id,
          },
        }),
        db.appointmentChangeRequest.create({
          data: {
            appointmentId: input.id,
            proposedStartAt,
            proposedEndAt: addMinutes(proposedStartAt, duration),
            initiatedBy: "STAFF",
            reason: input.reason || null,
            expiresAt: addHours(new Date(), 48),
          },
        }),
        db.appointment.update({
          where: { id: input.id },
          data: {
            status: "RESCHEDULE_PROPOSED",
            rescheduleReason: input.reason || null,
          },
        }),
        db.activityLog.create({
          data: {
            userId: session.id,
            action: "RESCHEDULE_PROPOSED",
            entityType: "Appointment",
            entityId: input.id,
            summary: `Proposed a new time for ${appointment.reference}`,
          },
        }),
      ]);
      return NextResponse.json({
        message:
          "Reschedule proposed. The original and proposed slots are protected.",
      });
    }
    if (
      input.action === "APPROVE_CHANGE" ||
      input.action === "DECLINE_CHANGE"
    ) {
      if (!input.changeRequestId)
        return NextResponse.json(
          { error: "Change request not found." },
          { status: 400 },
        );
      const change = await db.appointmentChangeRequest.findFirst({
        where: {
          id: input.changeRequestId,
          appointmentId: input.id,
          status: "PENDING",
        },
      });
      if (!change)
        return NextResponse.json(
          { error: "This change request is no longer active." },
          { status: 409 },
        );
      if (input.action === "APPROVE_CHANGE")
        await db.$transaction([
          db.appointment.update({
            where: { id: input.id },
            data: {
              originalStartAt: appointment.startAt,
              startAt: change.proposedStartAt,
              endAt: change.proposedEndAt,
              status: "CONFIRMED",
            },
          }),
          db.appointmentChangeRequest.update({
            where: { id: change.id },
            data: {
              status: "APPROVED",
              respondedAt: new Date(),
              respondedById: session.id,
            },
          }),
          db.activityLog.create({
            data: {
              userId: session.id,
              action: "RESCHEDULE_APPROVED",
              entityType: "Appointment",
              entityId: input.id,
              summary: `Approved new time for ${appointment.reference}`,
            },
          }),
        ]);
      else
        await db.$transaction([
          db.appointment.update({
            where: { id: input.id },
            data: { status: "CONFIRMED" },
          }),
          db.appointmentChangeRequest.update({
            where: { id: change.id },
            data: {
              status: "DECLINED",
              respondedAt: new Date(),
              respondedById: session.id,
            },
          }),
          db.activityLog.create({
            data: {
              userId: session.id,
              action: "RESCHEDULE_DECLINED",
              entityType: "Appointment",
              entityId: input.id,
              summary: `Declined requested time for ${appointment.reference}`,
            },
          }),
        ]);
      return NextResponse.json({
        message:
          input.action === "APPROVE_CHANGE"
            ? "New appointment time approved."
            : "Change request declined; the original booking remains.",
      });
    }
    if (!canTransition(appointment.status, input.action as AppointmentAction))
      return NextResponse.json(
        {
          error: `${input.action.replaceAll("_", " ")} is not available while this appointment is ${appointment.status.replaceAll("_", " ").toLowerCase()}.`,
        },
        { status: 409 },
      );
    const startsInFuture = Boolean(appointment.startAt && appointment.startAt > new Date());
    if (appointment.status === "REVIEW_REQUIRED" && input.action === "CONFIRM" && !startsInFuture)
      return NextResponse.json({ error: "Past review-required appointments cannot be confirmed; complete, mark no-show, or cancel instead." }, { status: 409 });
    if (appointment.status === "REVIEW_REQUIRED" && ["COMPLETE", "NO_SHOW"].includes(input.action) && startsInFuture)
      return NextResponse.json({ error: "Future review-required appointments must be confirmed or cancelled." }, { status: 409 });
    const next = nextAppointmentStatus(input.action as AppointmentAction);
    await db.$transaction([
      db.appointment.update({
        where: { id: input.id },
        data: { status: next, notes: input.reason || appointment.notes },
      }),
      db.appointmentChangeRequest.updateMany({
        where: { appointmentId: input.id, status: "PENDING" },
        data: {
          status: "CANCELLED",
          respondedAt: new Date(),
          respondedById: session.id,
        },
      }),
      db.activityLog.create({
        data: {
          userId: session.id,
          action: `APPOINTMENT_${next}`,
          entityType: "Appointment",
          entityId: input.id,
          summary: `Appointment ${appointment.reference} changed from ${appointment.status} to ${next}`,
        },
      }),
    ]);
    return NextResponse.json({
      message: `Appointment ${next.toLowerCase().replaceAll("_", " ")}.`,
    });
  }
  const patient = z
    .object({
      token: z.string().min(16),
      action: z.enum(["ACCEPT_RESCHEDULE", "REQUEST_CHANGE", "CANCEL"]),
      date: z.string().optional(),
      time: z.string().optional(),
      reason: z.string().max(400).optional(),
    })
    .safeParse(body);
  if (!patient.success)
    return NextResponse.json(
      { error: "This request is invalid." },
      { status: 400 },
    );
  const link = await db.secureLink.findUnique({
    where: {
      tokenHash: createHash("sha256").update(patient.data.token).digest("hex"),
    },
    include: { appointment: true },
  });
  if (!link || link.usedAt || link.expiresAt < new Date())
    return NextResponse.json(
      { error: "This secure link is invalid, revoked or expired." },
      { status: 403 },
    );
  const appointment = link.appointment;
  if (patient.data.action === "CANCEL") {
    await db.$transaction([
      db.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CANCELLED",
          notes: patient.data.reason || appointment.notes,
        },
      }),
      db.appointmentChangeRequest.updateMany({
        where: { appointmentId: appointment.id, status: "PENDING" },
        data: { status: "CANCELLED", respondedAt: new Date() },
      }),
      db.activityLog.create({
        data: {
          action: "APPOINTMENT_CANCELLED",
          entityType: "Appointment",
          entityId: appointment.id,
          summary: "Patient cancelled through secure link",
        },
      }),
    ]);
    return NextResponse.json({
      message: "Your appointment has been cancelled.",
    });
  }
  if (patient.data.action === "ACCEPT_RESCHEDULE") {
    const change = await db.appointmentChangeRequest.findFirst({
      where: {
        appointmentId: appointment.id,
        status: "PENDING",
        initiatedBy: "STAFF",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!change)
      return NextResponse.json(
        { error: "That reschedule proposal is no longer available." },
        { status: 409 },
      );
    await db.$transaction([
      db.appointment.update({
        where: { id: appointment.id },
        data: {
          originalStartAt: appointment.startAt,
          startAt: change.proposedStartAt,
          endAt: change.proposedEndAt,
          status: "CONFIRMED",
        },
      }),
      db.appointmentChangeRequest.update({
        where: { id: change.id },
        data: { status: "APPROVED", respondedAt: new Date() },
      }),
      db.activityLog.create({
        data: {
          action: "RESCHEDULE_ACCEPTED",
          entityType: "Appointment",
          entityId: appointment.id,
          summary: "Patient accepted staff reschedule proposal",
        },
      }),
    ]);
    return NextResponse.json({
      message: "Your new appointment time is confirmed.",
    });
  }
  if (!patient.data.date || !patient.data.time)
    return NextResponse.json(
      { error: "Choose another available date and time." },
      { status: 400 },
    );
  const slots = await availableSlots(patient.data.date);
  if (!slots.includes(patient.data.time))
    return NextResponse.json(
      { error: "That time is no longer available." },
      { status: 409 },
    );
  const proposedStartAt = new Date(
    `${patient.data.date}T${patient.data.time}:00`,
  );
  const duration =
    appointment.startAt && appointment.endAt
      ? (appointment.endAt.getTime() - appointment.startAt.getTime()) / 60000
      : 30;
  await db.$transaction([
    db.appointmentChangeRequest.updateMany({
      where: { appointmentId: appointment.id, status: "PENDING" },
      data: { status: "SUPERSEDED", respondedAt: new Date() },
    }),
    db.appointmentChangeRequest.create({
      data: {
        appointmentId: appointment.id,
        proposedStartAt,
        proposedEndAt: addMinutes(proposedStartAt, duration),
        initiatedBy: "PATIENT",
        reason: patient.data.reason || null,
        expiresAt: addHours(new Date(), 48),
      },
    }),
    db.appointment.update({
      where: { id: appointment.id },
      data: { status: "RESCHEDULE_REQUESTED" },
    }),
    db.activityLog.create({
      data: {
        action: "RESCHEDULE_REQUESTED",
        entityType: "Appointment",
        entityId: appointment.id,
        summary: "Patient requested a new time through secure link",
      },
    }),
  ]);
  return NextResponse.json({
    message:
      "Your requested time is being held for 48 hours while the practice reviews it.",
  });
}
