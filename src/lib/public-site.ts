import { db } from "@/lib/db";

export type PublicSiteConfig = {
  practiceName: string;
  tagline: string;
  publicDescription: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string;
  locationNote: string;
  mapsUrl: string;
  mapLatitude: number | null;
  mapLongitude: number | null;
  publicHours: string | null;
};

export type PublicDepartment = {
  id: string;
  slug: string;
  name: string;
  categoryLabel: string;
  summary: string;
  description: string;
  status: string;
  bookingEnabled: boolean;
  services: { id: string; name: string; description: string | null }[];
  providers: {
    id: string;
    displayName: string;
    practiceName: string | null;
    biography: string | null;
    phone: string | null;
    email: string | null;
    operatingHours: string | null;
  }[];
};

export async function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  const setting = await db.practiceSetting.findUnique({ where: { id: "practice" } });
  if (!setting) throw new Error("Practice settings are not configured.");
  return {
    practiceName: setting.practiceName,
    tagline: setting.tagline,
    publicDescription: setting.publicDescription,
    phone: setting.phone,
    whatsapp: setting.showWhatsapp ? setting.whatsapp : null,
    email: setting.showEmail ? setting.email : null,
    address: setting.address,
    locationNote: setting.locationNote,
    mapsUrl: setting.mapsUrl,
    mapLatitude: setting.mapLatitude,
    mapLongitude: setting.mapLongitude,
    publicHours: setting.publicHours?.trim() || null,
  };
}

export async function getPublicDepartments(): Promise<PublicDepartment[]> {
  return db.department.findMany({
    where: { public: true },
    select: {
      id: true,
      slug: true,
      name: true,
      categoryLabel: true,
      summary: true,
      description: true,
      status: true,
      bookingEnabled: true,
      services: {
        where: { public: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, description: true },
      },
      providers: {
        where: { public: true },
        orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
        select: {
          id: true,
          displayName: true,
          practiceName: true,
          biography: true,
          phone: true,
          email: true,
          operatingHours: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPublicDepartment(slug: string) {
  return db.department.findFirst({
    where: { slug, public: true },
    select: {
      id: true,
      slug: true,
      name: true,
      categoryLabel: true,
      summary: true,
      description: true,
      status: true,
      bookingEnabled: true,
      services: {
        where: { public: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, description: true },
      },
      providers: {
        where: { public: true },
        orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
        select: {
          id: true,
          displayName: true,
          practiceName: true,
          biography: true,
          phone: true,
          email: true,
          operatingHours: true,
        },
      },
    },
  });
}
