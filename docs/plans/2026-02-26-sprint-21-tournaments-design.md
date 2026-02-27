# Sprint 21: Tournaments + Jackpot Win Celebration

**Date:** 2026-02-26
**Status:** Approved (user-delegated — "proceed as you see fit")

---

## Goal

Two features:
1. **Jackpot Win Celebration Modal** — the server already emits `jackpotWon: {tier, amount}` in the spin response. The client ignores it. Add a full-screen dramatic celebration modal (3 tier-specific styles: mini/major/mega).
2. **Tournament System** — hourly + daily timed competitions where players compete for the best single-win multiplier. Leaderboard in the lobby. Active-tournament indicator in the slot header.

---

## Feature 1: Jackpot Win Celebration Modal

### Trigger
After each spin, if `spinResult.jackpotWon` is non-null, show the modal.

### Three tiers
| Tier  | Colour palette         | Icon | Prize text         |
|-------|------------------------|------|--------------------|
| mini  | silver / white         | 🥈   | "MINI JACKPOT"     |
| major | gold / amber           | 🏆   | "MAJOR JACKPOT"    |
| mega  | purple / cosmic / glow | 👑   | "MEGA JACKPOT!"    |

### Modal structure (injected into DOM once, reused)
```html
<div id="jackpotWinOverlay" class="jackpot-win-overlay">
  <div class="jackpot-win-modal jackpot-win-modal--{tier}">
    <div class="jackpot-win-burst"></div>
    <div class="jackpot-win-icon">{icon}</div>
    <div class="jackpot-win-tier">{TIER} JACKPOT</div>
    <div class="jackpot-win-amount">+${amount}</div>
    <div class="jackpot-win-sub">Added to your balance!</div>
    <button class="jackpot-win-close" onclick="closeJackpotWinModal()">COLLECT!</button>
  </div>
</div>
```

### JS (js/ui-slot.js)
- `showJackpotWinModal(tier, amount)` — sets tier class, populates amount, adds `active` class, fires particle burst + sound
- `closeJackpotWinModal()` — removes `active`, triggers jackpot ticker refresh
- Called from spin resolution path: `if (spinResult.jackpotWon) showJackpotWinModal(spinResult.jackpotWon.tier, spinResult.jackpotWon.amount);`

### Files: `js/ui-slot.js`, `styles.css` only

---

## Feature 2: Tournament System

### Database — two new tables

**`tournaments`**
```sql
CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,                          -- 'hourly' | 'daily'
    prize_pool REAL DEFAULT 0,
    entry_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'upcoming',              -- 'upcoming' | 'active' | 'completed'
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
)
```

**`tournament_entries`**
```sql
CREATE TABLE IF NOT EXISTS tournament_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    best_mult REAL DEFAULT 0,
    spins INTEGER DEFAULT 0,
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tid ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_uid ON tournament_entries(user_id);
```

### Tournament Service (`server/services/tournament.service.js`)

```js
// Auto-creates tournaments if none active
ensureActive()

// Returns active tournaments (status='active', ends_at > now)
getActive() → [{id, name, type, prize_pool, starts_at, ends_at, entry_count}]

// Returns upcoming tournaments (status='upcoming', starts_at within 24h)
getUpcoming() → same shape

// Join a tournament (creates entry if not already joined)
join(tournamentId, userId) → {ok, alreadyJoined}

// Called from spin route — update entry if new mult is better
submitScore(tournamentId, userId, winMult) → void (fire-and-forget ok)

// Get leaderboard for a tournament
getLeaderboard(tournamentId) → [{rank, username, best_mult, spins}] top 10

// Complete expired tournaments, create new ones
tick() — called every 5 min from server/index.js setInterval
```

**Auto-create logic (ensureActive):**
- Hourly: if no active/upcoming hourly → INSERT a tournament starting now, ending +1h, prize_pool=$50, name="⚡ Hourly Blitz"
- Daily: if no active/upcoming daily → INSERT tournament starting now, ending +24h, prize_pool=$500, name="🏆 Daily Grand"

