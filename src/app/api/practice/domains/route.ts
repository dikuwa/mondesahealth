import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePracticeHostname } from "@/lib/practice-domain";

export async function POST(request:Request){
  const session=await getPracticeSession();
  if(!session||session.role!=="OWNER"||session.supportRequestId)return NextResponse.json({error:"Only the practice owner can add domains."},{status:403});
  const parsed=z.object({hostname:z.string().trim().min(4).max(253)}).safeParse(await request.json().catch(()=>null));
  const hostname=parsed.success?normalizePracticeHostname(parsed.data.hostname):null;
  if(!hostname)return NextResponse.json({error:"Enter a valid domain such as practice.com."},{status:400});
  if(await db.practiceDomain.findUnique({where:{hostname}}))return NextResponse.json({error:"That domain is already registered."},{status:409});
  const token=`mh-domain-${randomBytes(18).toString("hex")}`;
  const domain=await db.practiceDomain.create({data:{practiceId:session.practiceId,hostname,verificationToken:token,dnsInstructions:JSON.stringify({cname:{name:"@ or www",value:"cname.vercel-dns.com"},txt:{name:"_mondesa-health",value:token}})}});
  await db.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"PRACTICE_DOMAIN_ADDED",entityType:"PracticeDomain",entityId:domain.id,summary:`Added ${hostname} for verification`}});
  return NextResponse.json({id:domain.id,status:domain.status},{status:201});
}

export async function DELETE(request:Request){
  const session=await getPracticeSession();
  if(!session||session.role!=="OWNER"||session.supportRequestId)return NextResponse.json({error:"Only the practice owner can remove domains."},{status:403});
  const id=new URL(request.url).searchParams.get("id");
  const domain=id?await db.practiceDomain.findFirst({where:{id,practiceId:session.practiceId}}):null;
  if(!domain)return NextResponse.json({error:"Domain not found."},{status:404});
  await db.practiceDomain.delete({where:{id:domain.id}});
  await db.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"PRACTICE_DOMAIN_REMOVED",entityType:"PracticeDomain",entityId:domain.id,summary:`Removed ${domain.hostname}`}});
  return NextResponse.json({ok:true});
}
