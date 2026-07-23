import { NextResponse } from "next/server";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformPermission("VIEW_PRACTICES");
  if (!session)
    return NextResponse.json(
      { error: "Platform access required." },
      { status: 403 },
    );

  const { id } = await params;

  const [locations, practitioners] = await Promise.all([
    db.practiceLocation.findMany({
      where: { practiceId: id },
      orderBy: { createdAt: "asc" },
    }),
    db.practitioner.findMany({
      where: { practiceId: id },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return NextResponse.json({ locations, practitioners });
}
