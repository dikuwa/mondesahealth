/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");
const base = process.env.E2E_BASE_URL || "http://localhost:3001";
const displayDate = (date) =>
  [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");

(async () => {
  fs.mkdirSync("e2e-artifacts", { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const report = {};
  await page.goto(base, { waitUntil: "networkidle" });
  report.homeTitle = await page.title();
  report.heroVisible = await page.getByRole("heading", { name: /Good care begins/ }).isVisible();
  await page.screenshot({ path: "e2e-artifacts/home-desktop.png", fullPage: true });

  report.responsiveWidths = {};
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    report.responsiveWidths[width] = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("details.mobile-menu summary").click();
  report.mobileMenuVisible = await page.getByRole("link", { name: "Privacy & policies" }).isVisible();

  report.bookingResponsive = {};
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 1000 });
    await page.goto(`${base}/book`, { waitUntil: "networkidle" });
    report.bookingResponsive[width] = await page.evaluate(() => {
      const card = document.querySelector(".booking-form-card");
      const grid = document.querySelector(".booking-field-grid");
      if (!card || !grid) return false;
      const box = card.getBoundingClientRect();
      return (
        document.documentElement.scrollWidth <= window.innerWidth &&
        box.width >= Math.min(340, window.innerWidth - 28) &&
        box.left >= 0 &&
        box.right <= window.innerWidth &&
        (window.innerWidth > 800 || getComputedStyle(grid).gridTemplateColumns.split(" ").length === 1)
      );
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Enter the patient’s full legal name.").first().waitFor();
  report.hotToastVisible = await page.locator('.toast-content[data-type="error"] .toast-icon svg.lucide').isVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByLabel("Full legal name *").fill("E2E Patient Test");
  await page.getByLabel("Main cellphone *").fill("081 234 5678");
  await page.getByRole("textbox", { name: "Date of birth *", exact: true }).fill("15/06/1990");
  await page.getByRole("button", { name: /Continue/ }).click();
  const future = new Date(); future.setDate(future.getDate() + 21); while ([0,6].includes(future.getDay())) future.setDate(future.getDate() + 1);
  const date = future.toISOString().slice(0,10);
  await page.getByRole("textbox", { name: "Preferred date *", exact: true }).fill(displayDate(future));
  const requestMode = await page.getByLabel("Preferred part of day").isVisible().catch(() => false);
  report.bookingMode = requestMode ? "APPOINTMENT_REQUEST" : "AVAILABLE_TIME";
  let slot = null;
  if (!requestMode) {
    const slotButtons = page.locator(".booking-time-option");
    await slotButtons.first().waitFor();
    slot = (await slotButtons.first().textContent())?.trim() || null;
    await slotButtons.first().click();
  }
  await page.getByLabel("Reason for visit *").fill("General consultation");
  await page.getByRole("button", { name: /Continue/ }).click();
  report.nativeSelectStyled = await page.locator("select").count() === 0;
  report.selectLucideVisible = await page.locator(".custom-select-trigger svg.lucide-chevron-down").first().isVisible();
  await page.getByLabel("How will you pay for your consultation?").evaluate(element => element.click());
  await page.getByRole("option", { name:"Medical aid" }).evaluate(element => element.click());
  await page.getByLabel("Medical aid fund *").evaluate(element => element.click());
  await page.getByRole("option", { name:"Namibia Health Plan — NHP" }).evaluate(element => element.click());
  await page.getByLabel(/I consent to Mondesa/).check();
  await page.getByLabel(/I understand online booking/).check();
  await page.screenshot({ path: "e2e-artifacts/booking-mobile.png", fullPage: true });
  await page.getByRole("button", { name: requestMode ? "Send request" : "Book appointment" }).click();
  await page.locator("#main-content").getByText("Booking received").waitFor();
  report.bookingConfirmed = true;
  report.secureManageLink = await page.getByRole("link", { name: /Manage appointment/ }).isVisible();
  report.bookedSlot = slot;

  if (!requestMode) {
    const apiResult = await page.request.post(`${base}/api/bookings`, { data: { fullName:"Other Fund Test",phone:"+264 81 765 4321",sameWhatsapp:true,whatsapp:"",email:"",dateOfBirth:"1988-04-20",gender:"Female",communication:"WHATSAPP",reason:"Routine check-up",notes:"",paymentType:"MEDICAL_AID",medicalAidId:"OTHER",customFundName:"Community Wellness Fund",membershipNumber:"CWF12345",date,time:slot,period:"ANYTIME",consent:true,emergency:true } });
    report.duplicateSlotBlocked = apiResult.status() === 409;
  } else {
    report.duplicateSlotBlocked = "not applicable in request mode";
  }

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(process.env.E2E_OWNER_EMAIL || "owner@mondesahealth.na");
  await page.locator('input[name="password"]').fill(process.env.E2E_OWNER_PASSWORD || "Mondesa2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto(`${base}/dashboard/appointments`);
  report.dashboardShowsBooking = await page.getByText("E2E Patient Test").first().isVisible();
  await page.screenshot({ path: "e2e-artifacts/dashboard-appointments.png", fullPage: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base);
  report.reducedMotionAnimation = await page.locator(".reveal").evaluate(el => getComputedStyle(el).animationName);
  console.log(JSON.stringify(report, null, 2));
  const failed = !report.heroVisible || !report.mobileMenuVisible || Object.values(report.responsiveWidths).some(value => !value) || Object.values(report.bookingResponsive).some(value => !value) || !report.hotToastVisible || !report.nativeSelectStyled || !report.selectLucideVisible || !report.bookingConfirmed || !report.secureManageLink || (!requestMode && !report.duplicateSlotBlocked) || !report.dashboardShowsBooking;
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
  process.exit(failed ? 1 : 0);
})();
