import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";

export default async function PracticePortalChooser(){
  const practices=await db.practice.findMany({
    where:{status:{in:["ACTIVE","APPROVED"]}},
    select:{slug:true,name:true,town:true,region:true,publicVisible:true},
    orderBy:{name:"asc"},
  });
  return <main id="main-content" className="portal-chooser">
    <section className="portal-chooser-card">
      <p className="eyebrow">Practice portals</p>
      <h1 className="display">Choose your practice</h1>
      <p className="muted">Each practice has an independent login and private workspace.</p>
      <div className="practice-portal-list">
        {practices.map((practice)=><article key={practice.slug}>
          <span className="portal-practice-icon"><Building2 size={22}/></span>
          <div><strong>{practice.name}</strong><small>{[practice.town,practice.region].filter(Boolean).join(", ") || "Independent practice"}</small></div>
          <Link className="btn btn-primary" href={`/practices/${practice.slug}/login`}>Sign in <ExternalLink size={15}/></Link>
        </article>)}
        {!practices.length&&<p className="notice-warning">No active practice portals are available yet.</p>}
      </div>
      <Link href="/login">Back to portal choice</Link>
    </section>
  </main>;
}
