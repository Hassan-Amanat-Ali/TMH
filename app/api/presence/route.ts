import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { prisma } from "@/lib/server/prisma";

export async function POST() {
  try {
    const user = await requireUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
      select: { id: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not update presence." }, { status: 400 });
  }
}
