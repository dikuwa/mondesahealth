import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENERAL_PRACTICE_DEPARTMENT,
  resetProviderlessDirectory,
} from "./practice-reset";

type Department = {
  id: string;
  slug: string;
  name: string;
  categoryLabel: string;
  summary: string;
  description: string;
  status: string;
  public: boolean;
  bookingEnabled: boolean;
  sortOrder: number;
};
type Service = { id: string; departmentId: string; name: string };
type Provider = {
  id: string;
  departmentId: string;
  displayName: string;
  practiceName: string | null;
  biography: string | null;
  phone: string | null;
  email: string | null;
  operatingHours: string | null;
  public: boolean;
  sortOrder: number;
};

function directoryFixture({ providers = true, generalHasProvider = false } = {}) {
  const linkedDepartment: Department = {
    id: generalHasProvider ? "general" : "linked",
    ...GENERAL_PRACTICE_DEPARTMENT,
    slug: generalHasProvider ? "general-practice" : "provider-department",
    name: generalHasProvider ? "Preserved custom general practice" : "Provider department",
    summary: "Preserved summary",
    description: "Preserved description",
    public: false,
    bookingEnabled: false,
    sortOrder: 17,
  };
  const providerRows: Provider[] = providers
    ? [{
        id: "provider-1",
        departmentId: linkedDepartment.id,
        displayName: "Synthetic Provider",
        practiceName: "Synthetic Practice",
        biography: "Synthetic biography",
        phone: "+264 00 000 0000",
        email: "synthetic@example.invalid",
        operatingHours: "Synthetic hours",
        public: true,
        sortOrder: 9,
      }]
    : [];
  const departments: Department[] = [
    linkedDepartment,
    {
      id: "providerless",
      ...GENERAL_PRACTICE_DEPARTMENT,
      slug: "providerless",
      name: "Providerless",
    },
  ];
  const services: Service[] = [
    { id: "linked-service", departmentId: linkedDepartment.id, name: "Linked service" },
    { id: "providerless-service", departmentId: "providerless", name: "Providerless service" },
  ];
  let bookingShellCreates = 0;

  const client = {
    provider: {
      async findMany() {
        return [...new Set(providerRows.map(({ departmentId }) => departmentId))].map((departmentId) => ({ departmentId }));
      },
    },
    departmentService: {
      async deleteMany(args?: { where: { departmentId: { notIn: string[] } } }) {
        const preserved = args?.where.departmentId.notIn ?? [];
        for (let index = services.length - 1; index >= 0; index -= 1) {
          if (!preserved.includes(services[index].departmentId)) services.splice(index, 1);
        }
      },
    },
    department: {
      async deleteMany(args?: { where: { id: { notIn: string[] } } }) {
        const preserved = args?.where.id.notIn ?? [];
        for (let index = departments.length - 1; index >= 0; index -= 1) {
          if (!preserved.includes(departments[index].id)) departments.splice(index, 1);
        }
      },
      async findUnique({ where }: { where: { slug: string }; select: { id: true } }) {
        const row = departments.find(({ slug }) => slug === where.slug);
        return row ? { id: row.id } : null;
      },
      async create({ data }: { data: typeof GENERAL_PRACTICE_DEPARTMENT }) {
        bookingShellCreates += 1;
        departments.push({ id: "created-general", ...data });
      },
    },
  };

  return {
    client: client as Parameters<typeof resetProviderlessDirectory>[0],
    departments,
    services,
    providerRows,
    bookingShellCreates: () => bookingShellCreates,
  };
}

describe("provider-safe practice reset", () => {
  it("preserves complete provider snapshots and their linked department and services", async () => {
    const fixture = directoryFixture();
    const providerBefore = structuredClone(fixture.providerRows);
    const linkedDepartmentBefore = structuredClone(fixture.departments[0]);
    const linkedServiceBefore = structuredClone(fixture.services[0]);

    await resetProviderlessDirectory(fixture.client);

    expect(fixture.providerRows).toEqual(providerBefore);
    expect(fixture.departments).toContainEqual(linkedDepartmentBefore);
    expect(fixture.services).toContainEqual(linkedServiceBefore);
    expect(fixture.departments.some(({ id }) => id === "providerless")).toBe(false);
    expect(fixture.services.some(({ id }) => id === "providerless-service")).toBe(false);
  });

  it("does not overwrite a provider-linked general-practice department", async () => {
    const fixture = directoryFixture({ generalHasProvider: true });
    const departmentBefore = structuredClone(fixture.departments[0]);

    await resetProviderlessDirectory(fixture.client);

    expect(fixture.departments).toContainEqual(departmentBefore);
    expect(fixture.bookingShellCreates()).toBe(0);
  });

  it("removes all directory records and recreates the booking shell when no providers exist", async () => {
    const fixture = directoryFixture({ providers: false });

    await resetProviderlessDirectory(fixture.client);

    expect(fixture.providerRows).toEqual([]);
    expect(fixture.services).toEqual([]);
    expect(fixture.departments).toEqual([
      { id: "created-general", ...GENERAL_PRACTICE_DEPARTMENT },
    ]);
    expect(fixture.bookingShellCreates()).toBe(1);
  });

  it("never invokes provider deletion in the reset route", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/practice/reset/route.ts"),
      "utf8",
    );
    expect(route).not.toContain("provider.deleteMany");
  });
});

describe("reset copy and sidebar badge contract", () => {
  it("states provider preservation and removes the former public-directory warning", () => {
    const settings = readFileSync(
      join(process.cwd(), "src/components/settings-manager.tsx"),
      "utf8",
    );
    expect(settings).not.toContain("public directory content will be removed");
    expect(settings).toContain("Provider records and their linked department/service configuration");
    expect(settings).toContain("Providerless directory records");
    expect(settings).toContain("Providers preserved");
  });

  it("uses a generic route badge with an exact 8px centred label gap", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/dashboard-shell.tsx"),
      "utf8",
    );
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(shell).toContain("notificationCountsByRoute[href]");
    expect(shell).toContain("dashboard-nav-label-with-badge");
    expect(css).toMatch(
      /\.dashboard-nav-label-with-badge\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*gap:\s*8px;/,
    );
    const badgeRule = css.match(/\.dashboard-nav-count\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(badgeRule).not.toContain("margin-left");
  });
});
