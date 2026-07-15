"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Clock3, LogIn, Menu, Phone, Stethoscope, X } from "lucide-react";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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

  if (pathname.startsWith("/dashboard")) return <>{children}</>;

  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header style={{borderBottom:"1px solid #dce4df",position:"sticky",top:0,zIndex:40,background:"rgba(255,255,255,.96)",backdropFilter:"blur(10px)"}}>
      <div className="container" style={{height:74,display:"flex",alignItems:"center",justifyContent:"space-between",gap:28}}>
        <Link href="/" aria-label="Mondesa Health home" style={{display:"flex",alignItems:"center",gap:11,fontWeight:850}}><span style={{width:37,height:37,borderRadius:11,display:"grid",placeItems:"center",background:"#1f5a4c",color:"white"}}><Stethoscope size={20}/></span><span>MONDESA <span style={{color:"#8c6526"}}>HEALTH</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation" style={{display:"flex",gap:25,alignItems:"center",fontSize:14,fontWeight:700}}>
          <Link href="/#about">About</Link><Link href="/#care">What we help with</Link><Link href="/#visit">Your visit</Link><Link href="/#contact">Contact</Link>
        </nav>
        <div style={{display:"flex",gap:9,alignItems:"center"}}>
          <a className="btn btn-light desktop-nav" href="tel:+264810000000"><Phone size={17}/> Call us</a>
          <Link className="btn btn-primary" href="/book"><Clock3 size={17}/> Book <span className="desktop-nav">appointment</span></Link>
          <div className="mobile-menu-wrapper" ref={menuRef}>
            <button
              className="mobile-menu-toggle"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{width:44,height:44,border:"1px solid #d4ddd8",borderRadius:12,display:"grid",placeItems:"center",background:"#fff"}}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {mobileOpen && (
              <div
                className="mobile-menu-backdrop"
                aria-hidden="true"
                onClick={() => setMobileOpen(false)}
                style={{position:"fixed",inset:0,zIndex:49,background:"#102d2778",backdropFilter:"blur(2px)"}}
              />
            )}
            <nav id="mobile-nav" aria-label="Mobile navigation" style={{position:"fixed",right:0,top:74,zIndex:50,width:"min(310px,calc(100vw - 42px))",maxHeight:"calc(100vh - 74px)",overflowY:"auto",background:"#fff",border:"1px solid #dce4df",borderRadius:"0 0 0 16px",boxShadow:"18px 0 50px #09271f35",padding:"16px 16px 24px",display:"grid",gap:4}}>
              <Link href="/#about" onClick={() => setMobileOpen(false)} style={{minHeight:44,display:"flex",alignItems:"center",padding:"0 12px",borderRadius:9,fontSize:14,fontWeight:750}}>About</Link>
              <Link href="/#care" onClick={() => setMobileOpen(false)} style={{minHeight:44,display:"flex",alignItems:"center",padding:"0 12px",borderRadius:9,fontSize:14,fontWeight:750}}>What we help with</Link>
              <Link href="/#visit" onClick={() => setMobileOpen(false)} style={{minHeight:44,display:"flex",alignItems:"center",padding:"0 12px",borderRadius:9,fontSize:14,fontWeight:750}}>Your visit</Link>
              <Link href="/#contact" onClick={() => setMobileOpen(false)} style={{minHeight:44,display:"flex",alignItems:"center",padding:"0 12px",borderRadius:9,fontSize:14,fontWeight:750}}>Contact</Link>
              <Link href="/policies" onClick={() => setMobileOpen(false)} style={{minHeight:44,display:"flex",alignItems:"center",padding:"0 12px",borderRadius:9,fontSize:14,fontWeight:750}}>Privacy & policies</Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
    <div id="main-content" tabIndex={-1}>{children}</div>
    <footer style={{background:"#153c33",color:"white",padding:"54px 0 26px"}}>
      <div className="container">
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:34}}>
          <div><h3 style={{fontSize:27,margin:"0 0 12px"}}>Care that listens.</h3><p style={{color:"#c8dad4",maxWidth:430,lineHeight:1.7}}>General medical care for the Mondesa and greater Swakopmund community. Every patient is treated with dignity, attention and respect.</p></div>
          <div><b>Visit</b><p style={{color:"#c8dad4",lineHeight:1.7}}>Mondesa<br/>Swakopmund, Namibia<br/>Mon–Thu 08:00–17:00<br/>Fri 08:00–16:00</p></div>
          <div><b>Contact</b><p style={{color:"#c8dad4",lineHeight:1.7}}>+264 81 000 0000<br/>hello@mondesahealth.na</p></div>
        </div>
        <div className="footer-meta">
          <span>© 2026 Mondesa Health · Designed by Flextech Media</span>
          <div className="footer-links"><Link href="/policies">Privacy · Booking terms · Medical disclaimer</Link><Link href="/login"><LogIn size={14} aria-hidden="true"/> Staff login</Link></div>
        </div>
      </div>
    </footer>
  </>;
}