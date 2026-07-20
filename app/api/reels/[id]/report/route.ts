import { NextResponse } from "next/server";
import { ReportCategory } from "@/lib/prisma/client";
import { AuthError, requireUser } from "@/lib/server/session";
import { reportReel } from "@/lib/server/services/reels";

function parseCategory(value: unknown): ReportCategory | null {
  return typeof value === "string" && Object.values(ReportCategory).includes(value as ReportCategory) ? (value as ReportCategory) : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { category?: unknown; note?: unknown } | null;
    const category = parseCategory(body?.category);
    const note = typeof body?.note === "string" ? body.note : "";
    if (!category) return NextResponse.json({ error: "Invalid report category." }, { status: 400 });
    const report = await reportReel(user.id, id, category, note);
    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not report reel." }, { status: 400 });
  }
}
