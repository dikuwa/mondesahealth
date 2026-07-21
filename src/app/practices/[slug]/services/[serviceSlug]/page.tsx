import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarCheck, Clock3, Mail, Phone, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { getPublicDepartment } from "@/lib/public-site";

export default async function TenantServiceDetail({ params }: { params: Promise<{ slug: string; serviceSlug: string }> }) {
  const { slug, serviceSlug } = await params;
  const practice = await db.practice.findFirst({ where: { slug, status: "ACTIVE", publicVisible: true }, select: { id: true, name: true } });
  if (!practice) notFound();
  const department = await getPublicDepartment(serviceSlug, practice.id);
  if (!department || (!department.services.length && !department.providers.length)) notFound();
  const available = department.bookingEnabled && department.services.length > 0;
  const status = available ? { value: "ACTIVE", label: "Available now" } : { value: department.status, label: department.status === "FUTURE" ? "Future feature" : "Coming soon" };
  const basePath = `/practices/${slug}`;
  return <main className="service-detail-page">
    <section className="service-detail-hero"><div className="container service-detail-heading"><Link className="back-link" href={`${basePath}/services`}><ArrowLeft size={16} /> All services</Link><StatusBadge {...status} /><p className="eyebrow">{department.categoryLabel}</p><h1 className="display">{department.name}</h1><p>{department.description}</p>{available ? <Link className="btn btn-primary" href={`${basePath}/book`}>Book with {practice.name} <ArrowRight size={17} /></Link> : <div className="coming-soon-notice"><Clock3 size={19} /><span>Appointments are not open for this service yet.</span></div>}</div></section>
    <section className="section"><div className="container service-detail-layout"><div><div className="eyebrow">Services</div><h2>What this practice offers</h2><div className="service-offerings">{department.services.map((service, index) => <div key={service.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{service.name}</b>{service.description && <p>{service.description}</p>}</div></div>)}</div></div>
      <aside className="provider-panel"><div className="eyebrow">Healthcare providers</div><h2>{department.providers.length ? "Meet the team" : "Provider profiles are not published yet"}</h2>{department.providers.map((provider) => <article className="provider-profile" key={provider.id}><span className="provider-avatar"><UserRound /></span><div><h3>{provider.displayName}</h3>{provider.biography && <p>{provider.biography}</p>}</div><div className="provider-contact">{provider.phone && <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={15} /> {provider.phone}</a>}{provider.email && <a href={`mailto:${provider.email}`}><Mail size={15} /> {provider.email}</a>}</div>{provider.operatingHours && <p className="provider-hours">{provider.operatingHours}</p>}</article>)}{available && <Link className="btn btn-primary" href={`${basePath}/book`}><CalendarCheck size={16} /> Book appointment</Link>}</aside>
    </div></section>
  </main>;
}
