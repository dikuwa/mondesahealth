/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");

const base = process.env.E2E_BASE_URL || "http://localhost:3000";
const quick = process.env.E2E_QUICK === "1";
const publicRoutes = quick ? ["/"] : ["/", "/book", "/login", "/policies"];
const dashboardRoutes = quick ? [] : [
  "/dashboard",
  "/dashboard/appointments",
  "/dashboard/patients",
  "/dashboard/claims",
  "/dashboard/finance",
  "/dashboard/availability",
  "/dashboard/settings",
  "/dashboard/users",
  "/dashboard/profile",
  "/dashboard/activity",
];
const viewports = quick ? [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 720, height: 1000 },
] : [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];

async function measure(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflowing = [...document.querySelectorAll("body *")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position === "fixed" && style.transform !== "none") return false;
        const box = element.getBoundingClientRect();
        return box.left < -1 || box.right > viewportWidth + 1;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className : "",
        text: (element.textContent || "").trim().slice(0, 60),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    const smallTargets = [...document.querySelectorAll("a, button, summary, input, select, textarea")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        label: element.getAttribute("aria-label") || (element.textContent || "").trim().slice(0, 40),
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      }));
    return {
      innerWidth: window.innerWidth,
      pageOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
      overflowing,
      smallTargets,
      diagnostics: [...document.querySelectorAll(".about-grid, .hero-grid, .visit-grid, .contact-grid")].map((element) => ({
        className: element.className,
        columns: getComputedStyle(element).gridTemplateColumns,
        width: Math.round(element.getBoundingClientRect().width),
      })),
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage();
  const report = { public: {}, dashboard: {} };

  for (const route of publicRoutes) {
    report.public[route] = {};
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(80);
      report.public[route][viewport.width] = await measure(page);
      if (quick && route === "/") {
        fs.mkdirSync("e2e-artifacts/responsive", { recursive: true });
        await page.screenshot({
          path: `e2e-artifacts/responsive/home-${viewport.width}.png`,
          fullPage: true,
        });
      }
    }
  }

  if (!quick) {
    await page.setViewportSize(viewports[1]);
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill(process.env.E2E_OWNER_EMAIL || "owner@mondesahealth.na");
    await page.locator('input[name="password"]').fill(process.env.E2E_OWNER_PASSWORD || "Mondesa2026!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
  }

  for (const route of dashboardRoutes) {
    report.dashboard[route] = {};
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.locator(".dashboard-shell").waitFor({ timeout: 10_000 });
      report.dashboard[route][viewport.width] = await measure(page);
    }
  }

  const failures = [];
  for (const group of [report.public, report.dashboard]) {
    for (const [route, widths] of Object.entries(group)) {
      for (const [width, result] of Object.entries(widths)) {
        if (result.pageOverflow) failures.push(`${route}@${width}: page overflow`);
      }
    }
  }
  report.failures = failures;
  fs.mkdirSync("e2e-artifacts/responsive", { recursive: true });
  fs.writeFileSync("e2e-artifacts/responsive/report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
