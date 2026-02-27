# Sprint 23: Login Streak + All-Time Win Leaderboard

**Date:** 2026-02-26
**Status:** Approved (user-delegated)

---

## Goal

Two retention features that reward consistency (daily logins) and competition (all-time biggest wins):

1. **Login Day Streak** — track consecutive daily logins, award escalating XP, show 🔥 badge in header
2. **All-Time Win Leaderboard** — server-side top-10 biggest wins by multiplier, new tab in Stats modal

---

## Feature 1: Login Day Streak

### Storage
- Key: `STORAGE_KEY_LOGIN_STREAK = 'matrixLoginStreak'` (add to constants.js)
- Shape: `{ date: 'YYYY-MM-DD', streak: <int>, best: <int> }`

### Logic — `checkLoginStreak()` in `js/ui-modals.js`
Called from DOMContentLoaded (after `currentUser` is set). Skips if no authenticated user
(`!currentUser || currentUser.isGuest`).

| Condition | Action |
|-----------|--------|
| `state.date === today` | No-op (already counted today) |
| `state.date === yesterday` | streak++, update date, award XP, toast if streak ≥ 2 |
| Anything older | streak = 1, update date, award 10 XP |

**XP formula:** `Math.min(streak * 10, 70)` per day. Day 7+ milestone: +100 bonus XP and
fire `addNotification('system', '7-Day Streak! 🔥', 'Bonus 100 XP awarded')`.

### UI
- `<span id="streakBadge" class="streak-badge">🔥 <span id="streakCount">3</span></span>`
- Inserted in `#headerStats` row (after XP badge) — hidden (`display:none`) when streak < 2
- Toast on streak increment: `"Day 3 streak! +30 XP 🔥"`

### Files: `constants.js`, `js/ui-modals.js`, `index.html`, `styles.css`

---

## Feature 2: All-Time Win Leaderboard

### Backend — `GET /api/leaderboard`
No auth required. Top 10 all-time wins by multiplier (≥ 10× only).

```sql
SELECT u.username,
       s.game_id,
       s.win_amount,
       s.bet_amount,
       ROUND(s.win_amount / s.bet_amount, 1) AS mult,
       s.created_at
FROM spins s
JOIN users u ON s.user_id = u.id
WHERE s.bet_amount > 0
  AND s.win_amount >= s.bet_amount * 10
ORDER BY mult DESC
LIMIT 10
```

Username privacy: mask to first 2 chars + `***` server-side before returning.

### UI — new "Leaderboard" tab in Stats modal
- Tab button `[Leaderboard]` added to the stats modal header tab row
- Lazy-loads on first open via `fetch('/api/leaderboard')`
- Shows: rank medal/number + masked name + game name + multiplier + amount
- Empty state: "No big wins recorded yet"

### Files: `server/routes/leaderboard.routes.js` (new), `server/index.js`, `js/ui-modals.js`, `index.html`, `styles.css`

---

## Parallel Agent Map

| Group | Agent | Files (exclusive) |
|-------|-------|-------------------|
| A | 1 | `constants.js` |
| A | 2 | `server/routes/leaderboard.routes.js` (new) |
| B | 3 | `server/index.js` |
| B | 4 | `js/ui-modals.js` |
| C | 5 | `index.html` + `styles.css` |
| D | QA + commit | — |

---

## Success Criteria
- 🔥 badge appears in header after two consecutive login days
- Streak increments daily and resets on missed day
- Day 7 fires notification + 100 bonus XP
- `GET /api/leaderboard` returns masked usernames + win data
- Leaderboard tab visible in Stats modal, loads data from server
- `npm run qa:regression` passes
