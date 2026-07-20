import { NextResponse } from "next/server";
import { ModAction } from "@/lib/prisma/client";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { updateModerationRule } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { pattern?: string; action?: string; active?: unknown };
    const action = body.action === ModAction.SUSPEND ? ModAction.SUSPEND : body.action === ModAction.FLAG ? ModAction.FLAG : body.action === ModAction.BLOCK ? ModAction.BLOCK : undefined;
    await updateModerationRule(prisma, admin, id, {
      pattern: typeof body.pattern === "string" ? body.pattern.trim() : undefined,
      action,
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update moderation rule." }, { status: 400 });
  }
}
