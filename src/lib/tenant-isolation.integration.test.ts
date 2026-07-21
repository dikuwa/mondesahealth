import { describe, expect, it } from "vitest";
import { db } from "./db";

const run = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!run)("database tenant isolation", () => {
  it("permits tenant-local identifiers and excludes another practice's records", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await expect(
      db.$transaction(async (tx) => {
        const [practiceA, practiceB] = await Promise.all([
          tx.practice.create({
            data: { slug: `tenant-a-${suffix}`, name: "Tenant A" },
          }),
          tx.practice.create({
            data: { slug: `tenant-b-${suffix}`, name: "Tenant B" },
          }),
        ]);
        const [userA, userB] = await Promise.all([
          tx.user.create({
            data: {
              name: "Clinician A",
              email: `clinician-a-${suffix}@example.test`,
              passwordHash: "integration-test-only",
              role: "DOCTOR",
              practiceId: practiceA.id,
            },
          }),
          tx.user.create({
            data: {
              name: "Clinician B",
              email: `clinician-b-${suffix}@example.test`,
              passwordHash: "integration-test-only",
              role: "DOCTOR",
              practiceId: practiceB.id,
            },
          }),
        ]);
        const [patientA, patientB] = await Promise.all([
          tx.patient.create({
            data: {
              practiceId: practiceA.id,
              patientNumber: "PAT-SHARED-001",
              fullName: "Patient A",
              surname: "A",
              initials: "PA",
              phone: "+264811111111",
            },
          }),
          tx.patient.create({
            data: {
              practiceId: practiceB.id,
              patientNumber: "PAT-SHARED-001",
              fullName: "Patient B",
              surname: "B",
              initials: "PB",
              phone: "+264822222222",
            },
          }),
        ]);
        const sharedStart = new Date("2030-01-15T08:00:00Z");
        const [appointmentA, appointmentB] = await Promise.all([
          tx.appointment.create({
            data: {
              practiceId: practiceA.id,
              patientId: patientA.id,
              reference: `APT-A-${suffix}`,
              startAt: sharedStart,
              endAt: new Date("2030-01-15T08:30:00Z"),
              reason: "Tenant test A",
            },
          }),
          tx.appointment.create({
            data: {
              practiceId: practiceB.id,
              patientId: patientB.id,
              reference: `APT-B-${suffix}`,
              startAt: sharedStart,
              endAt: new Date("2030-01-15T08:30:00Z"),
              reason: "Tenant test B",
            },
          }),
        ]);
        const encounterB = await tx.clinicalEncounter.create({
          data: {
            practiceId: practiceB.id,
            patientId: patientB.id,
            appointmentId: appointmentB.id,
            clinicianId: userB.id,
            createdById: userB.id,
            updatedById: userB.id,
          },
        });
        await tx.clinicalEncounter.create({
          data: {
            practiceId: practiceA.id,
            patientId: patientA.id,
            appointmentId: appointmentA.id,
            clinicianId: userA.id,
            createdById: userA.id,
            updatedById: userA.id,
          },
        });

        expect(
          await tx.patient.findFirst({
            where: { id: patientB.id, practiceId: practiceA.id },
          }),
        ).toBeNull();
        expect(
          await tx.appointment.findMany({
            where: { practiceId: practiceA.id },
          }),
        ).toHaveLength(1);
        expect(
          await tx.clinicalEncounter.findFirst({
            where: { id: encounterB.id, practiceId: practiceA.id },
          }),
        ).toBeNull();

        throw new Error("ROLLBACK_TENANT_INTEGRATION_TEST");
      }, { timeout: 25_000, maxWait: 10_000 }),
    ).rejects.toThrow("ROLLBACK_TENANT_INTEGRATION_TEST");
  }, 30_000);
});
