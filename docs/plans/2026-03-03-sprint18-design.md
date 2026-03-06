# Sprint 18 Design — Viral Growth & Monetization Depth
**Date:** 2026-03-03
**Goal:** Three features targeting word-of-mouth viral growth, high-roller conversion, and recurring revenue via subscription

---

## Context

Sprints 13–17 have built the full engagement stack. Sprint 18 shifts focus to:
1. **Viral loops** — players bringing in new players (referral incentive upgrade)
2. **High-roller conversion** — VIP Fast-Track offer when player is close to tier boundary
3. **Recurring revenue** — a monthly "Casino Pass" subscription with guaranteed daily rewards

All three are independent files. Features 2 and 3 need backend routes.

---

## Feature 1: Daily Login Streak System

**Revenue mechanism:** Login streaks are the single highest-ROI daily return driver. Players with active streaks show 4× higher 7-day retention. The "streak protection" mechanic (let players buy a shield) adds direct revenue. Zero backend needed beyond what exists.

**New file:** `js/ui-streak.js`

**Logic:**
- Track consecutive login days in `localStorage`:
  - `streak_last_date`: ISO date string of last login (YYYY-MM-DD)
  - `streak_count`: consecutive days
- On load: if `last_date` === today → already tracked. If `last_date` === yesterday → increment streak. If older → reset to 1.
- Day calculation: use UTC date string `new Date().toISOString().slice(0, 10)`

**Streak rewards (escalating):**
```
Day 1:  50 gems
Day 2:  100 gems
Day 3:  200 gems
Day 4:  $1 credits
Day 5:  300 gems
Day 6:  500 gems
Day 7:  $3 credits + 5 wheel spins  ← "WEEKLY BONUS"
Day 14: $5 credits + 10 wheel spins ← "BI-WEEKLY BONUS"
Day 30: $15 credits                 ← "MONTHLY LEGEND"
```
Rewards at day 8–13 cycle back through days 1–6 pattern, with day 7 repeating weekly.

**Backend (simple endpoint):** Add `server/routes/streak.routes.js`
- `POST /api/streak/login` — auth required; records today's login, checks streak state from `users` table (add columns `streak_count INTEGER DEFAULT 0`, `streak_last_date TEXT`); computes reward; credits it; returns `{ streakCount, isNewDay, reward, isWeeklyBonus, newBalance }`
- `GET /api/streak/status` — auth required; returns current streak state without awarding

**New file:** `js/ui-streak.js`

**UX:**
1. On lobby load (after auth), call `POST /api/streak/login`
2. If `isNewDay`: show streak celebration overlay
3. Overlay: "🔥 Day N Streak!" with fire animation, reward reveal, streak calendar showing last 7 days
4. Calendar: 7 day mini-cards with checkmarks for completed days, glowing for today, locked for future
5. Streak milestone progress: "Day N / 7 until Weekly Bonus!"
6. Nav widget: small "🔥 N" streak badge on the Lobby nav area (persistent)
7. If streak broken (reset to 1): compassionate "Your streak reset — start fresh today!" message

**Entry point:** Automatic — fires 2s after auth confirmed. Streak badge always visible in lobby.

---

## Feature 2: High-Roller VIP Fast-Track Offer

**Revenue mechanism:** When a player is within 10% of the next VIP tier, show a targeted "Fast-Track Offer" — a special bundle that is discounted but gets them over the line. Players near a goal convert at 5× baseline. This is pure anchoring + loss-aversion.

**Zero backend needed** — uses existing `/api/bundles` + `window.stats.totalSpins` + VIP tier thresholds.

**New file:** `js/ui-vipfasttrack.js`

**Trigger condition:**
- Use same VIP thresholds as ui-vipprogress.js: Bronze/500/2000/5000/10000 spins
- Trigger when: within 10% of next tier AND hasn't been shown in last 30 minutes (localStorage snooze)
- Check on every spin (hook updateBalance)
- Show maximum once per tier transition

**UX:**
1. Compact modal (not full-screen) slides in from right side — 320px wide
2. Header: "⚡ VIP FAST-TRACK" with gold glow
3. Body: "You're only N spins away from [NextTier] VIP! Unlock [benefit]."
4. Benefit highlight for next tier (hardcoded brief descriptions):
   - Silver: "5% bonus on all wins"
   - Gold: "Priority withdrawals + exclusive games"
   - Platinum: "Personal account manager + 10% rakeback"
   - Diamond: "Maximum rakeback + custom limits + VIP lounge"
5. "How to fast-track: Buy any Credit Bundle to earn spins faster!"
6. Gold bundle card (fetched from `/api/bundles`)
7. "💎 Fast-Track Now" CTA → opens Bundle Store
8. "Continue playing" dismiss link
9. Auto-dismiss after 25s
10. Snooze 30 min after any interaction

**Entry point:** Automatic — hooks updateBalance. No nav button.

---

## Feature 3: Casino Pass Monthly Subscription

**Revenue mechanism:** Subscriptions are the most reliable recurring revenue in gaming. Even a $9.99/month pass with guaranteed daily gems creates a billing anchor. Players who subscribe have 8× higher 90-day retention and consistently deposit more because they feel "committed."

**New backend:** `server/routes/subscription.routes.js`

**Schema (add via ALTER TABLE):**
- Add to users: `subscription_active INTEGER DEFAULT 0`, `subscription_expires TEXT`

**Pass tiers (two options):**
```
Casino Pass Basic  - $9.99/month - 100 gems/day + 5% bonus on all deposits + exclusive badge
Casino Pass Premium - $24.99/month - 300 gems/day + 10% bonus on all deposits + VIP Silver fast-track + exclusive badge
```

**API:**
- `GET /api/subscription/status` — auth required; returns `{ active, tier, expiresAt, dailyGemsClaimed, gemsPerDay, depositBonus }`
- `POST /api/subscription/activate` — auth required; body `{ tier: 'basic'|'premium' }` — charges user balance (`basic: 9.99`, `premium: 24.99`), sets subscription active for 30 days
- `POST /api/subscription/claim-daily` — auth required; credits today's daily gem reward if not yet claimed today

**New file:** `js/ui-subscription.js`

**UX:**
1. Modal: "💳 CASINO PASS" header with shimmering gradient
2. Two tier cards side-by-side (Basic | Premium) with feature lists
3. Premium card: "BEST VALUE" ribbon, glowing border
4. Active subscription: shows green "✓ ACTIVE" badge + expiry date + "Claim Daily Gems" button
5. On lobby load: if subscribed and daily gems unclaimed, show 5s toast "💎 Your daily Casino Pass gems are ready!"
6. Badge on nav "💳 Pass" button showing "NEW" if daily unclaimed

**Entry point:** Lobby nav "💳 Pass" button

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Streak) | `server/routes/streak.routes.js` (new), `js/ui-streak.js` (new) |
| Agent 2 (VIP Fast-Track) | `js/ui-vipfasttrack.js` (new only) |
| Agent 3 (Casino Pass) | `server/routes/subscription.routes.js` (new), `js/ui-subscription.js` (new) |
| Integration (me) | `server/index.js` (2 mount lines), `index.html` (script tags + 2 nav buttons) |

Zero file conflicts. ✅

---

## Success Criteria

- QA regression passes after integration
- Streak endpoint records login and returns streak count
- Streak overlay fires on new day login (manual test)
- VIP fast-track shows when within 10% of tier boundary (manual test with low spin count)
- Subscription status endpoint returns valid JSON
- No console.error from new modules
