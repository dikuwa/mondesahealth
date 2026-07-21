import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck } from "lucide-react";
import { db } from "@/lib/db";

export default async function PracticeDirectory() {
  const practices = await db.practice.findMany({
    where: { status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } },
    select: { slug: true, name: true, type: true, description: true, town: true, region: true, services: { where: { active: true, public: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  return <main className="services-page"><section className="services-hero"><div className="container"><div className="eyebrow">Mondesa Health directory</div><h1 className="display">Independent practices and their services.</h1><p>Select a practice to view its independently managed content, providers and live availability.</p></div></section>
    <section className="section"><div className="container services-list">{practices.map((practice, index) => <article className="service-listing is-active" key={practice.slug}><div className="service-listing-number">{String(index + 1).padStart(2, "0")}</div><div className="service-listing-copy"><p className="eyebrow">{practice.type.replaceAll("_", " ")}</p><h2>{practice.name}</h2><p>{practice.description || [practice.town, practice.region].filter(Boolean).join(", ") || "Independent healthcare practice"}</p><div className="service-listing-meta"><span><Building2 size={16} /> {practice.services.length} published service{practice.services.length === 1 ? "" : "s"}</span><span>{practice.services.slice(0, 3).map((service) => service.name).join(" · ")}</span></div></div><div className="service-listing-actions"><Link className="btn btn-light" href={`/practices/${practice.slug}`}>View practice <ArrowRight size={16} /></Link>{practice.services.length > 0 && <Link className="btn btn-primary" href={`/practices/${practice.slug}/book`}><CalendarCheck size={16} /> Book</Link>}</div></article>)}{!practices.length && <div className="dashboard-empty">No practices are publicly available yet.</div>}</div></section>
  </main>;
}
