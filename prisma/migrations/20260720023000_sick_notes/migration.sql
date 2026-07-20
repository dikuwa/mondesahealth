-- CreateTable
CREATE TABLE "SickNote" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verificationToken" TEXT,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "doctorUserId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "consultationDate" TIMESTAMP(3) NOT NULL,
    "consultationTime" TEXT,
    "leaveFrom" TIMESTAMP(3) NOT NULL,
    "leaveTo" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "fitnessStatus" TEXT NOT NULL,
    "restrictions" TEXT,
    "diagnosisDisclosure" TEXT NOT NULL DEFAULT 'NOT_DISCLOSED',
    "diagnosisPlainText" TEXT,
    "doctorNotes" TEXT NOT NULL,
    "certificateWording" TEXT NOT NULL DEFAULT '',
    "aiDraftUsed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SickNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SickNote_certificateNumber_key" ON "SickNote"("certificateNumber");
CREATE UNIQUE INDEX "SickNote_verificationToken_key" ON "SickNote"("verificationToken");
CREATE INDEX "SickNote_status_createdAt_idx" ON "SickNote"("status", "createdAt");
CREATE INDEX "SickNote_patientId_consultationDate_idx" ON "SickNote"("patientId", "consultationDate");
CREATE INDEX "SickNote_appointmentId_idx" ON "SickNote"("appointmentId");
CREATE INDEX "SickNote_doctorUserId_issuedAt_idx" ON "SickNote"("doctorUserId", "issuedAt");

ALTER TABLE "SickNote" ADD CONSTRAINT "SickNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SickNote" ADD CONSTRAINT "SickNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SickNote" ADD CONSTRAINT "SickNote_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SickNote" ADD CONSTRAINT "SickNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SickNote" ADD CONSTRAINT "SickNote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing administrators and doctors retain their intended role defaults after
-- this permission family is introduced. Owner access is enforced separately.
UPDATE "User"
SET "permissions" = (("permissions"::jsonb || '["VIEW_SICK_NOTES","MANAGE_SICK_NOTES"]'::jsonb)::text)
WHERE "role" IN ('ADMIN', 'DOCTOR');
