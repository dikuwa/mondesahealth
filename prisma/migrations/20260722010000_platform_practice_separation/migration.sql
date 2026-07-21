-- Platform accounts are no longer required to belong to a clinical practice.
ALTER TABLE "User"
  ALTER COLUMN "practiceId" DROP DEFAULT,
  ALTER COLUMN "practiceId" DROP NOT NULL;

-- Platform-wide audit events are deliberately not attributed to a tenant.
ALTER TABLE "ActivityLog"
  ALTER COLUMN "practiceId" DROP DEFAULT,
  ALTER COLUMN "practiceId" DROP NOT NULL;
