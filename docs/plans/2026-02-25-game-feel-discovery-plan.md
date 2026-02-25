# Game Feel & Discovery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make spinning feel more exciting (real scatter anticipation, retrigger banner) and help players discover games they'll enjoy ("You Might Like" personalized row).

**Architecture:** Two parallel agents on separate files. Agent 1 adds scatter tension tracking + retrigger banner to `js/ui-slot.js` and CSS to `styles.css`. Agent 2 adds the personalized "You Might Like" lobby row to `js/ui-lobby.js` (no index.html changes — dynamically injected).

**Tech Stack:** Vanilla JS global scope, CSS keyframe animations, localStorage

---

## Parallel Task Groups

**Group A (parallel — no shared files):**
- Task 1 → `js/ui-slot.js` + `styles.css` (scatter anticipation + retrigger banner)
- Task 2 → `js/ui-lobby.js` only (you might like row)

**Group B (sequential after Group A):**
- Task 3 → QA + commit + push

---

### Task 1: Scatter anticipation + retrigger banner (js/ui-slot.js + styles.css)

**Files:**
- Modify: `js/ui-slot.js`
- Modify: `styles.css`

**Background:** Scatters trigger free spins. Real slot machines build tension as each scatter lands — remaining reels slow and glow when 2+ scatters are already showing. Currently `checkAnticipation` only checks mid-row symbol match on the last reel. We replace this with real scatter counting per column stop.

---

#### 1a — Add scatter-tension CSS to styles.css

Append at the end of `styles.css`:

```css
/* ═══════════════════════════════════════════════════════════
   SCATTER ANTICIPATION TENSION
   ═══════════════════════════════════════════════════════════ */
@keyframes scatterTensionPulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(255,215,0,0); }
  50%       { box-shadow: inset 0 0 0 2px rgba(255,215,0,0.6), 0 0 16px rgba(255,215,0,0.25); }
}
@keyframes scatterPrimedPulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(255,80,0,0.2); }
  40%       { box-shadow: inset 0 0 0 3px rgba(255,130,0,0.9), 0 0 24px rgba(255,100,0,0.5); }
}
.reel-scatter-tension {
    animation: scatterTensionPulse 0.7s ease-in-out infinite;
    border-radius: 8px;
}
.reel-scatter-primed {
    animation: scatterPrimedPulse 0.45s ease-in-out infinite;
    border-radius: 8px;
}
```

---

#### 1b — Add `_countScattersOnCols` helper in ui-slot.js

Find the `checkAnticipation` function:
```js
        function checkAnticipation(colIdx, grid) {
```

INSERT the following new function BEFORE it (on the line above it):

```js
        // Count scatter symbols on all columns up to and including maxColIdx.
        // Used for real scatter anticipation tension on intermediate reels.
        function _countScattersOnCols(maxColIdx, grid, game) {
            if (!grid || !game || !game.scatterSymbol) return 0;
            const rows = getGridRows(game);
            let count = 0;
            for (let c = 0; c <= maxColIdx; c++) {
                if (!grid[c]) continue;
                for (let r = 0; r < rows; r++) {
                    if (grid[c][r] === game.scatterSymbol) count++;
                }
            }
            return count;
        }

```

---

#### 1c — Replace the scatter anticipation block in the stopDelays.forEach loop

Find this exact block (inside the `stopDelays.forEach` loop):
```js
                    // Trigger reel anticipation on last reel(s) when 2 matching middle symbols seen
                    if (!turboMode && colIdx === cols - 1 && checkAnticipation(colIdx, finalGrid)) {
                        const colEl = document.getElementById('reelCol' + colIdx);
                        if (colEl) {
                            colEl.classList.add('reel-anticipation');
                            setTimeout(function() { colEl.classList.remove('reel-anticipation'); }, 700);
                        }
                        if (typeof playSound === 'function') playSound('scatter');
                    }
```

Replace with:
```js
                    // ── Enhanced scatter anticipation ──
                    // Remove tension from this column as it stops
                    const _stopEl = document.getElementById('reelCol' + colIdx);
                    if (_stopEl) _stopEl.classList.remove('reel-scatter-tension', 'reel-scatter-primed');

                    if (!turboMode && spinGame && spinGame.scatterSymbol) {
                        const _scattersSoFar = _countScattersOnCols(colIdx, finalGrid, spinGame);

                        if (_scattersSoFar >= 2 && colIdx < cols - 1) {
                            // 2+ scatters confirmed — apply tension to all remaining spinning reels
                            for (let _rem = colIdx + 1; _rem < cols; _rem++) {
                                const _remEl = document.getElementById('reelCol' + _rem);
                                if (_remEl) {
                                    _remEl.classList.remove('reel-scatter-tension', 'reel-scatter-primed');
                                    _remEl.classList.add(_scattersSoFar >= 3 ? 'reel-scatter-primed' : 'reel-scatter-tension');
                                }
                            }
                            if (typeof playSound === 'function') playSound('scatter');
                        }

                        // Legacy last-reel anticipation (symbol match) — keep as fallback
                        if (colIdx === cols - 1 && checkAnticipation(colIdx, finalGrid)) {
                            const _lastEl = document.getElementById('reelCol' + colIdx);
                            if (_lastEl) {
                                _lastEl.classList.add('reel-anticipation');
                                setTimeout(function() { _lastEl.classList.remove('reel-anticipation'); }, 700);
                            }
                        }
                    }
```

