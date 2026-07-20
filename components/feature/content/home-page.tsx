"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Check, Heart, Home, Lock, MessageCircle, Play, Plus, Search, ShieldCheck, Star, Video } from "lucide-react";
import type { DiscoveryProfile } from "@/lib/server/services/discovery";

type MarketingHomePageProps = {
  profiles: DiscoveryProfile[];
  isSignedIn: boolean;
};

const heroImage = "https://images.unsplash.com/photo-1534008897995-27a23e859048?auto=format&fit=crop&w=1800&q=85";

const reelImages = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80",
];

const trustItems = [
  { icon: ShieldCheck, title: "Verified Profiles", sub: "Real people, real love." },
  { icon: Lock, title: "Safe & Secure", sub: "Your privacy matters." },
  { icon: Heart, title: "Serious Members", sub: "Committed to lasting love." },
  { icon: Star, title: "Thai & International", sub: "Global connections." },
  { icon: MessageCircle, title: "24/7 Support", sub: "We're here to help." },
];

const reels = [
  { name: "Nicha", age: 29, views: "12K", likes: 128 },
  { name: "Araya", age: 27, views: "9.1K", likes: 96 },
  { name: "Pawara", age: 28, views: "8.7K", likes: 84 },
  { name: "Orn", age: 30, views: "11K", likes: 112 },
];

function cityOnly(location: string) {
  return location.split(",")[0]?.trim() || location;
}

function profileHref(profile: DiscoveryProfile, isSignedIn: boolean) {
  return isSignedIn ? `/profiles/${profile.userId}` : "/?login=1";
}

