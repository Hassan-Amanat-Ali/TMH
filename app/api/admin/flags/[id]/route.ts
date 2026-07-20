import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { updateMemberIpFlags } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { ipFlagged?: unknown; vpnSuspected?: unknown; note?: unknown };
    const note = typeof body.note === "string" ? body.note.trim() : "";
    await updateMemberIpFlags(prisma, admin, id, Boolean(body.ipFlagged), Boolean(body.vpnSuspected), note || "Admin IP/VPN flag update.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update flags." }, { status: 400 });
  }
}
