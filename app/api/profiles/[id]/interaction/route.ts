import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";
import { normalizeInteractionType } from "@/lib/server/services/discovery";

const DAILY_SWIPE_LIMIT = 10;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { type?: unknown } | null;
    const type = normalizeInteractionType(body?.type);

    if (!type) {
      return NextResponse.json({ error: "Unsupported interaction type." }, { status: 400 });
    }
    if (id === user.id) {
      return NextResponse.json({ error: "You cannot interact with your own profile." }, { status: 400 });
    }

    const existing = await prisma.interaction.findUnique({
      where: { fromId_toId_type: { fromId: user.id, toId: id, type } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: true, type });
    }

    const usedToday = await prisma.interaction.count({
      where: {
        fromId: user.id,
        type: { in: ["LIKE", "WINK"] },
        createdAt: { gte: startOfToday() },
      },
    });
    if (usedToday >= DAILY_SWIPE_LIMIT) {
      return NextResponse.json({ error: "Daily swipe limit reached." }, { status: 429 });
    }

    const target = await prisma.user.findFirst({
      where: {
        id,
        role: "MEMBER",
        status: "ACTIVE",
        NOT: [
          { blocksMade: { some: { blockedId: user.id } } },
          { blocksReceived: { some: { blockerId: user.id } } },
        ],
      },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    await prisma.interaction.upsert({
      where: { fromId_toId_type: { fromId: user.id, toId: id, type } },
      update: {},
      create: { fromId: user.id, toId: id, type },
    });

    return NextResponse.json({ ok: true, type });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not save interaction." }, { status: 500 });
  }
}
