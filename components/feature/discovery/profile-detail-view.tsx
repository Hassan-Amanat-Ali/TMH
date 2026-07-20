import Image from "next/image";
import Link from "next/link";
import { Flag, MapPin, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import type { DiscoveryProfile } from "@/lib/server/services/discovery";
import { Badge, Card, Chip } from "@/components/ui";
import { MatchBadge } from "./match-badge";
import { ProfileActionButtons } from "./profile-action-buttons";
import { ProfileVisitTracker } from "./profile-visit-tracker";
import { SendGiftButton, type GiftOption } from "@/components/feature/economy/send-gift-button";

export function ProfileDetailView({ profile, gifts = [], giftBalance = 0 }: { profile: DiscoveryProfile; gifts?: GiftOption[]; giftBalance?: number }) {
  return (
    <div className="bg-cream-100">
      <ProfileVisitTracker profileId={profile.userId} />
      <section className="relative min-h-[72vh] overflow-hidden bg-chrome text-cream">
        <Image src={profile.primaryPhoto} alt={profile.name} fill priority sizes="100vw" className="object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-t from-chrome-deep via-chrome/50 to-chrome-deep/20" />
        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/search" className="mb-auto w-fit rounded-full border border-gold/30 bg-chrome/60 px-4 py-2 text-sm font-bold text-gold-light">
            Back to search
          </Link>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {profile.membership === "VIP" && <Badge tone="vip">VIP member</Badge>}
                {profile.verified && <Badge tone="verified">Photo verified</Badge>}
                {profile.online && <Badge tone="online">Online now</Badge>}
                {profile.hasReel && <Badge tone="reel">Heart Reel</Badge>}
              </div>
              <h1 className="font-serif text-6xl font-bold text-gold-light sm:text-7xl">
                {profile.name}, {profile.age}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-cream-200">
                <MapPin size={18} />
                {profile.location}
              </p>
              <p className="mt-5 max-w-2xl text-xl leading-8 text-cream">{profile.headline}</p>
            </div>
            <Card className="border-gold/30 bg-cream/95 p-6 text-ink">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Compatibility</p>
                  <h2 className="mt-1 font-serif text-3xl font-bold text-burgundy">Strong match</h2>
                </div>
                <MatchBadge percent={profile.matchPercent} size="lg" />
              </div>
              <div className="mt-5">
                <ProfileActionButtons profileId={profile.userId} liked={profile.likedByViewer} favourited={profile.favouritedByViewer} />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-6">
          <Card className="bg-white p-6">
            <h2 className="font-serif text-3xl font-bold text-burgundy">Gallery</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {profile.photos.slice(0, 5).map((photo, index) => (
                <div key={photo} className={`relative overflow-hidden rounded-3xl ${index === 0 ? "aspect-[4/5] sm:col-span-2 sm:row-span-2" : "aspect-square"}`}>
                  <Image src={photo} alt={`${profile.name} gallery ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white p-6">
            <h2 className="font-serif text-3xl font-bold text-burgundy">About {profile.name}</h2>
            <p className="mt-4 text-base leading-8 text-mauve-dark">{profile.bio}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-cream-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Intent</p>
                <p className="mt-2 font-semibold text-burgundy">{profile.intent || "Serious dating"}</p>
              </div>
              <div className="rounded-3xl bg-cream-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Work</p>
                <p className="mt-2 font-semibold text-burgundy">{profile.profession || "Not shared yet"}</p>
              </div>
              <div className="rounded-3xl bg-cream-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Profile tier</p>
                <p className="mt-2 font-semibold text-burgundy">{profile.tier}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white p-6">
            <h2 className="font-serif text-3xl font-bold text-burgundy">Lifestyle & Goals</h2>
            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-mauve">Languages</p>
                <div className="flex flex-wrap gap-2">{profile.languages.map((item) => <Chip key={item}>{item}</Chip>)}</div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-mauve">Interests</p>
                <div className="flex flex-wrap gap-2">{profile.interests.map((item) => <Chip key={item}>{item}</Chip>)}</div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-mauve">Goals</p>
                <div className="flex flex-wrap gap-2">{profile.goals.map((item) => <Chip key={item}>{item}</Chip>)}</div>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="bg-chrome p-5 text-cream">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">Start softly</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-gold-light">Send a thoughtful hello</h2>
            <div className="mt-5 grid gap-3">
              <Link href={`/messages?with=${profile.userId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-burgundy-dark shadow-soft hover:bg-gold-light">
                <MessageCircle size={18} />
                Message
              </Link>
              <SendGiftButton receiverId={profile.userId} receiverName={profile.name} gifts={gifts} initialBalance={giftBalance} compact />
            </div>
          </Card>
          <Card className="bg-white p-5">
            <div className="flex items-center gap-3 text-burgundy">
              <ShieldCheck size={22} />
              <h2 className="font-serif text-2xl font-bold">Safety</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-mauve-dark">Verified signals, anti-leakage rules, and report tools keep early conversations on-platform.</p>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-danger">
              <Flag size={16} />
              Report profile
            </button>
          </Card>
          <Card className="bg-white p-5">
            <div className="flex items-center gap-3 text-burgundy">
              <Sparkles size={22} />
              <h2 className="font-serif text-2xl font-bold">Match notes</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-mauve-dark">
              <li>Shared interest in {profile.goals[0] || "serious dating"}.</li>
              <li>{profile.verified ? "Verified profile gives stronger trust." : "Verification still pending."}</li>
              <li>{profile.hasReel ? "Recent Heart Reel adds freshness." : "No Heart Reel yet."}</li>
            </ul>
          </Card>
        </aside>
      </main>
    </div>
  );
}
