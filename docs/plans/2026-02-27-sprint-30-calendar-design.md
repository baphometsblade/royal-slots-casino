# Sprint 30 — "The Calendar"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Context

Login streak exists as a counter but has no visual representation. A calendar
creates a satisfying visual of daily engagement. A progressive jackpot pool
adds collective excitement to every spin.

## Features

### Feature 1: Daily Login Calendar

**Motivation:** Visual representation of login consistency with milestone rewards.

**Modal:** `#loginCalendarModal` — accessible via "Calendar" button in lobby nav
(or by clicking the login streak counter).

**Storage:** `localStorage('matrixLoginCalendar')` = `{ month: 'YYYY-MM', days: [1,3,5,...] }`
Reset when month changes.

**UI:** 30-day grid showing current month. Each day cell is:
- Past + logged in: green checkmark
- Past + missed: grey X
- Today + logged in: glowing green
- Future: dimmed

**Milestone rewards (cumulative days in current month):**
- 7 days: $200 bonus
- 14 days: $500 bonus + 50 XP
- 21 days: $1,000 bonus + 100 XP
- 28+ days: $2,500 bonus + 250 XP + 5 Free Spins

Milestone tracking: `localStorage('matrixCalendarMilestones')` = `{ month, claimed: [7,14,...] }`

**On modal open:** Check if today is already marked. If not, mark it and check milestones.

### Feature 2: Community Jackpot Pool

**Motivation:** Creates shared excitement — every spin feeds the pool.

**Concept:** Each spin contributes $0.50 to a community jackpot pool.
1 in 10,000 chance to win the full pool on any spin.
Pool stored in localStorage (simulated community — resets at $50,000 or on win).

**Storage:** `localStorage('matrixCommunityJackpot')` = `{ pool: N, lastReset: timestamp }`

**UI:** Ticker in lobby below the jackpot bar showing "Community Jackpot: $X,XXX"
with animated counting effect. Pulses when pool is large.

**Win event:** Full-screen celebration, pool resets to $1,000 seed.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML scaffolding (calendar button, modal, jackpot ticker).
**Step 3:** Login Calendar JS in ui-modals.js.
**Step 4:** Community Jackpot JS in ui-lobby.js + hook in ui-slot.js.
**Step 5:** CSS + QA + commit + push.

## Success Criteria

- Calendar modal shows current month with login days marked
- Today auto-marks on modal open
- Milestone rewards trigger at 7/14/21/28 day thresholds
- Community jackpot ticker visible in lobby
- Each spin adds $0.50 to pool
- QA regression passes
