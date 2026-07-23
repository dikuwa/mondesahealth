import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestAuditInfo } from "@/lib/tenant";

const CHECKLIST_DEFINITIONS = [
  { key: "practice_identity_confirmed", label: "Practice identity confirmed" },
  { key: "owner_identity_confirmed", label: "Owner or practitioner identity confirmed" },
  { key: "professional_registration_confirmed", label: "Professional registration confirmed" },
  { key: "practice_number_confirmed", label: "Practice number confirmed" },
  { key: "contact_details_confirmed", label: "Contact details confirmed" },
  { key: "address_evidence_confirmed", label: "Address evidence confirmed" },
  { key: "documents_readable", label: "Documents readable" },
  { key: "no_patient_data_detected", label: "No prohibited patient data detected" },
  { key: "duplicate_checked", label: "Duplicate practice checked" },
  { key: "approval_recommendation", label: "Approval recommendation completed" },
] as const;

export { CHECKLIST_DEFINITIONS };

const updateSchema = z.object({
  applicationId: z.string().min(1),
  items: z.array(
    z.object({
      item: z.string().min(1),
      completed: z.boolean(),
      note: z.string().optional(),
    }),
  ),
});

export async function GET(request: Request) {
  const session = await requirePlatformPermission("MANAGE_APPLICATIONS");
  if (!session)
    return NextResponse.json({ error: "Platform access required." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  if (!applicationId)
    return NextResponse.json({ error: "applicationId is required." }, { status: 400 });

  const existing = await db.applicationChecklist.findMany({
    where: { applicationId },
    orderBy: { item: "asc" },
  });

  // Merge existing items with definitions
  const merged = CHECKLIST_DEFINITIONS.map((def) => {
    const existingItem = existing.find((e) => e.item === def.key);
    return {
      ...def,
      completed: existingItem?.completed ?? false,
      completedById: existingItem?.completedById ?? null,
      completedAt: existingItem?.completedAt?.toISOString() ?? null,
      note: existingItem?.note ?? null,
    };
  });

  return NextResponse.json({ items: merged });
}

export async function POST(request: Request) {
  const session = await requirePlatformPermission("MANAGE_APPLICATIONS");
  if (!session)
    return NextResponse.json({ error: "Platform access required." }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid checklist data." }, { status: 400 });

  const { applicationId, items } = parsed.data;

  const application = await db.practiceApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, practiceName: true },
  });
  if (!application)
    return NextResponse.json({ error: "Application not found." }, { status: 404 });

  // Upsert each checklist item in a transaction
  await db.$transaction(
    items.map((item) =>
      db.applicationChecklist.upsert({
        where: {
          applicationId_item: {
            applicationId,
            item: item.item,
          },
        },
        update: {
          completed: item.completed,
          completedById: item.completed ? session.id : null,
          completedAt: item.completed ? new Date() : null,
          note: item.note,
        },
        create: {
          applicationId,
          item: item.item,
          completed: item.completed,
          completedById: session.id,
          completedAt: item.completed ? new Date() : null,
          note: item.note,
        },
      }),
    ),
  );

  await db.activityLog.create({
    data: {
      userId: session.id,
      practiceId: session.practiceId,
      action: "VERIFICATION_CHECKLIST_UPDATED",
      entityType: "PracticeApplication",
      entityId: applicationId,
      summary: `Verification checklist updated for ${application.practiceName}`,
      requestInfo: requestAuditInfo(request),
    },
  });

  return NextResponse.json({ ok: true });
}
