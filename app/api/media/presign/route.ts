import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { createPresignedMediaUpload, type MediaUploadType } from "@/lib/server/r2";

const uploadTypes: MediaUploadType[] = ["profile-photo", "verification", "reel", "reel-thumbnail", "message"];

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { type?: unknown; fileName?: unknown; contentType?: unknown; size?: unknown } | null;
    const type = typeof body?.type === "string" && uploadTypes.includes(body.type as MediaUploadType) ? body.type as MediaUploadType : null;
    const contentType = typeof body?.contentType === "string" ? body.contentType : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName : "upload";
    const size = typeof body?.size === "number" ? body.size : Number(body?.size);

    if (!type) return NextResponse.json({ error: "Choose a valid upload type." }, { status: 400 });

    const upload = await createPresignedMediaUpload({ userId: user.id, type, fileName, contentType, size });
    return NextResponse.json({ ok: true, upload });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare upload." }, { status: 400 });
  }
}
