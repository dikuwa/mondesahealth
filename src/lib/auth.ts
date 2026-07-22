import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  getAuthSecret,
  SESSION_AUDIENCE,
  SESSION_COOKIE,
  SESSION_HOURS,
  SESSION_ISSUER,
} from "@/lib/auth-config";
import { db } from "@/lib/db";
import { parsePermissions, type Permission } from "@/lib/permissions";
import {
  parsePlatformPermissions,
  type PlatformPermission,
  type PlatformRole,
} from "@/lib/platform-permissions";
import { parsePracticeSupportScopes, supportPermissions } from "@/lib/practice-support";

const secret = new TextEncoder().encode(getAuthSecret());

type SessionBase = {
  id: string;
  name: string;
  email: string;
  avatarData: string | null;
  mustChangePassword: boolean;
  hasPlatformAccess: boolean;
  supportRequestId: string | null;
};

export type PlatformSession = SessionBase & {
  scope: "PLATFORM";
  practiceId: null;
  role: PlatformRole;
  permissions: Permission[];
  platformRole: PlatformRole;
  platformPermissions: PlatformPermission[];
  isPrimaryPlatformOwner: boolean;
};

export type PracticeSession = SessionBase & {
  scope: "PRACTICE";
  practiceId: string;
  role: string;
  permissions: Permission[];
  platformRole: null;
  platformPermissions: [];
  isPrimaryPlatformOwner: false;
};

export type AuthSession = PlatformSession | PracticeSession;

export async function createSession(
  user: { id: string; sessionVersion: number },
  selection: { scope: "PLATFORM" } | { scope: "PRACTICE"; practiceId: string; supportRequestId?: string; supportVersion?: number },
) {
  const token = await new SignJWT({
    id: user.id,
    version: user.sessionVersion,
    scope: selection.scope,
    practiceId: selection.scope === "PRACTICE" ? selection.practiceId : null,
    supportRequestId: selection.scope === "PRACTICE" ? selection.supportRequestId || null : null,
    supportVersion: selection.scope === "PRACTICE" ? selection.supportVersion ?? null : null,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function getSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = (
      await jwtVerify(token, secret, {
        issuer: SESSION_ISSUER,
        audience: SESSION_AUDIENCE,
      })
    ).payload as {
      id?: unknown;
      version?: unknown;
      scope?: unknown;
      practiceId?: unknown;
      supportRequestId?: unknown;
      supportVersion?: unknown;
    };
    if (typeof payload.id !== "string" || typeof payload.version !== "number") return null;
    const user = await db.user.findUnique({
      where: { id: payload.id },
      include: { platformMembership: true },
    });
    if (!user?.active || user.sessionVersion !== payload.version) return null;
    const platformMembership = user.platformMembership?.active ? user.platformMembership : null;
    const requestedScope = payload.scope === "PRACTICE" ? "PRACTICE" : "PLATFORM";
    const base: SessionBase = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarData: user.avatarData,
      mustChangePassword: user.mustChangePassword,
      hasPlatformAccess: Boolean(platformMembership),
      supportRequestId: null,
    };

    if (requestedScope === "PLATFORM" && platformMembership) {
      const role = platformMembership.role as PlatformRole;
      return {
        ...base,
        scope: "PLATFORM",
        practiceId: null,
        role,
        permissions: [],
        platformRole: role,
        platformPermissions: parsePlatformPermissions(platformMembership.permissions, role),
        isPrimaryPlatformOwner: platformMembership.isPrimary,
      };
    }

    if (requestedScope === "PRACTICE" && typeof payload.supportRequestId === "string") {
      const request = await db.practiceSupportRequest.findFirst({
        where: {
          id: payload.supportRequestId,
          requestedById: user.id,
          status: "APPROVED",
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!request || payload.supportVersion !== request.sessionVersion || payload.practiceId !== request.practiceId) return null;
      return {
        ...base,
        scope: "PRACTICE",
        practiceId: request.practiceId,
        role: "PLATFORM_SUPPORT",
        permissions: supportPermissions(parsePracticeSupportScopes(request.scopes)),
        platformRole: null,
        platformPermissions: [],
        isPrimaryPlatformOwner: false,
        supportRequestId: request.id,
      };
    }

    const practiceId = typeof payload.practiceId === "string" ? payload.practiceId : user.practiceId;
    if (!practiceId) return null;
    const membership = await db.practiceUser.findUnique({
      where: { practiceId_userId: { practiceId, userId: user.id } },
    });
    if (membership && !membership.active) return null;
    if (!membership && user.practiceId !== practiceId) return null;
    const role = membership?.role || user.role;
    const permissions = parsePermissions(membership?.permissions || user.permissions, role);
    return {
      ...base,
      scope: "PRACTICE",
      practiceId,
      role,
      permissions,
      platformRole: null,
      platformPermissions: [],
      isPrimaryPlatformOwner: false,
      supportRequestId: null,
    };
  } catch {
    return null;
  }
}

export async function getPracticeSession(): Promise<PracticeSession | null> {
  const session = await getSession();
  return session?.scope === "PRACTICE" ? session : null;
}

export async function requirePermission(permission: Permission) {
  const session = await getPracticeSession();
  if (!session) return null;
  if (session.role === "OWNER" || session.permissions.includes(permission)) return session;
  return null;
}

export async function requirePlatformOwner(): Promise<PlatformSession | null> {
  const session = await getSession();
  return session?.scope === "PLATFORM" ? session : null;
}

export async function requirePlatformPermission(permission: PlatformPermission) {
  const session = await requirePlatformOwner();
  return session?.platformPermissions.includes(permission) ? session : null;
}

export async function getFinanceSession() {
  return requirePermission("MANAGE_FINANCE");
}

export async function hasSessionCookie() {
  return (await cookies()).has(SESSION_COOKIE);
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
