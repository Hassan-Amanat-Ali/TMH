import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/server/session";
import { getUnreadMessageCount } from "@/lib/server/services/messaging";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ unread: await getUnreadMessageCount(user.id) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not load unread count." }, { status: 500 });
  }
}
