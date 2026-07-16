"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Clock3, LogIn, Menu, Phone, Stethoscope, X } from "lucide-react";
import type { PublicSiteConfig } from "@/lib/public-site";

const MOBILE_BREAKPOINT = 800;

export function SiteChrome({ children, site }: { children: React.ReactNode; site: PublicSiteConfig }) {
  const pathname = usePathname();
  const telephoneHref = `tel:${site.phone.replace(/[^\d+]/g, "")}`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  // Handle viewport changes
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        closeDrawer();
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, closeDrawer]);

  // Body scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Focus trap for drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableElements = drawer.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    drawer.addEventListener("keydown", handleTab);
    firstElement?.focus();
    return () => drawer.removeEventListener("keydown", handleTab);
  }, [mobileOpen]);

  if (pathname.startsWith("/dashboard")) return <>{children}</>;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header
        className="site-header"
        style={{
          borderBottom: "1px solid #dce4df",
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(255,255,255,.96)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="container"
          style={{
            height: 74,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 28,
          }}
        >
          <Link
            href="/"
            className="site-brand"
            aria-label="Mondesa Health home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              fontWeight: 850,
            }}
          >
            <span
              style={{
                width: 37,
                height: 37,
                borderRadius: 11,
                display: "grid",
                placeItems: "center",
                background: "#1f5a4c",
                color: "white",
              }}
            >
              <Stethoscope size={20} />
            </span>
            <span className="site-brand-copy">
              MONDESA <span style={{ color: "#8c6526" }}>HEALTH</span>
              <small>POLYCLINIC</small>
            </span>
          </Link>
          <nav
            className="desktop-nav"
            aria-label="Main navigation"
            style={{
              display: "flex",
              gap: 25,
              alignItems: "center",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <Link href="/#about">About</Link>
            <Link href="/services">Services</Link>
            <Link href="/#visit">Your visit</Link>
            <Link href="/#contact">Location</Link>
          </nav>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <a className="btn btn-light desktop-nav" href={telephoneHref}>
              <Phone size={17} />
              Call us
            </a>
            <Link
              className="btn btn-primary site-book-button"
              href="/book"
              aria-label="Book a GP appointment"
            >
              <Clock3 size={17} />
              <span className="site-book-label">Book GP</span> <span className="desktop-nav">appointment</span>
            </Link>
            {isMobile && (
              <button
                ref={toggleRef}
                type="button"
                className="mobile-menu-toggle"
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDrawer();
                }}
                style={{
                  width: 44,
                  height: 44,
                  border: "1px solid #d4ddd8",
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "#fff",
                }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer rendered outside header to avoid layout issues */}
      {isMobile && mobileOpen && (
        <>
          <div
            className="mobile-menu-backdrop"
            aria-hidden="true"
            onClick={closeDrawer}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 49,
              background: "#102d2778",
              backdropFilter: "blur(2px)",
            }}
          />
          <nav
            ref={drawerRef}
            id="mobile-nav"
            aria-label="Mobile navigation"
            style={{
              position: "fixed",
              right: 0,
              top: 74,
              zIndex: 50,
              width: "min(310px, calc(100vw - 42px))",
              maxHeight: "calc(100vh - 74px)",
              overflowY: "auto",
              background: "#fff",
              border: "1px solid #dce4df",
              borderRadius: "0 0 0 16px",
              boxShadow: "18px 0 50px #09271f35",
              padding: "16px 16px 24px",
              display: "grid",
              gap: 4,
            }}
          >
            <Link
              href="/#about"
              onClick={closeDrawer}
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              About
            </Link>
            <Link
              href="/services"
              onClick={closeDrawer}
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              Services
            </Link>
            <Link
              href="/#visit"
              onClick={closeDrawer}
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              Your visit
            </Link>
            <Link
              href="/#contact"
              onClick={closeDrawer}
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              Location
            </Link>
            <Link
              href="/policies"
              onClick={closeDrawer}
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              Privacy & policies
            </Link>
          </nav>
        </>
      )}

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <footer style={{ background: "#153c33", color: "white", padding: "54px 0 26px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 34 }}>
            <div>
              <h3 style={{ fontSize: 27, margin: "0 0 12px" }}>Care that listens.</h3>
              <p style={{ color: "#c8dad4", maxWidth: 430, lineHeight: 1.7 }}>
                {site.publicDescription}
              </p>
            </div>
            <div>
              <b>Visit</b>
              <p style={{ color: "#c8dad4", lineHeight: 1.7 }}>
                {site.address}<br />
                {site.locationNote}
              </p>
            </div>
            <div>
              <b>Contact</b>
              <p style={{ color: "#c8dad4", lineHeight: 1.7 }}>
                <a href={telephoneHref}>{site.phone}</a>
                {site.email && <><br /><a href={`mailto:${site.email}`}>{site.email}</a></>}
              </p>
            </div>
          </div>
          <div className="footer-meta">
            <span>© 2026 {site.practiceName} · Designed by <a href="https://www.flextech-media.com/" target="_blank" rel="noopener noreferrer">Flextech Media</a></span>
            <div className="footer-links">
              <Link href="/policies">Privacy · Booking terms · Medical disclaimer</Link>
              <Link href="/login">
                <LogIn size={14} aria-hidden="true" />
                Staff login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
