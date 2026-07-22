"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, HeartPulse, LogIn } from "lucide-react";

export function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/preview/landing") || pathname.startsWith("/dashboard") || pathname === "/platform" || pathname.startsWith("/platform/") || pathname.startsWith("/practices/")) return <>{children}</>;
  return <div className="platform-public-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="site-header platform-public-header"><div className="container platform-public-header-inner">
      <Link href="/" className="site-brand platform-public-brand" aria-label="Mondesa Health platform home"><span className="platform-public-brand-mark"><HeartPulse size={20} /></span><span className="site-brand-copy"><strong>MONDESA HEALTH</strong><small>PRACTICE PLATFORM</small></span></Link>
      <nav className="desktop-nav platform-public-nav" aria-label="Platform navigation"><Link href="/services">Practices &amp; services</Link><Link href="/apply">Register a practice</Link></nav>
      <Link className="btn btn-primary platform-public-sign-in" href="/login"><LogIn size={16} /> Sign in</Link>
    </div></header>
    {children}
    <footer className="site-footer platform-public-footer"><div className="container platform-public-footer-grid">
      <div className="platform-public-footer-brand"><Link href="/" className="platform-public-brand"><span className="platform-public-brand-mark"><HeartPulse size={18} /></span><span className="site-brand-copy"><strong>MONDESA HEALTH</strong><small>PRACTICE PLATFORM</small></span></Link><p>Helping independent Namibian practices connect care, bookings and administration.</p></div>
      <nav aria-label="Platform footer"><Link href="/services">Practice directory</Link><Link href="/apply">Practice registration</Link><Link href="/policies">Privacy &amp; policies</Link></nav>
      <Link href="/apply" className="platform-public-footer-cta">List your practice <ArrowRight size={16}/></Link>
      <span className="platform-public-copyright">© 2026 Mondesa Health Platform</span>
    </div></footer>
  </div>;
}
