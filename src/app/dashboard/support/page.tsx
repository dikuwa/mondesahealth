import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PracticeSupportRequestsManager } from "@/components/practice-support-requests-manager";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePracticeSupportScopes } from "@/lib/practice-support";

export default async function PracticeSupportPage(){
  const session=await getPracticeSession();
  if(!session||session.role!=="OWNER"||session.supportRequestId)notFound();
  const requests=await db.practiceSupportRequest.findMany({where:{practiceId:session.practiceId},orderBy:{createdAt:"desc"},take:100});
  const users=await db.user.findMany({where:{id:{in:requests.map(item=>item.requestedById)}},select:{id:true,name:true,email:true}});
  const names=new Map(users.map(user=>[user.id,`${user.name} (${user.email})`]));
  return <><PageHeading eyebrow="Ownership & security" title="Temporary support access"/><p className="notice-info">Platform staff have no permanent access to this practice. Approve only a clear, time-limited request you recognise.</p><PracticeSupportRequestsManager requests={requests.map(item=>({id:item.id,requester:names.get(item.requestedById)||"Platform staff",reason:item.reason,scopes:parsePracticeSupportScopes(item.scopes),durationMinutes:item.durationMinutes,status:item.status,expiresAt:item.expiresAt?.toISOString()||null,revokedAt:item.revokedAt?.toISOString()||null,createdAt:item.createdAt.toISOString()}))}/></>;
}
