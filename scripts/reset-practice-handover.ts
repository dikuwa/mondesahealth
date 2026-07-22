import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { hash } from "bcryptjs";
import { addDays } from "date-fns";
import { PrismaClient } from "@prisma/client";

const db=new PrismaClient({datasources:{db:{url:process.env.DIRECT_URL||process.env.DATABASE_URL}}});

const args=new Map(process.argv.slice(2).map(value=>{const [key,...rest]=value.split("=");return [key,rest.join("=")||"true"];}));
const practiceSlug=args.get("--practice")||"mondesa-health";
const platformEmail=(args.get("--platform")||"owner@mondesahealth.na").toLowerCase();
const ownerEmail=(args.get("--owner")||"hello@mondesahealth.na").toLowerCase();
const apply=args.has("--apply");
const temporaryPassword=()=>`${randomBytes(12).toString("base64url")}!7a`;

async function counts(practiceId:string){
  const [patients,appointments,encounters,invoices,payments,claims,services,content]=await Promise.all([
    db.patient.count({where:{practiceId}}),db.appointment.count({where:{practiceId}}),db.clinicalEncounter.count({where:{practiceId}}),
    db.invoice.count({where:{practiceId}}),db.payment.count({where:{practiceId}}),db.claim.count({where:{practiceId}}),
    db.departmentService.count({where:{practiceId}}),db.practiceContent.count({where:{practiceId}}),
  ]);
  return {patients,appointments,encounters,invoices,payments,claims,services,content};
}

async function main(){
  const [practice,platformOwner,practiceOwner]=await Promise.all([
    db.practice.findUnique({where:{slug:practiceSlug},select:{id:true,name:true,slug:true,status:true,publicVisible:true}}),
    db.user.findUnique({where:{email:platformEmail},include:{platformMembership:true,practiceMemberships:true}}),
    db.user.findUnique({where:{email:ownerEmail},include:{practiceMemberships:true}}),
  ]);
  if(!practice)throw new Error(`Practice ${practiceSlug} was not found.`);
  if(!platformOwner?.platformMembership?.active||!platformOwner.platformMembership.isPrimary)throw new Error("The supplied platform account is not the active primary owner.");
  if(!practiceOwner)throw new Error("The supplied independent practice owner was not found.");
  const ownerMembership=practiceOwner.practiceMemberships.find(item=>item.practiceId===practice.id);
  if(!ownerMembership?.active)throw new Error("The independent owner membership is not active; reset may already have been applied.");
  const snapshot=await counts(practice.id);
  const invitations=await db.userInvitation.count({where:{practiceId:practice.id}});
  console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",practice,platformOwner:{id:platformOwner.id,email:platformOwner.email,temporaryMembership:platformOwner.practiceMemberships.find(item=>item.practiceId===practice.id)?.active||false},independentOwner:{id:practiceOwner.id,email:practiceOwner.email,membershipActive:ownerMembership.active},invitations,preservedRecords:snapshot},null,2));
  if(!apply){console.log("Dry run only. No data was changed.");return;}
  if(process.env.CONFIRM_HANDOVER_RESET!==practice.slug)throw new Error(`Set CONFIRM_HANDOVER_RESET=${practice.slug} to apply.`);
  const backupPath=process.env.VERIFIED_BACKUP_PATH;
  if(!backupPath)throw new Error("VERIFIED_BACKUP_PATH must point to the encrypted backup verified immediately before reset.");
  const backup=await stat(resolve(backupPath));
  if(!backup.isFile()||!backupPath.endsWith(".dump.enc"))throw new Error("VERIFIED_BACKUP_PATH is not an encrypted dump file.");
  const platformPassword=temporaryPassword(),practicePassword=temporaryPassword(),rawToken=randomBytes(32).toString("base64url");
  const [platformHash,practiceHash]=await Promise.all([hash(platformPassword,12),hash(practicePassword,12)]);
  const now=new Date();
  await db.$transaction(async tx=>{
    await tx.practiceHandover.updateMany({where:{practiceId:practice.id,status:{not:"ROLLED_BACK"}},data:{status:"ROLLED_BACK",rolledBackAt:now,rollbackReason:"Safe reset requested before guided handover replay"}});
    await tx.practiceUser.upsert({where:{practiceId_userId:{practiceId:practice.id,userId:platformOwner.id}},create:{practiceId:practice.id,userId:platformOwner.id,role:"OWNER",permissions:"[]",active:true},update:{role:"OWNER",permissions:"[]",active:true}});
    await tx.user.update({where:{id:platformOwner.id},data:{practiceId:practice.id,passwordHash:platformHash,mustChangePassword:true,sessionVersion:{increment:1}}});
    await tx.practiceUser.update({where:{id:ownerMembership.id},data:{active:false}});
    await tx.user.update({where:{id:practiceOwner.id},data:{passwordHash:practiceHash,mustChangePassword:true,sessionVersion:{increment:1}}});
    await tx.userInvitation.updateMany({where:{practiceId:practice.id,acceptedAt:null,expiresAt:{gt:now}},data:{expiresAt:new Date(0)}});
    await tx.userInvitation.create({data:{practiceId:practice.id,email:practiceOwner.email,name:practiceOwner.name,role:"OWNER",tokenHash:createHash("sha256").update(rawToken).digest("hex"),expiresAt:addDays(now,7),invitedById:platformOwner.id}});
    await tx.practiceHandover.create({data:{practiceId:practice.id,status:"OWNER_INVITED",ownerEmail:practiceOwner.email,invitedAt:now,createdById:platformOwner.id,rollbackReason:"Fresh guided handover created by safe reset"}});
    await tx.activityLog.create({data:{userId:platformOwner.id,action:"PRACTICE_HANDOVER_ROLLED_BACK",entityType:"Practice",entityId:practice.id,summary:`Safely reset ${practice.name} handover after verified encrypted backup; all practice records preserved`}});
  },{maxWait:15_000,timeout:60_000});
  const after=await counts(practice.id);
  if(JSON.stringify(snapshot)!==JSON.stringify(after))throw new Error("Record-count invariant failed after reset. Restore from the verified backup and investigate immediately.");
  const credentialPath=resolve(process.env.HANDOVER_CREDENTIALS_FILE||`./.private/${practice.slug}-handover-credentials.json`);
  await mkdir(dirname(credentialPath),{recursive:true,mode:0o700});
  await writeFile(credentialPath,JSON.stringify({createdAt:now.toISOString(),warning:"One-time credentials. Replace both passwords immediately.",platform:{loginUrl:"/platform/login",email:platformOwner.email,password:platformPassword},practice:{loginUrl:`/practices/${practice.slug}/login`,invitationUrl:`/invite/${rawToken}`,email:practiceOwner.email,password:practicePassword},publicUrl:`/practices/${practice.slug}`},null,2),{mode:0o600,flag:"wx"});
  await chmod(credentialPath,0o600);
  console.log(`Reset complete. Record counts are unchanged. One-time credentials were written with mode 0600 to ${credentialPath}`);
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;}).finally(()=>db.$disconnect());