---

#### 1d — Clean up tension classes when spin resolves

Find the line inside the `animateReelStop` last-column block:
```js
            if (colIdx === cols - 1) {
                if (spinInterval) clearInterval(spinInterval);
                currentGrid = finalGrid;
```

After `currentGrid = finalGrid;` add:
```js
                // Clear any lingering scatter tension from all reels
                document.querySelectorAll('.reel-scatter-tension, .reel-scatter-primed').forEach(function(el) {
                    el.classList.remove('reel-scatter-tension', 'reel-scatter-primed');
                });
```

---

#### 1e — Add prominent retrigger banner function

Find `window.showRetriggerBanner` or — it doesn't exist yet. After the `endFreeSpins` function (find its closing `}`), add:

```js

        // Shows a prominent "+N FREE SPINS!" retrigger banner on the FS HUD
        window.showRetriggerBanner = function(extraSpins) {
            var overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) return;
            var prev = overlay.querySelector('.fs-retrigger-banner');
            if (prev) prev.remove();
            var banner = document.createElement('div');
            banner.className = 'fs-retrigger-banner';
            banner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);'
                + 'background:linear-gradient(135deg,#ff6d00,#ffd740);color:#1a1a2e;font-weight:900;'
                + 'font-size:clamp(20px,5vw,32px);letter-spacing:2px;border-radius:12px;'
                + 'padding:14px 28px;text-align:center;z-index:200;white-space:nowrap;'
                + 'box-shadow:0 4px 32px rgba(255,109,0,0.7);pointer-events:none;'
                + 'transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;opacity:0;';
            banner.textContent = '+' + extraSpins + ' FREE SPINS!';
            overlay.style.position = 'relative';
            overlay.appendChild(banner);
            requestAnimationFrame(function() { requestAnimationFrame(function() {
                banner.style.transform = 'translate(-50%,-50%) scale(1)';
                banner.style.opacity = '1';
            }); });
            setTimeout(function() {
                banner.style.transform = 'translate(-50%,-50%) scale(0.8)';
                banner.style.opacity = '0';
                setTimeout(function() { if (banner.parentNode) banner.remove(); }, 350);
            }, 2200);
        };
```

---

#### 1f — Call showRetriggerBanner from win-logic.js

In `js/win-logic.js`, find this block (inside the scatter retrigger section):
```js
                        freeSpinsRemaining += capped;
                        message += ` +${capped} EXTRA FREE SPINS!`;
                        updateFreeSpinsDisplay();
                        showBonusEffect(`+${capped} FREE SPINS!`, '#fbbf24');
```

Add one line after `showBonusEffect(...)`:
```js
                        if (typeof showRetriggerBanner === 'function') showRetriggerBanner(capped);
```

---

#### 1g — Verify

```bash
cd "C:/created games/Casino"
node -e "const fs=require('fs');const s=fs.readFileSync('js/ui-slot.js','utf8');console.log('ui-slot lines:',s.split('\n').length)"
node -e "const fs=require('fs');const s=fs.readFileSync('js/win-logic.js','utf8');console.log('win-logic lines:',s.split('\n').length)"
```

---

### Task 2: "You Might Like" personalized lobby row (js/ui-lobby.js only)

**Files:**
- Modify: `js/ui-lobby.js`

**Goal:** After the Recently Played section, show up to 6 games that share the same mechanic category as the player's most recently played games. Dynamically injected — no index.html changes.

---

#### 2a — Add `renderYouMightLike` function

After the `renderRecentlyPlayed` function (find its closing `}`), add:

