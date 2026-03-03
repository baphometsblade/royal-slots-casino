# Sprint 19 Design — Urgency, Milestone Chasing & Loss Recovery
**Date:** 2026-03-03
**Goal:** Three features targeting play-NOW urgency, continuous session extension through milestone proximity, and session-loss conversion

---

## Context

Sprint 18 delivered login streaks, VIP fast-track, and subscription pass. Sprint 19 targets three untouched
psychological levers:
1. **Time pressure** — lucky hours make the current moment uniquely valuable
2. **Milestone gradient** — players chase the next reward milestone obsessively once they can see it
3. **Loss-aversion recovery** — players who just lost are the highest-conversion audience for a targeted offer

All three are independent files. Features 1 and 2 need backend routes.

---

## Feature 1: Lucky Hours

**Revenue mechanism:** Time-scarcity is one of the strongest behavioral drivers. "Enhanced rewards for the next
47 minutes" forces immediate action because inaction has a visible cost. Lucky Hours double gem awards during
the window — players who know about Lucky Hours come back at predictable times and spin more during them.

**New backend:** `server/routes/luckyhours.routes.js`

**Schedule logic (server-computed, no DB needed):**
- Each UTC calendar day has two Lucky Hours:
  - Fixed window: 20:00–21:00 UTC daily
  - Rotating window: derived from `Math.floor(dateHash % 22)` hours offset, giving variety
- `GET /api/luckyhours/current` — no auth required; returns:
  ```json
  { "active": true|false, "multiplier": 2, "label": "2× Gems",
    "endsAt": "ISO", "nextWindowAt": "ISO", "nextLabel": "2× Gems" }
  ```
- dateHash = `parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''))` — stable per day

**No DB writes needed.** Pure computation endpoint.

**New file:** `js/ui-luckyhours.js`

**UX:**
1. Poll `GET /api/luckyhours/current` 4s after DOMContentLoaded, then every 60s
2. **When active:** inject `#luckyHoursBanner` above the VIP progress widget (below `.casino-header`)
   - Gold/amber pulsing bar: `🌟 LUCKY HOUR ACTIVE — 2× Gems on every spin! Ends in HH:MM:SS`
   - 48px tall, animated shimmer, countdown via `setInterval(tick, 1000)`
   - Remove banner when window ends (clear interval, remove element)
3. **When inactive:** small "⏰ Next Lucky Hour: HH:MM:SS" chip injected in same position (no pulsing)
4. Hook `window.updateBalance` — if active, show small `🌟×2` badge on gem counter area
5. Auto-refresh state when next window starts (via setTimeout to re-poll at `nextWindowAt`)

**Entry point:** Automatic — fires 4s after DOMContentLoaded. No nav button.

---

## Feature 2: Spin Milestone Rewards

**Revenue mechanism:** The milestone gradient effect — knowing a reward is N spins away creates a pull that
keeps players spinning "just a bit more." Once they hit it, the next milestone appears immediately.
100 → 250 → 500 → 1000 → 2500 → 5000 → 10000+ spins.

**New backend:** `server/routes/milestones.routes.js`

**Schema (add via ALTER TABLE):**
- Add to users: `milestone_last_claimed INTEGER DEFAULT 0` — tracks the highest milestone already claimed

**Milestone table (hardcoded):**
```
100 spins  → 50 gems
250 spins  → 100 gems + $0.50 credits
500 spins  → 200 gems + $1.00 credits
1000 spins → 500 gems + $2.00 credits  ← "SPINNING CENTURION"
2500 spins → 1000 gems + $5.00 credits ← "HIGH ROLLER"
5000 spins → 2000 gems + $10.00 credits ← "LEGEND"
10000 spins → 5000 gems + $25.00 credits ← "ELITE"
```

**API:**
- `GET /api/milestones/status` — auth required; returns `{ totalSpins, nextMilestone, spinsUntilNext, progress, pendingClaim, pendingMilestone }`
  - `pendingClaim: true` if `totalSpins >= some_milestone > milestone_last_claimed`
