import type { Metadata } from "next";
import { PlatformLandingPage } from "@/components/platform-landing-page";
import { getPlatformLandingPageData, getPublishedLandingContent } from "@/lib/platform-landing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedLandingContent();
  const socialImage = content.seo.socialImage.startsWith("data:") ? "/api/landing-social-image" : content.seo.socialImage;
  return {
    metadataBase: new URL(content.seo.canonicalUrl || "https://mondesahealth.vercel.app/"),
    title: content.seo.title,
    description: content.seo.description,
    alternates: content.seo.canonicalUrl ? { canonical: content.seo.canonicalUrl } : undefined,
    robots: content.seo.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: content.seo.socialTitle || content.seo.title, description: content.seo.socialDescription || content.seo.description, images: socialImage ? [{ url: socialImage, alt: content.seo.socialImageAlt }] : undefined, type: "website" },
    twitter: { card: "summary_large_image", title: content.seo.socialTitle || content.seo.title, description: content.seo.socialDescription || content.seo.description, images: socialImage ? [socialImage] : undefined },
  };
}

export default async function PlatformHome() {
  const { content, systemMetrics, practices } = await getPlatformLandingPageData();
  return <PlatformLandingPage content={content} systemMetrics={systemMetrics} practices={practices} />;
}
