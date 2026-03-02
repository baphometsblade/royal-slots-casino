# Sprint 11 Design — Revenue Maximizers
**Date:** 2026-03-02
**Goal:** Maximize casino revenue through 3 high-impact, parallelisable features

---

## Context

Sprint 10 delivered: gems shop, boosts, daily challenges, wager race, and 6 backend stubs (battlepass, cosmetics, megawheel, etc.). All backends are wired in `server/index.js`. Sprint 11 builds the UIs for the 3 highest-revenue-per-line-of-code features.

---

## Feature 1: Battle Pass UI

**Revenue mechanism:** $9.99/month subscription, predictable recurring revenue. Social proof — seeing progress encourages continued daily play.

**Backend endpoints (already wired at `/api/battlepass`):**
- `GET /api/battlepass` — season info + player progress + tier rewards
- `POST /api/battlepass/buy-premium` — $9.99 upgrade, debited from balance
- `POST /api/battlepass/claim/:level` — claim reward at a reached level

**New file:** `js/ui-battlepass.js`
**Modified file:** `js/ui-lobby.js` — compact XP bar widget above game grid

**UX:**
1. Lobby widget: horizontal bar showing season name, current level (e.g. "Level 12 / 50"), XP progress to next level, "View Pass" button
2. Full modal: 50 level scrollable grid — each level shows the free reward and premium reward side by side. Locked premium rows have a gem/lock icon. Levels at or below current level have a "Claim" button if unclaimed.
3. Header: season countdown timer + "UPGRADE — $9.99" button (gold gradient, very prominent)
4. Claimed rewards show a green checkmark

**Entry point:** Lobby widget + nav "PASS" button injection into `.casino-header`

---

## Feature 2: Mega Wheel UI

**Revenue mechanism:** Uses gems (which cost real money). Drives gem pack purchases to spin. FOMO via high jackpot display. One of the highest-engagement casino features.

**Backend endpoints (already wired at `/api/megawheel`):**
- `GET /api/megawheel/config` — segments + tier definitions
- `POST /api/megawheel/spin` — body: `{ tier }` — spends gems, returns `{ segmentIndex, prize }`
- `GET /api/megawheel/history` — last 20 spins

**New file:** `js/ui-megawheel.js`

**UX:**
1. Modal with CSS canvas wheel (SVG or canvas, 9 colored segments)
2. Tier selector: Basic (50💎), Super (200💎), Mega (500💎) — with gem cost + prize multiplier shown
3. Current gem balance shown prominently; "Get Gems" shortcut if balance too low
4. "SPIN" button — disabled while spinning; triggers a 3-second CSS rotation animation landing on the server-selected segment
5. Win reveal: segment highlights + prize toast + balance update
6. History table: last 10 spins below the wheel

**Entry point:** Gems shop "SPIN THE WHEEL" card + lobby nav "WHEEL" button

---

## Feature 3: Referral System

**Revenue mechanism:** Free user acquisition — each referral that deposits = new revenue stream. Industry standard: referrer gets $10 bonus, referee gets 10% extra first deposit.

**New backend:** `server/routes/referral.routes.js` + mount in `server/index.js`

**API design:**
- `GET /api/referral/info` — auth required; returns `{ code, referralUrl, totalReferrals, totalEarned, pendingEarned }`
- `POST /api/referral/register` — no auth; body `{ referralCode }` — called on registration flow
- `GET /api/referral/stats` — auth required; referral history list

**DB schema (`referrals` table):**
```sql
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referee_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending|completed
  bonus_paid REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**New file:** `js/ui-referral.js`

**UX:**
1. "Refer a Friend" section in the profile modal (new tab)
2. Unique referral link: `http://localhost:3000?ref=<code>`
3. One-click copy button
4. Stats: "X friends referred | $Y earned"
5. Referral list: username masked (e.g. "jo***@gmail") + status badge
6. On register, `?ref=` param is captured from URL and sent with registration request

**Entry point:** Profile modal "Referrals" tab + lobby "REFER & EARN" card in promos section

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Battle Pass) | `js/ui-battlepass.js` (new), `js/ui-lobby.js` (widget append) |
| Agent 2 (Mega Wheel) | `js/ui-megawheel.js` (new only) |
| Agent 3 (Referral) | `server/routes/referral.routes.js` (new), `server/index.js` (mount line), `js/ui-referral.js` (new) |
| Integration (me) | `index.html` (3 script tags), `index.html` (entry points) |

No two agents touch the same file. ✅

---

## Success Criteria

- QA regression passes after integration
- Battle Pass modal opens and shows 50 tiers cleanly
- Mega Wheel spins and lands correctly per server response
- Referral link copies to clipboard; ?ref= param captured on register
- No console.error output from new modules
