import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Cormorant_Garamond, Figtree } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { defaultLocale, localeCookieName, localeHeaderName, normalizeLocale } from "@/lib/i18n";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thai My Heart V2",
  description: "A refined Thai-focused international dating platform.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const detectedLocale = normalizeLocale(
    headerStore.get(localeHeaderName) || cookieStore.get(localeCookieName)?.value || defaultLocale
  );

  return (
    <html lang={detectedLocale} className={`${cormorant.variable} ${figtree.variable}`}>
      <body>
        <AuthProvider>
          <LocaleProvider initialLocale={detectedLocale}>{children}</LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
