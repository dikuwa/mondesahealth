import { describe,expect,it } from "vitest";
import { normalizePhone,validNamibianPhone,mask } from "./utils";
describe("Namibian phone handling",()=>{
  it("accepts common local and international forms",()=>{expect(validNamibianPhone("081 234 5678")).toBe(true);expect(validNamibianPhone("061-234567")).toBe(true);expect(validNamibianPhone("+264 81 234 5678")).toBe(true)});
  it("normalises local numbers without discarding valid digits",()=>{expect(normalizePhone("081 234 5678")).toBe("+264812345678");expect(normalizePhone("+264 81 234 5678")).toBe("+264812345678")});
  it("masks sensitive identifiers",()=>expect(mask("1234567890")).toBe("••••••7890"));
});
