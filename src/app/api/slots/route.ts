import { NextResponse } from "next/server";
import { availableSlots } from "@/lib/slots";
export async function GET(request:Request){const params=new URL(request.url).searchParams,date=params.get("date"),practiceId=params.get("practiceId")||"mondesa-health",providerId=params.get("providerId")||undefined,serviceId=params.get("serviceId")||undefined;if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"A valid date is required."},{status:400});return NextResponse.json({slots:await availableSlots(date,new Date(),practiceId,providerId,serviceId)});}
