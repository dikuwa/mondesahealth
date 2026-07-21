import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canonicalEmergencyPhone,
  orderEmergencyContacts,
  validEmergencyPhone,
} from "@/lib/emergency";
import { ORIGINAL_PRACTICE_ID } from "@/lib/practice-constants";
import { practiceWriteDenied } from "@/lib/practice-write-access";

const contactSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .refine(validEmergencyPhone, "Enter a valid Namibian phone number."),
  description: z.string().trim().max(240).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
  primary: z.boolean(),
});

async function owner() {
  const session = await requirePermission("MANAGE_PRACTICE");
  return session?.role === "OWNER" ? session : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const publicRequest = params.get("public") === "1";
  const session = publicRequest ? null : await owner();
  if (!publicRequest && !session)
    return NextResponse.json(
      { error: "Only the Owner can manage emergency contacts." },
      { status: 403 },
    );
  const practiceId = publicRequest
    ? params.get("practiceId") || ORIGINAL_PRACTICE_ID
    : session!.practiceId;
  const contacts = await db.emergencyContact.findMany({
    where: { practiceId, ...(publicRequest ? { active: true } : {}) },
    orderBy: [{ primary: "desc" }, { sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({
    contacts: publicRequest ? orderEmergencyContacts(contacts) : contacts,
  });
}

export async function POST(request: Request) {
  const session = await owner();
  if (!session)
    return NextResponse.json(
      { error: "Only the Owner can manage emergency contacts." },
      { status: 403 },
    );
  const restricted = await practiceWriteDenied(session.practiceId);
  if (restricted) return restricted;
  const parsed = contactSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the emergency contact.",
      },
      { status: 400 },
    );
  const data = {
    ...parsed.data,
    id: undefined,
    phone: canonicalEmergencyPhone(parsed.data.phone),
    description: parsed.data.description || null,
    region: parsed.data.region || null,
  };
  const duplicate = await db.emergencyContact.findFirst({
    where: {
      practiceId: session.practiceId,
      OR: [
        { phone: data.phone },
        { label: { equals: data.label, mode: "insensitive" } },
      ],
    },
  });
  if (duplicate)
    return NextResponse.json(
      {
        error: "A contact with that label or telephone number already exists.",
      },
      { status: 409 },
    );
  const contact = await db.$transaction(async (tx) => {
    if (data.primary)
      await tx.emergencyContact.updateMany({
        where: { practiceId: session.practiceId },
        data: { primary: false },
      });
    const created = await tx.emergencyContact.create({
      data: { ...data, practiceId: session.practiceId },
    });
    await tx.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: "EMERGENCY_CONTACT_CREATED",
        entityType: "EmergencyContact",
        entityId: created.id,
        summary: `${created.label} emergency contact created`,
      },
    });
    return created;
  });
  return NextResponse.json({ contact }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await owner();
  if (!session)
    return NextResponse.json(
      { error: "Only the Owner can manage emergency contacts." },
      { status: 403 },
    );
  const restricted = await practiceWriteDenied(session.practiceId);
  if (restricted) return restricted;
  const parsed = contactSchema
    .required({ id: true })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the emergency contact.",
      },
      { status: 400 },
    );
  const current = await db.emergencyContact.findFirst({
    where: { id: parsed.data.id, practiceId: session.practiceId },
  });
  if (!current)
    return NextResponse.json(
      { error: "Emergency contact not found." },
      { status: 404 },
    );
  const phone = canonicalEmergencyPhone(parsed.data.phone);
  const duplicate = await db.emergencyContact.findFirst({
    where: {
      practiceId: session.practiceId,
      id: { not: current.id },
      OR: [
        { phone },
        { label: { equals: parsed.data.label, mode: "insensitive" } },
      ],
    },
  });
  if (duplicate)
    return NextResponse.json(
      {
        error: "A contact with that label or telephone number already exists.",
      },
      { status: 409 },
    );
  const contact = await db.$transaction(async (tx) => {
    if (parsed.data.primary)
      await tx.emergencyContact.updateMany({
        where: { practiceId: session.practiceId, id: { not: current.id } },
        data: { primary: false },
      });
    const updated = await tx.emergencyContact.update({
      where: { id: current.id },
      data: {
        label: parsed.data.label,
        phone,
        description: parsed.data.description || null,
        region: parsed.data.region || null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
        primary: parsed.data.active && parsed.data.primary,
      },
    });
    await tx.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: updated.active
          ? "EMERGENCY_CONTACT_UPDATED"
          : "EMERGENCY_CONTACT_DEACTIVATED",
        entityType: "EmergencyContact",
        entityId: updated.id,
        summary: `${updated.label} emergency contact ${updated.active ? "updated" : "deactivated"}`,
        beforeJson: JSON.stringify({
          active: current.active,
          primary: current.primary,
          sortOrder: current.sortOrder,
        }),
        afterJson: JSON.stringify({
          active: updated.active,
          primary: updated.primary,
          sortOrder: updated.sortOrder,
        }),
      },
    });
    return updated;
  });
  return NextResponse.json({ contact });
}

export async function DELETE(request: Request) {
  const session = await owner();
  if (!session)
    return NextResponse.json(
      { error: "Only the Owner can manage emergency contacts." },
      { status: 403 },
    );
  const restricted = await practiceWriteDenied(session.practiceId);
  if (restricted) return restricted;
  const parsed = z
    .object({ id: z.string().min(1) })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose an emergency contact." },
      { status: 400 },
    );
  const current = await db.emergencyContact.findFirst({
    where: { id: parsed.data.id, practiceId: session.practiceId },
  });
  if (!current)
    return NextResponse.json(
      { error: "Emergency contact not found." },
      { status: 404 },
    );
  await db.$transaction([
    db.emergencyContact.delete({ where: { id: current.id } }),
    db.activityLog.create({
      data: {
        practiceId: session.practiceId,
        userId: session.id,
        action: "EMERGENCY_CONTACT_DELETED",
        entityType: "EmergencyContact",
        entityId: current.id,
        summary: `${current.label} emergency contact deleted`,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
