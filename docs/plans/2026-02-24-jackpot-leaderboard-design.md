# Progressive Jackpot + Leaderboard — Design Doc
_Date: 2026-02-24_

## Overview
Two complementary features: (1) convert the cosmetic jackpot ticker into a real server-backed 3-tier progressive jackpot; (2) add a public live leaderboard showing top winners.

---

## 1. Progressive Jackpot

### Database — `jackpot_pool` table
| Column | SQLite | PostgreSQL | Notes |
|---|---|---|---|
| `tier` | TEXT PRIMARY KEY | TEXT PRIMARY KEY | 'mini' / 'major' / 'mega' |
| `current_amount` | REAL | NUMERIC(15,2) | Grows with each bet |
| `seed_amount` | REAL | NUMERIC(15,2) | Reset value after payout |
| `contribution_rate` | REAL | REAL | Fraction of bet added per spin |
| `total_contributed` | REAL DEFAULT 0 | NUMERIC(15,2) DEFAULT 0 | Audit trail |
| `total_paid_out` | REAL DEFAULT 0 | NUMERIC(15,2) DEFAULT 0 | Audit trail |
| `last_won_at` | TEXT | TIMESTAMPTZ | Nullable |
| `last_winner_id` | INTEGER | INTEGER | Nullable FK to users |

**Seed data** (inserted lazily by service via INSERT OR IGNORE):
- mini: $500 seed, 0.2% per bet
- major: $2,500 seed, 0.3% per bet
- mega: $10,000 seed, 0.5% per bet
- Total: 1% of every real bet flows to jackpots

### Win Probabilities
Per spin (base on jackpot-tagged games, 10× lower on others; scales linearly with bet/minBet, max 3×):
- Mini: 0.5% base → ~1 in 200 jackpot-game spins
- Major: 0.05% base → ~1 in 2,000
- Mega: 0.005% base → ~1 in 20,000

### Service (`server/services/jackpot.service.js`)
```
ensureSeeded()          — INSERT OR IGNORE seed rows
contribute(bet)         — UPDATE current_amount += bet * rate (all 3 tiers)
checkAndAward(userId, bet, isJackpotGame) → {tier, amount} | null
getAmounts()            → {mini, major, mega}
getHistory()            → last 10 wins [{tier, amount, username, won_at}]
```

### API Routes (`server/routes/jackpot.routes.js`)
- `GET /api/jackpot` → `{mini, major, mega}` — no auth, public
- `GET /api/jackpot/history` → last 10 wins — no auth, public

### Spin Integration (`server/routes/spin.routes.js`)
After win capping and before response:
1. `await jackpotService.contribute(bet)` (real bets only, not free spins)
2. `const jackpotWin = await jackpotService.checkAndAward(userId, bet, isJackpotGame)`
3. If won: credit jackpot amount to user balance; add `jackpotWon: {tier, amount}` to response

### Frontend Changes
- Replace random `startJackpotTicker()` with polling `GET /api/jackpot` every 10s
- Expand ticker bar HTML to show all 3 tiers side by side
- If spin response has `jackpotWon`, show dramatic jackpot win modal

---

## 2. Leaderboard

### API Route (`server/routes/leaderboard.routes.js`)
`GET /api/leaderboard?period=today|week|all&category=net|single`
- `net`: top earners by (SUM(win_amount) - SUM(bet_amount))
- `single`: biggest single win (MAX(win_amount))
- Returns `{players: [{rank, username, amount, spins}], period, category}`
- No auth required — public leaderboard

### SQL (SQLite-style; adapter handles PG conversion)
```sql
-- net category, today period
SELECT u.username,
       SUM(s.win_amount - s.bet_amount) AS net_win,
       COUNT(*) AS spins,
       MAX(s.win_amount) AS best_single
FROM spins s
JOIN users u ON s.user_id = u.id
WHERE s.created_at >= datetime('now', '-1 day')
GROUP BY s.user_id, u.username
HAVING SUM(s.win_amount - s.bet_amount) > 0
ORDER BY SUM(s.win_amount - s.bet_amount) DESC
LIMIT 10
```

### Frontend
New collapsible section in lobby between filter tabs and game grid:
- 2 category toggles: Net Wins / Biggest Single
- 3 period tabs: Today / This Week / All Time
- Top 10 list with medal icons (🥇🥈🥉) for top 3

---

## File Ownership Map (parallel agents)

| Agent | Files (exclusive) |
|---|---|
| 1 — Jackpot backend | schema-sqlite.js, schema-pg.js, jackpot.service.js (new), jackpot.routes.js (new) |
| 2 — Leaderboard backend | leaderboard.routes.js (new) |
| 3 — Spin integration | spin.routes.js |
| 4 — Route registration | server/index.js |
| 5 — Frontend | index.html, js/ui-lobby.js |
