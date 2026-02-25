# Meta-Game Deepening — Design Doc
**Date:** 2026-02-25
**Status:** Approved

## Goal
Improve player retention by enriching the daily engagement loop: more diverse challenges, richer achievements, cross-session best-win tracking, and better game discovery in the lobby.

## Scope (no new games)

### 1. Daily Challenges — expand 3 → 8
Current 3 challenges are trivially easy and redundant. New set:

| id | label | desc | target | xp | type |
|----|-------|------|--------|----|------|
| spins_20 | Spin It Up | Complete 20 spins | 20 | 50 | spin count |
| spins_50 | Spin Machine | Complete 50 spins | 50 | 100 | spin count |
| games_3 | Game Hopper | Play 3 different games | 3 | 75 | game variety |
| win_once | Lucky Break | Win at least once | 1 | 40 | win |
| big_win_50x | High Roller | Land a win ≥50× your bet | 50 | 150 | win multiplier |
| bonus_trigger | Bonus Hunter | Trigger a bonus/free-spins | 1 | 125 | bonus event |
| wager_500 | Whale Watch | Wager $500 total today | 500 | 100 | total wager |
| streak_3 | Hot Streak | Win 3 spins in a row | 3 | 120 | win streak |

Events fired via existing `onChallengeEvent('spin', payload)` — payload must be expanded to include `{ bonusTriggered, winMult, streak }`.

### 2. Achievements — expand 12 → 24
Add mechanic-specific and milestone achievements:

New achievements to add:
- `bonus_5`: Trigger bonus rounds 5 times
- `bonus_25`: Trigger bonus rounds 25 times
- `jackpot_hit`: Win a jackpot (random_jackpot bonus type fires)
- `streak_5`: Achieve 5× win streak
- `streak_10`: Achieve 10× win streak
- `wager_1k`: Wager $1,000 total
- `wager_10k`: Wager $10,000 total
- `games_50`: Try 50 different games
- `games_all`: Try all 122 games (the grail)
- `big_win_100x`: Win over 100× (already exists)
- `mega_win_500x`: Win over 500× (already exists)
- `epic_win_1000x`: WIN over 1,000× your bet (new)
- `balance_1000`: Reach $1,000 balance (existing is 500)

### 3. Hall of Fame — cross-session best wins
- localStorage key: `matrixHallOfFame` (max 10 entries)
- Each entry: `{ game, gameName, amount, mult, date, bonusType }`
- Updated whenever a win > previous min-entry amount
- Displayed in the Stats modal as a collapsible "Best Wins Ever" panel
- Also shown as a small "Recent Jackpots" strip at the bottom of the lobby

### 4. Lobby Improvements
- **Mechanics filter tab**: new tab `Mechanics` showing checkboxes for bonus type categories (Tumble, Hold & Win, Free Spins, etc.) — filters game grid
- **Volatility sort**: add "Low→High" / "High→Low" sort option next to existing filters
- **Game count badge**: show filtered count as `(45/122 games)` next to active filter

## Architecture / Files Changed

| File | Changes |
|------|---------|
| `js/ui-modals.js` | Expand DAILY_CHALLENGES, ACH_DEFS; update `_checkAchievements`; add Hall of Fame logic; update `onChallengeEvent` payload |
| `js/ui-lobby.js` | Add mechanics filter; volatility sort; game count badge; recent jackpots strip |
| `js/globals.js` | Add `hallOfFame` state; `STORAGE_KEY_HALL_OF_FAME` constant |
| `constants.js` | Add `STORAGE_KEY_HALL_OF_FAME` |
| `js/win-logic.js` | Expand `onChallengeEvent` payload with `bonusTriggered`, `winMult`, `streak` fields |
| `index.html` | Add lobby recent-jackpots strip; mechanics filter tab |
| `styles.css` | Styles for new Hall of Fame panel, mechanics filter, jackpots strip |

## Parallel Agent Assignment (no shared files per agent)

- **Agent 1** → `js/ui-modals.js` only: challenges + achievements + hall of fame panel
- **Agent 2** → `js/ui-lobby.js` only: mechanics filter + volatility sort + game count badge
- **Agent 3** → `constants.js` + `js/globals.js` + `js/win-logic.js`: constants + payload expansion
- **Agent 4** (sequential, last) → `index.html` + `styles.css`: HTML structure + CSS for new features

## Success Criteria
- 8 challenges visible and tracking correctly
- 24 achievements defined and unlocking on correct events
- Hall of Fame panel in Stats modal showing top wins
- Lobby mechanics filter working
- QA regression passes
