import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, MapPin, Search } from "lucide-react";
import { db } from "@/lib/db";

export default async function PracticeDirectory({ searchParams }: { searchParams: Promise<{ q?: string; town?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() || "";
  const selectedTown = params.town?.trim() || "";
  const practices = await db.practice.findMany({
    where: { status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } },
    select: { slug: true, name: true, type: true, description: true, town: true, region: true, services: { where: { active: true, public: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  const towns = [...new Set(practices.map((practice) => practice.town).filter((town): town is string => Boolean(town)))].sort();
  const visible = practices.filter((practice) => {
    const searchable = `${practice.name} ${practice.type} ${practice.description || ""} ${practice.town || ""} ${practice.region || ""} ${practice.services.map((service) => service.name).join(" ")}`.toLowerCase();
    return (!query || searchable.includes(query)) && (!selectedTown || practice.town === selectedTown);
  });

  return <main id="main-content" className="services-page">
    <section className="services-hero"><div className="container"><div className="eyebrow">Mondesa Health directory</div><h1 className="display">Independent practices and their services.</h1><p>Search by practice, service or town to find care close to you.</p></div></section>
    <section className="section"><div className="container services-list">
      <form className="practice-directory-filters" action="/services" method="get">
        <label className="search-box"><Search size={17}/><span className="sr-only">Search practices and services</span><input className="input" name="q" defaultValue={params.q || ""} placeholder="Search practices or services" /></label>
        <label><span className="sr-only">Filter by town</span><select className="input" name="town" defaultValue={selectedTown}><option value="">All towns</option>{towns.map((town) => <option value={town} key={town}>{town}</option>)}</select></label>
        <button className="btn btn-primary">Search directory</button>
        {(query || selectedTown) && <Link className="btn btn-light" href="/services">Clear filters</Link>}
      </form>
      <p className="directory-result-count">{visible.length} practice{visible.length === 1 ? "" : "s"} found</p>
      {visible.map((practice, index) => <article className="service-listing is-active" key={practice.slug}>
        <div className="service-listing-number">{String(index + 1).padStart(2, "0")}</div>
        <div className="service-listing-copy"><div className="service-listing-labels"><span className="eyebrow">{practice.type.replaceAll("_", " ")}</span>{practice.town && <span className="town-tag"><MapPin size={13}/>{practice.town}</span>}</div><h2>{practice.name}</h2><p>{practice.description || [practice.town, practice.region].filter(Boolean).join(", ") || "Independent healthcare practice"}</p><div className="service-listing-meta"><span><Building2 size={16} /> {practice.services.length} published service{practice.services.length === 1 ? "" : "s"}</span><span>{practice.services.slice(0, 3).map((service) => service.name).join(" · ")}</span></div></div>
        <div className="service-listing-actions"><Link className="btn btn-light" href={`/practices/${practice.slug}`}>View practice <ArrowRight size={16} /></Link>{practice.services.length > 0 && <Link className="btn btn-primary" href={`/practices/${practice.slug}/book`}><CalendarCheck size={16} /> Book</Link>}</div>
      </article>)}
      {!visible.length && <div className="dashboard-empty"><h2>No matching practices</h2><p>Try another town or a broader search.</p></div>}
    </div></section>
  </main>;
}
