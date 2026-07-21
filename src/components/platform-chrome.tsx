"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogIn } from "lucide-react";

export function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/platform") || pathname.startsWith("/practices/")) return <>{children}</>;
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="site-header"><div className="container" style={{ minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
      <Link href="/" className="site-brand" aria-label="Mondesa Health platform home"><span className="dashboard-brand-mark"><Building2 size={20} /></span><span className="site-brand-copy"><strong>MONDESA HEALTH</strong><small>PRACTICE PLATFORM</small></span></Link>
      <nav className="desktop-nav" aria-label="Platform navigation" style={{ display: "flex", alignItems: "center", gap: 22 }}><Link href="/services">Practices & services</Link><Link href="/apply">Register a practice</Link></nav>
      <Link className="btn btn-primary" href="/login"><LogIn size={16} /> Sign in</Link>
    </div></header>
    {children}
    <footer className="site-footer"><div className="container"><span>© 2026 Mondesa Health Platform</span><nav><Link href="/services">Practice directory</Link><Link href="/apply">Practice registration</Link><Link href="/policies">Policies</Link></nav></div></footer>
  </>;
}
