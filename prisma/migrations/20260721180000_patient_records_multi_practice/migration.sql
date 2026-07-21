-- Additive multi-practice and longitudinal clinical-record migration.
-- Back up the production database before applying. This migration does not delete or reseed data.

CREATE TABLE "Practice" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'GENERAL_PRACTICE', "ownerName" TEXT,
  "registrationNumber" TEXT, "licenceInformation" TEXT, "email" TEXT,
  "phone" TEXT, "whatsapp" TEXT, "address" TEXT, "town" TEXT, "region" TEXT,
  "logoData" TEXT, "description" TEXT, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE', "publicVisible" BOOLEAN NOT NULL DEFAULT false,
  "activatedAt" TIMESTAMP(3), "suspensionReason" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Windhoek',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Practice_slug_key" ON "Practice"("slug");
CREATE INDEX "Practice_status_publicVisible_idx" ON "Practice"("status", "publicVisible");
CREATE INDEX "Practice_type_status_idx" ON "Practice"("type", "status");

INSERT INTO "Practice" ("id","slug","name","type","status","subscriptionStatus","publicVisible","activatedAt","updatedAt")
VALUES ('mondesa-health','mondesa-health','Mondesa Health','GENERAL_PRACTICE','ACTIVE','ACTIVE',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "User" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "User" ADD COLUMN "platformRole" TEXT;
ALTER TABLE "Notification" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "Patient" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "Patient" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "sex" TEXT;
ALTER TABLE "Patient" ADD COLUMN "identificationType" TEXT;
ALTER TABLE "Patient" ADD COLUMN "passportNumber" TEXT;
ALTER TABLE "Patient" ADD COLUMN "normalizedPhone" TEXT;
ALTER TABLE "Patient" ADD COLUMN "town" TEXT;
ALTER TABLE "Patient" ADD COLUMN "region" TEXT;
ALTER TABLE "Patient" ADD COLUMN "knownAllergies" TEXT;
ALTER TABLE "Patient" ADD COLUMN "chronicConditions" TEXT;
ALTER TABLE "Patient" ADD COLUMN "currentMedication" TEXT;
ALTER TABLE "Patient" ADD COLUMN "previousProcedures" TEXT;
ALTER TABLE "Patient" ADD COLUMN "medicalAlerts" TEXT;
ALTER TABLE "Patient" ADD COLUMN "medicalHistorySummary" TEXT;
ALTER TABLE "Patient" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Patient" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Patient" ADD COLUMN "updatedById" TEXT;
UPDATE "Patient" SET "normalizedPhone"="phone", "sex"="gender", "lastName"=NULLIF("surname",'') WHERE "normalizedPhone" IS NULL;
ALTER TABLE "PatientMedicalAid" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "Appointment" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "AvailabilityRule" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "BlockedTime" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "BlockedTime" ADD COLUMN "providerId" TEXT;
ALTER TABLE "PracticeSetting" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "DepartmentService" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "DepartmentService" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "DepartmentService" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Provider" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "Provider" ADD COLUMN "userId" TEXT;
ALTER TABLE "Claim" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "ClaimBatch" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "ClaimAttachment" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "Invoice" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "Payment" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "GeneratedDocument" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "ActivityLog" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "ActivityLog" ADD COLUMN "requestInfo" TEXT;
ALTER TABLE "SickNote" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';
ALTER TABLE "PatientIntake" ADD COLUMN "practiceId" TEXT NOT NULL DEFAULT 'mondesa-health';

UPDATE "User" SET "platformRole"='PLATFORM_OWNER' WHERE "role"='OWNER' AND "practiceId"='mondesa-health';

ALTER TABLE "User" ADD CONSTRAINT "User_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedTime" ADD CONSTRAINT "BlockedTime_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeSetting" ADD CONSTRAINT "PracticeSetting_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentService" ADD CONSTRAINT "DepartmentService_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "AvailabilityRule_weekday_key";
DROP INDEX IF EXISTS "DepartmentService_departmentId_name_key";
CREATE UNIQUE INDEX "AvailabilityRule_practiceId_weekday_key" ON "AvailabilityRule"("practiceId","weekday");
CREATE UNIQUE INDEX "PracticeSetting_practiceId_key" ON "PracticeSetting"("practiceId");
CREATE UNIQUE INDEX "DepartmentService_practiceId_departmentId_name_key" ON "DepartmentService"("practiceId","departmentId","name");
CREATE UNIQUE INDEX "Patient_practiceId_patientNumber_key" ON "Patient"("practiceId","patientNumber");
CREATE INDEX "User_practiceId_active_idx" ON "User"("practiceId","active");
CREATE INDEX "Patient_practiceId_archivedAt_fullName_idx" ON "Patient"("practiceId","archivedAt","fullName");
CREATE INDEX "Patient_practiceId_normalizedPhone_idx" ON "Patient"("practiceId","normalizedPhone");
CREATE INDEX "Patient_practiceId_identityNumber_idx" ON "Patient"("practiceId","identityNumber");
CREATE INDEX "Appointment_practiceId_startAt_idx" ON "Appointment"("practiceId","startAt");
CREATE INDEX "Appointment_practiceId_status_startAt_idx" ON "Appointment"("practiceId","status","startAt");
CREATE INDEX "BlockedTime_practiceId_startAt_endAt_idx" ON "BlockedTime"("practiceId","startAt","endAt");
CREATE INDEX "DepartmentService_practiceId_active_public_idx" ON "DepartmentService"("practiceId","active","public");
CREATE INDEX "Provider_practiceId_public_idx" ON "Provider"("practiceId","public");
CREATE INDEX "Claim_practiceId_status_updatedAt_idx" ON "Claim"("practiceId","status","updatedAt");
CREATE INDEX "ClaimBatch_practiceId_status_idx" ON "ClaimBatch"("practiceId","status");
CREATE INDEX "ClaimAttachment_practiceId_createdAt_idx" ON "ClaimAttachment"("practiceId","createdAt");
CREATE INDEX "Invoice_practiceId_status_issueDate_idx" ON "Invoice"("practiceId","status","issueDate");
CREATE INDEX "Payment_practiceId_paidAt_idx" ON "Payment"("practiceId","paidAt");
CREATE INDEX "ActivityLog_practiceId_createdAt_idx" ON "ActivityLog"("practiceId","createdAt");
CREATE INDEX "SickNote_practiceId_status_createdAt_idx" ON "SickNote"("practiceId","status","createdAt");
CREATE INDEX "PatientIntake_practiceId_createdAt_idx" ON "PatientIntake"("practiceId","createdAt");

CREATE TABLE "PracticeUser" (
  "id" TEXT NOT NULL, "practiceId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL, "permissions" TEXT NOT NULL DEFAULT '[]', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PracticeUser_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PracticeUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PracticeUser_practiceId_userId_key" ON "PracticeUser"("practiceId","userId");
CREATE INDEX "PracticeUser_userId_active_idx" ON "PracticeUser"("userId","active");
INSERT INTO "PracticeUser" ("id","practiceId","userId","role","permissions","active","createdAt","updatedAt")
SELECT 'legacy-' || "id", 'mondesa-health', "id", "role", "permissions", "active", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User"
ON CONFLICT ("practiceId","userId") DO NOTHING;

CREATE TABLE "PatientAllergy" ("id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"patientId" TEXT NOT NULL,"substance" TEXT NOT NULL,"reaction" TEXT,"severity" TEXT,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"source" TEXT NOT NULL DEFAULT 'CLINICIAN',"createdById" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY("id"),CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "PatientAllergy_practiceId_patientId_status_idx" ON "PatientAllergy"("practiceId","patientId","status");
CREATE TABLE "PatientCondition" ("id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"patientId" TEXT NOT NULL,"name" TEXT NOT NULL,"icd10Code" TEXT,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"onsetDate" TIMESTAMP(3),"resolvedAt" TIMESTAMP(3),"source" TEXT NOT NULL DEFAULT 'CLINICIAN',"createdById" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PatientCondition_pkey" PRIMARY KEY("id"),CONSTRAINT "PatientCondition_patientId_fkey" FOREIGN KEY("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "PatientCondition_practiceId_patientId_status_idx" ON "PatientCondition"("practiceId","patientId","status");
CREATE TABLE "PatientMedication" ("id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"patientId" TEXT NOT NULL,"name" TEXT NOT NULL,"dose" TEXT,"frequency" TEXT,"instructions" TEXT,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"startedAt" TIMESTAMP(3),"stoppedAt" TIMESTAMP(3),"source" TEXT NOT NULL DEFAULT 'CLINICIAN',"createdById" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PatientMedication_pkey" PRIMARY KEY("id"),CONSTRAINT "PatientMedication_patientId_fkey" FOREIGN KEY("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "PatientMedication_practiceId_patientId_status_idx" ON "PatientMedication"("practiceId","patientId","status");

CREATE TABLE "ClinicalEncounter" (
 "id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"patientId" TEXT NOT NULL,"appointmentId" TEXT,"clinicianId" TEXT NOT NULL,"serviceId" TEXT,"startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "presentingComplaint" TEXT,"patientReportedHistory" TEXT,"aiBookingSummary" TEXT,"historyPresentIllness" TEXT,"relevantHistory" TEXT,"allergiesReviewed" BOOLEAN NOT NULL DEFAULT false,"medicationReviewed" BOOLEAN NOT NULL DEFAULT false,"vitalSigns" JSONB,"examinationFindings" TEXT,"clinicalObservations" TEXT,"assessment" TEXT,"provisionalDiagnosis" TEXT,"confirmedDiagnosis" TEXT,"treatmentProvided" TEXT,"medicationPrescribed" TEXT,"proceduresPerformed" TEXT,"testsRequested" TEXT,"laboratoryRequests" TEXT,"imagingRequests" TEXT,"referrals" TEXT,"followUpInstructions" TEXT,"followUpDate" TIMESTAMP(3),"patientSummary" TEXT,"privateNotes" TEXT,"status" TEXT NOT NULL DEFAULT 'DRAFT',"completedAt" TIMESTAMP(3),"createdById" TEXT NOT NULL,"updatedById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ClinicalEncounter_pkey" PRIMARY KEY("id"),
 CONSTRAINT "ClinicalEncounter_practiceId_fkey" FOREIGN KEY("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClinicalEncounter_patientId_fkey" FOREIGN KEY("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClinicalEncounter_appointmentId_fkey" FOREIGN KEY("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "ClinicalEncounter_clinicianId_fkey" FOREIGN KEY("clinicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClinicalEncounter_createdById_fkey" FOREIGN KEY("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClinicalEncounter_updatedById_fkey" FOREIGN KEY("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClinicalEncounter_practiceId_appointmentId_key" ON "ClinicalEncounter"("practiceId","appointmentId");
CREATE INDEX "ClinicalEncounter_practiceId_patientId_startedAt_idx" ON "ClinicalEncounter"("practiceId","patientId","startedAt");
CREATE INDEX "ClinicalEncounter_practiceId_clinicianId_status_idx" ON "ClinicalEncounter"("practiceId","clinicianId","status");
CREATE TABLE "EncounterDiagnosis" ("id" TEXT NOT NULL,"encounterId" TEXT NOT NULL,"code" TEXT,"description" TEXT NOT NULL,"clinicianDescription" TEXT,"diagnosisType" TEXT NOT NULL DEFAULT 'PROVISIONAL',"isPrimary" BOOLEAN NOT NULL DEFAULT false,"summaryDisposition" TEXT NOT NULL DEFAULT 'DO_NOT_ADD',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EncounterDiagnosis_pkey" PRIMARY KEY("id"),CONSTRAINT "EncounterDiagnosis_encounterId_fkey" FOREIGN KEY("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "EncounterDiagnosis_encounterId_isPrimary_idx" ON "EncounterDiagnosis"("encounterId","isPrimary");
CREATE TABLE "EncounterAmendment" ("id" TEXT NOT NULL,"encounterId" TEXT NOT NULL,"amendedById" TEXT NOT NULL,"reason" TEXT NOT NULL,"originalContent" JSONB NOT NULL,"updatedContent" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EncounterAmendment_pkey" PRIMARY KEY("id"),CONSTRAINT "EncounterAmendment_encounterId_fkey" FOREIGN KEY("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE,CONSTRAINT "EncounterAmendment_amendedById_fkey" FOREIGN KEY("amendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "EncounterAmendment_encounterId_createdAt_idx" ON "EncounterAmendment"("encounterId","createdAt");
CREATE TABLE "EncounterAttachment" ("id" TEXT NOT NULL,"encounterId" TEXT NOT NULL,"filename" TEXT NOT NULL,"mimeType" TEXT NOT NULL,"fileSize" INTEGER NOT NULL,"data" BYTEA NOT NULL,"uploadedById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EncounterAttachment_pkey" PRIMARY KEY("id"),CONSTRAINT "EncounterAttachment_encounterId_fkey" FOREIGN KEY("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "EncounterAttachment_encounterId_createdAt_idx" ON "EncounterAttachment"("encounterId","createdAt");

CREATE TABLE "ProviderAvailability" ("id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"providerId" TEXT NOT NULL,"weekday" INTEGER NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"openTime" TEXT NOT NULL,"closeTime" TEXT NOT NULL,"breakStart" TEXT,"breakEnd" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "ProviderAvailability_pkey" PRIMARY KEY("id"),CONSTRAINT "ProviderAvailability_providerId_fkey" FOREIGN KEY("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "ProviderAvailability_providerId_weekday_key" ON "ProviderAvailability"("providerId","weekday");
CREATE INDEX "ProviderAvailability_practiceId_weekday_idx" ON "ProviderAvailability"("practiceId","weekday");

CREATE TABLE "SubscriptionPlan" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"billingFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',"fee" DOUBLE PRECISION NOT NULL DEFAULT 0,"gracePeriodDays" INTEGER NOT NULL DEFAULT 7,"features" JSONB,"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");
CREATE TABLE "PracticeSubscription" ("id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"planId" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"renewalDate" TIMESTAMP(3),"graceUntil" TIMESTAMP(3),"cancelledAt" TIMESTAMP(3),"internalNotes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PracticeSubscription_pkey" PRIMARY KEY("id"),CONSTRAINT "PracticeSubscription_practiceId_fkey" FOREIGN KEY("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,CONSTRAINT "PracticeSubscription_planId_fkey" FOREIGN KEY("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "PracticeSubscription_practiceId_status_idx" ON "PracticeSubscription"("practiceId","status");
CREATE TABLE "SubscriptionPayment" ("id" TEXT NOT NULL,"subscriptionId" TEXT NOT NULL,"amount" DOUBLE PRECISION NOT NULL,"paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"method" TEXT,"reference" TEXT,"notes" TEXT,"recordedById" TEXT,CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY("id"),CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY("subscriptionId") REFERENCES "PracticeSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "SubscriptionPayment_subscriptionId_paidAt_idx" ON "SubscriptionPayment"("subscriptionId","paidAt");

CREATE TABLE "UserInvitation" ("id" TEXT NOT NULL,"practiceId" TEXT NOT NULL,"email" TEXT NOT NULL,"name" TEXT NOT NULL,"role" TEXT NOT NULL DEFAULT 'OWNER',"tokenHash" TEXT NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"acceptedAt" TIMESTAMP(3),"invitedById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "UserInvitation_pkey" PRIMARY KEY("id"),CONSTRAINT "UserInvitation_practiceId_fkey" FOREIGN KEY("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");
CREATE INDEX "UserInvitation_practiceId_email_acceptedAt_idx" ON "UserInvitation"("practiceId","email","acceptedAt");
