# Sprint 31 — "The Vault Key"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Promo Code System

**Modal:** `#promoCodeModal` — accessible via "Promo Code" button in lobby nav.

**Built-in codes (client-side, hardcoded):**

| Code | Reward | One-time? |
|---|---|---|
| WELCOME500 | $500 balance | Yes |
| MATRIX100 | 100 XP | Yes |
| FREESPIN10 | 10 free spins | Yes |
| DAILY200 | $200 balance | Once per day |
| XPBOOST | 2× XP Boost (20 spins) | Once per day |

**Storage:** `localStorage('matrixPromoCodes')` = `{ used: { 'WELCOME500': timestamp, ... } }`

**Validation:**
- Code must match a known code (case-insensitive)
- One-time codes: check if already used
- Daily codes: check if used today (same date string)

### Feature 2: Automatic Cashback

**Concept:** Every 24 hours, if net balance change is negative, award 5% cashback.

**Storage:** `localStorage('matrixCashback')` = `{ lastCheck: timestamp, lastBalance: N }`

**Trigger:** On lobby load, check if 24h have passed since last check.
If yes and balance < lastBalance, award `(lastBalance - balance) * 0.05`.

**UI:** Toast notification on cashback award. Small "Cashback" badge in lobby showing
pending cashback (or time until next check).

## Implementation Plan

**Step 1:** Design doc + HTML (promo button, modal, cashback indicator).
**Step 2:** Promo Code JS in ui-modals.js.
**Step 3:** Cashback JS in ui-lobby.js.
**Step 4:** CSS + QA + commit + push.
