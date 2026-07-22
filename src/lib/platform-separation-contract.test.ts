import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("platform and practice separation contracts", () => {
  it("uses distinct route guards and scope-aware login destinations", () => {
    expect(source("src/app/dashboard/layout.tsx")).toContain("getPracticeSession");
    expect(source("src/app/platform/layout.tsx")).toContain("requirePlatformOwner");
    expect(source("src/app/api/auth/login/route.ts")).toContain('hasPlatformAccess ? "/platform" : "/dashboard"');
    expect(source("src/app/api/auth/scope/route.ts")).toContain("practiceId_userId");
  });

  it("exposes independent public practice routes", () => {
    for (const path of [
      "src/app/practices/[slug]/page.tsx",
      "src/app/practices/[slug]/services/page.tsx",
      "src/app/practices/[slug]/book/page.tsx",
    ]) expect(existsSync(join(process.cwd(), path))).toBe(true);
    expect(source("src/app/page.tsx")).toContain("PlatformLandingPage");
    expect(source("src/lib/platform-landing.ts")).toContain("Independent healthcare practices");
  });

  it("requires an activated independent owner before final separation", () => {
    const transfer = source("src/app/api/platform/practices/transfer-owner/route.ts");
    expect(transfer).toContain("legacyUser");
    expect(transfer).toContain("SEPARATE PLATFORM AND PRACTICE");
    expect(transfer).toContain("sessionVersion: { increment: 1 }");
  });

  it("uses independent platform memberships and protects the primary owner", () => {
    const migration = source("prisma/migrations/20260722030000_platform_memberships/migration.sql");
    expect(migration).toContain('CREATE TABLE "PlatformMembership"');
    expect(migration).toContain('PlatformMembership_one_active_primary');
    expect(migration).toContain("protect_platform_primary_owner");
    expect(source("src/app/api/platform/users/transfer/route.ts")).toContain("allow_primary_owner_transfer");
  });

  it("ships an additive nullable-account migration", () => {
    const migration = source("prisma/migrations/20260722010000_platform_practice_separation/migration.sql");
    expect(migration).toContain('ALTER TABLE "User"');
    expect(migration).toContain('ALTER COLUMN "practiceId" DROP NOT NULL');
    expect(migration).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE/i);
  });
});
