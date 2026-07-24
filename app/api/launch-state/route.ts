import { NextResponse } from "next/server";
import { getLaunchSettings } from "@/lib/server/services/launch-settings";

export async function GET() {
  try {
    const settings = await getLaunchSettings();
    return NextResponse.json({
      launchMode: settings.launchMode,
      headline: settings.headline,
      subtext: settings.subtext,
      comingSoonImageUrl: settings.comingSoonImageUrl,
    });
  } catch {
    return NextResponse.json({ launchMode: "COMING_SOON" });
  }
}
