# Cleanup & Modularize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up root directory clutter and split the 5,095-line app.js monolith into focused, maintainable modules for a production slot website.

**Architecture:** Phase 1 moves junk files out of root. Phase 2 extracts app.js into 8 modules loaded via `<script>` tags sharing state through a `window.C` namespace object. Each module is extracted one at a time with QA regression verification between extractions.

**Tech Stack:** Vanilla JS (no bundler), HTML5, CSS3, Playwright (QA regression)

---

## Phase 1: Root Directory Cleanup

### Task 1: Move screenshots to screenshots/ directory

**Files:**
- Create: `screenshots/` directory
- Move: all `*.png` and `*.jpeg` files from root into `screenshots/`
  - Exception: do NOT move `assets/` contents (those are game assets, not screenshots)

**Step 1: Create screenshots directory and move files**

```bash
mkdir -p screenshots
# Move all root-level image files (test/debug artifacts)
git mv *.png screenshots/ 2>/dev/null; git mv *.jpeg screenshots/ 2>/dev/null
```

Note: Some files may not be tracked by git. Use plain `mv` for untracked files, then `git add screenshots/`.

**Step 2: Verify no root screenshots remain**

```bash
ls *.png *.jpeg *.jpg 2>/dev/null
```
Expected: no output (all moved)

**Step 3: Commit**

```bash
git add -A screenshots/ && git add -u
git commit -m "chore: move root screenshots to screenshots/ directory"
```

---

### Task 2: Consolidate Python scripts into scripts/

**Files:**
- Move from root to `scripts/`:
  - `create_missing_thumb.py`
  - `generate_backgrounds.py`
  - `generate_chrome_assets.py`
  - `generate_premium_symbols.py`
  - `generate_sdxl_symbols.py`
  - `generate_symbols.py`

**Step 1: Move Python scripts**

```bash
mv create_missing_thumb.py generate_backgrounds.py generate_chrome_assets.py \
   generate_premium_symbols.py generate_sdxl_symbols.py generate_symbols.py \
   scripts/
```

Also move: `generate_sdxl_log.txt` to `scripts/`

**Step 2: Update any npm scripts that reference moved files**

Check `package.json` scripts - the existing `reasset:slot-chrome` scripts already point to `scripts/reasset_slot_chrome.py` which stays in place. No changes needed.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: consolidate Python scripts into scripts/"
```

---

### Task 3: Move documentation files to docs/

**Files:**
- Move from root to `docs/`:
  - `ENHANCEMENTS.md`
  - `PHASES_1-5_ENHANCEMENTS.md`
  - `PHASES_SUMMARY.txt`
  - `progress.md`
  - `PROJECT_SUMMARY.md`

Keep in root: `README.md`, `QUICK_START.md`, `QA.md` (standard repo docs)

**Step 1: Move doc files**

```bash
mv ENHANCEMENTS.md PHASES_1-5_ENHANCEMENTS.md PHASES_SUMMARY.txt progress.md PROJECT_SUMMARY.md docs/
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: move documentation files to docs/"
```

---

### Task 4: Delete junk files and update demo references

**Files:**
- Delete: `nul` (Windows null device artifact)
- Modify: `index.html` footer disclaimer — remove "demo" language
- Modify: `README.md` — remove "demo" / "entertainment only" language if present

**Step 1: Delete nul**

```bash
rm -f nul
```

**Step 2: Update footer disclaimer in index.html**

In `index.html`, find the footer disclaimer (around line 268):
```html
<p class="footer-disclaimer">
    For entertainment purposes only. This is a demo application. No real money involved.
</p>
```
Replace with:
```html
<p class="footer-disclaimer">
    Play responsibly. 18+ only.
</p>
```

**Step 3: Run QA regression to verify Phase 1 didn't break anything**

```bash
npm run qa:regression
```
Expected: `Casino QA regression passed.`

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete junk files, update footer language"
```

---

## Phase 2: app.js Modularization

### Overview

The current `app.js` contains 238 functions in ~5,095 lines. We will extract them into 8 focused modules that communicate via a shared `window.C` namespace object.

**Load order in index.html:**
```html
<script src="shared/game-definitions.js"></script>
<script src="shared/chrome-styles.js"></script>
<script src="house-edge-client.js"></script>
<script src="sound-manager.js"></script>
<script src="animations.js"></script>
<!-- New modules (dependency order): -->
<script src="js/state.js"></script>
<script src="js/spin-engine.js"></script>
<script src="js/win-logic.js"></script>
<script src="js/ui-lobby.js"></script>
<script src="js/ui-slot.js"></script>
<script src="js/ui-modals.js"></script>
<script src="js/qa-tools.js"></script>
<script src="js/app.js"></script>
```

