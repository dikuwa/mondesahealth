/* eslint-disable @typescript-eslint/no-require-imports */
const {
  chromium,
} = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const base = process.env.E2E_BASE_URL || "http://localhost:3001";
const required = (key) => { if (!process.env[key]) throw new Error(`${key} is required.`); return process.env[key]; };
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  let original = "";
  const openEditor = async () => {
    await page.getByRole("button", { name: "Edit Demo Patient" }).click();
    return page.getByRole("textbox", { name: "Date of birth" });
  };
  const save = async () => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/patients") &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save patient" }).click();
    const response = await responsePromise;
    if (!response.ok())
      throw new Error(`Patient update failed with ${response.status()}`);
    await page.locator(".appointment-panel").waitFor({ state: "hidden" });
  };
  const openPatients = async () => {
    await page.goto(`${base}/dashboard/patients`, { waitUntil: "networkidle" });
    await page.getByLabel("Search patients").fill("Demo Patient");
  };
  try {
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page
      .locator('input[name="email"]')
      .fill(required("E2E_OWNER_EMAIL"));
    await page
      .locator('input[name="password"]')
      .fill(required("E2E_OWNER_PASSWORD"));
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");
    await openPatients();
    let input = await openEditor();
    original = await input.inputValue();
    const typed = "01/01/1985";
    await input.fill(typed);
    if ((await input.inputValue()) !== typed)
      throw new Error("Typed date was not reflected in the control");
    await save();
    input = await openEditor();
    const typedPersisted = await input.inputValue();
    if (typedPersisted !== typed)
      throw new Error(
        `Typed date did not persist: expected ${typed}, received ${typedPersisted}`,
      );
    await page
      .getByRole("button", { name: "Open Date of birth calendar" })
      .click();
    await page.getByLabel("Calendar month", { exact: true }).click();
    await page.getByRole("option", { name: "February", exact: true }).click();
    await page.getByLabel("Calendar year", { exact: true }).click();
    await page.getByRole("option", { name: "1986", exact: true }).click();
    await page
      .getByRole("button", { name: "Monday, 3 February 1986", exact: true })
      .click();
    const picked = "03/02/1986";
    if ((await input.inputValue()) !== picked)
      throw new Error("Calendar selection was not reflected in the control");
    await save();
    input = await openEditor();
    const calendarPersisted = await input.inputValue();
    if (calendarPersisted !== picked)
      throw new Error(
        `Calendar date did not persist: expected ${picked}, received ${calendarPersisted}`,
      );
    console.log(
      JSON.stringify(
        {
          typedEntry: true,
          typedPersisted,
          calendarSelection: true,
          calendarPersisted,
          originalRestored: original,
        },
        null,
        2,
      ),
    );
  } finally {
    if (original) {
      try {
        await openPatients();
        const input = await openEditor();
        if ((await input.inputValue()) !== original) {
          await input.fill(original);
          await save();
        }
      } catch (error) {
        console.error("Could not restore the E2E patient date", error);
      }
    }
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
