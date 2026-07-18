import { PageHeading } from "@/components/dashboard";
import { AvailabilityManager } from "@/components/availability-manager";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function Availability(){const[settings,rules,blocks]=await Promise.all([db.practiceSetting.findUnique({where:{id:"practice"}}),db.availabilityRule.findMany({orderBy:{weekday:"asc"}}),db.blockedTime.findMany({where:{endAt:{gte:new Date()}},orderBy:{startAt:"asc"}})]);return <><PageHeading eyebrow="Scheduling rules" title="Availability"/><AvailabilityManager initialBookingMode={settings?.bookingMode||"AVAILABLE_TIME"} initialRules={rules.map(r=>({weekday:r.weekday,active:r.active,openTime:r.openTime,closeTime:r.closeTime,durationMinutes:r.durationMinutes}))} blocks={blocks.map(b=>({id:b.id,startAt:b.startAt.toISOString(),endAt:b.endAt.toISOString(),reason:b.reason}))}/></>}
