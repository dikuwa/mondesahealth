import Image from "next/image";
import Link from "next/link";
import { ExternalLink, HeartPulse, Mail, MapPin, Phone } from "lucide-react";
import type { PlatformLandingContent } from "@/lib/platform-landing";

const ordered = <T extends { order: number; enabled: boolean }>(items: T[]) => items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);
const isExternal = (href: string) => /^https?:|^mailto:|^tel:/i.test(href);

function FooterLink({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) {
  const newTab = external && /^https?:/i.test(href);
  if (isExternal(href)) return <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined}>{children}</a>;
  return <Link href={href}>{children}</Link>;
}

export function LandingFooter({ content, preview = false }: { content: PlatformLandingContent; preview?: boolean }) {
  const { contact, attribution, copyright, groups } = content.footer;
  const telephoneHref = `tel:${contact.phone.replace(/[^+\d]/g, "")}`;

  return <footer className={`landing-footer${preview ? " landing-footer-preview" : ""}`}>
    <div className="landing-container">
      <div className="landing-footer-grid">
        <div className="landing-footer-brand">
          <Link href="/" className="landing-brand" aria-label="Mondesa Health home">
            <span className="landing-brand-mark">{content.general.logoData ? <Image src={content.general.logoData} alt="" width={38} height={38} unoptimized /> : <HeartPulse size={21}/>}</span>
            <span><b>MONDESA HEALTH</b><small>{content.general.logoSubtitle}</small></span>
          </Link>
          <p>{contact.description}</p>
          {contact.enabled && <address className="landing-footer-contact">
            {contact.email && <a href={`mailto:${contact.email}`}><Mail size={14}/><span>{contact.email}</span></a>}
            {contact.phone && <a href={telephoneHref}><Phone size={14}/><span>{contact.phone}</span></a>}
            {contact.location && <span><MapPin size={14}/><span>{contact.location}</span></span>}
          </address>}
        </div>
        {ordered(groups).map((group) => <nav key={group.id} aria-label={group.title}>
          <b>{group.title}</b>
          <div>{ordered(group.links).map((link) => <FooterLink key={link.id} href={link.url} external={link.external}>{link.label}</FooterLink>)}</div>
        </nav>)}
      </div>
      <div className="landing-footer-meta">
        <span>{copyright}</span>
        {attribution.enabled && <span className="landing-footer-attribution">{attribution.prefix} <a href={attribution.url} target="_blank" rel="noopener noreferrer">{attribution.name}<ExternalLink size={12}/></a></span>}
      </div>
    </div>
  </footer>;
}
