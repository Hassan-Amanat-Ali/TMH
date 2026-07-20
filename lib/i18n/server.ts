import type { NextRequest } from "next/server";
import { defaultLocale, localeCookieName, normalizeLocale, type Locale } from "./index";

function localeFromAcceptLanguage(value: string | null): Locale {
  if (!value) return defaultLocale;
  const first = value.split(",").map((part) => part.trim().split(";")[0]).find(Boolean);
  return normalizeLocale(first);
}

export function detectLocaleFromRequest(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  if (cookieLocale) return normalizeLocale(cookieLocale);

  const countryLocale = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry");
  if (countryLocale) {
    const byCountry: Record<string, Locale> = { TH: "th", DE: "de", AT: "de", CH: "de", FR: "fr", BE: "fr" };
    const resolved = byCountry[countryLocale.toUpperCase()];
    if (resolved) return resolved;
  }

  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}
