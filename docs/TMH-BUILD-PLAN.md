# Thai My Heart — `TMH/` Rebuild Plan

> Companion to `docs/THAIMYHEART-BLUEPRINT.md` (the feature/behaviour spec) and the `TMH/ThaiMyHeart V2.dc.html` design doc (the visual target).
>
> **Two hard rules for this rebuild:**
> 1. **Keep every distinct page and feature** — nothing from the current app is lost (see §2 Keep-List).
> 2. **No duplication** — repeated code/UI becomes shared building blocks (see §3 De-Dup Map).
>
> **Status:** planning only. No scaffolding until this plan is approved.

---

## 1. Strategy

Build `TMH/` as a **fresh Next 16 project** that:
- **Ports the clean foundation** already built here (MySQL + Prisma 7 schema, NextAuth JWT auth, session helpers, `proxy.ts` guards, seed) — this is the good, glitch-free part of the current repo.
- **Rebuilds every screen** on a **new V2 design system** (burgundy/gold per the design doc) using **shared, deduplicated components**.
- Is **server/DB-first**: `useSession` + Prisma, not `localStorage` as the source of truth (localStorage only for ephemeral UI prefs).
- **Fixes the known glitches** (see blueprint §15) as a natural result of the clean rebuild, not as afterthought patches.
- **Then layers the V2 features** the design doc introduces (VIP economy, Heart Reels, Activity, Dashboard, match %).

Fresh + port-the-good-parts is precisely what leaves the "glitchy" feeling behind while losing nothing.

---

## 2. Keep-List — every page & feature to preserve

### Pages (all retained)
**Public / marketing:** Home, Landing (image splash), About, FAQ, How-to-use, Terms, Privacy, Cookie policy, Safety & reporting, Advertising enquiries, Membership plans, Contact us.
**Auth:** Signup wizard (8 steps + email verification), Login (modal), Forgot password, Reset password, Account deletion.
**Member:** Discovery/Search, Profile detail, My profile, Messages, Notifications, Verify me (photo).
**Admin:** Admin console + Admin Hub v2 → **consolidated into one** admin area (same capabilities, no duplicate).

### Features (all retained)
- **Search:** quick/detailed modes, text query, age & height ranges, online/verified/new filters, profession/children/relationship/language/target filters, sort incl. **compatibility scoring**, quick-link presets.
- **Swipe mode:** deck, **10/day limit**, like → liked-you feed.
- **Engagement:** like, favourite, wink, gift, hide/not-interested, report (reason list), profile visits.
- **Profile detail:** photo gallery, About/Lifestyle/Safety tabs, like/fav/report/message, adaptive back target.
- **Messaging:** conversation list + filters, composer, emoji picker, **photo attach** (30-day + 10/24h limits), **6 colour schemes**, **per-message translate + per-chat auto-translate**, **safety-keyword guard**, report image, report conversation, block, archive, **admin-hub mailbox mode**.
- **Notifications / Activity:** liked-you feed, like-back, favourite, dismiss, quick filters, (V2: who-viewed-you, reel replies).
- **Signup wizard:** 8 steps, per-step validation, underage & duplicate checks, geolocation prefill, height normalisation, **email verification (4-digit code)**, account creation.
- **My profile:** completion %, checklist, edit, delete-account flow, verification status.
- **Verify me:** selfie-with-username upload → admin review.
- **Admin:** verification queue (approve/reject/retake/needs-resubmission/escalate), moderation (reported images/conversations, resolve + history), support tickets (reply, deliver to messages), overview stats, **member management (suspend/ban-temp/ban-perm/shadow/restore/ip-flag), bulk actions, temp-ban auto-restore, audit log**, mailbox viewer.
- **Cross-cutting:** 4-language i18n (en/th/de/fr) + locale switcher + geo/Accept-Language detection, footer, per-user data scoping, email (verification/welcome/reset), Google Translate proxy.
- **Business rules** (blueprint §13) preserved exactly: password policy, code/token TTLs, photo & swipe limits, completion scoring, safety keywords.

---

## 3. De-Dup Map — what gets unified

| Duplicated today | Unified into |
|---|---|
| 2 header styles copy-pasted across ~8 pages; nav arrays + `isLoggedIn` checks repeated | **One `<SiteHeader>`** (responsive, built-in mobile nav) + `<SiteFooter>` in shared layouts / route-group `layout.tsx` |
| `/admin` **and** `/admin-v2` (overlapping dashboards) | **One consolidated `/admin`** with tabs (verification · moderation · support · members · bans · audit · overview) |
| `messages/page.tsx` re-rendered for `admin/mailbox` | Keep one `<Messages>` driven by props/context (no forked copy) |
| `StoredProfile`/profile shape redefined in my-profile, admin, admin-v2, profiles, create-profile | **One shared `Profile` type** + the Prisma model as source of truth |
| `buildMessagesHref`, `formatRelativeTime`, storage/format helpers copied per file | **Shared `lib/` utilities** |
| `isFrench` ternaries + ad-hoc copy objects per page | **One i18n dictionary** (all 4 languages) via a typed `t()` / `useCopy()` |
| Repeated auth/session reads from `localStorage` | **`useSession()` / server `getCurrentUser()`** everywhere |
| Inline `<img>` everywhere | Shared image component (or `next/image`) |

