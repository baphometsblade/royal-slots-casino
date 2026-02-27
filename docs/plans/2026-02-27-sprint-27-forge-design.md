# Sprint 27 — "The Forge"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Context

XP accumulates but has no spending use beyond passive leveling. Players need agency.
The 4-hour mystery box interval fills the gap between daily cooldowns (wheel/scratch).

## Features

### Feature 1: XP Shop

**Motivation:** Give XP a tangible spending purpose beyond leveling.

**Modal:** `#xpShopModal` — accessible via "XP Shop" button in lobby nav bar.

**Shop items (client-side, localStorage tracking):**

| Item | Cost | Effect |
|---|---|---|
| 5 Free Spins | 100 XP | `triggerFreeSpins(currentGame \|\| random, 5)` |
| $500 Balance Boost | 250 XP | `balance += 500` |
| 2× XP Boost (50 spins) | 500 XP | Next 50 spins award double XP |
| $2,000 Balance Boost | 1000 XP | `balance += 2000` |

**XP deduction:** Subtract from `playerXP` (NOT from level — XP is current-level progress).
If purchase would reduce XP below 0, deny with toast "Not enough XP."

**2× XP Boost tracking:** `localStorage('matrixXpBoost')` = `{ remaining: N }`.
`awardXP` checks boost state and doubles amount when active.

**UI:** Grid of 4 cards, each showing cost/icon/description, "Buy" button.
Current XP balance displayed at top.

### Feature 2: Mystery Box

**Motivation:** 4-hour cooldown collectible creates a mid-session reward loop.

**Cooldown:** 4 hours. Stored in `localStorage('matrixMysteryBox')` = `{ lastOpen: timestamp }`.

**Prize tiers (weighted random):**
- Common (60%): $50–$100
- Uncommon (25%): $150–$300
- Rare (10%): $500–$1,000
- Legendary (5%): $2,000 + 10 Free Spins

**UI:** `#mysteryBoxModal` — animated box with glow → shake → open → prize reveal.
Accessible from lobby nav (button near Scratch button).

**When ready:** Button pulses green. When on cooldown: shows countdown timer.

## Implementation Plan

**Step 1 (me):** Add XP Shop + Mystery Box button HTML to index.html.

**Step 2 (parallel agents):**
- Agent A: XP Shop modal JS + CSS (ui-modals.js + styles.css)
- Agent B: Mystery Box modal JS + CSS (ui-modals.js — different section + styles.css)

Wait — both touch ui-modals.js. Revised plan:

**Step 1 (me):** Add all HTML to index.html + XP boost logic in awardXP.
**Step 2 (me):** XP Shop JS in ui-modals.js.
**Step 3 (me):** Mystery Box JS in ui-modals.js.
**Step 4:** CSS for both + QA + commit + push.

## Success Criteria

- XP Shop modal opens, shows 4 purchasable items with current XP
- Buying deducts XP, awards item, shows confirmation toast
- 2× XP Boost multiplies XP awards for next 50 spins
- Mystery Box button shows cooldown when unavailable
- Opening box shows animated reveal + prize
- QA regression passes
