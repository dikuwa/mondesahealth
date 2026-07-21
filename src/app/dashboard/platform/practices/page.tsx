import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { PracticeManager } from "@/components/practice-manager";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PracticesPage() {
  if (!(await requirePlatformOwner())) notFound();
  const [practices, plans, serviceTemplates] = await Promise.all([
    db.practice.findMany({ orderBy: { createdAt: "desc" } }),
    db.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { fee: "asc" },
    }),
    db.departmentService.findMany({
      where: { practiceId: "mondesa-health", active: true },
      include: { department: { select: { name: true } } },
      orderBy: [{ department: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);
  return (
    <>
      <PageHeading eyebrow="Platform administration" title="Practices" />
      <PracticeManager
        initial={practices.map(
          ({
            id,
            name,
            type,
            ownerName,
            email,
            town,
            status,
            publicVisible,
            subscriptionStatus,
          }) => ({
            id,
            name,
            type,
            ownerName,
            email,
            town,
            status,
            publicVisible,
            subscriptionStatus,
          }),
        )}
        plans={plans.map(({ id, name }) => ({ id, name }))}
        serviceTemplates={serviceTemplates.map((service) => ({
          id: service.id,
          name: service.name,
          department: service.department.name,
        }))}
      />
    </>
  );
}
