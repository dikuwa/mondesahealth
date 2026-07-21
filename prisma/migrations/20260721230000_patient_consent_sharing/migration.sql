CREATE TABLE "PatientShareConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "sourcePracticeId" TEXT NOT NULL,
  "destinationPracticeId" TEXT NOT NULL,
  "scopes" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "patientOrGuardianName" TEXT NOT NULL,
  "relationshipToPatient" TEXT,
  "consentMethod" TEXT NOT NULL,
  "consentStatement" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revocationReason" TEXT,
  "lastViewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientShareConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientShareConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PatientShareConsent_sourcePracticeId_fkey" FOREIGN KEY ("sourcePracticeId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PatientShareConsent_destinationPracticeId_fkey" FOREIGN KEY ("destinationPracticeId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PatientShareConsent_sourcePracticeId_patientId_status_expiresAt_idx" ON "PatientShareConsent"("sourcePracticeId", "patientId", "status", "expiresAt");
CREATE INDEX "PatientShareConsent_destinationPracticeId_status_expiresAt_idx" ON "PatientShareConsent"("destinationPracticeId", "status", "expiresAt");
