import Image from "next/image";
import Link from "next/link";
import { Bell, Camera, Coins, Crown, Heart, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/server/session";
import { getDashboardData } from "@/lib/server/services/member-self-service";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const vipExpiry = data.vipExpiresAt ? new Date(data.vipExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No active VIP";

  return (
    <div className="bg-cream-100">
      <section className="bg-chrome text-cream">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-light">แดชบอร์ด · Dashboard</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <h1 className="font-serif text-5xl font-bold text-gold-light">Welcome back, {data.profile.displayName || data.profile.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-cream-200">Your account, activity, notifications, and match prompts live together here.</p>
            </div>
            <Card className="border-gold/30 bg-cream/95 p-5 text-ink">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Profile completion</p>
                  <p className="mt-1 text-4xl font-bold text-burgundy">{data.profile.completion}%</p>
                </div>
                <ShieldCheck className="h-12 w-12 text-gold" />
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-cream-300">
                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, data.profile.completion)}%` }} />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-white p-5"><Coins className="text-gold" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mauve">Coins</p><p className="text-3xl font-bold text-burgundy">{data.profile.coinBalance}</p></Card>
            <Card className="bg-white p-5"><Crown className="text-gold" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mauve">Membership</p><p className="text-3xl font-bold text-burgundy">{data.profile.membership}</p></Card>
            <Card className="bg-white p-5"><Camera className="text-gold" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mauve">Media</p><p className="text-3xl font-bold text-burgundy">{data.profile.photoCount}/{data.planLimits.maxPhotos}</p></Card>
            <Card className="bg-white p-5"><Sparkles className="text-gold" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mauve">VIP expiry</p><p className="text-lg font-bold text-burgundy">{vipExpiry}</p></Card>
          </div>

          <div id="notifications">
            <Card className="bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">กิจกรรม · Activity</p>
                  <h2 className="mt-1 font-serif text-3xl font-bold text-burgundy">Notifications feed</h2>
                </div>
                <Bell className="text-burgundy" />
              </div>
              <div className="mt-5 space-y-3">
                {data.activity.length ? data.activity.map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-start gap-4 rounded-3xl bg-cream-100 p-4 hover:bg-cream-200">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/20 text-burgundy">{item.kind === "like" ? <Heart size={18} /> : <Users size={18} />}</span>
                    <span>
                      <span className="block font-bold text-burgundy">{item.title}</span>
                      <span className="mt-1 block text-sm text-mauve-dark">{item.body}</span>
                    </span>
                    <span className="ml-auto text-xs font-bold text-mauve">{item.createdAt}</span>
                  </Link>
                )) : <p className="rounded-3xl bg-cream-100 p-5 text-mauve-dark">ยังไม่มีกิจกรรมใหม่ · No activity yet. Search and profile visits will appear here.</p>}
              </div>
            </Card>
          </div>
        </div>

        <aside className="space-y-5">
          <Card className="bg-chrome p-5 text-cream">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">Quick actions</p>
            <div className="mt-4 grid gap-3">
              <Link href="/search" className="rounded-full bg-gold px-5 py-3 text-center text-sm font-bold text-burgundy-dark">Browse matches</Link>
              <Link href="/my-profile" className="rounded-full border border-gold/30 px-5 py-3 text-center text-sm font-bold text-cream">Edit profile</Link>
              <Link href="/verify-me" className="rounded-full border border-gold/30 px-5 py-3 text-center text-sm font-bold text-cream">Verify me</Link>
            </div>
          </Card>
          <Card className="bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Recommended</p>
            <div className="mt-4 space-y-4">
              {data.recommendations.map((match) => (
                <Link key={match.id} href={`/profiles/${match.id}`} className="flex gap-3 rounded-2xl bg-cream-100 p-3 hover:bg-cream-200">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                    <Image src={match.photo} alt={match.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-burgundy">{match.name}, {match.age}</p>
                    <p className="truncate text-xs text-mauve-dark">{match.location}</p>
                    <Badge className="mt-2">{match.matchPercent}% match</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}
