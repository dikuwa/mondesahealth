-- Release 1: normalise the legacy claim status without changing any claim content.
UPDATE "Claim"
SET "status" = 'NEEDS_INFORMATION'
WHERE "status" = 'MISSING_INFORMATION';

-- Release 2: finance safety, receipt sharing, and reminder preparation.
ALTER TABLE "PracticeSetting"
  ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reminderLeadHours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "Invoice"
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidedByUserId" TEXT;

ALTER TABLE "GeneratedDocument"
  ADD COLUMN "receiptId" TEXT;

CREATE TABLE "AppointmentReminder" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "appointmentStartAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREPARED',
  "actedByUserId" TEXT,
  "actedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentReminder_appointmentId_appointmentStartAt_key"
  ON "AppointmentReminder"("appointmentId", "appointmentStartAt");
CREATE INDEX "AppointmentReminder_status_appointmentStartAt_idx"
  ON "AppointmentReminder"("status", "appointmentStartAt");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_voidedByUserId_fkey"
  FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentReminder"
  ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentReminder"
  ADD CONSTRAINT "AppointmentReminder_actedByUserId_fkey"
  FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
