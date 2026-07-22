import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

export async function PATCH(request:Request){
  const session=await getPracticeSession();
  if(!session||session.role!=="OWNER"||session.supportRequestId)return NextResponse.json({error:"Only the independent practice owner can decide support requests."},{status:403});
  const parsed=z.object({id:z.string().min(1),decision:z.enum(["APPROVE","REJECT","REVOKE"])}).safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Choose approve, reject, or revoke."},{status:400});
  const supportRequest=await db.practiceSupportRequest.findFirst({where:{id:parsed.data.id,practiceId:session.practiceId}});
  if(!supportRequest)return NextResponse.json({error:"Support request not found."},{status:404});
  const now=new Date();
  if(parsed.data.decision==="APPROVE"&&supportRequest.status!=="PENDING")return NextResponse.json({error:"Only pending requests can be approved."},{status:409});
  if(parsed.data.decision==="REJECT"&&supportRequest.status!=="PENDING")return NextResponse.json({error:"Only pending requests can be rejected."},{status:409});
  const data=parsed.data.decision==="APPROVE"
    ?{status:"APPROVED",decidedById:session.id,decidedAt:now,expiresAt:addMinutes(now,supportRequest.durationMinutes)}
    :parsed.data.decision==="REJECT"
      ?{status:"REJECTED",decidedById:session.id,decidedAt:now}
      :{status:"REVOKED",revokedAt:now,sessionVersion:{increment:1 as const}};
  await db.$transaction([
    db.practiceSupportRequest.update({where:{id:supportRequest.id},data}),
    db.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:`PRACTICE_SUPPORT_${parsed.data.decision}D`,entityType:"PracticeSupportRequest",entityId:supportRequest.id,summary:`Practice owner ${parsed.data.decision.toLowerCase()}d temporary administration support`,requestInfo:requestAuditInfo(request)}}),
  ]);
  return NextResponse.json({ok:true});
}
