# Thai My Heart — Complete Reproduction Blueprint

> **Purpose.** This document is a full specification of the Thai My Heart web application as it currently exists. It is written so that a competent engineer (or an AI agent in a fresh session) can rebuild the project to behavioural and structural parity using only this document. It captures the stack, every route, the data model, all business rules, the design system, the localStorage-based state model, every API contract, and the V2.0 roadmap.
>
> **Honesty note.** A spec reproduces the project *functionally and structurally* — same architecture, routes, features, flows, rules, and look. It cannot reproduce files byte-for-byte; only the source can do that. Where exact values matter (limits, keys, copy, seed data) they are listed explicitly.
>
> **How to use as a prompt.** Paste the whole file into a new session and say: *"Build this project exactly as specified. Follow the stack, routes, data model, business rules, and design system precisely. Ask before deviating."*

---

## 1. Executive summary

Thai My Heart (repo/package name `dating-site`) is a **Thai-focused international dating platform**. It is a Next.js 16 App Router application with a rose/coral/slate premium visual style, four-language localisation (English, Thai, German, French), and a member journey covering: marketing home, signup wizard, member discovery/search, profile detail, simulated messaging, notifications, profile management, photo verification, and two admin/moderation dashboards.

The project is mid-migration from a **prototype** (auth + all member data lived in `localStorage`; several APIs were fake) to a **real platform** (MySQL + Prisma 7 + NextAuth). The data model and auth foundation are built; most client pages still read `localStorage` and are being rewired to the database. The forward plan is a **V2.0 rebuild** adding a coin/VIP economy, Heart Reels, Search 2.0, gifts, and a moderation/verification system (see §14).

---

## 2. Technology stack (exact)

| Concern | Choice |
|---|---|
| Framework | **Next.js 16.2.3** (App Router, Turbopack, React 19.2.4) |
| Language | TypeScript 5 (strict), `moduleResolution: bundler`, path alias `@/* → ./*` |
| Styling | **Tailwind CSS v4** via `@tailwindcss/postcss` (utility-first; no component library) |
| Animation | `framer-motion` ^12 |
| Icons | `lucide-react` |
| Auth | **NextAuth v4** (Credentials provider, JWT session strategy) |
| DB | **MySQL** via **Prisma 7** with the **`@prisma/adapter-mariadb`** driver adapter (Prisma 7 requires an adapter; the connection URL lives in `prisma.config.ts`, NOT in `schema.prisma`) |
| Passwords | `bcryptjs` |
| Email | `nodemailer` (SMTP via env; degrades gracefully when unconfigured) |
| Translation | Google Cloud Translate v2 REST (server-proxied) |

