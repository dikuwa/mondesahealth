export const PERMISSIONS = [
  "VIEW_OVERVIEW","MANAGE_APPOINTMENTS","MANAGE_PATIENTS","MANAGE_CLAIMS",
  "MANAGE_FINANCE","MANAGE_AVAILABILITY","MANAGE_PRACTICE","VIEW_ACTIVITY","MANAGE_USERS",
  "MANAGE_MEDICAL_AID_SETTINGS","IMPORT_ICD10","SEARCH_ICD10","MANAGE_MEMBERSHIPS",
  "MANAGE_CONSENTS","VIEW_CLAIMS","EDIT_CLAIMS","VALIDATE_CLAIMS","SUBMIT_CLAIMS",
  "RECORD_CLAIM_OUTCOMES","MANAGE_CLAIM_BATCHES","EXPORT_CLAIM_DOCUMENTS",
  "VIEW_CLINICAL_INTAKE","USE_CLINICAL_AI",
  "VIEW_SICK_NOTES","MANAGE_SICK_NOTES",
  "VIEW_CLINICAL_RECORDS","MANAGE_CLINICAL_RECORDS","AMEND_CLINICAL_RECORDS",
  "MANAGE_PRACTICES","MANAGE_SUBSCRIPTIONS","VIEW_PLATFORM_AUDIT",
] as const;

export type Permission = typeof PERMISSIONS[number];
export const ROLES = ["OWNER","ADMIN","DOCTOR","RECEPTIONIST","BILLING"] as const;
export type StaffRole = typeof ROLES[number];

export const roleDefaults: Record<StaffRole, Permission[]> = {
  OWNER:[...PERMISSIONS],
  ADMIN:PERMISSIONS.filter(permission=>permission!=="IMPORT_ICD10"&&permission!=="MANAGE_USERS"),
  DOCTOR:["VIEW_OVERVIEW","MANAGE_APPOINTMENTS","MANAGE_PATIENTS","MANAGE_CLAIMS","VIEW_CLAIMS","EDIT_CLAIMS","VALIDATE_CLAIMS","SEARCH_ICD10","MANAGE_CONSENTS","EXPORT_CLAIM_DOCUMENTS","VIEW_ACTIVITY","VIEW_CLINICAL_INTAKE","USE_CLINICAL_AI","VIEW_SICK_NOTES","MANAGE_SICK_NOTES","VIEW_CLINICAL_RECORDS","MANAGE_CLINICAL_RECORDS","AMEND_CLINICAL_RECORDS"],
  RECEPTIONIST:["VIEW_OVERVIEW","MANAGE_APPOINTMENTS","MANAGE_PATIENTS","MANAGE_AVAILABILITY","MANAGE_MEMBERSHIPS","MANAGE_CONSENTS"],
  BILLING:["VIEW_OVERVIEW","MANAGE_CLAIMS","MANAGE_FINANCE","VIEW_CLAIMS","EDIT_CLAIMS","VALIDATE_CLAIMS","SUBMIT_CLAIMS","RECORD_CLAIM_OUTCOMES","MANAGE_CLAIM_BATCHES","SEARCH_ICD10","EXPORT_CLAIM_DOCUMENTS"],
};

export function parsePermissions(value:string,role:string):Permission[]{
  try { const parsed=JSON.parse(value); if(Array.isArray(parsed)&&parsed.length)return parsed.filter((item):item is Permission=>PERMISSIONS.includes(item)); } catch {}
  return roleDefaults[role as StaffRole]||[];
}

export const permissionLabels:Record<Permission,string>={
  VIEW_OVERVIEW:"View dashboard overview",MANAGE_APPOINTMENTS:"Manage appointments",MANAGE_PATIENTS:"Manage patients",
  MANAGE_CLAIMS:"Manage medical aid claims",MANAGE_FINANCE:"Manage invoices and payments",MANAGE_AVAILABILITY:"Manage availability",
  MANAGE_PRACTICE:"Manage practice settings",VIEW_ACTIVITY:"View activity log",MANAGE_USERS:"Manage staff and permissions",
  MANAGE_MEDICAL_AID_SETTINGS:"Manage medical-aid settings",IMPORT_ICD10:"Import ICD-10 datasets",SEARCH_ICD10:"Search ICD-10 codes",
  MANAGE_MEMBERSHIPS:"Manage patient medical-aid records",MANAGE_CONSENTS:"Manage ICD-10 consent",VIEW_CLAIMS:"View claim information",
  EDIT_CLAIMS:"Create and edit claims",VALIDATE_CLAIMS:"Validate and mark claims ready",SUBMIT_CLAIMS:"Submit claims",
  RECORD_CLAIM_OUTCOMES:"Record claim outcomes",MANAGE_CLAIM_BATCHES:"Manage claim batches",EXPORT_CLAIM_DOCUMENTS:"Export claim documents",
  VIEW_CLINICAL_INTAKE:"View sensitive patient symptom intake",USE_CLINICAL_AI:"Use clinician AI assistance",
  VIEW_SICK_NOTES:"View sick notes and medical certificates",MANAGE_SICK_NOTES:"Create, issue, share and revoke sick notes",
  VIEW_CLINICAL_RECORDS:"View clinical records",MANAGE_CLINICAL_RECORDS:"Create and complete clinical encounters",AMEND_CLINICAL_RECORDS:"Amend completed clinical encounters",
  MANAGE_PRACTICES:"Manage platform practices",MANAGE_SUBSCRIPTIONS:"Manage practice subscriptions",VIEW_PLATFORM_AUDIT:"View platform security audit events",
};
