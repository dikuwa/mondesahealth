import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLES, roleDefaults } from "@/lib/permissions";
import { passwordSchema } from "@/lib/password";
import { practiceWriteDenied } from "@/lib/practice-write-access";

const role=z.enum(ROLES),permissions=z.array(z.enum(PERMISSIONS));
export async function POST(request:Request){
  const session=await requirePermission("MANAGE_USERS");
  if(!session)return NextResponse.json({error:"You do not have permission to create staff accounts."},{status:403});
  const restricted=await practiceWriteDenied(session.practiceId);if(restricted)return restricted;
  const parsed=z.object({name:z.string().trim().min(2).max(80),email:z.string().email(),password:passwordSchema,role,permissions:permissions.optional()}).safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Check the staff details."},{status:400});
  if(parsed.data.role==="OWNER"&&session.role!=="OWNER")return NextResponse.json({error:"Only the owner can create another owner."},{status:403});
  const email=parsed.data.email.toLowerCase();
  const existing=await db.user.findUnique({where:{email},include:{platformMembership:true}});
  if(existing?.platformMembership?.active){
    const rawToken=randomBytes(32).toString("base64url");
    await db.$transaction(async tx=>{
      await tx.userInvitation.updateMany({where:{practiceId:session.practiceId,email,acceptedAt:null,expiresAt:{gt:new Date()}},data:{expiresAt:new Date(0)}});
      await tx.userInvitation.create({data:{practiceId:session.practiceId,email,name:parsed.data.name,role:parsed.data.role,tokenHash:createHash("sha256").update(rawToken).digest("hex"),expiresAt:new Date(Date.now()+7*24*60*60*1000),invitedById:session.id}});
      await tx.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"PRACTICE_MEMBERSHIP_INVITED",entityType:"User",entityId:existing.id,summary:`Invited existing platform account as ${parsed.data.role.toLowerCase()}`}});
    });
    return NextResponse.json({name:parsed.data.name,inviteUrl:`/invite/${rawToken}`,existingAccount:true},{status:201});
  }
  try{
    const user=await db.$transaction(async tx=>{
      const created=await tx.user.create({data:{name:parsed.data.name,email,passwordHash:await hash(parsed.data.password,12),role:parsed.data.role,permissions:JSON.stringify(parsed.data.permissions||roleDefaults[parsed.data.role]),mustChangePassword:true,practiceId:session.practiceId}});
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
  const restricted=await practiceWriteDenied(session.practiceId);if(restricted)return restricted;
  const parsed=z.object({id:z.string(),role:role.optional(),permissions:permissions.optional(),active:z.boolean().optional(),password:passwordSchema.optional()}).safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Check the staff account changes."},{status:400});
  const membership=await db.practiceUser.findUnique({where:{practiceId_userId:{practiceId:session.practiceId,userId:parsed.data.id}},include:{user:{include:{platformMembership:true}}}});
  if(!membership)return NextResponse.json({error:"Staff account not found."},{status:404});
  const target=membership.user;
  if(target.platformMembership&&parsed.data.password)return NextResponse.json({error:"Practice owners cannot reset a platform account password. The platform user must manage it from Platform Profile."},{status:403});
  if((membership.role==="OWNER"||parsed.data.role==="OWNER")&&session.role!=="OWNER")return NextResponse.json({error:"Only the owner can assign or modify owner access."},{status:403});
  if(target.id===session.id&&(parsed.data.active===false||parsed.data.role&&parsed.data.role!=="OWNER"&&membership.role==="OWNER"))return NextResponse.json({error:"You cannot revoke your own owner access."},{status:400});
  const data:{role?:string;permissions?:string;active?:boolean;passwordHash?:string;mustChangePassword?:boolean;sessionVersion?:{increment:number}}={sessionVersion:{increment:1}};
  if(parsed.data.role)data.role=parsed.data.role;
  if(parsed.data.permissions)data.permissions=JSON.stringify(parsed.data.permissions);
  if(parsed.data.active!==undefined)data.active=parsed.data.active;
  if(parsed.data.password){data.passwordHash=await hash(parsed.data.password,12);data.mustChangePassword=true}
  const membershipData={role:parsed.data.role,permissions:parsed.data.permissions?JSON.stringify(parsed.data.permissions):undefined,active:parsed.data.active};
  await db.$transaction(async tx=>{
    await tx.practiceUser.update({where:{id:membership.id},data:membershipData});
    if(target.platformMembership){await tx.user.update({where:{id:target.id},data:{sessionVersion:{increment:1},passwordHash:data.passwordHash,mustChangePassword:data.mustChangePassword}})}
    else await tx.user.update({where:{id:target.id},data});
    await tx.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"USER_UPDATED",entityType:"User",entityId:target.id,summary:"Updated practice membership access"}});
  });
  return NextResponse.json({ok:true,password:parsed.data.password||null});
}

