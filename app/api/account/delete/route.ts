import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/server/session";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Please sign in before deleting your account." }, { status: 401 });
    }

    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password) {
      return NextResponse.json({ ok: false, message: "Please confirm your password to delete your account." }, { status: 400 });
    }

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) {
      return NextResponse.json({ ok: false, message: "Account not found." }, { status: 404 });
    }

    const validPassword = await bcrypt.compare(password, record.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ ok: false, message: "The password you entered is incorrect." }, { status: 401 });
    }

    await prisma.user.delete({ where: { id: record.id } });
    return NextResponse.json({ ok: true, deletedFromDatabase: true, message: "Your account has been deleted successfully." });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to delete the account right now. Please try again." }, { status: 500 });
  }
}

export const POST = DELETE;
