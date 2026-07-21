import { notFound } from "next/navigation";
import PracticeServicesPage from "@/components/practice-services-page";
import { db } from "@/lib/db";

export default async function TenantServices({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const practice = await db.practice.findFirst({ where: { slug, status: "ACTIVE", publicVisible: true }, select: { id: true } });
  if (!practice) notFound();
  return <PracticeServicesPage practiceId={practice.id} basePath={`/practices/${slug}`} />;
}
