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
  UserCog,
  PanelsTopLeft,
  X,
} from "lucide-react";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/workspace-switcher";
import { platformRoleLabels, type PlatformPermission, type PlatformRole } from "@/lib/platform-permissions";

const items = [
  ["Practices", "/platform/practices", Building2, "VIEW_PRACTICES"],
  ["Applications", "/platform/applications", FileText, "VIEW_APPLICATIONS"],
  ["Service templates", "/platform/categories", SlidersHorizontal, "VIEW_SERVICE_TEMPLATES"],
  ["Plans", "/platform/subscriptions", Banknote, "VIEW_PLATFORM_FINANCE"],
  ["Finance & billing", "/platform/billing", Banknote, "VIEW_PLATFORM_FINANCE"],
  ["Platform analytics", "/platform/analytics", Gauge, "VIEW_PLATFORM_ANALYTICS"],
  ["Platform audit", "/platform/audit", Activity, "VIEW_PLATFORM_AUDIT"],
  ["Controlled support", "/platform/support", ShieldCheck, "MANAGE_SUPPORT_ACCESS"],
  ["Platform team", "/platform/users", UserCog, "MANAGE_PLATFORM_USERS"],
  ["Website", "/platform/website", PanelsTopLeft, "VIEW_PLATFORM_WEBSITE"],
] as const;
const pageNames: Record<string, string> = {
  "/platform/practices": "Practices",
  "/platform/subscriptions": "Subscription plans",
  "/platform/applications": "Practice applications",
  "/platform/categories": "Service templates",
  "/platform/billing": "Finance & billing",
  "/platform/analytics": "Platform analytics",
  "/platform/audit": "Platform audit",
  "/platform/support": "Controlled support",
  "/platform/users": "Platform team",
  "/platform/website": "Landing page",
  "/platform/profile": "Profile & security",
};

export function PlatformShell({
  children,
  user,
  role,
  permissions,
  practices,
}: {
  children: React.ReactNode;
  user: { name: string; avatarData: string | null };
  role: PlatformRole;
  permissions: PlatformPermission[];
  practices: WorkspaceOption[];
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
            {items.filter(([, , , permission]) => permissions.includes(permission)).map(([label, href, Icon]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`dashboard-nav-link${active ? " is-active" : ""}`}>
                  <Icon size={18} /><span>{label}</span>
                </Link>
              );
            })}
          </div>
          {practices.length > 0 && (
            <div className="dashboard-nav-section">
              <span className="dashboard-nav-label">Assigned workspaces</span>
              {practices.map((practice) => (
                <button key={practice.id} type="button" className="dashboard-nav-link workspace-nav-button" onClick={async () => {
                  const response = await fetch("/api/auth/scope", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "PRACTICE", practiceId: practice.id }) });
                  if (response.ok) window.location.assign("/dashboard");
                }}><Building2 size={18} /><span>{practice.name}</span></button>
              ))}
            </div>
          )}
        </nav>
        <div className="dashboard-user">
          <Link href="/platform/profile" className="dashboard-avatar" aria-label="Open profile">
            {user.avatarData ? <Image src={user.avatarData} alt="" width={40} height={40} unoptimized /> : user.name.charAt(0).toUpperCase()}
          </Link>
          <div className="dashboard-user-copy"><small>{platformRoleLabels[role]}</small><strong>{user.name}</strong></div>
          <form action="/api/auth/logout" method="post"><button aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></form>
        </div>
      </aside>
      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-title">
            <button className="dashboard-menu-button" aria-label="Open platform navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div><small>Mondesa Health Platform</small><strong>{Object.entries(pageNames).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] || "Platform administration"}</strong></div>
          </div>
          <div className="dashboard-topbar-actions">
            <WorkspaceSwitcher currentScope="PLATFORM" hasPlatformAccess practices={practices} />
            <span className="dashboard-role"><Settings size={14} /> {platformRoleLabels[role]}</span>
          </div>
        </header>
        <main id="platform-content" tabIndex={-1} className="dashboard-content platform-content"><div key={pathname} className="dashboard-route-content">{children}</div></main>
      </div>
    </div>
  );
}
