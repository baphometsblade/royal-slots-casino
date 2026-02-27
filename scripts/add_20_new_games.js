'use strict';
// One-shot script: append 20 new game definitions to shared/game-definitions.js
// Run from project root: node scripts/add_20_new_games.js

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'shared', 'game-definitions.js');
let src = fs.readFileSync(FILE, 'utf8');

// Guard: don't double-add
if (src.includes("id: 'galactic_raiders'")) {
  console.log('New games already present — skipping.');
  process.exit(0);
}

const NEW_GAMES = `
    // ─── 20 NEW GAMES BATCH 2026-02-27 ───────────────────────────────────────────

    { id: 'galactic_raiders', name: 'Galactic Raiders', provider: 'NovaSpin Studios', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/galactic_raiders.png', bgGradient: 'linear-gradient(135deg, #0a0a2a 0%, #6200ea 100%)',
      symbols: ['s1_asteroid','s2_alien_pod','s3_laser_cannon','s4_ufo','s5_alien_queen','wild_spaceship'],
      reelBg: 'linear-gradient(180deg, #030312 0%, #010109 100%)', accentColor: '#7c4dff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_spaceship', scatterSymbol: 's5_alien_queen',
      bonusType: 'random_multiplier', randomMultiplierRange: [2, 3, 5, 10, 25, 75, 200], freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Galactic Raiders: 5x3 — Space wilds bring random 2-200x multipliers! Alien Queen scatter unleashes invader free spin raids!',
      payouts: { triple: 90, double: 9, wildTriple: 140, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: true, jackpot: 0 },

    { id: 'nova_blackhole', name: 'Nova Blackhole', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/nova_blackhole.png', bgGradient: 'linear-gradient(135deg, #000000 0%, #311b92 100%)',
      symbols: ['s1_nebula','s2_comet','s3_star_cluster','s4_neutron_star','s5_blackhole','wild_nova'],
      reelBg: 'linear-gradient(180deg, #000000 0%, #010108 100%)', accentColor: '#651fff',
      gridCols: 6, gridRows: 5, template: 'extended', winType: 'cluster', clusterMin: 5,
      wildSymbol: 'wild_nova', scatterSymbol: 's5_blackhole',
      bonusType: 'tumble', tumbleMultipliers: [1, 2, 3, 5, 8, 15, 25, 50], freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Nova Blackhole: 6x5 cluster — Cosmic tumble cascades with multipliers up to 50x! Black hole scatter triggers void free spins!',
      payouts: { cluster5: 6, cluster8: 18, cluster12: 60, cluster15: 180 }, minBet: 0.20, maxBet: 5000, hot: false, jackpot: 0 },

    { id: 'agent_zero', name: 'Agent Zero', provider: 'NeonCore Labs', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/agent_zero.png', bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a237e 100%)',
      symbols: ['s1_gadget','s2_briefcase','s3_gun_silencer','s4_tuxedo','s5_target','wild_agent'],
      reelBg: 'linear-gradient(180deg, #050505 0%, #020210 100%)', accentColor: '#2979ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_agent', scatterSymbol: 's5_target',
      bonusType: 'expanding_wild_respin', expandingWildMaxRespins: 3, freeSpinsCount: 10, freeSpinsRetrigger: false,
      bonusDesc: 'Agent Zero: 5x3 — Agent wilds expand to cover full reels with 3 respins! Target scatter unlocks covert mission free spins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'black_ops_heist', name: 'Black Ops Heist', provider: 'PhantomWorks', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/black_ops_heist.png', bgGradient: 'linear-gradient(135deg, #121212 0%, #37474f 100%)',
      symbols: ['s1_lock_pick','s2_night_vision','s3_vault_door','s4_detonator','s5_heist_crew','wild_ghost'],
      reelBg: 'linear-gradient(180deg, #060606 0%, #030303 100%)', accentColor: '#546e7a',
      gridCols: 5, gridRows: 4, template: 'scatter', winType: 'payline',
      wildSymbol: 'wild_ghost', scatterSymbol: 's5_heist_crew',
      bonusType: 'stacked_wilds', stackedWildChance: 0.18, freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Black Ops Heist: 5x4 — Ghost wilds stack 2-4 high during free spins! Heist Crew scatter activates infiltration operation!',
      payouts: { triple: 80, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    { id: 'dragon_forge', name: 'Dragon Forge', provider: 'IronReel Entertainment', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/dragon_forge.png', bgGradient: 'linear-gradient(135deg, #1a0a00 0%, #bf360c 100%)',
      symbols: ['s1_iron_anvil','s2_dragonscale','s3_molten_ore','s4_forge_hammer','s5_dragon_egg','wild_dragon_fire'],
      reelBg: 'linear-gradient(180deg, #0a0300 0%, #050200 100%)', accentColor: '#ff6e40',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_dragon_fire', scatterSymbol: 's5_dragon_egg',
      bonusType: 'multiplier_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Dragon Forge: 5x3 — Dragon Fire wilds carry 2-15x multipliers! Forge the perfect win in blazing free spins!',
      payouts: { triple: 95, double: 9, wildTriple: 145, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    { id: 'castle_siege', name: 'Castle Siege', provider: 'GoldenEdge Gaming', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/castle_siege.png', bgGradient: 'linear-gradient(135deg, #37474f 0%, #78909c 100%)',
      symbols: ['s1_catapult','s2_shield','s3_crossbow','s4_siege_tower','s5_king_knight','wild_sword'],
      reelBg: 'linear-gradient(180deg, #0a0c0d 0%, #050607 100%)', accentColor: '#90a4ae',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_sword', scatterSymbol: 's5_king_knight',
      bonusType: 'hold_and_win', holdAndWinRespins: 3, freeSpinsCount: 10, freeSpinsRetrigger: false,
      bonusDesc: 'Castle Siege: 5x3 — Gold siege symbols trigger Hold & Win respins! King Knight scatter launches cavalry charge free spins!',
      payouts: { triple: 75, double: 8, wildTriple: 115, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    { id: 'world_cup_glory', name: 'World Cup Glory', provider: 'ArcadeForge', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/world_cup_glory.png', bgGradient: 'linear-gradient(135deg, #1b5e20 0%, #f9a825 100%)',
      symbols: ['s1_football_boot','s2_stadium','s3_trophy_cup','s4_goal_net','s5_champion','wild_golden_ball'],
      reelBg: 'linear-gradient(180deg, #050f04 0%, #020802 100%)', accentColor: '#76ff03',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_golden_ball', scatterSymbol: 's5_champion',
      bonusType: 'random_multiplier', randomMultiplierRange: [2, 3, 5, 10, 20, 50, 100], freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'World Cup Glory: 5x3 — Golden Ball wilds score random 2-100x multipliers! Champion scatter triggers penalty shootout free spins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'grand_prix_rush', name: 'Grand Prix Rush', provider: 'NeonCore Labs', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/grand_prix_rush.png', bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #c62828 100%)',
      symbols: ['s1_pit_crew','s2_racing_glove','s3_f1_helmet','s4_podium','s5_checkered_flag','wild_race_car'],
      reelBg: 'linear-gradient(180deg, #060606 0%, #030000 100%)', accentColor: '#ff1744',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_race_car', scatterSymbol: 's5_checkered_flag',
      bonusType: 'walking_wilds', freeSpinsCount: 10, freeSpinsRetrigger: false,
      bonusDesc: 'Grand Prix Rush: 5x3 — Race Car wilds zoom across reels! Checkered Flag scatter triggers qualifying laps free spins!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    { id: 'gold_crown_club', name: 'Gold Crown Club', provider: 'Celestial Plays', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/gold_crown_club.png', bgGradient: 'linear-gradient(135deg, #1a1400 0%, #f9a825 100%)',
      symbols: ['s1_champagne','s2_diamond_ring','s3_luxury_watch','s4_gold_bar','s5_crown','wild_vault_key'],
      reelBg: 'linear-gradient(180deg, #0a0700 0%, #050400 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_vault_key', scatterSymbol: 's5_crown',
      bonusType: 'wheel_multiplier', wheelMultipliers: [3, 5, 5, 10, 10, 25, 50, 100], freeSpinsCount: 15, freeSpinsRetrigger: true,
      bonusDesc: 'Gold Crown Club: 5x3 — Crown scatter spins the VIP multiplier wheel (3-100x)! Vault Key wilds unlock jackpot treasury!',
      payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 4 }, minBet: 0.20, maxBet: 5000, hot: false, jackpot: 456780 },

    { id: 'monaco_million', name: 'Monaco Million', provider: 'VaultX Gaming', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/monaco_million.png', bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #b71c1c 100%)',
      symbols: ['s1_yacht','s2_roulette','s3_penthouse','s4_supercar','s5_billionaire','wild_casino_chip'],
      reelBg: 'linear-gradient(180deg, #050000 0%, #030000 100%)', accentColor: '#f50057',
      gridCols: 5, gridRows: 4, template: 'scatter', winType: 'payline',
      wildSymbol: 'wild_casino_chip', scatterSymbol: 's5_billionaire',
      bonusType: 'money_collect', moneySymbols: ['s3_penthouse','s4_supercar','s5_billionaire'], freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Monaco Million: 5x4 — Collect luxury money symbols for massive cash payouts! Five Billionaires unlocks jackpot vault!',
      payouts: { triple: 95, double: 9, wildTriple: 145, scatterPay: 4 }, minBet: 0.20, maxBet: 5000, hot: false, jackpot: 287650 },

    { id: 'rome_eternal', name: 'Rome Eternal', provider: 'Desert Gold Studios', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/rome_eternal.png', bgGradient: 'linear-gradient(135deg, #bf360c 0%, #ffd54f 100%)',
      symbols: ['s1_laurel_wreath','s2_roman_sword','s3_colosseum','s4_legionnaire','s5_julius_caesar','wild_roman_eagle'],
      reelBg: 'linear-gradient(180deg, #0d0300 0%, #070200 100%)', accentColor: '#ffd54f',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_roman_eagle', scatterSymbol: 's5_julius_caesar',
      bonusType: 'expanding_symbol', freeSpinsCount: 10, freeSpinsRetrigger: false,
      bonusDesc: 'Rome Eternal: 5x3 — Caesar scatter commands an expanding symbol to fill reels! Roman Eagle wild captures the colosseum!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    { id: 'cleopatra_gold', name: 'Cleopatra Gold', provider: 'PhantomWorks', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/cleopatra_gold.png', bgGradient: 'linear-gradient(135deg, #1a0a00 0%, #ff8f00 100%)',
      symbols: ['s1_lotus','s2_ibis','s3_cartouche','s4_gold_mask','s5_cleopatra','wild_asp'],
      reelBg: 'linear-gradient(180deg, #0a0400 0%, #050200 100%)', accentColor: '#ff8f00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_asp', scatterSymbol: 's5_cleopatra',
      bonusType: 'tumble', tumbleMultipliers: [1, 2, 3, 5, 8, 12, 20], freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Cleopatra Gold: 5x3 — Asp wilds trigger tumble cascades with escalating multipliers up to 20x! Royal free spins flow like the Nile!',
      payouts: { triple: 90, double: 9, wildTriple: 140, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: true, jackpot: 0 },

    { id: 'pixel_rewind', name: 'Pixel Rewind', provider: 'ArcadeForge', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/pixel_rewind.png', bgGradient: 'linear-gradient(135deg, #1a0040 0%, #00e676 100%)',
      symbols: ['s1_coin_sprite','s2_invader','s3_pac_dot','s4_pixel_gun','s5_retro_boss','wild_pixel'],
      reelBg: 'linear-gradient(180deg, #0a0020 0%, #050010 100%)', accentColor: '#00e676',
      gridCols: 5, gridRows: 3, template: 'classic', winType: 'classic',
      wildSymbol: 'wild_pixel', scatterSymbol: 's5_retro_boss',
      bonusType: 'respin', maxRespins: 3, freeSpinsCount: 8, freeSpinsRetrigger: false,
      bonusDesc: 'Pixel Rewind: 5x3 Classic — Retro Boss triggers bonus level respins! Pixel wild glitches across the grid for big wins!',
      payouts: { triple: 75, double: 8, wildTriple: 115, scatterPay: 3 }, minBet: 0.20, maxBet: 2000, hot: false, jackpot: 0 },

    { id: 'thunder_hero', name: 'Thunder Hero', provider: 'NovaSpin Studios', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/thunder_hero.png', bgGradient: 'linear-gradient(135deg, #0d1b4a 0%, #f9c300 100%)',
      symbols: ['s1_power_ring','s2_cape','s3_lightning_fist','s4_hero_mask','s5_storm_titan','wild_thunder_bolt'],
      reelBg: 'linear-gradient(180deg, #050812 0%, #030409 100%)', accentColor: '#ffe600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_thunder_bolt', scatterSymbol: 's5_storm_titan',
      bonusType: 'zeus_multiplier', zeusMultipliers: [2, 3, 5, 10, 25, 100], freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Thunder Hero: 5x3 — Thunderbolt wilds call down 2-100x hero multipliers! Storm Titan scatter unleashes superpowered free spins!',
      payouts: { triple: 90, double: 9, wildTriple: 140, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: true, jackpot: 0 },

    { id: 'solar_fist', name: 'Solar Fist', provider: 'GoldenEdge Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/solar_fist.png', bgGradient: 'linear-gradient(135deg, #ff6f00 0%, #e65100 100%)',
      symbols: ['s1_solar_gem','s2_power_glove','s3_energy_orb','s4_sun_shield','s5_solar_champion','wild_solar_beam'],
      reelBg: 'linear-gradient(180deg, #0d0400 0%, #080300 100%)', accentColor: '#ff9100',
      gridCols: 6, gridRows: 5, template: 'extended', winType: 'cluster', clusterMin: 5,
      wildSymbol: 'wild_solar_beam', scatterSymbol: 's5_solar_champion',
      bonusType: 'avalanche', avalancheMultipliers: [1, 2, 3, 5, 10, 20], freeSpinsCount: 15, freeSpinsRetrigger: true,
      bonusDesc: 'Solar Fist: 6x5 cluster — Solar Beams avalanche with escalating multipliers up to 20x! Champion scatter charges free spins!',
      payouts: { cluster5: 5, cluster8: 16, cluster12: 55, cluster15: 160 }, minBet: 0.20, maxBet: 5000, hot: false, jackpot: 0 },

    { id: 'big_top_bonanza', name: 'Big Top Bonanza', provider: 'GoldenEdge Gaming', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/big_top_bonanza.png', bgGradient: 'linear-gradient(135deg, #b71c1c 0%, #f9a825 100%)',
      symbols: ['s1_juggling_balls','s2_tightrope','s3_acrobat','s4_clown','s5_ringmaster','wild_big_top'],
      reelBg: 'linear-gradient(180deg, #0a0100 0%, #050000 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_big_top', scatterSymbol: 's5_ringmaster',
      bonusType: 'random_multiplier', randomMultiplierRange: [2, 3, 5, 10, 20, 50], freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Big Top Bonanza: 5x3 — Ringmaster scatter signals random 2-50x multiplier extravaganza! Wild Big Top covers full reels!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    { id: 'clockwork_realm', name: 'Clockwork Realm', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/clockwork_realm.png', bgGradient: 'linear-gradient(135deg, #3e2723 0%, #795548 100%)',
      symbols: ['s1_gear','s2_compass','s3_steam_valve','s4_pocket_watch','s5_time_traveler','wild_clockwork'],
      reelBg: 'linear-gradient(180deg, #110a07 0%, #090605 100%)', accentColor: '#a1887f',
      gridCols: 5, gridRows: 4, template: 'scatter', winType: 'payline',
      wildSymbol: 'wild_clockwork', scatterSymbol: 's5_time_traveler',
      bonusType: 'expanding_wild_respin', expandingWildMaxRespins: 5, freeSpinsCount: 12, freeSpinsRetrigger: false,
      bonusDesc: 'Clockwork Realm: 5x4 — Clockwork wilds expand and shift reels with 5 respins! Time Traveler scatter warps to free spins era!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    { id: 'rockstar_wild', name: 'Rockstar Wild', provider: 'ArcadeForge', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/rockstar_wild.png', bgGradient: 'linear-gradient(135deg, #1a0040 0%, #aa00ff 100%)',
      symbols: ['s1_guitar_pick','s2_drumstick','s3_electric_guitar','s4_amp','s5_rock_legend','wild_lightning_guitar'],
      reelBg: 'linear-gradient(180deg, #0a0020 0%, #050010 100%)', accentColor: '#d500f9',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_lightning_guitar', scatterSymbol: 's5_rock_legend',
      bonusType: 'multiplier_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Rockstar Wild: 5x3 — Lightning Guitar wilds multiply wins 2-12x! Rock Legend scatter starts the encore free spins concert!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'snow_queen_riches', name: 'Snow Queen Riches', provider: 'FrostByte Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/snow_queen_riches.png', bgGradient: 'linear-gradient(135deg, #0a1a3a 0%, #e3f2fd 100%)',
      symbols: ['s1_ice_crystal','s2_snowflake_gem','s3_frost_wolf','s4_ice_palace','s5_snow_queen','wild_blizzard'],
      reelBg: 'linear-gradient(180deg, #040a1a 0%, #020510 100%)', accentColor: '#82b1ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_blizzard', scatterSymbol: 's5_snow_queen',
      bonusType: 'sticky_wilds', freeSpinsCount: 15, freeSpinsRetrigger: true,
      bonusDesc: 'Snow Queen Riches: 5x3 — Blizzard wilds freeze and stick throughout all 15 free spins! Snow Queen scatter reveals icy riches!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    { id: 'jungle_fury', name: 'Jungle Fury', provider: 'IronReel Entertainment', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/jungle_fury.png', bgGradient: 'linear-gradient(135deg, #1b5e20 0%, #bf360c 100%)',
      symbols: ['s1_vine','s2_tribal_drum','s3_panther','s4_gorilla','s5_jungle_king','wild_jungle_spirit'],
      reelBg: 'linear-gradient(180deg, #040d02 0%, #020702 100%)', accentColor: '#69f0ae',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_jungle_spirit', scatterSymbol: 's5_jungle_king',
      bonusType: 'stacked_wilds', stackedWildChance: 0.20, freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Jungle Fury: 5x3 — Jungle Spirit wilds stack in towering columns! Jungle King scatter triggers primal fury free spins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },
`;

// Insert new games just before the closing ]; — handle both LF and CRLF
const CLOSE = '];\r\n\r\n// Node.js CommonJS export';
const CLOSE_LF = '];\n\n// Node.js CommonJS export';
let idx = src.indexOf(CLOSE);
if (idx < 0) idx = src.indexOf(CLOSE_LF);
if (idx < 0) {
  console.error('Could not find closing ]; — aborting');
  process.exit(1);
}
const patched = src.substring(0, idx) + NEW_GAMES + src.substring(idx);
fs.writeFileSync(FILE, patched, 'utf8');
console.log('✓ 20 new games appended to shared/game-definitions.js');
