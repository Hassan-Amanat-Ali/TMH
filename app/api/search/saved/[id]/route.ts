import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { deleteSavedSearch } from "@/lib/server/services/discovery";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await deleteSavedSearch(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete saved search." }, { status: 400 });
  }
}
