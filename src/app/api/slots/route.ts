import { NextResponse } from "next/server";
import { availableSlots } from "@/lib/slots";
export async function GET(request:Request){const date=new URL(request.url).searchParams.get("date");if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"A valid date is required."},{status:400});return NextResponse.json({slots:await availableSlots(date)});}
