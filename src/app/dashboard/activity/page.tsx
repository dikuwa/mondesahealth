import { format } from "date-fns";
import { PageHeading } from "@/components/dashboard";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function ActivityLog(){const logs=await db.activityLog.findMany({include:{user:true},orderBy:{createdAt:"desc"},take:200});return <><PageHeading eyebrow="Immutable audit trail" title="Activity log"/><div className="card" style={{padding:20}}>{logs.map(log=><div key={log.id} style={{display:"grid",gridTemplateColumns:"150px 180px 1fr 180px",gap:15,padding:"13px 5px",borderBottom:"1px solid #edf1ef",fontSize:13}}><span style={{color:"#6e807a"}}>{format(log.createdAt,"dd MMM yyyy HH:mm")}</span><b>{log.action.replaceAll("_"," ")}</b><span>{log.summary}</span><span>{log.user?.name||"Patient / system"}</span></div>)}</div></>}
