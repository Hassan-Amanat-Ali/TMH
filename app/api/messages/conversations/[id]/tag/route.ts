import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { upsertConversationTag } from "@/lib/server/services/messaging";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { favourite?: unknown; label?: unknown } | null;
    const label = typeof body?.label === "string" ? body.label.trim().slice(0, 40) : null;
    const favourite = typeof body?.favourite === "boolean" ? body.favourite : undefined;
    const tag = await upsertConversationTag(user.id, id, { favourite, label });
    return NextResponse.json({ ok: true, tag });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update conversation tag." }, { status: 400 });
  }
}
