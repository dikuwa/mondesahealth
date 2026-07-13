/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");

(async () => {
  fs.mkdirSync("e2e-artifacts", { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const report = {};
  await page.goto("http://localhost:3001", { waitUntil: "networkidle" });
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

  await page.goto("http://localhost:3001/book", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Please complete your name, phone and date of birth.").waitFor();
  report.hotToastVisible = await page.locator('.toast-content[data-type="error"] .toast-icon svg.lucide').isVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByLabel("Full legal name *").fill("E2E Patient Test");
  await page.getByLabel("Main cellphone *").fill("081 234 5678");
  await page.getByLabel("Date of birth *").fill("1990-06-15");
  await page.getByRole("button", { name: /Continue/ }).click();
  const future = new Date(); future.setDate(future.getDate() + 2); while ([0,6].includes(future.getDay())) future.setDate(future.getDate() + 1);
  const date = future.toISOString().slice(0,10);
  await page.getByLabel("Preferred date *").fill(date);
  const slotButtons = page.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ });
  await slotButtons.first().waitFor();
  const slot = await slotButtons.first().textContent();
  await slotButtons.first().click();
  await page.getByLabel("Reason for visit *").fill("General consultation");
  await page.getByRole("button", { name: /Continue/ }).click();
  report.nativeSelectStyled = await page.getByLabel("How will you pay for your consultation?").evaluate((element) => getComputedStyle(element).appearance === "none");
  report.selectLucideVisible = await page.locator(".select-wrap .select-chevron").first().isVisible();
  await page.getByLabel("How will you pay for your consultation?").selectOption("MEDICAL_AID");
  await page.getByLabel("Medical aid fund *").selectOption({ label: "Namibia Health Plan — NHP" });
  await page.getByLabel(/I consent to Mondesa/).check();
  await page.getByLabel(/I understand online booking/).check();
  await page.screenshot({ path: "e2e-artifacts/booking-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Submit booking" }).click();
  await page.getByText("Booking received").waitFor();
  report.bookingConfirmed = true;
  report.bookedSlot = slot;

  const apiResult = await page.request.post("http://localhost:3001/api/bookings", { data: { fullName:"Other Fund Test",phone:"+264 81 765 4321",sameWhatsapp:true,whatsapp:"",email:"",dateOfBirth:"1988-04-20",gender:"Female",communication:"WHATSAPP",reason:"Routine check-up",notes:"",paymentType:"MEDICAL_AID",medicalAidId:"OTHER",customFundName:"Community Wellness Fund",membershipNumber:"CWF12345",date,time:slot,period:"ANYTIME",consent:true,emergency:true } });
  report.duplicateSlotBlocked = apiResult.status() === 409;

  await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("http://localhost:3001/dashboard/appointments");
  report.dashboardShowsBooking = await page.getByText("E2E Patient Test").first().isVisible();
  await page.screenshot({ path: "e2e-artifacts/dashboard-appointments.png", fullPage: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3001");
  report.reducedMotionAnimation = await page.locator(".reveal").evaluate(el => getComputedStyle(el).animationName);
  console.log(JSON.stringify(report, null, 2));
  const failed = !report.heroVisible || !report.mobileMenuVisible || Object.values(report.responsiveWidths).some(value => !value) || !report.hotToastVisible || !report.nativeSelectStyled || !report.selectLucideVisible || !report.bookingConfirmed || !report.duplicateSlotBlocked || !report.dashboardShowsBooking;
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
  process.exit(failed ? 1 : 0);
})();
