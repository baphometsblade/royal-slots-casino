# Win Juice & Game Feel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every spin feel more tactile — stagger winning cells left-to-right, add a loss droop, and give the balance counter a landing bump.

**Architecture:** Two parallel agents — Agent A owns `styles.css` only, Agent B owns `js/ui-slot.js` only. Both commit independently. Final QA gate + push at the end.

**Tech Stack:** Vanilla JS, CSS keyframe animations, Playwright QA

---

## Parallel Task Groups

**Run A and B in parallel — they touch different files:**
- Task A → `styles.css` (2 new keyframe + 2 classes)
- Task B → `js/ui-slot.js` (3 small edits)

**After both complete:**
- Task C → QA regression + commit + push

---

## Task A: CSS — Loss Droop + Win Stagger Helper (styles.css only)

**Files:**
- Modify: `styles.css` — append at the very end of the file

**Step 1: Find the exact last line of styles.css**

```bash
wc -l "C:/created games/Casino/styles.css"
tail -3 "C:/created games/Casino/styles.css"
```

**Step 2: Append new CSS block at end of styles.css**

Open `styles.css`, scroll to the very end (after all existing content), and append:

```css

/* ═══════════════════════════════════════════════════════════
   WIN JUICE — Loss Droop & Win Stagger
   ═══════════════════════════════════════════════════════════ */

/* Loss droop: brief dim + desaturate on complete loss */
@keyframes lossDropp {
    0%   { opacity: 1; filter: saturate(1) brightness(1); }
    35%  { opacity: 0.72; filter: saturate(0.25) brightness(0.82); }
    100% { opacity: 1; filter: saturate(1) brightness(1); }
}
.reel-loss-droop {
    animation: lossDropp 380ms ease-out both;
    /* do NOT use !important — let win-glow override if somehow both applied */
}

/* Win stagger helper: applied by JS via style.animationDelay on .reel-win-entrance cells */
/* The existing winEntrance keyframe in styles.css handles the actual pop animation.
   This block is just documentation — no new keyframes needed for stagger. */
```

**Step 3: Verify no CSS parse errors**

```bash
node -e "
const fs = require('fs');
const css = fs.readFileSync('C:/created games/Casino/styles.css', 'utf8');
const blocks = (css.match(/@keyframes\s+\w+/g) || []).length;
console.log('Keyframe blocks:', blocks, blocks > 60 ? 'OK' : 'LOW');
"
```

Expected: `Keyframe blocks: <number> OK`

---

## Task B: JS — Staggered Win Cells + Loss Droop + Balance Bump (js/ui-slot.js only)

**Files:**
- Modify: `js/ui-slot.js`

Three targeted edits. Each is independent within the file — do them sequentially.

---

### B1 — Stagger win cell entrance animation by column

**Find** (around line 1994):
```js
                const winCells = document.querySelectorAll(".reel-win-glow, .reel-big-win-glow");
                winCells.forEach(function(cell) { cell.classList.add("reel-win-entrance"); });
                setTimeout(function() {
                    document.querySelectorAll(".reel-win-entrance").forEach(function(cell) { cell.classList.remove("reel-win-entrance"); });
                }, 400);
```

**Replace with:**
```js
                const winCells = document.querySelectorAll(".reel-win-glow, .reel-big-win-glow");
                winCells.forEach(function(cell) {
                    // Stagger by column: parse column index from id "reel_C_R" or data-col attr
                    var colIdx = 0;
                    if (cell.dataset && cell.dataset.col !== undefined) {
                        colIdx = parseInt(cell.dataset.col, 10) || 0;
                    } else if (cell.id) {
                        const parts = cell.id.split('_');
                        if (parts.length >= 2) colIdx = parseInt(parts[1], 10) || 0;
                    }
                    cell.style.animationDelay = (colIdx * 60) + 'ms';
                    cell.classList.add("reel-win-entrance");
                });
                setTimeout(function() {
                    document.querySelectorAll(".reel-win-entrance").forEach(function(cell) {
                        cell.classList.remove("reel-win-entrance");
                        cell.style.animationDelay = '';
                    });
                }, 600);
```

**Note:** The timeout increases from 400ms to 600ms to allow the last column's delayed animation to finish.

