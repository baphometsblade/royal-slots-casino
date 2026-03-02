# Sprint 13 Design — Engagement & FOMO Maximizers
**Date:** 2026-03-02
**Goal:** Maximize time-on-site and spin volume through 3 high-impact, parallelisable features

---

## Context

Sprint 12 delivered: Cosmetics Shop, VIP Game Rentals, locked-game overlays, progressive Jackpot Tracker. All wired. Sprint 13 targets the three highest-ROI engagement loops not yet surfaced in the UI.

---

## Feature 1: Tournament UI

**Revenue mechanism:** Players spin more to climb leaderboards and beat opponents. Competitive pressure is one of the strongest engagement drivers in gaming. Backend is fully wired (`/api/tournaments`).

**Backend endpoints (already wired at `/api/tournaments`):**
- `GET /api/tournaments` — active + upcoming list
- `GET /api/tournaments/:id/leaderboard` — ranked entries
- `POST /api/tournaments/:id/join` — enter tournament

**New file:** `js/ui-tournament.js`

**UX:**
1. Modal with two tabs: **Active** | **Upcoming**
2. Each tournament card: name, type badge (Hourly / Daily), prize pool (gold), time remaining countdown, entry count, "JOIN" button (or "PLAYING" if already joined)
3. Prize breakdown accordion: 1st / 2nd / 3rd prizes shown
4. Live leaderboard inside each tournament card (top 5 rows): rank, masked username, score (best win multiplier), VIP tier badge
5. Auto-refresh every 15s
6. "Your Rank" row highlighted in gold if player is in this tournament

**Entry point:** Lobby nav "🏆 Tourney" button injection into `.casino-header`

---

## Feature 2: Live Big Wins Social Feed

**Revenue mechanism:** Pure FOMO — seeing real wins drives others to deposit and spin. Industry-proven: live social proof feeds are directly correlated with increased spend. Zero cost to user = maximum click-to-spin funnel.

**Backend endpoints (already wired at `/api/feed`):**
- `GET /api/feed` — last 20 big wins (≥15x multiplier), usernames masked

**New file:** `js/ui-feed.js`

**UX:**
1. Slide-in panel from the right (not a full modal — stays visible while browsing)
2. Feed title: "🎉 LIVE BIG WINS" with a pulsing green dot
3. Each row: avatar circle (colour-coded by provider), `jo*** won $234.50 on Dragon's Fortune` + multiplier badge (e.g. `15.6×`) + "▶ Play" button
4. Rows animate in (slide from right) for newest entries
5. Auto-poll every 15 seconds; new entries prepend with a flash animation
6. Feed panel toggles open/closed; when closed, a small "🎉 N" badge on the nav button shows count of new wins since last opened
7. "Play Now" button on each row calls `openSlot(gameId)` if available

**Entry point:** Lobby nav "🎉 Feed" button + win ticker already in lobby (the feed reuses `/api/feed`)

---

## Feature 3: Hot/Cold Game Heatmap

**Revenue mechanism:** Data-driven game discovery — players gravitate toward "hot" games, which increases spin volume on featured games. The 🔥/❄️ badges make the game grid feel alive and dynamic, improving session length.

**Backend endpoints (already wired at `/api/game-stats`):**
- `GET /api/game-stats` — per-game RTP data (games with ≥20 spins): `{ gameId, totalSpins, actualRtp }`

**New file:** `js/ui-hotcold.js`

**UX:**
1. On lobby load (and every 5 minutes), fetch `/api/game-stats`
2. Build a `Map<gameId, actualRtp>` — games with `actualRtp > 92%` = HOT, `< 84%` = COLD
3. Inject `.hot-badge` (🔥 flame, orange glow) or `.cold-badge` (❄️ snowflake, blue glow) onto game card elements in the lobby grid
4. A lobby filter pill "🔥 Hot Games" / "❄️ Cold Games" toggles to show only hot or cold games (appended to existing filter row)
5. Tooltip on badge: "Paying out hot right now!" / "Due for a comeback!"
6. Badges persist across re-renders by hooking into renderGames chain (same pattern as rental lock overlay)
7. If no stats yet (new install), badges are silently skipped — no errors

**Entry point:** Automatic — activates on lobby load. Filter pills appended to `.game-filter-pills` container.

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Tournament) | `js/ui-tournament.js` (new only) |
| Agent 2 (Feed) | `js/ui-feed.js` (new only) |
| Agent 3 (Hot/Cold) | `js/ui-hotcold.js` (new only) |
| Integration (me) | `index.html` (3 script tags + 2 nav buttons) |

No two agents touch the same file. ✅

---

## Success Criteria

- QA regression passes after integration
- Tournament modal shows active/upcoming with countdown timers
- Feed panel opens and populates with win entries; auto-refreshes
- Hot/cold badges appear on game cards when stats data exists
- Filter pills work to narrow game grid
- No console.error output from new modules
