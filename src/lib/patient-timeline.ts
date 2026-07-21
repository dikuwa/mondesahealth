import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PATIENT_TIMELINE_PAGE_SIZE = 20;

export type PatientTimelineEvent = {
  id: string;
  type: string;
  text: string;
  href: string | null;
  occurredAt: Date;
  actorName: string | null;
  practiceName: string;
};

type PatientTimelineRow = PatientTimelineEvent & { totalCount: bigint };

export async function getPatientTimeline({
  patientId,
  practiceId,
  page,
  canViewClinical,
}: {
  patientId: string;
  practiceId: string;
  page: number;
  canViewClinical: boolean;
}) {
  const offset = (page - 1) * PATIENT_TIMELINE_PAGE_SIZE;
  const rows = await db.$queryRaw<PatientTimelineRow[]>(Prisma.sql`
    WITH events AS (
      SELECT p."id" || ':created' AS id,
        'Patient created'::text AS type,
        ('Patient profile ' || p."patientNumber" || ' created')::text AS text,
        NULL::text AS href,
        p."createdAt" AS "occurredAt",
        u."name"::text AS "actorName",
        pr."name"::text AS "practiceName"
      FROM "Patient" p
      JOIN "Practice" pr ON pr."id" = p."practiceId"
      LEFT JOIN "User" u ON u."id" = p."createdById"
      WHERE p."id" = ${patientId} AND p."practiceId" = ${practiceId}

      UNION ALL
      SELECT a."id" || ':appointment', 'Appointment',
        (a."reference" || ' · ' || replace(a."status", '_', ' ')),
        ('/dashboard/appointments?appointment=' || a."id"), a."createdAt", u."name", pr."name"
      FROM "Appointment" a
      JOIN "Practice" pr ON pr."id" = a."practiceId"
      LEFT JOIN "User" u ON u."id" = a."createdById"
      WHERE a."patientId" = ${patientId} AND a."practiceId" = ${practiceId}

      UNION ALL
      SELECT e."id" || ':encounter', 'Clinical encounter',
        (replace(e."status", '_', ' ') || ' · ' || COALESCE(e."presentingComplaint", 'Consultation')),
        ('/dashboard/encounters/' || e."id"), e."startedAt", u."name", pr."name"
      FROM "ClinicalEncounter" e
      JOIN "Practice" pr ON pr."id" = e."practiceId"
      LEFT JOIN "User" u ON u."id" = e."clinicianId"
      WHERE ${canViewClinical} AND e."patientId" = ${patientId} AND e."practiceId" = ${practiceId}

      UNION ALL
      SELECT s."id" || ':sick-note', 'Sick note',
        (s."certificateNumber" || ' · ' || replace(s."status", '_', ' ')),
        ('/dashboard/sick-notes/' || s."id"), s."createdAt", u."name", pr."name"
      FROM "SickNote" s
      JOIN "Practice" pr ON pr."id" = s."practiceId"
      LEFT JOIN "User" u ON u."id" = s."createdById"
      WHERE s."patientId" = ${patientId} AND s."practiceId" = ${practiceId}

      UNION ALL
      SELECT i."id" || ':invoice', 'Invoice',
        (i."number" || ' · ' || replace(i."status", '_', ' ')),
        '/dashboard/finance', i."createdAt", NULL::text, pr."name"
      FROM "Invoice" i JOIN "Practice" pr ON pr."id" = i."practiceId"
      WHERE i."patientId" = ${patientId} AND i."practiceId" = ${practiceId}

      UNION ALL
      SELECT pay."id" || ':payment', 'Payment',
        (pay."reference" || ' · N$' || to_char(pay."amount", 'FM999999990.00')),
        '/dashboard/finance', pay."paidAt", u."name", pr."name"
      FROM "Payment" pay
      JOIN "Practice" pr ON pr."id" = pay."practiceId"
      LEFT JOIN "User" u ON u."id" = pay."userId"
      WHERE pay."patientId" = ${patientId} AND pay."practiceId" = ${practiceId}

      UNION ALL
      SELECT c."id" || ':claim', 'Claim',
        (c."claimNumber" || ' · ' || replace(c."status", '_', ' ')),
        ('/dashboard/claims/' || c."id"), c."updatedAt", u."name", pr."name"
      FROM "Claim" c
      JOIN "Practice" pr ON pr."id" = c."practiceId"
      LEFT JOIN "User" u ON u."id" = c."createdByUserId"
      WHERE c."patientId" = ${patientId} AND c."practiceId" = ${practiceId}

      UNION ALL
      SELECT x."id" || ':allergy', 'Allergy',
        (x."substance" || ' · ' || replace(x."status", '_', ' ')),
        NULL::text, x."updatedAt", u."name", pr."name"
      FROM "PatientAllergy" x
      JOIN "Practice" pr ON pr."id" = x."practiceId"
      LEFT JOIN "User" u ON u."id" = x."createdById"
      WHERE ${canViewClinical} AND x."patientId" = ${patientId} AND x."practiceId" = ${practiceId}

      UNION ALL
      SELECT x."id" || ':condition', 'Condition',
        (x."name" || ' · ' || replace(x."status", '_', ' ')),
        NULL::text, x."updatedAt", u."name", pr."name"
      FROM "PatientCondition" x
      JOIN "Practice" pr ON pr."id" = x."practiceId"
      LEFT JOIN "User" u ON u."id" = x."createdById"
      WHERE ${canViewClinical} AND x."patientId" = ${patientId} AND x."practiceId" = ${practiceId}

      UNION ALL
      SELECT x."id" || ':medication', 'Medication',
        (x."name" || ' · ' || replace(x."status", '_', ' ')),
        NULL::text, x."updatedAt", u."name", pr."name"
      FROM "PatientMedication" x
      JOIN "Practice" pr ON pr."id" = x."practiceId"
      LEFT JOIN "User" u ON u."id" = x."createdById"
      WHERE ${canViewClinical} AND x."patientId" = ${patientId} AND x."practiceId" = ${practiceId}

      UNION ALL
      SELECT l."id" || ':audit', 'Record activity', l."summary", NULL::text,
        l."createdAt", u."name", pr."name"
      FROM "ActivityLog" l
      JOIN "Practice" pr ON pr."id" = l."practiceId"
      LEFT JOIN "User" u ON u."id" = l."userId"
      WHERE l."entityType" = 'Patient' AND l."entityId" = ${patientId}
        AND l."practiceId" = ${practiceId}
        AND l."action" NOT IN ('PATIENT_CREATED')
    )
    SELECT id, type, text, href, "occurredAt", "actorName", "practiceName",
      COUNT(*) OVER() AS "totalCount"
    FROM events
    ORDER BY "occurredAt" DESC, id DESC
    LIMIT ${PATIENT_TIMELINE_PAGE_SIZE} OFFSET ${offset}
  `);
  if (!rows.length && page > 1)
    return getPatientTimeline({
      patientId,
      practiceId,
      page: 1,
      canViewClinical,
    });
  const total = rows.length ? Number(rows[0].totalCount) : 0;
  return {
    events: rows.map(({ totalCount: _totalCount, ...row }) => row),
    total,
    pages: Math.max(1, Math.ceil(total / PATIENT_TIMELINE_PAGE_SIZE)),
    page,
  };
}
