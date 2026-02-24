# New Games + Tumble Visual Cascade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 12 new slot games (3 each for wild_collect, mystery_stacks, coin_respin, chamber_spins) to bring underrepresented mechanics from 1 game each to 4, and add a visual tumble-burst cascade animation for the 22 existing tumble/avalanche games.

**Architecture:** Two independent workstreams. Workstream A touches only `shared/game-definitions.js` and `shared/chrome-styles.js`. Workstream B touches only `js/ui-slot.js` (CSS injection + new function). They never conflict. QA regression gates the commit.

**Tech Stack:** Vanilla JS, CSS keyframe animations, existing `playSound` + `showBonusEffect` APIs.

---

## WORKSTREAM A — 12 New Game Definitions

### Task A1: Add 12 games to `shared/game-definitions.js`

**File:** `shared/game-definitions.js`

Find the last game (Crown of Power, id `power_crown`) and its closing `},`. Insert all 12 new games **after** that closing `},` and **before** the `];` that ends the games array.

**Step 1: Locate insertion point**

Find: `payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2000, hot: false, jackpot: 1 }`
followed by `];`

**Step 2: Insert the 12 new game definitions**

```javascript

    // ═══ 81. Wild Safari Express — 5×3, Wild Collect ═══
    { id: 'wild_safari', name: 'Wild Safari Express', provider: 'IronReel Entertainment', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/wild_safari.png', bgGradient: 'linear-gradient(135deg, #e65100 0%, #2e7d32 100%)',
      symbols: ['s1_elephant','s2_giraffe','s3_zebra','s4_lion','s5_binoculars','wild_jeep'],
      reelBg: 'linear-gradient(180deg, #1a0e00 0%, #0a0700 100%)', accentColor: '#ffb300',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_jeep', scatterSymbol: 's5_binoculars',
      bonusType: 'wild_collect', freeSpinsCount: 10, freeSpinsRetrigger: true,
      wildCollectMultiplier: [2, 3, 5, 10],
      bonusDesc: 'Wild Safari Express: 5×3 — Wild Jeep collects multipliers! Up to 10x during free spins!',
      payouts: { triple: 85, double: 9, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 2000, hot: true, jackpot: 0 },

    // ═══ 82. Wild Deep Ocean — 5×4, Wild Collect ═══
    { id: 'wild_deep', name: 'Wild Deep Ocean', provider: 'VaultX Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/wild_deep.png', bgGradient: 'linear-gradient(135deg, #006064 0%, #1a237e 100%)',
      symbols: ['s1_starfish','s2_octopus','s3_anglerfish','s4_whale','s5_trident','wild_kraken'],
      reelBg: 'linear-gradient(180deg, #001225 0%, #000810 100%)', accentColor: '#00e5ff',
      gridCols: 5, gridRows: 4, template: 'extended', winType: 'payline',
      wildSymbol: 'wild_kraken', scatterSymbol: 's5_trident',
      bonusType: 'wild_collect', freeSpinsCount: 12, freeSpinsRetrigger: true,
      wildCollectMultiplier: [2, 4, 6, 12],
      bonusDesc: 'Wild Deep Ocean: 5×4 — The Kraken wild collects multipliers! Max 12x during free spins!',
      payouts: { triple: 95, double: 9, wildTriple: 140, scatterPay: 4 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    // ═══ 83. Reel Wild West — 5×3, Wild Collect ═══
    { id: 'wild_west_rush', name: 'Reel Wild West', provider: 'VaultX Gaming', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/wild_west_rush.png', bgGradient: 'linear-gradient(135deg, #5d4037 0%, #f57f17 100%)',
      symbols: ['s1_cactus','s2_lasso','s3_horseshoe','s4_revolver','s5_sheriff_badge','wild_outlaw'],
      reelBg: 'linear-gradient(180deg, #1a0e00 0%, #0a0700 100%)', accentColor: '#f57f17',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_outlaw', scatterSymbol: 's5_sheriff_badge',
      bonusType: 'wild_collect', freeSpinsCount: 8, freeSpinsRetrigger: true,
      wildCollectMultiplier: [3, 5, 8, 15],
      bonusDesc: 'Reel Wild West: 5×3 — Outlaw wilds collect bounties! Up to 15x multiplier on wins!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 2000, hot: true, jackpot: 0 },

    // ═══ 84. Golden Pharaoh's Secret — 5×3, Mystery Stacks ═══
    { id: 'golden_pharaoh', name: "Golden Pharaoh's Secret", provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/golden_pharaoh.png', bgGradient: 'linear-gradient(135deg, #bf8900 0%, #6d0025 100%)',
      symbols: ['s1_scarab','s2_canopic','s3_eye_ra','s4_ankh','s5_pharaoh','wild_gold_mask'],
      reelBg: 'linear-gradient(180deg, #1a0e00 0%, #090400 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_gold_mask', scatterSymbol: 's5_pharaoh',
      bonusType: 'mystery_stacks', freeSpinsCount: 10, freeSpinsRetrigger: true,
      mysteryRevealMultipliers: [1, 2, 5, 20, 100, 5000],
      bonusDesc: "Golden Pharaoh's Secret: 5×3 — Mystery stacks reveal divine multipliers up to 5,000x!",
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: true, jackpot: 0 },

    // ═══ 85. Mystic Cauldron — 5×3, Mystery Stacks ═══
    { id: 'mystic_cauldron', name: 'Mystic Cauldron', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mystic_cauldron.png', bgGradient: 'linear-gradient(135deg, #1b5e20 0%, #4a148c 100%)',
      symbols: ['s1_mushroom','s2_spider','s3_potion','s4_crystal_ball','s5_witch','wild_hex'],
      reelBg: 'linear-gradient(180deg, #0d1b0d 0%, #060a0f 100%)', accentColor: '#76ff03',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_hex', scatterSymbol: 's5_witch',
      bonusType: 'mystery_stacks', freeSpinsCount: 8, freeSpinsRetrigger: true,
      mysteryRevealMultipliers: [1, 3, 7, 15, 77, 3000],
      bonusDesc: 'Mystic Cauldron: 5×3 — The cauldron reveals mystery multipliers up to 3,000x!',
      payouts: { triple: 85, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // ═══ 86. Crystal Shrine — 5×4, Mystery Stacks ═══
    { id: 'crystal_shrine', name: 'Crystal Shrine', provider: 'Celestial Plays', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/crystal_shrine.png', bgGradient: 'linear-gradient(135deg, #00acc1 0%, #9c27b0 100%)',
      symbols: ['s1_quartz','s2_amethyst','s3_topaz','s4_sapphire','s5_crystal_titan','wild_prism'],
      reelBg: 'linear-gradient(180deg, #0a0a2e 0%, #050510 100%)', accentColor: '#e040fb',
      gridCols: 5, gridRows: 4, template: 'extended', winType: 'payline',
      wildSymbol: 'wild_prism', scatterSymbol: 's5_crystal_titan',
      bonusType: 'mystery_stacks', freeSpinsCount: 12, freeSpinsRetrigger: true,
      mysteryRevealMultipliers: [1, 2, 5, 25, 250, 10000],
      bonusDesc: 'Crystal Shrine: 5×4 — Prism mystery stacks refract into huge wins! Max 10,000x reveal!',
      payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 4 }, minBet: 0.20, maxBet: 5000, hot: true, jackpot: 0 },

    // ═══ 87. Lucky Dragon Coins — 5×3, Coin Respin ═══
    { id: 'dragon_coins', name: 'Lucky Dragon Coins', provider: 'SolsticeFX', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/dragon_coins.png', bgGradient: 'linear-gradient(135deg, #b71c1c 0%, #ffd600 100%)',
      symbols: ['s1_fan','s2_lantern','s3_koi','s4_tiger','s5_dragon','wild_pearl'],
      reelBg: 'linear-gradient(180deg, #1a0000 0%, #0a0000 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_pearl', scatterSymbol: 's5_dragon',
      bonusType: 'coin_respin', freeSpinsCount: 10, freeSpinsRetrigger: false,
      coinRespinValues: [5, 20, 50, 200, 1000],
      holdAndWinRespins: 3,
      bonusDesc: 'Lucky Dragon Coins: 5×3 — Dragon awakens coin respins! Grand Jackpot 1,000x!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2000, hot: true, jackpot: 1 },

    // ═══ 88. Gold Mine Coins — 5×3, Coin Respin ═══
    { id: 'mine_coins', name: 'Gold Mine Coins', provider: 'VaultX Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mine_coins.png', bgGradient: 'linear-gradient(135deg, #4e342e 0%, #fdd835 100%)',
      symbols: ['s1_pickaxe','s2_minecart','s3_dynamite','s4_gold_nugget','s5_gold_vein','wild_miner'],
      reelBg: 'linear-gradient(180deg, #1a1000 0%, #0a0800 100%)', accentColor: '#fdd835',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_miner', scatterSymbol: 's5_gold_vein',
      bonusType: 'coin_respin', freeSpinsCount: 8, freeSpinsRetrigger: false,
      coinRespinValues: [10, 50, 100, 500, 2000],
      holdAndWinRespins: 3,
      bonusDesc: 'Gold Mine Coins: 5×3 — Dig for coin respins! Strike the Mega Jackpot 2,000x!',
      payouts: { triple: 75, double: 8, wildTriple: 110, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 1 },

    // ═══ 89. Money Vault — 5×3, Coin Respin ═══
    { id: 'vault_coins', name: 'Money Vault', provider: 'IronReel Entertainment', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/vault_coins.png', bgGradient: 'linear-gradient(135deg, #263238 0%, #ffd700 100%)',
      symbols: ['s1_safe','s2_briefcase','s3_stack_cash','s4_gold_bar','s5_vault_door','wild_vault'],
      reelBg: 'linear-gradient(180deg, #0a0f12 0%, #050810 100%)', accentColor: '#ffd700',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_vault', scatterSymbol: 's5_vault_door',
      bonusType: 'coin_respin', freeSpinsCount: 12, freeSpinsRetrigger: false,
      coinRespinValues: [25, 100, 500, 5000],
      holdAndWinRespins: 3,
      jackpots: { mini: 50, major: 500, grand: 5000 },
      bonusDesc: 'Money Vault: 5×3 — Heist the vault! Coin respins unlock Grand Jackpot 5,000x!',
      payouts: { triple: 85, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 5000, hot: false, jackpot: 1 },

    // ═══ 90. Demon Chambers — 5×3, Chamber Spins ═══
    { id: 'demon_chambers', name: 'Demon Chambers', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/demon_chambers.png', bgGradient: 'linear-gradient(135deg, #4a0000 0%, #7b1fa2 100%)',
      symbols: ['s1_skull','s2_pentagram','s3_hellfire','s4_demon_wing','s5_overlord','wild_inferno'],
      reelBg: 'linear-gradient(180deg, #1a0000 0%, #0a0000 100%)', accentColor: '#ff1744',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_inferno', scatterSymbol: 's5_overlord',
      bonusType: 'chamber_spins', freeSpinsCount: 12, freeSpinsRetrigger: true,
      chamberLevels: ['purgatory_10fs', 'hellmouth_15fs_2x', 'inferno_20fs_4x', 'overlord_30fs_reel_wild'],
      bonusDesc: 'Demon Chambers: 5×3 — Descend 4 hellish chambers! Wild reel unleashed in Overlord chamber!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    // ═══ 91. Norse Vaults — 5×3, Chamber Spins ═══
    { id: 'norse_vaults', name: 'Norse Vaults', provider: 'NovaSpin Studios', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/norse_vaults.png', bgGradient: 'linear-gradient(135deg, #1a237e 0%, #546e7a 100%)',
      symbols: ['s1_rune_stone','s2_mjolnir','s3_longship','s4_valkyrie','s5_odin','wild_yggdrasil'],
      reelBg: 'linear-gradient(180deg, #050a1a 0%, #020510 100%)', accentColor: '#7986cb',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_yggdrasil', scatterSymbol: 's5_odin',
      bonusType: 'chamber_spins', freeSpinsCount: 15, freeSpinsRetrigger: true,
      chamberLevels: ['midgard_10fs', 'asgard_15fs_2x', 'valhalla_20fs_3x_wild', 'ragnarok_25fs_5x_2wilds'],
      bonusDesc: 'Norse Vaults: 5×3 — Journey through 4 realms! Ragnarök unleashes 5x with 2 wild reels!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    // ═══ 92. Crystal Chambers — 5×3, Chamber Spins ═══
    { id: 'crystal_chambers', name: 'Crystal Chambers', provider: 'Celestial Plays', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/crystal_chambers.png', bgGradient: 'linear-gradient(135deg, #00838f 0%, #6a1b9a 100%)',
      symbols: ['s1_shard','s2_geode','s3_prism_gem','s4_diamond_heart','s5_crystal_titan','wild_crystal'],
      reelBg: 'linear-gradient(180deg, #0a0a20 0%, #050510 100%)', accentColor: '#e040fb',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_crystal', scatterSymbol: 's5_crystal_titan',
      bonusType: 'chamber_spins', freeSpinsCount: 12, freeSpinsRetrigger: true,
      chamberLevels: ['quartz_10fs', 'sapphire_15fs_2x', 'ruby_20fs_4x', 'diamond_25fs_wild_reel'],
      bonusDesc: 'Crystal Chambers: 5×3 — Four gem chambers! Diamond chamber unlocks wild reel! Max 8x!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 }
```