**Result:** same pages, same features, far less code, one source of truth per concern.

---

## 4. Target architecture (`TMH/`)

```
app/
  (marketing)/  layout(SiteHeader/Footer) + home, landing, about, faq, how-to-use,
                terms, privacy, cookie-policy, safety-and-reporting, advertising, membership, contact
  (auth)/       signup wizard, forgot/reset password  (login is a shared modal)
  (member)/     layout(auth-gated) + profiles, profiles/[id], my-profile, dashboard,
                messages, notifications(activity), verify-me
  (admin)/      layout(admin-gated) + consolidated admin
  api/          auth/*, account/*, contact, translate, admin/*, coins/*, vip/*, reels/*, gifts/* (V2)
components/
  layout/       SiteHeader, SiteFooter, MobileNav, AdminShell, MemberShell
  ui/           Button, Card, Input, Select, Modal, Badge, Avatar, Tabs, Toast … (design-system primitives)
  feature/      ProfileCard, SwipeDeck, Composer, ReelCard, VipRail, WalletWidget …
lib/            types.ts, i18n/, format.ts, api.ts, hooks/ (useSession wrappers, useCopy)
server/         prisma.ts, auth.ts, session.ts, mailer.ts, services/ (profiles, messages, coins, vip, reels, moderation)
prisma/         schema.prisma (ported), seed.ts
proxy.ts        ported guards + CORS + locale
```

Route groups give each area its own shared shell → the header/footer/gating live in exactly one place.

---

## 5. Design system

**Source:** `TMH/ThaiMyHeart V2.dc.html`. It contains two iterations:
- **Turn 1** (red/gold/cream "per blueprint"): design-system foundations, Homepage, Search (3-col), Profile, Messages (3-col), **VIP Centre**, **Dashboard**, Mobile (5-tab bottom nav).
- **Turn 2** (refined: burgundy chrome + gold serif, cinematic photos): Homepage (photo hero, **reels with replies**), Search (photo-first, **match %**, VIP rail), Profile (cinematic hero), **Activity screen (new)**, Mobile v2.

**Plan:** adopt **Turn 2's burgundy/gold direction** as the system, and take **VIP Centre / Messages / Dashboard** layouts from Turn 1 (Turn 2 didn't redo them). First scaffolding task extracts exact **tokens** (colors — burgundy `#3F0C15`/`#5E1622`, gold `#E9C776`/`#D9B368`/`#B6873A`, cream `#F2ECE1`/`#FBF5EC`; fonts — Cormorant Garamond serif + Figtree; radius/spacing/shadows) into a Tailwind theme + `ui/` primitives, so every screen is consistent by construction.
**Open decision:** confirm Turn 2 vs Turn 1 (recommended: Turn 2).

---

## 6. Phase order

- **Phase 0 — Foundation & design system:** scaffold Next 16 + Tailwind v4; port Prisma/MySQL schema, NextAuth, session, `proxy.ts`, seed; extract design tokens → `ui/` primitives; build `SiteHeader`/`SiteFooter`/shells; i18n scaffolding.
- **Phase 1 — Auth & onboarding:** signup wizard (DB-backed) + email verification, login modal, forgot/reset password, account deletion.
- **Phase 2 — Discovery & profiles:** search (filters + compatibility), swipe, profile detail — DB-backed.
- **Phase 3 — Self-service:** my-profile + completion, Dashboard, verify-me.
- **Phase 4 — Messaging & Activity:** DB-backed real conversations (fixes the "no real delivery" glitch), translation, photo rules, report/block/archive; notifications/Activity screen.
- **Phase 5 — Content & i18n:** all marketing/legal pages, full 4-language coverage, footer.
- **Phase 6 — Admin:** consolidated moderation/verification/support/members/bans/audit.
- **Phase 7+ — V2 features:** coin wallet + VIP Centre + orders (mock checkout), gifts, **Heart Reels** (+ reply-to-reel), **match %**, Search 2.0 ranking + dynamic locations + saved searches, engagement (visitors/popular). Remove any voice/video/streaming remnants.

Each phase ends **green** (`npm run build`) and demoable.

---

## 7. Open decisions before scaffolding
1. **Design direction:** Turn 2 (burgundy/gold, recommended) vs Turn 1.
2. **Admin consolidation:** confirm merging `/admin` + `/admin-v2` into one (recommended) vs keeping both.
3. **Messaging:** confirm moving to real DB-backed delivery (recommended) vs keeping the current single-user simulation for now.
4. **TMH as its own git repo?** (recommended: `git init` in `TMH/` so it's a clean, independent project.)
```
