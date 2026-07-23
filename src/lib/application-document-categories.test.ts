import { describe, expect, it } from "vitest";
import {
  APPLICATION_DOCUMENT_CATEGORY_VALUES,
  documentCategoryLabel,
  isValidApplicationTransition,
  VALID_APPLICATION_TRANSITIONS,
} from "./application-document-categories";

describe("APPLICATION_DOCUMENT_CATEGORY_VALUES", () => {
  it("includes all expected categories", () => {
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("PRACTICE_REGISTRATION");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("PROFESSIONAL_REGISTRATION");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("NAMAF_REGISTRATION");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("BUSINESS_REGISTRATION");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("PRACTITIONER_IDENTITY");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("QUALIFICATION_CERTIFICATE");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("PRACTICE_LETTERHEAD");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("MEDICAL_CERTIFICATE_SAMPLE");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("PROOF_OF_ADDRESS");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("TAX_REGISTRATION");
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toContain("OTHER");
  });

  it("has exactly 11 categories", () => {
    expect(APPLICATION_DOCUMENT_CATEGORY_VALUES).toHaveLength(11);
  });
});

describe("documentCategoryLabel", () => {
  it("returns the label for a known category", () => {
    expect(documentCategoryLabel("PRACTICE_REGISTRATION")).toBe(
      "Practice registration certificate",
    );
  });

  it("returns a humanised fallback for unknown values", () => {
    expect(documentCategoryLabel("CUSTOM_CATEGORY")).toBe("Custom category");
  });

  it("handles empty string gracefully", () => {
    expect(typeof documentCategoryLabel("")).toBe("string");
  });
});

describe("isValidApplicationTransition", () => {
  it("allows DRAFT → SUBMITTED", () => {
    expect(isValidApplicationTransition("DRAFT", "SUBMITTED")).toBe(true);
  });

  it("allows SUBMITTED → UNDER_REVIEW", () => {
    expect(isValidApplicationTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
  });

  it("blocks DRAFT → APPROVED (skip submit/review)", () => {
    expect(isValidApplicationTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("blocks APPROVED → any (terminal)", () => {
    expect(isValidApplicationTransition("APPROVED", "SUB_MITTED")).toBe(false);
    expect(isValidApplicationTransition("APPROVED", "UNDER_REVIEW")).toBe(false);
  });

  it("blocks REJECTED → any (terminal)", () => {
    expect(isValidApplicationTransition("REJECTED", "SUBMITTED")).toBe(false);
  });

  it("allows UNDER_REVIEW → MORE_INFORMATION_REQUIRED", () => {
    expect(
      isValidApplicationTransition(
        "UNDER_REVIEW",
        "MORE_INFORMATION_REQUIRED",
      ),
    ).toBe(true);
  });

  it("allows MORE_INFORMATION_REQUIRED → UNDER_REVIEW", () => {
    expect(
      isValidApplicationTransition(
        "MORE_INFORMATION_REQUIRED",
        "UNDER_REVIEW",
      ),
    ).toBe(true);
  });

  it("allows SUBMITTED → WITHDRAWN", () => {
    expect(isValidApplicationTransition("SUBMITTED", "WITHDRAWN")).toBe(true);
  });

  it("returns false for unknown source status", () => {
    expect(isValidApplicationTransition("UNKNOWN", "SUBMITTED")).toBe(false);
  });

  it("has all defined transitions symmetric to the VALID_APPLICATION_TRANSITIONS map", () => {
    for (const [from, tos] of Object.entries(VALID_APPLICATION_TRANSITIONS)) {
      for (const to of tos) {
        expect(isValidApplicationTransition(from, to)).toBe(true);
      }
    }
  });
});
