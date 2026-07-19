import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

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
  let summary="Practice and document settings updated";
  if(body.medicalAidId){
    const parsed=z.object({medicalAidId:z.string(),active:z.boolean(),public:z.boolean(),administrator:z.string().trim().max(120).nullable().optional()}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the medical aid settings."},{status:400});
    await db.medicalAid.update({where:{id:parsed.data.medicalAidId},data:{active:parsed.data.active,public:parsed.data.public,administrator:parsed.data.administrator||null}});
    summary="Medical aid configuration updated";
  }else if(body.bookingMode){
    const parsed=z.object({bookingMode:z.enum(["AVAILABLE_TIME","APPOINTMENT_REQUEST"])}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the booking mode."},{status:400});
    await db.practiceSetting.update({where:{id:"practice"},data:parsed.data});
    summary=`Booking mode changed to ${parsed.data.bookingMode}`;
  }else if("reminderEnabled" in body||"reminderLeadHours" in body){
    const parsed=z.object({reminderEnabled:z.boolean(),reminderLeadHours:z.number().int().min(1).max(168)}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Check the reminder settings."},{status:400});
    await db.practiceSetting.update({where:{id:"practice"},data:parsed.data});
    summary=`Reminder preparation ${parsed.data.reminderEnabled?"enabled":"disabled"} at ${parsed.data.reminderLeadHours} hours`;
  }else{
    const current=await db.practiceSetting.findUnique({where:{id:"practice"}});
    const parsed=detailsSchema.safeParse({...current,...body});
    if(!parsed.success)return NextResponse.json({error:"Check the settings you entered."},{status:400});
    await db.practiceSetting.update({where:{id:"practice"},data:parsed.data});
  }
  await db.activityLog.create({data:{userId:session.id,action:"PRACTICE_SETTINGS_UPDATED",entityType:"PracticeSetting",entityId:"practice",summary}});
  return NextResponse.json({ok:true});
}
