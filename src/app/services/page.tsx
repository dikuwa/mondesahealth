import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock3, Stethoscope } from "lucide-react";
import { getPublicDepartments } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Healthcare services",
  description: "Explore available and planned healthcare services at Mondesa Health Polyclinic.",
};

export default async function ServicesPage() {
  const departments = await getPublicDepartments();
  return (
    <main className="services-page">
      <section className="services-hero">
        <div className="container">
          <div className="eyebrow">Healthcare directory</div>
          <h1 className="display">Find the service that fits your needs.</h1>
          <p>General Practice is available now. Explore the healthcare departments planned for the Polyclinic as our integrated platform grows.</p>
        </div>
      </section>
      <section className="section">
        <div className="container services-list">
          {departments.map((department, index) => (
            <article className={`service-listing${department.bookingEnabled ? " is-active" : ""}`} key={department.id}>
              <div className="service-listing-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="service-listing-copy">
                <span className={`service-status${department.bookingEnabled ? " is-active" : ""}`}>
                  {department.bookingEnabled ? "Available now" : department.status === "FUTURE" ? "Future feature" : "Coming soon"}
                </span>
                <p className="eyebrow">{department.categoryLabel}</p>
                <h2>{department.name}</h2>
                <p>{department.summary}</p>
                <div className="service-listing-meta">
                  <span><Stethoscope size={16} /> {department.services.length} planned service{department.services.length === 1 ? "" : "s"}</span>
                  {department.providers.length > 0 && <span>{department.providers.length} provider profile{department.providers.length === 1 ? "" : "s"}</span>}
                </div>
              </div>
              <div className="service-listing-actions">
                <Link className="btn btn-light" href={`/services/${department.slug}`}>View service <ArrowRight size={16} /></Link>
                {department.bookingEnabled && <Link className="btn btn-primary" href="/book"><CalendarCheck size={16} /> Book GP</Link>}
              </div>
            </article>
          ))}
          <div className="services-note">
            <Clock3 aria-hidden="true" />
            <p><b>Opening carefully.</b> Coming-soon departments will only accept appointments after their providers, operating details and services are confirmed.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
