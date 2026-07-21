import { NextResponse } from "next/server";
import { getPracticeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { availableSlots } from "@/lib/slots";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const requestedPracticeId = params.get("practiceId");
  const session = await getPracticeSession();
  const practiceId = requestedPracticeId || session?.practiceId;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !practiceId)
    return NextResponse.json(
      { error: "A valid date and practice are required." },
      { status: 400 },
    );
  if (session && practiceId !== session.practiceId)
    return NextResponse.json(
      { error: "Practice not available." },
      { status: 404 },
    );
  if (!session) {
    const publicPractice = await db.practice.findFirst({
      where: { id: practiceId, status: "ACTIVE", publicVisible: true },
      select: { id: true },
    });
    if (!publicPractice)
      return NextResponse.json(
        { error: "Practice not available." },
        { status: 404 },
      );
  }
  return NextResponse.json({
    slots: await availableSlots(
      date,
      new Date(),
      practiceId,
      params.get("providerId") || undefined,
      params.get("serviceId") || undefined,
    ),
  });
}
