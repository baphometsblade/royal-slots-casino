# new-game — Add a New Slot Game

Scaffolds a complete new slot game entry in `shared/game-definitions.js` and
`shared/chrome-styles.js`, then verifies the lobby still loads via QA.

## Usage

```
/new-game
```

Claude will ask for: game ID, theme/name, provider, grid type, bonus mechanic.

---

## Step-by-Step Procedure

### 1. Gather Requirements

Ask the user (or infer from their description):

| Field | Options / Notes |
|---|---|
| `id` | snake_case, unique, no spaces — e.g. `dragon_frenzy` |
| `name` | Display name — e.g. `Dragon Frenzy Megaways` |
| `provider` | One of the 8 brands below |
| `grid` | classic (3×3) · standard (5×3) · extended (5×4) · scatter (6×5) · grid (7×7) |
| `bonus` | See bonus types below |
| `tag` | `''` · `'HOT'` · `'NEW'` · `'POPULAR'` · `'JACKPOT'` |
| `minBet` / `maxBet` | Typical: 5–500 (classic), 10–2000 (standard), 20–5000 (premium) |
| `jackpot` | `0` unless tag is JACKPOT — then set a starting value e.g. `125000` |

### 2. Choose Provider Brand

| Provider Name (display) | Key for chrome-styles | Visual Identity |
|---|---|---|
| NovaSpin Studios | `novaspin` | sci-fi, electric cyan, dark space |
| Celestial Plays | `celestial` | Greek gold columns, deep azure |
| IronReel Entertainment | `ironreel` | earthy copper/stone, nature |
| GoldenEdge Gaming | `goldenedge` | candy pastel pink/amber |
| VaultX Gaming | `vaultx` | dark steel, heist/western grit |
| SolsticeFX | `solstice` | red lacquer, imperial gold |
| PhantomWorks | `phantomworks` | gothic purple, blood-red shadow |
| ArcadeForge | `arcadeforge` | chrome ring, retro pub-machine |

### 3. Choose Grid Layout

| `template` value | `winType` | `gridCols` | `gridRows` | Notes |
|---|---|---|---|---|
| `'classic'` | `'classic'` | 3 | 3 | Pairs/triples only, no payline obj |
| `'standard'` | `'payline'` | 5 | 3 | Most common layout |
| `'extended'` | `'payline'` | 5 | 4 | 40-payline variant |
| `'scatter'` | `'cluster'` | 6 | 5 | Cluster pays, scatter multipliers |
| `'grid'` | `'cluster'` | 7 | 7 | Max-size tumble/cascade |

### 4. Define Symbols

Always exactly 6 symbols in this order:
```
['s1_<lowval>', 's2_<lowval>', 's3_<midval>', 's4_<hival>', 's5_<scatter>', 'wild_<theme>']
```
Use descriptive, theme-appropriate names. All lowercase, underscores only.

### 5. Define Payouts

**Classic / payline games:**
```js
payouts: { triple: 80, double: 9, wildTriple: 120, scatterPay: 3,
           payline3: 9, payline4: 40, payline5: 80 }
// Omit payline3/4/5 for 'classic' winType
```

**Cluster games (scatter / grid):**
```js
payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 4,
           cluster5: 4, cluster8: 12, cluster12: 40, cluster15: 120 }
```

Guidelines: `wildTriple ≈ triple * 1.5`, `double ≈ triple / 9`, `scatterPay` 2–5.

### 6. Choose Bonus Type

| `bonusType` | Extra Fields Required | Description |
|---|---|---|
| `'tumble'` | `tumbleMultipliers: [1,2,3,5,8,12,15,20]` | Cascade with rising multipliers |
| `'random_multiplier'` | `randomMultiplierRange: [2,3,5,10,25,50,100]` | Random bomb multipliers |
| `'zeus_multiplier'` | `zeusMultipliers: [2,3,5,10,25,500]` | God-tier random multipliers |
| `'money_collect'` | `moneySymbols: ['s2_coins','s3_bag']` | Wild collects coin values |
| `'respin'` | `maxRespins: 3` | Pairs lock, others respin |
| `'wheel_multiplier'` | `wheelMultipliers: [2,2,3,3,5,7,10]` | Triple → spin wheel |
| `'expanding_symbol'` | *(none)* | Random symbol expands each free spin |
| `'expanding_wild_respin'` | `expandingWildMaxRespins: 3` | Wild expands + free respin |
| `'stacked_wilds'` | `stackedWildChance: 0.15` | Stacked wilds in free spins |
| `'hold_and_win'` | `holdAndWinRespins: 3` | Coins lock with 3 respins |
| `'fisherman_collect'` | `fishSymbols: ['s1_hook','s4_fish']` | Fisherman wild collects values |
| `'megaways'` | `megawaysMax: 117649` | Variable reel heights |
| `'free_spins_only'` | *(none)* | Standard free spins, no special mechanic |

