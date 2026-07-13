import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(request:Request){const parsed=z.object({email:z.string().email(),password:z.string().min(8)}).safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Enter a valid email and password."},{status:400});const user=await db.user.findUnique({where:{email:parsed.data.email.toLowerCase()}});if(!user||!user.active||!await compare(parsed.data.password,user.passwordHash))return NextResponse.json({error:"The email or password is incorrect."},{status:401});await createSession({id:user.id,role:user.role,name:user.name});await db.activityLog.create({data:{userId:user.id,action:"USER_LOGIN",entityType:"User",entityId:user.id,summary:"Signed in to dashboard"}});return NextResponse.json({ok:true});}
