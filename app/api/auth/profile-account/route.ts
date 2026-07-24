import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { upsertMemberAccount } from "@/lib/server/accounts";
import { requestMetaFromHeaders } from "@/lib/server/request-meta";
import { isPublicSignupOpen } from "@/lib/server/services/launch-settings";

const genderMap = {
  woman: "WOMAN",
  man: "MAN",
  ladyboy: "LADYBOY",
  other: "OTHER",
} as const;

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : [];
}

export async function POST(request: Request) {
  try {
    if (!(await isPublicSignupOpen())) {
      return NextResponse.json({ ok: false, message: "Thai My Heart is not open for public signup yet." }, { status: 403 });
    }

    const body = await request.json();
    const email = cleanString(body?.email).toLowerCase();
    const userName = cleanString(body?.userName);
    const password = typeof body?.password === "string" ? body.password : "";
    const verificationSessionId = cleanString(body?.verificationSessionId);

    if (!email || !validEmail(email)) {
      return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
    }
    if (!userName) {
      return NextResponse.json({ ok: false, message: "User name is required." }, { status: 400 });
    }
    if (!validPassword(password)) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters and include one capital letter and one number." }, { status: 400 });
    }
    if (!verificationSessionId) {
      return NextResponse.json({ ok: false, message: "Please verify your email before creating the account." }, { status: 400 });
    }

    const verification = await prisma.emailVerificationCode.findUnique({ where: { sessionId: verificationSessionId } });
    if (!verification || verification.email !== email || !verification.consumed) {
      return NextResponse.json({ ok: false, message: "Email verification is incomplete or expired." }, { status: 400 });
    }

    const age = Number(body?.age);
    if (!Number.isFinite(age) || age < 18) {
      return NextResponse.json({ ok: false, message: "You must be at least 18 to create a profile." }, { status: 400 });
    }

    const requestMeta = requestMetaFromHeaders(request.headers);
    const genderKey = cleanString(body?.gender).toLowerCase() as keyof typeof genderMap;
    const seekingKey = cleanString(body?.seeking).toLowerCase() as keyof typeof genderMap;
    const countryCode = cleanString(body?.countryCode).slice(0, 2).toUpperCase();

    const result = await upsertMemberAccount({
      email,
      name: userName,
      password,
      emailVerified: new Date(),
      ipCountry: requestMeta.ipCountry,
      vpnSuspected: requestMeta.vpnSuspected,
      profile: {
        age,
        gender: genderMap[genderKey] || "OTHER",
        seeking: genderMap[seekingKey] || "OTHER",
        locationText: cleanString(body?.locationText),
        countryCode,
        headline: cleanString(body?.headline),
        bio: cleanString(body?.bio),
        heightCm: Number.isFinite(Number(body?.heightCm)) ? Number(body?.heightCm) : undefined,
        bodyType: cleanString(body?.bodyType),
        children: cleanString(body?.children),
        wantChildren: cleanString(body?.wantChildren),
        smoking: cleanString(body?.smoking),
        drinking: cleanString(body?.drinking),
        religion: cleanString(body?.religion),
        profession: cleanString(body?.profession),
        exercise: cleanString(body?.exercise),
        relocate: cleanString(body?.relocate),
        languages: cleanArray(body?.languages),
        interests: cleanArray(body?.interests),
        goals: cleanArray(body?.goals),
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to create your account right now." }, { status: 500 });
  }
}
