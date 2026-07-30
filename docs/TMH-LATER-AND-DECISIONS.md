# Thai My Heart — Later Tasks & Open Decisions

A running backlog of things deliberately deferred, plus decisions for the owner to think about. Not blockers for the **invited soft launch** (coming-soon + admin-added members). Reviewed/updated as we go.

_Last updated: 2026-07-30_

---

## A. Before opening to the GENERAL PUBLIC (public-launch blockers)
_(These are NOT needed for the invited soft launch, but ARE needed before strangers can sign themselves up.)_
1. **Email — Amazon SES.** Verification/reset emails for public signup. Verify the domain in SES (SPF/DKIM DNS), **request production access early (~24h approval)**, drop SMTP creds into `.env`. Without it, public signup can't complete.
2. **Replace stock (Unsplash) images.** Marketing hero/seed images still use `images.unsplash.com`. Swap for owned/real photos before public — no third-party stock faces on a live dating site.
3. **Privacy Policy + Terms** present and accurate (also required for AdSense and app stores later).
4. **Live photo upload confirmed** (R2 end-to-end on the live site). — *in progress*

## B. Monetization / Ads — DECISION TO THINK ABOUT
- **Now:** ad slots show **VIP/coins house-promo banners** (clean, on-brand, drives *your* revenue). — *being added.*
- **Later — decide on third-party ads:**
  - **Google AdSense** — needs approval *after* you're public (live content + privacy policy); dating-policy-sensitive (serious/non-adult only); competes with your own VIP upsells.
  - vs a **dating-friendly ad network**, vs **no third-party ads** (rely on coins/VIP).
  - Common pattern: show ads to **free users only**; hide for VIP.
  - Trade-off: ad income vs cheapening the experience. **Think about whether you even want them.**

## C. Infrastructure / hardening (post-launch)
- **Mail server on InterServer VPS** — migrate iRedMail off the Hostinger box (separate from SES transactional sending).
- **Run the app as a non-root user** on the VPS (currently runs as root).
- **Upload size hardening (R2-1)** — presigned PUT only checks the *declared* size; enforce at R2 (presigned POST + content-length-range, or a post-upload HEAD size check).
- **Backup restore drill** — nightly DB backups are created + verified, but a real *restore* has never been tested. Do one on a scratch DB.
- **CDN cache tuning** for `media.thaimyheart.com` once real traffic arrives.

## D. UX / product polish (low priority)
- **Signed-in Home hero** still says "Join Free Now" (marketing CTA) — adapt for logged-in members (e.g. "Browse matches").
- **Stealth-mode semantics** — reels feed excludes stealth profiles; discovery includes them shown-offline. Confirm which is intended and make consistent.
- **Reel report dedup / rate-limit** — a member can file duplicate reports on one reel.
- **Search ranking** is sorted in-memory over the fetched window — revisit if real pagination is added.
- **Real-device UI pass** — testers eyeball on actual phones + Safari/Chrome/Firefox.

## E. Open OWNER decisions (revisit when ready)
- [ ] **Ads strategy** (see B) — AdSense vs house banners vs none.
- [ ] **GitHub repo visibility** — public vs **private** (recommended private for a commercial platform).
- [ ] **Stealth semantics** (see D).
- [ ] **Moderation policy (S1)** — auto-suspend on a safety trigger vs warn-first. Affects the messaging safety rules + moderation-rule editor.

---
_Add new deferred items here as they come up so they're never lost._
