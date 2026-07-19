import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("practice reset directory preservation", () => {
  it("does not delete or reset departments, services, or providers", () => {
    const route = read("src/app/api/practice/reset/route.ts");

    expect(route).not.toContain("provider.delete");
    expect(route).not.toContain("provider.deleteMany");
    expect(route).not.toContain("department.delete");
    expect(route).not.toContain("department.deleteMany");
    expect(route).not.toContain("departmentService.delete");
    expect(route).not.toContain("departmentService.deleteMany");
    expect(route).not.toContain("resetProviderlessDirectory");
  });

  it("does not include directory records in reset preview queries", () => {
    const preview = read("src/app/api/practice/reset-preview/route.ts");

    expect(preview).not.toContain("db.provider.");
    expect(preview).not.toContain("db.department.");
    expect(preview).not.toContain("db.departmentService.");
    expect(preview).not.toContain("directoryRecordsToRemove");
  });

  it("explains that the complete directory is preserved", () => {
    const settings = read("src/components/settings-manager.tsx");

    expect(settings).toContain("complete services and providers directory");
    expect(settings).toContain("Departments, services, and provider profiles remain available for manual editing or deletion");
    expect(settings).not.toContain("Providerless directory records");
    expect(settings).not.toContain("Providers preserved");
  });
});

describe("sidebar badge contract", () => {
  it("uses a generic route badge with an exact 8px centred label gap", () => {
    const shell = read("src/components/dashboard-shell.tsx");
    const css = read("src/app/globals.css");
    expect(shell).toContain("notificationCountsByRoute[href]");
    expect(shell).toContain("dashboard-nav-label-with-badge");
    expect(css).toMatch(
      /\.dashboard-nav-label-with-badge\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*gap:\s*8px;/,
    );
    const badgeRule = css.match(/\.dashboard-nav-count\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(badgeRule).not.toContain("margin-left");
  });
});
