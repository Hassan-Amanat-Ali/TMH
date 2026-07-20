import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { sendGift } from "@/lib/server/services/economy";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { receiverId?: unknown; message?: unknown } | null;
    const receiverId = typeof body?.receiverId === "string" ? body.receiverId.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (!receiverId) return NextResponse.json({ error: "receiverId is required." }, { status: 400 });
    const result = await sendGift(user.id, id, receiverId, message);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send gift." }, { status: 400 });
  }
}
