import { notFound } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { ProviderApplicationsManager } from "@/components/provider-applications-manager";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Applications() {
  if (!(await requirePlatformPermission("VIEW_APPLICATIONS"))) notFound();
  const [applications, plans, serviceTemplates] = await Promise.all([
    db.practiceApplication.findMany({ orderBy: { createdAt: "desc" } }),
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
      <PageHeading
        eyebrow="Platform administration"
        title="Provider applications"
      />
      <ProviderApplicationsManager
        canManage={Boolean((await requirePlatformPermission("MANAGE_APPLICATIONS")))}
        applications={applications.map((application) => ({
          ...application,
          createdAt: application.createdAt.toISOString(),
        }))}
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
