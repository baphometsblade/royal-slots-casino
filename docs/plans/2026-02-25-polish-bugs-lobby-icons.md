# Casino Polish — Bug Fixes & Lobby Icons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 2 confirmed bugs and update all lobby feature-icon/label maps so all 122 games show correct bonus-type metadata.

**Architecture:** Two independent file workstreams (ui-slot.js and ui-lobby.js) that can be executed in parallel. All changes are narrow, targeted edits — no new files, no new mechanics, no structural changes.

**Tech Stack:** Vanilla JS (global scope), Node/Express server on port 3000, Playwright QA suite (`npm run qa:regression`).

---

## Workstream A — `js/ui-slot.js` Bug Fixes

**Files:** Modify `js/ui-slot.js` only.

---

### Task A1: Fix Wild Meter showBonusEffect string literal bug

**Context:**
Line ~3586 in `js/ui-slot.js` has a broken string concatenation. The message is built as a single-quoted string that contains the literal characters `+" + wildCount + "` rather than concatenating the actual variable. The user sees `⚡ WILD METER +" + wildCount + " WILDS!` literally.

**Files:**
- Modify: `js/ui-slot.js` (around line 3586 — the `showBonusEffect` call in the wild_collect engine)

**Step 1: Locate the broken line**

Search for this exact string in `js/ui-slot.js`:
```
'\u26A1 WILD METER +" + wildCount + " WILD'
```
It will be inside the `wild_collect` engine, inside the block `if (wildCount > 0 && !freeSpinsActive)`.

**Step 2: Replace with correct concatenation**

Change:
```js
showBonusEffect('\u26A1 WILD METER +" + wildCount + " WILD' + (wildCount > 1 ? 'S' : '') + '!', '#c6ff00');
```
To:
```js
showBonusEffect('\u26A1 WILD METER +' + wildCount + ' WILD' + (wildCount > 1 ? 'S' : '') + '!', '#c6ff00');
```

The fix: remove the erroneous `"` characters inside the string — the `+" + wildCount + "` was supposed to be string concatenation but ended up literal. After fix, wildCount=3 produces `⚡ WILD METER +3 WILDS!`.

**Step 3: Verify bracket balance is unchanged**

No structural change — just a string literal fix. Bracket balance stays the same.

---

### Task A2: Fix Buy Feature dispatch for `prize_wheel` games

**Context:**
Both `prize_wheel` games have `freeSpinsCount` set, so the Buy Feature button (bottom-right) appears for them. Clicking it calls `triggerFreeSpins()` — but prize_wheel games should call `triggerPrizeWheel()` instead. The wheel never spins when bought.

**Files:**
- Modify: `js/ui-slot.js` (inside `_ensureBuyFeatureButton`, the `btn.onclick` handler, around line 4250-4268)

**Step 1: Locate the buy feature dispatch chain**

Find the `btn.onclick` handler inside `_ensureBuyFeatureButton`. It has this structure:
```js
if (game.bonusType === 'chamber_spins' && typeof triggerChamberSpins === 'function') {
    triggerChamberSpins(game);
} else if (game.bonusType === 'sticky_wilds' && typeof triggerStickyWildsFreeSpins === 'function') {
    triggerStickyWildsFreeSpins(game, 0);
} else if (game.bonusType === 'walking_wilds' && typeof triggerWalkingWildsFreeSpins === 'function') {
    triggerWalkingWildsFreeSpins(game, 0);
} else {
    triggerFreeSpins(game, game.freeSpinsCount);
}
```

**Step 2: Add `prize_wheel` case before the `else` fallback**

Change the block to:
```js
if (game.bonusType === 'chamber_spins' && typeof triggerChamberSpins === 'function') {
    triggerChamberSpins(game);
} else if (game.bonusType === 'sticky_wilds' && typeof triggerStickyWildsFreeSpins === 'function') {
    triggerStickyWildsFreeSpins(game, 0);
} else if (game.bonusType === 'walking_wilds' && typeof triggerWalkingWildsFreeSpins === 'function') {
    triggerWalkingWildsFreeSpins(game, 0);
} else if (game.bonusType === 'prize_wheel' && typeof triggerPrizeWheel === 'function') {
    triggerPrizeWheel(game);
} else {
    triggerFreeSpins(game, game.freeSpinsCount);
}
```

