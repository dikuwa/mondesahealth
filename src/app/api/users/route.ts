import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLES, roleDefaults } from "@/lib/permissions";
import { passwordSchema } from "@/lib/password";

const role=z.enum(ROLES),permissions=z.array(z.enum(PERMISSIONS));
export async function POST(request:Request){
  const session=await requirePermission("MANAGE_USERS");
  if(!session)return NextResponse.json({error:"You do not have permission to create staff accounts."},{status:403});
  const parsed=z.object({name:z.string().trim().min(2).max(80),email:z.string().email(),password:passwordSchema,role,permissions:permissions.optional()}).safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Check the staff details."},{status:400});
  if(parsed.data.role==="OWNER"&&session.role!=="OWNER")return NextResponse.json({error:"Only the owner can create another owner."},{status:403});
  try{
    const user=await db.$transaction(async tx=>{
      const created=await tx.user.create({data:{name:parsed.data.name,email:parsed.data.email.toLowerCase(),passwordHash:await hash(parsed.data.password,12),role:parsed.data.role,permissions:JSON.stringify(parsed.data.permissions||roleDefaults[parsed.data.role]),mustChangePassword:true,practiceId:session.practiceId}});
      await tx.practiceUser.create({data:{practiceId:session.practiceId,userId:created.id,role:created.role,permissions:created.permissions}});
      await tx.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"USER_CREATED",entityType:"User",entityId:created.id,summary:`Created ${created.role.toLowerCase()} staff account`}});
      return created;
    });
    return NextResponse.json({id:user.id,password:parsed.data.password},{status:201});
  }catch(error){
    console.error("Create staff account failed", error);
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"That login email is already in use."},{status:409});
    if(error instanceof Error&&error.message.includes("Unique constraint"))return NextResponse.json({error:"That login email is already in use."},{status:409});
    return NextResponse.json({error:"Could not create the staff account."},{status:500});
  }
}

export async function PATCH(request:Request){
  const session=await requirePermission("MANAGE_USERS");
  if(!session)return NextResponse.json({error:"You do not have permission to manage staff accounts."},{status:403});
  const parsed=z.object({id:z.string(),role:role.optional(),permissions:permissions.optional(),active:z.boolean().optional(),password:passwordSchema.optional()}).safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Check the staff account changes."},{status:400});
  const target=await db.user.findFirst({where:{id:parsed.data.id,practiceId:session.practiceId}});
  if(!target)return NextResponse.json({error:"Staff account not found."},{status:404});
  if((target.role==="OWNER"||parsed.data.role==="OWNER")&&session.role!=="OWNER")return NextResponse.json({error:"Only the owner can assign or modify owner access."},{status:403});
  if(target.id===session.id&&(parsed.data.active===false||parsed.data.role&&parsed.data.role!=="OWNER"&&target.role==="OWNER"))return NextResponse.json({error:"You cannot revoke your own owner access."},{status:400});
  const data:{role?:string;permissions?:string;active?:boolean;passwordHash?:string;mustChangePassword?:boolean;sessionVersion?:{increment:number}}={sessionVersion:{increment:1}};
  if(parsed.data.role)data.role=parsed.data.role;
  if(parsed.data.permissions)data.permissions=JSON.stringify(parsed.data.permissions);
  if(parsed.data.active!==undefined)data.active=parsed.data.active;
  if(parsed.data.password){data.passwordHash=await hash(parsed.data.password,12);data.mustChangePassword=true}
  await db.$transaction([db.user.update({where:{id:target.id,practiceId:session.practiceId},data}),db.practiceUser.updateMany({where:{userId:target.id,practiceId:session.practiceId},data:{role:parsed.data.role,permissions:parsed.data.permissions?JSON.stringify(parsed.data.permissions):undefined,active:parsed.data.active}}),db.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"USER_UPDATED",entityType:"User",entityId:target.id,summary:"Updated staff account access"}})]);
  return NextResponse.json({ok:true,password:parsed.data.password||null});
}

export async function DELETE(request:Request){
  const session=await requirePermission("MANAGE_USERS");
  if(!session||session.role!=="OWNER")return NextResponse.json({error:"Only the owner can permanently delete staff accounts."},{status:403});
  const parsed=z.object({id:z.string().min(1),confirmation:z.literal("DELETE STAFF USER")}).safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Type DELETE STAFF USER to permanently delete this staff account."},{status:400});
  if(parsed.data.id===session.id)return NextResponse.json({error:"You cannot delete your own signed-in account."},{status:400});
  const target=await db.user.findFirst({where:{id:parsed.data.id,practiceId:session.practiceId},include:{
    appointments:{select:{id:true}},payments:{select:{id:true}},logs:{select:{id:true}},appointmentResponses:{select:{id:true}},
    icd10Imports:{select:{id:true}},consentsCaptured:{select:{id:true}},claimsCreated:{select:{id:true}},claimEvents:{select:{id:true}},
    batchesSubmitted:{select:{id:true}},claimAttachments:{select:{id:true}},notifications:{select:{id:true}},
    sickNotesAsDoctor:{select:{id:true}},sickNotesCreated:{select:{id:true}},sickNotesUpdated:{select:{id:true}},
  }});
  if(!target)return NextResponse.json({error:"Staff account not found."},{status:404});
  if(target.role==="OWNER")return NextResponse.json({error:"Owner accounts cannot be deleted from the dashboard. Disable or transfer ownership first."},{status:409});
  const protectedReferences=target.appointments.length+target.payments.length+target.logs.length+target.appointmentResponses.length+target.icd10Imports.length+target.consentsCaptured.length+target.claimsCreated.length+target.claimEvents.length+target.batchesSubmitted.length+target.claimAttachments.length+target.sickNotesAsDoctor.length+target.sickNotesCreated.length+target.sickNotesUpdated.length;
  if(protectedReferences>0)return NextResponse.json({error:`This user is linked to ${protectedReferences} audit, clinical, payment or claim record${protectedReferences===1?"":"s"}. Disable the account instead to preserve history.`},{status:409});
  await db.$transaction(async(tx)=>{
    await tx.notification.deleteMany({where:{userId:target.id}});
    await tx.user.delete({where:{id:target.id}});
    await tx.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"USER_DELETED",entityType:"User",entityId:target.id,summary:`Permanently deleted staff account ${target.email}`}});
  });
  return NextResponse.json({ok:true});
}
