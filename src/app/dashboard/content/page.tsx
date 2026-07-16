import { PageHeading } from "@/components/dashboard";
import { ContentManager } from "@/components/content-manager";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_PRACTICE_CONTENT } from "../../../../../prisma/polyclinic-data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function WebsiteContentPage() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session) notFound();
  const record = await db.practiceContent.findUnique({ where: { id: "practice" } });
  return <><PageHeading eyebrow="Public website" title="Website content" /><ContentManager initial={record?.content || DEFAULT_PRACTICE_CONTENT} /></>;
}
