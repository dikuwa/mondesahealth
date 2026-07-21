import { notFound } from "next/navigation";
import PublicBookingPage from "@/components/public-booking-page";
import { db } from "@/lib/db";

export default async function TenantBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const practice = await db.practice.findFirst({ where: { slug, status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } }, select: { id: true } });
  if (!practice) notFound();
  return <PublicBookingPage practiceId={practice.id} />;
}
