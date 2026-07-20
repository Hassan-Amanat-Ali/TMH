# Thai My Heart V2 — Pages & Features Plan (`TMH/`)

## Context
We are rebuilding Thai My Heart from scratch in the **`TMH/`** folder because the current `ThaiMyHeart/` app is glitchy (localStorage-as-database, client-only auth, duplicated headers, failing lint, incomplete i18n) and is being retired. The rebuild must **keep every distinct page and feature** from the old app while **eliminating duplication**, port the already-built clean foundation (MySQL + Prisma 7 + NextAuth), adopt a **new burgundy/gold V2 design** (from `TMH/ThaiMyHeart V2.dc.html` + the three mobile PNG references), and add the V2 economy/reels features.

**Roles:** Claude Code = architect/planner/reviewer (this plan is the source of truth). Codex = implementer. One editor at a time; handoffs logged in `TMH/ai_working.md` + `TMH/ai_collaboration.md`. This document defines WHAT to build; Codex executes it in phased batches I define.

**References already in `TMH/`:** `ThaiMyHeart V2.dc.html` (design doc, 13 screens across 2 iterations), `Navigation.png`, `search swipe page mobile.png`, `search-page-scroll-mobile.png`, `docs/THAIMYHEART-BLUEPRINT.md` (feature spec), `docs/TMH-BUILD-PLAN.md` (rebuild strategy).

---

## 1. Design system (extract into tokens first — batch 0)
Source: `TMH/ThaiMyHeart V2.dc.html`, option **1a "Design system — V2 foundations"** + Turn-2 burgundy refinement.

- **Colors** — Primary burgundy `#8A2438`; dark chrome `#5E1622` / `#4A1B26` / `#33222A` (headers/nav); gold `#B6873A` / `#E9C776` / `#D9B368` (VIP, accents, serif brand); cream/paper `#FFF8EE` / `#FBF7EF` / `#F0E4D6` (backgrounds); muted mauve `#9A8590` / `#5C4450` (secondary text); success/verified green `#2E7D5B`; danger red for destructive.
- **Type** — Display/brand: **Cormorant Garamond** (serif). Body/UI: **Figtree** (sans). Load via `next/font` (self-hosted, no external CSS request).
- **Shape** — rounded cards/inputs, soft shadows, subtle gold hairline borders on dark chrome; VIP shield + crown motifs; verified check badge.
- **Deliverable** — a Tailwind v4 theme (`@theme`) + a `components/ui/` primitive set: `Button` (primary burgundy / gold / ghost), `Card`, `Input`, `Select`, `Modal` (a11y: Esc, focus trap, scroll-lock), `Badge` (VIP/verified/online/new/Reel), `Avatar`, `Tabs`, `Chip`, `Toast`, `Drawer`. **Every screen composes these — no per-page bespoke chrome.**

---

## 2. Page map (each page → design reference: layout + treatment)

### Public / marketing (logged-out)
| Route | Layout ref | Treatment ref | Notes |
|---|---|---|---|
| `/` Home | **1b** Homepage-desktop | **2a** burgundy chrome, photo hero, **reels you can reply to** | Marketing home + quick-match search + featured members + Heart Reels strip + login modal. |
| `/landing` | (keep from old app, optional) | V2 styling | Full-image splash → `/`. Low priority; keep for parity. |
| About, FAQ, How-to-use, Terms, Privacy, Cookie policy, Safety & reporting, Advertising, Contact us | shared content shell | V2 system | Port copy from old app; re-skin in V2; full 4-language i18n. |

### Auth
| Flow | Notes |
|---|---|
| Signup wizard (8 steps) + **email verification** (4-digit) | Port step structure & validation from blueprint §8; DB-backed via `/api/auth/profile-account` + `/api/auth/email-verification`. **No plaintext password in storage.** |
| Login (modal) | NextAuth `signIn`; a11y modal primitive. |
| Forgot / Reset password | `/api/auth/forgot-password` + `/reset-password`. |

