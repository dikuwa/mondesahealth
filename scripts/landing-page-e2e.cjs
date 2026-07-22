/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");

const base = process.env.E2E_BASE_URL || "http://localhost:3103";
const email = process.env.E2E_OWNER_EMAIL;
const password = process.env.E2E_OWNER_PASSWORD;
const skipPublic = process.env.E2E_SKIP_PUBLIC === "1";
if (!email || !password) throw new Error("E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD are required.");

(async () => {
  fs.mkdirSync("e2e-artifacts/landing", { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultNavigationTimeout(180_000);
  const report = { public: {}, routes: {}, editor: {}, errors: [], failures: [] };
  page.on("pageerror", (error) => report.errors.push(`page: ${error.message}`));
  page.on("response", (response) => { if (response.status() >= 500) report.errors.push(`http ${response.status()}: ${response.url()}`); });

  if (!skipPublic) for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 900 });
    await page.goto(base, { waitUntil: "networkidle" });
    report.public[width] = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      h1Count: document.querySelectorAll("h1").length,
      sections: document.querySelectorAll("main section").length,
      dashboardPreview: Boolean(document.querySelector(".landing-dashboard-preview")),
      pricingVisible: Boolean(document.querySelector("#pricing")),
      fakeTestimonials: document.querySelectorAll(".landing-quote-card:not(.landing-fallback-card)").length,
    }));
    await page.screenshot({ path: `e2e-artifacts/landing/public-${width}.png`, fullPage: true });
  }

  if (!skipPublic) {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator(".landing-mobile-menu summary").click();
    report.public.mobileMenu = await page.locator(".landing-mobile-menu nav").isVisible();
  }

  if (!skipPublic) for (const route of ["/apply", "/services", "/login", "/policies"]) {
    const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    report.routes[route] = { status: response?.status(), finalUrl: page.url() };
  }

  if (process.env.E2E_PUBLIC_ONLY === "1") {
    for (const [width, result] of Object.entries(report.public)) {
      if (width === "mobileMenu") continue;
      if (result.overflow || result.h1Count !== 1 || !result.dashboardPreview || result.pricingVisible || result.fakeTestimonials) report.failures.push(`public-${width}`);
    }
    if (!report.public.mobileMenu) report.failures.push("mobile-menu");
    for (const [route, result] of Object.entries(report.routes)) if (!result.status || result.status >= 400) report.failures.push(route);
    if (report.errors.length) report.failures.push("runtime-errors");
    fs.writeFileSync("e2e-artifacts/landing/public-report.json", `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(report.failures.length ? 1 : 0);
  }

  if (process.env.E2E_SESSION_USER_ID) {
    const { SignJWT } = await import("jose");
    const token = await new SignJWT({ id: process.env.E2E_SESSION_USER_ID, version: Number(process.env.E2E_SESSION_VERSION), scope: "PLATFORM", practiceId: null })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setIssuer("mondesahealth").setAudience("mondesahealth-staff").setJti(crypto.randomUUID()).setExpirationTime("8h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me"));
    await page.context().addCookies([{ name: "mondesa_session", value: token, url: base, httpOnly: true, sameSite: "Lax" }]);
  } else {
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/platform(?:\/practices)?$/);
  }
  await page.goto(`${base}/platform/website`, { waitUntil: "networkidle" });
  await page.locator(".landing-editor").waitFor();
  report.editor.tabs = await page.getByRole("tab").allTextContents();
  report.editor.primaryOwnerOnly = page.url().includes("/platform/website");

  const announcement = page.getByLabel("Top announcement");
  await announcement.fill("Draft-only landing validation marker");
  report.editor.unsavedState = await page.getByText("Unsaved changes", { exact: true }).isVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Landing page draft updated").waitFor();

  await page.goto(base, { waitUntil: "networkidle" });
  report.editor.draftHiddenPublicly = !(await page.getByText("Draft-only landing validation marker", { exact: true }).isVisible().catch(() => false));
  await page.goto(`${base}/preview/landing`, { waitUntil: "networkidle" });
  report.editor.previewUsesDraft = await page.getByText("Draft-only landing validation marker", { exact: true }).isVisible();
  await page.screenshot({ path: "e2e-artifacts/landing/draft-preview-1440.png", fullPage: true });

  await page.goto(`${base}/platform/website`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Publish landing page" }).click();
  await page.getByText("Landing page published").waitFor();
  await page.goto(base, { waitUntil: "networkidle" });
  report.editor.publishUpdatesPublic = await page.getByText("Draft-only landing validation marker", { exact: true }).isVisible();

  await page.goto(`${base}/platform/website`, { waitUntil: "networkidle" });
  await page.getByLabel("Top announcement").fill("Restore validation marker");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Landing page draft updated").waitFor();
  await page.getByRole("button", { name: "Restore published" }).click();
  await page.getByRole("button", { name: "Restore published" }).last().click();
  await page.getByText("Landing page draft updated").waitFor();
  report.editor.restoreRevertsDraft = (await page.getByLabel("Top announcement").inputValue()) === "Draft-only landing validation marker";

  await page.getByRole("tab", { name: "Benefits" }).click();
  const firstBenefit = page.locator(".landing-repeat-item").first();
  const firstTitle = await firstBenefit.getByLabel("Title").inputValue();
  await firstBenefit.getByRole("button", { name: "Move item down" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Landing page draft updated").waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Benefits" }).click();
  report.editor.reorderPersists = (await page.locator(".landing-repeat-item").nth(1).getByLabel("Title").inputValue()) === firstTitle;

  await page.getByRole("tab", { name: "Hero" }).click();
  const upload = page.locator('input[type="file"]').first();
  await upload.setInputFiles("public/images/mondesa-doctor-hero.jpg");
  report.editor.imagePreview = await page.locator(".landing-editor-image img").first().isVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Landing page draft updated").waitFor();

  await page.getByLabel("Primary CTA destination").first().fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save draft" }).click();
  report.editor.validationError = await page.getByText(/internal path, HTTPS, email, or telephone/i).isVisible();

  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: "e2e-artifacts/landing/editor-375.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/platform/website`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "e2e-artifacts/landing/editor-1440.png", fullPage: true });

  if (!skipPublic) for (const [width, result] of Object.entries(report.public)) {
    if (width === "mobileMenu") continue;
    if (result.overflow || result.h1Count !== 1 || !result.dashboardPreview || result.pricingVisible || result.fakeTestimonials) report.failures.push(`public-${width}`);
  }
  if (!skipPublic && !report.public.mobileMenu) report.failures.push("mobile-menu");
  if (!skipPublic) for (const [route, result] of Object.entries(report.routes)) if (!result.status || result.status >= 400) report.failures.push(route);
  for (const [name, result] of Object.entries(report.editor)) if (name !== "tabs" && !result) report.failures.push(`editor-${name}`);
  if (report.editor.tabs.length < 11) report.failures.push("editor-tabs");
  if (report.errors.length) report.failures.push("runtime-errors");
  fs.writeFileSync("e2e-artifacts/landing/report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.failures.length ? 1 : 0);
})().catch((error) => {
  fs.mkdirSync("e2e-artifacts/landing", { recursive: true });
  fs.writeFileSync("e2e-artifacts/landing/error.txt", `${error?.stack || error}\n`);
  console.error(error);
  process.exit(1);
});
