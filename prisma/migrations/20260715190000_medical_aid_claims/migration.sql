ALTER TABLE "Claim" DROP CONSTRAINT "Claim_appointmentId_fkey";

ALTER TABLE "Claim"
  ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "claimType" TEXT NOT NULL DEFAULT 'DIRECT_MEDICAL_AID',
  ADD COLUMN "consentSnapshot" TEXT,
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "isResubmission" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "medicalAidFundId" TEXT,
  ADD COLUMN "membershipDetailSnapshot" TEXT,
  ADD COLUMN "originalClaimId" TEXT,
  ADD COLUMN "patientMedicalAidId" TEXT,
  ADD COLUMN "patientSnapshot" TEXT,
  ADD COLUMN "practiceSnapshot" TEXT,
  ADD COLUMN "providerSnapshot" TEXT,
  ADD COLUMN "serviceDateFrom" TIMESTAMP(3),
  ADD COLUMN "serviceDateTo" TIMESTAMP(3),
  ADD COLUMN "submissionType" TEXT NOT NULL DEFAULT 'FIRST_SUBMISSION',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "validationState" TEXT,
  ALTER COLUMN "appointmentId" DROP NOT NULL;

ALTER TABLE "ClaimBatch"
  ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "datePrepared" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "medicalAidFundId" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "serviceDateFrom" TIMESTAMP(3),
  ADD COLUMN "serviceDateTo" TIMESTAMP(3),
  ADD COLUMN "submissionReference" TEXT,
  ADD COLUMN "submissionType" TEXT NOT NULL DEFAULT 'FIRST_SUBMISSION',
  ADD COLUMN "submittedByUserId" TEXT,
  ADD COLUMN "totalClaims" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ClaimLine"
  ADD COLUMN "clinicalClaimNote" TEXT,
  ADD COLUMN "medicationDescription" TEXT,
  ADD COLUMN "modifier" TEXT,
  ADD COLUMN "nappiCode" TEXT,
  ADD COLUMN "preAuthorisationNumber" TEXT,
  ADD COLUMN "procedureCodeSnapshot" TEXT,
  ADD COLUMN "procedureDescriptionSnapshot" TEXT,
  ADD COLUMN "procedureItemId" TEXT,
  ADD COLUMN "referralDiagnosis" TEXT,
  ADD COLUMN "serviceDate" TIMESTAMP(3),
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "MedicalAid"
  ADD COLUMN "acceptedSubmissionMethods" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN "coverSheetRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "physicalAddress" TEXT,
  ADD COLUMN "postalAddress" TEXT,
  ADD COLUMN "serviceDateRangeRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PatientMedicalAid"
  ADD COLUMN "beneficiarySuffix" TEXT,
  ADD COLUMN "directBillingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "preAuthorisationNumber" TEXT,
  ADD COLUMN "reimbursementOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PracticeSetting"
  ADD COLUMN "claimContactName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "claimEmail" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "claimPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "claimPostalAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "consentWording" TEXT NOT NULL DEFAULT 'I understand that diagnosis information may be represented using ICD-10 codes and disclosed to the selected medical-aid fund or its administrator for the purpose of processing and assessing my medical-aid claim.';