### Member (logged-in)
| Route | Layout ref | Treatment ref | Notes |
|---|---|---|---|
| `/dashboard` (logged-in Home / mobile Home tab) | **1g** Dashboard + **2d** Activity | V2 burgundy/gold | **MERGED Activity + Dashboard.** Top = account overview (membership level, **coin balance**, **VIP expiry**, profile completion %, photos/reels usage, upgrade prompts, quick actions). Below = **Activity feed** (who viewed you, new likes, reel replies, recommended matches). **Notifications fold in here + a header bell dropdown.** Post-login landing. |
| `/search` (Discovery) | **1c** 3-column (filters · results · promotion) | **2b** photo-first cards, **match %**, contextual **VIP rail** | Desktop 3-col. **Mobile** = from `search swipe page mobile.png` + `search-page-scroll-mobile.png`: filter row (gender · age · country · Filters count) + **Swipe⇄Scrolling toggle**; swipe deck (✕/❤/💬/✦) and scroll list (Reel badge, ❤ count, Say Hello, gift, bookmark) with interspersed VIP promo. Keep ALL old filters + compatibility scoring. |
| `/profiles/[id]` Profile detail | **1d** Profile-desktop | **2c** cinematic hero, real photography | Gallery, About/Lifestyle/Safety, like/favourite/wink/gift/message/report, match %, verified/VIP badges. |
| `/my-profile` | shared member shell | V2 | Own profile view + edit entry, completion, verification status, settings, **delete account**. |
| `/messages` | **1e** 3-column (conversations · chat · profile preview) | V2 | ALL messaging features (see §4). Admin-hub mode reuses this component (no fork). |
| `/likes` (Liked You / Favourites) | member shell | V2 | Mobile "Likes" tab. Who liked you + saved favourites. |
| `/visitors` | member shell | V2 | Who viewed you (from More drawer). |
| `/reels` Heart Reels | member shell | V2 | Feed + create + **reply-to-reel**; 24h expiry; daily limits; VIP advantages. Woven into Home + search badges. |
| `/vip` VIP Centre | **1f** hero · comparison · plans · wallet · FAQ | V2 gold | VIP plans (30/90/180), comparison table, **Coin Wallet** (balance, buy coins £5/£8.50/£11/£15, history), FAQ, mock checkout. |
| `/verify-me` | member shell | V2 | Photo verification upload → admin review. |

### Admin (consolidated — ONE area, no `/admin` + `/admin-v2` split)
| Route | Notes |
|---|---|
| `/admin` (tabbed) | Verification queue · Moderation (reports/blocks/spam) · Support tickets · Members (search, suspend/ban-temp/ban-perm/shadow/restore/ip-flag) · Bans (temp + auto-restore) · Audit log · **Economy** (coin adjustments, VIP status/expiry, gift logs, transactions) · Reels/photo moderation. All DB-backed. |

---

