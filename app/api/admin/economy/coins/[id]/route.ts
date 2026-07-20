import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { adjustMemberCoins } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { amount?: unknown; note?: unknown };
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount === 0) return NextResponse.json({ error: "Amount must be a non-zero integer." }, { status: 400 });
    const note = typeof body.note === "string" ? body.note.trim() : "";
    await adjustMemberCoins(prisma, admin, id, amount, note || "Admin coin adjustment.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not adjust coins." }, { status: 400 });
  }
}
