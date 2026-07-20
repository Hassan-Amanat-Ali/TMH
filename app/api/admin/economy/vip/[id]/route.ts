import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { grantOrExpireVip } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string; days?: unknown; note?: unknown };
    const action = body.action === "expire" ? "EXPIRE" : "GRANT";
    const days = Number(body.days || 30);
    if (!Number.isInteger(days) || days < 1) return NextResponse.json({ error: "Days must be a positive integer." }, { status: 400 });
    const note = typeof body.note === "string" ? body.note.trim() : "";
    await grantOrExpireVip(prisma, admin, id, action, days, note || "Admin VIP update.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update VIP." }, { status: 400 });
  }
}
