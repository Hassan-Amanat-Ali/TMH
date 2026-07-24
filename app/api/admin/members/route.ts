import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { createAdminMember } from "@/lib/server/services/launch-settings";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const member = await createAdminMember(admin, body);
    return NextResponse.json({ ok: true, memberId: member.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create member." }, { status: 400 });
  }
}
