import type { Locale } from "@/lib/i18n";

export type ContentSlug =
  | "about"
  | "faq"
  | "how-to-use"
  | "terms-and-conditions"
  | "privacy-policy"
  | "cookie-policy"
  | "safety-and-reporting"
  | "advertising-enquiries"
  | "membership-plans";

type PageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string[] }>;
  cta?: { label: string; href: string };
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  th: "ไทย",
  de: "Deutsch",
  fr: "Francais",
};

export const homeCopy: Record<Locale, {
  eyebrow: string;
  title: string;
  intro: string;
  searchLabel: string;
  searchButton: string;
  trust: string[];
  featuredTitle: string;
  reelsTitle: string;
  safetyTitle: string;
}> = {
  en: {
    eyebrow: "Serious connections. Lasting love.",
    title: "Meet Thai singles and international hearts with real intention.",
    intro: "Thai My Heart brings search, verification, safety tools, and thoughtful messaging together for people who want more than a swipe.",
    searchLabel: "Start with a quick match search",
    searchButton: "Browse members",
    trust: ["Verified photo signals", "Anti-scam message checks", "Privacy-first member controls"],
    featuredTitle: "Featured members",
    reelsTitle: "Heart Reels",
    safetyTitle: "Built for safer first conversations",
  },
  th: {
    eyebrow: "ความสัมพันธ์จริงจัง ความรักที่ยั่งยืน",
    title: "พบคนไทยและคนต่างชาติที่มองหาความสัมพันธ์อย่างจริงใจ",
    intro: "Thai My Heart รวมการค้นหา การยืนยันตัวตน เครื่องมือความปลอดภัย และการส่งข้อความที่สุภาพไว้ในที่เดียว",
    searchLabel: "เริ่มค้นหาคู่ที่เหมาะกับคุณ",
    searchButton: "ดูสมาชิก",
    trust: ["สัญญาณยืนยันรูปถ่าย", "ตรวจจับข้อความเสี่ยงหลอกลวง", "ควบคุมความเป็นส่วนตัวได้"],
    featuredTitle: "สมาชิกแนะนำ",
    reelsTitle: "Heart Reels",
    safetyTitle: "ออกแบบเพื่อการเริ่มต้นคุยที่ปลอดภัยกว่า",
  },
  de: {
    eyebrow: "Ernsthafte Kontakte. Dauerhafte Liebe.",
    title: "Lerne thailaendische Singles und internationale Menschen mit echter Absicht kennen.",
    intro: "Thai My Heart verbindet Suche, Verifizierung, Sicherheit und achtsame Nachrichten fuer Menschen, die mehr wollen als schnelles Swipen.",
    searchLabel: "Starte mit einer schnellen Suche",
    searchButton: "Mitglieder ansehen",
    trust: ["Foto-Vertrauenssignale", "Anti-Scam-Nachrichtenpruefung", "Privatsphaere zuerst"],
    featuredTitle: "Ausgewaehlte Mitglieder",
    reelsTitle: "Heart Reels",
    safetyTitle: "Sicherere erste Gespraeche",
  },
  fr: {
    eyebrow: "Rencontres serieuses. Amour durable.",
    title: "Rencontrez des celibataires thailandais et internationaux avec une vraie intention.",
    intro: "Thai My Heart reunit recherche, verification, securite et messagerie respectueuse pour les personnes qui veulent plus qu'un simple swipe.",
    searchLabel: "Commencez par une recherche rapide",
    searchButton: "Voir les membres",
    trust: ["Signaux photo verifies", "Controle anti-arnaque", "Confidentialite au premier plan"],
    featuredTitle: "Membres en avant",
    reelsTitle: "Heart Reels",
    safetyTitle: "Des premiers echanges plus surs",
  },
};