## 3. Navigation (single shared system — kills the old duplicated headers)
- **Desktop header** — burgundy/gold chrome (`#5E1622`), Cormorant serif brand + laurel/heart mark, primary nav (Home/Dashboard · Search · Reels · Messages · Profile), right cluster: **VIP crown**, **coin balance**, notification **bell** (dropdown), avatar menu. One `SiteHeader` for members; a lighter marketing header for logged-out.
- **Mobile** — from `Navigation.png`: **5-tab bottom nav** = **Home · Search · Likes · Messages · Profile** (deep-red active, filled icon + label, badges on Messages/Likes) + top-right **"More" (⋮) → side Drawer**: VIP Upgrade · Coin Wallet (balance) · Heart Reels · Visitors · Favourites · Settings · Help & Safety.
- **Consistency rule (owner-stressed):** mobile Search keeps the filter row + Swipe/Scroll toggle from the PNGs (the doc's `1h` lacks filters — do NOT follow that); all mobile screens use the same burgundy/gold system, bottom nav, and card styles as desktop. No incoherent one-offs.
- `SiteFooter` — burgundy/gold, 4 columns + language switcher, all links `next/link`.

---

## 4. Feature inventory (ALL preserved + V2 additions)
**Preserved from old app (blueprint §2 Keep-List):** search (quick/detailed, text, age/height ranges, online/verified/new, profession/children/relationship/language/target filters, sort + **compatibility scoring**, quick-link presets); swipe mode (10/day); like/favourite/wink/gift/hide/report + profile visits; profile detail tabs; messaging (conversation list + filters, composer, emoji, **photo attach w/ 30-day + 10/24h limits**, **6 colour schemes**, **per-message + auto translate**, **safety-keyword guard**, report image/conversation, block, archive, admin-hub); signup wizard + email verification; my-profile completion %; verify-me; admin verification/moderation/support/members/bans/audit; 4-language i18n; email (verify/welcome/reset). **Business rules unchanged** (blueprint §13).

**V2 additions (schema already supports — blueprint §5/§14):** Coin economy (Wallet, CoinTransaction ledger, CoinPackage, Order, mock checkout, admin credit); VIP (VipPlan 30/90/180, VipSubscription, perks: unlimited photos, read receipts, email exchange, boost); **Heart Reels** (Reel/ReelView, 24h expiry, daily limits, reply-to-reel, VIP advantage); Gifts (Gift catalogue, GiftTransaction, coin cost); **Match %** (compatibility → percentage on cards/profiles); Search 2.0 (SavedSearch, ranking weights = location·recency·completeness·photo·reels·verification·VIP-boost, **dynamic LocationNode hierarchy** UK/TH/US/CA/AU); engagement (visitors, popular, likes/favourites); verification badges (email/phone/photo/ID); hidden Trust Score; Profile completion + **ProfileTier** (Bronze/Silver/Gold). **Remove any voice/video/streaming.**

**Data source of truth:** session (NextAuth) + Prisma/MySQL for all durable data. `localStorage` only for ephemeral UI prefs (e.g., chat colour scheme, swipe/scroll toggle). This fixes the biggest old-app glitch (messaging/likes never persisted server-side).

---

## 5. Architecture (dedup by construction)
Per `docs/TMH-BUILD-PLAN.md` §3–§4. Route groups so header/footer/gating live in exactly ONE place:
```
app/(marketing)/  marketing header/footer + home, landing, about, faq, legal, contact
app/(auth)/       signup wizard, forgot/reset (login = shared modal)
app/(member)/     member shell (SiteHeader + bottom nav) + auth gate + dashboard, search,
                  profiles/[id], my-profile, messages, likes, visitors, reels, vip, verify-me
app/(admin)/      admin shell + admin gate + consolidated admin
components/ui/ · components/layout/ (SiteHeader, MarketingHeader, MobileTabBar, MoreDrawer,
                  SiteFooter, MemberShell, AdminShell) · components/feature/ (ProfileCard,
                  SwipeDeck, ScrollResults, Composer, ReelCard, VipRail, WalletWidget, MatchBadge)
lib/ (types, i18n, format, api, hooks) · server/ (prisma, auth, session, mailer, services/*)
prisma/ (ported schema + seed) · proxy.ts (ported guards + CORS + locale)
```
- **One `Profile` type**, one i18n dictionary (all 4 languages — fixes old French-only gaps), shared helpers (`buildMessagesHref`, `formatRelativeTime`, storage) in `lib/`.
- `useSession()` everywhere for auth UI; server `getCurrentUser`/`requireAdmin` in routes.
- Images via `next/image` (config `remotePatterns`) — no raw `<img>`, no CLS.

---

## 6. Build phases (Codex executes; I define/review each batch)
0. **Foundation & design system** — scaffold Next 16 + Tailwind v4 + TS in `TMH/`; `git init`; **port foundation verbatim** from `ThaiMyHeart/` (`prisma/schema.prisma`, `prisma.config.ts`, `lib/server/{prisma,accounts,session,mailer}.ts`, `app/lib/auth.ts`, `types/next-auth.d.ts`, `proxy.ts`, `.env` template, deps) **+ apply the §9.6 additive schema deltas** (new models/enums/fields); extract design tokens → theme + `ui/` primitives; build `SiteHeader`/`MarketingHeader`/`MobileTabBar`/`MoreDrawer`/`SiteFooter` + route-group shells; fonts via `next/font`.
1. **Auth & onboarding** — signup wizard + email verification, login modal, forgot/reset, account deletion.
2. **Discovery & profiles** — `/search` (desktop 3-col 1c/2b + mobile swipe/scroll from PNGs, filters, compatibility, match %), `/profiles/[id]` (1d/2c).
3. **Dashboard & self-service** — merged `/dashboard` (1g+2d, notifications+bell), `/my-profile`, `/verify-me`, `/likes`, `/visitors`.
4. **Messaging** — `/messages` (1e 3-col), DB-backed real delivery, translate, photo rules, report/block/archive; header bell wiring.
5. **Content & i18n** — marketing/legal pages, full 4-language coverage, footer.
6. **Admin** — consolidated moderation/verification/support/members/bans/audit/economy.
7. **V2 economy & reels** — Coin Wallet + VIP Centre (1f) + orders (mock checkout), Gifts, **Heart Reels** (+ reply-to-reel), Search 2.0 ranking + saved searches + dynamic locations, engagement.

Each phase ends **green**: `npm.cmd run lint` clean + `npm.cmd run build` pass (Windows PowerShell — use `.cmd` shims per Codex's audit).

---

## 7. Verification
- Per batch: `npm.cmd run lint` (0 errors), `npm.cmd run build` (pass), `npx.cmd tsc --noEmit` (pass).
- DB: `npm run db:migrate && npm run db:seed` against a live MySQL; then exercise the real flow via `npm run dev` (signup → verify → login → search → message → dashboard). Record observations in `ai_working.md`.
- Visual: compare each screen against its design-doc option + mobile PNG.

## 8. Open items for owner (non-blocking; defaults chosen)
- Design direction confirmed as **Turn 2 burgundy/gold** (per the per-page mappings given).
- **Decided by planner:** Activity + Dashboard = **merged Dashboard**; Notifications = **Dashboard feed + header bell**; Admin = **consolidated**.
- Deletion of `ThaiMyHeart/` should wait until **Phase 0 port** is done (foundation only lives there).
- Payments = **mock + admin credit** first (blueprint decision); media = **local disk, swap-ready**.

---

## 9. Additional owner-specified features (2026-07-17)

Coverage: **Detailed profiles** (all tiers) and **Search Boost** are already in §4/§5. Everything below is a refinement or new build. All schema deltas are **additive** and go into the Phase 0 schema port so we don't re-migrate.

### 9.1 Monetization
- **Coin-first economy** — cash buys **coin bundles**; coins are the internal currency spent on **subscription plans (Standard/VIP)** and **gifts**. Refine VIP purchase to debit the wallet. *Schema:* `VipPlan.costCoins Int?`. *Phase 7.*
- **Ad interstitial (mobile swipe)** — every **4th** swipe card is a full-screen ad with a **2–3s unskippable countdown** before it can be dismissed. VIP may be exempt (owner to confirm). *Phase 2 (placement) + 7 (fill).*
- **Ad cards (grid)** — every **4th** card in the desktop/mobile scroll/grid directory is an ad slot. *Phase 2.*
- *Ads are admin-managed/self-served* (no external ad network for MVP). *Schema:* new `Ad{ id, title, imageUrl, targetUrl?, placement: AdPlacement(SWIPE_INTERSTITIAL|GRID_CARD), active, weight, advertiser?, createdAt }`; optional `AdImpression{ adId, userId?, createdAt }`.

### 9.2 User tiers & limits (admin-configurable)
- **Standard:** 5 photos, 2 videos (≤12s), standard ranking. **VIP:** 10–15 photos, 4 videos (≤30s), **Stealth Mode** (hide online status), **Search Boost** (top ranking). Same detailed profile fields for both.
- **Admin can change all photo/video limits + durations for both tiers at any time** → limits are **data, not constants**.
- *Schema:* new `PlanSetting{ id, tier: MembershipLevel, maxPhotos, maxVideos, videoMaxSeconds, updatedAt }` (seed Standard 5/2/12, VIP 12/4/30); new `ProfileVideo{ id, userId, url, durationSec, position, moderation: ModerationStatus, createdAt }` (permanent profile videos — distinct from 24h Reels); `Profile.stealthMode Boolean @default(false)`. Enforce limits at upload from `PlanSetting`. *Phases 3 (limits/videos) + 6 (admin config).*

### 9.3 Platform safety (auto-enforcement)
- **Anti-leakage filter** — outbound messages containing **phone numbers / WhatsApp links / emails / external handles** are **blocked** and trigger **instant account suspension**. (Extends the existing scam-keyword guard, which stays as a warn.)
- **Trigger-word filter** — unethical/abusive words → block + **suspend** the sender.
- **Image moderation** — photo/video uploads **auto-scanned** to reject **QR codes** and inappropriate content. *Pluggable service; until wired, quarantine to `moderation=PENDING` + admin review.*
- **IP geolocation lock** — capture signup/login IP + geo; **flag** VPN use or IP-country ≠ stated profile country (e.g., UK profile from Asia). *Pluggable IP-intel; flag-only first.*
- **Admin recovery loop** — a suspended user appeals via **Contact Us**; admin manually reactivates. *Schema:* `SupportRequest.type: SupportType(GENERAL|APPEAL) @default(GENERAL)`; `User.suspendedAt DateTime?`, `User.suspensionReason String?`, `User.ipCountry String?`, `User.vpnSuspected Boolean @default(false)` (`ipFlagged`, `AccountStatus.SUSPENDED`, `shadowRestricted` already exist).
- *Filters are admin-manageable:* new `ModerationRule{ id, kind: ModRuleKind(LEAKAGE|TRIGGER_WORD), pattern, action: ModAction(BLOCK|SUSPEND|FLAG), active }` (seed defaults; regex for phone/email/whatsapp). *Phase 4 (message filters) + 3 (image) + 1 (IP capture) + 6 (admin rules/appeals).*

### 9.4 UX — chat organisation
- **Favourite** conversations + **custom labels** (e.g. "Reply Later", "Casual") inside the chat hub to **filter** matches. *Schema:* new `ConversationTag{ id, userId, conversationId, label String?, favourite Boolean @default(false), @@unique([userId, conversationId]) }` (per-user, since a Conversation is shared). *Phase 4.*

### 9.5 Admin — "God Eye" dashboard
Extends the consolidated `/admin` (§2): manually **grant coins**, **adjust tier limits** (`PlanSetting`), **review location/VPN flags**, **block VPNs**, **handle ban appeals** (`SupportRequest.type=APPEAL` → reactivate), manage `Ad`s and `ModerationRule`s. Every action writes an `AdminAction` audit row. *Phase 6.*

### 9.6 New enums (Phase 0 schema)
`AdPlacement{SWIPE_INTERSTITIAL,GRID_CARD}`, `SupportType{GENERAL,APPEAL}`, `ModRuleKind{LEAKAGE,TRIGGER_WORD}`, `ModAction{BLOCK,SUSPEND,FLAG}`. New models: `Ad`, `AdImpression`(opt), `PlanSetting`, `ProfileVideo`, `ModerationRule`, `ConversationTag`. Field adds: `VipPlan.costCoins`, `Profile.stealthMode`, `User.{suspendedAt,suspensionReason,ipCountry,vpnSuspected}`, `SupportRequest.type`.

### 9.7 Open confirmations (non-blocking; defaults chosen)
- Are VIP users **exempt from ads**? (default: yes.)
- Suspension on leakage/trigger words = **immediate auto-suspend** (default per spec) vs shadow-restrict + review? (default: auto-suspend, appeal via Contact Us.)
- Image-moderation + VPN-intel providers TBD (default: pluggable interface, manual review until a provider is chosen — no third-party wired without owner approval).
