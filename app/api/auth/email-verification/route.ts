import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { sendVerificationCodeEmail, sendWelcomeEmail } from "@/lib/server/mailer";

const codeTtlMs = 10 * 60 * 1000;
const defaultDevVerificationCode = "4286";

function generateCode() {
  const envCode = String(process.env.EMAIL_VERIFICATION_CODE || "").trim();
  if (/^\d{4}$/.test(envCode)) return envCode;
  if (process.env.NODE_ENV !== "production") return defaultDevVerificationCode;
  return String(randomInt(0, 10000)).padStart(4, "0");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const userName = typeof body?.userName === "string" ? body.userName.trim() : "Member";

    if (!email || !validEmail(email)) {
      return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "An account already exists for this email." }, { status: 409 });
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const sessionId = `tmh-ev-${Date.now()}-${randomInt(1000, 9999)}`;
    const expiresAt = new Date(Date.now() + codeTtlMs);

    await prisma.emailVerificationCode.deleteMany({ where: { email } });
    await prisma.emailVerificationCode.create({ data: { sessionId, email, userName, codeHash, expiresAt } });

    let emailDelivery = "sent";
    try {
      await sendVerificationCodeEmail(email, code);
    } catch {
      if (process.env.NODE_ENV === "production") throw new Error("email-delivery-failed");
      emailDelivery = "dev-fallback";
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      expiresAt: expiresAt.toISOString(),
      ...(emailDelivery === "dev-fallback" ? { devCode: code } : {}),
      message: "Verification code sent.",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to send verification email right now." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!sessionId || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ ok: false, message: "Session and 4-digit code are required." }, { status: 400 });
    }

    const target = await prisma.emailVerificationCode.findUnique({ where: { sessionId } });
    if (!target || target.consumed) {
      return NextResponse.json({ ok: false, message: "Verification session not found." }, { status: 404 });
    }
    if (target.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, message: "Code expired. Request a new one." }, { status: 400 });
    }
    if (target.attempts >= 5) {
      return NextResponse.json({ ok: false, message: "Too many attempts. Request a new code." }, { status: 429 });
    }

    const matches = await bcrypt.compare(code, target.codeHash);
    if (!matches) {
      await prisma.emailVerificationCode.update({ where: { id: target.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ ok: false, message: "Incorrect code." }, { status: 400 });
    }

    await prisma.emailVerificationCode.update({ where: { id: target.id }, data: { consumed: true } });
    await prisma.user.updateMany({ where: { email: target.email }, data: { emailVerified: new Date() } }).catch(() => undefined);
    await sendWelcomeEmail(target.email, target.userName || "Member").catch(() => undefined);

    return NextResponse.json({ ok: true, email: target.email });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to verify code right now." }, { status: 500 });
  }
}
