# Sprint 20 Design — Notification Inbox / Free Spins / Scratch Card
**Date:** 2026-03-03
**Goal:** Three features targeting discoverability, re-engagement, and session-start excitement

---

## Context

Sprint 19 delivered urgency (lucky hours), milestone chasing, and loss recovery.
Sprint 20 fills three remaining high-value gaps:
1. **Cross-feature discoverability** — a notification center makes every existing feature visible
2. **Re-engagement after absence** — timed free spins bring dormant players back
3. **Interactive session opener** — scratch card creates ritual excitement before first spin

---

## Feature 1: Notification Center / Inbox

**Revenue mechanism:** Most players miss bonuses, milestones, and offers because they don't open the right modal.
A notification bell with a red unread count badge drives engagement with all other monetization features.
"You have 3 notifications" → player clicks → sees uncollected rakeback, milestone reward, and active lucky hour.
This is a **multiplier feature** — it amplifies the ROI of every other Sprint 16–19 feature.

**New backend:** `server/routes/notifications.routes.js`

**Schema (new table, create via CREATE TABLE IF NOT EXISTS):**
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_action TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)
```

**API:**
- `GET /api/notifications` — auth; returns `{ notifications: [...], unreadCount }`
  - Only returns last 20, ordered by created_at DESC
- `POST /api/notifications/read/:id` — auth; marks one notification as read
- `POST /api/notifications/read-all` — auth; marks all as read
- `POST /api/notifications/system` — **no auth, IP-restricted (127.0.0.1 only)**:
  creates a notification for a user. Used internally by other routes to push notifications.
  Body: `{ userId, type, title, body, linkAction }`

**New file:** `js/ui-notifications.js`

**UX:**
1. Bell icon `🔔` injected into the `.casino-nav` area (right side), with `#notifBadge` red circle showing count
2. Click bell → opens `#notifPanel` slide-down from top-right (fixed, z-index 20000)
3. Panel shows list of notifications with icon, title, body, timestamp
4. Each notification has a "→" action button that calls the `linkAction` function (e.g., `openRakebackModal`)
5. "Mark all read" button clears badge
6. Poll `GET /api/notifications` every 30s; update badge count
7. On first load, 3s delay before first poll
8. Notifications are categorized with icons: 💰 money/rakeback, 🎯 milestone, 🌟 lucky hours, 🎁 bonus, 🏆 achievement
9. Inject bell into header nav area next to existing buttons

**Entry point:** Auto — fires 3s after DOMContentLoaded. Bell always visible.

---

## Feature 2: Timed Free Spins

**Revenue mechanism:** Free spins feel like "real value" to players even when the RTP means they're
promotional. A "5 free spins valid for 24 hours" offer creates urgency to return and play.
This feature auto-grants free spins to players who haven't logged in for 7+ days ("welcome back" trigger)
and also provides an admin endpoint to manually grant them for promotions.

**New backend:** `server/routes/freespins.routes.js`

**Schema (ALTER TABLE users):**
```sql
ALTER TABLE users ADD COLUMN free_spins_count INTEGER DEFAULT 0
ALTER TABLE users ADD COLUMN free_spins_expires TEXT DEFAULT NULL
```

**API:**
- `GET /api/freespins/status` — auth; returns `{ count, expiresAt, expired }`
  - If `expiresAt` is past, return `{ count: 0, expired: true }` and reset count to 0
- `POST /api/freespins/use` — auth; decrements free_spins_count by 1; returns `{ remaining, newBalance }`
  - Free spins are $0 bet spins: server credits $0.25 to balance as the "free spin value"
  - Only works if count > 0 and not expired
- `POST /api/freespins/grant` — **requires admin token**; grants N free spins to userId
  - Body: `{ userId, count, hoursValid }` — default 24 hours
- Auto-grant on login: the GET /status endpoint checks `last_login` vs now; if > 7 days since last
  activity (check last spin date), auto-grant 3 free spins valid 24h (first time only per week)

**New file:** `js/ui-freespins.js`

