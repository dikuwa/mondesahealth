import Image from "next/image";
import Link from "next/link";
import {
  Activity, ArrowRight, BarChart3, Bell, Building2, CalendarCheck, CalendarDays,
  Check, CheckCircle2, ClipboardList, CreditCard, FileHeart, FileText, HeartPulse,
  LockKeyhole, Menu, ReceiptText, ShieldCheck, Star, Stethoscope, UserCog, Users,
} from "lucide-react";
import type { PlatformLandingContent } from "@/lib/platform-landing";
import { LandingFooter } from "@/components/landing-footer";

const icons = { Activity, BarChart3, Bell, Building2, CalendarCheck, CalendarDays, CheckCircle2, ClipboardList, CreditCard, FileHeart, FileText, HeartPulse, LockKeyhole, ReceiptText, ShieldCheck, Stethoscope, UserCog, Users };
const ordered = <T extends { order: number; enabled: boolean }>(items: T[]) => items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);
const isExternal = (href: string) => /^https:|^mailto:|^tel:/i.test(href);

function Icon({ name, size = 22 }: { name: keyof typeof icons; size?: number }) {
  const Component = icons[name] || CheckCircle2;
  return <Component size={size} aria-hidden="true" />;
}

function SmartLink({ href, className, children, external }: { href: string; className?: string; children: React.ReactNode; external?: boolean }) {
  const newTab = external || /^https:/i.test(href);
  if (isExternal(href)) return <a href={href} className={className} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined}>{children}</a>;
  return <Link href={href} className={className}>{children}</Link>;
}

function MarketingImage({ src, alt, priority = false, position = "center", className }: { src: string; alt: string; priority?: boolean; position?: string; className?: string }) {
  if (!src) return <div className={`${className || ""} landing-image-placeholder`} aria-hidden="true"><HeartPulse size={48} /></div>;
  return <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" priority={priority} unoptimized={src.startsWith("data:")} className={className} style={{ objectFit: "cover", objectPosition: position }} />;
}

function DashboardPreview({ hero }: { hero: PlatformLandingContent["hero"] }) {
  const metrics = hero.previewMetrics.filter((item) => item.enabled);
  return <div className="landing-dashboard-preview" aria-label="Example Mondesa Health practice dashboard">
    <div className="landing-preview-sidebar"><span className="landing-preview-logo"><HeartPulse size={15}/></span>{[CalendarDays, Users, FileHeart, ReceiptText, BarChart3].map((PreviewIcon, index) => <span key={index}><PreviewIcon size={13}/></span>)}</div>
    <div className="landing-preview-main">
      <div className="landing-preview-header"><div><small>Practice overview</small><b>{hero.previewGreeting}</b><p>{hero.previewText}</p></div><span>MA</span></div>
      <div className="landing-preview-metrics">{metrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><b>{metric.value}</b></div>)}</div>
      <div className="landing-preview-columns">
        {hero.showSchedule && <div className="landing-preview-panel"><div className="landing-preview-panel-title"><b>Today&apos;s schedule</b><CalendarCheck size={13}/></div>{hero.scheduleExamples.filter((item) => item.enabled).map((item) => <div className="landing-preview-row" key={`${item.time}-${item.title}`}><b>{item.time}</b><span>{item.title}<small>{item.detail}</small></span></div>)}</div>}
        {hero.showClaims && <div className="landing-preview-panel"><div className="landing-preview-panel-title"><b>Recent claims</b><FileHeart size={13}/></div>{hero.claimExamples.filter((item) => item.enabled).map((item) => <div className="landing-preview-claim" key={item.reference}><span><b>{item.reference}</b><small>{item.status}</small></span><b>{item.amount}</b></div>)}</div>}
      </div>
    </div>
  </div>;
}

