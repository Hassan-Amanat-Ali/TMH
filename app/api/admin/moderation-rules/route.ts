import { NextResponse } from "next/server";
import { ModAction, ModRuleKind } from "@/lib/prisma/client";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { createModerationRule } from "@/lib/server/services/admin-moderation";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as { kind?: string; pattern?: string; action?: string };
    const kind = body.kind === ModRuleKind.TRIGGER_WORD ? ModRuleKind.TRIGGER_WORD : ModRuleKind.LEAKAGE;
    const action = body.action === ModAction.SUSPEND ? ModAction.SUSPEND : body.action === ModAction.FLAG ? ModAction.FLAG : ModAction.BLOCK;
    const pattern = typeof body.pattern === "string" ? body.pattern.trim() : "";
    if (!pattern) return NextResponse.json({ error: "Pattern is required." }, { status: 400 });
    await createModerationRule(prisma, admin, { kind, pattern, action });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create moderation rule." }, { status: 400 });
  }
}
