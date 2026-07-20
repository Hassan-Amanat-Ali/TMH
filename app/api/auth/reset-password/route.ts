import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";

function validPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const passwordConfirm = typeof body?.passwordConfirm === "string" ? body.passwordConfirm : "";

    if (!token || !password || !passwordConfirm) {
      return NextResponse.json({ ok: false, message: "Token and password fields are required." }, { status: 400 });
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
    }
    if (!validPassword(password)) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters and include one capital letter and one number." }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used) {
      return NextResponse.json({ ok: false, message: "Reset link is invalid." }, { status: 400 });
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, message: "Reset link has expired." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    return NextResponse.json({ ok: true, message: "Password reset successful." });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to reset password right now." }, { status: 500 });
  }
}