**Step 3: Verify game count**
```bash
node -e "const g=require('./shared/game-definitions.js'); console.log('Games:', g.length);"
```
Expected: `Games: 92`

---

### Task A2: Add 12 chrome-style entries to `shared/chrome-styles.js`

**File:** `shared/chrome-styles.js`

Find the ARCADEFORGE section ending with `'elvis_frog': 'arcadeforge'`. Add the 12 new entries after it, before the closing `};` of `GAME_CHROME_STYLES`.

```javascript
    // ── WILD COLLECT additions ────────────────────────────────────────
    'wild_safari':       'ironreel',     // Wild Safari Express
    'wild_deep':         'vaultx',       // Wild Deep Ocean
    'wild_west_rush':    'vaultx',       // Reel Wild West

    // ── MYSTERY STACKS additions ─────────────────────────────────────
    'golden_pharaoh':    'phantomworks', // Golden Pharaoh's Secret
    'mystic_cauldron':   'phantomworks', // Mystic Cauldron
    'crystal_shrine':    'celestial',    // Crystal Shrine

    // ── COIN RESPIN additions ─────────────────────────────────────────
    'dragon_coins':      'solstice',     // Lucky Dragon Coins
    'mine_coins':        'vaultx',       // Gold Mine Coins
    'vault_coins':       'ironreel',     // Money Vault

    // ── CHAMBER SPINS additions ───────────────────────────────────────
    'demon_chambers':    'phantomworks', // Demon Chambers
    'norse_vaults':      'novaspin',     // Norse Vaults
    'crystal_chambers':  'celestial',    // Crystal Chambers
```

