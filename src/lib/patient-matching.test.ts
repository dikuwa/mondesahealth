import { describe, expect, it } from "vitest";
import { maskIdentifier, maskPhone, normalizeIdentity, normalizePatientName, patientMatchWhere } from "./patient-matching";
describe("practice-scoped patient matching",()=>{
  it("normalises identifiers, names and Namibian phone numbers",()=>{expect(normalizeIdentity(" 12-34 ab ")).toBe("1234AB");expect(normalizePatientName("  Jane   DOE ")).toBe("jane doe");const where=patientMatchWhere("practice-a",{phone:"081 234 5678",email:"JANE@example.com",fullName:"Jane Doe",dateOfBirth:new Date("1990-01-01")});expect(where.practiceId).toBe("practice-a");expect(where.OR).toEqual(expect.arrayContaining([{normalizedPhone:"+264812345678"}]));});
  it("never creates a name-only automatic match",()=>{const where=patientMatchWhere("practice-a",{fullName:"Jane Doe"});expect(where.OR).toEqual([{id:"__no_match__"}]);});
  it("masks patient identifiers in possible-match results",()=>{expect(maskIdentifier("12345678901")).toBe("•••••••8901");expect(maskPhone("+264812345678")).toContain("•••");});
});
