import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { getOrCreateConversation, listConversations } from "@/lib/server/services/messaging";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ conversations: await listConversations(user.id) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not list conversations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { participantId?: unknown } | null;
    const participantId = typeof body?.participantId === "string" ? body.participantId : "";
    if (!participantId) return NextResponse.json({ error: "participantId is required." }, { status: 400 });
    const conversation = await getOrCreateConversation(user.id, participantId);
    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create conversation." }, { status: 400 });
  }
}
