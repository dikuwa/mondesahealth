"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Banknote,
  Building2,
  FileText,
  Gauge,
  HeartPulse,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

const items = [
  ["Practices", "/platform/practices", Building2],
  ["Plans", "/platform/subscriptions", Banknote],
  ["Applications", "/platform/applications", FileText],
  ["Service categories", "/platform/categories", SlidersHorizontal],
  ["Practice billing", "/platform/billing", Banknote],
  ["Platform analytics", "/platform/analytics", Gauge],
  ["Platform audit", "/platform/audit", Activity],
  ["Controlled support", "/platform/support", ShieldCheck],
] as const;

export function PlatformShell({
  children,
  user,
  legacyPractice,
}: {
  children: React.ReactNode;
  user: { name: string; avatarData: string | null };
  legacyPractice: { name: string } | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className={`dashboard-shell${mobileOpen ? " mobile-open" : ""}`}>
      <a className="skip-link" href="#platform-content">Skip to platform content</a>
      <button className="dashboard-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      <aside className="dashboard-sidebar" aria-label="Platform navigation">
        <div className="dashboard-brand-row">
          <Link href="/platform" className="dashboard-brand" aria-label="Mondesa Health platform">
            <span className="dashboard-brand-mark"><HeartPulse size={20} /></span>
            <span className="dashboard-brand-copy">
              <strong>MONDESA HEALTH</strong>
              <small>PLATFORM OWNER</small>
            </span>
          </Link>
          <button className="dashboard-mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav className="dashboard-nav" aria-label="Platform administration">
          <div className="dashboard-nav-section">
            <span className="dashboard-nav-label">Platform</span>
            {items.map(([label, href, Icon]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`dashboard-nav-link${active ? " is-active" : ""}`}>
                  <Icon size={18} /><span>{label}</span>
                </Link>
              );
            })}
          </div>
          {legacyPractice && (
            <div className="dashboard-nav-section">
              <span className="dashboard-nav-label">Temporary migration access</span>
              <Link href="/dashboard" className="dashboard-nav-link"><Building2 size={18} /><span>{legacyPractice.name}</span></Link>
            </div>
          )}
        </nav>
        <div className="dashboard-user">
          <Link href="/platform/profile" className="dashboard-avatar" aria-label="Open profile">
            {user.avatarData ? <Image src={user.avatarData} alt="" width={40} height={40} unoptimized /> : user.name.charAt(0).toUpperCase()}
          </Link>
          <div className="dashboard-user-copy"><small>Platform owner</small><strong>{user.name}</strong></div>
          <form action="/api/auth/logout" method="post"><button aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></form>
        </div>
      </aside>
      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-title">
            <button className="dashboard-menu-button" aria-label="Open platform navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div><small>Mondesa Health</small><strong>Platform administration</strong></div>
          </div>
          <div className="dashboard-topbar-actions"><span className="dashboard-role"><Settings size={14} /> Platform owner</span></div>
        </header>
        <main id="platform-content" tabIndex={-1} className="dashboard-content"><div key={pathname} className="dashboard-route-content">{children}</div></main>
      </div>
    </div>
  );
}
