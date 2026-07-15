import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const nullableText = z.union([z.string().trim().max(2000), z.null()]).optional();
const departmentSchema = z.object({
  entity: z.literal("DEPARTMENT"),
  id: z.string().optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(120),
  categoryLabel: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(3000),
  status: z.enum(["ACTIVE", "COMING_SOON", "FUTURE"]),
  public: z.boolean(),
  bookingEnabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});
const serviceSchema = z.object({
  entity: z.literal("SERVICE"),
  id: z.string().optional(),
  departmentId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: nullableText,
  public: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});
const providerSchema = z.object({
  entity: z.literal("PROVIDER"),
  id: z.string().optional(),
  departmentId: z.string().min(1),
  displayName: z.string().trim().min(2).max(160),
  practiceName: nullableText,
  biography: nullableText,
  phone: nullableText,
  email: z.union([z.literal(""), z.string().email(), z.null()]).optional(),
  operatingHours: nullableText,
  public: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});
const mutationSchema = z.discriminatedUnion("entity", [departmentSchema, serviceSchema, providerSchema]);

export async function PATCH(request: Request) {
  const session = await requirePermission("MANAGE_PRACTICE");
  if (!session) return NextResponse.json({ error: "You do not have permission to manage services and providers." }, { status: 403 });
  const parsed = mutationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the directory details." }, { status: 400 });
  const body = parsed.data;
  try {
    if (body.entity === "DEPARTMENT") {
      if (body.bookingEnabled && body.slug !== "general-practice")
        return NextResponse.json({ error: "Only General Practice can use online booking in this release." }, { status: 400 });
      const data = {
        slug: body.slug,
        name: body.name,
        categoryLabel: body.categoryLabel,
        summary: body.summary,
        description: body.description,
        status: body.status,
        public: body.public,
        bookingEnabled: body.bookingEnabled,
        sortOrder: body.sortOrder,
      };
      const department = body.id
        ? await db.department.update({ where: { id: body.id }, data })
        : await db.department.create({ data });
      await db.activityLog.create({ data: { userId: session.id, action: body.id ? "DEPARTMENT_UPDATED" : "DEPARTMENT_CREATED", entityType: "Department", entityId: department.id, summary: `${department.name} directory details saved` } });
      return NextResponse.json({ ok: true, id: department.id });
    }
    if (body.entity === "SERVICE") {
      const data = { departmentId: body.departmentId, name: body.name, description: body.description || null, public: body.public, sortOrder: body.sortOrder };
      const service = body.id
        ? await db.departmentService.update({ where: { id: body.id }, data })
        : await db.departmentService.create({ data });
      await db.activityLog.create({ data: { userId: session.id, action: body.id ? "DEPARTMENT_SERVICE_UPDATED" : "DEPARTMENT_SERVICE_CREATED", entityType: "DepartmentService", entityId: service.id, summary: `${service.name} service details saved` } });
      return NextResponse.json({ ok: true, id: service.id });
    }
    const data = {
      departmentId: body.departmentId,
      displayName: body.displayName,
      practiceName: body.practiceName || null,
      biography: body.biography || null,
      phone: body.phone || null,
      email: body.email || null,
      operatingHours: body.operatingHours || null,
      public: body.public,
      sortOrder: body.sortOrder,
    };
    const provider = body.id
      ? await db.provider.update({ where: { id: body.id }, data })
      : await db.provider.create({ data });
    await db.activityLog.create({ data: { userId: session.id, action: body.id ? "PROVIDER_UPDATED" : "PROVIDER_CREATED", entityType: "Provider", entityId: provider.id, summary: `${provider.displayName} provider profile saved` } });
    return NextResponse.json({ ok: true, id: provider.id });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint"))
      return NextResponse.json({ error: "That slug or service name is already in use." }, { status: 409 });
    return NextResponse.json({ error: "The directory update could not be saved." }, { status: 500 });
  }
}
