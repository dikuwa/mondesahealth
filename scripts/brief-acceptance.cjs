/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { PrismaClient } = require("@prisma/client");

const required = (key) => { if (!process.env[key]) throw new Error(`${key} is required.`); return process.env[key]; };
const base = process.env.E2E_BASE_URL || "http://localhost:3001";
const db = new PrismaClient();
const expectedServices = {
  "general-practice": 11,
  "dental-practice": 7,
  "laboratory-services": 8,
  "eye-clinic": 4,
  pharmacy: 5,
  radiology: 4,
  "php-health-plan": 5,
};

(async () => {
  let browser;
  let providerId = null;
  let originalContent = null;
  const report = { database: {}, publicSite: {}, mutations: {}, runtimeErrors: [] };
  const beforeCounts = await Promise.all([db.patient.count(), db.appointment.count(), db.invoice.count(), db.claim.count(), db.provider.count()]);
  try {
    const [setting, content, departments] = await Promise.all([
      db.practiceSetting.findUnique({ where: { id: "practice" } }),
      db.practiceContent.findUnique({ where: { id: "practice" } }),
      db.department.findMany({ include: { services: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    originalContent = content?.content || null;
    report.database.facility = Boolean(
      setting &&
      setting.practiceName === "Mondesa Health Polyclinic" &&
      setting.phone === "+264 83 783 7216" &&
      setting.address === "Erf 1083, Vrede Rede Street, Mahetago, Mondesa, Swakopmund" &&
      setting.locationNote === "Across from Mondesa Police Station" &&
      setting.mapsUrl === "https://www.google.com/maps?q=-22.658405303955078,14.546859741210938&z=17&hl=en" &&
      Math.abs(setting.mapLatitude - -22.658405303955078) < 1e-10 &&
      Math.abs(setting.mapLongitude - 14.546859741210938) < 1e-10
    );
    report.database.persistedContent = Boolean(content);
    report.database.departments = departments.length === 7;
    report.database.services = departments.every((department) => department.services.length === expectedServices[department.slug]);
    report.database.totalServices = departments.reduce((total, department) => total + department.services.length, 0);
    report.database.noDuplicateSlugs = new Set(departments.map((department) => department.slug)).size === departments.length;
    report.database.noDuplicateServices = departments.every((department) => new Set(department.services.map((service) => service.name)).size === department.services.length);

    browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", (error) => report.runtimeErrors.push(`page: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") report.runtimeErrors.push(`console: ${message.text()}`); });
    page.on("response", (response) => { if (response.status() >= 500) report.runtimeErrors.push(`http ${response.status()}: ${response.url()}`); });

    await page.goto(base, { waitUntil: "networkidle" });
    report.publicSite.tagline = await page.getByRole("heading", { name: "Your Health. Your Choice. Your Community." }).isVisible();
    report.publicSite.phone = await page.getByRole("link", { name: /Call \+264 83 783 7216/ }).isVisible();
    report.publicSite.address = (await page.locator("address").innerText()).includes("Erf 1083, Vrede Rede Street, Mahetago, Mondesa, Swakopmund");
    report.publicSite.mapLink = (await page.getByRole("link", { name: /Get directions/ }).getAttribute("href")) === setting.mapsUrl;
    report.publicSite.mapEmbed = (await page.locator('iframe[title="Mondesa Health Polyclinic location"]').getAttribute("src"))?.includes("-22.65840530395508,14.54685974121094");
    for (const department of departments) {
      const response = await page.goto(`${base}/services/${department.slug}`, { waitUntil: "domcontentloaded" });
      report.publicSite[department.slug] = response?.status() === 200 && await page.getByRole("heading", { name: department.name }).isVisible();
    }

    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(required("E2E_OWNER_EMAIL"));
    await page.locator('input[name="password"]').fill(required("E2E_OWNER_PASSWORD"));
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    const markedContent = structuredClone(originalContent);
    markedContent.hero.eyebrow = `${markedContent.hero.eyebrow} · acceptance check`;
    const contentSave = await page.request.patch(`${base}/api/content`, { data: markedContent });
    const persistedMarkedContent = await db.practiceContent.findUnique({ where: { id: "practice" } });
    report.mutations.contentSave = contentSave.status() === 200 && persistedMarkedContent.content.hero.eyebrow === markedContent.hero.eyebrow;
    const contentRestore = await page.request.patch(`${base}/api/content`, { data: originalContent });
    const restoredContent = await db.practiceContent.findUnique({ where: { id: "practice" } });
    report.mutations.contentRestore = contentRestore.status() === 200 && restoredContent.content.hero.eyebrow === originalContent.hero.eyebrow;

    const gp = departments.find((department) => department.slug === "general-practice");
    const providerName = `Acceptance Test Provider ${Date.now()}`;
    const providerCreate = await page.request.patch(`${base}/api/directory`, { data: {
      entity: "PROVIDER", departmentId: gp.id, displayName: providerName,
      practiceName: "Acceptance Test Practice", biography: "Temporary profile used to verify reversible dashboard directory persistence.",
      phone: null, email: null, operatingHours: null, public: false, sortOrder: 999, aiIntakeEnabled: null,
    } });
    const providerCreateBody = await providerCreate.json();
    providerId = providerCreateBody.id || null;
    report.mutations.providerCreate = providerCreate.status() === 200 && Boolean(providerId) && Boolean(await db.provider.findUnique({ where: { id: providerId } }));
    const providerUpdate = await page.request.patch(`${base}/api/directory`, { data: {
      entity: "PROVIDER", id: providerId, departmentId: gp.id, displayName: providerName,
      practiceName: "Acceptance Test Practice", biography: "Updated temporary profile; this record is deleted before the test finishes.",
      phone: null, email: null, operatingHours: null, public: false, sortOrder: 999, aiIntakeEnabled: null,
    } });
    const updatedProvider = await db.provider.findUnique({ where: { id: providerId } });
    report.mutations.providerUpdate = providerUpdate.status() === 200 && updatedProvider.biography.startsWith("Updated temporary profile");
    const providerDelete = await page.request.delete(`${base}/api/directory`, { data: { entity: "PROVIDER", id: providerId } });
    report.mutations.providerDelete = providerDelete.status() === 200 && !(await db.provider.findUnique({ where: { id: providerId } }));
    providerId = null;

    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await noJsPage.locator('input[name="email"]').fill(required("E2E_OWNER_EMAIL"));
    await noJsPage.locator('input[name="password"]').fill(required("E2E_OWNER_PASSWORD"));
    await noJsPage.getByRole("button", { name: "Sign in" }).click();
    await noJsPage.waitForURL("**/dashboard");
    report.mutations.nativeLoginPost = noJsPage.url().endsWith("/dashboard");
    await noJsContext.close();

    const afterCounts = await Promise.all([db.patient.count(), db.appointment.count(), db.invoice.count(), db.claim.count(), db.provider.count()]);
    report.database.operationalCountsPreserved = JSON.stringify(beforeCounts) === JSON.stringify(afterCounts);
    const failures = [];
    for (const [group, values] of Object.entries(report)) {
      if (group === "runtimeErrors") continue;
      for (const [key, value] of Object.entries(values)) if (value === false || value == null) failures.push(`${group}.${key}`);
    }
    if (report.database.totalServices !== 44) failures.push("database.totalServices");
    if (report.runtimeErrors.length) failures.push("runtimeErrors");
    report.failures = failures;
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    if (providerId) await db.provider.deleteMany({ where: { id: providerId } });
    if (originalContent) await db.practiceContent.update({ where: { id: "practice" }, data: { content: originalContent } });
    if (browser) await browser.close();
    await db.$disconnect();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