**Namespace pattern:**
```js
// At top of each module:
window.C = window.C || {};

// Expose public functions:
window.C.loadState = loadState;
window.C.saveBalance = saveBalance;
// etc.

// Access from other modules:
const { balance, stats } = window.C;
```

### Task 5: Create js/ directory and namespace scaffold

**Files:**
- Create: `js/` directory
- Create: `js/namespace.js` (tiny file that initializes `window.C`)

**Step 1: Create the namespace bootstrap**

Create `js/namespace.js`:
```js
// Shared namespace for all casino modules
window.C = window.C || {};
```

**Step 2: Add the script tag to index.html**

Add before the other new module scripts:
```html
<script src="js/namespace.js"></script>
```

**Step 3: Commit**

```bash
git add js/namespace.js index.html
git commit -m "feat: add js/ module directory with shared namespace"
```

---

### Task 6: Extract state.js (balance, stats, achievements, XP, localStorage)

**Files:**
- Create: `js/state.js`
- Modify: `app.js` — remove extracted functions

**Functions to extract** (from app.js grep):
- `createDefaultStats` (line ~828)
- `initBase` (line ~1638)
- `loadState` (line ~1650)
- `saveBalance` (line ~1668)
- `saveStats` (line ~1672)
- `updateStatsSummary` (line ~1676)
- `updateStatsModal` (line ~1684)
- `updateAchievements` (line ~1722)
- `showAchievementNotification` (line ~1763)
- `getXPForLevel` (line ~4285)
- `getTier` (line ~4289)
- `loadXP` (line ~4297)
- `saveXP` (line ~4309)
- `awardXP` (line ~4313)
- `updateXPDisplay` (line ~4330)
- `showToast` (line ~4353)
- `loadDailyBonus`, `saveDailyBonus`, `getTodayStr`, `checkDailyBonusReset` (lines ~4382-4419)
- `loadSettings`, `saveSettings` and all `settings*` functions (lines ~1821-1915)

**Also extract shared constants:**
- `STORAGE_KEYS` (line ~289)
- `DEFAULT_BALANCE` (line ~294)
- `DEFAULT_STATS` (line ~295)

**Step 1: Create js/state.js with all state management functions**

Read the exact function bodies from app.js, copy them into `js/state.js`, and attach public functions to `window.C`.

**Step 2: Remove extracted functions from app.js**

Delete the function blocks that were moved to state.js. Replace references in remaining app.js code with `window.C.functionName` calls where needed.

**Step 3: Add `<script src="js/state.js"></script>` to index.html**

**Step 4: Run QA regression**

```bash
npm run qa:regression
```
Expected: PASS

**Step 5: Commit**

```bash
git add js/state.js app.js index.html
git commit -m "refactor: extract state management to js/state.js"
```

---

### Task 7: Extract spin-engine.js (RNG, grid generation, deterministic mode)

**Files:**
- Create: `js/spin-engine.js`
- Modify: `app.js` — remove extracted functions

**Functions to extract:**
- `SLOT_SYMBOLS` constant (line ~304)
- `getGameSymbols` (line ~307)
- Grid helpers: `getGridCols`, `getGridRows`, `getWinType`, `isMultiRow` (lines ~312-315)
- `createEmptyGrid`, `generateRandomGrid`, `flattenGrid`, `gridFrom1D` (lines ~318-355)
- `generateSpinResult` (line ~356)
- `getRandomSymbol` (line ~2993)
- Wild/scatter helpers: `isWild`, `isScatter`, `countScatters`, `countWilds`, `symbolsMatchWithWild`, `getEffectiveSymbol`, `isTripleMatch`, `getDoubleMatch` (lines ~2999-3047)
- Deterministic mode state and functions: `deterministicMode`, `deterministicSeed`, `forcedSpinQueue`, `queueForcedSpin`, `queueForcedOutcome`, `consumeSpinResult` (lines ~1300-1340)
- `countSymbolInGrid`, `countWildsInGrid` (lines ~647-663)

**Step 1: Create js/spin-engine.js**

**Step 2: Remove from app.js, wire via window.C**

**Step 3: QA regression**

**Step 4: Commit**

```bash
git commit -m "refactor: extract spin engine to js/spin-engine.js"
```

---

### Task 8: Extract win-logic.js (payline/cluster/classic win detection, payouts)

**Files:**
- Create: `js/win-logic.js`
- Modify: `app.js`

**Functions to extract:**
- `getPaylines` (line ~666)
- `findClusters` (line ~738)
- `checkPaylineWins` (line ~782)
- `checkWin` (line ~3100) — the main 400-line win detection function
- Bonus mechanic handlers: `applyBonusMultiplier`, `getMoneyValue`, `getWheelMultiplier` (lines ~3050-3099)

