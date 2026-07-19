ALTER TABLE "PracticeSetting"
  ADD COLUMN "aiIntakeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aiImageEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DepartmentService"
  ADD COLUMN "aiIntakeEnabled" BOOLEAN;

ALTER TABLE "Provider"
  ADD COLUMN "aiIntakeEnabled" BOOLEAN;

ALTER TABLE "Appointment"
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "serviceId" TEXT,
  ADD COLUMN "providerId" TEXT;

CREATE TABLE "EmergencyContact" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "description" TEXT,
  "region" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "primary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientIntake" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "originalReason" TEXT NOT NULL,
  "approvedSummary" TEXT,
  "symptomOnset" TEXT,
  "symptomDuration" TEXT,
  "symptomLocation" TEXT,
  "severity" INTEGER,
  "symptomPattern" TEXT,
  "associatedSymptoms" TEXT,
  "aggravatingFactors" TEXT,
  "relievingFactors" TEXT,
  "treatmentsTried" TEXT,
  "knownAllergies" TEXT,
  "existingConditions" TEXT,
  "currentMedication" TEXT,
  "structuredAnswers" TEXT NOT NULL DEFAULT '{}',
  "questionsSkipped" TEXT NOT NULL DEFAULT '[]',
  "redFlags" TEXT NOT NULL DEFAULT '[]',
  "emergencyNoticeShown" BOOLEAN NOT NULL DEFAULT false,
  "emergencyNoticeAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  "aiConsent" BOOLEAN NOT NULL DEFAULT false,
  "imageConsent" BOOLEAN NOT NULL DEFAULT false,
  "consentVersion" TEXT,
  "consentAt" TIMESTAMP(3),
  "aiUsed" BOOLEAN NOT NULL DEFAULT false,
  "imageUsed" BOOLEAN NOT NULL DEFAULT false,
  "aiProvider" TEXT,
  "aiModel" TEXT,
  "safetyPolicyVersion" TEXT NOT NULL DEFAULT '2026-07-19',
  "summaryGeneratedAt" TIMESTAMP(3),
  "patientApprovedAt" TIMESTAMP(3),
  "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
  "clinicianReviewedAt" TIMESTAMP(3),
  "clinicianReviewedByUserId" TEXT,
  "clinicianCorrections" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientIntake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientIntakeMessage" (
  "id" TEXT NOT NULL,
  "intakeId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "skipped" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientIntakeMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientIntakeImage" (
  "id" TEXT NOT NULL,
  "intakeId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientIntakeImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalAiDraft" (
  "id" TEXT NOT NULL,
  "intakeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "sourceUsed" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "limitations" TEXT,
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalAiDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientIntake_appointmentId_key" ON "PatientIntake"("appointmentId");
CREATE INDEX "EmergencyContact_active_primary_sortOrder_idx" ON "EmergencyContact"("active", "primary", "sortOrder");
CREATE UNIQUE INDEX "EmergencyContact_one_active_primary_idx" ON "EmergencyContact"((1)) WHERE "active" = true AND "primary" = true;
CREATE INDEX "PatientIntake_reviewStatus_createdAt_idx" ON "PatientIntake"("reviewStatus", "createdAt");
CREATE INDEX "PatientIntakeMessage_intakeId_createdAt_idx" ON "PatientIntakeMessage"("intakeId", "createdAt");
CREATE INDEX "PatientIntakeImage_intakeId_createdAt_idx" ON "PatientIntakeImage"("intakeId", "createdAt");
CREATE INDEX "ClinicalAiDraft_intakeId_createdAt_idx" ON "ClinicalAiDraft"("intakeId", "createdAt");
CREATE INDEX "ClinicalAiDraft_userId_createdAt_idx" ON "ClinicalAiDraft"("userId", "createdAt");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "DepartmentService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientIntake" ADD CONSTRAINT "PatientIntake_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientIntake" ADD CONSTRAINT "PatientIntake_clinicianReviewedByUserId_fkey" FOREIGN KEY ("clinicianReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientIntakeMessage" ADD CONSTRAINT "PatientIntakeMessage_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "PatientIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientIntakeImage" ADD CONSTRAINT "PatientIntakeImage_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "PatientIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalAiDraft" ADD CONSTRAINT "ClinicalAiDraft_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "PatientIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalAiDraft" ADD CONSTRAINT "ClinicalAiDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
