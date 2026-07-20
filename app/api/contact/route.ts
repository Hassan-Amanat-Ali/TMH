import { NextResponse } from "next/server";
import { SupportType } from "@/lib/prisma/client";
import { getCurrentUser } from "@/lib/server/session";
import { prisma } from "@/lib/server/prisma";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
    type?: unknown;
  } | null;

  const user = await getCurrentUser().catch(() => null);
  const userName = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const type = body?.type === "APPEAL" ? SupportType.APPEAL : SupportType.GENERAL;

  if (!emailPattern.test(email)) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!subject || subject.length > 160) return NextResponse.json({ error: "Subject is required and must be under 160 characters." }, { status: 400 });
  if (!message || message.length > 5000) return NextResponse.json({ error: "Message is required and must be under 5000 characters." }, { status: 400 });

  try {
    const requestRow = await prisma.supportRequest.create({
      data: {
        userId: user?.id,
        userName: user?.name || userName || null,
        email,
        subject,
        message,
        type,
        status: "OPEN",
        canReceiveMessageReply: Boolean(user?.id),
      },
    });
    return NextResponse.json({ ok: true, requestId: requestRow.id });
  } catch {
    return NextResponse.json({ error: "Could not save your support request." }, { status: 500 });
  }
}
