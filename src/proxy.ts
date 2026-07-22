import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret, SESSION_AUDIENCE, SESSION_COOKIE, SESSION_ISSUER } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { isPlatformHostname } from "@/lib/practice-domain";

const secret=new TextEncoder().encode(getAuthSecret());
export default async function proxy(request:NextRequest){
  const hostname=(request.headers.get("host")||"").split(":")[0].toLowerCase();
  if(hostname&&!isPlatformHostname(hostname)){
    const domain=await db.practiceDomain.findFirst({where:{hostname,status:"VERIFIED",verifiedAt:{not:null}},include:{practice:{select:{slug:true,status:true,publicVisible:true}}}});
    if(domain?.practice.status==="ACTIVE"&&domain.practice.publicVisible){
      const path=request.nextUrl.pathname==="/login"?"/login":request.nextUrl.pathname;
      return NextResponse.rewrite(new URL(`/practices/${domain.practice.slug}${path==="/"?"":path}${request.nextUrl.search}`,request.url));
    }
  }
  if(request.nextUrl.pathname==="/platform/login"){
    const destination=request.nextUrl.clone();
    destination.pathname="/platform-sign-in";
    return NextResponse.rewrite(destination);
  }
  if(!request.nextUrl.pathname.startsWith("/dashboard"))return NextResponse.next();
  const token=request.cookies.get(SESSION_COOKIE)?.value;
  if(!token)return NextResponse.redirect(new URL("/practices?reason=sign-in-required",request.url));
  try{
    const {payload}=await jwtVerify(token,secret,{issuer:SESSION_ISSUER,audience:SESSION_AUDIENCE});
    if(payload.scope!=="PRACTICE")return NextResponse.redirect(new URL("/platform",request.url));
    return NextResponse.next();
  }catch{
    return NextResponse.redirect(new URL("/login?reason=session-expired",request.url));
  }
}

export const config={matcher:["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]};
