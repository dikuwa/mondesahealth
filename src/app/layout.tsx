import type { Metadata, Viewport } from "next";
import { Inter_Tight, Onest } from "next/font/google";
import { SiteChrome } from "@/components/site-chrome";
import { ToastProvider } from "@/components/toast-provider";
import { getPublicSiteConfig } from "@/lib/public-site";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-onest",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: { default: "Mondesa Health Polyclinic", template: "%s | Mondesa Health Polyclinic" },
  description: "One trusted community destination for primary care and expanding healthcare services in Mondesa, Swakopmund.",
};

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getPublicSiteConfig();
  return <html lang="en" className={`${onest.variable} ${interTight.variable}`} data-scroll-behavior="smooth"><body>
    <SiteChrome site={site}>{children}</SiteChrome>
    <ToastProvider/>
  </body></html>;
}
