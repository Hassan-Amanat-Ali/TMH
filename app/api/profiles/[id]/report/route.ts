import { NextResponse } from "next/server";
import { ReportCategory } from "@/lib/prisma/client";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";

function parseCategory(value: unknown): ReportCategory | null {
  return typeof value === "string" && Object.values(ReportCategory).includes(value as ReportCategory) ? (value as ReportCategory) : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (id === user.id) return NextResponse.json({ error: "You cannot report your own profile." }, { status: 400 });
    const body = (await request.json().catch(() => null)) as { category?: unknown; note?: unknown } | null;
    const category = parseCategory(body?.category);
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : "";
    if (!category) return NextResponse.json({ error: "Invalid report category." }, { status: 400 });

    const reportedUser = await prisma.user.findFirst({
      where: { id, role: "MEMBER" },
      select: { id: true },
    });
    if (!reportedUser) return NextResponse.json({ error: "Profile unavailable." }, { status: 404 });

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId: reportedUser.id,
        category,
        note: note || null,
        status: "OPEN",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not report profile." }, { status: 400 });
  }
}
