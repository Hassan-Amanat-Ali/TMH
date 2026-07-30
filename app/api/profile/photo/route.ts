import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";
import { isAllowedPublicMediaUrl } from "@/lib/server/r2";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!isAllowedPublicMediaUrl(url, ["image"])) {
      return NextResponse.json({ error: "Upload a profile photo through Thai My Heart first." }, { status: 400 });
    }

    const [plan, photoCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { membership: true } }).then((member) => member ? prisma.planSetting.findUnique({ where: { tier: member.membership } }) : null),
      prisma.photo.count({ where: { userId: user.id } }),
    ]);
    const maxPhotos = plan?.maxPhotos ?? 5;
    if (photoCount >= maxPhotos) {
      return NextResponse.json({ error: `Photo limit reached. Your plan allows ${maxPhotos} photos.` }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        url,
        isPrimary: photoCount === 0,
        position: photoCount,
        moderation: "APPROVED",
      },
    });

    return NextResponse.json({ ok: true, photo: { id: photo.id, url: photo.url, isPrimary: photo.isPrimary }, photoCount: photoCount + 1 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not save profile photo." }, { status: 500 });
  }
}
