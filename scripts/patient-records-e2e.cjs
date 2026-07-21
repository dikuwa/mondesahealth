/* eslint-disable @typescript-eslint/no-require-imports */
const {
  chromium,
} = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { PrismaClient } = require("@prisma/client");

const required = (key) => {
  if (!process.env[key]) throw new Error(`${key} is required.`);
  return process.env[key];
};
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3010";
const db = new PrismaClient();

(async () => {
  let browser;
  let encounterId;
  try {
    const owner = await db.user.findFirst({
      where: { role: "OWNER", active: true },
    });
    if (!owner) throw new Error("An active owner fixture is required.");
    let patient = await db.patient.findFirst({
      where: { practiceId: owner.practiceId, archivedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!patient) {
      patient = await db.patient.create({
        data: {
          practiceId: owner.practiceId,
          patientNumber: `E2E-PAT-${Date.now()}`,
          fullName: "Patient Records E2E",
          surname: "E2E",
          initials: "PRE",
          phone: "+264811234567",
          createdById: owner.id,
        },
      });
    }
    const encounter = await db.clinicalEncounter.create({
      data: {
        practiceId: owner.practiceId,
        patientId: patient.id,
        clinicianId: owner.id,
        createdById: owner.id,
        updatedById: owner.id,
        presentingComplaint: "Responsive clinical record test",
        status: "DRAFT",
      },
    });
    encounterId = encounter.id;

    browser = await chromium.launch({
      headless: true,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultNavigationTimeout(60_000);
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 500)
        runtimeErrors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill(required("E2E_OWNER_EMAIL"));
    await page
      .locator('input[name="password"]')
      .fill(required("E2E_OWNER_PASSWORD"));
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    const report = {
      patient: {},
      encounter: {},
      interactions: {},
      runtimeErrors,
    };
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 800 ? 900 : 1000 });
      await page.goto(`${base}/dashboard/patients/${patient.id}`, {
        waitUntil: "domcontentloaded",
      });
      report.patient[width] =
        (await page
          .getByRole("heading", { name: patient.fullName })
          .isVisible()) &&
        (await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ));
      await page.goto(`${base}/dashboard/encounters/${encounter.id}`, {
        waitUntil: "domcontentloaded",
      });
      report.encounter[width] =
        (await page
          .getByText("Clinical attachments", { exact: true })
          .isVisible()) &&
        (await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ));
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${base}/dashboard/patients/${patient.id}`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("button", { name: /Add medical summary item/i })
      .click();
    const modal = page.locator(".appointment-panel");
    report.interactions.summaryModalFits = await modal.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return (
        box.left >= 0 &&
        box.right <= innerWidth &&
        box.top >= 0 &&
        box.bottom <= innerHeight
      );
    });
    report.interactions.customSelect =
      (await page.locator("select").count()) === 0;
    report.interactions.mergeAvailable = await page
      .getByRole("button", { name: "Merge duplicate" })
      .isVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto(`${base}/dashboard/encounters/${encounter.id}`, {
      waitUntil: "domcontentloaded",
    });
    report.interactions.attachmentUpload = await page
      .getByText("Choose PDF or image")
      .isVisible();
    const failures = [
      ...Object.entries(report.patient)
        .filter(([, value]) => !value)
        .map(([key]) => `patient.${key}`),
      ...Object.entries(report.encounter)
        .filter(([, value]) => !value)
        .map(([key]) => `encounter.${key}`),
      ...Object.entries(report.interactions)
        .filter(([, value]) => !value)
        .map(([key]) => `interactions.${key}`),
      ...(runtimeErrors.length ? ["runtimeErrors"] : []),
    ];
    report.failures = failures;
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    if (encounterId)
      await db.clinicalEncounter.deleteMany({ where: { id: encounterId } });
    if (browser) await browser.close();
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
