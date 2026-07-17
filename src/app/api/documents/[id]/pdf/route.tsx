import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getFinanceSession as getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceDocument } from "@/lib/invoice-document";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const session=await getSession();if(!session)return NextResponse.json({error:"Unauthorised"},{status:401});const{id}=await params;const download=new URL(request.url).searchParams.get("download")==="1";const[invoice,practice]=await Promise.all([db.invoice.findUnique({where:{id},include:{patient:true,lines:true}}),db.practiceSetting.findUnique({where:{id:"practice"}})]);if(!invoice||!practice)return NextResponse.json({error:"Document not found"},{status:404});const buffer=await renderToBuffer(<InvoiceDocument invoice={invoice} practice={practice}/>);await db.activityLog.create({data:{userId:session.id,action:download?"DOCUMENT_DOWNLOADED":"DOCUMENT_VIEWED",entityType:"Invoice",entityId:invoice.id,summary:`${download?"Downloaded":"Viewed"} ${invoice.number}`}});return new NextResponse(new Uint8Array(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`${download?"attachment":"inline"}; filename="${invoice.number}.pdf"`,"Cache-Control":"private, no-store"}});}
