import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { SickNoteDocument } from "./sick-note-document";
import { canBeSickNoteDoctor, canManageSickNotes, defaultCertificateWording, maskedPatientName, sickNoteInputSchema, verificationToken } from "./sick-notes";

const valid = { patientId: "patient", appointmentId: "", doctorUserId: "doctor", purpose: "WORK", consultationDate: "2026-07-20", consultationTime: "09:30", leaveFrom: "2026-07-20", leaveTo: "2026-07-22", returnDate: "2026-07-23", fitnessStatus: "UNFIT_FOR_WORK", restrictions: "", diagnosisDisclosure: "NOT_DISCLOSED", diagnosisPlainText: "", doctorNotes: "Clinically assessed during the consultation.", certificateWording: "The patient was assessed and is medically unfit for work.", aiDraftUsed: false } as const;

describe("sick note domain rules", () => {
  it("accepts a complete draft and rejects invalid leave, return, and disclosure combinations", () => {
    expect(sickNoteInputSchema.safeParse(valid).success).toBe(true);
    expect(sickNoteInputSchema.safeParse({ ...valid, leaveTo: "2026-07-19" }).success).toBe(false);
    expect(sickNoteInputSchema.safeParse({ ...valid, returnDate: "2026-07-22" }).success).toBe(false);
    expect(sickNoteInputSchema.safeParse({ ...valid, diagnosisPlainText: "Private diagnosis" }).success).toBe(false);
    expect(sickNoteInputSchema.safeParse({ ...valid, diagnosisDisclosure: "CONSENTED", diagnosisPlainText: "Patient-consented diagnosis" }).success).toBe(true);
  });

  it("limits issuing roles and creates privacy-safe identifiers", () => {
    expect(canBeSickNoteDoctor({ role: "DOCTOR", active: true })).toBe(true);
    expect(canBeSickNoteDoctor({ role: "RECEPTIONIST", active: true })).toBe(false);
    expect(canBeSickNoteDoctor({ role: "DOCTOR", active: false })).toBe(false);
    expect(canManageSickNotes({ role: "OWNER", permissions: [] })).toBe(true);
    expect(canManageSickNotes({ role: "DOCTOR", permissions: ["MANAGE_SICK_NOTES"] })).toBe(true);
    expect(maskedPatientName("Jane Doe")).toBe("J. D.");
    expect(verificationToken()).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  });

  it("creates deterministic manual wording without AI", () => {
    expect(defaultCertificateWording(valid)).toContain("medically unfit");
    expect(defaultCertificateWording(valid)).toContain("2026-07-23");
  });
});

describe("sick note safety contracts", () => {
  it("keeps public verification deliberately free of diagnosis and doctor notes", () => {
    const source = readFileSync(join(process.cwd(), "src/app/verify/sick-note/[verificationToken]/page.tsx"), "utf8");
    expect(source).not.toContain("note.doctorNotes");
    expect(source).not.toContain("note.diagnosisPlainText");
    expect(source).not.toContain("note.patient.phone");
    expect(source).toContain("maskedPatientName");
  });

  it("shares issued certificates through expiring Finance-style document links", () => {
    const shareRoute = readFileSync(join(process.cwd(), "src/app/api/sick-notes/[id]/share/route.ts"), "utf8");
    const publicDocumentRoute = readFileSync(join(process.cwd(), "src/app/d/[token]/route.tsx"), "utf8");
    expect(shareRoute).toContain("generatedDocument.create");
    expect(shareRoute).toContain('type: "SICK_NOTE_SHARE"');
    expect(shareRoute).toContain("addDays(new Date(), 14)");
    expect(shareRoute).not.toContain("doctorNotes");
    expect(shareRoute).not.toContain("diagnosisPlainText");
    expect(publicDocumentRoute).toContain("SickNoteDocument");
    expect(publicDocumentRoute).toContain('document.sickNote.status !== "ISSUED"');
  });

  it("removes sick notes before patients during operational reset", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/practice/reset/route.ts"), "utf8");
    expect(source.indexOf("tx.sickNote.deleteMany")).toBeLessThan(source.indexOf("tx.patient.deleteMany"));
    expect(source).not.toContain("tx.provider.deleteMany");
  });

  it("renders a branded, signed PDF with a QR image", async () => {
    const source = readFileSync(join(process.cwd(), "src/lib/sick-note-document.tsx"), "utf8");
    expect(source).toContain(">Sick note</Text>");
    expect(source).toContain("verificationHost(verificationUrl)");
    expect(source).not.toContain('Scan to verify this certificate{"\\n"}{verificationUrl}');
    const url = "https://mondesahealth.vercel.app/verify/sick-note/secure-token";
    const qrDataUrl = await QRCode.toDataURL(url);
    const now = new Date("2026-07-20T12:00:00Z");
    const buffer = await renderToBuffer(<SickNoteDocument note={{ id: "note", certificateNumber: "MH-SN-2026-000014", verificationToken: "secure-token", patientId: "patient", appointmentId: null, doctorUserId: "doctor", purpose: "WORK", consultationDate: now, consultationTime: "09:30", leaveFrom: now, leaveTo: new Date("2026-07-22T12:00:00Z"), returnDate: new Date("2026-07-23T12:00:00Z"), fitnessStatus: "UNFIT_FOR_WORK", restrictions: null, diagnosisDisclosure: "NOT_DISCLOSED", diagnosisPlainText: null, doctorNotes: "Internal only", certificateWording: "The patient was assessed and is medically unfit for work.", aiDraftUsed: false, status: "ISSUED", issuedAt: now, revokedAt: null, revokedReason: null, createdById: "doctor", updatedById: "doctor", createdAt: now, updatedAt: now, patient: { fullName: "Jane Doe", patientNumber: "MH-001", identityNumber: null }, doctor: { name: "Dr Test" } }} practice={{ id: "practice", practiceName: "Mondesa Health Polyclinic", doctorName: "Dr Test", practiceNumber: "123", registrationNumber: "456", phone: "+264 00", whatsapp: "+264 00", email: "care@example.com", address: "Mondesa", bookingMode: "AVAILABLE_TIME", minNoticeHours: 2, maxAdvanceDays: 60, cancellationPolicy: "", currency: "NAD", signatureName: "Dr Test", signatureTitle: "Medical Practitioner", vatEnabled: false, tagline: "", publicDescription: "", locationNote: "", mapsUrl: "", mapLatitude: null, mapLongitude: null, publicHours: null, showEmail: true, showWhatsapp: true, claimContactName: "", claimPhone: "", claimEmail: "", claimPostalAddress: "", consentWording: "", reminderEnabled: true, reminderLeadHours: 24, aiIntakeEnabled: true, aiImageEnabled: true }} qrDataUrl={qrDataUrl} verificationUrl={url} />);
    expect(buffer.byteLength).toBeGreaterThan(10_000);
  });
});
