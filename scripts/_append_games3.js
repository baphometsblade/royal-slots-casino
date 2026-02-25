const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'shared', 'game-definitions.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the last `];` in the file (the closing of the games array)
const lastBracketIdx = content.lastIndexOf('];');
if (lastBracketIdx === -1) {
    console.error('ERROR: Could not find `];` in game-definitions.js');
    process.exit(1);
}

const newGames = `
    // cascading games
    { id: 'diamond_falls', name: 'Diamond Falls', provider: 'NovaSpin Studios', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/diamond_falls.png', bgGradient: 'linear-gradient(135deg, #0a0a1a 0%, #00bcd4 100%)',
      symbols: ['s1_gem_chip','s2_sapphire','s3_ruby_shard','s4_emerald','s5_diamond_star','wild_prismatic'],
      reelBg: 'linear-gradient(180deg, #020209 0%, #010105 100%)', accentColor: '#00e5ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_prismatic', scatterSymbol: 's5_diamond_star',
      bonusType: 'cascading', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Diamond Falls: 5×3 — Winning gems explode and cascade! Each level multiplies wins up to 5×!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'dragon_tumble', name: 'Dragon Tumble', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/dragon_tumble.png', bgGradient: 'linear-gradient(135deg, #1a0000 0%, #b71c1c 100%)',
      symbols: ['s1_dragon_egg','s2_fire_scale','s3_talon_claw','s4_dragon_eye','s5_ancient_hoard','wild_dragonfire'],
      reelBg: 'linear-gradient(180deg, #0d0000 0%, #060000 100%)', accentColor: '#ff1744',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_dragonfire', scatterSymbol: 's5_ancient_hoard',
      bonusType: 'cascading', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Dragon Tumble: 5×3 — Dragon fire burns winning symbols! Cascade chains ignite 5× multipliers!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    { id: 'golden_cascade', name: 'Golden Cascade', provider: 'GoldenEdge Gaming', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/golden_cascade.png', bgGradient: 'linear-gradient(135deg, #1a1000 0%, #f57f17 100%)',
      symbols: ['s1_gold_nugget','s2_coin_stack','s3_treasure_key','s4_crown_jewel','s5_pharaoh_mask','wild_golden_ra'],
      reelBg: 'linear-gradient(180deg, #0a0600 0%, #050300 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_golden_ra', scatterSymbol: 's5_pharaoh_mask',
      bonusType: 'cascading', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Golden Cascade: 5×3 — Tumbling gold symbols! Cascade chain to 5× for monumental treasures!',
      payouts: { triple: 85, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // expanding_wilds games
    { id: 'thunder_reel', name: 'Thunder Reel', provider: 'NovaSpin Studios', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/thunder_reel.png', bgGradient: 'linear-gradient(135deg, #070f1a 0%, #0d47a1 100%)',
      symbols: ['s1_cloud_bolt','s2_storm_eye','s3_voltage_arc','s4_tempest_god','s5_thunder_peak','wild_lightning_rod'],
      reelBg: 'linear-gradient(180deg, #04080e 0%, #020509 100%)', accentColor: '#82b1ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_lightning_rod', scatterSymbol: 's5_thunder_peak',
      bonusType: 'expanding_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Thunder Reel: 5×3 — Lightning wilds strike and expand to fill entire reels! Maximum electrified wins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'crystal_veil', name: 'Crystal Veil', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/crystal_veil.png', bgGradient: 'linear-gradient(135deg, #0a000f 0%, #6a1b9a 100%)',
      symbols: ['s1_quartz_sliver','s2_amethyst','s3_crystal_orb','s4_spectral_gem','s5_void_crystal','wild_veil_wraith'],
      reelBg: 'linear-gradient(180deg, #060009 0%, #030005 100%)', accentColor: '#e040fb',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_veil_wraith', scatterSymbol: 's5_void_crystal',
      bonusType: 'expanding_wilds', freeSpinsCount: 8, freeSpinsRetrigger: true,
      bonusDesc: 'Crystal Veil: 5×3 — Spectral wilds expand through the veil, covering full reels!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    // respin game
    { id: 'primal_vault', name: 'Primal Vault', provider: 'IronReel Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/primal_vault.png', bgGradient: 'linear-gradient(135deg, #0a0f05 0%, #33691e 100%)',
      symbols: ['s1_stone_tablet','s2_bone_dice','s3_fur_totem','s4_cave_bear','s5_primal_chest','wild_primal_fire'],
      reelBg: 'linear-gradient(180deg, #060a03 0%, #030501 100%)', accentColor: '#76ff03',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_primal_fire', scatterSymbol: 's5_primal_chest',
      bonusType: 'respin', freeSpinsCount: 10, freeSpinsRetrigger: false, scatterThreshold: 3,
      bonusDesc: 'Primal Vault: 5×3 — Land 1-2 chests to lock and re-spin! 3 chests open the primal vault bonus!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 }
`;

const before = content.slice(0, lastBracketIdx);
const after = content.slice(lastBracketIdx + 2); // skip the existing `];`

const newContent = before + ',\n' + newGames + '\n];' + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: 6 new games appended to shared/game-definitions.js');
