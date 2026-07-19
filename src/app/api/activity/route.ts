import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityWhere } from "@/lib/activity-query";

export async function GET(request:Request){const session=await requirePermission("VIEW_ACTIVITY");if(!session)return NextResponse.json({error:"Unauthorised"},{status:401});const url=new URL(request.url),page=Math.max(1,Number(url.searchParams.get("page"))||1),where=activityWhere(url.searchParams);const[rows,total]=await Promise.all([db.activityLog.findMany({where,include:{user:{select:{name:true}}},orderBy:{createdAt:"desc"},skip:(page-1)*50,take:50}),db.activityLog.count({where})]);return NextResponse.json({rows,total,page,pages:Math.max(1,Math.ceil(total/50))})}
