/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const crypto = require("node:crypto");
const fs = require("node:fs");
const required = (key) => { if (!process.env[key]) throw new Error(`${key} is required.`); return process.env[key]; };
const base = process.env.E2E_BASE_URL || "http://localhost:3001";
const routes = process.env.E2E_ROUTES ? process.env.E2E_ROUTES.split(",") : ["/platform/practices", "/platform/subscriptions", "/platform/applications", "/platform/categories", "/platform/billing", "/platform/analytics", "/platform/audit", "/platform/support", "/platform/users", "/platform/profile"];
const widths = process.env.E2E_WIDTHS ? process.env.E2E_WIDTHS.split(",").map(Number) : [375, 768, 1440, 2560];

(async () => {
  fs.mkdirSync("e2e-artifacts/platform", { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultNavigationTimeout(60_000);
  const report = { routes: {}, interactions: {}, runtimeErrors: [] };
  page.on("pageerror", (error) => report.runtimeErrors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const content = message.text();
    // Playwright temporarily applies this while filling an input; the style can be
    // observed by React during a client navigation even though application markup matches.
    if (content.includes("hydrated") && content.includes('caret-color:"transparent"')) return;
    // The direct-URL denial check and in-flight notification polling intentionally
    // exercise a 401 while the signed session changes scope.
    if (content.includes("Failed to load resource") && content.includes("401")) return;
    report.runtimeErrors.push(`console: ${content}`);
  });
  page.on("response", (response) => { if (response.status() >= 500) report.runtimeErrors.push(`http ${response.status()}: ${response.url()}`); });

  if (process.env.E2E_SESSION_USER_ID) {
    const { SignJWT } = await import("jose");
    const token = await new SignJWT({ id: process.env.E2E_SESSION_USER_ID, version: Number(process.env.E2E_SESSION_VERSION), scope: "PLATFORM", practiceId: null })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setIssuer("mondesahealth").setAudience("mondesahealth-staff").setJti(crypto.randomUUID()).setExpirationTime("8h")
      .sign(new TextEncoder().encode(required("AUTH_SECRET")));
    await page.context().addCookies([{ name: "mondesa_session", value: token, url: base, httpOnly: true, sameSite: "Lax" }]);
  } else {
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(required("E2E_OWNER_EMAIL"));
    await page.locator('input[name="password"]').fill(required("E2E_OWNER_PASSWORD"));
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/platform/practices");
  }

  for (const route of routes) {
    report.routes[route] = {};
    console.log(`Loading ${route}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    await page.locator(".dashboard-shell").waitFor({ timeout: 60_000 });
    for (const width of widths) {
      console.log(`Checking ${route} at ${width}px`);
      await page.setViewportSize({ width, height: width <= 768 ? 900 : 1000 });
      report.routes[route][width] = await page.evaluate(() => ({
        status: document.title,
        noPageOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        platformShell: Boolean(document.querySelector("#platform-content")),
        heading: document.querySelector(".dashboard-page-title")?.textContent?.trim() || "",
        smallTargets: [...document.querySelectorAll("button,a,input,textarea")].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 40 || box.height < 40); }).length,
      }));
      if (process.env.E2E_CAPTURE === "1" && width === 1440) {
        await page.screenshot({ path: `e2e-artifacts/platform/${route.split("/").pop()}-1440.png`, fullPage: true });
        const ownershipTransfer = page.locator(".ownership-transfer-card");
        if (await ownershipTransfer.count()) {
          await ownershipTransfer.scrollIntoViewIfNeeded();
          await ownershipTransfer.screenshot({ path: "e2e-artifacts/platform/ownership-transfer-1440.png" });
        }
      }
    }
  }

  if (process.env.E2E_ROUTES_ONLY === "1") {
    report.failures = [];
    for (const [route, sizes] of Object.entries(report.routes))
      for (const [width, result] of Object.entries(sizes))
        if (!result.noPageOverflow || !result.platformShell || !result.heading) report.failures.push(`${route}@${width}`);
    if (report.runtimeErrors.length) report.failures.push("runtime errors");
    fs.writeFileSync("e2e-artifacts/platform/routes-report.json", `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(report.failures.length ? 1 : 0);
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(`${base}/platform/practices`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Register practice/i }).click();
  report.interactions.practiceDialogMobile = await page.locator(".appointment-panel").evaluate((element) => { const box = element.getBoundingClientRect(); const grid = element.querySelector(".form-grid"); return { fits: box.left >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1, columns: grid ? getComputedStyle(grid).gridTemplateColumns : "", gap: grid ? getComputedStyle(grid).gap : "", labelGap: getComputedStyle(element.querySelector(".form-grid label")).gap }; });
  await page.getByRole("button", { name: "Close practice registration" }).click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/platform/subscriptions`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Create plan/i }).click();
  report.interactions.planDialog = await page.locator(".platform-dialog").evaluate((element) => ({ visible: Boolean(element), columns: getComputedStyle(element.querySelector(".form-grid")).gridTemplateColumns, labelled: Boolean(element.getAttribute("aria-labelledby") || element.closest('[role="dialog"]')?.getAttribute("aria-labelledby")) }));
  await page.keyboard.press("Escape");

  await page.goto(`${base}/platform/users`, { waitUntil: "networkidle" });
  report.interactions.primaryOwnerProtected = await page.locator("tbody tr").first().evaluate((row) => ({ role: row.children[1]?.textContent?.trim(), destructiveButtons: row.querySelectorAll(".is-danger,.danger-action").length }));

  await page.locator(".workspace-switcher-trigger").click();
  const practiceOption = page.getByRole("menuitem").filter({ hasText: "Practice workspace" }).first();
  report.interactions.practiceWorkspaceAvailable = await practiceOption.isVisible();
  await practiceOption.click();
  await page.waitForURL("**/dashboard");
  report.interactions.practiceScope = await page.evaluate(() => ({ dashboard: Boolean(document.querySelector("#dashboard-content")), platform: Boolean(document.querySelector("#platform-content")) }));
  const denied = await page.goto(`${base}/platform/users`, { waitUntil: "domcontentloaded" });
  report.interactions.practiceCannotUsePlatform = denied?.url().includes("/login") || denied?.status() === 404 || denied?.url().includes("/dashboard");
  await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.locator(".workspace-switcher-trigger").waitFor();
  await page.locator(".workspace-switcher-trigger").click();
  await page.getByRole("menuitem").filter({ hasText: "Platform Administration" }).click();
  await page.waitForURL("**/platform/practices");
  report.interactions.returnedToPlatform = true;

  await page.screenshot({ path: "e2e-artifacts/platform/platform-practices-1440.png", fullPage: true });
  report.failures = [];
  for (const [route, sizes] of Object.entries(report.routes)) for (const [width, result] of Object.entries(sizes)) if (!result.noPageOverflow || !result.platformShell || !result.heading) report.failures.push(`${route}@${width}`);
  if (report.runtimeErrors.length) report.failures.push("runtime errors");
  fs.writeFileSync("e2e-artifacts/platform/report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.failures.length ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