**Step: Verify no syntax errors**
```bash
node -e "require('./shared/chrome-styles.js'); console.log('OK');"
```
Expected: `OK`

---

## WORKSTREAM B — Tumble Visual Cascade Animation

### Task B1: Add CSS + `triggerTumbleCascade` function to `js/ui-slot.js`

**File:** `js/ui-slot.js`

Two sub-steps: CSS injection and the animation function.

#### B1a — CSS injection (id-guarded, one-time)

Find the existing `_injectPaylineFlashCss` function in `js/ui-slot.js`. Add a new CSS injection function immediately after it:

```javascript
        function _injectTumbleCss() {
            if (document.getElementById('tumbleCascadeCss')) return;
            const st = document.createElement('style');
            st.id = 'tumbleCascadeCss';
            st.textContent = [
                '@keyframes tumbleBurst {',
                '  0%   { transform: scale(1)    rotate(0deg);    opacity: 1; filter: brightness(1); }',
                '  40%  { transform: scale(1.35) rotate(8deg);    opacity: 0.9; filter: brightness(2.5); }',
                '  100% { transform: scale(0.05) rotate(-12deg);  opacity: 0; filter: brightness(3); }',
                '}',
                '@keyframes tumbleDrop {',
                '  0%   { transform: translateY(-32px); opacity: 0; }',
                '  60%  { transform: translateY(4px);   opacity: 0.8; }',
                '  100% { transform: translateY(0);     opacity: 1; }',
                '}',
                '.reel-tumble-burst { animation: tumbleBurst 480ms cubic-bezier(0.4,0,0.6,1) forwards !important; pointer-events: none; }',
                '.reel-tumble-drop  { animation: tumbleDrop  380ms cubic-bezier(0.34,1.56,0.64,1) forwards; }'
            ].join('\n');
            document.head.appendChild(st);
        }
```

