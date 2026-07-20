export const supportedLocales = ["en", "th", "de", "fr"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "tmh-locale";
export const localeHeaderName = "x-tmh-locale";

export const dictionaries = {
  en: {
    brand: "Thai My Heart",
    language: "Language",
    nav: { home: "Home", dashboard: "Dashboard", search: "Search", reels: "Reels", messages: "Messages", profile: "Profile", likes: "Likes", vip: "VIP", admin: "Admin" },
    actions: { signIn: "Sign in", join: "Join free", upgrade: "Upgrade" },
    footer: { tagline: "Thai-focused international dating with safety, clarity, and serious intent.", explore: "Explore", company: "Company", safety: "Safety", legal: "Legal" },
  },
  th: {
    brand: "Thai My Heart",
    language: "ภาษา",
    nav: { home: "หน้าแรก", dashboard: "แดชบอร์ด", search: "ค้นหา", reels: "รีล", messages: "ข้อความ", profile: "โปรไฟล์", likes: "ถูกใจ", vip: "VIP", admin: "ผู้ดูแล" },
    actions: { signIn: "เข้าสู่ระบบ", join: "สมัครฟรี", upgrade: "อัปเกรด" },
    footer: { tagline: "เดตไทย-ต่างชาติที่ให้ความสำคัญกับความปลอดภัย ความชัดเจน และความจริงใจ", explore: "สำรวจ", company: "บริษัท", safety: "ความปลอดภัย", legal: "กฎหมาย" },
  },
  de: {
    brand: "Thai My Heart",
    language: "Sprache",
    nav: { home: "Start", dashboard: "Dashboard", search: "Suche", reels: "Reels", messages: "Nachrichten", profile: "Profil", likes: "Likes", vip: "VIP", admin: "Admin" },
    actions: { signIn: "Einloggen", join: "Kostenlos starten", upgrade: "Upgrade" },
    footer: { tagline: "Thai-fokussiertes internationales Dating mit Sicherheit, Klarheit und ernster Absicht.", explore: "Entdecken", company: "Unternehmen", safety: "Sicherheit", legal: "Rechtliches" },
  },
  fr: {
    brand: "Thai My Heart",
    language: "Langue",
    nav: { home: "Accueil", dashboard: "Tableau", search: "Recherche", reels: "Reels", messages: "Messages", profile: "Profil", likes: "Likes", vip: "VIP", admin: "Admin" },
    actions: { signIn: "Connexion", join: "Inscription", upgrade: "Upgrade" },
    footer: { tagline: "Rencontres internationales autour de la Thailande, avec securite, clarte et intention serieuse.", explore: "Explorer", company: "Entreprise", safety: "Securite", legal: "Legal" },
  },
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const lower = String(value || "").slice(0, 2).toLowerCase();
  return supportedLocales.includes(lower as Locale) ? (lower as Locale) : defaultLocale;
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
