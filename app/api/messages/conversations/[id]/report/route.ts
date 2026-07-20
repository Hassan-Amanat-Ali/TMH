import { NextResponse } from "next/server";
import { ReportCategory } from "@/lib/prisma/client";
import { AuthError, requireUser } from "@/lib/server/session";
import { reportConversation } from "@/lib/server/services/messaging";

const allowedCategories = new Set<string>(Object.values(ReportCategory));

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { category?: string; note?: string };
    const category = body.category || "OTHER";
    if (!allowedCategories.has(category)) {
      return NextResponse.json({ error: "Invalid report category." }, { status: 400 });
    }

    const report = await reportConversation(user.id, id, {
      category: category as ReportCategory,
      note: body.note,
    });
    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit report." }, { status: 400 });
  }
}
