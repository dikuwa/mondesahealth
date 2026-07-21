import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { practiceWriteDenied } from "@/lib/practice-write-access";

const nullableText = z
  .union([z.string().trim().max(2000), z.null()])
  .optional();
const departmentSchema = z.object({
  entity: z.literal("DEPARTMENT"),
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
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
  aiIntakeEnabled: z.boolean().nullable().optional(),
  durationMinutes: z.number().int().min(10).max(240),
  active: z.boolean(),
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
  aiIntakeEnabled: z.boolean().nullable().optional(),
});
const mutationSchema = z.discriminatedUnion("entity", [
  departmentSchema,
  serviceSchema,
  providerSchema,
]);

export async function PATCH(request: Request) {
  const parsed = mutationSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the directory details.",
      },
      { status: 400 },
    );
  const body = parsed.data;
  const session = body.entity === "DEPARTMENT"
    ? await requirePlatformOwner()
    : await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to manage this directory content." },
      { status: 403 },
    );
  const practiceId = session.practiceId;
  if (body.entity !== "DEPARTMENT") {
    if (!practiceId) return NextResponse.json({ error: "Practice access is required." }, { status: 403 });
    const restricted = await practiceWriteDenied(practiceId);
    if (restricted) return restricted;
  }
  try {
    if (body.entity === "DEPARTMENT") {
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
      await db.activityLog.create({
        data: {
          practiceId: session.practiceId,
          userId: session.id,
          action: body.id ? "DEPARTMENT_UPDATED" : "DEPARTMENT_CREATED",
          entityType: "Department",
          entityId: department.id,
          summary: `${department.name} directory details saved`,
        },
      });
      return NextResponse.json({ ok: true, id: department.id });
    }
    if (body.entity === "SERVICE") {
      if (body.id && !(await db.departmentService.findFirst({ where: { id: body.id, practiceId: practiceId! }, select: { id: true } })))
        return NextResponse.json({ error: "Service not found." }, { status: 404 });
      const data = {
        practiceId: practiceId!,
        departmentId: body.departmentId,
        name: body.name,
        description: body.description || null,
        public: body.public,
        sortOrder: body.sortOrder,
        aiIntakeEnabled: body.aiIntakeEnabled ?? null,
        durationMinutes: body.durationMinutes,
        active: body.active,
      };
      const service = body.id
        ? await db.departmentService.update({ where: { id: body.id }, data })
        : await db.departmentService.create({ data });
      await db.activityLog.create({
        data: {
          practiceId: practiceId!,
          userId: session.id,
          action: body.id
            ? "DEPARTMENT_SERVICE_UPDATED"
            : "DEPARTMENT_SERVICE_CREATED",
          entityType: "DepartmentService",
          entityId: service.id,
          summary: `${service.name} service details saved`,
        },
      });
      return NextResponse.json({ ok: true, id: service.id });
    }
    if (body.id && !(await db.provider.findFirst({ where: { id: body.id, practiceId: practiceId! }, select: { id: true } })))
      return NextResponse.json({ error: "Provider not found." }, { status: 404 });
    const data = {
      practiceId: practiceId!,
      departmentId: body.departmentId,
      displayName: body.displayName,
      practiceName: body.practiceName || null,
      biography: body.biography || null,
      phone: body.phone || null,
      email: body.email || null,
      operatingHours: body.operatingHours || null,
      public: body.public,
      sortOrder: body.sortOrder,
      aiIntakeEnabled: body.aiIntakeEnabled ?? null,
    };
    const provider = body.id
      ? await db.provider.update({ where: { id: body.id }, data })
      : await db.provider.create({ data });
    await db.activityLog.create({
      data: {
        practiceId: practiceId!,
        userId: session.id,
        action: body.id ? "PROVIDER_UPDATED" : "PROVIDER_CREATED",
        entityType: "Provider",
        entityId: provider.id,
        summary: `${provider.displayName} provider profile saved`,
      },
    });
    return NextResponse.json({ ok: true, id: provider.id });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint"))
      return NextResponse.json(
        { error: "That slug or service name is already in use." },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "The directory update could not be saved." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const parsed = z
    .object({
      entity: z.enum(["DEPARTMENT", "SERVICE", "PROVIDER"]),
      id: z.string().min(1),
    })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a directory item to delete." },
      { status: 400 },
    );
  const { entity, id } = parsed.data;
  const session = entity === "DEPARTMENT"
    ? await requirePlatformOwner()
    : await requirePermission("MANAGE_PRACTICE");
  if (!session)
    return NextResponse.json({ error: "You do not have permission to delete this directory content." }, { status: 403 });
  const practiceId = session.practiceId;
  if (entity !== "DEPARTMENT") {
    if (!practiceId) return NextResponse.json({ error: "Practice access is required." }, { status: 403 });
    const restricted = await practiceWriteDenied(practiceId);
    if (restricted) return restricted;
  }
  try {
    if (entity === "DEPARTMENT") {
      const department = await db.department.findUnique({
        where: { id },
        include: { services: true, providers: true },
      });
      if (!department)
        return NextResponse.json(
          { error: "Department not found." },
          { status: 404 },
        );
      if (department.bookingEnabled || department.slug === "general-practice")
        return NextResponse.json(
          {
            error:
              "General Practice is protected while online booking is enabled.",
          },
          { status: 409 },
        );
      await db.$transaction(async (tx) => {
        await tx.department.delete({ where: { id } });
        await tx.activityLog.create({
          data: {
            practiceId: session.practiceId,
            userId: session.id,
            action: "DEPARTMENT_DELETED",
            entityType: "Department",
            entityId: id,
            summary: `${department.name} deleted with ${department.services.length} services and ${department.providers.length} providers`,
            beforeJson: JSON.stringify(department),
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
    if (entity === "SERVICE") {
      const service = await db.departmentService.findFirst({ where: { id, practiceId: practiceId! } });
      if (!service)
        return NextResponse.json(
          { error: "Service not found." },
          { status: 404 },
        );
      await db.$transaction(async (tx) => {
        await tx.departmentService.delete({ where: { id } });
        await tx.activityLog.create({
          data: {
            practiceId: practiceId!,
            userId: session.id,
            action: "DEPARTMENT_SERVICE_DELETED",
            entityType: "DepartmentService",
            entityId: id,
            summary: `${service.name} service deleted`,
            beforeJson: JSON.stringify(service),
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
    const provider = await db.provider.findFirst({ where: { id, practiceId: practiceId! } });
    if (!provider)
      return NextResponse.json(
        { error: "Provider not found." },
        { status: 404 },
      );
    await db.$transaction(async (tx) => {
      await tx.provider.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          practiceId: practiceId!,
          userId: session.id,
          action: "PROVIDER_DELETED",
          entityType: "Provider",
          entityId: id,
          summary: `${provider.displayName} provider deleted`,
          beforeJson: JSON.stringify(provider),
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "The directory item could not be deleted." },
      { status: 500 },
    );
  }
}
