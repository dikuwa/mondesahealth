import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { classifySettingsRequest } from "@/lib/settings-payload";

const detailsSchema=z.object({
  practiceName:z.string().trim().min(2),doctorName:z.string().trim().min(2),
  practiceNumber:z.string().trim().min(1),registrationNumber:z.string().trim().min(1),
  phone:z.string().trim().min(7),whatsapp:z.string().trim().min(7),email:z.string().email(),
  address:z.string().trim().min(4),currency:z.string().trim().length(3),
  signatureName:z.string().trim().min(2),signatureTitle:z.string().trim().min(2),vatEnabled:z.boolean(),
  tagline:z.string().trim().min(10).max(160),publicDescription:z.string().trim().min(20).max(1000),
  locationNote:z.string().trim().max(240),mapsUrl:z.union([z.literal(""),z.string().url()]),
  mapLatitude:z.number().min(-90).max(90).nullable(),mapLongitude:z.number().min(-180).max(180).nullable(),
  publicHours:z.string().trim().max(1000).nullable(),showEmail:z.boolean(),showWhatsapp:z.boolean(),
  claimContactName:z.string().trim().max(160),claimPhone:z.string().trim().max(80),claimEmail:z.union([z.literal(""),z.string().email()]),
  claimPostalAddress:z.string().trim().max(500),consentWording:z.string().trim().min(20).max(2000),
});

export async function PATCH(request:Request){
  const session=await requirePermission("MANAGE_PRACTICE");
  if(!session)return NextResponse.json({error:"You do not have permission to update practice settings."},{status:403});
  const body=await request.json();
  const requestKind=classifySettingsRequest(body);
  let summary="Practice and document settings updated";
  if(requestKind==="MEDICAL_AID"){
    const parsed=z.object({medicalAidId:z.string(),active:z.boolean(),public:z.boolean(),administrator:z.string().trim().max(120).nullable().optional()}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the medical aid settings."},{status:400});
    await db.medicalAid.update({where:{id:parsed.data.medicalAidId},data:{active:parsed.data.active,public:parsed.data.public,administrator:parsed.data.administrator||null}});
    summary="Medical aid configuration updated";
  }else if(requestKind==="BOOKING"){
    const parsed=z.object({bookingMode:z.enum(["AVAILABLE_TIME","APPOINTMENT_REQUEST"])}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the booking mode."},{status:400});
    await db.practiceSetting.update({where:{practiceId:session.practiceId},data:parsed.data});
    summary=`Booking mode changed to ${parsed.data.bookingMode}`;
  }else if(requestKind==="REMINDER"){
    const parsed=z.object({reminderEnabled:z.boolean(),reminderLeadHours:z.number().int().min(1).max(168)}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the reminder settings."},{status:400});
    await db.practiceSetting.update({where:{practiceId:session.practiceId},data:parsed.data});
    summary=`Reminder preparation ${parsed.data.reminderEnabled?"enabled":"disabled"} at ${parsed.data.reminderLeadHours} hours`;
  }else if(requestKind==="AI"){
    if(session.role!=="OWNER")return NextResponse.json({error:"Only the Owner can configure AI-assisted intake."},{status:403});
    const parsed=z.object({aiIntakeEnabled:z.boolean(),aiImageEnabled:z.boolean()}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the AI intake settings."},{status:400});
    await db.practiceSetting.update({where:{practiceId:session.practiceId},data:parsed.data});
    summary=`AI-assisted intake ${parsed.data.aiIntakeEnabled?"enabled":"disabled"}; images ${parsed.data.aiImageEnabled?"enabled":"disabled"}`;
  }else if(requestKind==="DETAILS"){
    const current=await db.practiceSetting.findUnique({where:{practiceId:session.practiceId}});
    const parsed=detailsSchema.safeParse({...current,...body});
    if(!parsed.success)return NextResponse.json({error:"Check the settings you entered."},{status:400});
    await db.practiceSetting.update({where:{practiceId:session.practiceId},data:parsed.data});
  }else{
    return NextResponse.json({error:"Check the settings you entered."},{status:400});
  }
  await db.activityLog.create({data:{userId:session.id,practiceId:session.practiceId,action:"PRACTICE_SETTINGS_UPDATED",entityType:"PracticeSetting",entityId:session.practiceId,summary}});
  return NextResponse.json({ok:true});
}
