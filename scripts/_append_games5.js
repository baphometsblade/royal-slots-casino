const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'shared', 'game-definitions.js');
let src = fs.readFileSync(filePath, 'utf8');

const lastBracket = src.lastIndexOf('];');
if (lastBracket === -1) { console.error('ERROR: no ]; found'); process.exit(1); }

const before = src.slice(0, lastBracket).trimEnd();
let prefix = src.slice(0, lastBracket);

if (!before.endsWith('},')) {
  if (before.endsWith('}')) {
    const tl = prefix.trimEnd().length;
    prefix = prefix.slice(0, tl) + ',' + prefix.slice(tl);
    console.log('Fixed: added trailing comma.');
  } else {
    console.error('ERROR: unexpected ending: ' + before.slice(-30));
    process.exit(1);
  }
} else {
  console.log('OK: trailing comma already present.');
}

const newGames = `

    // wild_reels games
    { id: 'midnight_oasis', name: 'Midnight Oasis', provider: 'VaultX', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/midnight_oasis.png', bgGradient: 'linear-gradient(135deg, #0a0514 0%, #1a237e 100%)',
      symbols: ['s1_sand_dune','s2_palm_silhouette','s3_camel_shadow','s4_crescent_moon','s5_oasis_mirage','wild_starlight'],
      reelBg: 'linear-gradient(180deg, #05020a 0%, #03010e 100%)', accentColor: '#7c4dff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_starlight', scatterSymbol: 's5_oasis_mirage',
      bonusType: 'wild_reels', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Midnight Oasis: 5x3 - Free spins ignite a full wild reel each spin! Starlight wilds cascade for legendary wins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'neptune_storm', name: 'Neptune Storm', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/neptune_storm.png', bgGradient: 'linear-gradient(135deg, #010d1a 0%, #006064 100%)',
      symbols: ['s1_sea_foam','s2_wave_crest','s3_storm_petrel','s4_sea_serpent','s5_neptune_trident','wild_tempest'],
      reelBg: 'linear-gradient(180deg, #010609 0%, #010405 100%)', accentColor: '#00e5ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_tempest', scatterSymbol: 's5_neptune_trident',
      bonusType: 'wild_reels', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Neptune Storm: 5x3 - Tempest wild reels sweep through free spins! Full reel wilds unleash oceanic wins!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    // both_ways games
    { id: 'twin_dragons', name: 'Twin Dragons', provider: 'Orient Reels', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/twin_dragons.png', bgGradient: 'linear-gradient(135deg, #0d0005 0%, #880e4f 100%)',
      symbols: ['s1_dragon_scale','s2_jade_pearl','s3_fire_breath','s4_golden_dragon','s5_twin_dragon_orb','wild_imperial'],
      reelBg: 'linear-gradient(180deg, #080002 0%, #040001 100%)', accentColor: '#f06292',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_imperial', scatterSymbol: 's5_twin_dragon_orb',
      bonusType: 'both_ways', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Twin Dragons: 5x3 - Paylines pay BOTH ways! Twin dragons mirror each win for double the treasures!',
      payouts: { triple: 80, double: 8, wildTriple: 118, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    { id: 'mirror_palace', name: 'Mirror Palace', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mirror_palace.png', bgGradient: 'linear-gradient(135deg, #0a000f 0%, #311b92 100%)',
      symbols: ['s1_glass_shard','s2_prism_gem','s3_mirror_frame','s4_phantom_reflection','s5_silver_palace','wild_looking_glass'],
      reelBg: 'linear-gradient(180deg, #060009 0%, #030005 100%)', accentColor: '#b388ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_looking_glass', scatterSymbol: 's5_silver_palace',
      bonusType: 'both_ways', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Mirror Palace: 5x3 - The palace reflects every win! Reverse paylines add phantom riches from both directions!',
      payouts: { triple: 82, double: 8, wildTriple: 122, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // random_jackpot games
    { id: 'golden_vault', name: 'Golden Vault', provider: 'VaultX', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/golden_vault.png', bgGradient: 'linear-gradient(135deg, #100800 0%, #bf8600 100%)',
      symbols: ['s1_vault_dial','s2_gold_bar','s3_diamond_safe','s4_crown_jewel','s5_vault_king','wild_golden_key'],
      reelBg: 'linear-gradient(180deg, #090500 0%, #050200 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_golden_key', scatterSymbol: 's5_vault_king',
      bonusType: 'random_jackpot', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Golden Vault: 5x3 - Every spin could crack the jackpot! Random 50-200x jackpots explode at any moment!',
      payouts: { triple: 78, double: 7, wildTriple: 115, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'thunder_jackpot', name: 'Thunder Jackpot', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/thunder_jackpot.png', bgGradient: 'linear-gradient(135deg, #050510 0%, #1a237e 100%)',
      symbols: ['s1_storm_cell','s2_electric_arc','s3_thunder_drum','s4_lightning_crown','s5_storm_god','wild_thunderbolt'],
      reelBg: 'linear-gradient(180deg, #030308 0%, #020206 100%)', accentColor: '#82b1ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_thunderbolt', scatterSymbol: 's5_storm_god',
      bonusType: 'random_jackpot', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Thunder Jackpot: 5x3 - Lightning strikes at random! 50-200x jackpot crashes down on any spin!',
      payouts: { triple: 80, double: 8, wildTriple: 118, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 }
];`;

const newSrc = prefix + newGames;
fs.writeFileSync(filePath, newSrc, 'utf8');
console.log('Done: 6 games appended to shared/game-definitions.js');
