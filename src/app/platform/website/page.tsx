import { notFound } from "next/navigation";
import { LandingPageEditor } from "@/components/landing-page-editor";
import { PageHeading } from "@/components/dashboard";
import { requirePlatformPermission } from "@/lib/auth";
import { defaultPlatformLandingContent, getLandingRecord, parseLandingContent } from "@/lib/platform-landing";

export default async function PlatformWebsitePage() {
  const session = await requirePlatformPermission("VIEW_PLATFORM_WEBSITE");
  if (!session) notFound();
  const record = await getLandingRecord();
  return <><PageHeading eyebrow="Platform website" title="Landing page"/><LandingPageEditor initialContent={parseLandingContent(record?.draftContent || defaultPlatformLandingContent)} canManage={session.platformPermissions.includes("MANAGE_PLATFORM_WEBSITE")} draftUpdatedAt={record?.draftUpdatedAt?.toISOString() || null} publishedAt={record?.publishedAt?.toISOString() || null}/></>;
}