#### B1b — Cascade trigger function

Add immediately after `_injectTumbleCss`:

```javascript
        function triggerTumbleCascade(game) {
            if (!game || (game.bonusType !== 'tumble' && game.bonusType !== 'avalanche')) return;
            _injectTumbleCss();

            var cols = getGridCols(game);
            var rows = getGridRows(game);

            // Collect winning cells (those already highlighted with reel-win-glow)
            var winCols = {};
            for (var c = 0; c < cols; c++) {
                for (var r = 0; r < rows; r++) {
                    var cell = document.getElementById('reel_' + c + '_' + r);
                    if (cell && cell.classList.contains('reel-win-glow')) {
                        if (!winCols[c]) winCols[c] = [];
                        winCols[c].push(r);
                        cell.classList.add('reel-tumble-burst');
                    }
                }
            }

            // For each column that had wins, apply tumble-drop to the non-winning cells
            var burstDur = 480;
            setTimeout(function() {
                Object.keys(winCols).forEach(function(c) {
                    var winRows = winCols[c];
                    for (var r = 0; r < rows; r++) {
                        if (winRows.indexOf(r) === -1) {
                            var cell = document.getElementById('reel_' + c + '_' + r);
                            if (cell) {
                                cell.classList.add('reel-tumble-drop');
                                var _c = cell;
                                setTimeout(function() { _c.classList.remove('reel-tumble-drop'); }, 420);
                            }
                        }
                    }
                });
            }, burstDur - 80); // start drop slightly before burst ends for overlap
        }
```