CREATE TABLE "MedicalAidConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "patientMedicalAidId" TEXT,
  "consentStatus" TEXT NOT NULL DEFAULT 'NOT_CAPTURED',
  "consentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "patientOrGuardianName" TEXT NOT NULL,
  "relationshipToPatient" TEXT,
  "capturedByUserId" TEXT NOT NULL,
  "signatureData" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalAidConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Icd10Import" (
  "id" TEXT NOT NULL,
  "versionName" TEXT NOT NULL,
  "sourceFilename" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importedByUserId" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  CONSTRAINT "Icd10Import_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Icd10Code" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "threeCharacterCode" TEXT,
  "threeCharacterDescription" TEXT,
  "chapter" TEXT,
  "chapterDescription" TEXT,
  "groupCode" TEXT,
  "groupDescription" TEXT,
  "validForClinicalUse" BOOLEAN NOT NULL DEFAULT false,
  "validForPrimary" BOOLEAN NOT NULL DEFAULT false,
  "validAsterisk" BOOLEAN NOT NULL DEFAULT false,
  "validDagger" BOOLEAN NOT NULL DEFAULT false,
  "validSequelae" BOOLEAN NOT NULL DEFAULT false,
  "ageRange" TEXT,
  "minimumAge" INTEGER,
  "maximumAge" INTEGER,
  "genderRestriction" TEXT,
  "status" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Icd10Code_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalAidProcedureItem" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "requiresNappiCode" BOOLEAN NOT NULL DEFAULT false,
  "requiresPreAuthorisation" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicalAidProcedureItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClaimLineIcd10Code" (
  "id" TEXT NOT NULL,
  "claimLineId" TEXT NOT NULL,
  "icd10CodeId" TEXT,
  "codeSnapshot" TEXT NOT NULL,
  "descriptionSnapshot" TEXT NOT NULL,
  "position" TEXT NOT NULL DEFAULT 'SECONDARY',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimLineIcd10Code_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClaimStatusEvent" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "previousStatus" TEXT,
  "newStatus" TEXT NOT NULL,
  "reason" TEXT,
  "rejectionCode" TEXT,
  "rejectionDescription" TEXT,
  "changedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClaimAttachment" (
  "id" TEXT NOT NULL,
  "claimId" TEXT,
  "batchId" TEXT,
  "patientMedicalAidId" TEXT,
  "attachmentType" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalAidConsent_patientId_consentDate_idx" ON "MedicalAidConsent"("patientId", "consentDate");
CREATE UNIQUE INDEX "Icd10Import_versionName_key" ON "Icd10Import"("versionName");
CREATE INDEX "Icd10Import_active_importedAt_idx" ON "Icd10Import"("active", "importedAt");
CREATE INDEX "Icd10Code_code_idx" ON "Icd10Code"("code");
CREATE INDEX "Icd10Code_description_idx" ON "Icd10Code"("description");
CREATE INDEX "Icd10Code_importId_validForClinicalUse_validForPrimary_idx" ON "Icd10Code"("importId", "validForClinicalUse", "validForPrimary");
CREATE UNIQUE INDEX "Icd10Code_importId_code_key" ON "Icd10Code"("importId", "code");
CREATE UNIQUE INDEX "MedicalAidProcedureItem_code_key" ON "MedicalAidProcedureItem"("code");
CREATE INDEX "ClaimLineIcd10Code_claimLineId_isPrimary_idx" ON "ClaimLineIcd10Code"("claimLineId", "isPrimary");
CREATE UNIQUE INDEX "ClaimLineIcd10Code_claimLineId_codeSnapshot_key" ON "ClaimLineIcd10Code"("claimLineId", "codeSnapshot");
CREATE INDEX "ClaimStatusEvent_claimId_createdAt_idx" ON "ClaimStatusEvent"("claimId", "createdAt");
CREATE INDEX "ClaimAttachment_claimId_createdAt_idx" ON "ClaimAttachment"("claimId", "createdAt");
CREATE INDEX "ClaimAttachment_batchId_createdAt_idx" ON "ClaimAttachment"("batchId", "createdAt");
CREATE INDEX "Claim_status_updatedAt_idx" ON "Claim"("status", "updatedAt");
CREATE INDEX "Claim_patientId_serviceDateFrom_idx" ON "Claim"("patientId", "serviceDateFrom");
CREATE INDEX "Claim_medicalAidFundId_status_idx" ON "Claim"("medicalAidFundId", "status");
CREATE INDEX "ClaimBatch_medicalAidFundId_status_idx" ON "ClaimBatch"("medicalAidFundId", "status");
CREATE INDEX "ClaimLine_claimId_sortOrder_idx" ON "ClaimLine"("claimId", "sortOrder");
CREATE INDEX "PatientMedicalAid_patientId_current_idx" ON "PatientMedicalAid"("patientId", "current");

ALTER TABLE "Claim" ADD CONSTRAINT "Claim_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_patientMedicalAidId_fkey" FOREIGN KEY ("patientMedicalAidId") REFERENCES "PatientMedicalAid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_medicalAidFundId_fkey" FOREIGN KEY ("medicalAidFundId") REFERENCES "MedicalAid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_originalClaimId_fkey" FOREIGN KEY ("originalClaimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimLine" ADD CONSTRAINT "ClaimLine_procedureItemId_fkey" FOREIGN KEY ("procedureItemId") REFERENCES "MedicalAidProcedureItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimBatch" ADD CONSTRAINT "ClaimBatch_medicalAidFundId_fkey" FOREIGN KEY ("medicalAidFundId") REFERENCES "MedicalAid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimBatch" ADD CONSTRAINT "ClaimBatch_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalAidConsent" ADD CONSTRAINT "MedicalAidConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicalAidConsent" ADD CONSTRAINT "MedicalAidConsent_patientMedicalAidId_fkey" FOREIGN KEY ("patientMedicalAidId") REFERENCES "PatientMedicalAid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalAidConsent" ADD CONSTRAINT "MedicalAidConsent_capturedByUserId_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Icd10Import" ADD CONSTRAINT "Icd10Import_importedByUserId_fkey" FOREIGN KEY ("importedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Icd10Code" ADD CONSTRAINT "Icd10Code_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Icd10Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimLineIcd10Code" ADD CONSTRAINT "ClaimLineIcd10Code_claimLineId_fkey" FOREIGN KEY ("claimLineId") REFERENCES "ClaimLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimLineIcd10Code" ADD CONSTRAINT "ClaimLineIcd10Code_icd10CodeId_fkey" FOREIGN KEY ("icd10CodeId") REFERENCES "Icd10Code"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimStatusEvent" ADD CONSTRAINT "ClaimStatusEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimStatusEvent" ADD CONSTRAINT "ClaimStatusEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ClaimBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_patientMedicalAidId_fkey" FOREIGN KEY ("patientMedicalAidId") REFERENCES "PatientMedicalAid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "Claim" SET "serviceDateFrom" = "consultationDate", "serviceDateTo" = "consultationDate" WHERE "serviceDateFrom" IS NULL;
UPDATE "ClaimBatch" SET "totalClaims" = (SELECT COUNT(*) FROM "ClaimBatchItem" WHERE "ClaimBatchItem"."batchId" = "ClaimBatch"."id");
