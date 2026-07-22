import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRACTICE_SUPPORT_SCOPES } from "@/lib/practice-support";
import { requestAuditInfo } from "@/lib/tenant";

const createInput=z.object({
  practiceId:z.string().min(1),
  reason:z.string().trim().min(10).max(1000),
  durationMinutes:z.number().int().min(15).max(480),
  scopes:z.array(z.enum(PRACTICE_SUPPORT_SCOPES)).min(1),
});

export async function POST(request:Request){
  const session=await requirePlatformPermission("MANAGE_SUPPORT_ACCESS");
  if(!session)return NextResponse.json({error:"Platform support permission is required."},{status:403});
  const parsed=createInput.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Add a reason, duration and safe support scope."},{status:400});
  const practice=await db.practice.findUnique({where:{id:parsed.data.practiceId},select:{id:true,name:true}});
  if(!practice)return NextResponse.json({error:"Practice not found."},{status:404});
  const existing=await db.practiceSupportRequest.findFirst({where:{practiceId:practice.id,requestedById:session.id,status:{in:["PENDING","APPROVED"]},revokedAt:null,OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}});
  if(existing)return NextResponse.json({error:"You already have an active or pending support request for this practice."},{status:409});
  const supportRequest=await db.$transaction(async tx=>{
    const created=await tx.practiceSupportRequest.create({data:{practiceId:practice.id,requestedById:session.id,reason:parsed.data.reason,durationMinutes:parsed.data.durationMinutes,scopes:JSON.stringify(parsed.data.scopes)}});
    await tx.activityLog.create({data:{userId:session.id,action:"PRACTICE_SUPPORT_REQUESTED",entityType:"PracticeSupportRequest",entityId:created.id,summary:`Requested owner-approved administration access to ${practice.name}`,requestInfo:requestAuditInfo(request)}});
    return created;
  });
  return NextResponse.json({id:supportRequest.id,status:supportRequest.status},{status:201});
}

export async function PATCH(request:Request){
  const session=await requirePlatformPermission("MANAGE_SUPPORT_ACCESS");
  if(!session)return NextResponse.json({error:"Platform support permission is required."},{status:403});
  const parsed=z.object({id:z.string().min(1),action:z.literal("ENTER")}).safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Choose an approved support request."},{status:400});
  const supportRequest=await db.practiceSupportRequest.findFirst({where:{id:parsed.data.id,requestedById:session.id,status:"APPROVED",revokedAt:null,expiresAt:{gt:new Date()}}});
  if(!supportRequest)return NextResponse.json({error:"This support request is not approved, has expired, or was revoked."},{status:409});
  const user=await db.user.findUnique({where:{id:session.id},select:{id:true,sessionVersion:true}});
  if(!user)return NextResponse.json({error:"Account not found."},{status:404});
  await createSession(user,{scope:"PRACTICE",practiceId:supportRequest.practiceId,supportRequestId:supportRequest.id,supportVersion:supportRequest.sessionVersion});
  await db.activityLog.create({data:{userId:session.id,action:"PRACTICE_SUPPORT_SESSION_STARTED",entityType:"PracticeSupportRequest",entityId:supportRequest.id,summary:"Started an owner-approved, scoped practice support session",requestInfo:requestAuditInfo(request)}});
  return NextResponse.json({ok:true,destination:"/dashboard"});
}

export async function DELETE(request:Request){
  const session=await requirePlatformPermission("MANAGE_SUPPORT_ACCESS");
  if(!session)return NextResponse.json({error:"Platform support permission is required."},{status:403});
  const id=new URL(request.url).searchParams.get("id");
  const supportRequest=id?await db.practiceSupportRequest.findFirst({where:{id,requestedById:session.id,revokedAt:null}}):null;
  if(!supportRequest)return NextResponse.json({error:"Support request not found."},{status:404});
  await db.$transaction([
    db.practiceSupportRequest.update({where:{id:supportRequest.id},data:{status:"REVOKED",revokedAt:new Date(),sessionVersion:{increment:1}}}),
    db.activityLog.create({data:{userId:session.id,action:"PRACTICE_SUPPORT_REVOKED",entityType:"PracticeSupportRequest",entityId:supportRequest.id,summary:"Revoked temporary practice administration support",requestInfo:requestAuditInfo(request)}}),
  ]);
  return NextResponse.json({ok:true});
}
