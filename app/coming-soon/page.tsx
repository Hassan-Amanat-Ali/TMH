import Link from "next/link";
import { Heart } from "lucide-react";
import { getLaunchSettings } from "@/lib/server/services/launch-settings";

export default async function ComingSoonPage() {
  const settings = await getLaunchSettings();
  const hasImage = Boolean(settings.comingSoonImageUrl);

  return (
    <main className="min-h-screen bg-burgundy-dark text-cream">
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        {hasImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${settings.comingSoonImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(52,8,23,.95),rgba(74,15,35,.84)_48%,rgba(20,9,15,.92))]" />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-black/20 px-4 py-2 text-xs font-bold uppercase text-gold-light">
              <Heart className="h-4 w-4" />
              Thai My Heart
            </div>
            <h1 className="mt-7 font-serif text-5xl font-black text-gold-light sm:text-6xl lg:text-7xl">
              {settings.headline || "Thai My Heart is almost ready"}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream-100 sm:text-lg">
              {settings.subtext || "Invited members can sign in while we prepare the public launch."}
            </p>
            <div className="mt-8">
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-6 text-sm font-black text-burgundy-dark shadow-[0_16px_35px_rgba(0,0,0,.32)]">
                Members sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
