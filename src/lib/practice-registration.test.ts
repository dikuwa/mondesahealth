import { describe, expect, it } from "vitest";
import {
  platformPracticeRegistrationCoreSchema,
  publicPracticeApplicationSchema,
} from "@/lib/practice-registration";

const shared = {
  ownerName: "  Anna Owner  ",
  phone: "+264 81 000 0000",
  registrationNumber: "REG-42",
  town: "Windhoek",
  region: "Khomas",
  isOperating: true,
  preferredContactMethod: "EMAIL",
  declarationAccepted: true,
};

describe("shared practice registration details", () => {
  it("uses the same core validation for public and manual registration", () => {
    const publicResult = publicPracticeApplicationSchema.parse({
      ...shared,
      practiceName: "North Care",
      practiceType: "GENERAL_PRACTICE",
      email: "owner@north.example",
    });
    const platformResult = platformPracticeRegistrationCoreSchema.parse({
      ...shared,
      name: "North Care",
      type: "GENERAL_PRACTICE",
      ownerEmail: "owner@north.example",
    });
    expect(publicResult.ownerName).toBe(platformResult.ownerName);
    expect(publicResult.phone).toBe(platformResult.phone);
    expect(publicResult.town).toBe(platformResult.town);
    expect(publicResult.region).toBe(platformResult.region);
  });

  it("requires useful contact and location details in both paths", () => {
    const incomplete = { practiceName: "North Care", practiceType: "GENERAL_PRACTICE", ownerName: "Anna", email: "owner@north.example" };
    expect(publicPracticeApplicationSchema.safeParse(incomplete).success).toBe(false);
    expect(platformPracticeRegistrationCoreSchema.safeParse({ name: "North Care", type: "GENERAL_PRACTICE", ownerName: "Anna", ownerEmail: "owner@north.example" }).success).toBe(false);
  });

  it("does not persist blank optional registration numbers", () => {
    const result = publicPracticeApplicationSchema.parse({
      ...shared,
      practiceName: "North Care",
      practiceType: "GENERAL_PRACTICE",
      email: "owner@north.example",
      registrationNumber: "   ",
    });
    expect(result.registrationNumber).toBeUndefined();
  });
});
