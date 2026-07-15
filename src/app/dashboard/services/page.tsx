import { notFound } from "next/navigation";
import { DirectoryManager } from "@/components/directory-manager";
import { PageHeading } from "@/components/dashboard";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ServicesAndProvidersPage() {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session) notFound();
  const departments = await db.department.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { services: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }, providers: { orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] } },
  });
  return <><PageHeading eyebrow="Public directory" title="Services & providers" /><DirectoryManager departments={departments} /></>;
}
