import { PageHeading } from "@/components/dashboard";
import { PatientManager } from "@/components/patient-manager";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function Patients(){
  const[patients,funds,session]=await Promise.all([
    db.patient.findMany({where:{archivedAt:null},include:{memberships:{where:{current:true},include:{medicalAid:true}},_count:{select:{appointments:true,claims:true}}},orderBy:{createdAt:"desc"}}),
    db.medicalAid.findMany({where:{active:true},orderBy:{sortOrder:"asc"}}),
    getSession(),
  ]);
  const canManageSickNotes=Boolean(session&&(session.role==="OWNER"||(["ADMIN","DOCTOR"].includes(session.role)&&session.permissions.includes("MANAGE_SICK_NOTES"))));
  return <><PageHeading eyebrow="Patient records" title="Patients"/><PatientManager canManageSickNotes={canManageSickNotes} funds={funds.map(f=>({id:f.id,name:f.name}))} initial={patients.map(p=>({id:p.id,fullName:p.fullName,patientNumber:p.patientNumber,createdAt:p.createdAt.toISOString(),dateOfBirth:p.dateOfBirth?.toISOString()||null,gender:p.gender,phone:p.phone,email:p.email,preferredMethod:p.preferredMethod,medicalAid:p.memberships[0]?.medicalAid?.abbreviation||p.memberships[0]?.customFundName||"",medicalAidId:p.memberships[0]?.medicalAidId||"",membershipNumber:p.memberships[0]?.membershipNumber||"",visits:p._count.appointments}))}/></>
}
