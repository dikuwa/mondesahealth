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

  it("provides an accessible shared platform dialog and repaired form grid", () => {
    const dialog = source("src/components/ui/platform-dialog.tsx");
    const css = source("src/app/globals.css");
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain('event.key !== "Tab"');
    expect(css).toContain(".form-grid {");
    expect(css).toContain(".platform-dialog-body");
  });

  it("reuses the Finance document preview and sharing workflow for sick notes", () => {
    const finance = source("src/components/finance-manager.tsx");
    const sickNotes = source("src/components/sick-notes-list.tsx");
    const shared = source("src/components/ui/document-actions.tsx");

    for (const component of [finance, sickNotes]) {
      expect(component).toContain("DocumentPreviewModal");
      expect(component).toContain("DocumentShareModal");
    }
    expect(shared).toContain("finance-preview-frame");
    expect(shared).toContain("WhatsApp");
    expect(shared).toContain("Copy link");
    expect(shared).toContain("Email");
    expect(sickNotes).toContain("Certificate No.");
    expect(sickNotes).toContain("Leave Period");
    expect(sickNotes).not.toContain("Record payment");
    expect(sickNotes).not.toContain("Outstanding");
    expect(sickNotes).not.toContain("Balance due");
  });
});
