# Sprint 21 Design — Promo Codes / Social Proof / First Deposit Bonus
**Date:** 2026-03-03
**Goal:** Acquisition (promo codes), conversion (social proof FOMO), and first-deposit maximisation

---

## Context

Sprint 20 delivered the notification center, timed free spins, and scratch card. Sprint 21 targets
three acquisition and conversion levers that are missing from the platform:

1. **External acquisition** — promo codes create an influencer/email campaign channel
2. **FOMO & social proof** — live player/spin counts make the lobby feel alive, reducing exit rate
3. **First-deposit maximisation** — the first deposit is the highest-conversion moment; a dedicated
   welcome bonus doubles its value

---

## Feature 1: Promo Code System

**Revenue mechanism:** Promo codes are the standard external acquisition mechanism for online casinos.
An influencer says "use code SPIN50 for 50 free gems" → players sign up, deposit, play.
Admin creates codes; players redeem them once via a simple input in the wallet UI.

**New backend:** `server/routes/promocode.routes.js`

**Schema (new table):**
```sql
CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  reward_gems INTEGER DEFAULT 0,
  reward_credits REAL DEFAULT 0,
  reward_spins INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  uses_count INTEGER DEFAULT 0,
  expires_at TEXT DEFAULT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
)
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_id INTEGER NOT NULL,
  redeemed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, code_id)
)
```

**Seed codes on startup:** Insert 3 default codes if table is empty:
- `WELCOME100` — 100 gems (unlimited uses, no expiry)
- `SPIN25` — 25 gems + $0.50 credits (unlimited uses)
- `BIGWIN` — 200 gems + $1.00 credits (max 1000 uses)

**API:**
- `POST /api/promocode/redeem` — auth; body `{ code }`:
  - Find code (case-insensitive), check active/not expired/uses not maxed
  - Check user hasn't already redeemed this code (`promo_redemptions`)
  - Award gems (UPDATE users SET gems = COALESCE(gems,0) + ? WHERE id = ?`)
  - Award credits (UPDATE users SET balance = balance + ?)
  - Insert into promo_redemptions, increment uses_count
  - Return: `{ success, reward: { gems, credits, spins }, newBalance }`
- `GET /api/promocode/list` — admin only; returns all codes with usage stats
- `POST /api/promocode/create` — admin only; creates new code

**New file:** `js/ui-promocode.js`

**UX:**
1. `openPromoCodeModal()` / `closePromoCodeModal()` on window
2. Simple centered modal: input field + "REDEEM" button
3. Success: green banner with reward breakdown + confetti
4. Error: red banner with message ("Invalid code", "Already redeemed", "Expired")
5. Nav button: `🎟️ Promo` → `openPromoCodeModal()`
6. Also check localStorage for a `?promoCode=XXX` URL param on load and auto-open modal

---

## Feature 2: Social Proof Live Counter

**Revenue mechanism:** "342 players online now" and "12,847 spins today" are powerful FOMO triggers
that reduce lobby exit rate. Even a realistic-looking simulated count creates the feeling of a
thriving community. The backend generates numbers based on time-of-day curves + actual DB stats
blended with a simulated base.

**New backend:** `server/routes/socialproof.routes.js`

**Logic (no new DB table needed):**
- `GET /api/socialproof` — no auth required:
  - Count actual spins in last 24h from `spins` table
  - Count actual registered users
  - "Online now" = `Math.max(realSpinsLastHour * 3 + timeOfDayBase, 50)` where
    `timeOfDayBase` peaks at 200 during 18:00-22:00 UTC and is 30 overnight
  - "Spins today" = `realSpinsToday + simulatedBase` where `simulatedBase` grows through the day
  - Add small random jitter (±5%) so the number changes each poll
  - Return: `{ onlineNow, spinsToday, registeredUsers }`

**New file:** `js/ui-socialproof.js`

**UX:**
1. Inject `#socialProofBar` into the lobby header area (below `.casino-header`, above nav buttons)
   - Compact 32px bar: `🟢 {N} players online · 🎰 {N} spins today · 👥 {N} members`
   - Numbers animate (count up from slightly lower value) on first load
   - Subtle dark background, small text
2. Poll `GET /api/socialproof` every 45 seconds
3. On update, smoothly transition numbers (brief highlight flash on change)
4. Numbers are formatted: 1234 → "1,234"; 12847 → "12,847"
5. Auto-hides when slot modal is open (same pattern as other widgets)
6. No nav button — always visible in lobby

---

## Feature 3: First Deposit Bonus

**Revenue mechanism:** The first deposit is the single highest-leverage moment in a player's lifecycle.
A dedicated "WELCOME BONUS" overlay — distinct from everything else — fires exactly once when a player
makes their first ever deposit. It congratulates them, shows their bonus, and immediately shows the
game grid to reduce friction to first spin.

**New backend:** `server/routes/firstdeposit.routes.js`

**Schema (ALTER TABLE users):**
```sql
ALTER TABLE users ADD COLUMN first_deposit_bonus_claimed INTEGER DEFAULT 0
```

**API:**
- `GET /api/firstdeposit/status` — auth; returns `{ eligible, claimed }`
  - `eligible`: `first_deposit_bonus_claimed = 0` AND user has at least one transaction of type `deposit`
- `POST /api/firstdeposit/claim` — auth:
  - Check eligible (not already claimed + has a deposit)
  - Award: 500 gems + $2.00 credits + mark `first_deposit_bonus_claimed = 1`
  - Return: `{ success, reward: { gems: 500, credits: 2.00 }, newBalance }`

**New file:** `js/ui-firstdeposit.js`

**UX:**
1. Poll `GET /api/firstdeposit/status` 8s after DOMContentLoaded
2. Also hook `window.updateBalance` — re-check 3s after any balance increase
   (catches the moment a deposit is processed)
3. **Welcome overlay:** Full-screen celebration when eligible:
   - Animated confetti burst (CSS keyframes, no canvas dependency)
   - Large "🎉 WELCOME BONUS UNLOCKED!" header in gold
   - "Your first deposit has been matched with exclusive rewards:"
   - Reward pills: `💎 +500 Gems` · `💵 +$2.00 Credits`
   - "CLAIM NOW" button → POST /api/firstdeposit/claim → balance update
   - Auto-dismisses after 60s if unclaimed (but marks shown so it won't re-appear for 24h)
4. Store `localStorage.setItem('fdShown', Date.now())` after showing — snooze 24h to avoid spam
5. No nav button — fires automatically

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Promo Codes) | `server/routes/promocode.routes.js` (new), `js/ui-promocode.js` (new) |
| Agent 2 (Social Proof) | `server/routes/socialproof.routes.js` (new), `js/ui-socialproof.js` (new) |
| Agent 3 (First Deposit) | `server/routes/firstdeposit.routes.js` (new), `js/ui-firstdeposit.js` (new) |
| Integration (me) | `server/index.js` (3 mounts), `index.html` (3 scripts + 1 nav btn for Promo) |

Zero file conflicts. ✅

---

## Success Criteria

- QA regression passes
- `POST /api/promocode/redeem` with `WELCOME100` returns success + gems
- Social proof counter appears in lobby header with live numbers
- First deposit bonus overlay fires when player has deposit and hasn't claimed
- No console.error from new modules
