"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, type PanInfo } from "framer-motion";
import {
  Bookmark,
  Check,
  Crown,
  Gift,
  Heart,
  List,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { DiscoveryAd, DiscoveryFilters, DiscoveryProfile, LocationOption, SavedSearchSummary } from "@/lib/server/services/discovery";
import { Badge, Button, Chip, Input } from "@/components/ui";
import { MatchBadge } from "./match-badge";

type ViewMode = "swipe" | "scroll";
type SwipePulse = "like" | "pass" | "wink" | null;
type SortMode = "best" | "popular" | "recent";

const SWIPE_LIMIT = 10;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function profileHref(profileId: string, isSignedIn: boolean) {
  return isSignedIn ? `/profiles/${profileId}` : `/?login=1&next=${encodeURIComponent(`/profiles/${profileId}`)}`;
}

function messageHref(profileId: string, isSignedIn: boolean) {
  return isSignedIn ? `/messages?with=${profileId}` : `/?login=1&next=${encodeURIComponent(`/messages?with=${profileId}`)}`;
}

function AdCard({ ad, compact = false }: { ad: DiscoveryAd; compact?: boolean }) {
  return (
    <a href={ad.targetUrl || "/vip"} className="block overflow-hidden rounded-2xl border border-gold/25 bg-chrome text-cream shadow-soft">
      <div className={`relative ${compact ? "h-28" : "h-44"}`}>
        <Image src={ad.imageUrl} alt={ad.title} fill sizes="(max-width: 768px) 100vw, 264px" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-chrome-deep via-chrome-deep/30 to-transparent" />
        <Badge tone="vip" className="absolute left-3 top-3 bg-chrome/80">
          Sponsored
        </Badge>
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-light">{ad.advertiser || "Thai My Heart"}</p>
        <h3 className="mt-1 font-serif text-xl font-bold text-gold-light">{ad.title}</h3>
        <p className="mt-2 text-sm leading-5 text-cream-200">Boost your profile and meet more compatible members.</p>
      </div>
    </a>
  );
}

function SearchActionButtons({ profile, isSignedIn }: { profile: DiscoveryProfile; isSignedIn: boolean }) {
  const [liked, setLiked] = useState(profile.likedByViewer);
  const [favourited, setFavourited] = useState(profile.favouritedByViewer);
  const [pending, setPending] = useState<string | null>(null);
  const loginUrl = profileHref(profile.userId, false);

  async function send(type: "LIKE" | "FAVOURITE") {
    if (!isSignedIn) return;
    setPending(type);
    if (type === "LIKE") setLiked(true);
    if (type === "FAVOURITE") setFavourited(true);
    try {
      const response = await fetch(`/api/profiles/${profile.userId}/interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        if (type === "LIKE") setLiked(profile.likedByViewer);
        if (type === "FAVOURITE") setFavourited(profile.favouritedByViewer);
      }
    } finally {
      setPending(null);
    }
  }

  const iconClass = "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cream-300 bg-white text-burgundy shadow-sm transition hover:border-burgundy/30";

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center gap-2 md:flex-col">
        <Link href={loginUrl} className={iconClass} aria-label="Like profile">
          <Heart size={17} />
        </Link>
        <Link href={messageHref(profile.userId, false)} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-burgundy px-3 text-xs font-black text-cream shadow-sm md:w-10 md:px-0" aria-label="Say hello">
          <MessageCircle size={17} />
          <span className="md:hidden">Say Hello</span>
        </Link>
        <Link href={loginUrl} className={iconClass} aria-label="Save profile">
          <Bookmark size={17} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 md:flex-col">
      <button type="button" className={iconClass} aria-label="Like profile" disabled={pending !== null} onClick={() => send("LIKE")}>
        <Heart size={17} className={liked ? "fill-current" : ""} />
      </button>
      <Link href={messageHref(profile.userId, true)} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-burgundy px-3 text-xs font-black text-cream shadow-sm md:w-10 md:bg-rose-50 md:px-0 md:text-burgundy" aria-label="Say hello">
        <MessageCircle size={17} />
        <span className="md:hidden">Say Hello</span>
      </Link>
      <button type="button" className={`${iconClass} text-gold-dark`} aria-label="Save profile" disabled={pending !== null} onClick={() => send("FAVOURITE")}>
        <Bookmark size={17} className={favourited ? "fill-current" : ""} />
      </button>
    </div>
  );
}

function ResultCard({ profile, priority = false, isSignedIn }: { profile: DiscoveryProfile; priority?: boolean; isSignedIn: boolean }) {
  const tags = [...profile.interests, ...profile.goals].slice(0, 3);

  return (
    <article className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#F0E4D6] bg-white p-3 shadow-[0_8px_22px_rgba(122,34,51,0.06)] sm:grid-cols-[132px_minmax(0,1fr)] md:grid-cols-[158px_minmax(0,1fr)_72px] md:gap-4">
      <Link href={profileHref(profile.userId, isSignedIn)} className="relative min-h-[150px] overflow-hidden rounded-xl sm:min-h-[168px] md:h-[180px] md:min-h-0">
        <Image src={profile.primaryPhoto} alt={profile.name} fill priority={priority} sizes="(max-width: 640px) 112px, (max-width: 768px) 132px, 158px" className="object-cover transition duration-500 hover:scale-105" />
        <div className="absolute left-2 top-2 flex flex-col gap-2">
          {profile.online ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Online
            </span>
          ) : null}
          {profile.hasReel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-cream">
              <List size={13} />
              Reel
            </span>
          ) : null}
        </div>
        {profile.membership === "VIP" ? (
          <span className="absolute right-2 top-2 rounded-lg bg-gold px-2 py-1 text-xs font-black text-burgundy-dark">
            VIP
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2 rounded-lg bg-black/45 px-2 py-1 text-xs font-bold text-cream">{profile.photos.length} photos</span>
      </Link>

      <div className="min-w-0 py-1">
        <Link href={profileHref(profile.userId, isSignedIn)} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <h2 className="truncate text-lg font-black text-ink sm:text-xl">
            {profile.name}, {profile.age}
          </h2>
          {profile.verified ? <ShieldCheck size={18} className="shrink-0 fill-sky-500 text-white" /> : null}
          {profile.newHere ? <Badge tone="new">New</Badge> : null}
        </Link>
        <p className="mt-1 truncate text-sm font-semibold text-mauve-dark">{profile.location}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-burgundy md:mt-3">Looking for</p>
        <p className="mt-1 text-sm font-bold text-ink">{profile.intent || "Long-term relationship"}</p>
        <p className="mt-2 line-clamp-2 text-sm italic leading-5 text-mauve-dark md:leading-6">&quot;{profile.headline || profile.bio}&quot;</p>
        <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
          {tags.length ? tags.map((tag) => <Chip key={tag}>{tag}</Chip>) : <Chip>{profile.profession || "Thoughtful match"}</Chip>}
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 border-t border-cream-300 pt-3 md:col-span-1 md:flex-col md:border-l md:border-t-0 md:pl-3 md:pt-1">
        <div className="shrink-0 text-center">
          <p className="text-xl font-black text-burgundy">{profile.matchPercent}%</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-mauve">Match</p>
        </div>
        <SearchActionButtons profile={profile} isSignedIn={isSignedIn} />
      </div>
    </article>
  );
}

function AdSlot({ ad, label = "Sponsored" }: { ad?: DiscoveryAd; label?: string }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (adsenseClient) {
    return (
      <div className="rounded-2xl border border-dashed border-[#EBDCCB] bg-white p-4 text-center shadow-sm" data-adsense-client={adsenseClient}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-mauve">{label}</p>
        <div className="mt-3 grid min-h-32 place-items-center rounded-xl bg-cream-100 px-4 text-xs font-bold leading-5 text-mauve-dark">
          Google ad slot ready
        </div>
      </div>
    );
  }

  if (ad) {
    return (
      <a href={ad.targetUrl || "/vip"} className="block overflow-hidden rounded-2xl border border-[#EBDCCB] bg-white shadow-sm">
        <div className="relative h-32">
          <Image src={ad.imageUrl} alt={ad.title} fill sizes="264px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-chrome-deep/70 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-burgundy">{label}</span>
        </div>
        <div className="p-4">
          <p className="text-sm font-black text-ink">{ad.title}</p>
          <p className="mt-2 text-xs leading-5 text-mauve-dark">Promoted by {ad.advertiser || "Thai My Heart"}</p>
          <span className="mt-3 inline-flex min-h-9 items-center rounded-xl bg-burgundy px-3 text-xs font-black text-cream">Learn More</span>
        </div>
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#EBDCCB] bg-white p-4 text-center shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-mauve">{label}</p>
      <div className="mt-3 grid min-h-32 place-items-center rounded-xl bg-cream-100 px-4 text-xs font-bold leading-5 text-mauve-dark">Ad placement</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-mauve">{label}</span>
      <select className="min-h-11 rounded-xl border border-[#EBDCCB] bg-white px-3 text-sm font-bold text-ink" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-bold text-mauve-dark">
      {label}
      <button
        type="button"
        className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? "justify-end bg-burgundy" : "justify-start bg-cream-300"}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
      </button>
    </label>
  );
}

function SwipeAdCard({ ad, onContinue }: { ad: DiscoveryAd; onContinue: () => void }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[590px] p-4">
      <AdCard ad={ad} />
      <div className="absolute right-5 top-5 rounded-full bg-chrome-deep/85 px-3 py-1 text-xs font-bold text-gold-light">{countdown > 0 ? `Ad ${countdown}s` : "Ad ready"}</div>
      <button
        className="absolute bottom-5 left-1/2 min-h-12 -translate-x-1/2 rounded-full bg-gold px-6 text-sm font-bold text-burgundy-dark shadow-soft disabled:opacity-55"
        disabled={countdown > 0}
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  );
}

function SwipeDeck({ profiles, ads }: { profiles: DiscoveryProfile[]; ads: DiscoveryAd[] }) {
  const [index, setIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<1 | -1 | null>(null);
  const [animating, setAnimating] = useState(false);
  const [pulse, setPulse] = useState<SwipePulse>(null);
  const [swipesToday, setSwipesToday] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(`tmh-swipes-${todayKey()}`);
    return raw ? Number(raw) || 0 : 0;
  });
  const [message, setMessage] = useState<string | null>(null);
  const cards = useMemo(() => {
    const mixed: Array<{ kind: "profile"; profile: DiscoveryProfile } | { kind: "ad"; ad: DiscoveryAd }> = [];
    profiles.slice(0, 8).forEach((profile, profileIndex) => {
      mixed.push({ kind: "profile", profile });
      if ((profileIndex + 1) % 4 === 0 && ads.length) mixed.push({ kind: "ad", ad: ads[profileIndex % ads.length] });
    });
    return mixed;
  }, [ads, profiles]);
  const current = cards[index % Math.max(cards.length, 1)];

  if (!current) return null;

  const remaining = Math.max(0, SWIPE_LIMIT - swipesToday);
  const limited = remaining <= 0;

  function recordLocalSwipe() {
    const next = swipesToday + 1;
    setSwipesToday(next);
    window.localStorage.setItem(`tmh-swipes-${todayKey()}`, String(next));
  }

  async function completeSwipe(action: "PASS" | "LIKE" | "WINK") {
    recordLocalSwipe();
    setIndex((value) => value + 1);
    setMessage(null);
    setExitDirection(null);
    setAnimating(false);

    if (action !== "PASS") {
      const response = await fetch("/api/swipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, profileId: current.kind === "profile" ? current.profile.userId : "" }),
      });
      if (response.status === 429) setMessage("Daily swipe limit reached on your account.");
    }
  }

  function pulseButton(nextPulse: SwipePulse) {
    setPulse(nextPulse);
    window.setTimeout(() => setPulse(null), 280);
  }

  async function advance(action: "PASS" | "LIKE" | "WINK") {
    if (animating) return;
    if (current.kind === "ad") {
      setIndex((value) => value + 1);
      return;
    }
    if (limited) {
      setMessage("Daily swipe limit reached. Come back tomorrow or switch to scroll.");
      return;
    }

    pulseButton(action === "PASS" ? "pass" : action === "LIKE" ? "like" : "wink");
    if (action === "WINK") {
      await completeSwipe(action);
      return;
    }

    setAnimating(true);
    setExitDirection(action === "PASS" ? -1 : 1);
    window.setTimeout(() => void completeSwipe(action), 290);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (current.kind !== "profile" || animating) return;
    if (info.offset.x > 90) void advance("LIKE");
    if (info.offset.x < -90) void advance("PASS");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between rounded-full bg-white px-4 py-2 text-xs font-bold text-burgundy shadow-soft">
        <span>{remaining} swipes left today</span>
        <span>Daily limit {SWIPE_LIMIT}</span>
      </div>
      <div className="relative min-h-[590px] overflow-hidden rounded-[2rem] border border-white bg-chrome shadow-soft">
        {current.kind === "ad" ? (
          <SwipeAdCard key={`${current.ad.id}-${index}`} ad={current.ad} onContinue={() => advance("PASS")} />
        ) : (
          <motion.div
            key={`${current.profile.userId}-${index}`}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            animate={exitDirection ? { x: exitDirection * 360, rotate: exitDirection * 12, opacity: 0, scale: 0.96 } : { x: 0, rotate: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Image src={current.profile.primaryPhoto} alt={current.profile.name} fill sizes="100vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-chrome-deep via-chrome-deep/20 to-transparent" />
            <div className="absolute left-5 top-5 flex gap-2">
              {current.profile.online && <Badge tone="online">Online</Badge>}
              {current.profile.membership === "VIP" && <Badge tone="vip">VIP</Badge>}
              {current.profile.verified && <Badge tone="verified">Verified</Badge>}
            </div>
            <div className="absolute bottom-24 left-5 right-5 text-cream">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-serif text-4xl font-bold">
                    {current.profile.name}, {current.profile.age}
                  </h2>
                  <p className="mt-1 text-sm text-cream-200">{current.profile.location}</p>
                </div>
                <MatchBadge percent={current.profile.matchPercent} />
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-cream-100">{current.profile.headline}</p>
            </div>
          </motion.div>
        )}
        {current.kind === "profile" ? (
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3">
            <motion.button
              className="grid h-14 w-14 place-items-center rounded-full bg-cream text-burgundy shadow-soft"
              aria-label="Pass"
              animate={pulse === "pass" ? { scale: [1, 1.16, 1], boxShadow: ["0 12px 28px rgba(94,22,34,0.12)", "0 0 0 8px rgba(122,98,108,0.16)", "0 12px 28px rgba(94,22,34,0.12)"] } : { scale: 1 }}
              transition={{ duration: 0.28 }}
              onClick={() => advance("PASS")}
            >
              <X size={24} />
            </motion.button>
            <motion.button
              className="grid h-14 w-14 place-items-center rounded-full bg-gold text-burgundy-dark shadow-soft"
              aria-label="Like"
              animate={pulse === "like" ? { scale: [1, 1.2, 1], boxShadow: ["0 12px 28px rgba(94,22,34,0.12)", "0 0 0 10px rgba(34,197,94,0.22)", "0 12px 28px rgba(94,22,34,0.12)"] } : { scale: 1 }}
              transition={{ duration: 0.28 }}
              onClick={() => advance("LIKE")}
            >
              <Heart size={24} />
            </motion.button>
            <button className="grid h-14 w-14 place-items-center rounded-full bg-cream text-burgundy shadow-soft" aria-label="Message">
              <MessageCircle size={22} />
            </button>
            <motion.button
              className="grid h-14 w-14 place-items-center rounded-full bg-cream text-burgundy shadow-soft"
              aria-label="Wink"
              animate={pulse === "wink" ? { scale: [1, 1.14, 1] } : { scale: 1 }}
              transition={{ duration: 0.24 }}
              onClick={() => advance("WINK")}
            >
              <Sparkles size={22} />
            </motion.button>
          </div>
        ) : null}
      </div>
      {message ? <p className="mt-3 rounded-2xl bg-burgundy px-4 py-3 text-sm font-semibold text-cream">{message}</p> : null}
    </div>
  );
}

export function SearchExperience({
  profiles,
  gridAds,
  swipeAds,
  locations,
  savedSearches,
  initialFilters,
  isSignedIn,
}: {
  profiles: DiscoveryProfile[];
  gridAds: DiscoveryAd[];
  swipeAds: DiscoveryAd[];
  locations: LocationOption[];
  savedSearches: SavedSearchSummary[];
  initialFilters: DiscoveryFilters;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<ViewMode>("scroll");
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<string>(initialFilters.gender || "ALL");
  const [country, setCountry] = useState(initialFilters.countryCode || "");
  const [locationNodeId, setLocationNodeId] = useState(initialFilters.locationNodeId || "");
  const [age, setAge] = useState(initialFilters.minAge || initialFilters.maxAge ? `${initialFilters.minAge || 18}-${initialFilters.maxAge || 99}` : "25-40");
  const [onlineOnly, setOnlineOnly] = useState(Boolean(initialFilters.onlineOnly));
  const [verifiedOnly, setVerifiedOnly] = useState(Boolean(initialFilters.verifiedOnly));
  const [newOnly, setNewOnly] = useState(Boolean(initialFilters.newOnly));
  const [hasReelOnly, setHasReelOnly] = useState(Boolean(initialFilters.hasReelOnly));
  const [sort, setSort] = useState<SortMode>(initialFilters.sort || "best");
  const [saved, setSaved] = useState(savedSearches);
  const [notice, setNotice] = useState("");

  function currentFilters(): DiscoveryFilters {
    return {
      gender: gender === "ALL" ? "ALL" : (gender as DiscoveryFilters["gender"]),
      countryCode: country || undefined,
      locationNodeId: locationNodeId || undefined,
      ...(() => {
        if (!age || age === "any") return {};
        const [min, max] = age.split("-").map((part) => Number(part));
        return { minAge: Number.isFinite(min) ? min : undefined, maxAge: Number.isFinite(max) ? max : undefined };
      })(),
      onlineOnly,
      verifiedOnly,
      newOnly,
      hasReelOnly,
      sort: sort === "popular" || sort === "recent" ? sort : "best",
    };
  }

  function updateFilters(next: { gender?: string; country?: string; location?: string; age?: string; online?: boolean; verified?: boolean; fresh?: boolean; reel?: boolean; sort?: string }) {
    const params = new URLSearchParams();
    const nextGender = next.gender ?? gender;
    const nextCountry = next.country ?? country;
    const nextLocation = next.location ?? locationNodeId;
    const nextAge = next.age ?? age;
    const nextOnline = next.online ?? onlineOnly;
    const nextVerified = next.verified ?? verifiedOnly;
    const nextNew = next.fresh ?? newOnly;
    const nextReel = next.reel ?? hasReelOnly;
    const nextSort = next.sort ?? sort;

    if (nextGender && nextGender !== "ALL") params.set("gender", nextGender);
    if (nextCountry) params.set("country", nextCountry);
    if (nextLocation) params.set("location", nextLocation);
    if (nextAge && nextAge !== "any") params.set("age", nextAge);
    if (nextOnline) params.set("online", "1");
    if (nextVerified) params.set("verified", "1");
    if (nextNew) params.set("new", "1");
    if (nextReel) params.set("reel", "1");
    if (nextSort && nextSort !== "best") params.set("sort", nextSort);

    startTransition(() => {
      router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
    });
  }

  function setGenderFilter(value: string) {
    setGender(value);
    updateFilters({ gender: value });
  }

  function setAgeFilter(value: string) {
    setAge(value);
    updateFilters({ age: value });
  }

  function setCountryFilter(value: string) {
    setCountry(value);
    setLocationNodeId("");
    updateFilters({ country: value, location: "" });
  }

  function setLocationFilter(value: string) {
    setLocationNodeId(value);
    const node = locations.find((item) => item.id === value);
    if (node?.countryCode) setCountry(node.countryCode);
    updateFilters({ location: value, country: node?.countryCode || country });
  }

  function setSortFilter(value: string) {
    const nextSort: SortMode = value === "popular" || value === "recent" ? value : "best";
    setSort(nextSort);
    updateFilters({ sort: nextSort });
  }

  function setBooleanFilter(kind: "online" | "verified" | "fresh" | "reel", value: boolean) {
    if (kind === "online") setOnlineOnly(value);
    if (kind === "verified") setVerifiedOnly(value);
    if (kind === "fresh") setNewOnly(value);
    if (kind === "reel") setHasReelOnly(value);
    updateFilters({ [kind]: value });
  }

  async function saveSearch() {
    if (!isSignedIn) {
      router.push("/?login=1");
      return;
    }
    setNotice("");
    const response = await fetch("/api/search/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${country || "Any country"} ${gender === "ALL" ? "matches" : gender.toLowerCase()} search`, filters: currentFilters() }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setNotice(result?.error || "Could not save search.");
      return;
    }
    const refreshed = await fetch("/api/search/saved").then((res) => res.json()).catch(() => null);
    if (refreshed?.savedSearches) setSaved(refreshed.savedSearches);
    setNotice("Search saved.");
  }

  async function deleteSavedSearch(id: string) {
    const response = await fetch(`/api/search/saved/${id}`, { method: "DELETE" });
    if (response.ok) setSaved((items) => items.filter((item) => item.id !== id));
  }

  function applySavedSearch(filters: DiscoveryFilters) {
    const params = new URLSearchParams();
    if (filters.gender && filters.gender !== "ALL") params.set("gender", filters.gender);
    if (filters.countryCode) params.set("country", filters.countryCode);
    if (filters.locationNodeId) params.set("location", filters.locationNodeId);
    if (filters.minAge || filters.maxAge) params.set("age", `${filters.minAge || 18}-${filters.maxAge || 99}`);
    if (filters.onlineOnly) params.set("online", "1");
    if (filters.verifiedOnly) params.set("verified", "1");
    if (filters.newOnly) params.set("new", "1");
    if (filters.hasReelOnly) params.set("reel", "1");
    if (filters.sort && filters.sort !== "best") params.set("sort", filters.sort);
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  const filtered = profiles.filter((profile) => {
    const haystack = `${profile.name} ${profile.location} ${profile.headline} ${profile.profession ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-cream-100">
      <section className="border-b border-[#EBDCCB] bg-white/75">
        <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid gap-3 rounded-[1.35rem] bg-white p-3 shadow-soft md:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:hidden">
            <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#EBDCCB] px-4">
              <Search size={17} className="text-burgundy" />
              <Input className="border-0 bg-transparent px-0 shadow-none" placeholder="Search name, city, profession" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <select className="min-h-12 rounded-2xl border border-[#EBDCCB] bg-white px-4 text-sm font-bold" value={gender} onChange={(event) => setGenderFilter(event.target.value)} aria-label="Gender">
              <option value="WOMAN">Women</option>
              <option value="LADYBOY">Ladyboys</option>
              <option value="MAN">Men</option>
              <option value="ALL">Everyone</option>
            </select>
            <select className="min-h-12 rounded-2xl border border-[#EBDCCB] bg-white px-4 text-sm font-bold" value={age} onChange={(event) => setAgeFilter(event.target.value)} aria-label="Age">
              <option value="25-40">25 - 40</option>
              <option value="18-30">18 - 30</option>
              <option value="30-45">30 - 45</option>
              <option value="45-99">45+</option>
              <option value="any">Any age</option>
            </select>
            <select className="min-h-12 rounded-2xl border border-[#EBDCCB] bg-white px-4 text-sm font-bold" value={country} onChange={(event) => setCountryFilter(event.target.value)} aria-label="Country">
              <option value="">Any country</option>
              <option value="TH">Thailand</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </select>
            <Button type="button" variant="ghost" className="justify-center border-[#EBDCCB]">
              <SlidersHorizontal size={18} />
              Filters
              <span className="grid h-6 w-6 place-items-center rounded-full bg-danger text-xs font-black text-white">{Number(onlineOnly) + Number(verifiedOnly) + Number(newOnly)}</span>
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-2xl border border-[#EBDCCB] bg-cream p-1 lg:hidden">
            <button type="button" className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${mode === "swipe" ? "bg-burgundy text-cream shadow-soft" : "text-mauve-dark"}`} onClick={() => setMode("swipe")}>
              <Heart size={17} />
              Swipe cards
            </button>
            <button type="button" className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${mode === "scroll" ? "bg-burgundy text-cream shadow-soft" : "text-mauve-dark"}`} onClick={() => setMode("scroll")}>
              <List size={17} />
              Scrolling cards
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1280px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[264px_minmax(0,1fr)_264px] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-[#F0E4D6] bg-white shadow-soft">
            <div className="flex items-center justify-between bg-burgundy px-5 py-4 text-sm font-black text-cream">
              Refine Your Search
              <SlidersHorizontal size={17} className="text-gold-light" />
            </div>
            <div className="space-y-4 p-5">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#EBDCCB] bg-white px-3">
                <Search size={16} className="text-burgundy" />
                <Input className="border-0 bg-transparent px-0 shadow-none" placeholder="Name, city, profession" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-mauve">I am looking for</p>
                <div className="grid grid-cols-2 rounded-xl bg-cream-200 p-1">
                  <button type="button" className={`rounded-lg px-3 py-2 text-sm font-black ${gender === "WOMAN" ? "bg-burgundy text-cream" : "text-mauve-dark"}`} onClick={() => setGenderFilter("WOMAN")}>
                    Women
                  </button>
                  <button type="button" className={`rounded-lg px-3 py-2 text-sm font-black ${gender === "MAN" ? "bg-burgundy text-cream" : "text-mauve-dark"}`} onClick={() => setGenderFilter("MAN")}>
                    Men
                  </button>
                </div>
              </div>
              <FilterSelect label="Age" value={age} onChange={setAgeFilter}>
                <option value="25-40">25 - 40</option>
                <option value="18-30">18 - 30</option>
                <option value="30-45">30 - 45</option>
                <option value="45-99">45+</option>
                <option value="any">Any age</option>
              </FilterSelect>
              <FilterSelect label="Country" value={country} onChange={setCountryFilter}>
                <option value="">Any country</option>
                <option value="TH">Thailand</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </FilterSelect>
              <FilterSelect label="Location" value={locationNodeId} onChange={setLocationFilter}>
                <option value="">Any city or region</option>
                {locations
                  .filter((location) => !country || location.countryCode === country)
                  .map((location) => (
                    <option key={location.id} value={location.id}>{location.name} ({location.countryCode})</option>
                  ))}
              </FilterSelect>
              <FilterSelect label="Sort" value={sort} onChange={setSortFilter}>
                <option value="best">Best match</option>
                <option value="popular">Popular</option>
                <option value="recent">Recently active</option>
              </FilterSelect>
              <div className="space-y-3 border-t border-cream-300 pt-4">
                <ToggleRow label="Online now" checked={onlineOnly} onChange={(value) => setBooleanFilter("online", value)} />
                <ToggleRow label="Verified only" checked={verifiedOnly} onChange={(value) => setBooleanFilter("verified", value)} />
                <ToggleRow label="New members" checked={newOnly} onChange={(value) => setBooleanFilter("fresh", value)} />
                <ToggleRow label="Has Heart Reel" checked={hasReelOnly} onChange={(value) => setBooleanFilter("reel", value)} />
              </div>
              <Button type="button" variant="primary" className="w-full justify-center" onClick={() => updateFilters({})}>
                <Check size={17} />
                Update Results
              </Button>
              <Button type="button" variant="ghost" className="w-full justify-center border-[#E7C9CE]" onClick={() => void saveSearch()}>
                <Heart size={17} />
                Save This Search
              </Button>
              {notice && <p className="rounded-xl bg-cream-100 px-3 py-2 text-xs font-bold text-burgundy">{notice}</p>}
              {saved.length ? (
                <div className="space-y-2 border-t border-cream-300 pt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-mauve">Saved searches</p>
                  {saved.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2">
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-xs font-bold text-burgundy" onClick={() => applySavedSearch(item.filters)}>{item.name}</button>
                      <button type="button" className="text-xs font-bold text-mauve" onClick={() => void deleteSavedSearch(item.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="text-sm font-black text-ink">{filtered.length.toLocaleString()} members found</p>
            <p className="text-sm font-bold text-mauve-dark">
              Sort: <span className="rounded-lg border border-[#EBDCCB] bg-white px-3 py-2 text-ink">{sort === "popular" ? "Popular" : sort === "recent" ? "Recently active" : "Best Match"}</span>
            </p>
          </div>
          <div className="mb-4 hidden gap-2 lg:flex">
            <Chip active>All Members</Chip>
            {onlineOnly ? <Chip>Online</Chip> : null}
            {verifiedOnly ? <Chip>Verified</Chip> : null}
            {newOnly ? <Chip>New</Chip> : null}
            {hasReelOnly ? <Chip>Has Reel</Chip> : null}
            <Chip>{country || "Any country"}</Chip>
          </div>

          <div className="lg:hidden">{mode === "swipe" ? <SwipeDeck profiles={filtered} ads={swipeAds} /> : null}</div>
          <div className={`space-y-4 ${mode === "swipe" ? "hidden lg:block" : ""}`}>
            {filtered.map((profile, index) => (
              <div key={profile.userId}>
                <ResultCard profile={profile} priority={index < 3} isSignedIn={isSignedIn} />
                {(index + 1) % 4 === 0 && gridAds.length ? (
                  <div className="mt-4 lg:hidden">
                    <AdCard ad={gridAds[index % gridAds.length]} compact />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </main>

        <aside className="hidden space-y-4 lg:block">
          <div className="relative overflow-hidden rounded-2xl bg-burgundy p-5 text-cream shadow-soft">
            <div className="absolute bottom-0 right-0 h-full w-2/5 opacity-35">
              {profiles[0] ? <Image src={profiles[0].primaryPhoto} alt="" fill sizes="120px" className="object-cover" /> : null}
            </div>
            <div className="relative max-w-[68%]">
              <Crown size={22} className="text-gold-light" />
              <h2 className="mt-2 font-serif text-2xl font-bold text-gold-light">Upgrade to VIP</h2>
              <div className="mt-3 space-y-2 text-xs font-semibold leading-5 text-cream-200">
                <p>Unlimited messaging</p>
                <p>See who viewed you</p>
                <p>Priority in results</p>
              </div>
              <Link href="/vip" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-gold px-4 text-sm font-black text-burgundy-dark">
                Upgrade Now
              </Link>
            </div>
          </div>
          <AdSlot ad={gridAds[0]} />
          <AdSlot ad={gridAds[1] || gridAds[0]} />
          <AdSlot ad={gridAds[2] || gridAds[0]} label="Advertisement" />
          <div className="grid grid-cols-2 gap-3">
            <Link href="/likes" className="rounded-2xl bg-white p-4 text-center text-sm font-black text-burgundy shadow-sm">
              <Heart className="mx-auto mb-2" size={18} />
              Likes
            </Link>
            <Link href="/messages" className="rounded-2xl bg-white p-4 text-center text-sm font-black text-burgundy shadow-sm">
              <MessageCircle className="mx-auto mb-2" size={18} />
              Chat
            </Link>
            <Link href="/vip" className="rounded-2xl bg-white p-4 text-center text-sm font-black text-burgundy shadow-sm">
              <Gift className="mx-auto mb-2" size={18} />
              Gifts
            </Link>
            <Link href="/my-profile" className="rounded-2xl bg-white p-4 text-center text-sm font-black text-burgundy shadow-sm">
              <UserRound className="mx-auto mb-2" size={18} />
              Profile
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
