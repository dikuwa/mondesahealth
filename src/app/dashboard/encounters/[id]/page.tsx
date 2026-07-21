import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { EncounterEditor } from "@/components/encounter-editor";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function EncounterPage({params}:{params:Promise<{id:string}>}){const session=await requirePermission("VIEW_CLINICAL_RECORDS");if(!session)notFound();const{id}=await params;const encounter=await db.clinicalEncounter.findFirst({where:{id,practiceId:session.practiceId},include:{patient:true}});if(!encounter)notFound();return <><PageHeading eyebrow="Clinical encounter" title={`${encounter.patient.fullName} · ${encounter.startedAt.toLocaleDateString("en-NA")}`}/><EncounterEditor patientName={encounter.patient.fullName} initial={{...encounter,patientId:encounter.patientId,appointmentId:encounter.appointmentId||undefined}}/></>}
