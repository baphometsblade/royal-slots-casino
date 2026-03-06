# Sprint 15 Design — Direct Monetization Layer
**Date:** 2026-03-02
**Goal:** Surface the existing monetization backend with compelling purchase UIs — zero new backend required

---

## Context

Sprint 14 delivered Achievements, Game of the Day, and Gift System. Sprint 15 exposes three highly-configured backend features that currently have no UI: spin pack bundles, deposit bonus campaigns, and bonus events. All backend routes are already wired inline in `server/index.js`.

---

## Feature 1: Spin Pack Bundle Store

**Revenue mechanism:** Highest direct-revenue feature — converts free players to payers. 5 bundles from $9.99 to $249.99 with bonus credits and wheel spins. "Best Value" badge on Gold drives the sweet-spot purchase.

**Existing backend:**
- `GET /api/bundles` — returns configured bundle array with `{ id, name, price, credits, bonusCredits, totalCredits, bonusPct, bonusWheelSpins, badge, valuePerDollar }`
- `POST /api/bundles/purchase` — body `{ bundleId }` — charges balance, adds credits + wagering requirement

**New file:** `js/ui-bundles.js`

**UX:**
1. Modal: "💎 CREDIT BUNDLES" header, 5 bundle cards in a responsive grid
2. Each card: badge emoji (top-right), bundle name, credit amounts ("15 credits + 7 bonus = **22 total**"), bonus wheel spins (if >0: "🎡 +N Bonus Wheel Spins"), price, value-per-dollar indicator ("X credits / $1")
3. "BEST VALUE" banner on `gold` bundle (gold gradient ribbon, top of card)
4. "BUY NOW" button — posts purchase, on success shows animated coin burst + "✓ Purchased! +22 credits added"
5. Current balance shown at top; bundle becomes checkmark-disabled if user balance < price
6. On purchase: update displayed balance

**Entry point:** Wallet modal "Buy Credits" button + lobby nav "💳 Bundles" button

---

## Feature 2: Active Campaigns / Deposit Bonus UI

**Revenue mechanism:** Deposit match bonuses are the #1 first-purchase conversion tool in the industry. "Deposit $50, get $50 free" converts hesitant free players at 3–5× the baseline rate. Campaigns also include promo code offers.

**Existing backend:**
- `GET /api/campaigns` — auth required; returns active campaigns with `{ id, name, type, bonusPct, maxBonus, wageringMult, minDeposit, endAt, promoCode, userClaimed }`
- Campaign `type` values: `deposit_match`, `reload_bonus`, `promo_code`

**New file:** `js/ui-campaigns.js`

**UX:**
1. Campaign cards shown in a modal: "🎁 BONUS OFFERS"
2. Each campaign card: type badge (Deposit Match / Reload / Promo Code), offer description ("100% match up to $200 on your next deposit"), wagering requirement ("25× wagering"), expiry countdown "Expires in HH:MM:SS", "CLAIM BONUS →" CTA
3. Promo code campaigns: show the code in a copyable pill (like referral)
4. Already-claimed campaigns: show green "✓ Claimed" badge, greyed out
5. Empty state: "Check back soon for new bonus offers!"
6. Auto-refreshes every 60s
7. On lobby load: if unclaimed campaigns exist, show a pulsing "🎁 Bonus Available!" badge on the nav button

**Entry point:** Lobby nav "🎁 Bonuses" button with badge + promos section card

---

## Feature 3: Bonus Events Live Banner

**Revenue mechanism:** Time-limited events (2× XP, double gems, etc.) create urgency — players log in specifically to play during events. "Event ending in 2:14:33" is one of the most effective FOMO triggers.

**Existing backend:**
- `GET /api/events/active` — auth required; returns `[{ id, name, description, eventType, multiplier, targetGames, startAt, endAt, secondsRemaining }]`

**New file:** `js/ui-events.js`

**UX:**
1. If active events: inject a **notification bar** ABOVE the game grid (fixed to the top of `#gameGrid`, above the Game of Day banner)
2. Bar: scrolling marquee or static strip, dark background with animated gradient border, event icons
3. Each event: icon based on `eventType` (`xp_boost`→⚡, `gem_boost`→💎, `win_boost`→🔥, `free_spins`→🎰), name, multiplier badge (`2×`), countdown "Ends in HH:MM:SS"
4. If multiple events: carousel or stacked rows
5. If `targetGames !== 'all'`: show "on [game name]" qualifier
6. Bar disappears when all events expire (countdown hits 0 → re-fetch → if empty, remove bar)
7. Hooks into `renderGames` chain to re-inject after lobby re-renders

**Entry point:** Automatic — activates on lobby load if events exist. Also check on nav when `openCasino` etc. is called. No explicit nav button needed.

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Bundles) | `js/ui-bundles.js` (new only) |
| Agent 2 (Campaigns) | `js/ui-campaigns.js` (new only) |
| Agent 3 (Events) | `js/ui-events.js` (new only) |
| Integration (me) | `index.html` (3 script tags + 2 nav buttons) |

No two agents touch the same file. No backend changes needed. ✅

---

## Success Criteria

- QA regression passes after integration
- Bundle store shows 5 cards with prices and bonus amounts
- Campaigns modal shows current active campaigns (or empty state)
- Events bar appears if active events exist; hides when none
- No console.error output from new modules
