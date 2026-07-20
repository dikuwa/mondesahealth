import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Page, renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { DocumentBrand, DocumentSignature } from "./document-brand";

describe("shared PDF branding", () => {
  it("renders the website wordmark and compact signature", async () => {
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4">
          <DocumentBrand />
          <DocumentSignature name="Dr Kauzu" title="Medical Practitioner" />
        </Page>
      </Document>,
    );
    expect(buffer.byteLength).toBeGreaterThan(5_000);
  });

  it("is used by every generated document family", () => {
    for (const file of ["invoice-document.tsx", "receipt-document.tsx", "claim-documents.tsx"]) {
      const value = readFileSync(join(process.cwd(), "src/lib", file), "utf8");
      expect(value).toContain("DocumentBrand");
      expect(value).toContain("DocumentSignature");
    }
  });
});
