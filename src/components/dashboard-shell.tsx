"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, Banknote, CalendarDays, ChevronLeft, ExternalLink, FileHeart,
  Gauge, HeartPulse, LogOut, Menu, PanelLeft, Settings, SlidersHorizontal,
  Users, X,
} from "lucide-react";

const sections = [
  { label: "Practice", items: [
    ["Overview", "/dashboard", Gauge],
    ["Appointments", "/dashboard/appointments", CalendarDays],
    ["Patients", "/dashboard/patients", Users],
  ] },
  { label: "Operations", items: [
    ["Medical aid claims", "/dashboard/claims", FileHeart],
    ["Finance", "/dashboard/finance", Banknote],
    ["Availability", "/dashboard/availability", SlidersHorizontal],
  ] },
  { label: "System", items: [
    ["Settings", "/dashboard/settings", Settings],
    ["Activity log", "/dashboard/activity", Activity],
  ] },
] as const;

const pageNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/appointments": "Appointments",
  "/dashboard/patients": "Patients",
  "/dashboard/claims": "Medical aid claims",
  "/dashboard/finance": "Finance",
  "/dashboard/availability": "Availability",
  "/dashboard/settings": "Settings",
  "/dashboard/activity": "Activity log",
};

export function DashboardShell({ children, name, role }: { children: React.ReactNode; name: string; role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return <div className={`dashboard-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
    <a className="skip-link" href="#dashboard-content">Skip to dashboard content</a>
    <button className="dashboard-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>
    <aside className="dashboard-sidebar" aria-label="Dashboard sidebar">
      <div className="dashboard-brand-row">
        <Link href="/dashboard" className="dashboard-brand" aria-label="Mondesa Health dashboard">
          <span className="dashboard-brand-mark"><HeartPulse size={20}/></span>
          <span className="dashboard-brand-copy">MONDESA <em>HEALTH</em></span>
        </Link>
        <button className="dashboard-mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20}/></button>
      </div>
      <button className="dashboard-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(value => !value)}><ChevronLeft size={18}/><span>{collapsed ? "Expand" : "Collapse"}</span></button>
      <nav className="dashboard-nav" aria-label="Dashboard operations">
        {sections.map(section => <div className="dashboard-nav-section" key={section.label}>
          <span className="dashboard-nav-label">{section.label}</span>
          {section.items.map(([label, href, Icon]) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`dashboard-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined}>
              <Icon size={18}/><span>{label}</span>
            </Link>;
          })}
        </div>)}
      </nav>
      <div className="dashboard-user">
        <span className="dashboard-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
        <div className="dashboard-user-copy"><small>Signed in as</small><strong>{name}</strong></div>
        <form action="/api/auth/logout" method="post"><button aria-label="Sign out" title="Sign out"><LogOut size={17}/></button></form>
      </div>
    </aside>
    <div className="dashboard-workspace">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-title">
          <button className="dashboard-menu-button" aria-label="Open dashboard navigation" onClick={() => setMobileOpen(true)}><Menu size={21}/></button>
          <span className="dashboard-desktop-toggle"><PanelLeft size={17}/></span>
          <div><small>Practice management</small><strong>{pageNames[pathname] || "Dashboard"}</strong></div>
        </div>
        <div className="dashboard-topbar-actions">
          <span className="dashboard-role">Secure · {role.replaceAll("_", " ")}</span>
          <Link href="/" target="_blank" className="dashboard-site-link"><ExternalLink size={16}/><span>Open site</span></Link>
        </div>
      </header>
      <main id="dashboard-content" tabIndex={-1} className="dashboard-content">{children}</main>
    </div>
  </div>;
}
