import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { createSavedSearch, listSavedSearches, type DiscoveryFilters } from "@/lib/server/services/discovery";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ savedSearches: await listSavedSearches(user.id) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not load saved searches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { name?: unknown; filters?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name : "Saved search";
    const filters = body?.filters && typeof body.filters === "object" ? (body.filters as DiscoveryFilters) : {};
    const saved = await createSavedSearch(user.id, name, filters);
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save search." }, { status: 400 });
  }
}