**Step 3: Verify surrounding code is intact**

The `triggerPrizeWheel` function is defined in the prize_wheel engine block appended to the bottom of `ui-slot.js` — it exists at runtime. The `typeof` guard makes it safe even if loading order somehow differs.

---

## Workstream B — `js/ui-lobby.js` Feature Metadata Fixes

**Files:** Modify `js/ui-lobby.js` only.

---

### Task B1: Update `_giBonusLabel` with correct bonusType keys

**Context:**
`_giBonusLabel()` returns a human-readable label for the game-info strip (shown at the bottom of every game card). The current map uses old/wrong key names. Correct bonusType values are the ones actually stored in `shared/game-definitions.js`.

All 18 valid bonusType values (from `shared/game-definitions.js` and the sprint history):
`hold_and_win`, `coin_respin`, `wild_collect`, `mystery_stacks`, `chamber_spins`,
`tumble`/`avalanche`, `random_multiplier`, `zeus_multiplier`, `stacked_wilds`,
`expanding_wild_respin`, `expanding_symbol`, `money_collect`, `fisherman_collect`,
`wheel_multiplier`, `sticky_wilds`, `walking_wilds`, `win_streak`, `multiplier_wilds`,
`increasing_mult`, `cascading`, `expanding_wilds`, `respin`, `prize_wheel`, `colossal`,
`symbol_collect`, `wild_reels`, `both_ways`, `random_jackpot`

**Files:**
- Modify: `js/ui-lobby.js` (the `_giBonusLabel` function, around line 397)

**Step 1: Find the `_giBonusLabel` function**

It looks like:
```js
function _giBonusLabel(game) {
    const map = {
        free_spins: 'Free Spins', megaways: 'Megaways', expanding_symbol: 'Expanding',
        respin: 'Respin', money_collect: 'Collect', bonus_wheel: 'Wheel',
        mystery_symbol: 'Mystery', cascading: 'Cascade', tumbling_reels: 'Tumble',
        sticky_wild: 'Sticky Wild', win_both_ways: 'Both Ways', power_spin: 'PowerSpin',
        hold_and_respin: 'Hold&Spin',
    };
    return map[game.bonusType] || 'Bonus';
}
```

**Step 2: Replace the entire map body with all correct keys**

```js
function _giBonusLabel(game) {
    const map = {
        // Legacy/original types
        tumble: 'Tumble', avalanche: 'Tumble', random_multiplier: 'Random ×',
        zeus_multiplier: 'Zeus ×', money_collect: 'Collect', stacked_wilds: 'Stacked Wilds',
        expanding_wild_respin: 'Expand+Respin', expanding_symbol: 'Expanding',
        fisherman_collect: 'Fish Collect', wheel_multiplier: 'Wheel ×',
        hold_and_win: 'Hold & Win', coin_respin: 'Coin Respin',
        // Sprint 1-2
        wild_collect: 'Wild Meter', mystery_stacks: 'Mystery Stacks',
        chamber_spins: 'Chamber Spins', sticky_wilds: 'Sticky Wilds',
        walking_wilds: 'Walking Wilds', win_streak: 'Win Streak',
        multiplier_wilds: 'Mult Wilds', increasing_mult: 'Rising ×',
        // Sprint 3
        cascading: 'Cascade', expanding_wilds: 'Expand Wild', respin: 'Re-Spin',
        // Sprint 4
        prize_wheel: 'Prize Wheel', colossal: 'Colossal', symbol_collect: 'Symbol Collect',
        // Sprint 5
        wild_reels: 'Wild Reels', both_ways: 'Both Ways', random_jackpot: 'Random JP',
    };
    return map[game.bonusType] || 'Bonus';
}
```