export async function DELETE(request:Request){
  const session=await requirePermission("MANAGE_USERS");
  if(!session||session.role!=="OWNER")return NextResponse.json({error:"Only the owner can permanently delete staff accounts."},{status:403});
  const restricted=await practiceWriteDenied(session.practiceId);if(restricted)return restricted;
  const parsed=z.object({id:z.string().min(1),confirmation:z.literal("DELETE STAFF USER")}).safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Type DELETE STAFF USER to permanently delete this staff account."},{status:400});
  if(parsed.data.id===session.id)return NextResponse.json({error:"You cannot delete your own signed-in account."},{status:400});
  const membership=await db.practiceUser.findUnique({where:{practiceId_userId:{practiceId:session.practiceId,userId:parsed.data.id}},include:{user:{include:{platformMembership:true,
    appointments:{select:{id:true}},payments:{select:{id:true}},logs:{select:{id:true}},appointmentResponses:{select:{id:true}},
    icd10Imports:{select:{id:true}},consentsCaptured:{select:{id:true}},claimsCreated:{select:{id:true}},claimEvents:{select:{id:true}},
    batchesSubmitted:{select:{id:true}},claimAttachments:{select:{id:true}},notifications:{select:{id:true}},
    sickNotesAsDoctor:{select:{id:true}},sickNotesCreated:{select:{id:true}},sickNotesUpdated:{select:{id:true}},
  }}}});
  if(!membership)return NextResponse.json({error:"Staff account not found."},{status:404});
  const target=membership.user;
  if(membership.role==="OWNER")return NextResponse.json({error:"Owner accounts cannot be deleted from the dashboard. Disable or transfer ownership first."},{status:409});
  if(target.platformMembership){await db.$transaction([db.practiceUser.delete({where:{id:membership.id}}),db.user.update({where:{id:target.id},data:{sessionVersion:{increment:1}}}),db.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"USER_DELETED",entityType:"User",entityId:target.id,summary:`Removed practice membership for platform account ${target.email}`}})]);return NextResponse.json({ok:true,accountRetained:true});}
  const protectedReferences=target.appointments.length+target.payments.length+target.logs.length+target.appointmentResponses.length+target.icd10Imports.length+target.consentsCaptured.length+target.claimsCreated.length+target.claimEvents.length+target.batchesSubmitted.length+target.claimAttachments.length+target.sickNotesAsDoctor.length+target.sickNotesCreated.length+target.sickNotesUpdated.length;
  if(protectedReferences>0)return NextResponse.json({error:`This user is linked to ${protectedReferences} audit, clinical, payment or claim record${protectedReferences===1?"":"s"}. Disable the account instead to preserve history.`},{status:409});
  await db.$transaction(async(tx)=>{
    await tx.notification.deleteMany({where:{userId:target.id}});
    await tx.user.delete({where:{id:target.id}});
    await tx.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"USER_DELETED",entityType:"User",entityId:target.id,summary:`Permanently deleted staff account ${target.email}`}});
  });
  return NextResponse.json({ok:true});
}
