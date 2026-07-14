import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret, SESSION_AUDIENCE, SESSION_COOKIE, SESSION_ISSUER } from "@/lib/auth-config";
import type { Permission } from "@/lib/permissions";

const secret=new TextEncoder().encode(getAuthSecret());
const access:Record<string,Permission>={
  "/dashboard":"VIEW_OVERVIEW",
  "/dashboard/appointments":"MANAGE_APPOINTMENTS",
  "/dashboard/patients":"MANAGE_PATIENTS",
  "/dashboard/claims":"MANAGE_CLAIMS",
  "/dashboard/finance":"MANAGE_FINANCE",
  "/dashboard/availability":"MANAGE_AVAILABILITY",
  "/dashboard/settings":"MANAGE_PRACTICE",
  "/dashboard/users":"MANAGE_USERS",
  "/dashboard/activity":"VIEW_ACTIVITY",
};

export default async function proxy(request:NextRequest){
  const token=request.cookies.get(SESSION_COOKIE)?.value;
  if(!token)return NextResponse.redirect(new URL("/login",request.url));
  try{
    const {payload}=await jwtVerify(token,secret,{issuer:SESSION_ISSUER,audience:SESSION_AUDIENCE});
    const permission=access[request.nextUrl.pathname];
    if(permission&&payload.role!=="OWNER"&&(!Array.isArray(payload.permissions)||!payload.permissions.includes(permission))){
      return new NextResponse("Forbidden",{status:403,headers:{"Cache-Control":"no-store"}});
    }
    return NextResponse.next();
  }catch{
    return NextResponse.redirect(new URL("/login?reason=session-expired",request.url));
  }
}

export const config={matcher:["/dashboard/:path*"]};