**Step 1-4: Same pattern as above — create, extract, test, commit**

```bash
git commit -m "refactor: extract win detection to js/win-logic.js"
```

---

### Task 9: Extract ui-lobby.js (game cards, search, filters, ticker, recently played)

**Files:**
- Create: `js/ui-lobby.js`
- Modify: `app.js`

**Functions to extract:**
- `createSkeletonCards` (line ~2105)
- `updateBalance` (line ~2119)
- `getBetBounds`, `refreshBetControls` (lines ~2126-2160)
- `renderGames` (line ~2177)
- `addRecentlyPlayed`, `renderRecentlyPlayed` (lines ~2200-2225)
- `startJackpotTicker` (line ~2225)
- `createGameCard` (line ~2234)
- `playRandomHotGame` (line ~2273)
- `setFilter`, `getFilteredGames`, `setProviderFilter`, `renderFilteredGames`, `updateFilterCounts` (lines ~4178-4242)
- `searchGames` (line ~4242)
- `filterGamesBySearch`, `clearGameSearch` (lines ~4958-4972)
- `generateTickerMessage`, `startWinTicker`, `renderTickerContent` (lines ~4658-4701)

**Commit:**
```bash
git commit -m "refactor: extract lobby UI to js/ui-lobby.js"
```

---

### Task 10: Extract ui-slot.js (slot modal, reels, animations, free spins, auto-spin, gamble)

**Files:**
- Create: `js/ui-slot.js`
- Modify: `app.js`

**Functions to extract:**
- Reel strip constants and state (lines ~382-398)
- Theme/chrome functions: `getCellDims`, `getGameTemplate`, `clamp01`, `hexToRgb`, `mixRgb`, `rgbCss`, `hashThemeSeed`, `buildSlotThemeVars`, `applySlotThemeToModal` (lines ~400-525)
- Reel functions: `buildReelGrid`, `renderGrid`, `randomizeStripBuffers`, `renderCell`, `getAllCells`, `getAllColumns` (lines ~525-642)
- Feature popup: `deriveGameRTP`, `deriveGameVolatility`, `buildFeatureList`, `showFeaturePopup`, `dismissFeaturePopup` (lines ~2310-2498)
- `openSlot`, `closeSlot` (lines ~2498-2684)
- Bet display: `updateBetDisplay`, `setPresetBet`, `adjustBet` (lines ~2684-2719)
- Turbo: `toggleTurbo` (line ~2721)
- Win display: `updateSlotWinDisplay` (line ~2730)
- Render: `renderSymbol`, `updateReels`, `updateSingleReel`, `stopReelScrollingImmediately` (lines ~2744-2803)
- `spin`, `displayServerWinResult`, `canUseServerSpin` (lines ~2803-2993)
- `showMessage`, `showWinAnimation` (lines ~3509-3584)
- Free spins: `triggerFreeSpins`, `advanceFreeSpins`, `freeSpinSpin`, `endFreeSpins`, `triggerRespin`, `triggerExpandingWildRespin` (lines ~3588-3862)
- Free spins UI: `showFreeSpinsOverlay`, `showFreeSpinsHUD`, `updateFreeSpinsDisplay`, `hideFreeSpinsDisplay`, `showFreeSpinsSummary` (lines ~3862-4034)
- Autoplay: `toggleAutoSpin`, `stopAutoSpin`, `updateAutoSpinUI`, `runAutoSpin`, `waitForSpinThenContinue`, `checkAutoplayLimits` (lines ~4701-4786)
- Enhanced autoplay: `openAutoplayModal`, `closeAutoplayModal`, `selectAutoplayCount`, `adjustAutoplayLimit`, `updateAutoplayLimitDisplay`, `startEnhancedAutoplay` (lines ~5036-5095)
- Buy bonus: `buyBonus`, `confirmBuyBonus`, `closeBuyBonus`, `updateBuyBonusBtn` (lines ~4976-5022)
- Paytable: `togglePaytable`, `formatSymbolName`, `renderPaytable` (lines ~1919-2027)
- `getSymbolHtml` (line ~270)
- `assetTemplates` (line ~275)

**Commit:**
```bash
git commit -m "refactor: extract slot UI to js/ui-slot.js"
```

---

### Task 11: Extract ui-modals.js (stats, deposit, auth, daily bonus, bonus wheel)

**Files:**
- Create: `js/ui-modals.js`
- Modify: `app.js`

