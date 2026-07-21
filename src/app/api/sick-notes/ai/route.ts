import { NextResponse } from "next/server";
import { z } from "zod";
import { sickNoteWordingSchema, requestStructuredAi } from "@/lib/ai-provider";
import { db } from "@/lib/db";
import { requireSickNoteManager } from "@/lib/sick-note-access";

const inputSchema = z.object({
  id: z.string().optional(),
  doctorNotes: z.string().trim().min(5).max(3000),
  purpose: z.enum(["WORK", "SCHOOL", "OTHER"]),
  fitnessStatus: z.enum([
    "UNFIT_FOR_WORK",
    "UNFIT_FOR_SCHOOL",
    "FIT_WITH_RESTRICTIONS",
    "FIT_TO_RETURN",
  ]),
  leaveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  restrictions: z.string().trim().max(1200).optional(),
});

export async function POST(request: Request) {
  const session = await requireSickNoteManager();
  if (!session)
    return NextResponse.json(
      { error: "You do not have permission to use sick-note assistance." },
      { status: 403 },
    );
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Add clinician notes before using AI assistance.",
      },
      { status: 400 },
    );
  try {
    const result = await requestStructuredAi({
      schema: sickNoteWordingSchema,
      system:
        "You rewrite clinician-supplied notes into concise, professional wording for a medical certificate. Use only facts explicitly present in the supplied JSON. Never invent a diagnosis, symptom, restriction, date, patient fact, examination finding, treatment, prognosis, or medical conclusion. Do not add patient or clinician names. Do not provide advice. Preserve uncertainty. Return plain certificate prose in the wording field.",
      payload: parsed.data,
    });
    if (parsed.data.id && await db.sickNote.findFirst({ where: { id: parsed.data.id, practiceId: session.practiceId }, select: { id: true } }))
      await db.activityLog.create({
        data: {
          practiceId: session.practiceId,
          userId: session.id,
          action: "SICK_NOTE_AI_WORDING_GENERATED",
          entityType: "SickNote",
          entityId: parsed.data.id,
          summary:
            "AI-assisted certificate wording generated for clinician review",
        },
      });
    return NextResponse.json({ wording: result.data.wording });
  } catch (error) {
    console.error(
      "Sick-note AI wording failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      {
        error:
          "AI wording is temporarily unavailable. Your draft is safe and can be completed manually.",
      },
      { status: 503 },
    );
  }
}
