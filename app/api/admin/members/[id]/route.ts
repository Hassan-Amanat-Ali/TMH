import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { updateMemberModeration } from "@/lib/server/services/admin-moderation";

const actions = {
  suspend: "SUSPEND",
  ban: "BAN",
  shadow: "SHADOW",
  restore: "RESTORE",
} as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: keyof typeof actions; reason?: string };
    const action = body.action ? actions[body.action] : null;
    if (!action) return NextResponse.json({ error: "Invalid member action." }, { status: 400 });
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    await updateMemberModeration(prisma, admin, id, action, reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update member." }, { status: 400 });
  }
}
