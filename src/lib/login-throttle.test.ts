import { describe, expect, it } from "vitest";
import { loginThrottleKeys, requestAddress, retryAfterSeconds } from "./login-throttle";

describe("login throttling",()=>{
  it("uses opaque, stable keys without retaining identifiers",()=>{
    const first=loginThrottleKeys("Owner@MondesaHealth.na","203.0.113.5");
    const second=loginThrottleKeys("owner@mondesahealth.na","203.0.113.5");
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("owner@mondesahealth.na");
    expect(JSON.stringify(first)).not.toContain("203.0.113.5");
  });
  it("prefers the trusted real-IP header",()=>expect(requestAddress(new Request("https://example.test",{headers:{"x-real-ip":"203.0.113.8","x-forwarded-for":"198.51.100.2"}}))).toBe("203.0.113.8"));
  it("rounds retry-after up and never returns zero",()=>expect(retryAfterSeconds(new Date(10_001),new Date(10_000))).toBe(1));
});
