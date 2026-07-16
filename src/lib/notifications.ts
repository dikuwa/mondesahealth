import { db } from "@/lib/db";

export async function notifyStaff(input: { type: string; title: string; message: string; href: string }) {
  const users = await db.user.findMany({ where: { active: true, role: { in: ["OWNER", "ADMIN", "RECEPTIONIST"] } }, select: { id: true } });
  if (!users.length) return;
  await db.notification.createMany({ data: users.map((user) => ({ userId: user.id, ...input })) });
}
