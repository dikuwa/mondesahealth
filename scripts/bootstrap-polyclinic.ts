import { PrismaClient } from "@prisma/client";
import { bootstrapPolyclinic } from "../prisma/polyclinic-data";

const db = new PrismaClient();

bootstrapPolyclinic(db)
  .then(() => console.log("Polyclinic directory and confirmed facility details are ready."))
  .finally(() => db.$disconnect());
