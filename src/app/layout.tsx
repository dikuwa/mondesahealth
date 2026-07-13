import type { Metadata } from "next";
import Link from "next/link";
import { Onest } from "next/font/google";
import { Clock3, Menu, Phone, Stethoscope } from "lucide-react";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-onest",
});

export const metadata: Metadata = {
  title: { default: "Mondesa Health | General medical practice", template: "%s | Mondesa Health" },
  description: "Calm, thorough general medical care for individuals and families in Mondesa, Swakopmund.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={onest.variable} data-scroll-behavior="smooth"><body>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header style={{borderBottom:"1px solid #dce4df",position:"sticky",top:0,zIndex:40,background:"rgba(255,255,255,.96)",backdropFilter:"blur(10px)"}}>
      <div className="container" style={{height:74,display:"flex",alignItems:"center",justifyContent:"space-between",gap:28}}>
        <Link href="/" aria-label="Mondesa Health home" style={{display:"flex",alignItems:"center",gap:11,fontWeight:850}}><span style={{width:37,height:37,borderRadius:11,display:"grid",placeItems:"center",background:"#1f5a4c",color:"white"}}><Stethoscope size={20}/></span><span>MONDESA <span style={{color:"#8c6526"}}>HEALTH</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation" style={{display:"flex",gap:25,alignItems:"center",fontSize:14,fontWeight:700}}>
          <Link href="/#about">About</Link><Link href="/#care">What we help with</Link><Link href="/#visit">Your visit</Link><Link href="/#contact">Contact</Link><Link href="/login">Staff</Link>
        </nav>
        <div style={{display:"flex",gap:9,alignItems:"center"}}><a className="btn btn-light desktop-nav" href="tel:+264810000000"><Phone size={17}/> Call us</a><Link className="btn btn-primary" href="/book"><Clock3 size={17}/> Book <span className="desktop-nav">appointment</span></Link><details className="mobile-menu"><summary aria-label="Open navigation"><Menu size={20}/></summary><nav aria-label="Mobile navigation"><Link href="/#about">About</Link><Link href="/#care">What we help with</Link><Link href="/#visit">Your visit</Link><Link href="/#contact">Contact</Link><Link href="/policies">Privacy & policies</Link><Link href="/login">Staff sign in</Link></nav></details></div>
      </div>
    </header>
    <div id="main-content" tabIndex={-1}>{children}</div>
    <footer style={{background:"#153c33",color:"white",padding:"54px 0 26px"}}><div className="container"><div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:34}}><div><h3 style={{fontSize:27,margin:"0 0 12px"}}>Care that listens.</h3><p style={{color:"#c8dad4",maxWidth:430,lineHeight:1.7}}>General medical care for the Mondesa and greater Swakopmund community. Every patient is treated with dignity, attention and respect.</p></div><div><b>Visit</b><p style={{color:"#c8dad4",lineHeight:1.7}}>Mondesa<br/>Swakopmund, Namibia<br/>Mon–Thu 08:00–17:00<br/>Fri 08:00–16:00</p></div><div><b>Contact</b><p style={{color:"#c8dad4",lineHeight:1.7}}>+264 81 000 0000<br/>hello@mondesahealth.na</p></div></div><div style={{borderTop:"1px solid #ffffff25",marginTop:34,paddingTop:20,display:"flex",justifyContent:"space-between",fontSize:12,color:"#b6cbc4"}}><span>© 2026 Mondesa Health</span><Link href="/policies">Privacy · Booking terms · Medical disclaimer</Link></div></div></footer>
    <ToastProvider/>
  </body></html>;
}
