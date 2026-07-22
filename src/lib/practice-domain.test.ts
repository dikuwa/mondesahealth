import { describe,expect,it } from "vitest";
import { normalizePracticeHostname } from "@/lib/practice-domain";

describe("practice domains",()=>{
  it("normalizes safe hostnames",()=>{
    expect(normalizePracticeHostname("https://Practice.COM/path")).toBe("practice.com");
  });
  it("rejects paths, localhost and malformed hosts",()=>{
    expect(normalizePracticeHostname("localhost")).toBeNull();
    expect(normalizePracticeHostname("not a domain")).toBeNull();
  });
});
