import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, CalendarCheck, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";

export default async function PlatformHome() {
  const practices = await db.practice.findMany({
    where: { status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } },
    select: { slug: true, name: true, type: true, description: true, logoData: true, town: true, region: true, services: { where: { active: true, public: true }, select: { id: true } } },
    orderBy: { name: "asc" },
  });
  return <main>
    <section className="hero-section polyclinic-hero"><div className="container hero-grid">
      <div className="hero-copy"><div className="eyebrow">Independent healthcare practices</div><h1 className="display">Find care. Book directly. Keep each practice independent.</h1><p>Mondesa Health connects patients with subscribed healthcare practices while every practice controls its own team, services, availability and patient records.</p>
        <div className="hero-actions"><Link className="btn btn-primary" href="/services">Find a practice <ArrowRight size={17} /></Link><Link className="btn btn-light" href="/apply">Register your practice</Link></div>
        <div className="hero-trust"><span className="hero-trust-item"><ShieldCheck size={15} /> Tenant-isolated records</span><span className="hero-trust-item"><CalendarCheck size={15} /> Direct practice booking</span></div>
      </div>
      <div className="card dashboard-card"><Building2 size={42} /><h2>{practices.length} active practice{practices.length === 1 ? "" : "s"}</h2><p>Each listed practice independently publishes its services and appointment availability.</p></div>
    </div></section>
    <section className="section"><div className="container"><div className="directory-heading"><div><div className="eyebrow">Practice directory</div><h2 className="display">Choose your healthcare practice.</h2></div><Link className="directory-all-link" href="/services">View service directory <ArrowRight size={16} /></Link></div>
      <div className="directory-upcoming">{practices.map((practice) => <Link className="directory-row" href={`/practices/${practice.slug}`} key={practice.slug}><span className="directory-row-icon">{practice.logoData ? <Image src={practice.logoData} alt="" width={34} height={34} unoptimized /> : <Building2 />}</span><span className="directory-row-copy"><b>{practice.name}</b><small>{practice.description || `${practice.type.replaceAll("_", " ")} · ${[practice.town, practice.region].filter(Boolean).join(", ") || "Namibia"}`} · {practice.services.length} service{practice.services.length === 1 ? "" : "s"}</small></span><ArrowRight size={17} /></Link>)}</div>
      {!practices.length && <div className="dashboard-empty">No practices are publicly available yet.</div>}
    </div></section>
  </main>;
}
