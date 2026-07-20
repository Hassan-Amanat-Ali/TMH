"use client";

import Link from "next/link";
import { localeNames } from "@/lib/content/marketing";
import { supportedLocales } from "@/lib/i18n";
import { useLocale } from "@/components/providers/locale-provider";
import { BrandMark } from "./brand-mark";

const columns = [
  { key: "explore", links: [["Search", "/search"], ["Heart Reels", "/reels"], ["VIP", "/vip"], ["Membership", "/membership-plans"]] },
  { key: "company", links: [["About", "/about"], ["How to use", "/how-to-use"], ["Advertising", "/advertising-enquiries"], ["Contact", "/contact-us"]] },
  { key: "safety", links: [["Safety", "/safety-and-reporting"], ["FAQ", "/faq"], ["Appeal", "/contact-us?type=appeal"]] },
  { key: "legal", links: [["Privacy", "/privacy-policy"], ["Terms", "/terms-and-conditions"], ["Cookies", "/cookie-policy"]] },
] as const;

export function SiteFooter() {
  const { locale, setLocale, copy } = useLocale();

  return (
    <footer className="border-t border-gold/20 bg-chrome-deep text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_2fr] lg:px-8">
        <div>
          <BrandMark />
          <p className="mt-5 max-w-sm text-sm leading-6 text-cream/65">{copy.footer.tagline}</p>
          <label className="mt-6 block max-w-xs">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">{copy.language}</span>
            <select className="mt-2 min-h-11 w-full rounded-2xl border border-gold/25 bg-white/10 px-3 text-sm font-bold text-cream outline-none" value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>
              {supportedLocales.map((item) => <option key={item} value={item} className="text-ink">{localeNames[item]}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.key}>
              <h3 className="font-serif text-xl font-bold text-gold-light">{copy.footer[column.key]}</h3>
              <div className="mt-4 grid gap-2">
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="text-sm text-cream/65 hover:text-cream">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
