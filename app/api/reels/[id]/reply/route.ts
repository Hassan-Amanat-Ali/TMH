import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { replyToReel } from "@/lib/server/services/reels";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
    const text = typeof body?.body === "string" ? body.body : "";
    const result = await replyToReel(user.id, id, text);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reply to reel." }, { status: 400 });
  }
}
