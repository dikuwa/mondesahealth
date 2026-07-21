import { PageHeading } from "@/components/dashboard";
import { PatientManager } from "@/components/patient-manager";
import { db } from "@/lib/db";
import { getPracticeSession } from "@/lib/auth";

export default async function Patients({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const query = await searchParams;
  const authSession = await getPracticeSession();
  if (!authSession) return null;
  const [patients, funds, session] = await Promise.all([
    db.patient.findMany({
      where: { practiceId: authSession.practiceId, archivedAt: null },
      include: {
        memberships: {
          where: { practiceId: authSession.practiceId, current: true },
          include: { medicalAid: true },
        },
        appointments: {
          where: { practiceId: authSession.practiceId },
          select: { reference: true, startAt: true, status: true },
          orderBy: { startAt: "desc" },
          take: 25,
        },
        _count: {
          select: {
            appointments: { where: { practiceId: authSession.practiceId } },
            claims: { where: { practiceId: authSession.practiceId } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.medicalAid.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    Promise.resolve(authSession),
  ]);
  const canManageSickNotes = Boolean(
    session &&
    (session.role === "OWNER" ||
      (["ADMIN", "DOCTOR"].includes(session.role) &&
        session.permissions.includes("MANAGE_SICK_NOTES"))),
  );
  return (
    <>
      <PageHeading eyebrow="Patient records" title="Patients" />
      <PatientManager
        initialEditId={query.edit}
        canManageSickNotes={canManageSickNotes}
        funds={funds.map((f) => ({ id: f.id, name: f.name }))}
        initial={patients.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          patientNumber: p.patientNumber,
          createdAt: p.createdAt.toISOString(),
          dateOfBirth: p.dateOfBirth?.toISOString() || null,
          gender: p.gender,
          phone: p.phone,
          email: p.email,
          preferredMethod: p.preferredMethod,
          medicalAid:
            p.memberships[0]?.medicalAid?.abbreviation ||
            p.memberships[0]?.customFundName ||
            "",
          medicalAidId: p.memberships[0]?.medicalAidId || "",
          membershipNumber: p.memberships[0]?.membershipNumber || "",
          visits: p._count.appointments,
          appointmentReferences: p.appointments.map(
            (appointment) => appointment.reference,
          ),
          hasUpcoming: p.appointments.some(
            (appointment) =>
              Boolean(
                appointment.startAt && appointment.startAt > new Date(),
              ) && !["CANCELLED", "DECLINED"].includes(appointment.status),
          ),
          lastVisit:
            p.appointments
              .find(
                (appointment) =>
                  appointment.startAt && appointment.startAt <= new Date(),
              )
              ?.startAt?.toISOString() || null,
          firstName: p.firstName,
          middleName: p.middleName,
          lastName: p.lastName,
          identificationType: p.identificationType,
          identityNumber: p.identityNumber,
          passportNumber: p.passportNumber,
          whatsapp: p.whatsapp,
          address: p.address,
          town: p.town,
          region: p.region,
          emergencyName: p.emergencyName,
          emergencyRelation: p.emergencyRelation,
          emergencyPhone: p.emergencyPhone,
          knownAllergies: p.knownAllergies,
          chronicConditions: p.chronicConditions,
          currentMedication: p.currentMedication,
          previousProcedures: p.previousProcedures,
          medicalAlerts: p.medicalAlerts,
          medicalHistorySummary: p.medicalHistorySummary,
          status: p.status,
        }))}
      />
    </>
  );
}
