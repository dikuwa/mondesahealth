export const PERMISSIONS = [
  "VIEW_OVERVIEW","MANAGE_APPOINTMENTS","MANAGE_PATIENTS","MANAGE_CLAIMS",
  "MANAGE_FINANCE","MANAGE_AVAILABILITY","MANAGE_PRACTICE","VIEW_ACTIVITY","MANAGE_USERS",
] as const;

export type Permission = typeof PERMISSIONS[number];
export const ROLES = ["OWNER","ADMIN","DOCTOR","RECEPTIONIST","BILLING"] as const;
export type StaffRole = typeof ROLES[number];

export const roleDefaults: Record<StaffRole, Permission[]> = {
  OWNER:[...PERMISSIONS],
  ADMIN:[...PERMISSIONS],
  DOCTOR:["VIEW_OVERVIEW","MANAGE_APPOINTMENTS","MANAGE_PATIENTS","MANAGE_CLAIMS","VIEW_ACTIVITY"],
  RECEPTIONIST:["VIEW_OVERVIEW","MANAGE_APPOINTMENTS","MANAGE_PATIENTS","MANAGE_AVAILABILITY"],
  BILLING:["VIEW_OVERVIEW","MANAGE_CLAIMS","MANAGE_FINANCE"],
};

export function parsePermissions(value:string,role:string):Permission[]{
  try { const parsed=JSON.parse(value); if(Array.isArray(parsed)&&parsed.length)return parsed.filter((item):item is Permission=>PERMISSIONS.includes(item)); } catch {}
  return roleDefaults[role as StaffRole]||[];
}

export const permissionLabels:Record<Permission,string>={
  VIEW_OVERVIEW:"View dashboard overview",MANAGE_APPOINTMENTS:"Manage appointments",MANAGE_PATIENTS:"Manage patients",
  MANAGE_CLAIMS:"Manage medical aid claims",MANAGE_FINANCE:"Manage invoices and payments",MANAGE_AVAILABILITY:"Manage availability",
  MANAGE_PRACTICE:"Manage practice settings",VIEW_ACTIVITY:"View activity log",MANAGE_USERS:"Manage staff and permissions",
};
