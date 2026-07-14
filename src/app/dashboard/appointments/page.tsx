import { PageHeading } from "@/components/dashboard";
import { AppointmentsManager } from "@/components/appointments-manager";
import { ManualAppointment } from "@/components/manual-appointment";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function Appointments(){const[rows,patients]=await Promise.all([db.appointment.findMany({include:{patient:{include:{memberships:{where:{current:true},include:{medicalAid:true}}}}},orderBy:{createdAt:"desc"},take:100}),db.patient.findMany({select:{id:true,fullName:true,patientNumber:true,phone:true},orderBy:{fullName:"asc"}})]);const serialised=rows.map(a=>({id:a.id,reference:a.reference,status:a.status,startAt:a.startAt?.toISOString()||null,preferredDate:a.preferredDate?.toISOString()||null,patient:{fullName:a.patient.fullName,phone:a.patient.phone,payment:a.patient.memberships[0]?.medicalAid?.abbreviation||a.patient.memberships[0]?.customFundName||"Private"}}));return <><PageHeading eyebrow="Schedule" title="Appointments" action={<ManualAppointment patients={patients}/>}/><AppointmentsManager rows={serialised}/></>}
