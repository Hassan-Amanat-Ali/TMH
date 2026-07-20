import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";
import { unblockConversation } from "@/lib/server/services/messaging";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, OR: [{ participantAId: user.id }, { participantBId: user.id }] },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const blockedId = conversation.participantAId === user.id ? conversation.participantBId : conversation.participantAId;
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
      update: {},
      create: { blockerId: user.id, blockedId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not block member." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await unblockConversation(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not unblock member." }, { status: 400 });
  }
}
