import type { PrismaClient } from "@prisma/client";

export const POLYCLINIC_LOCATION = {
  practiceName: "Mondesa Health Polyclinic",
  tagline: "Your Health. Your Choice. Your Community.",
  publicDescription:
    "Mondesa Health Polyclinic brings together multiple healthcare disciplines under one roof, providing convenient access to quality healthcare services for individuals, families, and the community.",
  phone: "+264 83 783 7216",
  address:
    "Erf 1083, Vrede Rede Street, Mahetago, Mondesa, Swakopmund",
  locationNote: "Across from Mondesa Police Station",
  mapsUrl:
    "https://www.google.com/maps?q=-22.658405303955078,14.546859741210938&z=17&hl=en",
  mapLatitude: -22.658405303955078,
  mapLongitude: 14.546859741210938,
  showEmail: false,
  showWhatsapp: false,
};

export const DEPARTMENTS = [
  {
    slug: "general-practice",
    name: "General Practitioner",
    categoryLabel: "Primary healthcare services",
    summary:
      "Everyday medical care for individuals and families, from acute illness to long-term health support.",
    description:
      "General Practice provides accessible, patient-centred primary healthcare, with careful assessment, clear explanations and coordinated follow-through.",
    status: "ACTIVE",
    bookingEnabled: true,
    services: [
      "General consultations",
      "Family medicine",
      "Chronic disease management",
      "Acute illness management",
      "Women’s health",
      "Men’s health",
      "Children’s healthcare",
      "Preventative healthcare",
      "Medical examinations",
      "Occupational health services",
      "Health screening programmes",
    ],
  },
  {
    slug: "dental-practice",
    name: "Dental Practice",
    categoryLabel: "Oral healthcare services",
    summary:
      "Preventative and general oral healthcare in a convenient community setting.",
    description:
      "The planned dental practice will provide oral examinations, preventative care and common dental procedures.",
    status: "COMING_SOON",
    bookingEnabled: false,
    services: [
      "Dental consultations",
      "Oral examinations",
      "Preventative dentistry",
      "Dental hygiene",
      "Fillings",
      "Extractions",
      "General dental procedures",
    ],
  },
  {
    slug: "laboratory-services",
    name: "Laboratory Services / PathLab",
    categoryLabel: "Diagnostic laboratory services",
    summary:
      "Planned diagnostic testing, preparation guidance and future digital result access.",
    description:
      "The laboratory service is planned to support routine pathology, monitoring and preventative health investigations, with future secure electronic result delivery.",
    status: "COMING_SOON",
    bookingEnabled: false,
    services: [
      "Blood tests",
      "Urine analysis",
      "Routine pathology investigations",
      "Chronic disease monitoring tests",
      "Wellness screening panels",
      "Infectious disease testing",
      "Hormonal testing",
      "Preventative health screening",
    ],
  },
  {
    slug: "eye-clinic",
    name: "Eye Clinic / Optometry",
    categoryLabel: "Coming soon",
    summary: "Planned vision testing, eye examinations and eye health support.",
    description:
      "The future eye clinic will provide accessible vision and eye health services within the Polyclinic.",
    status: "COMING_SOON",
    bookingEnabled: false,
    services: [
      "Vision testing",
      "Eye examinations",
      "Prescription lenses",
      "Eye health screening",
    ],
  },
  {
    slug: "pharmacy",
    name: "Pharmacy",
    categoryLabel: "Coming soon",
    summary:
      "Planned access to prescriptions, chronic medication support and medication guidance.",
    description:
      "The future pharmacy will support convenient access to prescribed and over-the-counter medication with professional counselling.",
    status: "COMING_SOON",
    bookingEnabled: false,
    services: [
      "Prescription medication",
      "Chronic medication management",
      "Over-the-counter medication",
      "Medication counselling",
      "Repeat prescriptions",
    ],
  },
  {
    slug: "radiology",
    name: "Radiology & Diagnostic Imaging Centre",
    categoryLabel: "Coming soon",
    summary: "Planned imaging and screening services within the Polyclinic.",
    description:
      "The future imaging centre will broaden access to diagnostic investigations and screening services.",
    status: "COMING_SOON",
    bookingEnabled: false,
    services: ["Ultrasound", "X-ray", "Diagnostic imaging", "Screening services"],
  },
  {
    slug: "php-health-plan",
    name: "PHP Health Plan",
    categoryLabel: "Future healthcare access plan",
    summary:
      "A future healthcare access plan connecting registered members with participating providers.",
    description:
      "PHP Health Plan is planned as a healthcare access plan, not medical insurance. Future member and provider portals will support registration, verification and network participation.",
    status: "FUTURE",
    bookingEnabled: false,
    services: [
      "Member registration",
      "Membership verification",
      "Provider directory",
      "Healthcare access information",
      "Provider network participation",
    ],
  },
] as const;

export async function bootstrapPolyclinic(db: PrismaClient) {
  await db.practiceSetting.upsert({
    where: { id: "practice" },
    update: POLYCLINIC_LOCATION,
    create: { id: "practice", ...POLYCLINIC_LOCATION },
  });

  for (const [sortOrder, entry] of DEPARTMENTS.entries()) {
    const department = await db.department.upsert({
      where: { slug: entry.slug },
      update: {},
      create: {
        slug: entry.slug,
        name: entry.name,
        categoryLabel: entry.categoryLabel,
        summary: entry.summary,
        description: entry.description,
        status: entry.status,
        public: true,
        bookingEnabled: entry.bookingEnabled,
        sortOrder,
      },
    });

    for (const [serviceOrder, name] of entry.services.entries()) {
      await db.departmentService.upsert({
        where: { departmentId_name: { departmentId: department.id, name } },
        update: {},
        create: {
          departmentId: department.id,
          name,
          public: true,
          sortOrder: serviceOrder,
        },
      });
    }
  }
}
