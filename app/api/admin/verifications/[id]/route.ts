import { NextResponse } from "next/server";
import { VerificationStatus } from "@/lib/prisma/client";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { updateVerificationStatus } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string; note?: string };
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const nextStatus =
      body.action === "approve"
        ? VerificationStatus.APPROVED
        : body.action === "needs-resubmission"
          ? VerificationStatus.NEEDS_RESUBMISSION
          : VerificationStatus.REJECTED;
    await updateVerificationStatus(prisma, admin, id, nextStatus, note);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update verification." }, { status: 400 });
  }
}
