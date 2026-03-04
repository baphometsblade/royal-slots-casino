# Sprint 17 Design — Engagement Maximizers: Mystery Drop / Session Summary / VIP Progress
**Date:** 2026-03-03
**Goal:** Three features leveraging psychology's strongest engagement levers — unpredictable reward, loss aversion at churn, and goal completion pressure

---

## Context

Sprints 13–16 built the full monetization surface. Sprint 17 targets the three highest-impact *behavioral* levers not yet implemented:
1. Variable-ratio reinforcement (mystery drops) — the strongest engagement mechanism in psychology
2. Loss-aversion closure (session summary at slot exit) — highest post-session conversion moment
3. Goal-proximity effect (VIP progress bar) — increases spend dramatically when players see they are "close"

All three are fully independent files. Zero backend needed for Features 2 and 3.

---

## Feature 1: Mystery Drop Reward System

**Revenue mechanism:** Variable-ratio reinforcement (random reward intervals) produces the highest and most persistent engagement of any reward schedule. Players will spin "just a few more" because the drop could come any moment. Each drop also re-engages the gem/credit ecosystem.

**New backend:** `server/routes/mystery.routes.js`

**Backend:**
- Add column at startup: `db.run("ALTER TABLE users ADD COLUMN mystery_next_drop INTEGER DEFAULT 0").catch(function(){})`
- `GET /api/mystery/status` — auth required; counts total spins for user from `spins` table; if `mystery_next_drop` is 0, initialise to `total_spins + random(50,250)` and save; returns `{ pending: bool, spinsUntilDrop: N, totalSpins: N }`
- `POST /api/mystery/claim` — auth required; verifies `total_spins >= mystery_next_drop`; picks random reward from pool:
  - gems: 50–500 (add to users.gems if column exists, else record in transactions)
  - credits: $1–$10 (add to balance)
  - wheel_spins: 3–10 (add to users.bonus_wheel_spins if column exists)
  - promo: insert a short-lived promo code into campaigns table
  - Sets new `mystery_next_drop = total_spins + random(50,250)`
  - Returns `{ reward: { type, amount }, newBalance }`

**New file:** `js/ui-mystery-drop.js`

**UX:**
1. Poll `GET /api/mystery/status` 5s after DOMContentLoaded (if token present), then every 15 spins via updateBalance hook
2. When `pending: true`: trigger drop overlay
3. Drop overlay: full-screen dark flash + animated treasure chest 🎁 + sparkle animation + reward reveal pill
4. "CLAIM IT!" button → POST /api/mystery/claim → confetti burst + balance update
5. When within 20 spins: pulsing badge on nav + subtle "Drop incoming..." toast
6. Auto-dismiss overlay after 30s if unclaimed

**Entry point:** Automatic. No nav button.

---

## Feature 2: Session Summary + Upsell Modal

**Revenue mechanism:** When a player closes a slot, they experience peak loss-aversion. Showing "You came $12 short of even — one more deposit could flip it" drives immediate re-deposits. This is the #1 post-session conversion moment.

**Zero backend needed.**

**New file:** `js/ui-session-summary.js`

**Session tracking:**
Wrap `window.openSlot` to snapshot `window.stats` at session start. Wrap `window.closeSlot` to diff stats at end. Track: `_sessionSpins`, `_sessionWagered`, `_sessionWon`, `_sessionBestMult`, `_sessionGameId`.

Use `window.stats.totalSpins` etc. (already globally maintained) — snapshot on `openSlot`, diff on `closeSlot`.

**UX:**
1. Slides up from bottom after slot closes (≥3 spins threshold)
2. Header: "📊 Session Recap" + game name
3. Stats: spins · wagered · won · best multiplier
4. Large net result: "+$X.XX" (green) or "-$X.XX" (amber/red)
5. If net loss: fetch `/api/bundles` → show gold bundle card + "Top Up & Try Again" CTA
6. If net win: "Great run! Keep it going?" → Play Again + Lobby buttons
7. "Play Again" = calls `openSlot(_sessionGameId)` if defined
8. Auto-dismiss 20s

**Entry point:** Automatic hook on `closeSlot`.

---

## Feature 3: VIP Progress Display Widget

**Revenue mechanism:** The goal gradient effect — people spend 30-50% more when they can see they are close to a goal. A visible VIP progress bar creates constant motivational pressure.

**Zero backend needed** — uses `window.stats.totalSpins` (already global) with hardcoded tier thresholds.

**New file:** `js/ui-vipprogress.js`

**VIP tiers (hardcoded):**
```
Bronze:   0 spins
Silver:   500 spins
Gold:     2000 spins
Platinum: 5000 spins
Diamond:  10000 spins
```

**Widget:**
Compact bar injected BELOW `.casino-header` and ABOVE `#gameGrid` (prepended to `#gameGrid`'s parent, or inserted via `insertBefore`).

```
[🥉 Bronze VIP] [████████░░░░ 67%] [1,340 / 2,000 spins → Gold] [View Benefits →]
```

Styling: 48px tall, dark background, subtle gold border-bottom, only visible in lobby (hidden when slot modal is open).

When within 15% of next tier: pulsing gold border + "Almost there!" label.

Updates every time `updateBalance` fires (which happens after every spin).

Clicking "View Benefits" calls `openVipModal()` if defined.

Hooks into `renderGames` chain to re-inject after lobby re-renders.

**Entry point:** Automatic — injects on lobby load.

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Mystery Drop) | `server/routes/mystery.routes.js` (new), `js/ui-mystery-drop.js` (new) |
| Agent 2 (Session Summary) | `js/ui-session-summary.js` (new only) |
| Agent 3 (VIP Progress) | `js/ui-vipprogress.js` (new only) |
| Integration (me) | `server/index.js` (1 mount line), `index.html` (3 script tags, no new nav buttons) |

No two agents touch the same file. Zero conflicts. ✅

---

## Success Criteria

- QA regression passes after integration
- Mystery drop status endpoint returns valid JSON for auth'd user
- Mystery drop claim endpoint credits a reward
- Session summary fires after closing a slot with ≥3 spins (manual test)
- VIP progress bar visible in lobby showing tier and progress
- No console.error output from new modules
