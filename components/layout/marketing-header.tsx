"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Crown } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { Avatar } from "@/components/ui";
import { useLocale } from "@/components/providers/locale-provider";

export function MarketingHeader() {
  const { copy } = useLocale();
  const { data: session, status } = useSession();
  const [unread, setUnread] = useState(0);
  const isSignedIn = status === "authenticated";
  const links = [
    [copy.nav.home, "/"],
    [copy.nav.search, "/search"],
    [copy.nav.reels, "/reels"],
    [copy.nav.messages, "/messages"],
    ["Success Stories", "/success-stories"],
  ];

  useEffect(() => {
    if (!isSignedIn) return;
    void fetch("/api/messages/unread")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { unread?: number } | null) => setUnread(data?.unread || 0))
      .catch(() => setUnread(0));
  }, [isSignedIn]);

  return (
    <header className="sticky top-0 z-40 border-b border-gold-soft/30 bg-gradient-to-r from-[#3F0C15] to-burgundy-dark text-cream shadow-soft">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Thai My Heart home">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map(([label, href], index) => (
            <Link key={href} href={href} className={index === 0 ? "border-b-2 border-gold-soft px-3 py-2 text-sm font-semibold text-white" : "px-3 py-2 text-sm font-semibold text-cream/80 hover:text-white"}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/vip" className="hidden items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-gold-light to-gold px-4 py-2 text-sm font-bold text-[#3A2A12] shadow-[0_8px_20px_rgba(0,0,0,.3)] sm:inline-flex">
            <Crown className="h-4 w-4 fill-current" /> VIP
          </Link>
          {isSignedIn ? (
            <>
              <Link href="/dashboard#notifications" aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-full border border-gold-light/40 text-gold-light">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">{unread || 2}</span>
              </Link>
              <Link href="/dashboard" className="hidden items-center gap-2 sm:flex">
                <Avatar name={session?.user?.name || "Member"} className="h-[34px] w-[34px] border border-gold-soft bg-gradient-to-br from-[#D4E0EA] to-[#93A9BD] text-xs" />
                <span className="text-xs font-semibold text-cream-200">Welcome, {session?.user?.name || "Member"} v</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full border border-gold/35 px-4 py-2 text-sm font-semibold text-cream hover:bg-white/10">
                {copy.actions.signIn}
              </Link>
              <Link href="/signup" className="hidden rounded-[11px] bg-gradient-to-br from-gold-light to-gold px-4 py-2 text-sm font-bold text-[#3A2A12] shadow-[0_8px_20px_rgba(0,0,0,.25)] sm:inline-flex">
                {copy.actions.join}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