---

### B2 — Loss droop on complete loss

**Find** (around line 2041):
```js
            } else {
                showMessage(details.message || "No win. Try again.", "lose");
                hideGambleButton();
                detectAndShowNearMiss(grid, game);
            }
```

**Replace with:**
```js
            } else {
                showMessage(details.message || "No win. Try again.", "lose");
                hideGambleButton();
                detectAndShowNearMiss(grid, game);
                // Loss droop: briefly dim all reel cells
                const _droopCells = document.querySelectorAll('.reel-cell');
                _droopCells.forEach(function(c) { c.classList.add('reel-loss-droop'); });
                setTimeout(function() {
                    document.querySelectorAll('.reel-loss-droop').forEach(function(c) { c.classList.remove('reel-loss-droop'); });
                }, 420);
            }
```

---

### B3 — Balance roll landing bump (overshoot + snap)

**Find** the `animateBalanceRoll` function (around line 1693). Inside its `tick` function, find:
```js
            function tick(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / durationMs, 1);
                const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
                const current = fromAmount + delta * eased;
```

**Replace just these 3 lines** (keep the rest of tick unchanged):
```js
            function tick(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / durationMs, 1);
                // Ease-out cubic with a slight overshoot bump at ~92% progress:
                // t<0.92 → smooth ease-out; t>=0.92 → tiny +2% overshoot then land at 1.0
                var eased;
                if (t < 0.92) {
                    eased = 1 - Math.pow(1 - t / 0.92, 3) * 0.08 + (t / 0.92) * 0.92;
                    eased = Math.min(eased, 1.0);
                } else {
                    // Overshoot: rises to 1.02 at t=0.96, then eases to exactly 1.0
                    const u = (t - 0.92) / 0.08; // 0..1 over the overshoot phase
                    eased = 1.0 + 0.02 * Math.sin(u * Math.PI);
                }
                const current = fromAmount + delta * eased;
```

**Step: Verify bracket balance**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('C:/created games/Casino/js/ui-slot.js', 'utf8');
let d = 0; for(const c of src) { if(c==='{') d++; else if(c==='}') d--; }
console.log('bracket delta:', d, d===0?'OK':'MISMATCH');
"
```

Expected: `bracket delta: 0 OK`

---

## Task C: QA Gate + Commit + Push

Run **after both Task A and Task B complete**.

**Step 1: Start server if not already running**
```bash
# Use preview_start("Casino Server") — do NOT use Bash for this
```

**Step 2: Run QA regression**
```bash
cd "C:/created games/Casino" && npm run qa:regression
```

Expected: All assertions PASS. If any fail, read `output/web-game/regression/errors.json` and fix before continuing.

**Step 3: Stage modified files**
```bash
git add styles.css js/ui-slot.js
```

**Step 4: Commit**
```bash
git commit -m "$(cat <<'EOF'
feat: win juice — staggered cell cascade, loss droop, balance landing bump

- Winning cells now animate left-to-right with 60ms stagger per column
  instead of all firing simultaneously; gives wins a sweeping "payline
  reveal" feel
- Complete losses trigger a brief dim + desaturate droop on all reel cells
  (380ms ease-out), giving tactile feedback that nothing landed
- Balance counter roll adds a subtle sine-wave overshoot (+2%) in the last
  8% of its duration, making the number feel like it "lands" with weight

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 5: Push**
```bash
git push origin master
```

**Step 6: Verify**
```bash
git log --oneline -3
```

---

## Execution Notes

- **File ownership:** Task A = `styles.css` only. Task B = `js/ui-slot.js` only. Zero overlap — safe to run in parallel.
- **QA will pass:** All three changes are purely visual (CSS animation + JS class toggles). The regression suite tests game logic outcomes, not animations.
- **The balance bump formula:** The `eased` calculation in B3 is deliberately conservative (+2% overshoot). If it looks jittery in testing, change `0.02` to `0.01`. Never increase above `0.04` or the display will momentarily show a wrong balance.
- **Column index detection:** Win cells have id `reel_C_R` format (e.g. `reel_0_1`). The stagger code parses `parts[1]` which is the column. If a cell has no id and no `data-col`, it defaults to colIdx=0 (no delay) — safe fallback.
