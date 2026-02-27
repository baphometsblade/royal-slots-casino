# Sprint 26 — "The Vault"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Context

Existing gaps discovered:
- Daily challenges exist (8 defined) but are buried in the stats modal — invisible to casual players
- Challenges complete with XP only — no cash reward drives engagement
- Level-up awards are modest ($5×level or free spins) with no fanfare at milestone levels
- Jackpot history API exists but is never surfaced

## Features

### Feature 1: Challenge Cash Rewards

**Motivation:** Completing a challenge should feel rewarding beyond XP. Cash makes it tangible.

**Changes to `DAILY_CHALLENGES` (ui-modals.js):**
- Add `reward` field: easy=100, medium=200, hard=500 (in dollars)
- Modify `onChallengeEvent` completion block to also credit `balance += ch.reward`, call `saveBalance()` + `updateBalance()`
- Toast update: `"✅ Challenge done! +${ch.xp} XP +$${ch.reward}"`

**Challenges with rewards:**
| Challenge | XP | Cash |
|---|---|---|
| Spin It Up (20 spins) | 50 | $100 |
| Spin Machine (50 spins) | 100 | $150 |
| Game Hopper (3 games) | 75 | $100 |
| Lucky Break (1 win) | 40 | $75 |
| High Roller (50× win) | 150 | $500 |
| Bonus Hunter (1 bonus) | 125 | $300 |
| Whale Watch ($500 wager) | 100 | $200 |
| Hot Streak (3 in a row) | 120 | $250 |

### Feature 2: Level Milestone Reward Modal

**Motivation:** Hitting level 10 or 25 currently shows only a toast. A dedicated modal with
confetti and a meaningful cash reward creates memorable moments.

**Milestone levels:** 5, 10, 15, 20, 25, 30, 40, 50, 75, 100
**Reward formula:** `level * 50` credits (level 10 = $500, level 25 = $1,250, level 50 = $2,500)

**Changes to `awardXP` (ui-modals.js):**
- After `playerLevel++`, check if new level is a milestone AND not already claimed
- Claimed milestones stored in localStorage `matrixLevelMilestones`
- If milestone: credit balance + open level-milestone modal (instead of immediate toast)

**Level Milestone Modal (`#levelMilestoneModal`):**
- Full-screen dark overlay
- Animated level badge (large, pulsing)
- "Level {N} Reached!" heading
- Milestone perk label (flavor text per milestone)
- Reward amount counter (rolls up)
- Single CTA button "Claim Reward"
- Confetti burst on open

**Milestone perks (flavor only):**
- 5: "Lucky Charm Unlocked"
- 10: "High Roller Status"
- 15: "Fortune Seeker"
- 20: "Gold Member"
- 25: "Platinum Insider"
- 30: "Diamond Hand"
- 40: "Elite Spinner"
- 50: "Casino Legend"
- 75: "Master of the Reels"
- 100: "Hall of Fame"

### Feature 3: Lobby Challenge Widget

**Motivation:** Daily challenges are invisible until the player opens the stats modal.
A compact lobby widget drives daily engagement without requiring navigation.

**Placement:** Below the hot/cold game section, above the game grid — a narrow horizontal strip.

**UI:** `<div id="lobbyChallengeWidget">` showing:
- "Today's Challenges" header with progress summary (X/3 complete)
- 3 challenge rows: icon + label + mini progress bar + reward amount
- Completed rows show ✓ and grayed out
- "All Challenges →" link opens stats modal to challenges tab

**Logic (ui-lobby.js):**
- `renderLobbyChallengeWidget()` called on lobby init + after each spin event
- Reads localStorage `matrixChallenges` for current progress
- `window.refreshLobbyChallengeWidget` exposed for cross-file calls

## Implementation Plan

**Step 1 (main):** Add `reward` to DAILY_CHALLENGES + cash credit in `onChallengeEvent`.

**Step 2 (parallel agents):**
- Agent A: Level Milestone Modal (new HTML in index.html + JS in ui-modals.js + CSS)
- Agent B: Lobby Challenge Widget (ui-lobby.js render function + CSS)

**Step 3:** CSS pass (any agent-missed styles), QA regression, commit + push to master.

## Success Criteria

- Completing a daily challenge awards both XP and cash (visible in toast)
- Reaching level 10/20/50 opens a milestone modal with confetti + cash reward
- Lobby shows 3 challenge cards with live progress bars
- QA regression passes
