import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform-shell";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformOwner();
  if (!session) redirect("/login");
  const legacyPractice = session.scope === "TRANSITIONAL"
    ? await db.practice.findUnique({ where: { id: session.practiceId }, select: { name: true } })
    : null;
  return <PlatformShell user={{ name: session.name, avatarData: session.avatarData }} legacyPractice={legacyPractice}>{children}</PlatformShell>;
}
