export const GENERAL_PRACTICE_DEPARTMENT = {
  slug: "general-practice",
  name: "General Practitioner",
  categoryLabel: "Primary healthcare services",
  summary: "General Practice appointments",
  description: "General Practice booking is available.",
  status: "ACTIVE",
  public: true,
  bookingEnabled: true,
  sortOrder: 0,
} as const;

type DirectoryResetClient = {
  provider: {
    findMany(args: {
      select: { departmentId: true };
      distinct: ["departmentId"];
    }): Promise<Array<{ departmentId: string }>>;
  };
  departmentService: {
    deleteMany(args?: {
      where: { departmentId: { notIn: string[] } };
    }): Promise<unknown>;
  };
  department: {
    deleteMany(args?: {
      where: { id: { notIn: string[] } };
    }): Promise<unknown>;
    findUnique(args: {
      where: { slug: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: { data: typeof GENERAL_PRACTICE_DEPARTMENT }): Promise<unknown>;
  };
};

/**
 * Removes only directory records that are not required by a provider.
 * Provider rows are deliberately outside this helper's mutation interface.
 */
export async function resetProviderlessDirectory(tx: DirectoryResetClient) {
  const providerDepartments = await tx.provider.findMany({
    select: { departmentId: true },
    distinct: ["departmentId"],
  });
  const preservedDepartmentIds = providerDepartments.map(({ departmentId }) => departmentId);

  if (preservedDepartmentIds.length === 0) {
    await tx.departmentService.deleteMany();
    await tx.department.deleteMany();
  } else {
    await tx.departmentService.deleteMany({
      where: { departmentId: { notIn: preservedDepartmentIds } },
    });
    await tx.department.deleteMany({
      where: { id: { notIn: preservedDepartmentIds } },
    });
  }

  const bookingShell = await tx.department.findUnique({
    where: { slug: GENERAL_PRACTICE_DEPARTMENT.slug },
    select: { id: true },
  });
  if (!bookingShell) {
    await tx.department.create({ data: GENERAL_PRACTICE_DEPARTMENT });
  }

  return { preservedDepartmentIds };
}
