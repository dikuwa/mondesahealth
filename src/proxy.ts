import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret, SESSION_AUDIENCE, SESSION_COOKIE, SESSION_ISSUER } from "@/lib/auth-config";

const secret=new TextEncoder().encode(getAuthSecret());
export default async function proxy(request:NextRequest){
  const token=request.cookies.get(SESSION_COOKIE)?.value;
  if(!token)return NextResponse.redirect(new URL("/login",request.url));
  try{
    const {payload}=await jwtVerify(token,secret,{issuer:SESSION_ISSUER,audience:SESSION_AUDIENCE});
    if(payload.scope!=="PRACTICE")return NextResponse.redirect(new URL("/platform",request.url));
    return NextResponse.next();
  }catch{
    return NextResponse.redirect(new URL("/login?reason=session-expired",request.url));
  }
}

export const config={matcher:["/dashboard/:path*"]};
