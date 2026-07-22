import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site-chrome";
import { db } from "@/lib/db";
import { getPublicSiteConfig } from "@/lib/public-site";

export default async function PracticePublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const practice = await db.practice.findUnique({ where: { slug }, select: { id: true, logoData: true } });
  if (!practice) notFound();
  const site = await getPublicSiteConfig(practice.id);
  return <SiteChrome site={site} basePath={`/practices/${slug}`} logoData={practice.logoData}>{children}</SiteChrome>;
}
