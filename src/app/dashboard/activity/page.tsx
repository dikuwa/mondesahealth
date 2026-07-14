import { format } from "date-fns";
import { PageHeading } from "@/components/dashboard";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function ActivityLog(){const logs=await db.activityLog.findMany({include:{user:true},orderBy:{createdAt:"desc"},take:200});return <><PageHeading eyebrow="Immutable audit trail" title="Activity log"/><div className="card dashboard-card" style={{padding:20}}>{logs.map(log=><div key={log.id} className="activity-row"><span style={{color:"#6e807a"}}>{format(log.createdAt,"dd MMM yyyy HH:mm")}</span><b>{log.action.replaceAll("_"," ")}</b><span>{log.summary}</span><span>{log.user?.name||"Patient / system"}</span></div>)}</div></>}