**UX:**
1. Poll `GET /api/freespins/status` 5s after DOMContentLoaded
2. **When free spins available:** inject `#freeSpinsWidget` banner above game grid:
   - `🎰 You have N Free Spins! · Expires in HH:MM:SS · [USE NOW →]`
   - Amber color scheme, pulsing when < 1 hour remaining
   - Click "USE NOW" → calls `openSlot(lastPlayedGame || firstGame)` to open a game
3. **When used in-slot:** hook `window.updateBalance` — if `_freeSpinsActive` and current spin was free,
   show `🎰 FREE SPIN #N` overlay briefly on the reel area
4. Widget auto-hides when slot is open
5. Auto-refresh count every 60s
6. On expiry: widget pulses red then fades out

**Entry point:** Auto — fires 5s after DOMContentLoaded.

---

## Feature 3: Daily Scratch Card

**Revenue mechanism:** Scratch cards are one of the most engaging daily-reward formats in mobile gaming.
The reveal mechanic (scrubbing to expose prizes) creates tactile satisfaction that a button click cannot match.
One card per day resets at midnight UTC. The reveal process takes ~5 seconds → players are engaged in the app
longer each day, increasing cross-sell opportunities.

**New backend:** `server/routes/scratchcard.routes.js`

**Schema (ALTER TABLE users):**
```sql
ALTER TABLE users ADD COLUMN scratch_last_date TEXT DEFAULT NULL
ALTER TABLE users ADD COLUMN scratch_result TEXT DEFAULT NULL
```

**API:**
- `GET /api/scratchcard/today` — auth; returns `{ available, alreadyScratched, result: null|{...} }`
  - `available`: today UTC !== `scratch_last_date`
  - `alreadyScratched`: today UTC === `scratch_last_date`
  - `result`: null if not scratched, or `{ tiles: [{symbol,value}x9], prize: {type,amount} }` if already done
- `POST /api/scratchcard/scratch` — auth; only if not already scratched today:
  - Generate 9 tiles (3×3 grid): random symbols from `['💎','⭐','🍀','🔔','7️⃣','💰']`
  - Prize logic: if 3+ matching symbols in any row/col/diagonal → big prize; 2 matching → small prize; else consolation
  - Prizes: 3-match → 50–200 gems; 2-match → 10–25 gems; consolation → 5 gems + $0.10 credits
  - Store result in `scratch_result` (JSON), update `scratch_last_date = today UTC`
  - Credit rewards immediately
  - Return: `{ tiles, prize, newBalance }`

**New file:** `js/ui-scratchcard.js`

**UX:**
1. Poll `GET /api/scratchcard/today` 7s after DOMContentLoaded
2. If available: show `#scratchBell` notification dot on a nav entry, or auto-open after 10s if balance hasn't changed (player is idle in lobby)
3. **Scratch Card Modal:**
   - Full overlay, dark bg
   - Header: "🎴 DAILY SCRATCH CARD"
   - 3×3 grid of scratch tiles — each starts as a gray "foil" layer
   - Click (or mousedown/touchstart) on each tile to "scratch" it — CSS: foil `opacity` drops, symbol fades in
   - After all 9 tiles revealed (or "Reveal All" button): show prize banner
   - Prize banner: prize type + amount + confetti burst
   - "Collect" button → PATCH/POST to `/api/scratchcard/scratch`, updates balance
   - Actually: POST happens on "Reveal All" or after 7th tile scratch, to prevent reload abuse
4. Nav button: `🎴 Scratch` → `openScratchCardModal()`
5. Tomorrow countdown shown when already scratched: "Next card in HH:MM:SS"

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Notifications) | `server/routes/notifications.routes.js` (new), `js/ui-notifications.js` (new) |
| Agent 2 (Free Spins) | `server/routes/freespins.routes.js` (new), `js/ui-freespins.js` (new) |
| Agent 3 (Scratch Card) | `server/routes/scratchcard.routes.js` (new), `js/ui-scratchcard.js` (new) |
| Integration (me) | `server/index.js` (3 mount lines), `index.html` (3 script tags + 1 nav button for Scratch) |

Zero file conflicts. ✅

---

## Success Criteria

- QA regression passes after integration
- Notification bell shows in nav, badge shows unread count from API
- Free spins widget appears when spins available
- Scratch card modal opens with 3×3 grid, tiles reveal on click
- All APIs return valid JSON
- No console.error from new modules
