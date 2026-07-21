import { notFound } from "next/navigation";
import PracticePublicHome from "@/components/practice-public-home";
import { db } from "@/lib/db";

export default async function PracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const practice = await db.practice.findFirst({ where: { slug, status: "ACTIVE", publicVisible: true }, select: { id: true } });
  if (!practice) notFound();
  return <PracticePublicHome practiceId={practice.id} basePath={`/practices/${slug}`} />;
}
