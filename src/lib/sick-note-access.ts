import { getPracticeSession, requirePermission } from "@/lib/auth";

export async function requireSickNoteViewer() {
  return requirePermission("VIEW_SICK_NOTES");
}

export async function requireSickNoteManager() {
  const session = await getPracticeSession();
  if (!session || !["OWNER", "ADMIN", "DOCTOR"].includes(session.role)) return null;
  if (session.role !== "OWNER" && !session.permissions.includes("MANAGE_SICK_NOTES")) return null;
  return session;
}
