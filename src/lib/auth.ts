import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me");

export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  (await cookies()).set("mondesa_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 28800 });
}

export async function getSession() {
  const token = (await cookies()).get("mondesa_session")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as { id: string; role: string; name: string }; }
  catch { return null; }
}

export async function clearSession() { (await cookies()).delete("mondesa_session"); }
