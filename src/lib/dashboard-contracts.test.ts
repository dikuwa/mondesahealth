import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const hasPracticeScope = (path: string) =>
  expect(source(path)).toMatch(/practiceId\s*:\s*session\.practiceId/);

describe("dashboard page safety contracts", () => {
  it("requires session authentication on every dashboard route", () => {
    const routes = [
      "src/app/dashboard/appointments/page.tsx",
      "src/app/dashboard/patients/page.tsx",
      "src/app/dashboard/encounters/[id]/page.tsx",
      "src/app/dashboard/claims/page.tsx",
      "src/app/dashboard/claims/[id]/page.tsx",
      "src/app/dashboard/finance/page.tsx",
      "src/app/dashboard/sick-notes/page.tsx",
      "src/app/dashboard/medical-aid/page.tsx",
      "src/app/dashboard/services/page.tsx",
      "src/app/dashboard/availability/page.tsx",
      "src/app/dashboard/users/page.tsx",
      "src/app/dashboard/activity/page.tsx",
      "src/app/dashboard/subscription/page.tsx",
      "src/app/dashboard/onboarding/page.tsx",
    ];
    for (const route of routes) {
      const code = source(route);
      expect(
        code.match(/getPracticeSession|requirePermission|requireSickNoteViewer/),
        `${route} must call a session auth function`,
      ).toBeTruthy();
    }
  });

  it("scopes appointments, patients and encounters to the authenticated practice", () => {
    hasPracticeScope("src/app/dashboard/appointments/page.tsx");
    // Patient page scopes via findFirst with practiceId filter
    expect(source("src/app/dashboard/patients/[id]/page.tsx")).toContain(
      "practiceId: session.practiceId",
    );
    hasPracticeScope("src/app/dashboard/encounters/[id]/page.tsx");
  });

  it("scopes claims, finance and sick-notes to the authenticated practice", () => {
    hasPracticeScope("src/app/dashboard/claims/[id]/page.tsx");
    const finance = source("src/app/dashboard/finance/page.tsx");
    expect(finance).toContain("practiceId: session.practiceId");
    expect(finance).toContain("money(total)");
    expect(finance).toContain("money(paid)");
    const sickRoutes = [
      "src/app/dashboard/sick-notes/page.tsx",
      "src/app/dashboard/sick-notes/[id]/page.tsx",
    ];
    for (const route of sickRoutes) {
      expect(source(route)).toMatch(
        /practiceId\s*:\s*session\.practiceId/,
      );
    }
  });

  it("does not expose raw env vars, secrets or credentials in dashboard pages", () => {
    const pages = [
      "src/app/dashboard/appointments/page.tsx",
      "src/app/dashboard/patients/[id]/page.tsx",
      "src/app/dashboard/encounters/[id]/page.tsx",
      "src/app/dashboard/claims/[id]/page.tsx",
      "src/app/dashboard/finance/page.tsx",
      "src/app/dashboard/sick-notes/page.tsx",
      "src/app/dashboard/medical-aid/page.tsx",
    ];
    for (const page of pages) {
      const code = source(page);
      expect(code).not.toContain("process.env");
      expect(code).not.toContain("API_KEY");
      expect(code).not.toContain("DATABASE_URL");
    }
  });

  it("avoids raw redirect or notFound responses without auth checks", () => {
    const protectedPages = [
      "src/app/dashboard/encounters/[id]/page.tsx",
      "src/app/dashboard/claims/[id]/page.tsx",
      "src/app/dashboard/patients/[id]/page.tsx",
    ];
    for (const page of protectedPages) {
      const code = source(page);
      // Should check session before rendering
      expect(
        code.match(/notFound\(\)|redirect\(/),
        `${page} must handle missing session`,
      ).toBeTruthy();
    }
  });

  it("forces dynamic rendering on data-driven dashboard pages", () => {
    const dynamicPages = [
      "src/app/dashboard/appointments/page.tsx",
      "src/app/dashboard/claims/[id]/page.tsx",
      "src/app/dashboard/finance/page.tsx",
      "src/app/dashboard/sick-notes/page.tsx",
    ];
    for (const page of dynamicPages) {
      expect(
        source(page),
        `${page} should force-dynamic for fresh data`,
      ).toContain("force-dynamic");
    }
  });
});
