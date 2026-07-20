"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Crown, Menu, MoreVertical, Wallet } from "lucide-react";
import { Avatar, Button, Drawer } from "@/components/ui";
import { useLocale } from "@/components/providers/locale-provider";
import { BrandMark } from "./brand-mark";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Search", "/search"],
  ["Reels", "/reels"],
  ["Messages", "/messages"],
  ["Profile", "/my-profile"],
];

const moreLinks = [
  ["VIP Upgrade", "/vip"],
  ["Coin Wallet", "/vip#wallet"],
  ["Heart Reels", "/reels"],
  ["Visitors", "/visitors"],
  ["Favourites", "/likes"],
  ["Settings", "/my-profile"],
  ["Help & Safety", "/safety-and-reporting"],
];

export function SiteHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { status } = useSession();
  const { copy } = useLocale();
  const isSignedIn = status === "authenticated";
  const navLabels: Record<string, string> = {
    Dashboard: copy.nav.dashboard,
    Search: copy.nav.search,
    Reels: copy.nav.reels,
    Messages: copy.nav.messages,
    Profile: copy.nav.profile,
  };

  useEffect(() => {
    if (!isSignedIn) return;
    void fetch("/api/messages/unread")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { unread?: number } | null) => setUnread(data?.unread || 0))
      .catch(() => setUnread(0));
  }, [isSignedIn]);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 bg-chrome text-cream shadow-soft">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={isSignedIn ? "/dashboard" : "/"} aria-label="Thai My Heart">
          <BrandMark />
        </Link>
        {isSignedIn ? (
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-semibold text-cream/75 hover:bg-white/10 hover:text-cream">
                {navLabels[label] || label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              [copy.nav.home, "/"],
              [copy.nav.search, "/search"],
              [copy.nav.vip, "/vip"],
              [copy.footer.safety, "/safety-and-reporting"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-semibold text-cream/75 hover:bg-white/10 hover:text-cream">
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {!isSignedIn ? (
            <>
              <Link href="/?login=1" className="rounded-full border border-gold/35 px-4 py-2 text-sm font-bold text-gold-light">
                {copy.actions.signIn}
              </Link>
              <Link href="/signup" className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-burgundy-dark">
                {copy.actions.join}
              </Link>
            </>
          ) : (
            <>
              <Link href="/vip" className="hidden items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-2 text-sm font-bold text-gold-light sm:inline-flex">
                <Crown className="h-4 w-4" /> VIP
              </Link>
              <Link href="/vip#wallet" className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold sm:inline-flex">
                <Wallet className="h-4 w-4" /> 0
              </Link>
              <div className="relative">
                <button type="button" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/15" onClick={() => setNotificationsOpen((open) => !open)}>
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread}</span>}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-72 rounded-3xl border border-gold/20 bg-chrome-deep p-4 text-cream shadow-soft">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">Notifications</p>
                    <div className="mt-3 space-y-2 text-sm text-cream-200">
                      <p className="rounded-2xl bg-white/8 p-3">{unread ? `${unread} unread message${unread === 1 ? "" : "s"}.` : "New likes, visitors, messages, and recommendations appear in your dashboard feed."}</p>
                      <Link href="/messages" onClick={() => setNotificationsOpen(false)} className="block rounded-full border border-gold/30 px-4 py-2 text-center font-bold text-gold-light">
                        Open messages
                      </Link>
                      <Link href="/dashboard#notifications" onClick={() => setNotificationsOpen(false)} className="block rounded-full bg-gold px-4 py-2 text-center font-bold text-burgundy-dark">
                        Open feed
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <Avatar name="Member" className="hidden sm:grid" />
              <Button type="button" variant="ghost" className="h-10 w-10 p-0 lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open more menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" className="hidden h-10 w-10 p-0 lg:inline-flex" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {isSignedIn && <Drawer open={drawerOpen} title="More" onClose={() => setDrawerOpen(false)}>
        <div className="grid gap-2">
          {moreLinks.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setDrawerOpen(false)} className="rounded-2xl border border-gold/15 bg-white/5 px-4 py-3 text-sm font-semibold text-cream hover:bg-white/10">
              {label}
            </Link>
          ))}
        </div>
      </Drawer>}
    </header>
  );
}