export function PlatformLandingPage({ content, systemMetrics, practices, preview = false }: { content: PlatformLandingContent; systemMetrics: Record<"ACTIVE_PRACTICES" | "COMPLETED_BOOKINGS" | "GENERATED_DOCUMENTS", number>; practices: { slug: string; name: string; type: string; town: string | null; logoData: string | null }[]; preview?: boolean }) {
  const nav = content.general.nav.filter((item) => item.enabled && (content.pricing.enabled || item.destination !== "#pricing"));
  const testimonials = ordered(content.testimonials.items).filter((item) => item.status === "PUBLISHED");
  return <div className="platform-landing">
    {preview && <div className="landing-preview-banner"><b>Draft preview</b><span>Only authorised platform users can see this version.</span><Link href="/platform/website">Return to editor</Link></div>}
    {content.general.announcement && <div className="landing-announcement">{content.general.announcement}</div>}
    <header className="landing-header"><div className="landing-container landing-header-inner">
      <Link href="/" className="landing-brand" aria-label="Mondesa Health home">
        <span className="landing-brand-mark">{content.general.logoData ? <Image src={content.general.logoData} alt="" width={38} height={38} unoptimized /> : <HeartPulse size={21}/>}</span>
        <span><b>MONDESA HEALTH</b><small>{content.general.logoSubtitle}</small></span>
      </Link>
      <nav className="landing-desktop-nav" aria-label="Main navigation">{nav.map((item) => <SmartLink href={item.destination} key={`${item.label}-${item.destination}`}>{item.label}</SmartLink>)}</nav>
      <div className="landing-header-actions"><Link href="/login" className="landing-sign-in">{content.general.signInLabel}</Link><SmartLink href={content.general.primaryCtaDestination} className="btn btn-primary">{content.general.primaryCtaLabel}<ArrowRight size={16}/></SmartLink></div>
      <details className="landing-mobile-menu"><summary aria-label="Open navigation"><Menu size={21}/></summary><nav aria-label="Mobile navigation">{nav.map((item) => <SmartLink href={item.destination} key={`${item.label}-${item.destination}`}>{item.label}</SmartLink>)}<Link href="/login">{content.general.signInLabel}</Link><SmartLink href={content.general.primaryCtaDestination} className="btn btn-primary">{content.general.primaryCtaLabel}</SmartLink></nav></details>
    </div></header>

    <main id="main-content">
      <section className="landing-hero"><div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy"><span className="eyebrow">{content.hero.eyebrow}</span><h1>{content.hero.headingLines.map((line) => <span key={line}>{line}</span>)}</h1><p>{content.hero.paragraph}</p>
          <div className="landing-hero-actions"><SmartLink href={content.hero.primaryCtaDestination} className="btn btn-primary">{content.hero.primaryCtaLabel}<ArrowRight size={17}/></SmartLink><SmartLink href={content.hero.secondaryCtaDestination} className="btn btn-light">{content.hero.secondaryCtaLabel}</SmartLink></div>
          <div className="landing-trust-row">{content.hero.trustIndicators.map((label) => <span key={label}><CheckCircle2 size={15}/>{label}</span>)}</div>
        </div>
        <div className="landing-hero-visual"><div className="landing-hero-image"><MarketingImage src={content.hero.image} alt={content.hero.imageAlt} priority position={content.hero.imagePosition}/></div><DashboardPreview hero={content.hero}/></div>
      </div></section>

      <section className="landing-proof" aria-label="Platform statistics"><div className="landing-container landing-proof-grid">{ordered(content.metrics).map((metric) => <div key={metric.id}><span className="landing-icon"><Icon name={metric.icon}/></span><p><b>{metric.mode === "SYSTEM" ? systemMetrics[metric.systemKey].toLocaleString("en-NA") : metric.value}{metric.suffix}</b><small>{metric.label}</small></p></div>)}</div></section>

      <section className="landing-section" id="benefits"><div className="landing-container"><div className="landing-section-heading centered"><span className="eyebrow">Why Mondesa Health</span><h2>Everything you need to run and grow your practice</h2><p>Give patients a better way to find and book you, while your team works from one independent practice workspace.</p></div><div className="landing-benefit-grid">{ordered(content.benefits).map((item) => <article className="landing-benefit-card" key={item.id}><span className="landing-icon"><Icon name={item.icon}/></span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>

      <section className="landing-section landing-process" id="how-it-works"><div className="landing-container"><div className="landing-section-heading centered"><span className="eyebrow">{content.process.eyebrow}</span><h2>{content.process.heading}</h2></div><div className="landing-step-grid">{ordered(content.process.steps).map((step, index, all) => <article key={step.id}><span className="landing-step-number">{step.number}</span><span className="landing-icon"><Icon name={step.icon}/></span><h3>{step.title}</h3><p>{step.description}</p>{index < all.length - 1 && <ArrowRight className="landing-step-arrow" size={22}/>}</article>)}</div></div></section>

      <section className="landing-section" id="features"><div className="landing-container"><div className="landing-section-heading"><span className="eyebrow">{content.features.eyebrow}</span><h2>{content.features.heading}</h2></div><div className="landing-feature-grid">{ordered(content.features.items).map((item) => {
        const body = <><span className="landing-icon"><Icon name={item.icon} size={20}/></span><span><h3>{item.name}</h3><p>{item.description}</p></span>{item.destination && <ArrowRight size={16}/>}</>;
        return item.destination ? <SmartLink key={item.id} href={item.destination} className="landing-feature-card">{body}</SmartLink> : <article key={item.id} className="landing-feature-card">{body}</article>;
      })}</div></div></section>

      {content.pricing.enabled && ordered(content.pricing.plans).length > 0 && <section className="landing-section landing-pricing" id="pricing"><div className="landing-container"><div className="landing-section-heading centered"><span className="eyebrow">{content.pricing.eyebrow}</span><h2>{content.pricing.heading}</h2><p>{content.pricing.description}</p></div><div className="landing-pricing-grid">{ordered(content.pricing.plans).map((plan) => <article className={`landing-pricing-card${plan.highlighted ? " highlighted" : ""}`} key={plan.id}>{plan.highlighted && <span className="landing-plan-badge">Recommended</span>}<h3>{plan.name}</h3><p>{plan.description}</p><div className="landing-plan-price"><b>{plan.price}</b><span>{plan.period}</span></div><ul>{plan.features.map((feature) => <li key={feature}><Check size={15}/>{feature}</li>)}</ul><SmartLink className={`btn ${plan.highlighted ? "btn-primary" : "btn-light"}`} href={plan.ctaDestination}>{plan.ctaLabel}</SmartLink></article>)}</div></div></section>}

      <section className="landing-section landing-trust-section"><div className="landing-container"><div className="landing-section-heading centered"><span className="eyebrow">{content.testimonials.eyebrow}</span><h2>{content.testimonials.heading}</h2></div><div className="landing-testimonial-grid">
        {testimonials.length ? testimonials.map((item) => <article className="landing-quote-card" key={item.id}><div className="landing-stars" aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: item.rating }, (_, index) => <Star key={index} size={15} fill="currentColor"/>)}</div><blockquote>“{item.quote}”</blockquote><div className="landing-quote-person">{item.photo ? <Image src={item.photo} alt="" width={44} height={44} unoptimized={item.photo.startsWith("data:")}/> : <span>{item.name.charAt(0)}</span>}<p><b>{item.name}</b><small>{item.role}</small></p></div></article>) : <article className="landing-quote-card landing-fallback-card"><HeartPulse size={28}/><p>{content.testimonials.fallback}</p></article>}
        <article className="landing-security-card"><span className="landing-icon"><Icon name={content.testimonials.security.icon}/></span><h3>{content.testimonials.security.heading}</h3><p>{content.testimonials.security.description}</p>{content.testimonials.security.destination && <SmartLink href={content.testimonials.security.destination}>Learn about our approach <ArrowRight size={15}/></SmartLink>}</article>
      </div></div></section>

      <section className="landing-section landing-directory-section"><div className="landing-container"><div className="landing-section-heading split"><div><span className="eyebrow">Practice directory</span><h2>Care stays connected to the practice providing it.</h2></div><Link href="/services" className="btn btn-light">Browse practices <ArrowRight size={16}/></Link></div>{practices.length > 0 && <div className="landing-practice-list">{practices.slice(0, 3).map((practice) => <Link href={`/practices/${practice.slug}`} key={practice.slug}><span>{practice.logoData ? <Image src={practice.logoData} alt="" width={36} height={36} unoptimized/> : <Building2 size={19}/>}</span><p><b>{practice.name}</b><small>{practice.type.replaceAll("_", " ")}{practice.town ? ` · ${practice.town}` : ""}</small></p><ArrowRight size={16}/></Link>)}</div>}</div></section>

      <section className="landing-section landing-faq" id="faq"><div className="landing-container landing-faq-layout"><div className="landing-section-heading"><span className="eyebrow">{content.faq.eyebrow}</span><h2>{content.faq.heading}</h2><p>Need another answer? Contact the Mondesa Health platform team.</p></div><div className="landing-faq-list">{ordered(content.faq.items).map((item, index) => <details key={item.id} open={index === 0}><summary><span>{item.question}</span><span aria-hidden="true">+</span></summary><div><p>{item.answer}</p></div></details>)}</div></div></section>

      <section className="landing-final-cta"><div className="landing-container"><div className="landing-final-card"><div><span className="eyebrow">{content.finalCta.eyebrow}</span><h2>{content.finalCta.heading}</h2><p>{content.finalCta.text}</p><SmartLink href={content.finalCta.destination} className="btn landing-cta-light">{content.finalCta.label}<ArrowRight size={17}/></SmartLink><small>{content.finalCta.reassurance}</small></div><div className="landing-final-image"><MarketingImage src={content.finalCta.image} alt={content.finalCta.imageAlt}/></div></div></div></section>
    </main>

    <LandingFooter content={content}/>
  </div>;
}
