/* eslint-disable @typescript-eslint/no-require-imports */
const {
  chromium,
} = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");
const required = (key) => { if (!process.env[key]) throw new Error(`${key} is required.`); return process.env[key]; };

const base = process.env.E2E_BASE_URL || "http://localhost:3001";
const routes = process.env.E2E_ROUTE
  ? [process.env.E2E_ROUTE]
  : [
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
const widths = process.env.E2E_WIDTH
  ? [Number(process.env.E2E_WIDTH)]
  : [375, 768, 1024, 1440];

(async () => {
  fs.mkdirSync("e2e-artifacts/dashboard", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const report = { routes: {}, interactions: {} };

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page
    .locator('input[name="email"]')
    .fill(required("E2E_OWNER_EMAIL"));
  await page
    .locator('input[name="password"]')
    .fill(required("E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");

  for (const route of routes) {
    report.routes[route] = {};
    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.locator(".dashboard-shell").waitFor();
      report.routes[route][width] = await page.evaluate(() => ({
        noPageOverflow:
          document.documentElement.scrollWidth <= window.innerWidth,
        publicHeaderCount: document.querySelectorAll("body > header").length,
        publicFooterCount: document.querySelectorAll("body > footer").length,
        dashboardVisible: Boolean(document.querySelector(".dashboard-shell")),
        mainVisible: Boolean(document.querySelector("#dashboard-content")),
        overflowElements: [...document.querySelectorAll("body *")]
          .filter(
            (element) =>
              element.getBoundingClientRect().right > window.innerWidth + 1,
          )
          .slice(0, 5)
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            text: (element.textContent || "").trim().slice(0, 80),
            right: Math.round(element.getBoundingClientRect().right),
          })),
        activityGrid: (() => {
          const element = document.querySelector(".activity-row");
          return element
            ? {
                columns: getComputedStyle(element).gridTemplateColumns,
                width: Math.round(element.getBoundingClientRect().width),
                left: Math.round(element.getBoundingClientRect().left),
              }
            : null;
        })(),
      }));
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${base}/dashboard/appointments`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Open dashboard navigation" }).click();
  await page.waitForTimeout(250);
  report.interactions.mobileDrawer = await page
    .locator(".dashboard-sidebar")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= window.innerWidth;
    });
  report.interactions.mobileNavLinks = await page
    .locator(".dashboard-nav-link")
    .count();
  await page.locator(".dashboard-mobile-close").click();
  await page.getByRole("button", { name: "Add appointment" }).click();
  report.interactions.appointmentSheet = await page
    .locator(".appointment-panel")
    .isVisible();
  report.interactions.appointmentSheetFits = await page
    .locator(".appointment-panel")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return (
        box.left >= 0 &&
        box.right <= window.innerWidth &&
        box.bottom <= window.innerHeight + 1
      );
    });
  report.interactions.patientSelect = await page
    .getByLabel("Patient")
    .isVisible();
  report.interactions.dateInput = await page
    .getByRole("textbox", { name: "Appointment date" })
    .isVisible();
  await page.getByLabel("Patient").click();
  await page.getByRole("option").nth(1).click();
  const future = new Date();
  future.setDate(future.getDate() + 1);
  while ([0, 6].includes(future.getDay())) future.setDate(future.getDate() + 1);
  await page.getByRole("textbox", { name: "Appointment date" }).click();
  const dateLabel = future.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  await page.getByRole("button", { name: dateLabel, exact: true }).click();
  await page.getByLabel("Available time").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      !document
        .querySelector('[aria-label="Available time"]')
        ?.hasAttribute("disabled"),
  );
  report.interactions.availableSlots = await page
    .getByLabel("Available time")
    .isEnabled();
  report.interactions.dashboardNativeSelects =
    (await page.locator("select").count()) === 0;
  await page.getByLabel("Reason for visit").fill("Mobile workflow check");
  await page.screenshot({
    path: "e2e-artifacts/dashboard/appointments-mobile.png",
    fullPage: true,
  });
  await page.locator(".appointment-panel-heading button").click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  const before = await page
    .locator(".dashboard-sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.waitForTimeout(250);
  const after = await page
    .locator(".dashboard-sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  report.interactions.desktopCollapse = after < before;
  report.interactions.openSiteLink = await page
    .getByRole("link", { name: "Open site" })
    .isVisible();
  report.interactions.openSiteNewTab =
    (await page
      .getByRole("link", { name: "Open site" })
      .getAttribute("target")) === "_blank";
  await page.screenshot({
    path: "e2e-artifacts/dashboard/overview-desktop.png",
    fullPage: true,
  });

  await page.goto(`${base}/dashboard/patients`, { waitUntil: "networkidle" });
  const patientInsets = await page.evaluate(() => {
    const card = document.querySelector(".dashboard-card"),
      first = document.querySelector(".patient-table tbody td:first-child b"),
      last = document.querySelector(
        ".patient-table tbody td:last-child .table-actions",
      );
    if (!card || !first || !last) return null;
    const cardBox = card.getBoundingClientRect(),
      firstBox = first.getBoundingClientRect(),
      lastBox = last.getBoundingClientRect();
    return {
      left: Math.round(firstBox.left - cardBox.left),
      right: Math.round(cardBox.right - lastBox.right),
    };
  });
  report.interactions.patientCardBalanced = Boolean(
    patientInsets && Math.abs(patientInsets.left - patientInsets.right) <= 8,
  );
  report.interactions.patientCardInsets = patientInsets;
  await page.getByLabel("Search patients").fill("Demo Patient");
  await page.getByRole("button", { name: "Edit Demo Patient" }).click();
  const birthInput = page.getByRole("textbox", { name: "Date of birth" });
  const currentBirth = await birthInput.inputValue();
  await birthInput.fill(currentBirth);
  report.interactions.typedDateEntry = /^\d{2}\/\d{2}\/\d{4}$/.test(
    await birthInput.inputValue(),
  );
  await page.getByLabel("Medical aid").click();
  await page.getByRole("option", { name: "Private / none" }).click();
  await page.getByRole("button", { name: "Save patient" }).click();
  await page.getByText("Patient updated").waitFor({ state: "visible" });
  report.interactions.privatePatientSave = true;
  await page.getByRole("button", { name: "Archive Demo Patient" }).click();
  report.interactions.brandedConfirmation = await page
    .locator(".confirmation-card")
    .isVisible();
  await page.locator(".confirmation-actions .btn-light").click();

  await page.goto(`${base}/dashboard/settings`, { waitUntil: "networkidle" });
  const settingsMetrics = await page.evaluate(() => {
    const forms = [...document.querySelectorAll(".settings-form")];
    const practiceFields = forms[0]?.querySelector(".settings-fields");
    const practiceActions = forms[0]?.querySelector(".settings-form-actions");
    const vatRow = forms[1]?.querySelector(".settings-checkbox-row");
    const documentActions = forms[1]?.querySelector(".settings-form-actions");
    const checkbox = document.querySelector(
      '.settings-funds-table input[type="checkbox"]',
    );
    if (
      !practiceFields ||
      !practiceActions ||
      !vatRow ||
      !documentActions ||
      !checkbox
    )
      return null;
    const style = getComputedStyle(checkbox);
    return {
      practiceButtonGap: Math.round(
        practiceActions.getBoundingClientRect().top -
          practiceFields.getBoundingClientRect().bottom,
      ),
      documentButtonGap: Math.round(
        documentActions.getBoundingClientRect().top -
          vatRow.getBoundingClientRect().bottom,
      ),
      checkboxAppearance: style.appearance,
      checkboxWidth: Math.round(checkbox.getBoundingClientRect().width),
      checkboxRadius: style.borderRadius,
    };
  });
  report.interactions.settingsControlSpacing = Boolean(
    settingsMetrics &&
      settingsMetrics.practiceButtonGap >= 20 &&
      settingsMetrics.documentButtonGap >= 20,
  );
  report.interactions.settingsBrandedCheckbox = Boolean(
    settingsMetrics &&
      settingsMetrics.checkboxAppearance === "none" &&
      settingsMetrics.checkboxWidth === 20 &&
      settingsMetrics.checkboxRadius === "6px",
  );
  report.interactions.settingsMetrics = settingsMetrics;
  await page.screenshot({
    path: "e2e-artifacts/dashboard/settings-controls-desktop.png",
    fullPage: true,
  });

  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  report.interactions.bookingNativeSelects =
    (await page.locator("select").count()) === 0;
  report.interactions.bookingBrandedCheckbox = await page
    .locator('input[type="checkbox"]')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        style.appearance === "none" &&
        Math.round(element.getBoundingClientRect().width) === 20 &&
        style.borderRadius === "6px"
      );
    });
  await page.getByLabel("Gender (optional)").click();
  report.interactions.bookingCustomOptions =
    (await page.getByRole("option").count()) >= 5;

  const failures = [];
  for (const [route, viewports] of Object.entries(report.routes))
    for (const [width, result] of Object.entries(viewports)) {
      if (
        !result.noPageOverflow ||
        result.publicHeaderCount ||
        result.publicFooterCount ||
        !result.dashboardVisible ||
        !result.mainVisible
      )
        failures.push(`${route}@${width}`);
    }
  for (const [key, value] of Object.entries(report.interactions))
    if (
      (typeof value === "boolean" && !value) ||
      (key === "mobileNavLinks" && value < 8)
    )
      failures.push(key);
  report.failures = failures;
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