**Critical Next 16 conventions** (these differ from older Next.js — the repo's `AGENTS.md` warns "this is NOT the Next.js you know", read `node_modules/next/dist/docs` before coding):
- Middleware is renamed to **`proxy.ts`** at the project root, exporting a `proxy(request)` function + `config.matcher`. Runs on the Node.js runtime.
- `next.config.ts` is TypeScript.

**Prisma 7 gotchas** (both bit us during setup, document them for the rebuild):
1. `datasource db { provider = "mysql" }` — **no `url`** in the schema. The URL goes in `prisma.config.ts` (`datasource.url = process.env.DATABASE_URL`) for the CLI, and is passed to the client via the adapter.
2. The Credentials provider **only supports JWT sessions**, not database sessions. The session is a signed httpOnly cookie.

`package.json` scripts: `dev`, `build`, `start`, `lint`, `db:generate`, `db:migrate` (`prisma migrate dev`), `db:push`, `db:seed` (`prisma db seed` → `tsx prisma/seed.ts`), `db:studio`.

---

## 3. Repository layout

```
app/
  layout.tsx                 Root layout: locale detection (cookie/header), <AuthProvider>, <LocaleProvider>
  globals.css                Tailwind v4 import + CSS vars (Segoe UI font stack)
  page.tsx                   Marketing HOME + login modal + quick search + mobile nav
  landing/page.tsx           Full-image splash (/landing.png) with a transparent CTA hotspot + click sound
  profiles/page.tsx          Member DISCOVERY/SEARCH (filters, compatibility scoring, swipe mode)
  profiles/[id]/page.tsx     Server wrapper (generateStaticParams) → ProfileDetailClient
  profiles/[id]/profile-detail-client.tsx   Profile DETAIL (gallery, tabs, like/fav/report/message)
  create-profile/page.tsx    8-step signup WIZARD + email verification modal
  my-profile/page.tsx        Member self PROFILE view, completion %, delete-account flow
  messages/page.tsx          MESSAGING (localStorage chat, translate, photos, report/block/archive)
  notifications/page.tsx     NOTIFICATIONS ("Liked You" feed, quick filters, advert slots)
  verify-me/page.tsx         Photo VERIFICATION upload (data URL → localStorage)
  admin/page.tsx             Admin console v1 (verification/moderation/support/overview)
  admin/mailbox/page.tsx     Renders <Messages/> in admin-hub context
  admin-v2/page.tsx          Admin "Hub v2" (members/bans/audit/settings + DB-backed)
  membership-plans/page.tsx  Static: 2026 free; future premium features teased
  contact-us/page.tsx        Multilingual support form → /api/contact
  forgot-password, reset-password/page.tsx   Password reset UI
  about, faq, how-to-use, terms-and-conditions, privacy-policy, cookie-policy,
    safety-and-reporting, advertising-enquiries/page.tsx   Content/legal pages
  components/
    site-footer.tsx          Global footer + language switcher
    locale-provider.tsx      Locale context (cookie-persisted)
    auth-provider.tsx        NextAuth <SessionProvider> wrapper
  lib/
    i18n.ts                  Locale detection + ALL home/footer copy for 4 languages
    auth.ts                  NextAuth authOptions (Credentials + Prisma + bcrypt, JWT)
    profiles.ts              Static seed Profile[] (used by /profiles/[id] and notifications)
    member-session.ts        localStorage scoping helpers (per-email data archive/restore)
    seed-profiles.ts         (empty)
  api/
    auth/[...nextauth]/route.ts   NextAuth handler
    auth/profile-account/route.ts POST upsert member account (Prisma)
    auth/email-verification/route.ts  POST send / PATCH verify 4-digit code (Prisma)
    auth/forgot-password/route.ts     POST issue reset token (Prisma)
    auth/reset-password/route.ts      POST consume token, set password (Prisma)
    login/route.ts            POST credential check (Prisma) — legacy, used by delete confirm
    account/delete/route.ts   POST real account deletion (session + password)
    contact/route.ts          GET(admin)/POST(public)/PATCH(admin) support tickets (Prisma)
    translate/route.ts        POST Google Translate proxy
    admin-v2/bootstrap/route.ts   GET members list (admin, Prisma)
    admin-v2/verification/route.ts PATCH verification decision (admin, Prisma)
    admin-v2/mailbox/route.ts GET a member's conversations (admin, Prisma)
lib/
  prisma/                    GENERATED Prisma client (output target; do not hand-edit)
  server/
    prisma.ts                Singleton PrismaClient with MariaDB adapter
    accounts.ts              Account CRUD over Prisma (readAccounts/find/update/upsert)
    session.ts               getCurrentUser / requireUser / requireAdmin
    mailer.ts                nodemailer transport + verification/welcome/reset emails
prisma/
  schema.prisma              MySQL schema (see §5)
  seed.ts                    Seeds admin + coin packs + VIP plans + gifts
prisma.config.ts             Prisma 7 config (schema path, migrations dir + seed, datasource url)
proxy.ts                     CORS (scoped) + auth route guards + locale header injection
next.config.ts               images.remotePatterns (unsplash); CORS handled in proxy
public/                      header.png, page.png, landing.png, silhouette-profile.svg, 711.mp3
data/                        (legacy) JSON files — superseded by MySQL; safe to remove
ui-samples/                  Standalone HTML/CSS design explorations (NOT wired to the app)
```

Public assets referenced by code: `/header.png` (header background), `/page.png` (page background), `/landing.png` (splash), `/silhouette-profile.svg` (placeholder avatar), `/711.mp3` (login/landing jingle).

---

## 4. Design system

**Brand.** "Thai My Heart". Wordmark is bold black text; where a logo mark is used it's a `Heart` icon in a rounded square with a `from-rose-500 to-orange-500` gradient.

**Palette (Tailwind classes actually used):**
- Primary: **rose** (`rose-500/600/700`) and **orange/amber** accents; hero gradients `from-rose-500 to-orange-500`, `from-rose-600 via-pink-600 to-orange-500`.
- Neutrals: **slate** (`slate-50…950`). Dark surfaces use `slate-900/950` with white text.
- Semantic: emerald (verified/success), amber (pending/warning), rose/red (danger/report), blue & fuchsia (gender tags: man=blue, woman=pink/rose, ladyboy=fuchsia).
- The profile **detail** page uses a distinct dark theme (`#0b1220` with blurred colored orbs and glassmorphism `bg-white/5 backdrop-blur-xl`).

**Typography.** System stack via CSS var `--font-geist-sans: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`. Headings are heavy (`font-black`, tight tracking). Body is slate-600/700.

**Shape & elevation.** Very rounded: cards `rounded-[28px]`/`rounded-[30px]`/`rounded-3xl`, buttons/inputs `rounded-2xl`, inputs are `h-12`. Soft shadows (`shadow-sm`…`shadow-2xl`), subtle borders (`border-slate-200`, `border-white/…` on dark). Frequent `backdrop-blur`.

**Layout.** Centered `max-w-7xl` containers, `px-4 sm:px-6 lg:px-8`. Responsive grids (`sm:grid-cols-2 lg:grid-cols-4` etc.). Hero/section cards on a fixed background image.

**Header pattern (IMPORTANT inconsistency to preserve or unify).** There are **two** header styles duplicated across pages (no shared Header component yet):
1. **Image header** (home, profiles, my-profile, notifications): `h-32` div with `background-image: url('/header.png')`, a `w-64` empty spacer, then right-aligned nav. Desktop nav is `hidden lg:flex`; a mobile hamburger + slide-down panel exists **only on the home page** (added later) — other pages still hide the nav on mobile.
2. **Sticky white header** (verify-me, membership-plans): `sticky top-0 bg-white/85 backdrop-blur` with a Heart logo mark + a page subtitle, nav `hidden md:flex`.
A rebuild should extract a single shared, responsive `<SiteHeader>` — this duplication is a known debt.

**Footer.** `SiteFooter` (dark `slate-950`) with a top rose bar, four columns (brand+language switcher, Company, Legal, Support) and a copyright line. Fully localised via `footerCopy`. Language switcher buttons call `setLocale`.

**ui-samples/** contains three standalone design directions (Premium Editorial / Modern Product / Warm Community) as static HTML/CSS — a design gallery for choosing a stronger system, **not** imported by the app. Its tokens (rose `#e54f72`, coral `#ff7b66`, jade `#2f9b83`, gold `#bd8a32`, radius `8px`, Inter font) can inform a redesign.

---

## 5. Data model (Prisma, MySQL)

Generator: `provider = "prisma-client"`, `output = "../lib/prisma"` (import client from `@/lib/prisma/client`; enums re-exported there). Datasource: `provider = "mysql"` (no `url`). All ids are `cuid()`. The schema models the **full V2.0 target state** so features add logic, not migrations.

**Enums:** `UserRole{MEMBER,ADMIN}`, `AccountStatus{ACTIVE,UNDER_REVIEW,SUSPENDED,BANNED}`, `Gender{WOMAN,MAN,LADYBOY,OTHER}`, `ProfileTier{BRONZE,SILVER,GOLD}`, `LocationType{COUNTRY,COUNTY,STATE,PROVINCE,DISTRICT,CITY}`, `MembershipLevel{STANDARD,VIP}`, `CoinTxnType{PURCHASE,SPEND,BONUS,ADMIN_ADJUST,GIFT_SENT,GIFT_RECEIVED,REFUND}`, `OrderKind{COINS,VIP}`, `OrderStatus{PENDING,PAID,FAILED,REFUNDED}`, `MediaType{IMAGE,VIDEO}`, `ModerationStatus{PENDING,APPROVED,REJECTED}`, `ReelStatus{ACTIVE,EXPIRED,REMOVED}`, `MessageType{TEXT,IMAGE,GIFT,WINK}`, `InteractionType{LIKE,FAVOURITE,WINK}`, `ReportCategory{FAKE_PROFILE,SCAM,HARASSMENT,EXPLICIT_CONTENT,UNDERAGE,SPAM,OTHER}`, `ReportStatus{OPEN,REVIEWING,RESOLVED,DISMISSED}`, `VerificationType{EMAIL,PHONE,PHOTO,ID}`, `VerificationStatus{PENDING,APPROVED,REJECTED,NEEDS_RESUBMISSION,ESCALATED}`, `SupportStatus{OPEN,ANSWERED}`.

**Models (fields summarised; see `prisma/schema.prisma` for exact columns/indexes):**
- **User** — email(unique), passwordHash, name?, role, status, emailVerified?, membership, trustScore(int, default 50), shadowRestricted, ipFlagged, lastActiveAt?, timestamps. Relations to everything below.
- **Profile** (1:1 User) — displayName, headline, bio, dateOfBirth/age, gender, seeking, intent, heightCm, bodyType, children, wantChildren, smoking, drinking, religion, education, profession, exercise, relocate, **JSON text fields** (languages, interests, goals, icebreakers, preferences), locationText, countryCode, locationNodeId→LocationNode, **completion(int)**, **tier(ProfileTier)**.
- **LocationNode** — self-referential tree (type, name, countryCode, parentId). Supports UK County→City, TH Province→District→City, US/AU State→City, CA Province→City.
- **Photo** — user, url, isPrimary, position, moderation.
- **Reel** (Heart Reels) — user, mediaUrl, mediaType, thumbnailUrl?, caption?, status, moderation, viewsCount, createdAt, **expiresAt** (24h). **ReelView** — (reel, viewer) unique.
- **Wallet** (1:1 User) — coinBalance. **CoinTransaction** — user, amount(±), type, balanceAfter, reference?, note?.
- **CoinPackage** — label, coins, priceGBP(Decimal), bonus, active, sortOrder. **VipPlan** — label, durationDays, priceGBP, bonusCoins, active, sortOrder. **VipSubscription** — user, plan?, startedAt, expiresAt, active, source?. **Order** — user, kind, reference, amountGBP, coins, status, provider("mock"), providerRef?.
- **Gift** — name, icon, costCoins, active, sortOrder. **GiftTransaction** — gift, sender, receiver, coinsSpent, message?.
- **Conversation** — participantA, participantB (unique pair), lastMessageAt. **Message** — conversation, sender, type, body?, mediaUrl?, read, readAt?, flagged. **Block** — (blocker, blocked) unique.
- **Interaction** — (from, to, type) unique. **ProfileVisit** — visitor, profile. **SavedSearch** — user, name, filters(JSON).
- **Report** — reporter, reportedUser?, conversationId?, reelId?, photoId?, category, note?, status, decision?, resolvedAt?. **Verification** — (user, type) unique, status, evidenceUrl?, note?, submittedAt, reviewedAt?, reviewerId?. **AdminAction** — admin, action, targetType, targetId, detail?.
- **PasswordResetToken** — token(unique), user, expiresAt, used. **EmailVerificationCode** — sessionId(unique), email, userName?, codeHash, expiresAt, attempts, consumed. **SupportRequest** — user?, userName?, email, subject, message, status, replyNote?, canReceiveMessageReply, repliedToMessagesAt?.

**Seed** (`prisma/seed.ts`): admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` env, default `admins@tmh.com`/`ChangeMe123`, role ADMIN, empty wallet); coin packs **£5→50, £8.50→100, £11→150, £15→250 (+20 bonus)**; VIP plans **30/90/180 days** (`£9.99/£24.99/£44.99`, +20/80/200 bonus coins); gifts **Rose 🌹 5, Chocolates 🍫 10, Teddy 🧸 20, Heart ❤️ 30, Diamond Ring 💍 100** coins.

---

## 6. Authentication & authorization

**Real auth (current foundation):**
- `app/lib/auth.ts` — NextAuth `authOptions`: Credentials provider, looks up user by lowercased email in MySQL, `bcrypt.compare`, blocks BANNED/SUSPENDED, stamps `lastActiveAt`. **JWT session** (30-day). `jwt`/`session` callbacks put `id, role, membership, status, isAdmin` on the token/session. `types/next-auth.d.ts` augments the Session/JWT types. `secret` from `NEXTAUTH_SECRET`.
- `app/components/auth-provider.tsx` wraps the app in `<SessionProvider>` (added in `layout.tsx`).
- `lib/server/session.ts` — `getCurrentUser()`, `requireUser()`, `requireAdmin()` (throws `AuthError{status}`), for route handlers / server components.
- `proxy.ts` — enforces, via `getToken`, that `/messages /my-profile /notifications /dashboard` require a session, and `/admin /admin-v2` require `role === 'ADMIN'` (else redirect to `/` or `/?login=1&next=…`). Also does scoped CORS and locale-header injection.

**Legacy localStorage auth (still present in client pages, being migrated):** the UI reads `tmhLoggedIn === "true"` and `tmhAdminAuthenticated === "true"` to toggle nav/gates. The home login modal now calls NextAuth `signIn("credentials")` **and** sets these flags (belt-and-suspenders); logout calls `signOut` + `logoutMemberSession()`. The admin pages historically gated on `tmhAdminAuthenticated` + `tmhAdminEmail === "admins@tmh.com"` — server-side `proxy.ts` is now the real gate.

**Rebuild guidance:** finish the migration — replace every `localStorage.getItem("tmhLoggedIn")` UI check with `useSession()`, and every localStorage data store (see §9) with DB calls. Keep `proxy.ts` as the authoritative gate.

---

## 7. Internationalisation

- Locales: **en, th, de, fr** (`app/lib/i18n.ts`). `defaultLocale="en"`. Cookie `tmh-locale`, header `x-tmh-locale`.
- Detection order (`detectLocaleFromRequest`, used in `proxy.ts`): cookie → geo IP country (`x-vercel-ip-country`/`cf-ipcountry`, mapped e.g. TH→th, DE/AT/CH→de, FR/BE/LU/MC→fr) → `Accept-Language` → default. `layout.tsx` reads the header/cookie server-side and seeds `<html lang>` + `LocaleProvider`.
- `LocaleProvider` (`components/locale-provider.tsx`) holds locale in React state, persists to the `tmh-locale` cookie, exposes `useLocale()`.
- **Copy coverage is uneven** (reproduce as-is or fix): `homeCopy` and `footerCopy` are fully translated for all 4 languages. `contact-us` has its own 4-language copy. But **`profiles/page.tsx` only special-cases French** (`isFrench` ternaries; other locales fall back to English), and `create-profile` uses an English/French `t()` helper only. Most other pages are English-only.

---

## 8. Pages — behaviour spec

### Home `/` (`app/page.tsx`, client)
Fixed `/page.png` background; image header. Sections: hero (badge, title, description, CTAs, 4 stat tiles), **Quick Match Search** card (looking-for select women/men/ladyboys, region select, age from/to **numeric** inputs, "Search profiles" → `/profiles?mode=quick&…`), quick-link grid (8 links building `/profiles?…` querystrings), **Featured members** (6 hardcoded members, all using `/silhouette-profile.svg`), Trust & Safety, Language support, Success stories, Invitation CTA, disabled social-share buttons ("coming soon"), footer. **Login modal**: email/password → `signIn("credentials")` → on success set legacy flags + scoped data restore → redirect (`/admin` if admin else `/notifications`, playing `711.mp3` via `tmhLoginSoundPending`). Modal is accessible (Esc, backdrop click, scroll-lock, focus, `role="dialog"`). **Mobile nav**: hamburger → slide-down panel (home only). On login redirect from a gated action, `tmhShowLogin` auto-opens the modal.

### Landing `/landing`
Full-bleed `/landing.png` with a single transparent hotspot button positioned over the printed CTA (`left-6.2% top-77.9% w-44.7% h-8.3%`); plays `711.mp3` (Web Audio fallback tone) then routes to `/`. Fixed "← Back" → `/profiles`.

### Discovery `/profiles` (`app/profiles/page.tsx`, client)
The core search page. **61 hardcoded `allProfiles`** (women ids 1–36, men 37–46, ladyboys 47–61) with name/age/location/lookingFor/photos/lastActive/bio/online/verified/featured/image (Unsplash). A locally-created profile (from `tmhProfileData`) is injected as id 1000. **Deterministic per-id metadata** (`getProfileMeta`) fabricates profession/height/children/smoking/etc. **Filters**: quick/detailed mode, text query, age range, height range, sort (`bestMatch` uses `computeCompatibilityScore` against the local user's `MatchPreferences`), online-only, verified-only, profession, children, want-children, relationship, language, target (women/men/ladyboys via `inferProfileType`: contains "female"→man, id≥47→ladyboy, else woman), new-only (id>26 or joined<30d). **Swipe mode**: deck, `DAILY_SWIPE_LIMIT = 10`/day, like→records to `tmhSwipeLikedBox` + `tmhLikedYouFeed`. **Card actions**: Message (→ `/messages?…`), Favourite, Wink, Gift, Not-interested (Hide), Report (modal with reasons: fake/money/scam/spam/minor/offensive/other). Gated: unauthenticated users are redirected to `/` with `tmhShowLogin`. French-only localisation.

### Profile detail `/profiles/[id]`
Server `page.tsx`: `generateStaticParams()` from `lib/profiles.ts`; if id unknown builds a fallback profile from `?name`. `profile-detail-client.tsx` (dark `#0b1220` theme): auth-gated (redirect to `/` if not logged in), photo gallery with thumbnails/next-prev, tabs **About/Lifestyle/Safety**, like/favourite/report toggles (localStorage sets `tmhLikedProfiles`/`tmhFavouriteProfiles`/`tmhReportedProfiles`), Message → `/messages`, back target adapts to `?returnTo`. Fabricated stats (1,284 views, 387 favourited, 46 mutual likes).

### Signup wizard `/create-profile` (`app/create-profile/page.tsx`, client)
**8 steps**: (0) Account Setup (userName, email+confirm, password+confirm, age, location, country, gender, lookingForGender), (1) Appearance & Family (height, bodyType, children, wantChildren, smoking, drinking), (2) Language & Relocation, (3) Work & Lifestyle (jobType, religion, exercise; empty "weekend" triggers a popup), (4) Relationship Goals (empty "dealbreakers" triggers a popup), (5) About You (aboutMe, interests toggle grid, partnerType), (6) Extended Preferences (all `preferred*` match fields, optional), (7) Photos (data-URL previews), (8) Summary & Save. Per-step validation, **underage** check, **duplicate-email** check (against a hardcoded list + accounts), geolocation via `ipapi.co` to prefill country, height normalised to cm. **Finish** → `requestVerificationCode()` (POST `/api/auth/email-verification`) → 4-digit code modal → PATCH verify → `persistProfile()`: POST `/api/auth/profile-account` (creates the DB account) then save the full `tmhProfileData` snapshot to localStorage (incl. plaintext `accountPassword` — a known security flaw to fix) → redirect `/my-profile`.

### My profile `/my-profile`
Reads `tmhProfileData`; cover/avatar from photoUrls; **profile completion %** over 17 weighted fields + a 6-item checklist; Info cards; Account snapshot ("Standard Member"); Quick actions (all → `/create-profile` editor); verification status (pending/verified/verify link → `/verify-me`); **Delete account** flow: confirm → password prompt → verify via `/api/login` (legacy) → `/api/account/delete` → `logoutMemberSession()` → home.

### Messaging `/messages` (`app/messages/page.tsx`, client)
**Simulated, localStorage-backed chat** — no real inter-user delivery, no auto-reply; sent messages just append to `tmhConversations`. Seeded conversations (Carl, Nicha, Ploy, Fahsai, Mali, Dao, One…). Features: conversation list with All/Inbox/Sent filter; composer with emoji picker + **photo attach** (data URLs); **6 colour schemes** (rose/blue/purple/emerald/amber/slate) stored in `tmhMessageOptions`; **per-message translation** and **per-chat auto-translate** via `/api/translate` (11 languages); **report image**, **report conversation**, **block**, **archive**; **admin-hub mode** (when admin + `?hub=1` or `/admin/mailbox`) uses parallel `tmhAdmin*` storage keys and can compose one-way "them" messages. **Business rules**: photo sending requires the chat to allow photos AND membership age ≥ **30 days** (from `tmhProfileData.joined`) AND ≤ **10 photos / 24h**; a **safety keyword** guard blocks send and warns when scam terms appear ("send money", "western union", "bitcoin", "gift card", "bank transfer", … full list in code).

### Notifications `/notifications`
"Liked You" feed from `tmhLikedYouFeed` (fallback seed likes); plays `711.mp3` once after login (`tmhLoginSoundPending`); per-item actions (View profile, Like back → `tmhLikedProfiles`, Message, Favourite → `tmhFavouriteProfiles`, Dismiss); quick filters (All/Liked You/Messages/Safety) with counts; notification-settings checkboxes (cosmetic); two advert-slot placeholders.

### Verify me `/verify-me`
Instructions to upload a selfie holding paper with `@username`; file → data URL preview; submit stores `verifyNow="pending"`, `verificationPhotoUrl`, `verificationSubmittedAt` into `tmhProfileData` (admin reviews it). Checklist + "why verify" panel. (Sticky white header variant.)

### Admin v1 `/admin` (`app/admin/page.tsx`)
Gate: `tmhAdminAuthenticated` + `tmhAdminEmail === "admins@tmh.com"`. Dark dashboard. Seed `baseUsers` (TMH-#####), `baseAlerts`, `baseVerifications`. A locally-created member (from `tmhProfileData`) is merged in. **Tabs**: Verification (approve/reject/retake → updates local `tmhProfileData` and/or PATCH `/api/admin-v2/verification`), Moderation (reported images/conversations from `tmhReportedImageMessages`/`tmhReportedConversations`, resolve → `tmhResolvedHubHistory`), Support (fetch `/api/contact`, reply → PATCH, optionally deliver reply into `tmhConversations` admin thread), Overview (stat cards, quick actions). Mailbox viewer (reads `tmhConversations`), member workspace drawer, alert case routing.

### Admin "Hub v2" `/admin-v2` (`app/admin-v2/page.tsx`)
Tabs: **overview, members, verification, moderation, messages, bans, audit, settings**. Moderation actions: `suspend / ban-temp / ban-perm / shadow / restore / ip-flag / unflag`, single + **bulk**; **temp bans** with auto-restore (`tmhHubV2TempBans`); **audit log**; member ranking score (uses trust/shadow flags). Data: GET `/api/admin-v2/bootstrap` (DB members), GET `/api/admin-v2/mailbox?username=` (a member's DB conversations), PATCH `/api/admin-v2/verification`. Seed members fallback when DB empty.

### Static/content pages
`membership-plans` (2026 free; future premium teased: gifts, read receipts, hide profile, online status), `contact-us` (multilingual form → `/api/contact` with `canReceiveMessageReply`), `about`/`how-to-use`/`advertising-enquiries` (multilingual marketing), `faq`/`terms-and-conditions`/`privacy-policy`/`cookie-policy`/`safety-and-reporting` (English legal/content). `forgot-password` → `/api/auth/forgot-password`; `reset-password?token=` → `/api/auth/reset-password`.

---

## 9. localStorage state catalogue (the app's real client state)

The prototype persists nearly everything client-side. Reproduce these keys exactly (they're referenced across pages); the V2 rebuild replaces them with DB tables.

**Auth/session:** `tmhLoggedIn`, `tmhMemberEmail`, `tmhAdminAuthenticated`, `tmhAdminEmail`, `tmhAdminPassword`, `tmhShowLogin`, `tmhLoginSoundPending`, `tmhRedirectToNotifications`.
**Profile:** `tmhProfileData` (the entire member profile snapshot incl. `accountPassword`, `photoUrls`, `verifyNow`, `adminVerified`, `verificationPhotoUrl`, `joined`).
**Messaging:** `tmhConversations`, `tmhMessageDraft`, `tmhOpenConversation`, `tmhUnreadMessageCount`, `tmhMessageOptions` (colour scheme), `tmhPhotoAllowPerChat`, `tmhPhotoSentTimestamps`, `tmhAutoTranslatePerChat`, `tmhBlockedConversationIds`, `tmhArchivedConversations`, `tmhReportedImageMessages`, `tmhReportedConversations`; admin-hub parallels `tmhAdminConversations`, `tmhAdminUnreadMessageCount`, `tmhAdminPhotoAllowPerChat`, `tmhAdminPhotoSentTimestamps`, `tmhAdminBlockedConversationIds`, `tmhAdminArchivedConversations`, `tmhAdminMailboxComposeContext`, `tmhMailboxViewerLabel`.
**Discovery/engagement:** `tmhLikedProfiles`, `tmhFavouriteProfiles`, `tmhReportedProfiles`, `tmhHiddenProfiles`, `tmhSwipeLikedBox`, `tmhLikedYouFeed`, `tmhSwipeDailyCount`, `tmhSearchTargetPreference`, `tmhProfileReports`.
**Admin:** `tmhResolvedHubHistory`, `tmhHubV2TempBans`.

**Per-user scoping** (`app/lib/member-session.ts`): on login/logout, a defined `USER_SCOPED_KEYS` set is archived under a `tmhU_{email}_` prefix and restored for the incoming user, so switching accounts on one browser keeps data separate. `logoutMemberSession()` archives + clears the active keys and removes the auth flags.

---

## 10. API contracts

All return JSON `{ ok: boolean, message?, … }`. CORS is scoped to `ALLOWED_ORIGINS` in `proxy.ts`.

- **`POST /api/auth/profile-account`** — `{email,userName,password?}` → upsert member (Prisma, bcrypt, creates empty Wallet). Password rule: ≥8 chars, 1 uppercase, 1 digit.
- **`POST /api/auth/email-verification`** — `{email,userName}` → creates `EmailVerificationCode` (bcrypt-hashed 4-digit, 10-min TTL), emails it; dev fallback returns `devCode` when SMTP unset (code `4286` in non-prod or `EMAIL_VERIFICATION_CODE`). **`PATCH`** — `{sessionId,code}` → verify (≤5 attempts), mark consumed, stamp `emailVerified`, send welcome email.
- **`POST /api/auth/forgot-password`** — `{email}` → issues single-use `PasswordResetToken` (30-min), emails reset link; always returns generic success (no enumeration).
- **`POST /api/auth/reset-password`** — `{token,password,passwordConfirm}` → validates, sets `passwordHash`, marks token used (transaction).
- **`POST /api/login`** — `{email,password}` → `{ok,user:{id,email,name,role}}` (legacy; used by delete-confirm).
- **`POST /api/account/delete`** — session-required; `{password}` verified via bcrypt → `prisma.user.delete` (cascades). Returns `deletedFromDatabase:true`.
- **`GET /api/contact`** (admin) → all `SupportRequest`s. **`POST`** (public) — `{userName?,email,subject,message,canReceiveMessageReply?}` → creates ticket (attaches `userId` if signed in). **`PATCH`** (admin) — `{id,status,replyNote,repliedToMessagesAt?}`.
- **`POST /api/translate`** — `{text,targetLanguage,sourceLanguage?}` → Google Translate v2 proxy; 500 if `GOOGLE_CLOUD_TRANSLATE_API_KEY` unset.
- **`GET /api/admin-v2/bootstrap`** (admin) → members list derived from Prisma users+profiles.
- **`PATCH /api/admin-v2/verification`** (admin) — `{memberId,action:"approve"|"needs-resubmission"|"reject"|"escalate"}` → writes verification state into `Profile.preferences` JSON.
- **`GET /api/admin-v2/mailbox?username=`** (admin) → a member's conversations from Prisma.
- **`/api/auth/[...nextauth]`** — NextAuth handler.

---

## 11. Server libraries & email

- `lib/server/prisma.ts` — singleton `PrismaClient` built with `new PrismaMariaDb(process.env.DATABASE_URL)`; `global.__tmhPrisma` reuse; `getPrismaClient()` back-compat accessor.
- `lib/server/accounts.ts` — `readAccounts`, `findAccountByEmail`, `updateAccountPassword`, `upsertMemberAccount` (creates Wallet), all over Prisma; maps `UserRole` to legacy `"admin"|"member"`.
- `lib/server/session.ts` — session helpers (§6).
- `lib/server/mailer.ts` — nodemailer transport from `SMTP_HOST/PORT/USER/PASS/SECURE`; returns null (throws "SMTP is not configured") when unset; `sendVerificationCodeEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail` (HTML+text; from `admin@thaimyheat.com` — note the typo'd domain, `no-reply@thaimyheat.com` reply-to).

---

## 12. Environment variables

```
DATABASE_URL="mysql://USER:PASS@HOST:3306/thaimyheart"
NEXTAUTH_SECRET="<long random>"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"   # links in emails
ALLOWED_ORIGINS="http://localhost:3000"        # scoped API CORS
GOOGLE_CLOUD_TRANSLATE_API_KEY=""              # optional (chat translation)
EMAIL_VERIFICATION_CODE=""                     # optional fixed dev code
SMTP_HOST=, SMTP_PORT=465, SMTP_USER=, SMTP_PASS=, SMTP_SECURE=  # optional email
ADMIN_EMAIL=, ADMIN_PASSWORD=                  # optional, for seed
```

---

## 13. Business rules quick reference

- Password policy: ≥8 chars, ≥1 uppercase, ≥1 digit.
- Email verification code: 4 digits, 10-min TTL, ≤5 attempts; dev fallback `4286`.
- Password reset token: single-use, 30-min TTL.
- Photo sending in chat: requires per-chat allow **and** account age ≥ **30 days** **and** ≤ **10 photos / 24h**.
- Swipe mode: **10 swipes/day**.
- "New profile": joined <30 days (local) or id>26 (seed set).
- Safety keyword guard on outbound messages (scam/finance terms → warn+hold).
- Profile completion: % over 17 weighted fields (see `my-profile`).
- Gender inference in search: "female" target→man, id≥47→ladyboy, else woman.
- Membership: everyone "Standard" and free in 2026; premium teased for the future.

---

## 14. V2.0 roadmap (target state to build on this foundation)

Deliver in phases; the schema (§5) already supports all of it.
1. **Coin economy & VIP** — Wallet, CoinTransaction ledger, CoinPackage/VipPlan catalogues, mock checkout + admin credit, VipSubscription; admin coin/VIP/expiry controls.
2. **Profile completion framework** — mandatory fields, 0–100 score feeding ranking/exposure; Bronze/Silver/Gold `ProfileTier`.
3. **Messaging revision** — move chat to `Conversation`/`Message` tables (real delivery), read receipts (VIP), email/photo controls (standard vs VIP), spam filtering.
4. **Heart Reels** — "stories for dating": upload (image/video), 24h expiry, daily post limits, VIP advantages, feeds on profiles/dedicated feed/search; moderation.
5. **Search 2.0** — appearance/lifestyle/location/intent/verification filters, **saved searches**, dynamic global **location hierarchy** (LocationNode), and a ranking algorithm weighting location, recent activity, completeness, photo quality, reels, verification, VIP boost (VIP helps but does not dominate).
6. **Engagement/gifts** — virtual gifts (coins), popular members, visitors, favourites, likes; match % and icebreaker prompts (recommended additions).
7. **Safety & moderation** — reporting categories, verification badges (email/phone/photo/ID), hidden **Trust Score**, moderation dashboard consolidating admin + admin-v2.
   **Removals:** ensure no voice/video/live-streaming features, tables, APIs, or nav remain.

---

## 15. Known issues / current status (as of this snapshot)

- **Foundation done:** MySQL schema, Prisma client, NextAuth, session helpers, scoped CORS + route guards, real account deletion, admin-guarded APIs, accounts + auth-token routes on Prisma, seed script. `npm run build` passes. **Migrations not yet run** (needs a live MySQL: `npm run db:migrate && npm run db:seed`).
- **Still prototype-shaped:** most client pages read `localStorage` for auth/data; messaging/likes/notifications are client-only and don't sync between users. `accountPassword` is stored in plaintext localStorage by the signup wizard (remove during migration).
- **UI/UX debt:** duplicated/inconsistent headers; mobile nav only on home; raw `<img>` (no `next/image`) despite `images.remotePatterns` being configured; i18n incomplete on `profiles`/`create-profile`; dead "coming soon" social buttons.
- `data/` JSON files and `ui-samples/` are not part of the running app; `app/lib/seed-profiles.ts` is empty.

---

### Rebuild order (recommended)
1. Scaffold Next 16 + Tailwind v4 + TS with the layout in §3.
2. Prisma 7 + MySQL + MariaDB adapter; paste the schema (§5); migrate + seed.
3. NextAuth (§6) + `proxy.ts` guards + providers in `layout.tsx`.
4. i18n (§7), `SiteFooter`, a single shared `SiteHeader` (fixing the duplication).
5. Public flows: home, create-profile wizard + email verification, password reset.
6. Member flows: profiles/search, profile detail, my-profile, verify-me, notifications, messaging.
7. Admin consoles + admin-v2 APIs.
8. Then layer the V2.0 phases (§14).
```
