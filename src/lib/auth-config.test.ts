import { describe, expect, it } from "vitest";
import { getAuthSecret } from "./auth-config";

describe("authentication configuration",()=>{
  it("rejects a missing production secret",()=>expect(()=>getAuthSecret({NODE_ENV:"production"})).toThrow(/AUTH_SECRET/));
  it("rejects a short production secret",()=>expect(()=>getAuthSecret({NODE_ENV:"production",AUTH_SECRET:"too-short"})).toThrow(/32 characters/));
  it("accepts a strong production secret",()=>expect(getAuthSecret({NODE_ENV:"production",AUTH_SECRET:"x".repeat(32)})).toBe("x".repeat(32)));
  it("provides a development-only fallback outside production",()=>expect(getAuthSecret({NODE_ENV:"test"})).toContain("development-only"));
});
