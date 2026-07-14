import { PageHeading } from "@/components/dashboard";
import { db } from "@/lib/db";
import { SettingsManager } from "@/components/settings-manager";
export const dynamic="force-dynamic";
export default async function Settings(){const[s,funds]=await Promise.all([db.practiceSetting.findUnique({where:{id:"practice"}}),db.medicalAid.findMany({orderBy:{sortOrder:"asc"}})]);if(!s)return null;return <><PageHeading eyebrow="Practice configuration" title="Settings"/><SettingsManager setting={{practiceName:s.practiceName,doctorName:s.doctorName,practiceNumber:s.practiceNumber,registrationNumber:s.registrationNumber,phone:s.phone,whatsapp:s.whatsapp,email:s.email,address:s.address,currency:s.currency,signatureName:s.signatureName,signatureTitle:s.signatureTitle,vatEnabled:s.vatEnabled}} funds={funds.map(f=>({id:f.id,name:f.name,abbreviation:f.abbreviation,administrator:f.administrator,public:f.public,active:f.active}))}/></>}
