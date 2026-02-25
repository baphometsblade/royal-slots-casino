const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'shared', 'game-definitions.js');
let src = fs.readFileSync(filePath, 'utf8');

// Find the final ]; and replace it with new entries + ];
const newEntries = `
    // prize_wheel games
    { id: 'fortune_bazaar', name: 'Fortune Bazaar', provider: 'ArcadeForge', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/fortune_bazaar.png', bgGradient: 'linear-gradient(135deg, #1a0a00 0%, #e65100 100%)',
      symbols: ['s1_market_lamp','s2_spice_jar','s3_silk_bolt','s4_golden_urn','s5_fortune_wheel','wild_genie'],
      reelBg: 'linear-gradient(180deg, #0d0500 0%, #060200 100%)', accentColor: '#ff6d00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_genie', scatterSymbol: 's5_fortune_wheel',
      bonusType: 'prize_wheel', freeSpinsCount: 10, freeSpinsRetrigger: false,
      bonusDesc: 'Fortune Bazaar: 5x3 - Scatter the fortune wheel to spin for cash multipliers or free spin prizes!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'celestial_bazaar', name: 'Celestial Bazaar', provider: 'VaultX', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/celestial_bazaar.png', bgGradient: 'linear-gradient(135deg, #0a000f 0%, #4a148c 100%)',
      symbols: ['s1_moon_pearl','s2_star_vial','s3_cosmic_gem','s4_eclipse_coin','s5_astral_wheel','wild_constellation'],
      reelBg: 'linear-gradient(180deg, #060009 0%, #030005 100%)', accentColor: '#ce93d8',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_constellation', scatterSymbol: 's5_astral_wheel',
      bonusType: 'prize_wheel', freeSpinsCount: 8, freeSpinsRetrigger: false,
      bonusDesc: 'Celestial Bazaar: 5x3 - Astral scatter spins the celestial prize wheel! Cash, spins or jackpot await!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // colossal games
    { id: 'titan_forge', name: 'Titan Forge', provider: 'IronReel Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/titan_forge.png', bgGradient: 'linear-gradient(135deg, #0f0f0f 0%, #37474f 100%)',
      symbols: ['s1_iron_ingot','s2_forge_hammer','s3_lava_crystal','s4_titan_helm','s5_colossal_anvil','wild_molten'],
      reelBg: 'linear-gradient(180deg, #090909 0%, #040404 100%)', accentColor: '#ff8f00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_molten', scatterSymbol: 's5_colossal_anvil',
      bonusType: 'colossal', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Titan Forge: 5x3 - Giant 2x2 colossal symbols crash onto the reels for massive forge wins!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    { id: 'mammoth_riches', name: 'Mammoth Riches', provider: 'GoldenEdge Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mammoth_riches.png', bgGradient: 'linear-gradient(135deg, #0d0700 0%, #5d4037 100%)',
      symbols: ['s1_ice_flint','s2_cave_paint','s3_tusk_shard','s4_woolly_hide','s5_mammoth_boss','wild_ice_age'],
      reelBg: 'linear-gradient(180deg, #080400 0%, #040200 100%)', accentColor: '#bcaaa4',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_ice_age', scatterSymbol: 's5_mammoth_boss',
      bonusType: 'colossal', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Mammoth Riches: 5x3 - Massive 2x2 mammoth symbols stomp across the reels for prehistoric wins!',
      payouts: { triple: 85, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // symbol_collect games
    { id: 'koi_ascension', name: 'Koi Ascension', provider: 'Orient Reels', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/koi_ascension.png', bgGradient: 'linear-gradient(135deg, #001a0a 0%, #00897b 100%)',
      symbols: ['s1_lotus_petal','s2_water_lily','s3_jade_koi','s4_golden_koi','s5_dragon_koi','wild_ascendant'],
      reelBg: 'linear-gradient(180deg, #000d05 0%, #000602 100%)', accentColor: '#69f0ae',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_ascendant', scatterSymbol: 's5_dragon_koi',
      bonusType: 'symbol_collect', freeSpinsCount: 15, freeSpinsRetrigger: true,
      bonusDesc: 'Koi Ascension: 5x3 - Collect dragon koi during free spins to ascend the 10x multiplier track!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'pharaoh_collect', name: 'Pharaoh Collect', provider: 'VaultX', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/pharaoh_collect.png', bgGradient: 'linear-gradient(135deg, #0d0800 0%, #827717 100%)',
      symbols: ['s1_papyrus','s2_canopic_jar','s3_eye_of_ra','s4_golden_sphinx','s5_pharaoh_sceptre','wild_anubis'],
      reelBg: 'linear-gradient(180deg, #080500 0%, #040200 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_anubis', scatterSymbol: 's5_pharaoh_sceptre',
      bonusType: 'symbol_collect', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Pharaoh Collect: 5x3 - Gather sceptres during free spins to unlock the pharaoh 10x multiplier!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 }
];`;

// Replace the last ]; in the file
const lastBracket = src.lastIndexOf('];');
if (lastBracket === -1) {
  console.error('ERROR: Could not find final ]; in game-definitions.js');
  process.exit(1);
}

const updated = src.slice(0, lastBracket) + newEntries;
fs.writeFileSync(filePath, updated, 'utf8');
console.log('SUCCESS: 6 new games appended to shared/game-definitions.js');
