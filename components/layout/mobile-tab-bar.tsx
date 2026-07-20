"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, MessageCircle, Search, User } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Likes", href: "/likes", icon: Heart },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Profile", href: "/my-profile", icon: User },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/25 bg-chrome px-2 pb-2 pt-1 text-cream shadow-soft lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={cn("flex min-h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-bold text-cream/60", active && "bg-burgundy text-gold-light")}>
              <Icon className={cn("h-5 w-5", active && "fill-current")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
