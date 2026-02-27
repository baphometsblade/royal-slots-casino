# Sprint 28 — "The Trophy Room"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Context

Players accumulate lifetime stats (spins, wins, games played) but have no way to
see or celebrate milestones. Achievements provide long-term goals and recognition.
Favorites let players bookmark preferred games for quick access.

## Features

### Feature 1: Achievement System

**Motivation:** Long-term engagement via persistent milestones with tiered rewards.

**Modal:** `#achievementsModal` — accessible via "Achievements" button in lobby nav.

**Achievements (12 total, 3 tiers):**

| ID | Name | Desc | Target | Tier | XP | Cash |
|---|---|---|---|---|---|---|
| spin_100 | Century Spinner | Complete 100 spins | 100 spins | Bronze | 25 | $50 |
| spin_1000 | Spin Doctor | Complete 1,000 spins | 1000 spins | Silver | 100 | $200 |
| spin_5000 | Spin Legend | Complete 5,000 spins | 5000 spins | Gold | 300 | $750 |
| win_50 | Winner | Win 50 spins | 50 wins | Bronze | 25 | $50 |
| win_500 | Big Winner | Win 500 spins | 500 wins | Silver | 100 | $200 |
| win_2000 | Win Machine | Win 2,000 spins | 2000 wins | Gold | 300 | $750 |
| games_5 | Explorer | Play 5 different games | 5 games | Bronze | 30 | $75 |
| games_20 | Adventurer | Play 20 different games | 20 games | Silver | 100 | $250 |
| games_50 | Completionist | Play 50 different games | 50 games | Gold | 300 | $1000 |
| bigwin_5 | Fortune Hunter | Land 5 big wins (50x+) | 5 big wins | Silver | 100 | $300 |
| streak_5 | Hot Hand | Win 5 spins in a row | 5 streak | Bronze | 50 | $100 |
| streak_10 | On Fire | Win 10 spins in a row | 10 streak | Gold | 250 | $500 |

**Storage:** `localStorage('matrixAchievements')` = `{ unlocked: [...ids], stats: { totalSpins, totalWins, uniqueGames: [...], bigWins, bestStreak } }`

**Tracking:** Hook into existing spin result flow. After each spin:
- Increment `totalSpins`
- If win: increment `totalWins`, update streak
- If big win (50x+): increment `bigWins`
- Track unique games played
- Check all achievement thresholds; unlock any newly met

**UI:** Grid of 12 achievement cards. Unlocked = colored with checkmark. Locked = greyed out with progress bar.
Toast notification on unlock with tier-colored glow.

### Feature 2: Favorite Games

**Motivation:** With 80+ games, players need quick access to preferred games.

**Storage:** `localStorage('matrixFavorites')` = `['gameId1', 'gameId2', ...]`

**UI changes:**
- Heart/star icon on each game card in lobby (top-right corner)
- Click toggles favorite state
- New "Favorites" filter tab in lobby filter bar (shows count)
- When favorites exist and "All" tab active, show a compact "Your Favorites" row above the main grid

## Implementation Plan

**Step 1:** Write design doc (this file).
**Step 2:** Add HTML to index.html (achievements button + modal, favorite icons).
**Step 3:** Achievement system JS in ui-modals.js.
**Step 4:** Favorites JS in ui-lobby.js.
**Step 5:** CSS for both + QA + commit + push.

## Success Criteria

- Achievements modal shows 12 achievements with progress
- Unlocking an achievement awards XP + cash, shows toast
- Progress persists across sessions (localStorage)
- Favorite toggle works on game cards
- "Favorites" filter tab appears and filters correctly
- Favorites persist across sessions
- QA regression passes
