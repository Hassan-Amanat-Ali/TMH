"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { defaultLocale, getDictionary, localeCookieName, type Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: ReturnType<typeof getDictionary>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, initialLocale = defaultLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
        document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = nextLocale;
      },
      copy: getDictionary(locale),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext) ?? {
    locale: defaultLocale,
    setLocale: () => undefined,
    copy: getDictionary(defaultLocale),
  };
}
