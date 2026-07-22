import { describe, expect, it } from "vitest";
import {
  PLATFORM_PERMISSIONS,
  canGrantPlatformPermissions,
  parsePlatformPermissions,
  platformRoleDefaults,
} from "@/lib/platform-permissions";

describe("platform permissions", () => {
  it("always gives the primary owner every platform permission", () => {
    expect(parsePlatformPermissions("[]", "PRIMARY_OWNER")).toEqual(PLATFORM_PERMISSIONS);
  });

  it("keeps finance and support access separated", () => {
    expect(platformRoleDefaults.FINANCE).toContain("VIEW_PLATFORM_FINANCE");
    expect(platformRoleDefaults.FINANCE).not.toContain("MANAGE_SUPPORT_ACCESS");
    expect(platformRoleDefaults.SUPPORT).toContain("MANAGE_SUPPORT_ACCESS");
    expect(platformRoleDefaults.SUPPORT).not.toContain("VIEW_PLATFORM_FINANCE");
  });

  it("prevents granting permissions the actor does not hold", () => {
    expect(canGrantPlatformPermissions(platformRoleDefaults.OPERATIONS, ["MANAGE_PRACTICES"])).toBe(true);
    expect(canGrantPlatformPermissions(platformRoleDefaults.OPERATIONS, ["MANAGE_PLATFORM_USERS"])).toBe(false);
  });

  it("separates website publishing from practice workspaces", () => {
    expect(platformRoleDefaults.OPERATIONS).toContain("MANAGE_PLATFORM_WEBSITE");
    expect(platformRoleDefaults.COMPLIANCE).toContain("VIEW_PLATFORM_WEBSITE");
    expect(platformRoleDefaults.SUPPORT).not.toContain("MANAGE_PLATFORM_WEBSITE");
  });
});
