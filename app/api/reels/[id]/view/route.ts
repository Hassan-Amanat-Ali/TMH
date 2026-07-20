import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { recordReelView } from "@/lib/server/services/reels";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const result = await recordReelView(user.id, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record reel view." }, { status: 400 });
  }
}
