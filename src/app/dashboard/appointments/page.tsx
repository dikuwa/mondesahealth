import { PageHeading } from "@/components/dashboard";
import { AppointmentsManager } from "@/components/appointments-manager";
import { ManualAppointment } from "@/components/manual-appointment";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ReminderQueue } from "@/components/reminder-queue";
import { getDueReminders } from "@/lib/reminders";
import { getSession } from "@/lib/auth";
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
  const session = await getSession();
  const canViewIntake = session?.role === "OWNER" || session?.permissions.includes("VIEW_CLINICAL_INTAKE");
  const canUseClinicalAi = session?.role === "OWNER" || session?.permissions.includes("USE_CLINICAL_AI");
  const canManageSickNotes = Boolean(session && (session.role === "OWNER" || (["ADMIN", "DOCTOR"].includes(session.role) && session.permissions.includes("MANAGE_SICK_NOTES"))));
  const [rows, patients, reminders, bookingDepartments] = await Promise.all([
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
        department: { select: { name: true } },
        service: { select: { name: true } },
        provider: { select: { displayName: true } },
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
    db.department.findMany({ where: { status: "ACTIVE", bookingEnabled: true }, select: { id: true, name: true, services: { where: { public: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }, providers: { where: { public: true }, select: { id: true, displayName: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
  ]);
  const intakeRows = canViewIntake && rows.length ? await db.patientIntake.findMany({ where: { appointmentId: { in: rows.map((row) => row.id) } }, include: { messages: { orderBy: { createdAt: "asc" } }, images: { select: { id: true, filename: true } } } }) : [];
  const intakeByAppointment = new Map(intakeRows.map((intake) => [intake.appointmentId, intake]));
  const parseArray = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
  const parseObject = (value: string) => { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } };
  const serialised = rows.map((a) => ({
    id: a.id,
    reference: a.reference,
    status: a.status,
    source: a.source,
    reason: a.reason,
    startAt: a.startAt?.toISOString() || null,
    preferredDate: a.preferredDate?.toISOString() || null,
    department: a.department?.name || null,
    service: a.service?.name || null,
    provider: a.provider?.displayName || null,
    intake: (() => { const intake = intakeByAppointment.get(a.id); return intake ? { id: intake.id, originalReason: intake.originalReason, approvedSummary: intake.approvedSummary, clinicianCorrections: intake.clinicianCorrections, fields: parseObject(intake.structuredAnswers), questionsSkipped: parseArray(intake.questionsSkipped), redFlags: parseArray(intake.redFlags), emergencyNoticeShown: intake.emergencyNoticeShown, emergencyNoticeAcknowledged: intake.emergencyNoticeAcknowledged, aiConsent: intake.aiConsent, imageConsent: intake.imageConsent, consentAt: intake.consentAt?.toISOString() || null, summaryGeneratedAt: intake.summaryGeneratedAt?.toISOString() || null, patientApprovedAt: intake.patientApprovedAt?.toISOString() || null, clinicianReviewedAt: intake.clinicianReviewedAt?.toISOString() || null, reviewStatus: intake.reviewStatus, messages: intake.messages.map((message) => ({ role: message.role, content: message.content, skipped: message.skipped })), images: intake.images } : null; })(),
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
        action={<ManualAppointment patients={patients} departments={bookingDepartments} />}
      />
      <ReminderQueue reminders={reminders.map(item=>({...item,appointmentStartAt:item.appointmentStartAt.toISOString()}))} />
      <AppointmentsManager rows={serialised} canUseClinicalAi={Boolean(canUseClinicalAi)} canManageSickNotes={canManageSickNotes} />
    </>
  );
}
