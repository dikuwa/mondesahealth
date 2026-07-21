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
import { resolveAccountScope } from "@/lib/account-scope";

const secret = new TextEncoder().encode(getAuthSecret());

type SessionBase = {
  id: string;
  role: string;
  name: string;
  email: string;
  avatarData: string | null;
  permissions: Permission[];
  mustChangePassword: boolean;
};

export type PlatformSession = SessionBase & {
  scope: "PLATFORM";
  practiceId: null;
  platformRole: "PLATFORM_OWNER";
};

export type PracticeSession = SessionBase & {
  scope: "PRACTICE";
  practiceId: string;
  platformRole: null;
};

export type TransitionalSession = SessionBase & {
  scope: "TRANSITIONAL";
  practiceId: string;
  platformRole: "PLATFORM_OWNER";
};

export type AuthSession = PlatformSession | PracticeSession | TransitionalSession;

export async function createSession(user: {
  id: string;
  sessionVersion: number;
  role: string;
  permissions: Permission[];
  practiceId: string | null;
  platformRole?: string | null;
}) {
  const token = await new SignJWT({
    id: user.id,
    version: user.sessionVersion,
    role: user.role,
    permissions: user.permissions,
    practiceId: user.practiceId,
    platformRole: user.platformRole,
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
    ).payload as { id?: unknown; version?: unknown };
    if (typeof payload.id !== "string" || typeof payload.version !== "number")
      return null;
    const user = await db.user.findUnique({ where: { id: payload.id } });
    if (!user?.active || user.sessionVersion !== payload.version) return null;
    const base: SessionBase = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatarData: user.avatarData,
      permissions: parsePermissions(user.permissions, user.role),
      mustChangePassword: user.mustChangePassword,
    };
    const scope = resolveAccountScope(user.platformRole, user.practiceId);
    if (scope === "TRANSITIONAL" || scope === "PLATFORM") {
      return scope === "TRANSITIONAL"
        ? {
            ...base,
            scope: "TRANSITIONAL",
            practiceId: user.practiceId!,
            platformRole: "PLATFORM_OWNER",
          }
        : {
            ...base,
            scope: "PLATFORM",
            practiceId: null,
            platformRole: "PLATFORM_OWNER",
          };
    }
    if (scope !== "PRACTICE" || !user.practiceId) return null;
    return {
      ...base,
      scope: "PRACTICE",
      practiceId: user.practiceId,
      platformRole: null,
    };
  } catch {
    return null;
  }
}

export async function getPracticeSession(): Promise<
  PracticeSession | TransitionalSession | null
> {
  const session = await getSession();
  return session?.scope === "PRACTICE" || session?.scope === "TRANSITIONAL"
    ? session
    : null;
}

export async function requirePermission(permission: Permission) {
  const session = await getPracticeSession();
  if (!session) return null;
  if (session.role === "OWNER" || session.permissions.includes(permission))
    return session;
  return null;
}

export async function requirePlatformOwner(): Promise<
  PlatformSession | TransitionalSession | null
> {
  const session = await getSession();
  return session?.platformRole === "PLATFORM_OWNER" ? session : null;
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
