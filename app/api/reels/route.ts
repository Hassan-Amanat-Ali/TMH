import { NextResponse } from "next/server";
import { AuthError, getCurrentUser, requireUser } from "@/lib/server/session";
import { createReel, getReelFeed } from "@/lib/server/services/reels";

export async function GET() {
  try {
    const user = await getCurrentUser().catch(() => null);
    return NextResponse.json(await getReelFeed(user?.id));
  } catch {
    return NextResponse.json({ error: "Could not load reels." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { mediaUrl?: unknown; thumbnailUrl?: unknown; caption?: unknown } | null;
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl : "";
    const thumbnailUrl = typeof body?.thumbnailUrl === "string" ? body.thumbnailUrl : "";
    const caption = typeof body?.caption === "string" ? body.caption : "";
    const result = await createReel(user.id, { mediaUrl, thumbnailUrl, caption });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create reel." }, { status: 400 });
  }
}