**Functions to extract:**
- Stats modal: `openStatsModal`, `closeStatsModal` (lines ~1798-1808)
- Settings modal: `openSettingsModal`, `closeSettingsModal` (lines ~1837-1857)
- Deposit: `addFunds`, `confirmDeposit`, `closeDepositModal` (lines ~2160-2177)
- Auth system (lines ~5-267): all auth functions (`isServerAuthToken`, `shouldFallbackToLocalAuth`, `clearAuthSession`, `applyAuthSession`, `apiRequest`, `syncServerSession`, `loginWithLocalFallback`, `registerWithLocalFallback`, `login`, `register`, `logout`, `updateAuthButton`, `showAuthModal`, `hideAuthModal`)
- Daily bonus: `showDailyBonusModal`, `closeDailyBonusModal`, `renderDailyCalendar`, `claimDailyBonus` (lines ~4419-4505)
- Bonus wheel: `loadWheelState`, `saveWheelState`, `canSpinWheel`, `drawWheel`, `showBonusWheelModal`, `closeBonusWheelModal`, `spinBonusWheel` (lines ~4505-4658)
- Profit monitor: `toggleProfitMonitor` (line ~4893)

**Commit:**
```bash
git commit -m "refactor: extract modal UIs to js/ui-modals.js"
```

---

### Task 12: Extract qa-tools.js (debug panel, casinoDebug API, URL params)

**Files:**
- Create: `js/qa-tools.js`
- Modify: `app.js`

**Functions to extract:**
- `applyUrlDebugConfig` (line ~1340)
- `getDebugState` (line ~1391)
- All QA helper functions: `getQaNode`, `setQaStatus`, `setQaToolsExpanded`, `refreshQaStateDisplay`, `refreshQaSymbolList`, `initQaTools`, `toggleQaTools`, `applyQaSeed`, `clearQaSeed`, `queueQaOutcome`, `queueQaExactReels`, `clearQaQueue`, `resetQaSession`, `queueAndSpin` (lines ~1400-1638)
- `resetSessionState` (line ~1441)
- `renderGameToText` (line ~4034)

**Commit:**
```bash
git commit -m "refactor: extract QA tools to js/qa-tools.js"
```

---

### Task 13: Slim down app.js to orchestrator

**Files:**
- Modify: `app.js` — should contain only:
  - Keyboard event handler (line ~2031)
  - Screen shake function (line ~2084)
  - Swipe handler (line ~4795)
  - `wireGameHooks` (line ~4082)
  - `toggleFullscreen` (line ~4122)
  - `initAllSystems` (line ~4868)
  - Global state variables (`currentGame`, `currentBet`, `spinning`, `balance`, etc.)
- Modify: `index.html` — update script tag from `app.js` to `js/app.js`, move app.js to `js/`

**Step 1: Move remaining app.js to js/app.js**

**Step 2: Update index.html script tags to final order**

```html
<script src="shared/game-definitions.js"></script>
<script src="shared/chrome-styles.js"></script>
<script src="house-edge-client.js"></script>
<script src="sound-manager.js"></script>
<script src="animations.js"></script>
<script src="js/namespace.js"></script>
<script src="js/state.js"></script>
<script src="js/spin-engine.js"></script>
<script src="js/win-logic.js"></script>
<script src="js/ui-lobby.js"></script>
<script src="js/ui-slot.js"></script>
<script src="js/ui-modals.js"></script>
<script src="js/qa-tools.js"></script>
<script src="js/app.js"></script>
```

**Step 3: Run QA regression — final verification**

```bash
npm run qa:regression
```
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: slim app.js to orchestrator, complete modularization"
```

---

### Task 14: Final smoke test and cleanup commit

**Step 1: Manual browser test**

Open `index.html` via the dev server, verify:
- Lobby loads with game cards
- Search and filter work
- Open a slot, spin, verify win detection
- Free spins trigger
- Stats modal opens with correct data
- Auth modal works
- QA tools panel works
- Balance persists across reload

**Step 2: Run QA regression one final time**

```bash
npm run qa:regression
```

**Step 3: Update README.md with new file structure**

Add a "Project Structure" section reflecting the new `js/`, `screenshots/`, and `docs/` directories.

**Step 4: Final commit**

```bash
git add -A
git commit -m "docs: update README with new project structure"
```

---

## Notes

- **Global variables**: Many functions in app.js reference globals like `balance`, `currentGame`, `currentBet`, `spinning`, `stats`, etc. These will live in the `window.C` namespace or remain as module-level variables in `js/app.js` and be accessed via the namespace.
- **Inline onclick handlers**: `index.html` has many `onclick="functionName()"` handlers. These functions must remain on `window` (global scope). Each module should expose them: `window.spin = spin;` etc.
- **The matrix rain canvas animation and auth tab switching stay inline in index.html** — they're self-contained and small enough.
- **No bundler needed** — this is a static site served via a simple HTTP server. Script tags in dependency order are sufficient.
