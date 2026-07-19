import { PageHeading } from "@/components/dashboard";
import { AppointmentsManager } from "@/components/appointments-manager";
import { ManualAppointment } from "@/components/manual-appointment";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ReminderQueue } from "@/components/reminder-queue";
import { getDueReminders } from "@/lib/reminders";
export const dynamic = "force-dynamic";
export default async function Appointments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const one = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";
  const q = one("q"),
    view = one("view"),
    status = one("status"),
    source = one("source"),
    from = one("from"),
    to = one("to");
  const now = new Date(),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const where: Prisma.AppointmentWhereInput = {};
  if (q)
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { reason: { contains: q, mode: "insensitive" } },
      {
        patient: {
          is: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          },
        },
      },
    ];
  if (status) where.status = status;
  if (source) where.source = source;
  if (view === "TODAY")
    where.startAt = { gte: today, lt: new Date(today.getTime() + 86400000) };
  else if (view === "UPCOMING") where.startAt = { gte: now };
  else if (view === "PAST") where.startAt = { lt: today };
  else if (view === "REQUESTS")
    where.status = {
      in: ["NEW_REQUEST", "RESCHEDULE_PROPOSED", "RESCHEDULE_REQUESTED"],
    };
  if (from || to)
    where.startAt = {
      ...(typeof where.startAt === "object" ? where.startAt : {}),
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  const [rows, patients, reminders] = await Promise.all([
    db.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            memberships: {
              where: { current: true },
              include: { medicalAid: true },
            },
          },
        },
        changeRequests: {
          where: { status: "PENDING", expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    db.patient.findMany({
      where: { archivedAt: null },
      select: { id: true, fullName: true, patientNumber: true, phone: true },
      orderBy: { fullName: "asc" },
    }),
    getDueReminders(),
  ]);
  const serialised = rows.map((a) => ({
    id: a.id,
    reference: a.reference,
    status: a.status,
    source: a.source,
    reason: a.reason,
    startAt: a.startAt?.toISOString() || null,
    preferredDate: a.preferredDate?.toISOString() || null,
    patient: {
      id: a.patient.id,
      fullName: a.patient.fullName,
      phone: a.patient.phone,
      whatsapp: a.patient.whatsapp,
      email: a.patient.email,
      incomplete: !a.patient.dateOfBirth,
      payment:
        a.patient.memberships[0]?.medicalAid?.abbreviation ||
        a.patient.memberships[0]?.customFundName ||
        "Private",
    },
    change: a.changeRequests[0]
      ? {
          id: a.changeRequests[0].id,
          initiatedBy: a.changeRequests[0].initiatedBy,
          proposedStartAt: a.changeRequests[0].proposedStartAt.toISOString(),
          reason: a.changeRequests[0].reason,
        }
      : null,
  }));
  return (
    <>
      <PageHeading
        eyebrow="Schedule"
        title="Appointments"
        action={<ManualAppointment patients={patients} />}
      />
      <ReminderQueue reminders={reminders.map(item=>({...item,appointmentStartAt:item.appointmentStartAt.toISOString()}))} />
      <AppointmentsManager rows={serialised} />
    </>
  );
}
