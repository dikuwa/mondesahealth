import { describe, expect, it } from "vitest";
import {
  PATIENT_SHARE_SCOPES,
  parsePatientShareScopes,
} from "@/lib/patient-sharing";

describe("patient sharing scopes", () => {
  it("keeps only supported consent scopes", () => {
    expect(
      parsePatientShareScopes(
        JSON.stringify(["SUMMARY", "PRIVATE_NOTES", "DOCUMENTS"]),
      ),
    ).toEqual(["SUMMARY", "DOCUMENTS"]);
  });

  it("fails closed for malformed consent data", () => {
    expect(parsePatientShareScopes("not-json")).toEqual([]);
    expect(PATIENT_SHARE_SCOPES).not.toContain("PRIVATE_NOTES");
  });
});
