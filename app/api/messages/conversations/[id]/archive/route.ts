import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { upsertConversationTag } from "@/lib/server/services/messaging";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { archived?: unknown } | null;
    const archived = typeof body?.archived === "boolean" ? body.archived : true;
    const tag = await upsertConversationTag(user.id, id, { archived });
    return NextResponse.json({ ok: true, tag });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update archive state." }, { status: 400 });
  }
}
