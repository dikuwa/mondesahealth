import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");
const hasPracticeScope = (path: string) =>
  expect(source(path)).toMatch(/practiceId\s*:\s*session\.practiceId/);
describe("tenant isolation contracts", () => {
  it("scopes patient and encounter reads to the authenticated practice", () => {
    hasPracticeScope("src/app/api/patients/route.ts");
    hasPracticeScope("src/app/api/encounters/route.ts");
  });
  it("scopes appointments and protected downloads on the server", () => {
    hasPracticeScope("src/app/api/appointments/route.ts");
    hasPracticeScope("src/app/api/documents/[id]/pdf/route.tsx");
    hasPracticeScope("src/app/api/intake-images/[id]/route.ts");
    hasPracticeScope("src/app/api/claim-attachments/route.ts");
    hasPracticeScope("src/app/api/receipts/[id]/pdf/route.tsx");
    hasPracticeScope("src/app/api/sick-notes/[id]/pdf/route.tsx");
    hasPracticeScope("src/app/api/claim-batches/route.ts");
  });
  it("scopes activity, notifications and destructive practice reset operations", () => {
    expect(source("src/app/api/activity/route.ts")).toContain(
      "activityWhere(url.searchParams, session.practiceId)",
    );
    expect(source("src/lib/activity-query.ts")).toContain("practiceId");
    expect(source("src/app/api/notifications/route.ts")).toMatch(
      /practiceId\s*:\s*user\.practiceId/,
    );
    const reset = source("src/app/api/practice/reset/route.ts");
    expect(reset).toContain("count(session.practiceId)");
    expect(reset).not.toMatch(/\.deleteMany\(\)/);
    expect(source("src/app/api/practice/reset-preview/route.ts")).toContain(
      "session.practiceId",
    );
  });
  it("requires reasoned amendments instead of overwriting completed encounters", () => {
    const route = source("src/app/api/encounters/route.ts");
    expect(route).toContain(
      "Completed encounters can only be changed through a reasoned amendment",
    );
    expect(route).toContain("encounterAmendment.create");
    expect(route).toContain("originalContent");
    expect(route).toContain("amendmentReason");
  });
  it("routes public bookings to an active public practice", () => {
    const route = source("src/app/api/bookings/route.ts");
    expect(route).toContain('status: "ACTIVE", publicVisible: true');
    expect(route).toContain("practiceId: practice.id");
    expect(route).toContain("patientMatchWhere(practice.id");
  });
});
