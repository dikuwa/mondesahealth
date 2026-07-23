import { describe, expect, it } from "vitest";
import { normaliseNamibianPhone } from "./phone-utils";

describe("normaliseNamibianPhone", () => {
  it("normalises local mobile format 081...", () => {
    expect(normaliseNamibianPhone("0811234567")).toBe("+264811234567");
  });

  it("normalises local mobile format 083...", () => {
    expect(normaliseNamibianPhone("0831234567")).toBe("+264831234567");
  });

  it("normalises local mobile format 085...", () => {
    expect(normaliseNamibianPhone("0851234567")).toBe("+264851234567");
  });

  it("normalises local landline format 061...", () => {
    expect(normaliseNamibianPhone("061123456")).toBe("+26461123456");
  });

  it("preserves international +264 format", () => {
    expect(normaliseNamibianPhone("+264811234567")).toBe("+264811234567");
  });

  it("normalises bare mobile number without leading 0", () => {
    expect(normaliseNamibianPhone("811234567")).toBe("+264811234567");
  });

  it("strips whitespace and hyphens", () => {
    expect(normaliseNamibianPhone(" 081 123 4567 ")).toBe("+264811234567");
    expect(normaliseNamibianPhone("+264-81-123-4567")).toBe("+264811234567");
  });

  it("handles bracketed area codes", () => {
    expect(normaliseNamibianPhone("(061) 123 456")).toBe("+26461123456");
  });

  it("returns null for empty input", () => {
    expect(normaliseNamibianPhone("")).toBeNull();
    expect(normaliseNamibianPhone(null)).toBeNull();
    expect(normaliseNamibianPhone(undefined)).toBeNull();
  });

  it("returns null for unrecognised formats", () => {
    expect(normaliseNamibianPhone("12345")).toBeNull();
    expect(normaliseNamibianPhone("not-a-phone")).toBeNull();
  });

  it("normalises 086 prefix (VoIP/fax)", () => {
    expect(normaliseNamibianPhone("0861234567")).toBe("+264861234567");
  });

  it("normalises 082 prefix", () => {
    expect(normaliseNamibianPhone("0821234567")).toBe("+264821234567");
  });
});