const en: Record<ContentSlug, PageCopy> = {
  about: {
    eyebrow: "About",
    title: "A calmer way to meet across cultures",
    intro: "Thai My Heart is built for Thai-focused international dating where respect, clarity, and safety matter from the first click.",
    sections: [
      { title: "Our purpose", body: ["We help people meet with serious intent, not pressure. Profiles, search, and messaging are designed to make values and expectations visible early."] },
      { title: "What makes it different", body: ["Verification signals, report tools, anti-leakage checks, and member controls reduce noise while keeping genuine conversation easy."] },
      { title: "For members", body: ["Use Thai My Heart patiently: complete your profile, verify your photo, write respectfully, and keep early conversations on-platform."] },
    ],
    cta: { label: "Start searching", href: "/search" },
  },
  faq: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    intro: "Short answers for new members, safety questions, VIP features, and account support.",
    sections: [
      { title: "Is browsing free?", body: ["Yes. You can browse public search and create a profile for free. Some premium features are reserved for VIP members."] },
      { title: "How does verification work?", body: ["Photo and ID verification are reviewed before a trust badge is shown. Email verification alone is not the public trust badge."] },
      { title: "Can I appeal a suspension?", body: ["Yes. Use Contact us and choose Appeal. The admin review tools arrive in the admin phase before launch."] },
    ],
  },
  "how-to-use": {
    eyebrow: "Guide",
    title: "How to use Thai My Heart",
    intro: "A simple path from signup to safer conversations.",
    sections: [
      { title: "1. Build a complete profile", body: ["Add clear photos, your location, intent, lifestyle details, and a warm headline. Complete profiles rank better and feel more trustworthy."] },
      { title: "2. Search thoughtfully", body: ["Use filters for age, country, verification, and online status. Open profiles before sending likes so your first message has context."] },
      { title: "3. Keep early chats safe", body: ["Do not send money, codes, banking details, or off-platform contact details. Use report and block tools when something feels wrong."] },
    ],
    cta: { label: "Browse search", href: "/search" },
  },
  "terms-and-conditions": {
    eyebrow: "Legal",
    title: "Terms and conditions",
    intro: "These terms explain the basic rules for using Thai My Heart.",
    sections: [
      { title: "Membership conduct", body: ["Members must be truthful, respectful, adult, and legally allowed to use dating services. Harassment, scams, impersonation, and explicit abuse are not allowed."] },
      { title: "Moderation", body: ["We may review, restrict, suspend, or remove accounts and content that appear unsafe or violate platform rules. Automated safety signals may be reviewed by admins."] },
      { title: "Service changes", body: ["Features, prices, and availability may change as the platform evolves. We will keep core safety and privacy commitments visible."] },
    ],
  },
  "privacy-policy": {
    eyebrow: "Privacy",
    title: "Privacy policy",
    intro: "We collect the information needed to operate profiles, matching, messaging, safety, and support.",
    sections: [
      { title: "Information we process", body: ["Account details, profile content, photos, verification evidence, messages, reports, support requests, and basic technical signals may be processed."] },
      { title: "How it is used", body: ["Data supports authentication, discovery, safety checks, moderation, support, fraud prevention, and product improvement."] },
      { title: "Your controls", body: ["You can edit your profile, use privacy features, request support, and delete your account where supported by the service."] },
    ],
  },
  "cookie-policy": {
    eyebrow: "Cookies",
    title: "Cookie policy",
    intro: "Cookies keep the service signed in, remember language choices, and protect sessions.",
    sections: [
      { title: "Essential cookies", body: ["Authentication, locale, security, and session cookies are required for the site to work."] },
      { title: "Analytics and ads", body: ["Future analytics or advertising cookies will be documented before launch and configured according to consent requirements."] },
    ],
  },
  "safety-and-reporting": {
    eyebrow: "Safety",
    title: "Safety and reporting",
    intro: "Meet carefully, keep control, and tell us quickly when something feels wrong.",
    sections: [
      { title: "Never send money", body: ["Do not send money, gift cards, crypto, bank details, login codes, or identity documents to someone you have not verified independently."] },
      { title: "Use platform tools", body: ["Block, report conversations, and keep early contact on Thai My Heart. Safety rules watch for contact leakage and harmful trigger words."] },
      { title: "Appeals", body: ["If your account is suspended by mistake, use Contact us and choose Appeal. Admin review and reactivation tools are part of the admin phase."] },
    ],
    cta: { label: "Contact support", href: "/contact-us?type=appeal" },
  },
  "advertising-enquiries": {
    eyebrow: "Advertising",
    title: "Advertise with Thai My Heart",
    intro: "Reach a focused international dating audience with sponsored placements designed to sit naturally inside discovery.",
    sections: [
      { title: "Placements", body: ["Planned inventory includes search rail banners, grid cards, and swipe interstitials. All ads must fit safety and relationship standards."] },
      { title: "Brand suitability", body: ["We do not accept predatory, adult, scam-like, loan, gambling, or misleading offers."] },
      { title: "Enquiries", body: ["Contact us with your company name, campaign goal, market, creative format, and preferred dates."] },
    ],
    cta: { label: "Make an enquiry", href: "/contact-us" },
  },
  "membership-plans": {
    eyebrow: "Membership",
    title: "Standard and VIP membership",
    intro: "Start free, then upgrade when you want more visibility, messaging confidence, and premium controls.",
    sections: [
      { title: "Standard", body: ["Create a profile, browse members, send selected interactions, and use core safety features."] },
      { title: "VIP", body: ["VIP is planned for priority discovery, richer messaging tools, read receipts, and stronger profile visibility."] },
      { title: "Coins", body: ["Coins power gifts and selected premium actions. Purchases and checkout are completed in the VIP centre."] },
    ],
    cta: { label: "Open VIP centre", href: "/vip" },
  },
};

