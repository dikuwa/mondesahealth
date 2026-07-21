import { PageHeading } from "@/components/dashboard";
import { ContentManager } from "@/components/content-manager";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_PRACTICE_CONTENT } from "../../../../prisma/polyclinic-data";
import type { PracticeContent } from "@/lib/public-site";
import { genericPracticeContent } from "@/lib/generic-practice-content";
import { ORIGINAL_PRACTICE_ID } from "@/lib/practice-constants";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function WebsiteContentPage() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session) notFound();
  const [record, practice] = await Promise.all([
    db.practiceContent.findUnique({ where: { practiceId: session.practiceId } }),
    db.practice.findUnique({ where: { id: session.practiceId }, select: { name: true, type: true } }),
  ]);
  const initial =
    (record?.content as PracticeContent | undefined) ||
    (session.practiceId === ORIGINAL_PRACTICE_ID
      ? DEFAULT_PRACTICE_CONTENT
      : (genericPracticeContent(practice?.name || "Your practice", practice?.type) as unknown as PracticeContent));
  return (
    <>
      <PageHeading eyebrow="Public website" title="Website content" />
      <ContentManager initial={initial} />
    </>
  );
}
