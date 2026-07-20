import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { evidenceUrl?: unknown; note?: unknown } | null;
    const evidenceUrl = typeof body?.evidenceUrl === "string" ? body.evidenceUrl.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!evidenceUrl) {
      return NextResponse.json({ error: "Add a selfie/photo URL for review." }, { status: 400 });
    }

    await prisma.verification.upsert({
      where: { userId_type: { userId: user.id, type: "PHOTO" } },
      update: {
        evidenceUrl,
        note,
        status: "PENDING",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewerId: null,
      },
      create: {
        userId: user.id,
        type: "PHOTO",
        evidenceUrl,
        note,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not submit verification." }, { status: 500 });
  }
}
