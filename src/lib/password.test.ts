import { describe, expect, it } from "vitest";
import { passwordSchema } from "./password";

describe("staff password policy",()=>{
  it("accepts a long mixed password",()=>expect(passwordSchema.safeParse("Mondesa-Strong-2026!").success).toBe(true));
  it.each(["Short1!","all-lowercase-123!","ALL-UPPERCASE-123!","NoNumbersHere!","NoSymbolsHere123"])("rejects weak password %s",password=>expect(passwordSchema.safeParse(password).success).toBe(false));
});
