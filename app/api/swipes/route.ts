import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";

const DAILY_SWIPE_LIMIT = 10;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function interactionSwipeCount(userId: string) {
  return prisma.interaction.count({
    where: {
      fromId: userId,
      type: { in: ["LIKE", "WINK"] },
      createdAt: { gte: startOfToday() },
    },
  });
}

export async function GET() {
  try {
    const user = await requireUser();
    const used = await interactionSwipeCount(user.id);
    return NextResponse.json({ limit: DAILY_SWIPE_LIMIT, used, remaining: Math.max(0, DAILY_SWIPE_LIMIT - used) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not read swipe limit." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { action?: unknown; profileId?: unknown } | null;
    const action = body?.action;
    const profileId = typeof body?.profileId === "string" ? body.profileId : null;

    if ((action === "LIKE" || action === "WINK") && profileId) {
      const existing = await prisma.interaction.findUnique({
        where: { fromId_toId_type: { fromId: user.id, toId: profileId, type: action } },
        select: { id: true },
      });
      if (existing) {
        const used = await interactionSwipeCount(user.id);
        return NextResponse.json({ ok: true, limit: DAILY_SWIPE_LIMIT, used, remaining: Math.max(0, DAILY_SWIPE_LIMIT - used) });
      }
    }

    const used = await interactionSwipeCount(user.id);
    if (used >= DAILY_SWIPE_LIMIT) {
      return NextResponse.json({ error: "Daily swipe limit reached.", limit: DAILY_SWIPE_LIMIT, used, remaining: 0 }, { status: 429 });
    }

    if ((action === "LIKE" || action === "WINK") && profileId && profileId !== user.id) {
      const target = await prisma.user.findFirst({ where: { id: profileId, role: "MEMBER", status: "ACTIVE" }, select: { id: true } });
      if (!target) {
        return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      }
      await prisma.interaction.upsert({
        where: { fromId_toId_type: { fromId: user.id, toId: profileId, type: action } },
        update: {},
        create: { fromId: user.id, toId: profileId, type: action },
      });
    }

    return NextResponse.json({ ok: true, limit: DAILY_SWIPE_LIMIT, used: used + 1, remaining: Math.max(0, DAILY_SWIPE_LIMIT - used - 1) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not record swipe." }, { status: 500 });
  }
}
