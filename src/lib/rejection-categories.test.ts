import { describe, expect, it } from "vitest";
import {
  APPLICATION_REJECTION_CATEGORIES,
  APPLICATION_REJECTION_VALUES,
  REJECTION_CATEGORY_OPTIONS,
  rejectionCategoryLabel,
} from "./rejection-categories";

describe("APPLICATION_REJECTION_CATEGORIES", () => {
  it("includes all expected rejection reasons", () => {
    const values = APPLICATION_REJECTION_CATEGORIES.map((c) => c.value);
    expect(values).toContain("UNABLE_TO_VERIFY_REGISTRATION");
    expect(values).toContain("INCOMPLETE_INFORMATION");
    expect(values).toContain("DUPLICATE_APPLICATION");
    expect(values).toContain("INELIGIBLE_PRACTICE_TYPE");
    expect(values).toContain("FRAUD_CONCERN");
    expect(values).toContain("APPLICANT_WITHDREW");
    expect(values).toContain("OTHER");
  });

  it("has exactly 7 categories", () => {
    expect(APPLICATION_REJECTION_CATEGORIES).toHaveLength(7);
  });

  it("assigns human-readable labels", () => {
    const fraud = APPLICATION_REJECTION_CATEGORIES.find(
      (c) => c.value === "FRAUD_CONCERN",
    );
    expect(fraud?.label).toBe("Fraud or misrepresentation concern");
  });
});

describe("APPLICATION_REJECTION_VALUES", () => {
  it("is an array of all category values", () => {
    expect(APPLICATION_REJECTION_VALUES).toContain("OTHER");
    expect(APPLICATION_REJECTION_VALUES).toHaveLength(7);
  });
});

describe("rejectionCategoryLabel", () => {
  it("returns the label for a known category", () => {
    expect(rejectionCategoryLabel("FRAUD_CONCERN")).toBe(
      "Fraud or misrepresentation concern",
    );
  });

  it("returns a humanised fallback for an unknown value", () => {
    const result = rejectionCategoryLabel("SOME_UNKNOWN_CODE");
    // Should be capitalised and spaces instead of underscores
    expect(result).toMatch(/^[A-Z]/);
    expect(result).not.toContain("_");
  });

  it("handles empty string", () => {
    expect(typeof rejectionCategoryLabel("")).toBe("string");
  });
});

describe("REJECTION_CATEGORY_OPTIONS", () => {
  it("has a disabled placeholder as the first option", () => {
    expect(REJECTION_CATEGORY_OPTIONS[0].disabled).toBe(true);
    expect(REJECTION_CATEGORY_OPTIONS[0].value).toBe("");
  });

  it("includes all categories as selectable options", () => {
    const selectable = REJECTION_CATEGORY_OPTIONS.filter((o) => !o.disabled);
    expect(selectable).toHaveLength(APPLICATION_REJECTION_CATEGORIES.length);
  });
});
