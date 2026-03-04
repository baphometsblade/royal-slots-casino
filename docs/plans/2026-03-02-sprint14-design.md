# Sprint 14 Design — Retention Loops & Viral Growth
**Date:** 2026-03-02
**Goal:** Lock in long-term player retention with achievements, daily focal points, and social gifting

---

## Context

Sprint 13 delivered: Tournament UI, Live Big Wins Feed, Hot/Cold heatmap. Sprint 14 targets three features that drive *return visits* — the highest-value behavior after a player's first session. Schema for `user_achievements` and `gifts` already exists in the DB.

---

## Feature 1: Achievement Trophy System

**Revenue mechanism:** Achievements give players non-monetary goals, dramatically increasing session length and return rate. Players "near" an achievement spin more to complete it. Unlocking one triggers a reward (gems/credits) which re-engages immediately.

**New backend:** `server/routes/achievements.routes.js` (do NOT touch `server/index.js`)

**DB:** `user_achievements` table already exists: `(user_id, achievement_id, unlocked_at)`

**API design:**
- `GET /api/achievements` — auth required; returns full catalog (hardcoded) with `unlocked: bool, unlockedAt: string|null` merged from DB
- `POST /api/achievements/check` — auth required; computes progress for all locked achievements against DB, unlocks newly earned ones, credits reward to balance, returns `newlyUnlocked[]`

**Achievement catalog (hardcoded in route, 15 achievements):**

| id | name | icon | description | requirement | reward |
|---|---|---|---|---|---|
| first_spin | First Spin | 🎰 | Spin for the first time | spins >= 1 | 50 gems |
| first_win | First Win | 🏆 | Win your first spin | wins >= 1 | 100 gems |
| big_winner | Big Winner | 💰 | Hit a 10× win or higher | max_mult >= 10 | $5 credits |
| high_roller | High Roller | 💎 | Bet $5 or more in a single spin | max_bet >= 5 | 200 gems |
| centurion | Centurion | 💯 | Complete 100 spins | spins >= 100 | $2 credits |
| speed_demon | Speed Demon | ⚡ | Complete 10 spins in one session | (check session) | 50 gems |
| jackpot_chaser | Jackpot Chaser | 🎯 | Hit a 50× win | max_mult >= 50 | $10 credits |
| mega_hit | Mega Hit | 🔥 | Hit a 100× win | max_mult >= 100 | 500 gems |
| globe_trotter | Globe Trotter | 🌍 | Play 10 different games | distinct_games >= 10 | 100 gems |
| explorer | Explorer | 🗺️ | Play 25 different games | distinct_games >= 25 | 300 gems |
| depositor | First Deposit | 💳 | Make your first deposit | deposits >= 1 | $5 credits |
| loyal_player | Loyal Player | ⭐ | Log in 7 days in a row (use spins per day) | days_with_spins >= 7 | $3 credits |
| whale | Whale | 🐋 | Wager $500 total | total_wagered >= 500 | $15 credits |
| legend | Legend | 👑 | Wager $5,000 total | total_wagered >= 5000 | 2000 gems |
| veteran | Veteran | 🎖️ | Complete 1,000 spins | spins >= 1000 | $20 credits |

**New file:** `js/ui-achievements.js`

**UX:**
1. Trophy Room modal — dark background with subtle gold particle effect header
2. Achievement grid (3 columns) — each cell: icon (large), name, description, reward
3. Unlocked: full color, gold border, green checkmark, "Earned [date]" subtitle
4. Locked: grayscale, dashed border, progress bar showing percentage toward goal
5. On modal open: call `POST /api/achievements/check`; if new ones unlocked, show animated "🎉 Achievement Unlocked!" toast before showing modal
6. Newly unlocked cells flash gold for 2 seconds
7. Stats bar at top: "X / 15 unlocked · Y gems earned · $Z credits earned"

**Entry point:** Profile modal "Trophies" tab injection + lobby nav "🏆 Trophies" button ... wait, we already have 🏆 Tourney. Use "🥇 Trophies" instead.

---

## Feature 2: Game of the Day Banner

**Revenue mechanism:** A single daily featured game with a bonus creates urgency and directs play. Players return daily to see what's featured. "2× XP today only!" leverages scarcity. Zero new backend needed.

**Backend:** `GET /api/game-of-day` — already mounted, returns `{ gameId, gameName, secondsUntilNext }`

**New file:** `js/ui-gameofday.js`

**UX:**
1. Inject a banner at the TOP of `#gameGrid` (prepend, not append)
2. Banner: gradient background (gold/amber), game icon or colored badge, "🔥 GAME OF THE DAY", game name in large text, "2× XP TODAY ONLY!", countdown timer "Changes in HH:MM:SS", "PLAY NOW →" button (opens slot)
3. On click "PLAY NOW": calls `openSlot(gameId)` if available
4. Countdown ticks every second
5. Auto-refresh: when countdown hits 0, re-fetch to get tomorrow's game
6. If API unavailable, banner silently skipped
7. Hooks into renderGames chain (same pattern as hot/cold): re-injects banner after every grid re-render

---

## Feature 3: Player Gift System

**Revenue mechanism:** Social gifting creates viral loops — generous players bring back lapsed friends. Gift notifications re-engage churned players. Each gift claim = active session = potential deposit. Industry data: players who receive gifts have 3× higher retention.

**New backend:** `server/routes/gifts.routes.js` (do NOT touch `server/index.js`)

**DB:** `gifts` table already exists: `(from_user_id, to_user_id, amount, message, status, created_at, claimed_at)`

**API design:**
- `GET /api/gifts/inbox` — auth required; returns pending gifts for current user (status='pending')
- `GET /api/gifts/sent` — auth required; returns gifts sent by current user (last 20)
- `POST /api/gifts/send` — auth required; body `{ toUsername, amount, message }` — deducts from sender balance, creates gift record
- `POST /api/gifts/claim/:id` — auth required; verifies recipient is current user, adds amount to balance, marks claimed

**Validation:**
- Min gift: $1, max gift: $500
- Sender must have sufficient balance
- Can't gift yourself
- Recipient must exist (lookup by username)

**New file:** `js/ui-gifts.js`

**UX:**
1. "Send a Gift" modal — two tabs: **Send** | **Inbox**
2. Send tab: username field, amount field (slider + input), message field (optional, max 100 chars), "SEND GIFT 🎁" button; balance check before submit
3. Inbox tab: list of pending gifts with sender (masked: "jo***"), amount, message, "CLAIM $X.XX" button; empty state "No pending gifts"
4. On claim: balance updates immediately, row changes to "✓ Claimed"
5. On modal open: fetch inbox count; if > 0, show badge on nav button
6. Also check inbox on lobby load — if gifts pending, show a golden "🎁 You have X gift(s)!" toast

**Entry point:** Profile modal "Gifts" tab + lobby nav "🎁 Gifts" button with badge

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Achievements) | `server/routes/achievements.routes.js` (new), `js/ui-achievements.js` (new) |
| Agent 2 (Game of Day) | `js/ui-gameofday.js` (new only) |
| Agent 3 (Gifts) | `server/routes/gifts.routes.js` (new), `js/ui-gifts.js` (new) |
| Integration (me) | `server/index.js` (2 mount lines), `index.html` (script tags + nav buttons) |

No two agents touch the same file. ✅

---

## Success Criteria

- QA regression passes after integration
- Achievement modal shows 15 achievements with unlock status
- Newly earned achievements show toast notification
- Game of the Day banner appears in lobby with working countdown + Play Now
- Gift send flow deducts balance; claim flow adds to recipient balance
- No console.error output from new modules
