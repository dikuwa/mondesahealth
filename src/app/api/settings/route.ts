import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function PATCH(request:Request){const session=await getSession();if(!session)return NextResponse.json({error:"Unauthorised"},{status:401});const parsed=z.object({bookingMode:z.enum(["AVAILABLE_TIME","APPOINTMENT_REQUEST"])}).safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid settings"},{status:400});await db.$transaction([db.practiceSetting.update({where:{id:"practice"},data:parsed.data}),db.activityLog.create({data:{userId:session.id,action:"PRACTICE_SETTINGS_UPDATED",entityType:"PracticeSetting",entityId:"practice",summary:`Booking mode changed to ${parsed.data.bookingMode}`}})]);return NextResponse.json({ok:true});}
