import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarCheck, Clock3, Mail, Phone, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicDepartment } from "@/lib/public-site";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const department = await getPublicDepartment(slug);
  if (!department) return { title: "Service not found" };
  return { title: department.name, description: department.summary };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const department = await getPublicDepartment(slug);
  if (!department) notFound();
  const available = department.bookingEnabled;
  return (
    <main className="service-detail-page">
      <section className="service-detail-hero">
        <div className="container service-detail-heading">
          <Link className="back-link" href="/services"><ArrowLeft size={16} /> All services</Link>
          <span className={`service-status${available ? " is-active" : ""}`}>
            {available ? "Available now" : department.status === "FUTURE" ? "Future feature" : "Coming soon"}
          </span>
          <p className="eyebrow">{department.categoryLabel}</p>
          <h1 className="display">{department.name}</h1>
          <p>{department.description}</p>
          {available ? (
            <Link className="btn btn-primary" href="/book">Book GP appointment <ArrowRight size={17} /></Link>
          ) : (
            <div className="coming-soon-notice"><Clock3 size={19} /><span>Appointments are not open for this department yet.</span></div>
          )}
        </div>
      </section>
      <section className="section">
        <div className="container service-detail-layout">
          <div>
            <div className="eyebrow">Services</div>
            <h2>What this department will help with</h2>
            <div className="service-offerings">
              {department.services.map((service, index) => (
                <div key={service.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{service.name}</b>{service.description && <p>{service.description}</p>}</div></div>
              ))}
            </div>
          </div>
          <aside className="provider-panel">
            <div className="eyebrow">Healthcare providers</div>
            <h2>{department.providers.length ? "Meet the team" : "Profiles will be added when confirmed"}</h2>
            {department.providers.length ? department.providers.map((provider) => (
              <article className="provider-profile" key={provider.id}>
                <span className="provider-avatar"><UserRound /></span>
                <div><h3>{provider.displayName}</h3>{provider.practiceName && <b>{provider.practiceName}</b>}{provider.biography && <p>{provider.biography}</p>}</div>
                <div className="provider-contact">
                  {provider.phone && <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={15} /> {provider.phone}</a>}
                  {provider.email && <a href={`mailto:${provider.email}`}><Mail size={15} /> {provider.email}</a>}
                </div>
                {provider.operatingHours && <p className="provider-hours">{provider.operatingHours}</p>}
              </article>
            )) : (
              <p className="provider-empty">No provider names or biographies are published until the Polyclinic confirms them.</p>
            )}
            {available && <Link className="btn btn-primary" href="/book"><CalendarCheck size={16} /> Book General Practice</Link>}
          </aside>
        </div>
      </section>
    </main>
  );
}
