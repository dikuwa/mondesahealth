/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const db = new PrismaClient();
const base = process.env.E2E_BASE_URL || "http://localhost:3001";
const required = (key) => { if (!process.env[key]) throw new Error(`${key} is required`); return process.env[key]; };

(async () => {
  let browser; const created = []; const report = { checks: {}, runtimeErrors: [] };
  try {
    const [patient, doctor] = await Promise.all([
      db.patient.findFirst({ where: { archivedAt: null }, orderBy: { createdAt: "asc" } }),
      db.user.findFirst({ where: { active: true, role: "OWNER" }, orderBy: { createdAt: "asc" } }),
    ]);
    if (!patient || !doctor) throw new Error("An active patient and owner are required for the reversible acceptance test.");
    browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", (error) => report.runtimeErrors.push(`page: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") report.runtimeErrors.push(`console: ${message.text()}`); });
    page.on("response", (response) => { if (response.status() >= 500 && !response.url().includes("/api/sick-notes/ai")) report.runtimeErrors.push(`http ${response.status()}: ${response.url()}`); });

    const unauthorised = await page.request.post(`${base}/api/sick-notes`, { data: {} });
    report.checks.unauthorisedCreateBlocked = unauthorised.status() === 403;
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(required("E2E_OWNER_EMAIL"));
    await page.locator('input[name="password"]').fill(required("E2E_OWNER_PASSWORD"));
    await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL("**/dashboard");

    const today = new Date().toISOString().slice(0, 10); const leaveTo = new Date(Date.now() + 86400000).toISOString().slice(0, 10); const returnDate = new Date(Date.now() + 172800000).toISOString().slice(0, 10);
    const draft = { patientId: patient.id, appointmentId: "", doctorUserId: doctor.id, purpose: "WORK", consultationDate: today, consultationTime: "09:15", leaveFrom: today, leaveTo, returnDate, fitnessStatus: "UNFIT_FOR_WORK", restrictions: "", diagnosisDisclosure: "NOT_DISCLOSED", diagnosisPlainText: "", doctorNotes: "", certificateWording: "The patient was assessed and is medically unfit for work for the stated period.", aiDraftUsed: false };
    const create = await page.request.post(`${base}/api/sick-notes`, { data: draft }); const createdBody = await create.json(); created.push(createdBody.id);
    report.checks.draftCreated = create.status() === 201 && /^MH-SN-\d{4}-\d{6}$/.test(createdBody.certificateNumber);
    const missingNotes = await page.request.patch(`${base}/api/sick-notes/${createdBody.id}`, { data: { action: "ISSUE" } });
    report.checks.missingNotesBlocked = missingNotes.status() === 400;
    const clinicianNotes = "Patient clinically assessed in person; temporary absence is appropriate.";
    const update = await page.request.put(`${base}/api/sick-notes/${createdBody.id}`, { data: { ...draft, doctorNotes: clinicianNotes } });
    report.checks.draftUpdated = update.status() === 200;
    const ai = await page.request.post(`${base}/api/sick-notes/ai`, { data: { id: createdBody.id, doctorNotes: "Patient clinically assessed in person; temporary absence is appropriate.", purpose: "WORK", fitnessStatus: "UNFIT_FOR_WORK", leaveFrom: today, leaveTo, returnDate, restrictions: "" } });
    report.checks.aiManualFallbackSafe = [200, 503].includes(ai.status());
    if (ai.status() === 200) { const aiBody = await ai.json(); report.checks.aiWordingPlainText = typeof aiBody.wording === "string" && aiBody.wording.length >= 10 && !aiBody.wording.trim().startsWith("{"); }
    const issue = await page.request.patch(`${base}/api/sick-notes/${createdBody.id}`, { data: { action: "ISSUE" } });
    report.checks.issued = issue.status() === 200;
    const stored = await db.sickNote.findUnique({ where: { id: createdBody.id } });
    report.checks.secureToken = stored.status === "ISSUED" && typeof stored.verificationToken === "string" && stored.verificationToken.length >= 40;
    const immutable = await page.request.put(`${base}/api/sick-notes/${createdBody.id}`, { data: { ...draft, doctorNotes: "Attempted edit" } }); report.checks.issuedImmutable = immutable.status() === 409;
    const pdf = await page.request.get(`${base}/api/sick-notes/${createdBody.id}/pdf`); const pdfBody = await pdf.body(); report.checks.pdfGenerated = pdf.status() === 200 && pdf.headers()["content-type"]?.includes("application/pdf") && pdfBody.subarray(0, 4).toString() === "%PDF";
    const share = await page.request.post(`${base}/api/sick-notes/${createdBody.id}/share`); const shareBody = await share.json(); report.checks.safeSharing = share.status() === 200 && shareBody.message.includes(createdBody.certificateNumber) && !shareBody.message.includes("diagnos");
    const verificationUrl = `${base}/verify/sick-note/${stored.verificationToken}`; await page.goto(verificationUrl, { waitUntil: "networkidle" }); report.checks.publicVerified = await page.getByRole("heading", { name: "Certificate verified" }).isVisible(); const verifyText = await page.locator("main").innerText(); report.checks.publicPrivacy = !verifyText.includes(clinicianNotes) && !verifyText.includes(patient.phone);
    const duplicate = await page.request.patch(`${base}/api/sick-notes/${createdBody.id}`, { data: { action: "DUPLICATE" } }); const duplicateBody = await duplicate.json(); created.push(duplicateBody.id); report.checks.duplicateDraft = duplicate.status() === 200 && (await db.sickNote.findUnique({ where: { id: duplicateBody.id } })).status === "DRAFT";
    const revoke = await page.request.patch(`${base}/api/sick-notes/${createdBody.id}`, { data: { action: "REVOKE", reason: "Reversible acceptance test completed" } }); report.checks.revoked = revoke.status() === 200;
    const revokedPdf = await page.request.get(`${base}/api/sick-notes/${createdBody.id}/pdf`); report.checks.revokedDownloadBlocked = revokedPdf.status() === 409;
    await page.goto(verificationUrl, { waitUntil: "networkidle" }); report.checks.publicRevoked = await page.getByRole("heading", { name: "Certificate revoked" }).isVisible();
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}/dashboard/sick-notes/new?patient=${patient.id}`, { waitUntil: "networkidle" });
    report.checks.mobileNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    fs.mkdirSync("e2e-artifacts/sick-notes", { recursive: true }); await page.screenshot({ path: "e2e-artifacts/sick-notes/mobile-form.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(`${base}/dashboard/sick-notes`, { waitUntil: "networkidle" }); report.checks.listLoads = await page.getByRole("heading", { name: "Sick notes" }).isVisible();
    if (report.runtimeErrors.length || Object.values(report.checks).some((value) => value !== true)) throw new Error(JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (created.length) { await db.activityLog.deleteMany({ where: { OR: [{ entityId: { in: created } }, { entityType: "SickNoteVerification", entityId: { in: created } }] } }); await db.sickNote.deleteMany({ where: { id: { in: created } } }); }
    await browser?.close(); await db.$disconnect();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
