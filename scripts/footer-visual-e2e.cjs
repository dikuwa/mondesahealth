/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/Users/stunna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");

const base = process.env.E2E_BASE_URL || "http://localhost:3103";
const label = process.env.E2E_CAPTURE_LABEL || "after";
const expectFixed = process.env.FOOTER_EXPECT_FIXED === "1";
const widths = [375, 430, 768, 1024, 1440];

(async () => {
  fs.mkdirSync("e2e-artifacts/footer-fix", { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const report = { base, label, widths: {}, failures: [] };

  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base, { waitUntil: "networkidle", timeout: 180_000 });
    const footer = page.locator(".landing-footer");
    await footer.scrollIntoViewIfNeeded();
    report.widths[width] = await page.evaluate(() => {
      const footerElement = document.querySelector(".landing-footer");
      const heroImage = document.querySelector(".landing-hero-image");
      const attribution = document.querySelector(".landing-footer-attribution a");
      const style = heroImage ? getComputedStyle(heroImage) : null;
      return {
        status: document.documentElement.id === "__next_error__" ? 500 : 200,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        footerHeight: footerElement?.getBoundingClientRect().height || 0,
        emailHref: document.querySelector('.landing-footer-contact a[href^="mailto:"]')?.getAttribute("href") || null,
        phoneHref: document.querySelector('.landing-footer-contact a[href^="tel:"]')?.getAttribute("href") || null,
        attributionHref: attribution?.getAttribute("href") || null,
        attributionTarget: attribution?.getAttribute("target") || null,
        attributionRel: attribution?.getAttribute("rel") || null,
        heroRadii: style ? [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius] : [],
      };
    });
    await footer.screenshot({ path: `e2e-artifacts/footer-fix/${label}-${width}.png` });
    await page.close();
  }

  if (expectFixed) for (const [width, result] of Object.entries(report.widths)) {
    if (result.status !== 200 || result.overflow) report.failures.push(`${width}: page or overflow`);
    if (result.emailHref !== "mailto:info@flextechmedia.com") report.failures.push(`${width}: email`);
    if (result.phoneHref !== "tel:+264818563005") report.failures.push(`${width}: phone`);
    if (result.attributionHref !== "https://flextech-media.com/" || result.attributionTarget !== "_blank" || !result.attributionRel?.includes("noopener")) report.failures.push(`${width}: attribution`);
    if (new Set(result.heroRadii).size !== 1) report.failures.push(`${width}: hero radius`);
  }

  fs.writeFileSync(`e2e-artifacts/footer-fix/${label}-report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
