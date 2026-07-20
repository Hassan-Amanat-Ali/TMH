import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { getConversationDetail, sendConversationMessage } from "@/lib/server/services/messaging";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const conversation = await getConversationDetail(user.id, id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { body?: unknown; mediaUrl?: unknown; type?: unknown } | null;
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : "";
    const type = body?.type === "IMAGE" ? "IMAGE" : "TEXT";
    if (type === "TEXT" && (!text || text.length > 2000)) return NextResponse.json({ error: "Message must be 1-2000 characters." }, { status: 400 });
    if (type === "IMAGE" && (!mediaUrl || text.length > 500)) return NextResponse.json({ error: "Image message requires an image and an optional caption under 500 characters." }, { status: 400 });
    const result = await sendConversationMessage(user.id, id, { body: text, mediaUrl, type });
    return NextResponse.json({ ok: true, messageId: result.message.id, warning: result.warning });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send message." }, { status: 400 });
  }
}
