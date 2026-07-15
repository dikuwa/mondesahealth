"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  FileHeart,
  Gauge,
  HeartPulse,
  LogOut,
  Menu,
  PanelLeft,
  Settings,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
} from "lucide-react";

const sections = [
  {
    label: "Practice",
    items: [
      ["Overview", "/dashboard", Gauge, "VIEW_OVERVIEW"],
      [
        "Appointments",
        "/dashboard/appointments",
        CalendarDays,
        "MANAGE_APPOINTMENTS",
      ],
      ["Patients", "/dashboard/patients", Users, "MANAGE_PATIENTS"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["Medical aid claims", "/dashboard/claims", FileHeart, "MANAGE_CLAIMS"],
      ["Finance", "/dashboard/finance", Banknote, "MANAGE_FINANCE"],
      [
        "Availability",
        "/dashboard/availability",
        SlidersHorizontal,
        "MANAGE_AVAILABILITY",
      ],
    ],
  },
  {
    label: "System",
    items: [
      ["Settings", "/dashboard/settings", Settings, "MANAGE_PRACTICE"],
      ["Staff users", "/dashboard/users", UserCog, "MANAGE_USERS"],
      ["Activity log", "/dashboard/activity", Activity, "VIEW_ACTIVITY"],
    ],
  },
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
  "/dashboard/users": "Staff users",
  "/dashboard/profile": "Profile & security",
};

export function DashboardShell({
  children,
  name,
  role,
  permissions,
  avatarData,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  permissions: string[];
  avatarData: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    const focusable = sidebar?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div
      className={`dashboard-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}
    >
      <a className="skip-link" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <button
        className="dashboard-backdrop"
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside ref={sidebarRef} className="dashboard-sidebar" aria-label="Dashboard sidebar">
        <div className="dashboard-brand-row">
          <Link
            href="/dashboard"
            className="dashboard-brand"
            aria-label="Mondesa Health dashboard"
          >
            <span className="dashboard-brand-mark">
              <HeartPulse size={20} />
            </span>
            <span className="dashboard-brand-copy">
              MONDESA <em>HEALTH</em>
            </span>
          </Link>
          <button
            className="dashboard-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <button
          className="dashboard-collapse"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <ChevronLeft size={18} />
          <span>{collapsed ? "Expand" : "Collapse"}</span>
        </button>
        <nav className="dashboard-nav" aria-label="Dashboard operations">
          {sections.map((section) => (
            <div className="dashboard-nav-section" key={section.label}>
              <span className="dashboard-nav-label">{section.label}</span>
              {section.items
                .filter(
                  ([, , , permission]) =>
                    role === "OWNER" || permissions.includes(permission),
                )
                .map(([label, href, Icon]) => {
                  const active =
                    href === "/dashboard"
                      ? pathname === href
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`dashboard-nav-link${active ? " is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? label : undefined}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="dashboard-user">
          <Link
            href="/dashboard/profile"
            className="dashboard-avatar"
            aria-label="Open your profile"
          >
            {avatarData ? (
              <img src={avatarData} alt="" />
            ) : (
              name.trim().charAt(0).toUpperCase()
            )}
          </Link>
          <div className="dashboard-user-copy">
            <small>Signed in as</small>
            <strong>{name}</strong>
          </div>
          <form action="/api/auth/logout" method="post">
            <button aria-label="Sign out" title="Sign out">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </aside>
      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-title">
            <button
              ref={menuButtonRef}
              className="dashboard-menu-button"
              aria-label="Open dashboard navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="dashboard-desktop-toggle">
              <PanelLeft size={17} />
            </span>
            <div>
              <small>Practice management</small>
              <strong>{pageNames[pathname] || "Dashboard"}</strong>
            </div>
          </div>
          <div className="dashboard-topbar-actions">
            <span className="dashboard-role">
              Secure · {role.replaceAll("_", " ")}
            </span>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-site-link"
            >
              <ExternalLink size={16} />
              <span>Open site</span>
            </Link>
          </div>
        </header>
        <main
          id="dashboard-content"
          tabIndex={-1}
          className="dashboard-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
