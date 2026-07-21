import { NextResponse } from "next/server";
import { getPracticeSession } from "@/lib/auth";
import { ORIGINAL_PRACTICE_ID } from "@/lib/practice-constants";

export const LEGACY_PRACTICE_ID = ORIGINAL_PRACTICE_ID;

export async function requirePracticeSession() {
  return getPracticeSession();
}

export function tenantWhere<T extends object>(practiceId: string, where?: T) {
  return { ...where, practiceId } as T & { practiceId: string };
}

export function tenantDenied(
  message = "This record is not available in your practice.",
) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function requestAuditInfo(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return JSON.stringify({
    ip: forwarded || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 200) || null,
  });
}
