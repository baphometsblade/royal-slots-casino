# Sprint 34 — "The Gift Box"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Hourly Free Bonus

**Motivation:** Gives players a reason to return frequently. A small free bonus every hour
keeps engagement high without requiring gameplay.

**UI:** A floating "Free Bonus" button in the lobby (bottom-right corner). Shows countdown
timer when on cooldown. Pulses green when claimable.

**Behavior:**
- Claim awards a random amount: $25-$100
- 1-hour cooldown between claims
- Visual coin shower on claim

**Storage:** `localStorage('matrixHourlyBonus')` = `{ lastClaim: timestamp }`

### Feature 2: Daily Challenge Streak Multiplier

**Motivation:** Consecutive daily challenge completions should feel rewarding.
A multiplier that grows with consecutive days of completing all daily challenges.

**UI:** Streak badge in the lobby challenge widget showing "Day X" and multiplier.
When challenge rewards are claimed, the multiplier applies.

**Behavior:**
- Each day all challenges are completed: streak +1
- Streak multiplier: 1x (day 1), 1.5x (day 2), 2x (day 3+)
- Missing a day resets streak to 0
- Applied to challenge cash rewards

**Storage:** `localStorage('matrixChallengeStreak')` = `{ lastDay: 'YYYY-MM-DD', streak: N }`

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for floating bonus button.
**Step 3:** Hourly bonus JS in ui-lobby.js.
**Step 4:** Challenge streak multiplier JS in ui-modals.js.
**Step 5:** CSS + QA + commit + push.
