import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    await requireUser();
    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Translation is not configured.", enabled: false }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as { text?: unknown; target?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const target = typeof body?.target === "string" ? body.target.trim() || "en" : "en";
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: "Text must be 1-2000 characters." }, { status: 400 });
    }

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target, format: "text" }),
    });
    const result = (await response.json().catch(() => null)) as { data?: { translations?: Array<{ translatedText?: string }> }; error?: { message?: string } } | null;
    if (!response.ok) {
      return NextResponse.json({ error: result?.error?.message || "Translation failed." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, enabled: true, translatedText: result?.data?.translations?.[0]?.translatedText || "" });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not translate message." }, { status: 500 });
  }
}
