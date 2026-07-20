import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { answerSupportRequest } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string; replyNote?: string };
    const replyNote = typeof body.replyNote === "string" && body.replyNote.trim() ? body.replyNote.trim() : "Answered by support.";
    await answerSupportRequest(prisma, admin, id, replyNote, body.action === "reactivate");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update support request." }, { status: 400 });
  }
}
