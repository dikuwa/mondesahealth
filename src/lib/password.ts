import { z } from "zod";

export const passwordSchema=z.string().min(12,"Use at least 12 characters.").max(100)
  .regex(/[A-Z]/,"Include an uppercase letter.")
  .regex(/[a-z]/,"Include a lowercase letter.")
  .regex(/[0-9]/,"Include a number.")
  .regex(/[^A-Za-z0-9]/,"Include a symbol.");