export function MarketingHomePage({ profiles, isSignedIn }: MarketingHomePageProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const onlineMembers = useMemo(() => {
    const online = profiles.filter((profile) => profile.online);
    return [...online, ...profiles.filter((profile) => !profile.online)].slice(0, 6);
  }, [profiles]);

  const recommended = useMemo(() => profiles.slice(0, 4), [profiles]);
  const featured = useMemo(() => profiles.slice(0, 3), [profiles]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/search${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="bg-[#FBF5EC] pb-16 text-ink lg:pb-0">
      <section className="relative min-h-[430px] overflow-hidden bg-burgundy-dark">
        <div className="absolute right-0 top-0 hidden h-full w-[62%] md:block">
          <Image src={heroImage} alt="Couple at golden hour with lanterns" fill priority sizes="62vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A0E18] via-[#4A0E18]/55 to-transparent" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#4A0E18] via-burgundy-dark to-burgundy-dark/20" />
        <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-14">
          <div className="max-w-[520px]">
            <h1 className="m-0 font-serif text-5xl font-semibold leading-[1.08] text-[#FFF3E8] sm:text-6xl">
              Find Love That
              <br />
              <span className="text-gold-light">Lasts Forever</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#EFD0C2]">Serious Relationships. Beautiful Connections. A Future Together.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-light to-gold px-7 text-[15px] font-bold text-[#3A2A12] shadow-[0_14px_30px_rgba(0,0,0,.35)]">
                Join Free Now
              </Link>
              <Link href="/how-to-use" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gold-light/60 px-7 text-[15px] font-semibold text-gold-light">
                Learn More
              </Link>
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D9A98F]">
              <Check className="h-4 w-4 text-gold-light" /> Safe, Secure & Trusted by Thousands
            </p>
            <form onSubmit={submit} className="mt-6 flex rounded-2xl border border-gold/25 bg-white/95 p-2 shadow-soft md:hidden">
              <Search className="ml-3 mt-3 h-5 w-5 text-burgundy" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by city or name" className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none" />
              <button type="submit" className="rounded-xl bg-burgundy px-4 text-sm font-bold text-cream">Search</button>
            </form>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-[34px] grid max-w-7xl grid-cols-2 gap-3 rounded-2xl border border-[#F0E4D6] bg-white px-4 py-5 shadow-[0_18px_40px_rgba(74,27,38,.14)] sm:grid-cols-3 md:grid-cols-5 lg:px-8">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F7E9E3] text-burgundy">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[12.5px] font-bold text-ink">{item.title}</span>
              <span className="text-[10.5px] text-mauve">{item.sub}</span>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-9 sm:px-6 lg:px-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl font-semibold text-chrome">Online Now</h2>
          <Link href="/search?online=1" className="text-sm font-semibold text-burgundy">View all -&gt;</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {onlineMembers.map((member) => (
            <Link key={member.id} href={profileHref(member, isSignedIn)} className="overflow-hidden rounded-[14px] border border-[#F0E4D6] bg-white shadow-[0_8px_22px_rgba(122,34,51,.06)]">
              <div className="relative h-[150px]">
                <Image src={member.primaryPhoto} alt={member.name} fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover" />
                <span className="absolute right-2.5 top-2.5 h-3 w-3 rounded-full border-2 border-white bg-verified" />
              </div>
              <div className="px-3 py-2 text-center">
                <div className="truncate text-[12.5px] font-bold text-ink">{member.name}, {member.age}</div>
                <div className="truncate text-[10.5px] font-medium text-mauve">{cityOnly(member.location)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-9 sm:px-6 lg:px-14">
        <div className="mb-4 flex flex-wrap items-baseline gap-3">
          <h2 className="font-serif text-3xl font-semibold text-chrome">Heart Reels</h2>
          <p className="text-sm font-medium text-mauve">Short stories from members - reply to start a conversation</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {reels.map((reel, index) => (
            <Link key={reel.name} href={isSignedIn ? "/reels" : "/?login=1"} className="relative h-[300px] w-[212px] flex-none overflow-hidden rounded-2xl shadow-[0_14px_32px_rgba(74,27,38,.16)]">
              <Image src={reelImages[index]} alt={`${reel.name} reel`} fill sizes="212px" className="object-cover" />
              <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-chrome-deep/60 px-2.5 py-1 text-[10.5px] font-semibold text-[#FFF3E8]">
                <Play className="h-3 w-3 fill-current" /> {reel.views}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-chrome-deep/90 via-chrome-deep/70 to-transparent px-3 pb-3 pt-10">
                <span className="text-sm font-bold text-[#FFF8EE]">{reel.name}, {reel.age}</span>
                <span className="flex gap-2">
                  <span className="flex-1 rounded-[9px] border border-[#FFF8EE]/40 bg-[#FFF8EE]/20 py-2 text-center text-[11px] font-semibold text-[#FFF8EE]">Heart {reel.likes}</span>
                  <span className="flex-[1.4] rounded-[9px] bg-gradient-to-br from-gold-light to-gold py-2 text-center text-[11px] font-bold text-[#3A2A12]">Reply -&gt;</span>
                </span>
              </div>
            </Link>
          ))}
          <Link href={isSignedIn ? "/reels/new" : "/?login=1"} className="flex h-[300px] w-[212px] flex-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#DCC0A6] bg-[#FDF9F1] text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F7E9E3] text-burgundy">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-[12.5px] font-semibold text-burgundy">Add your Heart Reel</span>
            <span className="max-w-[150px] text-[10.5px] text-mauve">Appear in the reels feed for 24 hours</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-9 sm:px-6 lg:px-14">
        <h2 className="mb-4 font-serif text-3xl font-semibold text-chrome">Recommended For You</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommended.map((profile) => (
            <Link key={profile.id} href={profileHref(profile, isSignedIn)} className="relative h-[330px] overflow-hidden rounded-2xl shadow-[0_12px_28px_rgba(74,27,38,.14)]">
              <Image src={profile.primaryPhoto} alt={profile.name} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-chrome-deep/90 via-chrome-deep/65 to-transparent p-4 pt-16 text-[#FFF8EE]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate text-lg font-bold">{profile.name}, {profile.age} {profile.verified && <Check className="inline h-4 w-4 text-gold-light" />}</h3>
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#FFF8EE] text-burgundy">
                    <Heart className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-[#EFD0C2]">{profile.location}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#FFF8EE]/90">{profile.bio}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-14">
        <div className="grid gap-5 rounded-3xl bg-gradient-to-r from-burgundy-dark via-burgundy to-[#6E1C2D] p-6 text-cream shadow-soft md:grid-cols-[1fr_auto] md:items-center lg:p-8">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-gold-light">Upgrade to VIP - Unlock More Love</h2>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-cream-200 sm:grid-cols-3">
              <span>See who likes you</span>
              <span>Unlimited messaging</span>
              <span>Stand out in search</span>
            </div>
          </div>
          <Link href="/vip" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-light to-gold px-7 text-sm font-bold text-[#3A2A12]">
            View VIP Plans
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 md:hidden">
        <form onSubmit={submit} className="mb-4 flex rounded-2xl border border-[#F0E4D6] bg-white p-2 shadow-[0_8px_22px_rgba(122,34,51,.06)]">
          <Search className="ml-3 mt-3 h-5 w-5 text-burgundy" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search matches" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
          <button type="submit" className="rounded-xl bg-burgundy px-4 text-sm font-bold text-cream">Go</button>
        </form>
        <div className="mb-4">
          <h2 className="mb-3 font-serif text-2xl font-semibold text-chrome">Featured Matches</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {featured.map((profile) => (
              <Link key={profile.id} href={profileHref(profile, isSignedIn)} className="w-36 flex-none overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(122,34,51,.08)]">
                <div className="relative h-40">
                  <Image src={profile.primaryPhoto} alt={profile.name} fill sizes="144px" className="object-cover" />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{profile.name}, {profile.age}</p>
                  <p className="truncate text-xs text-mauve">{cityOnly(profile.location)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <Link href={isSignedIn ? "/likes" : "/?login=1"} className="mb-5 flex items-center justify-between rounded-2xl bg-[#F7E9E3] px-4 py-3 text-sm font-bold text-burgundy">
          <span>You have {isSignedIn ? 5 : 0} new likes</span>
          <Heart className="h-5 w-5 fill-current" />
        </Link>
        <div>
          <h2 className="mb-3 font-serif text-2xl font-semibold text-chrome">Discover New People</h2>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {["All", "New", "Online", "Nearby"].map((chip) => (
              <button key={chip} type="button" onClick={() => setFilter(chip)} className={filter === chip ? "rounded-full bg-burgundy px-4 py-2 text-xs font-bold text-cream" : "rounded-full border border-[#D9C6B2] bg-white px-4 py-2 text-xs font-bold text-mauve-dark"}>
                {chip}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recommended.slice(0, 4).map((profile) => (
              <Link key={profile.id} href={profileHref(profile, isSignedIn)} className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(122,34,51,.08)]">
                <div className="relative h-44">
                  <Image src={profile.primaryPhoto} alt={profile.name} fill sizes="50vw" className="object-cover" />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{profile.name}, {profile.age}</p>
                  <p className="truncate text-xs text-mauve">{cityOnly(profile.location)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#EFE2D0] bg-[#FFFDF8] px-2 pb-2 pt-2 md:hidden">
        {[
          { label: "Home", href: "/", icon: Home },
          { label: "Search", href: "/search", icon: Search },
          { label: "Likes", href: isSignedIn ? "/likes" : "/?login=1", icon: Heart },
          { label: "Messages", href: isSignedIn ? "/messages" : "/?login=1", icon: MessageCircle },
          { label: "Reels", href: "/reels", icon: Video },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={index === 0 ? "flex flex-col items-center gap-1 text-[10px] font-bold text-burgundy" : "flex flex-col items-center gap-1 text-[10px] font-bold text-mauve"}>
              <Icon className={index === 0 ? "h-5 w-5 fill-current" : "h-5 w-5"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
