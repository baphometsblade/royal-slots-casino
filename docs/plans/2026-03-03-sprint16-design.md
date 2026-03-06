# Sprint 16 Design — Retention Anchors & Social Proof
**Date:** 2026-03-03
**Goal:** Maximise player lifetime value through cashback retention, deposit conversion at the churn moment, and social competition

---

## Context

Sprint 15 delivered Bundle Store, Campaigns modal, and Events Bar. Sprint 16 adds three features targeting the highest-LTV moments: player runs out of money (deposit nudge), weekly loyalty loop (rakeback), and social FOMO (leaderboard). All three are fully independent — zero file overlap.

---

## Feature 1: Low-Balance Deposit Nudge

**Revenue mechanism:** The moment a player's balance drops below ~$10 is statistically the #1 conversion opportunity in a casino. Players who receive a targeted offer at this moment convert at 4–8× baseline. Zero backend required.

**New file:** `js/ui-lowbalance.js`

**Implementation:**
- Monkey-patch the global `updateBalance` function (or hook `window.balance`) to detect drops
- Threshold: `balance < 10` (after any spin resolves)
- Debounce: show at most once per 5 minutes (`localStorage` timestamp guard)
- Don't show if Bundle Store or Wallet modal is already open

**UX:**
1. Compact overlay (not full-screen) slides up from bottom — 340px wide, centered
2. Animated gold coin icon + pulsing border
3. Header: "💸 Running Low?" / subhead: "Top up now and keep the streak alive!"
4. Dynamically fetches `/api/bundles` → shows the "gold" (best-value) bundle card: credits, bonus, price
5. Fetches `/api/campaigns` (if token) → if active deposit match, shows bonus badge: "Deposit $X, get $X free!"
6. Two CTAs: **"💎 Buy Credits"** (opens Bundle Store, closes nudge) + smaller "Not now" dismiss link
7. Auto-dismiss after 15 s if no interaction
8. After dismiss: snooze for 5 min, re-check on next balance update

**Entry point:** Automatic — hooks into `updateBalance` on script load. No nav button.

---

## Feature 2: Weekly Rakeback / Cashback Program

**Revenue mechanism:** Rakeback is the #1 long-term retention tool after VIP. Players who know they earn 1% back on losses return even after bad sessions because they feel compensated. Industry data: rakeback players have 2.5× higher 30-day retention. The pending amount creates a reason to come back each week.

**Existing backend:** `spin_history` table already tracks all wagers.

**New backend:** `server/routes/rakeback.routes.js`

**Schema:** No new table needed — rakeback is computed from `spin_history`:
- `GET /api/rakeback/status` — auth required; computes this week's (Mon–Sun UTC) total wagered + net loss from `spin_history`; returns `{ weeklyWagered, weeklyLost, pendingRakeback (1% of loss), nextPayoutAt, lastPayout }`
- `POST /api/rakeback/claim` — auth required; credits `pendingRakeback` to balance, records in `transactions` table, returns `{ credited, newBalance }`. Guard: only claimable if ≥$0.01 pending and last claim was >7 days ago (or Sunday midnight rule).

**Rakeback rate:** 1% of net losses (max $50/week)

**New file:** `js/ui-rakeback.js`

**UX:**
1. Modal: "💰 WEEKLY RAKEBACK" header
2. Stats card: "This week" — Wagered $X · Net loss $Y · **Pending rakeback: $Z**
3. Countdown: "Pays out in HH:MM:SS" (time to next Sunday midnight UTC)
4. If claimable: green "CLAIM $Z CASHBACK" button; on success → balance updates + confetti
5. History table: last 4 payouts (date, wagered, rakeback received)
6. Empty state if no wagers this week: "Play this week to earn rakeback!"
7. On lobby load: if pending rakeback ≥ $0.50, show "💰 N" badge on nav button + subtle toast

**Entry point:** Lobby nav "💰 Rakeback" button with badge

---

## Feature 3: Global Leaderboard

**Revenue mechanism:** Social proof + FOMO is one of the strongest engagement drivers. Seeing that "jo*** won $4,500 on Dragon Fortune (180×)" creates immediate pressure to play. The weekly wagering leaderboard directly incentivises high-volume play. Rich List creates aspirational goals.

**New backend:** `server/routes/leaderboard.routes.js`

**API:**
- `GET /api/leaderboard/bigwins` — top 20 all-time biggest wins by multiplier from `spin_history` where `multiplier > 0`; returns `[{ rank, maskedUser, gameName, multiplier, winAmount, date }]`
- `GET /api/leaderboard/weekly` — top 20 weekly wagerers (Mon–Sun UTC) from `spin_history`; returns `[{ rank, maskedUser, totalWagered, spinCount }]`
- `GET /api/leaderboard/richlist` — top 20 current balances from `users`; returns `[{ rank, maskedUser, balance, vipTier }]`
- All endpoints: no auth required (public leaderboards). Usernames masked server-side: first 2 chars + `***` + last char.

**New file:** `js/ui-leaderboard.js`

**UX:**
1. Modal: "🏆 LEADERBOARD" header, 3 tabs: **🔥 Big Wins** | **📊 This Week** | **💰 Rich List**
2. Each tab: ranked table with medal icons (🥇🥈🥉 for top 3), player handle, key metric, secondary info
3. Big Wins tab: columns → Rank · Player · Game · Multiplier · Amount Won
4. Weekly tab: columns → Rank · Player · Wagered · Spins
5. Rich List tab: columns → Rank · Player · Balance · VIP Badge
6. Current player's row highlighted gold (if in top 20)
7. Auto-refreshes every 60 s
8. Entry point: "🏆 Leaderboard" nav button (reuse 🏆 is taken by Tourney — use "📊 Ranks" instead)

**Entry point:** Lobby nav "📊 Ranks" button

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Low-Balance Nudge) | `js/ui-lowbalance.js` (new only) |
| Agent 2 (Rakeback) | `server/routes/rakeback.routes.js` (new), `js/ui-rakeback.js` (new) |
| Agent 3 (Leaderboard) | `server/routes/leaderboard.routes.js` (new), `js/ui-leaderboard.js` (new) |
| Integration (me) | `server/index.js` (2 mount lines), `index.html` (script tags + nav buttons) |

No two agents touch the same file. ✅

---

## Success Criteria

- QA regression passes after integration
- Low-balance nudge fires when test balance drops below $10 (manual test)
- Rakeback status endpoint returns correct weekly computation
- Rakeback claim credits balance
- All three leaderboard tabs render (may show empty if no data)
- "📊 Ranks" + "💰 Rakeback" nav buttons visible
- No console.error output from new modules

