import type { Permission } from "@/lib/permissions";

export const PRACTICE_SUPPORT_SCOPES = [
  "WEBSITE_BRANDING",
  "SERVICES",
  "SETTINGS",
  "OPERATIONAL_DIAGNOSTICS",
] as const;
export type PracticeSupportScope = typeof PRACTICE_SUPPORT_SCOPES[number];

export const practiceSupportScopeLabels:Record<PracticeSupportScope,string>={
  WEBSITE_BRANDING:"Website and branding",
  SERVICES:"Services and providers",
  SETTINGS:"Practice settings",
  OPERATIONAL_DIAGNOSTICS:"Operational diagnostics",
};

export function parsePracticeSupportScopes(value:string):PracticeSupportScope[]{
  try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return parsed.filter((scope):scope is PracticeSupportScope=>PRACTICE_SUPPORT_SCOPES.includes(scope));}catch{}
  return [];
}

export function supportPermissions(scopes:PracticeSupportScope[]):Permission[]{
  const permissions=new Set<Permission>();
  if(scopes.includes("WEBSITE_BRANDING")||scopes.includes("SERVICES")||scopes.includes("SETTINGS"))permissions.add("MANAGE_PRACTICE");
  if(scopes.includes("OPERATIONAL_DIAGNOSTICS"))permissions.add("VIEW_OVERVIEW");
  return [...permissions];
}
