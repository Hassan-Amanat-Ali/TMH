import { NextResponse } from "next/server";
import { ReportStatus } from "@/lib/prisma/client";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { updateReportStatus } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string; decision?: string };
    const decision = typeof body.decision === "string" && body.decision.trim() ? body.decision.trim() : "Reviewed by admin.";
    const nextStatus = body.action === "dismiss" ? ReportStatus.DISMISSED : body.action === "review" ? ReportStatus.REVIEWING : ReportStatus.RESOLVED;
    await updateReportStatus(prisma, admin, id, nextStatus, decision);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update report." }, { status: 400 });
  }
}
