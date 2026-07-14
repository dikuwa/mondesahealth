import { createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getAuthSecret } from "@/lib/auth-config";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const POLICIES = { credential: 5, network: 20 } as const;

type ThrottleKind = keyof typeof POLICIES;
type ThrottleKey = { key: string; kind: ThrottleKind };

export function requestAddress(request: Request) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export function loginThrottleKeys(email: string, address: string): ThrottleKey[] {
  const digest=(value:string)=>createHmac("sha256",getAuthSecret()).update(value).digest("hex");
  return [
    {kind:"credential",key:`credential:${digest(`credential:${email.trim().toLowerCase()}`)}`},
    {kind:"network",key:`network:${digest(`network:${address}`)}`},
  ];
}

export function retryAfterSeconds(blockedUntil: Date, now = new Date()) {
  return Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000));
}

function activeBlock(rows: {blockedUntil:Date|null}[], now:Date){
  return rows.reduce<Date|null>((latest,row)=>row.blockedUntil&&row.blockedUntil>now&&(!latest||row.blockedUntil>latest)?row.blockedUntil:latest,null);
}

export async function checkLoginThrottle(keys:ThrottleKey[],now=new Date()){
  const rows=await db.loginThrottle.findMany({where:{key:{in:keys.map(item=>item.key)}},select:{blockedUntil:true}});
  const blockedUntil=activeBlock(rows,now);
  return blockedUntil?{allowed:false as const,retryAfter:retryAfterSeconds(blockedUntil,now)}:{allowed:true as const};
}

async function recordOne(tx:Prisma.TransactionClient,item:ThrottleKey,now:Date){
  const current=await tx.loginThrottle.findUnique({where:{key:item.key}});
  const expired=!current||now.getTime()-current.windowStartedAt.getTime()>=WINDOW_MS;
  const failures=expired?1:current.failures+1;
  const blockedUntil=failures>=POLICIES[item.kind]?new Date(now.getTime()+WINDOW_MS):null;
  await tx.loginThrottle.upsert({where:{key:item.key},create:{key:item.key,failures,windowStartedAt:now,blockedUntil},update:{failures,windowStartedAt:expired?now:current!.windowStartedAt,blockedUntil}});
  return blockedUntil;
}

export async function recordFailedLogin(keys:ThrottleKey[],now=new Date()){
  const blocked=await db.$transaction(async tx=>Promise.all(keys.map(item=>recordOne(tx,item,now))),{isolationLevel:"Serializable"});
  const blockedUntil=activeBlock(blocked.map(value=>({blockedUntil:value})),now);
  return blockedUntil?{blocked:true as const,retryAfter:retryAfterSeconds(blockedUntil,now)}:{blocked:false as const};
}

export async function clearCredentialThrottle(keys:ThrottleKey[]){
  await db.loginThrottle.deleteMany({where:{key:{in:keys.filter(item=>item.kind==="credential").map(item=>item.key)}}});
}

export async function pruneLoginThrottles(now=new Date()){
  return db.loginThrottle.deleteMany({where:{updatedAt:{lt:new Date(now.getTime()-24*60*60*1000)}}});
}
