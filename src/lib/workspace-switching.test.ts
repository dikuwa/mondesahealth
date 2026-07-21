import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("workspace switching contracts", () => {
  it("requires an explicit active practice membership", () => {
    const route = source("src/app/api/auth/scope/route.ts");
    expect(route).toContain("practiceId_userId");
    expect(route).toContain("membership?.active");
    expect(route).toContain("WORKSPACE_SCOPE_CHANGED");
  });

  it("keeps platform permissions unavailable in practice sessions", () => {
    const auth = source("src/lib/auth.ts");
    expect(auth).toContain('scope: "PRACTICE"');
    expect(auth).toContain("platformPermissions: []");
    expect(auth).toContain('scope: "PLATFORM"');
  });
});
