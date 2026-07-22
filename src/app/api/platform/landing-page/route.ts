import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";
import { defaultPlatformLandingContent, parseLandingContent, platformLandingSchema } from "@/lib/platform-landing";

const sectionNames = ["general", "hero", "metrics", "benefits", "process", "features", "testimonials", "faq", "finalCta", "pricing", "footer", "seo"] as const;
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SAVE_DRAFT"), content: platformLandingSchema }),
  z.object({ action: z.literal("PUBLISH") }),
  z.object({ action: z.literal("RESTORE") }),
  z.object({ action: z.literal("RESET_SECTION"), section: z.enum(sectionNames) }),
]);

const json = (content: unknown) => content as Prisma.InputJsonValue;

export async function GET() {
  const session = await requirePlatformPermission("VIEW_PLATFORM_WEBSITE");
  if (!session) return NextResponse.json({ error: "Platform website access is required." }, { status: 403 });
  const row = await db.platformLandingPage.findUnique({ where: { id: "platform-landing-page" } });
  return NextResponse.json({
    draft: parseLandingContent(row?.draftContent || defaultPlatformLandingContent),
    published: parseLandingContent(row?.publishedContent || defaultPlatformLandingContent),
    draftUpdatedAt: row?.draftUpdatedAt || null,
    publishedAt: row?.publishedAt || null,
    publishedById: row?.publishedById || null,
  });
}

export async function PATCH(request: Request) {
  const session = await requirePlatformPermission("MANAGE_PLATFORM_WEBSITE");
  if (!session) return NextResponse.json({ error: "Platform website publishing access is required." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the landing-page content." }, { status: 400 });

  const current = await db.platformLandingPage.findUnique({ where: { id: "platform-landing-page" } });
  const draft = parseLandingContent(current?.draftContent || defaultPlatformLandingContent);
  const published = parseLandingContent(current?.publishedContent || defaultPlatformLandingContent);
  const now = new Date();

  if (parsed.data.action === "SAVE_DRAFT") {
    const saved = await db.platformLandingPage.upsert({
      where: { id: "platform-landing-page" },
      create: { id: "platform-landing-page", draftContent: json(parsed.data.content), publishedContent: json(defaultPlatformLandingContent), draftUpdatedAt: now },
      update: { draftContent: json(parsed.data.content), draftUpdatedAt: now },
    });
    return NextResponse.json({ ok: true, draftUpdatedAt: saved.draftUpdatedAt });
  }

  if (parsed.data.action === "RESTORE") {
    const restored = await db.platformLandingPage.upsert({
      where: { id: "platform-landing-page" },
      create: { id: "platform-landing-page", draftContent: json(published), publishedContent: json(published), draftUpdatedAt: now },
      update: { draftContent: json(published), draftUpdatedAt: now },
    });
    return NextResponse.json({ ok: true, content: published, draftUpdatedAt: restored.draftUpdatedAt });
  }

  if (parsed.data.action === "RESET_SECTION") {
    const content = { ...draft, [parsed.data.section]: structuredClone(defaultPlatformLandingContent[parsed.data.section]) };
    const valid = platformLandingSchema.parse(content);
    const saved = await db.platformLandingPage.upsert({
      where: { id: "platform-landing-page" },
      create: { id: "platform-landing-page", draftContent: json(valid), publishedContent: json(defaultPlatformLandingContent), draftUpdatedAt: now },
      update: { draftContent: json(valid), draftUpdatedAt: now },
    });
    return NextResponse.json({ ok: true, content: valid, draftUpdatedAt: saved.draftUpdatedAt });
  }

  const validated = platformLandingSchema.safeParse(draft);
  if (!validated.success) return NextResponse.json({ error: "Save a valid draft before publishing." }, { status: 400 });
  const saved = await db.$transaction(async (tx) => {
    const row = await tx.platformLandingPage.upsert({
      where: { id: "platform-landing-page" },
      create: { id: "platform-landing-page", draftContent: json(validated.data), publishedContent: json(validated.data), draftUpdatedAt: now, publishedAt: now, publishedById: session.id },
      update: { publishedContent: json(validated.data), publishedAt: now, publishedById: session.id },
    });
    await tx.activityLog.create({ data: { userId: session.id, practiceId: null, action: "PLATFORM_LANDING_PAGE_PUBLISHED", entityType: "PlatformLandingPage", entityId: row.id, summary: "Published the Mondesa Health platform landing page", requestInfo: requestAuditInfo(request) } });
    return row;
  });
  return NextResponse.json({ ok: true, publishedAt: saved.publishedAt });
}
