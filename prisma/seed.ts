import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { roleDefaults } from "../src/lib/permissions";
import { passwordSchema } from "../src/lib/password";
import { bootstrapPolyclinic } from "./polyclinic-data";

const db = new PrismaClient();

async function main() {
  if (!process.env.OWNER_EMAIL || !process.env.OWNER_PASSWORD)
    throw new Error(
      "OWNER_EMAIL and OWNER_PASSWORD must be supplied explicitly when seeding.",
    );
  const ownerEmail = process.env.OWNER_EMAIL.toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD;
  const ownerName = process.env.OWNER_NAME || "Practice Owner";
  passwordSchema.parse(ownerPassword);
  await bootstrapPolyclinic(db);

  await db.user.upsert({
    where: { email: ownerEmail },
    update: { permissions: JSON.stringify(roleDefaults.OWNER) },
    create: {
      name: ownerName,
      email: ownerEmail,
      passwordHash: await hash(ownerPassword, 12),
      role: "OWNER",
      permissions: JSON.stringify(roleDefaults.OWNER),
    },
  });

  await db.patient.upsert({
    where: {
      practiceId_patientNumber: {
        practiceId: "mondesa-health",
        patientNumber: "PAT-DEMO-001",
      },
    },
    update: {},
    create: {
      patientNumber: "PAT-DEMO-001",
      fullName: "Demo Patient",
      surname: "Patient",
      initials: "DP",
      dateOfBirth: new Date("1990-06-15T00:00:00"),
      gender: "Other",
      phone: "+264810000001",
      whatsapp: "+264810000001",
      preferredMethod: "WHATSAPP",
    },
  });

  const funds = [
    ["PSEMAS", "PSEMAS"],
    ["Namibia Medical Care", "NMC"],
    ["Namibia Health Plan", "NHP"],
    ["Nammed Medical Aid Fund", "NAMMED"],
    ["Renaissance Health Medical Aid Fund", "RMA"],
    ["Heritage Health Medical Aid Fund", "HHMAF"],
    ["Napotel Medical Aid Fund", "NAPOTEL"],
  ];
  for (const [name, abbreviation] of funds) {
    await db.medicalAid.upsert({
      where: { normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, "") },
      update: {},
      create: {
        name,
        normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        abbreviation,
        sortOrder: funds.findIndex((f) => f[0] === name),
      },
    });
  }

  for (const rule of [
    { weekday: 1, openTime: "08:00", closeTime: "17:00" },
    { weekday: 2, openTime: "08:00", closeTime: "17:00" },
    { weekday: 3, openTime: "08:00", closeTime: "17:00" },
    { weekday: 4, openTime: "08:00", closeTime: "17:00" },
    { weekday: 5, openTime: "08:00", closeTime: "16:00" },
  ]) {
    await db.availabilityRule.upsert({
      where: {
        practiceId_weekday: {
          practiceId: "mondesa-health",
          weekday: rule.weekday,
        },
      },
      update: {},
      create: {
        ...rule,
        practiceId: "mondesa-health",
        lunchStart: "13:00",
        lunchEnd: "14:00",
        durationMinutes: 30,
      },
    });
  }
}

main().finally(() => db.$disconnect());
