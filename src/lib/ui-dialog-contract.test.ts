import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("dashboard dialog contract", () => {
  it("uses branded dialogs instead of browser confirm and prompt overlays", () => {
    const components = [
      "src/components/settings-manager.tsx",
      "src/components/content-manager.tsx",
      "src/components/finance-manager.tsx",
      "src/components/medical-aid-settings-manager.tsx",
    ].map(source).join("\n");

    expect(components).not.toMatch(/window\.(?:alert|confirm|prompt)\s*\(/);
    expect(components).toContain("ConfirmationDialog");
    expect(components).toContain("PromptDialog");
  });
});