### 7. Insert the Game Entry

Append to the `games` array in **`shared/game-definitions.js`** before the closing `];`:

```js
// ═══ N. <Name> (<based on>) — <Grid>, <Bonus> ═══
{ id: '<id>', name: '<Name>', provider: '<Provider Name>', tag: '<TAG>', tagClass: 'tag-<tag_lower>',
  thumbnail: 'assets/thumbnails/<id>.png', bgGradient: 'linear-gradient(135deg, #<color1> 0%, #<color2> 100%)',
  symbols: ['s1_<a>','s2_<b>','s3_<c>','s4_<d>','s5_<e>','wild_<f>'],
  reelBg: 'linear-gradient(180deg, #<dark1> 0%, #<darker> 100%)', accentColor: '#<accent>',
  gridCols: <N>, gridRows: <N>, template: '<template>', winType: '<winType>',
  wildSymbol: 'wild_<f>', scatterSymbol: 's5_<e>',
  bonusType: '<bonusType>', freeSpinsCount: <N>, freeSpinsRetrigger: <bool>,
  /* bonus-specific fields here */
  bonusDesc: '<Name>: <Grid> grid — <one-sentence description of bonus mechanic>!',
  payouts: { triple: <N>, double: <N>, wildTriple: <N>, scatterPay: <N> /* + layout-specific */ },
  minBet: <N>, maxBet: <N>, hot: <bool>, jackpot: <N> },
```

**Tag → tagClass mapping:**
- `''` → `''`
- `'HOT'` → `'tag-hot'`
- `'NEW'` → `'tag-new'`
- `'POPULAR'` → `'tag-popular'`
- `'JACKPOT'` → `'tag-jackpot'`

### 8. Add Chrome Style Entry

Add one line to **`shared/chrome-styles.js`** under the matching provider section:

```js
'<id>':  '<provider_key>',  // <Name>
```

### 9. Add Thumbnail Placeholder

If `assets/thumbnails/<id>.png` doesn't exist, note it in the response so the user
can generate it with:
```bash
npm run reasset:slot-chrome
```

### 10. Verify

```bash
npm run qa:regression
```

QA must pass. The lobby render test confirms the new game loads without errors.

---

## Complete Example — "Dragon Frenzy" (standard layout, expanding wild)

```js
// ═══ 82. Dragon Frenzy (original) — 5x3, Expanding Wilds ═══
{ id: 'dragon_frenzy', name: 'Dragon Frenzy', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new',
  thumbnail: 'assets/thumbnails/dragon_frenzy.png', bgGradient: 'linear-gradient(135deg, #7b0000 0%, #ff6a00 100%)',
  symbols: ['s1_scale','s2_claw','s3_gem','s4_egg','s5_dragon','wild_flame'],
  reelBg: 'linear-gradient(180deg, #2a0a00 0%, #140500 100%)', accentColor: '#ff6a00',
  gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
  wildSymbol: 'wild_flame', scatterSymbol: 's5_dragon',
  bonusType: 'expanding_wild_respin', freeSpinsCount: 10, freeSpinsRetrigger: true,
  expandingWildMaxRespins: 3,
  bonusDesc: 'Dragon Frenzy: 5×3 grid — Flame Wilds expand to fill reels and trigger 3 free respins!',
  payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3, payline3: 9, payline4: 40, payline5: 85 },
  minBet: 10, maxBet: 1000, hot: false, jackpot: 0 },
```

Chrome-styles entry (under `// ── PHANTOMWORKS`):
```js
'dragon_frenzy':  'phantomworks', // Dragon Frenzy
```