---

### Task B2: Update `featureIconMap` in `createGameCard` with correct bonusType keys

**Context:**
Inside `createGameCard()`, `featureIconMap` maps bonusType strings to emoji icons shown in the hover overlay. Most sprint 2-5 bonusTypes are missing or use wrong key names, so games show generic `🎰`.

**Files:**
- Modify: `js/ui-lobby.js` (inside `createGameCard`, the `featureIconMap` object, around line 435)

**Step 1: Find `featureIconMap` inside `createGameCard`**

It starts with:
```js
const featureIconMap = {
    tumble: '⬇️', avalanche: '🪨', random_multiplier: '✨', zeus_multiplier: '⚡',
    money_collect: '💰', respin: '🔄', stacked_wilds: '🔥', hold_and_win: '🎯',
    ...
```

**Step 2: Replace the entire `featureIconMap` object with expanded version**

```js
const featureIconMap = {
    // Legacy/original types
    tumble: '⬇️', avalanche: '🪨', random_multiplier: '✨', zeus_multiplier: '⚡',
    money_collect: '💰', stacked_wilds: '🔥', hold_and_win: '🎯',
    fisherman_collect: '🎣', wheel_multiplier: '🎡', expanding_symbol: '📖',
    expanding_wild_respin: '🌟', progressive: '🏆', mystery_symbols: '❓',
    nudge: '👆', trail_bonus: '🗺️', pick_bonus: '🎁', super_meter: '📊',
    lightning_respin: '⚡', mega_symbols: '🔮', coin_respin: '🪙',
    // Sprint 1-2
    wild_collect: '⚡', mystery_stacks: '❓', chamber_spins: '🔫',
    sticky_wilds: '🍯', walking_wilds: '🚶', win_streak: '🔥',
    multiplier_wilds: '✖️', increasing_mult: '📈',
    // Sprint 3
    respin: '🔄', cascading: '🌊', expanding_wilds: '🌟',
    // Sprint 4
    prize_wheel: '🎡', colossal: '🔮', symbol_collect: '💎',
    // Sprint 5
    wild_reels: '🎰', both_ways: '↔️', random_jackpot: '💰',
};
```

---

## Final Task: QA Gate + Commit + Push

**This task runs after BOTH workstreams are complete.**

**Step 1: Start the dev server (if not running)**

```bash
# Check if server is running
curl -s http://localhost:3000/api/health | head -c 80
# If not running:
npm start &
sleep 3
```

**Step 2: Run QA regression**

```bash
npm run qa:regression
```

Expected: All checks pass, no `errors.json` in `output/web-game/regression/`.

If QA fails:
- Check `output/web-game/regression/errors.json` for the error
- Check `output/web-game/regression/failure-shot.png` for screenshot
- Most likely cause: syntax error introduced in one of the edits

**Step 3: Commit**

```bash
git add js/ui-slot.js js/ui-lobby.js
git commit -m "$(cat <<'EOF'
fix: wild meter display bug, buy feature prize wheel dispatch, lobby bonus type icons

- Fix wild meter showBonusEffect string literal (showed raw JS instead of count)
- Buy feature now calls triggerPrizeWheel for prize_wheel games
- _giBonusLabel: full map for all 18 bonusTypes (was showing 'Bonus' for most)
- featureIconMap: full icon map for all 18 bonusTypes (was showing 🎰 for most)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 4: Push**

```bash
git push origin master
```

---

## Parallelisation Strategy

Workstream A (`js/ui-slot.js`) and Workstream B (`js/ui-lobby.js`) touch different files and can run simultaneously. The Final QA + Commit task must wait for both.

**CLAUDE.md rule:** Never assign two agents to edit the same file. A-tasks both edit `js/ui-slot.js` so they must be sequential within Agent A's session. B-tasks both edit `js/ui-lobby.js` so they must be sequential within Agent B's session.
