import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { getLaunchSettings, updateLaunchSettings } from "@/lib/server/services/launch-settings";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getLaunchSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not load launch settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const settings = await updateLaunchSettings(admin, body);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update launch settings." }, { status: 400 });
  }
}
