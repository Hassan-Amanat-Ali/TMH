import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    if (id === user.id) {
      return NextResponse.json({ ok: true, skipped: true });
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

    await prisma.profileVisit.create({ data: { visitorId: user.id, profileId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not record visit." }, { status: 500 });
  }
}
