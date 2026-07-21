-- Platform access is represented independently from practice employment.
CREATE TABLE "PlatformMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "permissions" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'ACCESS',
  "permissions" TEXT NOT NULL DEFAULT '[]',
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformMembership_userId_key" ON "PlatformMembership"("userId");
CREATE INDEX "PlatformMembership_active_role_idx" ON "PlatformMembership"("active", "role");
CREATE UNIQUE INDEX "PlatformInvitation_tokenHash_key" ON "PlatformInvitation"("tokenHash");
CREATE INDEX "PlatformInvitation_email_acceptedAt_expiresAt_idx" ON "PlatformInvitation"("email", "acceptedAt", "expiresAt");
ALTER TABLE "PlatformMembership" ADD CONSTRAINT "PlatformMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every legacy platform account while selecting exactly one immutable primary owner.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS position
  FROM "User"
  WHERE "platformRole" = 'PLATFORM_OWNER'
)
INSERT INTO "PlatformMembership" ("id", "userId", "role", "permissions", "active", "isPrimary", "createdAt", "updatedAt")
SELECT 'pm_' || md5("id"), "id",
  CASE WHEN position = 1 THEN 'PRIMARY_OWNER' ELSE 'PLATFORM_ADMIN' END,
  '[]', true, position = 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM ranked;

CREATE UNIQUE INDEX "PlatformMembership_one_active_primary"
  ON "PlatformMembership" ((1))
  WHERE "isPrimary" = true AND "active" = true;

-- Direct deletes/demotions of the primary owner are rejected. The protected transfer
-- transaction explicitly enables the narrow session-local override.
CREATE OR REPLACE FUNCTION protect_platform_primary_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."isPrimary" = true
    AND current_setting('app.allow_primary_owner_transfer', true) IS DISTINCT FROM 'true'
    AND (
      TG_OP = 'DELETE'
      OR NEW."isPrimary" = false
      OR NEW."active" = false
      OR NEW."role" <> 'PRIMARY_OWNER'
    )
  THEN
    RAISE EXCEPTION 'The primary platform owner can only be changed through protected ownership transfer.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlatformMembership_protect_primary"
BEFORE UPDATE OR DELETE ON "PlatformMembership"
FOR EACH ROW EXECUTE FUNCTION protect_platform_primary_owner();
