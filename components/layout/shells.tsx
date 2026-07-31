"use client";

import { MarketingHeader } from "./marketing-header";
import { MobileTabBar } from "./mobile-tab-bar";
import { PresenceHeartbeat } from "./presence-heartbeat";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { LoginModal } from "@/components/auth/login-modal";
import { useSession } from "next-auth/react";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const useMemberHeader = status === "authenticated";

  return (
    <div className={useMemberHeader ? "min-h-screen bg-cream-100 pb-20 lg:pb-0" : "min-h-screen bg-cream-100"}>
      {useMemberHeader && <PresenceHeartbeat />}
      {useMemberHeader ? <SiteHeader /> : <MarketingHeader />}
      <main>{children}</main>
      {useMemberHeader && <MobileTabBar />}
      <SiteFooter />
      <LoginModal />
    </div>
  );
}

export function MemberShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  return (
    <div className="min-h-screen bg-cream-100 pb-20 lg:pb-0">
      {isSignedIn && <PresenceHeartbeat />}
      <SiteHeader />
      <main>{children}</main>
      {isSignedIn && <MobileTabBar />}
      <LoginModal />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-chrome-deep text-cream">
      <PresenceHeartbeat />
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