#### B1c — Wire into win display

In `js/ui-slot.js`, find the `displayServerWinResult` function. After the line that calls `showWinAnimation(winAmount)` (inside the win > 0 branch), add:

```javascript
                // Tumble visual cascade for tumble/avalanche games
                if (currentGame && (currentGame.bonusType === 'tumble' || currentGame.bonusType === 'avalanche')) {
                    setTimeout(function() { triggerTumbleCascade(currentGame); }, 60);
                }
```

Also find the `checkWin` function (in `win-logic.js`) — no changes needed there.
Find the second place in `displayServerWinResult` where `showWinAnimation` is called and apply the same block if it's inside a different code path.

**Bracket check:**
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('js/ui-slot.js','utf8');let d=0;for(const c of s){if(c==='{')d++;else if(c==='}')d--;}console.log('bracket delta:',d,d===0?'OK':'MISMATCH');"
```

---

## Task C: QA Gate + Commit

**Step 1:** `npm run qa:regression` — must PASS.

**Step 2:** Stage files:
```bash
git add shared/game-definitions.js shared/chrome-styles.js js/ui-slot.js
```

**Step 3:** Commit:
```bash
git commit -m "$(cat <<'EOF'
feat: 12 new games + tumble visual cascade animation

New games (wild_collect x3, mystery_stacks x3, coin_respin x3, chamber_spins x3):
- Wild Safari Express, Wild Deep Ocean, Reel Wild West (wild_collect)
- Golden Pharaoh's Secret, Mystic Cauldron, Crystal Shrine (mystery_stacks)
- Lucky Dragon Coins, Gold Mine Coins, Money Vault (coin_respin)
- Demon Chambers, Norse Vaults, Crystal Chambers (chamber_spins)
Total library: 80 → 92 games

Tumble visual cascade:
- Winning symbols burst-explode (scale + rotate + glow → 0) in tumble/avalanche games
- Non-winning cells in the same columns play tumble-drop slide-in animation
- Affects all 22 tumble/avalanche games with zero impact on win calculation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 4:** `git log --oneline -3` — verify commit.

---

## Execution Notes

- Workstream A and B can run in **parallel** (different files).
- Task C must run **after** both workstreams complete.
- Do NOT touch `index.html` — new games are loaded dynamically from `game-definitions.js`.
- `triggerTumbleCascade` must be idempotent — safe to call even if no win cells are highlighted (it will just find no `.reel-win-glow` cells and exit early).
