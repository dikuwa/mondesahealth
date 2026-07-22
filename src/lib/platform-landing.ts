import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const landingIcons = [
  "Activity", "BarChart3", "Bell", "Building2", "CalendarCheck", "CalendarDays",
  "CheckCircle2", "ClipboardList", "CreditCard", "FileHeart", "FileText", "HeartPulse",
  "LockKeyhole", "ReceiptText", "ShieldCheck", "Stethoscope", "UserCog", "Users",
] as const;

const safeDestination = z.string().trim().min(1).max(500).refine(
  (value) => value.startsWith("/") || value.startsWith("#") || /^https:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value),
  "Use an internal path, HTTPS, email, or telephone link.",
);
const imageValue = z.string().max(1_500_000).refine(
  (value) => !value || value.startsWith("/images/") || /^data:image\/(png|jpe?g|webp);base64,/i.test(value),
  "Use an uploaded PNG, JPEG, or WebP image.",
);
const itemBase = z.object({
  id: z.string().min(1).max(80),
  order: z.number().int().min(0).max(100),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const icon = z.enum(landingIcons);

export const platformLandingSchema = z.object({
  version: z.literal(1),
  general: z.object({
    announcement: z.string().max(180),
    logoData: imageValue,
    logoSubtitle: z.string().min(1).max(60),
    nav: z.array(z.object({ label: z.string().min(1).max(40), destination: safeDestination, enabled: z.boolean() })).max(8),
    primaryCtaLabel: z.string().min(1).max(50),
    primaryCtaDestination: safeDestination,
    secondaryCtaLabel: z.string().min(1).max(50),
    secondaryCtaDestination: safeDestination,
    signInLabel: z.string().min(1).max(40),
    copyright: z.string().min(1).max(140),
    footerDescription: z.string().max(300),
    supportEmail: z.string().email().or(z.literal("")),
    supportPhone: z.string().max(40),
    socialLinks: z.array(z.object({ label: z.string().min(1).max(40), url: safeDestination, enabled: z.boolean() })).max(6),
  }),
  hero: z.object({
    eyebrow: z.string().min(1).max(80),
    headingLines: z.array(z.string().min(1).max(100)).min(1).max(4),
    paragraph: z.string().min(1).max(600),
    primaryCtaLabel: z.string().min(1).max(50),
    primaryCtaDestination: safeDestination,
    secondaryCtaLabel: z.string().min(1).max(50),
    secondaryCtaDestination: safeDestination,
    trustIndicators: z.array(z.string().min(1).max(80)).max(4),
    image: imageValue,
    imageAlt: z.string().min(1).max(180),
    imagePosition: z.enum(["center", "top", "bottom", "left", "right"]),
    previewGreeting: z.string().min(1).max(80),
    previewText: z.string().max(180),
    previewMetrics: z.array(z.object({ label: z.string().min(1).max(50), value: z.string().min(1).max(30), enabled: z.boolean() })).max(6),
    scheduleExamples: z.array(z.object({ time: z.string().max(20), title: z.string().max(60), detail: z.string().max(80), enabled: z.boolean() })).max(5),
    claimExamples: z.array(z.object({ reference: z.string().max(40), status: z.string().max(30), amount: z.string().max(30), enabled: z.boolean() })).max(5),
    showSchedule: z.boolean(),
    showClaims: z.boolean(),
  }),
  metrics: z.array(itemBase.extend({
    mode: z.enum(["MANUAL", "SYSTEM"]),
    systemKey: z.enum(["ACTIVE_PRACTICES", "COMPLETED_BOOKINGS", "GENERATED_DOCUMENTS"]),
    value: z.string().max(30), suffix: z.string().max(20), label: z.string().min(1).max(80), icon,
  })).max(6),
  benefits: z.array(itemBase.extend({ icon, title: z.string().min(1).max(80), description: z.string().min(1).max(260) })).max(8),
  process: z.object({ eyebrow: z.string().max(80), heading: z.string().min(1).max(160), steps: z.array(itemBase.extend({ number: z.number().int().min(1).max(9), icon, title: z.string().min(1).max(80), description: z.string().min(1).max(260) })).max(5) }),
  features: z.object({ eyebrow: z.string().max(80), heading: z.string().min(1).max(160), items: z.array(itemBase.extend({ icon, name: z.string().min(1).max(80), description: z.string().min(1).max(220), destination: z.union([safeDestination, z.literal("")]) })).max(12) }),
  testimonials: z.object({ eyebrow: z.string().max(80), heading: z.string().min(1).max(160), fallback: z.string().min(1).max(200), items: z.array(itemBase.extend({ quote: z.string().min(1).max(600), name: z.string().min(1).max(80), role: z.string().max(120), photo: imageValue, rating: z.number().int().min(1).max(5), status: z.enum(["DRAFT", "VERIFIED", "PUBLISHED"]) })).max(8), security: z.object({ icon, heading: z.string().min(1).max(100), description: z.string().min(1).max(360), destination: z.union([safeDestination, z.literal("")]) }) }),
  faq: z.object({ eyebrow: z.string().max(80), heading: z.string().min(1).max(160), items: z.array(itemBase.extend({ question: z.string().min(1).max(180), answer: z.string().min(1).max(1200), category: z.string().max(60) })).max(16) }),
  finalCta: z.object({ eyebrow: z.string().max(80), heading: z.string().min(1).max(180), text: z.string().min(1).max(500), label: z.string().min(1).max(50), destination: safeDestination, reassurance: z.string().max(180), image: imageValue, imageAlt: z.string().max(180) }),
  pricing: z.object({ enabled: z.boolean(), eyebrow: z.string().max(80), heading: z.string().max(160), description: z.string().max(360), plans: z.array(itemBase.extend({ name: z.string().min(1).max(80), period: z.string().max(60), price: z.string().max(40), description: z.string().max(240), features: z.array(z.string().min(1).max(100)).max(10), ctaLabel: z.string().min(1).max(50), ctaDestination: safeDestination, highlighted: z.boolean() })).max(4) }),
  footer: z.object({ groups: z.array(itemBase.extend({ title: z.string().min(1).max(60), links: z.array(itemBase.extend({ label: z.string().min(1).max(60), url: safeDestination, external: z.boolean() })).max(10) })).max(6) }),
  seo: z.object({ title: z.string().min(1).max(70), description: z.string().min(1).max(180), canonicalUrl: z.union([z.string().url(), z.literal("")]), socialTitle: z.string().max(80), socialDescription: z.string().max(200), socialImage: imageValue, socialImageAlt: z.string().max(180), indexable: z.boolean() }),
});

export type PlatformLandingContent = z.infer<typeof platformLandingSchema>;
const timestamp = "2026-07-22T00:00:00.000Z";
const base = (id: string, order: number) => ({ id, order, enabled: true, createdAt: timestamp, updatedAt: timestamp });

export const defaultPlatformLandingContent: PlatformLandingContent = {
  version: 1,
  general: {
    announcement: "Independent healthcare practices can now register with Mondesa Health.", logoData: "", logoSubtitle: "PRACTICE PLATFORM",
    nav: [
      { label: "For practices", destination: "#benefits", enabled: true }, { label: "Features", destination: "#features", enabled: true },
      { label: "How it works", destination: "#how-it-works", enabled: true }, { label: "Practice directory", destination: "/services", enabled: true },
    ],
    primaryCtaLabel: "Register your practice", primaryCtaDestination: "/apply", secondaryCtaLabel: "See how it works", secondaryCtaDestination: "#how-it-works", signInLabel: "Sign in",
    copyright: "© 2026 Mondesa Health Platform", footerDescription: "Independent digital workspaces for healthcare practices in Namibia.", supportEmail: "hello@mondesahealth.na", supportPhone: "", socialLinks: [],
  },
  hero: {
    eyebrow: "Built for independent healthcare practices", headingLines: ["Grow your practice.", "Simplify bookings.", "Stay in control."],
    paragraph: "Mondesa Health gives every healthcare practice its own branded public page, independent dashboard and the tools needed to manage patients, bookings, claims, payments and records securely.",
    primaryCtaLabel: "Register your practice", primaryCtaDestination: "/apply", secondaryCtaLabel: "See how it works", secondaryCtaDestination: "#how-it-works",
    trustIndicators: ["Tenant-isolated records", "Role-based access", "Practice-controlled data"], image: "/images/mondesa-doctor-hero.jpg", imageAlt: "Healthcare professional consulting with a patient", imagePosition: "center",
    previewGreeting: "Good morning, Dr Amutenya", previewText: "Here is what is happening in your practice today.",
    previewMetrics: [{ label: "Appointments", value: "12", enabled: true }, { label: "New patients", value: "4", enabled: true }, { label: "Revenue", value: "N$8,450", enabled: true }, { label: "Claims", value: "7", enabled: true }],
    scheduleExamples: [{ time: "09:00", title: "General consultation", detail: "Confirmed", enabled: true }, { time: "10:30", title: "Follow-up visit", detail: "Checked in", enabled: true }, { time: "13:00", title: "New patient", detail: "Confirmed", enabled: true }],
    claimExamples: [{ reference: "CLM-1048", status: "Submitted", amount: "N$1,250", enabled: true }, { reference: "CLM-1047", status: "Ready", amount: "N$860", enabled: true }], showSchedule: true, showClaims: true,
  },
  metrics: [
    { ...base("metric-practices", 0), mode: "SYSTEM", systemKey: "ACTIVE_PRACTICES", value: "0", suffix: "+", label: "Active practices", icon: "Building2" },
    { ...base("metric-bookings", 1), mode: "SYSTEM", systemKey: "COMPLETED_BOOKINGS", value: "0", suffix: "+", label: "Appointments managed", icon: "CalendarCheck" },
    { ...base("metric-documents", 2), mode: "SYSTEM", systemKey: "GENERATED_DOCUMENTS", value: "0", suffix: "+", label: "Documents generated", icon: "FileText" },
    { ...base("metric-isolation", 3), mode: "MANUAL", systemKey: "ACTIVE_PRACTICES", value: "One", suffix: " workspace", label: "Per independent practice", icon: "ShieldCheck" },
  ],
  benefits: [
    { ...base("benefit-public", 0), icon: "Building2", title: "Your own public page", description: "Publish your brand, services, providers and contact details on a dedicated practice website." },
    { ...base("benefit-bookings", 1), icon: "CalendarCheck", title: "Bookings that work", description: "Let patients book from your real availability while your team manages the full appointment workflow." },
    { ...base("benefit-records", 2), icon: "Users", title: "Patient records", description: "Keep longitudinal patient details, clinical notes and documents together inside your practice workspace." },
    { ...base("benefit-claims", 3), icon: "FileHeart", title: "Claims and medical aids", description: "Prepare structured claims, manage batches and retain a clear submission history." },
    { ...base("benefit-billing", 4), icon: "ReceiptText", title: "Billing and payments", description: "Create invoices and receipts, record payments and understand practice finances." },
    { ...base("benefit-control", 5), icon: "ShieldCheck", title: "Your data, your control", description: "Tenant-isolated records, staff permissions and practice-controlled access keep responsibility clear." },
  ],
  process: { eyebrow: "A clear start", heading: "From registration to your first online booking", steps: [
    { ...base("step-register", 0), number: 1, icon: "ClipboardList", title: "Register your practice", description: "Submit verified practice details and choose the services you plan to offer." },
    { ...base("step-configure", 1), number: 2, icon: "UserCog", title: "Set up services and team", description: "Add providers, staff roles, availability, branding and public content." },
    { ...base("step-bookings", 2), number: 3, icon: "CalendarCheck", title: "Start receiving bookings", description: "Publish your practice and receive appointments directly into your own dashboard." },
  ] },
  features: { eyebrow: "The complete workspace", heading: "One platform. Every tool you need.", items: [
    ["appointments", "CalendarDays", "Appointments", "Booking requests, schedule management and reminders."], ["patients", "Users", "Patients", "Independent practice-owned patient profiles."],
    ["notes", "Stethoscope", "Clinical notes", "Structured encounters, diagnoses and amendments."], ["claims", "FileHeart", "Claims", "Medical-aid claims, validation and submission batches."],
    ["documents", "FileText", "Documents", "Sick notes, invoices, receipts and secure sharing."], ["payments", "CreditCard", "Payments", "Invoices, payment capture and financial summaries."],
    ["public", "Building2", "Public page", "A branded page with services, team and direct booking."], ["roles", "UserCog", "Team and roles", "Controlled access for owners, clinicians and operations."],
    ["notifications", "Bell", "Notifications", "Operational updates and appointment alerts."], ["analytics", "BarChart3", "Analytics", "Clear practice activity and performance summaries."],
  ].map(([id, iconName, name, description], order) => ({ ...base(`feature-${id}`, order), icon: iconName as typeof landingIcons[number], name, description, destination: "" })) },
  testimonials: { eyebrow: "Designed around real practice work", heading: "A calmer way to run your practice", fallback: "Built for independent healthcare practices that want clear ownership, safer records and a better patient experience.", items: [], security: { icon: "LockKeyhole", heading: "Secure by design", description: "Each practice works inside its own tenant-isolated workspace with role-based access and practice-controlled data.", destination: "/policies" } },
  faq: { eyebrow: "Common questions", heading: "Everything you need to know before registering", items: [
    ["separate", "How is my practice data kept separate?", "Every operational and clinical record is scoped to one practice workspace. Staff access is granted explicitly, and ordinary cross-practice sharing requires recorded patient consent."],
    ["receive", "What does my practice receive after registration?", "An approved practice receives its own public page, booking flow and independent dashboard for patients, appointments, records, claims, payments, staff and settings."],
    ["migrate", "Can I migrate existing patient records?", "Yes. Migration can be planned with the platform team and must be validated carefully before imported records are used operationally."],
    ["page", "Does each practice get its own public page?", "Yes. Every published practice has a branded page with its services, providers, contact details and practice-specific booking availability."],
    ["permissions", "Can staff have different permissions?", "Yes. Practice owners can invite staff with roles and controlled permissions appropriate to their responsibilities."],
    ["medical-aid", "Can I use the platform without medical-aid integrations?", "Yes. Practices can operate private-pay workflows and enable medical-aid tools when they are needed."],
    ["cost", "How much does it cost?", "Pricing is provided through configured subscription plans. Register your practice or contact the platform team for the currently available options."],
    ["setup", "How long does setup take?", "Timing depends on verification and the amount of practice content being configured. The guided setup keeps services, staff, availability and publishing steps clear."],
  ].map(([id, question, answer], order) => ({ ...base(`faq-${id}`, order), question, answer, category: "Getting started" })) },
  finalCta: { eyebrow: "Ready when you are", heading: "Give your practice a workspace built around how you work.", text: "Register your practice, configure your services and start building a clearer patient experience with Mondesa Health.", label: "Register your practice", destination: "/apply", reassurance: "No public listing is published before practice verification.", image: "/images/mondesa-hero.webp", imageAlt: "Mondesa Health practice team" },
  pricing: { enabled: false, eyebrow: "Simple plans", heading: "Choose the right plan for your practice", description: "Published plans and pricing appear here when configured.", plans: [] },
  footer: { groups: [
    { ...base("footer-platform", 0), title: "Platform", links: [
      { ...base("footer-for-practices", 0), label: "For practices", url: "#benefits", external: false }, { ...base("footer-features", 1), label: "Features", url: "#features", external: false },
      { ...base("footer-directory", 2), label: "Practice directory", url: "/services", external: false }, { ...base("footer-register", 3), label: "Register a practice", url: "/apply", external: false },
    ] },
    { ...base("footer-resources", 1), title: "Resources", links: [{ ...base("footer-faq", 0), label: "FAQ", url: "#faq", external: false }, { ...base("footer-policies", 1), label: "Policies", url: "/policies", external: false }] },
    { ...base("footer-company", 2), title: "Company", links: [{ ...base("footer-contact", 0), label: "Contact", url: "mailto:hello@mondesahealth.na", external: true }] },
    { ...base("footer-legal", 3), title: "Legal", links: [{ ...base("footer-privacy", 0), label: "Privacy and terms", url: "/policies", external: false }, { ...base("footer-security", 1), label: "Security", url: "/policies", external: false }] },
  ] },
  seo: { title: "Mondesa Health — Independent Practice Platform", description: "Give your healthcare practice a branded public page, online booking and an independent workspace for patients, records, claims and payments.", canonicalUrl: "https://mondesahealth.vercel.app/", socialTitle: "Mondesa Health Practice Platform", socialDescription: "Public pages, online booking and independent practice management in one secure workspace.", socialImage: "/images/mondesa-doctor-hero.jpg", socialImageAlt: "Mondesa Health practice platform", indexable: true },
};

export function parseLandingContent(value: unknown): PlatformLandingContent {
  const parsed = platformLandingSchema.safeParse(value);
  return parsed.success ? parsed.data : structuredClone(defaultPlatformLandingContent);
}

export async function getLandingRecord() {
  try {
    return await db.platformLandingPage.findUnique({ where: { id: "platform-landing-page" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") return null;
    throw error;
  }
}

export async function getPublishedLandingContent() {
  const record = await getLandingRecord();
  return parseLandingContent(record?.publishedContent || defaultPlatformLandingContent);
}

export async function getLandingSystemMetrics() {
  const [practices, bookings, documents] = await db.$transaction([
    db.practice.count({ where: { status: "ACTIVE", publicVisible: true } }),
    db.appointment.count({ where: { status: "COMPLETED" } }),
    db.sickNote.count(),
  ]);
  return { ACTIVE_PRACTICES: practices, COMPLETED_BOOKINGS: bookings, GENERATED_DOCUMENTS: documents };
}

export async function getPlatformLandingPageData() {
  const runOperationalQueries = () => db.$transaction([
    db.practice.count({ where: { status: "ACTIVE", publicVisible: true } }),
    db.appointment.count({ where: { status: "COMPLETED" } }),
    db.sickNote.count(),
    db.practice.findMany({
      where: { status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } },
      select: { slug: true, name: true, type: true, town: true, logoData: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
  ]);
  let record: Awaited<ReturnType<typeof getLandingRecord>> = null;
  let result: Awaited<ReturnType<typeof runOperationalQueries>>;
  try {
    const [landingRecord, ...operational] = await db.$transaction([
      db.platformLandingPage.findUnique({ where: { id: "platform-landing-page" } }),
      db.practice.count({ where: { status: "ACTIVE", publicVisible: true } }),
      db.appointment.count({ where: { status: "COMPLETED" } }),
      db.sickNote.count(),
      db.practice.findMany({
        where: { status: "ACTIVE", publicVisible: true, subscriptionStatus: { in: ["ACTIVE", "OVERDUE"] } },
        select: { slug: true, name: true, type: true, town: true, logoData: true },
        orderBy: { name: "asc" },
        take: 6,
      }),
    ]);
    record = landingRecord;
    result = operational as Awaited<ReturnType<typeof runOperationalQueries>>;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2021") throw error;
    try {
      result = await runOperationalQueries();
    } catch (operationalError) {
      if (!(operationalError instanceof Prisma.PrismaClientKnownRequestError) || operationalError.code !== "P2021") {
        throw operationalError;
      }
      result = [0, 0, 0, []];
    }
  }
  const [activePractices, completedBookings, generatedDocuments, practices] = result;
  return {
    content: parseLandingContent(record?.publishedContent || defaultPlatformLandingContent),
    systemMetrics: { ACTIVE_PRACTICES: activePractices, COMPLETED_BOOKINGS: completedBookings, GENERATED_DOCUMENTS: generatedDocuments },
    practices,
  };
}
