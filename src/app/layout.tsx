import type { Metadata, Viewport } from "next";
import { Inter_Tight, Onest } from "next/font/google";
import { SiteChrome } from "@/components/site-chrome";
import { ToastProvider } from "@/components/toast-provider";
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
  title: { default: "Mondesa Health | General medical practice", template: "%s | Mondesa Health" },
  description: "Calm, thorough general medical care for individuals and families in Mondesa, Swakopmund.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${onest.variable} ${interTight.variable}`} data-scroll-behavior="smooth"><body>
    <SiteChrome>{children}</SiteChrome>
    <ToastProvider/>
  </body></html>;
}
