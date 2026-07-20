import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireAdmin } from "@/lib/server/session";
import { updatePlanLimits } from "@/lib/server/services/admin-moderation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { maxPhotos?: unknown; maxVideos?: unknown; videoMaxSeconds?: unknown };
    const maxPhotos = Number(body.maxPhotos);
    const maxVideos = Number(body.maxVideos);
    const videoMaxSeconds = Number(body.videoMaxSeconds);
    if (![maxPhotos, maxVideos, videoMaxSeconds].every((value) => Number.isInteger(value) && value >= 0)) {
      return NextResponse.json({ error: "Limits must be non-negative integers." }, { status: 400 });
    }
    await updatePlanLimits(prisma, admin, id, maxPhotos, maxVideos, videoMaxSeconds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update plan limits." }, { status: 400 });
  }
}
