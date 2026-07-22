export const PLATFORM_PERMISSIONS = [
  "VIEW_PLATFORM_OVERVIEW",
  "VIEW_PRACTICES",
  "MANAGE_PRACTICES",
  "VIEW_APPLICATIONS",
  "MANAGE_APPLICATIONS",
  "VIEW_SERVICE_TEMPLATES",
  "MANAGE_SERVICE_TEMPLATES",
  "VIEW_PLATFORM_FINANCE",
  "MANAGE_SUBSCRIPTIONS",
  "RECORD_SUBSCRIPTION_PAYMENTS",
  "VIEW_PLATFORM_ANALYTICS",
  "VIEW_PLATFORM_AUDIT",
  "EXPORT_PLATFORM_DATA",
  "MANAGE_SUPPORT_ACCESS",
  "MANAGE_PLATFORM_USERS",
  "VIEW_PLATFORM_WEBSITE",
  "MANAGE_PLATFORM_WEBSITE",
  "TRANSFER_PLATFORM_OWNERSHIP",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_ROLES = [
  "PRIMARY_OWNER",
  "PLATFORM_ADMIN",
  "OPERATIONS",
  "FINANCE",
  "COMPLIANCE",
  "SUPPORT",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const platformRoleLabels: Record<PlatformRole, string> = {
  PRIMARY_OWNER: "Primary Owner",
  PLATFORM_ADMIN: "Platform Administrator",
  OPERATIONS: "Operations",
  FINANCE: "Finance",
  COMPLIANCE: "Compliance / Auditor",
  SUPPORT: "Support",
};

const without = (...permissions: PlatformPermission[]) =>
  PLATFORM_PERMISSIONS.filter((permission) => !permissions.includes(permission));

export const platformRoleDefaults: Record<PlatformRole, PlatformPermission[]> = {
  PRIMARY_OWNER: [...PLATFORM_PERMISSIONS],
  PLATFORM_ADMIN: without("TRANSFER_PLATFORM_OWNERSHIP"),
  OPERATIONS: [
    "VIEW_PLATFORM_OVERVIEW",
    "VIEW_PRACTICES",
    "MANAGE_PRACTICES",
    "VIEW_APPLICATIONS",
    "MANAGE_APPLICATIONS",
    "VIEW_SERVICE_TEMPLATES",
    "MANAGE_SERVICE_TEMPLATES",
    "VIEW_PLATFORM_ANALYTICS",
    "VIEW_PLATFORM_WEBSITE",
    "MANAGE_PLATFORM_WEBSITE",
  ],
  FINANCE: [
    "VIEW_PLATFORM_OVERVIEW",
    "VIEW_PRACTICES",
    "VIEW_PLATFORM_FINANCE",
    "MANAGE_SUBSCRIPTIONS",
    "RECORD_SUBSCRIPTION_PAYMENTS",
    "VIEW_PLATFORM_ANALYTICS",
    "EXPORT_PLATFORM_DATA",
  ],
  COMPLIANCE: [
    "VIEW_PLATFORM_OVERVIEW",
    "VIEW_PRACTICES",
    "VIEW_APPLICATIONS",
    "VIEW_PLATFORM_FINANCE",
    "VIEW_PLATFORM_ANALYTICS",
    "VIEW_PLATFORM_AUDIT",
    "VIEW_PLATFORM_WEBSITE",
    "EXPORT_PLATFORM_DATA",
  ],
  SUPPORT: [
    "VIEW_PLATFORM_OVERVIEW",
    "VIEW_PRACTICES",
    "MANAGE_SUPPORT_ACCESS",
  ],
};

export const platformPermissionLabels: Record<PlatformPermission, string> = {
  VIEW_PLATFORM_OVERVIEW: "View platform overview",
  VIEW_PRACTICES: "View registered practices",
  MANAGE_PRACTICES: "Register and manage practices",
  VIEW_APPLICATIONS: "View practice applications",
  MANAGE_APPLICATIONS: "Review and approve applications",
  VIEW_SERVICE_TEMPLATES: "View service templates",
  MANAGE_SERVICE_TEMPLATES: "Manage service templates",
  VIEW_PLATFORM_FINANCE: "View platform finance and billing",
  MANAGE_SUBSCRIPTIONS: "Manage plans and subscriptions",
  RECORD_SUBSCRIPTION_PAYMENTS: "Record subscription payments",
  VIEW_PLATFORM_ANALYTICS: "View aggregate platform analytics",
  VIEW_PLATFORM_AUDIT: "View platform audit events",
  EXPORT_PLATFORM_DATA: "Export platform reports",
  MANAGE_SUPPORT_ACCESS: "Manage exceptional support grants",
  MANAGE_PLATFORM_USERS: "Manage platform team access",
  VIEW_PLATFORM_WEBSITE: "View platform website content",
  MANAGE_PLATFORM_WEBSITE: "Edit and publish platform website content",
  TRANSFER_PLATFORM_OWNERSHIP: "Transfer primary ownership",
};

export function parsePlatformPermissions(value: string, role: string): PlatformPermission[] {
  if (role === "PRIMARY_OWNER") return [...PLATFORM_PERMISSIONS];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is PlatformPermission =>
        PLATFORM_PERMISSIONS.includes(item as PlatformPermission),
      );
    }
  } catch {}
  return platformRoleDefaults[role as PlatformRole] || [];
}

export function canGrantPlatformPermissions(
  actor: PlatformPermission[],
  requested: PlatformPermission[],
) {
  return requested.every((permission) => actor.includes(permission));
}