```js

        function renderYouMightLike() {
            // Clean up stale section if games list not ready
            if (!games || games.length === 0) return;

            // Get recently played IDs
            let recentIds = [];
            try { recentIds = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; } catch(e) {}
            if (recentIds.length < 2) {
                // Not enough play history — hide the section
                const old = document.getElementById('youMightLikeSection');
                if (old) old.style.display = 'none';
                return;
            }

            // Determine dominant mechanic category from recent games
            const recentGames = recentIds.map(id => games.find(g => g.id === id)).filter(Boolean);
            const categoryCounts = {};
            recentGames.forEach(g => {
                const cat = _getMechanicCategory(g);
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            // Pick the most-played category (excluding 'other')
            let topCat = 'other';
            let topCount = 0;
            Object.entries(categoryCounts).forEach(([cat, count]) => {
                if (cat !== 'other' && count > topCount) { topCat = cat; topCount = count; }
            });
            // If all are 'other', pick any
            if (topCat === 'other') {
                topCat = Object.keys(categoryCounts)[0] || 'other';
            }

            // Find candidate games: same mechanic, not recently played, not in same game
            const recentSet = new Set(recentIds);
            const candidates = games.filter(g => !recentSet.has(g.id) && _getMechanicCategory(g) === topCat);

            if (candidates.length === 0) {
                const old = document.getElementById('youMightLikeSection');
                if (old) old.style.display = 'none';
                return;
            }

            // Shuffle and take up to 6
            const shuffled = candidates.slice().sort(() => Math.random() - 0.5).slice(0, 6);

            const catLabels = {
                tumble: '🌊 Tumble Games', hold_win: '🎯 Hold & Win', free_spins: '🎁 Free Spins',
                wilds: '🌟 Wild Games', jackpot: '🏆 Jackpot Games', other: '🎰 Similar Games'
            };
            const label = catLabels[topCat] || 'Similar Games';

            // Inject or update section
            let section = document.getElementById('youMightLikeSection');
            if (!section) {
                section = document.createElement('div');
                section.id = 'youMightLikeSection';
                // Insert after recentlyPlayedSection, or before allGames header
                const recentSec = document.getElementById('recentlyPlayedSection');
                if (recentSec && recentSec.parentNode) {
                    recentSec.parentNode.insertBefore(section, recentSec.nextSibling);
                } else {
                    const allGames = document.getElementById('allGames');
                    if (allGames && allGames.parentNode) allGames.parentNode.insertBefore(section, allGames);
                }
            }

            section.style.display = '';
            section.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title" style="font-size:14px">${label}<span class="yml-because">because you play ${recentGames[0] ? recentGames[0].name : 'similar games'}</span></h3>
                </div>
                <div class="recently-played-scroll" id="youMightLikeGames">
                    ${shuffled.map(g => createGameCard(g)).join('')}
                </div>`;
        }
```

---

#### 2b — Call `renderYouMightLike` from `renderRecentlyPlayed`

Find the end of `renderRecentlyPlayed`:
```js
            container.innerHTML = recentGames.map(g => createGameCard(g)).join('');
        }
```

Replace with:
```js
            container.innerHTML = recentGames.map(g => createGameCard(g)).join('');
            renderYouMightLike();
        }
```

---

#### 2c — Also call it from `renderGames` to handle initial load when history exists

Find in `renderGames` where `renderRecentlyPlayed()` is called (there should be one call). After it, add:
```js
                renderYouMightLike();
```

---

#### 2d — Add CSS for the "because you play" subtitle (styles.css — append after Task 1's CSS)

**NOTE: This CSS edit must happen AFTER Task 1 writes its CSS block, OR be appended in a separate pass. If running in parallel, Agent 2 must NOT write styles.css — Agent 1 owns styles.css. Agent 2 only touches ui-lobby.js.**

The `.yml-because` style is inline-able. Add inline in the HTML string instead of a CSS class:
Replace `<span class="yml-because">` with:
```html
<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.35);margin-left:8px;font-style:italic;">
```

---

#### 2e — Verify

```bash
cd "C:/created games/Casino"
node -e "const fs=require('fs');const s=fs.readFileSync('js/ui-lobby.js','utf8');console.log('ui-lobby lines:',s.split('\n').length)"
```

---

### Task 3: QA regression + commit + push

```bash
cd "C:/created games/Casino"
npm run qa:regression
```

Expected: All tests pass.

```bash
git add js/ui-slot.js js/win-logic.js js/ui-lobby.js styles.css
git commit -m "feat: scatter anticipation tension, retrigger banner, you-might-like lobby row

- Scatter anticipation: count scatters on stopped reels in real-time; apply
  gold pulse (2 scatters) or orange primed glow (3+ scatters) to remaining
  spinning reels; clean up on spin completion
- Retrigger banner: prominent pop-up '+N FREE SPINS!' overlay on free spins
  HUD when scatters retrigger during a bonus round
- Lobby personalization: 'You Might Like' section after Recently Played,
  showing up to 6 games matching the dominant mechanic category of recent
  play history (Tumble / Hold & Win / Free Spins / Wilds / Jackpot)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin master
```

---

## Implementation Notes

### Scatter anticipation timing
The `stopDelays.forEach` fires the callback at `delay` ms. At that point, `finalGrid` already holds the complete result (pre-fetched from server or generated). So `_countScattersOnCols(colIdx, finalGrid, spinGame)` reads the *already-decided* scatter positions — we're not predicting, we're revealing tension to the player as each column's result becomes visible, exactly matching how real slots work.

### Tension class cleanup
Classes `.reel-scatter-tension` and `.reel-scatter-primed` are removed:
1. When a column stops (before animating, remove from that col)
2. When all columns have stopped (inside `if (colIdx === cols - 1)` block)
3. Turbo mode bypasses all anticipation (already guarded by `!turboMode`)

### You Might Like injection
No static HTML changes. The section is injected after `recentlyPlayedSection` in the DOM. If `recentlyPlayedSection` doesn't exist yet, it falls back to inserting before `allGames`. Shows only when `recentIds.length >= 2` (enough play history to have a dominant category).

### File ownership (for parallel agents)
- Agent 1 owns: `js/ui-slot.js`, `js/win-logic.js`, `styles.css`
- Agent 2 owns: `js/ui-lobby.js` only