function translate(base: Record<ContentSlug, PageCopy>, overrides: Partial<Record<ContentSlug, Partial<PageCopy>>>): Record<ContentSlug, PageCopy> {
  return Object.fromEntries(
    (Object.keys(base) as ContentSlug[]).map((slug) => [slug, { ...base[slug], ...overrides[slug] }])
  ) as Record<ContentSlug, PageCopy>;
}

export const pageCopy: Record<Locale, Record<ContentSlug, PageCopy>> = {
  en,
  th: translate(en, {
    about: { eyebrow: "เกี่ยวกับเรา", title: "วิธีพบรักข้ามวัฒนธรรมที่สงบและจริงใจ", intro: "Thai My Heart สร้างขึ้นเพื่อการเดตระหว่างไทยและต่างชาติที่ให้ความสำคัญกับความเคารพ ความชัดเจน และความปลอดภัย" },
    faq: { eyebrow: "คำถามที่พบบ่อย", title: "คำถามที่พบบ่อย", intro: "คำตอบสั้น ๆ เกี่ยวกับการสมัคร ความปลอดภัย VIP และการช่วยเหลือบัญชี" },
    "how-to-use": { eyebrow: "คู่มือ", title: "วิธีใช้ Thai My Heart", intro: "เส้นทางง่าย ๆ จากการสมัครไปสู่การสนทนาที่ปลอดภัยกว่า" },
    "terms-and-conditions": { eyebrow: "ข้อกำหนด", title: "ข้อกำหนดและเงื่อนไข", intro: "หน้านี้อธิบายกติกาพื้นฐานในการใช้ Thai My Heart" },
    "privacy-policy": { eyebrow: "ความเป็นส่วนตัว", title: "นโยบายความเป็นส่วนตัว", intro: "เราเก็บข้อมูลที่จำเป็นต่อโปรไฟล์ การค้นหา ข้อความ ความปลอดภัย และการช่วยเหลือ" },
    "cookie-policy": { eyebrow: "คุกกี้", title: "นโยบายคุกกี้", intro: "คุกกี้ช่วยให้ระบบจดจำการเข้าสู่ระบบ ภาษา และความปลอดภัยของเซสชัน" },
    "safety-and-reporting": { eyebrow: "ความปลอดภัย", title: "ความปลอดภัยและการรายงาน", intro: "พบปะอย่างระมัดระวัง ควบคุมข้อมูลของคุณ และแจ้งเราเมื่อรู้สึกไม่ปลอดภัย" },
    "advertising-enquiries": { eyebrow: "โฆษณา", title: "ลงโฆษณากับ Thai My Heart", intro: "เข้าถึงผู้ใช้ที่สนใจความสัมพันธ์จริงจังผ่านตำแหน่งโฆษณาที่เหมาะกับหน้าค้นหา" },
    "membership-plans": { eyebrow: "สมาชิก", title: "สมาชิก Standard และ VIP", intro: "เริ่มฟรี แล้วอัปเกรดเมื่อคุณต้องการการมองเห็นและเครื่องมือพรีเมียมมากขึ้น" },
  }),
  de: translate(en, {
    about: { eyebrow: "Ueber uns", title: "Ruhiger ueber Kulturen hinweg kennenlernen", intro: "Thai My Heart ist fuer Thai-fokussiertes internationales Dating mit Respekt, Klarheit und Sicherheit gebaut." },
    faq: { eyebrow: "FAQ", title: "Haeufige Fragen", intro: "Kurze Antworten zu Registrierung, Sicherheit, VIP und Support." },
    "how-to-use": { eyebrow: "Anleitung", title: "So nutzt du Thai My Heart", intro: "Ein einfacher Weg von der Anmeldung zu sichereren Gespraechen." },
    "terms-and-conditions": { eyebrow: "Rechtliches", title: "Nutzungsbedingungen", intro: "Diese Bedingungen erklaeren die Grundregeln fuer Thai My Heart." },
    "privacy-policy": { eyebrow: "Datenschutz", title: "Datenschutzerklaerung", intro: "Wir verarbeiten Daten, die fuer Profile, Suche, Nachrichten, Sicherheit und Support notwendig sind." },
    "cookie-policy": { eyebrow: "Cookies", title: "Cookie-Richtlinie", intro: "Cookies halten Sitzungen sicher und speichern Spracheinstellungen." },
    "safety-and-reporting": { eyebrow: "Sicherheit", title: "Sicherheit und Meldungen", intro: "Triff Menschen vorsichtig und melde unsicheres Verhalten frueh." },
    "advertising-enquiries": { eyebrow: "Werbung", title: "Werben mit Thai My Heart", intro: "Erreiche eine fokussierte Dating-Zielgruppe mit sicheren gesponserten Platzierungen." },
    "membership-plans": { eyebrow: "Mitgliedschaft", title: "Standard und VIP", intro: "Starte kostenlos und upgrade fuer mehr Sichtbarkeit und Premium-Funktionen." },
  }),
  fr: translate(en, {
    about: { eyebrow: "A propos", title: "Une facon plus calme de se rencontrer entre cultures", intro: "Thai My Heart est concu pour des rencontres internationales serieuses autour de la Thailande, avec respect et securite." },
    faq: { eyebrow: "FAQ", title: "Questions frequentes", intro: "Des reponses courtes sur l'inscription, la securite, VIP et le support." },
    "how-to-use": { eyebrow: "Guide", title: "Comment utiliser Thai My Heart", intro: "Un parcours simple de l'inscription aux conversations plus sures." },
    "terms-and-conditions": { eyebrow: "Legal", title: "Conditions generales", intro: "Ces conditions expliquent les regles de base de Thai My Heart." },
    "privacy-policy": { eyebrow: "Confidentialite", title: "Politique de confidentialite", intro: "Nous traitons les donnees necessaires aux profils, a la recherche, aux messages, a la securite et au support." },
    "cookie-policy": { eyebrow: "Cookies", title: "Politique cookies", intro: "Les cookies protegent les sessions et memorisent la langue." },
    "safety-and-reporting": { eyebrow: "Securite", title: "Securite et signalement", intro: "Rencontrez prudemment et signalez rapidement les comportements inquietants." },
    "advertising-enquiries": { eyebrow: "Publicite", title: "Faire de la publicite avec Thai My Heart", intro: "Touchez une audience dating ciblee avec des emplacements sponsorises responsables." },
    "membership-plans": { eyebrow: "Abonnement", title: "Standard et VIP", intro: "Commencez gratuitement puis passez VIP pour plus de visibilite et d'outils premium." },
  }),
};

export function getPageCopy(locale: Locale, slug: ContentSlug) {
  return pageCopy[locale]?.[slug] ?? pageCopy.en[slug];
}