- `POST /api/milestones/claim` — auth required; awards reward for highest unclaimed milestone ≤ totalSpins;
  updates `milestone_last_claimed`; returns `{ success, milestone, reward, newBalance }`

**New file:** `js/ui-milestones.js`

**UX:**
1. Poll `GET /api/milestones/status` 6s after DOMContentLoaded (if auth)
2. Hook `window.updateBalance` — re-check every 25 spins via counter
3. **Pending claim:** full celebration overlay (similar to mystery drop) — "🎯 MILESTONE REACHED!" +
   milestone name + reward pill + "CLAIM REWARD!" button → POST claim → confetti + balance update
4. **Progress widget:** compact bar injected below VIP progress bar (or merged area):
   `[🎯 Next Milestone: 500 spins] [████░░ 340/500]`
5. Bar only shown when next milestone exists (hides after 10000 spins reached)
6. Auto-dismiss overlay after 30s if unclaimed
7. Show milestone history badge: "🎯 Milestones: N claimed" in stats area (non-intrusive)

**Entry point:** Automatic — fires 6s after DOMContentLoaded. No nav button.

---

## Feature 3: Loss Recovery Offer

**Revenue mechanism:** A player who just lost a significant amount is in the highest-conversion state: they
feel the loss acutely and want to recover. The low-balance nudge (Sprint 16) fires on absolute balance.
This is different — it fires on *session loss amount*, hitting players regardless of starting balance.
"You're down $18 — one smart deposit could flip this session."

**Zero backend needed** — session tracking via client-side globals.

**New file:** `js/ui-recovery.js`

**Session loss tracking:**
- Hook `window.openSlot` to record `_recoverySessionStart = window.balance` (or `window.stats` snapshot)
- Hook `window.updateBalance` to compute `_sessionLoss = _recoverySessionStart - currentBalance`
- Trigger when: `_sessionLoss >= 15` AND not shown in last 60 min (localStorage snooze `rco_snoozed`)
  AND slot is currently open (only relevant while actively playing)

**UX:**
1. Compact overlay (bottom-right, fixed) slides up when triggered — 340px wide
2. Header: `📉 Recovery Offer` with a subtle red→amber gradient
3. Body: `"You're down $X this session."` (personalized with actual loss amount)
4. Message: `"Make a $20+ deposit and we'll match 25% up to $10. Turn this session around."`
5. Offer badge: `🎁 25% MATCH · UP TO $10 · EXPIRES IN 15:00`
   - 15-min countdown timer per offer
6. Fetch `/api/bundles` → show the Gold bundle card as the recommended deposit
7. `"Claim Offer"` CTA → calls `openWalletModal()` or `openBundleStore()`
8. `"Not now"` dismiss → sets 60-min localStorage snooze
9. Auto-dismiss after 30s
10. Snooze resets when a new slot session starts (so offer can re-trigger next game)

**Entry point:** Automatic — hooks `openSlot` / `updateBalance`. No nav button.

---

## File Contention Analysis (Zero conflicts)

| Agent | Files Written |
|---|---|
| Agent 1 (Lucky Hours) | `server/routes/luckyhours.routes.js` (new), `js/ui-luckyhours.js` (new) |
| Agent 2 (Milestones) | `server/routes/milestones.routes.js` (new), `js/ui-milestones.js` (new) |
| Agent 3 (Recovery) | `js/ui-recovery.js` (new only) |
| Integration (me) | `server/index.js` (2 mount lines), `index.html` (3 script tags) |

Zero file conflicts. ✅

---

## Success Criteria

- QA regression passes after integration
- Lucky hours endpoint returns valid JSON with `active` and `nextWindowAt`
- Milestone status endpoint returns `{ totalSpins, nextMilestone }` for auth'd user
- Milestone claim endpoint credits reward
- Loss recovery overlay fires when session loss ≥ $15 (manual test in QA tools with forced losses)
- No console.error from new modules
