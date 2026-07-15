import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { MedicalAidSettingsManager } from "@/components/medical-aid-settings-manager";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function MedicalAidSettings(){const session=await requirePermission("MANAGE_MEDICAL_AID_SETTINGS");if(!session)notFound();const[funds,procedures,imports]=await Promise.all([db.medicalAid.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}]}),db.medicalAidProcedureItem.findMany({orderBy:{code:"asc"}}),db.icd10Import.findMany({orderBy:{importedAt:"desc"}})]);return <><PageHeading eyebrow="Claim configuration" title="Medical aid"/><MedicalAidSettingsManager funds={funds.map(item=>({...item,acceptedSubmissionMethods:item.acceptedSubmissionMethods}))} procedures={procedures} imports={imports.map(item=>({...item,importedAt:item.importedAt.toISOString()}))}/></>}
