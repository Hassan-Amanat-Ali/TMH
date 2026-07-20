import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { markConversationRead } from "@/lib/server/services/messaging";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await markConversationRead(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not mark conversation read." }, { status: 400 });
  }
}
