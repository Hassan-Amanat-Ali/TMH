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

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { id?: unknown; isPrimary?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id || body?.isPrimary !== true) {
      return NextResponse.json({ error: "Choose a photo to make primary." }, { status: 400 });
    }

    const photo = await prisma.photo.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    await prisma.$transaction([
      prisma.photo.updateMany({ where: { userId: user.id }, data: { isPrimary: false } }),
      prisma.photo.update({ where: { id }, data: { isPrimary: true, position: 0 } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not update profile photo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Choose a photo to delete." }, { status: 400 });

    const photo = await prisma.photo.findFirst({ where: { id, userId: user.id }, select: { id: true, isPrimary: true } });
    if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    await prisma.photo.delete({ where: { id } });
    if (photo.isPrimary) {
      const nextPrimary = await prisma.photo.findFirst({ where: { userId: user.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (nextPrimary) await prisma.photo.update({ where: { id: nextPrimary.id }, data: { isPrimary: true, position: 0 } });
    }
    const photoCount = await prisma.photo.count({ where: { userId: user.id } });

    return NextResponse.json({ ok: true, photoCount });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not delete profile photo." }, { status: 500 });
  }
}
