import { z } from "zod";
import { PRACTICE_TYPE_VALUES } from "@/lib/practice-registration-options";

const optionalTrimmedText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? undefined : value,
  z.string().trim().max(maximum).optional(),
);

const coreFields = {
  practiceName: z.string().trim().min(2, "Enter the practice name.").max(140),
  practiceType: z.enum(PRACTICE_TYPE_VALUES, { message: "Select a practice type." }),
  ownerName: z.string().trim().min(2, "Enter the primary owner's name.").max(120),
  email: z.string().trim().email("Enter a valid owner email address."),
  phone: z.string().trim().min(7, "Enter a contact phone number.").max(30),
  registrationNumber: optionalTrimmedText(100),
  town: z.string().trim().min(2, "Enter the practice town or city.").max(100),
  region: z.string().trim().min(2, "Enter the practice region.").max(100),
};

export const publicPracticeApplicationSchema = z.object(coreFields);

export const platformPracticeRegistrationCoreSchema = z.object({
  name: coreFields.practiceName,
  type: coreFields.practiceType,
  ownerName: coreFields.ownerName,
  ownerEmail: coreFields.email,
  phone: coreFields.phone,
  registrationNumber: coreFields.registrationNumber,
  town: coreFields.town,
  region: coreFields.region,
});