**Status transitions (tick):**
- upcoming → active when starts_at <= now
- active → completed when ends_at < now
  - On completion: credit top 3 hourly / top 5 daily players with prize share
  - Hourly prizes: $25 / $15 / $10
  - Daily prizes: $200 / $100 / $75 / $75 / $50
  - Then call ensureActive() to create next round

### Routes (`server/routes/tournament.routes.js`)

```
GET  /api/tournaments                    — active + upcoming list (no auth)
GET  /api/tournaments/:id/leaderboard    — top 10 (no auth)
POST /api/tournaments/:id/join           — join (auth required)
```

No score submission endpoint — scores are submitted silently inside the existing spin route.

### Spin route integration (`server/routes/spin.routes.js`)
After win evaluation, fire-and-forget:
```js
const tournamentService = require('../services/tournament.service');
// After spin resolves, find active tournaments and submit score
tournamentService.getActive().then(tournaments => {
    for (const t of tournaments) {
        tournamentService.submitScore(t.id, userId, winMult).catch(() => {});
    }
}).catch(() => {});
```
Where `winMult = bet > 0 ? winAmount / bet : 0`.

### Server wiring (`server/index.js`)
```js
const tournamentRoutes = require('./routes/tournament.routes');
const tournamentService = require('./services/tournament.service');

app.use('/api/tournaments', tournamentRoutes);

// Bootstrap tournaments on startup
tournamentService.ensureActive().catch(console.error);
// Tick every 5 minutes
setInterval(() => tournamentService.tick().catch(console.error), 5 * 60 * 1000);
```

### Frontend — Lobby (`js/ui-lobby.js`)

**Tournament banner** — injected once into lobby above game grid:
```html
<div id="tournamentBanner" class="tournament-banner">
  <div class="tourn-header">
    <span class="tourn-live-dot"></span>
    <span class="tourn-title">{name}</span>
    <span class="tourn-timer" id="tournTimer">23:45:12</span>
  </div>
  <div class="tourn-prizes">🥇 $200  🥈 $100  🥉 $75</div>
  <div class="tourn-leaderboard" id="tournLeaderboard"><!-- rows --></div>
  <button class="tourn-join-btn" id="tournJoinBtn">JOIN FREE</button>
</div>
```

**Functions added to `js/ui-lobby.js`:**
- `initTournamentBanner()` — fetch `/api/tournaments`, inject HTML, start countdown interval
- `refreshTournamentLeaderboard(id)` — fetch `/api/tournaments/:id/leaderboard`, render rows
- `joinTournament(id)` — POST `/api/tournaments/:id/join`, update button state

Banner is injected once (id guard), refreshed every 30s.

### Frontend — Slot header (`js/ui-slot.js`)

When `openSlot()` is called:
- Fetch active tournaments
- If any active → inject small badge `<div id="tournBadge" class="tourn-slot-badge">🏆 Tournament Active — You're competing!</div>` below the slot header
- Removed in `closeSlot()`

After each spin result: if `winMult > 0` and active tournament exists, POST to join + submit is handled server-side silently (no client work needed beyond what spin route already does).

---

## Parallel Agent Map

| Group | Agents (parallel) | Files (exclusive) |
|-------|-------------------|-------------------|
| A | Agent 1 | `server/db/schema-sqlite.js` + `server/db/schema-pg.js` |
| A | Agent 2 | `server/services/tournament.service.js` (new) |
| A | Agent 3 | `server/routes/tournament.routes.js` (new) |
| B | Agent 4 (after A) | `server/index.js` + `server/routes/spin.routes.js` |
| C | Agent 5 (after B) | `js/ui-lobby.js` |
| C | Agent 6 (after B) | `js/ui-slot.js` |
| D | Agent 7 (after C) | `index.html` + `styles.css` |
| E | QA + commit | — |

---

## Success Criteria
- `GET /api/tournaments` returns active hourly + daily tournaments
- Joining works, leaderboard shows top 10 with scores
- Spin route silently submits scores to active tournaments
- Tournament banner visible in lobby with live countdown
- Jackpot win modal appears when `jackpotWon` is in spin response (QA-forced)
- `npm run qa:regression` passes
