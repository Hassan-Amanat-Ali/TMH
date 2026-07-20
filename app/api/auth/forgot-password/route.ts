import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { sendPasswordResetEmail } from "@/lib/server/mailer";

const tokenTtlMs = 30 * 60 * 1000;

function makeResetLink(request: Request, token: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(request.url).origin;
  const origin = configuredOrigin.replace(/\/$/, "");
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !validEmail(email)) {
      return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
    }

    const genericResponse = NextResponse.json({ ok: true, message: "If this email exists, a password reset link has been sent." });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return genericResponse;

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + tokenTtlMs);
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } });
    await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
    await sendPasswordResetEmail(email, user.name || "Member", makeResetLink(request, token));

    return genericResponse;
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to process password reset right now." }, { status: 500 });
  }
}
