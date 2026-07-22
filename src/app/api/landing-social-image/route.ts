import { NextResponse } from "next/server";
import { getPublishedLandingContent } from "@/lib/platform-landing";

export async function GET() {
  const content = await getPublishedLandingContent();
  const match = content.seo.socialImage.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) return NextResponse.json({ error: "No uploaded social image is published." }, { status: 404 });
  const contentType = match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
  return new NextResponse(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: { "Content-Type": `image/${contentType}`, "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
