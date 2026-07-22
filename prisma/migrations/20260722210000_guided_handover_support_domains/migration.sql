CREATE TABLE "PracticeHandover" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ownerEmail" TEXT,
    "invitedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "rollbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PracticeHandover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeSupportRequest" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PracticeSupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeDomain" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT,
    "dnsInstructions" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PracticeDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeDomain_hostname_key" ON "PracticeDomain"("hostname");
CREATE INDEX "PracticeHandover_practiceId_status_createdAt_idx" ON "PracticeHandover"("practiceId", "status", "createdAt");
CREATE INDEX "PracticeSupportRequest_practiceId_status_createdAt_idx" ON "PracticeSupportRequest"("practiceId", "status", "createdAt");
CREATE INDEX "PracticeSupportRequest_requestedById_status_expiresAt_idx" ON "PracticeSupportRequest"("requestedById", "status", "expiresAt");
CREATE INDEX "PracticeDomain_practiceId_status_primary_idx" ON "PracticeDomain"("practiceId", "status", "primary");

ALTER TABLE "PracticeHandover" ADD CONSTRAINT "PracticeHandover_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeSupportRequest" ADD CONSTRAINT "PracticeSupportRequest_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeDomain" ADD CONSTRAINT "PracticeDomain_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
