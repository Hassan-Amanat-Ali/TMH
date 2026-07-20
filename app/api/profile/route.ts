import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthError, requireUser } from "@/lib/server/session";
import { profilePatchToData } from "@/lib/server/services/member-self-service";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as Record<string, string> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
    }

    const { profile, completion } = profilePatchToData(body);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name?.trim() || undefined,
        profile: {
          upsert: {
            update: { ...profile, completion },
            create: { ...profile, completion },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, completion });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
