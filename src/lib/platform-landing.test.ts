import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultPlatformLandingContent, parseLandingContent, platformLandingSchema } from "@/lib/platform-landing";
import { reorderLandingItems } from "@/components/landing-page-editor";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("platform landing page content", () => {
  it("ships a valid, non-fabricated default snapshot", () => {
    expect(platformLandingSchema.safeParse(defaultPlatformLandingContent).success).toBe(true);
    expect(defaultPlatformLandingContent.testimonials.items).toEqual([]);
    expect(defaultPlatformLandingContent.pricing.enabled).toBe(false);
    expect(defaultPlatformLandingContent.hero.headingLines).toHaveLength(3);
  });

  it("accepts real internal section destinations and rejects unsafe protocols", () => {
    const safe = structuredClone(defaultPlatformLandingContent);
    safe.hero.secondaryCtaDestination = "#how-it-works";
    safe.footer.attribution.url = "http://localhost:3000/";
    expect(platformLandingSchema.safeParse(safe).success).toBe(true);

    const unsafe = structuredClone(defaultPlatformLandingContent);
    unsafe.general.primaryCtaDestination = "javascript:alert(1)";
    expect(platformLandingSchema.safeParse(unsafe).success).toBe(false);
  });

  it("falls back safely when stored content is malformed", () => {
    expect(parseLandingContent({ version: 1, hero: { headingLines: [] } })).toEqual(defaultPlatformLandingContent);
  });

  it("upgrades saved landing snapshots with safe footer defaults", () => {
    const legacy = structuredClone(defaultPlatformLandingContent);
    const parsed = parseLandingContent({ ...legacy, footer: { groups: legacy.footer.groups } });
    expect(parsed.footer.contact).toEqual(defaultPlatformLandingContent.footer.contact);
    expect(parsed.footer.attribution.url).toBe("https://flextech-media.com/");
    expect(parsed.footer.copyright).toContain("All rights reserved");
  });

  it("ships the corrected footer contact details", () => {
    expect(defaultPlatformLandingContent.footer.contact).toMatchObject({
      email: "info@flextechmedia.com",
      phone: "+264 81 85 63 005",
      location: "Namibia",
    });
  });

  it("reorders repeatable content with persisted sequential ordering", () => {
    const reordered = reorderLandingItems(defaultPlatformLandingContent.benefits.slice(0, 3), 0, 1);
    expect(reordered.map((item) => item.title)).toEqual(["Bookings that work", "Your own public page", "Patient records"]);
    expect(reordered.map((item) => item.order)).toEqual([0, 1, 2]);
  });
});

describe("platform landing page implementation contract", () => {
  it("uses one renderer for public and protected draft preview", () => {
    expect(source("src/app/page.tsx")).toContain("<PlatformLandingPage");
    expect(source("src/app/preview/landing/page.tsx")).toContain("<PlatformLandingPage");
    expect(source("src/app/preview/landing/page.tsx")).toContain("preview");
  });

  it("keeps draft and published snapshots separate and audits publishing", () => {
    const api = source("src/app/api/platform/landing-page/route.ts");
    expect(api).toContain("draftContent");
    expect(api).toContain("publishedContent");
    expect(api).toContain("PLATFORM_LANDING_PAGE_PUBLISHED");
    expect(api).toContain('requirePlatformPermission("MANAGE_PLATFORM_WEBSITE")');
  });

  it("provides structured controls without raw JSON or browser alerts", () => {
    const editor = source("src/components/landing-page-editor.tsx");
    for (const label of ["General", "Hero", "Metrics", "Benefits", "How it works", "Features", "Testimonials", "FAQ", "Final CTA", "Footer", "SEO"]) {
      expect(editor).toContain(label);
    }
    expect(editor).toContain("beforeunload");
    expect(editor).toContain("ConfirmationDialog");
    expect(editor).not.toMatch(/window\.(?:alert|confirm|prompt)\s*\(/);
    expect(editor).not.toContain("JSON.stringify(content");
  });

  it("preserves working acquisition, directory, sign-in and practice routes", () => {
    const renderer = source("src/components/platform-landing-page.tsx");
    expect(renderer).toContain('href="/login"');
    expect(renderer).toContain('href="/services"');
    expect(renderer).toContain("/practices/${practice.slug}");
    expect(defaultPlatformLandingContent.general.primaryCtaDestination).toBe("/apply");
  });

  it("keeps the footer compact, editable and safely attributed", () => {
    const footer = source("src/components/landing-footer.tsx");
    const editor = source("src/components/landing-page-editor.tsx");
    const styles = source("src/app/globals.css");
    expect(footer).toContain('href={attribution.url} target="_blank" rel="noopener noreferrer"');
    expect(footer).toContain("ExternalLink");
    for (const label of ["Contact Information", "Footer Navigation Columns", "Attribution", "Copyright", "Live footer preview"]) expect(editor).toContain(label);
    expect(styles).toContain("border-radius: var(--landing-hero-radius)");
    expect(styles).not.toContain("border-radius: 28px 28px 120px 28px");
  });
});
