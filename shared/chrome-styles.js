// ═══════════════════════════════════════════════════════════════════
// Chrome Styles — maps every game ID to its provider chrome key
// ═══════════════════════════════════════════════════════════════════
//
// 12 fictional provider brands, each with a distinct visual identity:
//
//  novaspin     — NovaSpin Studios     (sci-fi electric cyan, dark space)
//  celestial    — Celestial Plays      (Greek gold columns, deep azure)
//  ironreel     — IronReel Ent.        (earthy copper/stone, nature)
//  goldenedge   — GoldenEdge Gaming    (candy pastel pink/amber)
//  vaultx       — VaultX Gaming        (dark steel heist/western grit)
//  solstice     — SolsticeFX           (red lacquer, imperial gold)
//  phantomworks — PhantomWorks         (gothic purple, blood-red shadow)
//  arcadeforge  — ArcadeForge          (chrome ring, retro pub-machine)
//  neoncore     — NeonCore Labs        (matrix green, circuit data streams)
//  frostbyte    — FrostByte Gaming     (icy blue, frozen crystal edges)
//  desertgold   — Desert Gold Studios  (warm sand, golden heat haze)
//  orientreels  — Orient Reels         (red lantern, ink brush elegance)
//
// ═══════════════════════════════════════════════════════════════════

const GAME_CHROME_STYLES = {
    // ── NOVASPIN STUDIOS  (sci-fi electric cyan) ────────────────────
    'starburst_xxl':      'novaspin',  // Starburst XXXtreme
    'quantum_burst':      'novaspin',  // Quantum cluster
    'twin_helix':         'novaspin',  // Twin Helix
    'neon_nights':        'novaspin',  // Neon Staxx
    'diamond_vault':      'novaspin',  // Diamond Vortex
    'nitro_street':       'novaspin',  // Nitro Rush
    'chaos_crew':         'novaspin',  // Chaos Crew 2
    'snoop_dollars':      'novaspin',  // Hip Hop Panda
    'reactoonz':          'novaspin',  // Reactoonz 2
    'gems_bonanza':       'novaspin',  // Gem Rocks / Gems Bonanza
    'mental_meltdown':    'novaspin',  // Mental (Nolimit City)

    // ── CELESTIAL PLAYS  (Greek gold columns, deep azure) ───────────
    'gates_olympus':      'celestial', // Gates of Olympus
    'olympus_rising':     'celestial', // Gates of Olympus 1000
    'olympian_gods':      'celestial', // Olympian Gods
    'golden_fortune':     'celestial', // Golden Fortune Wheel
    'ares_blade':         'celestial', // Ares: Blade of Chaos
    'crown_fire':         'celestial', // Crown of Fire
    'olympus_dream':      'celestial', // Olympus Dream Drop
    'pots_olympus':       'celestial', // Pots of Zeus
    'power_crown':        'celestial', // Crown of Power
    'merlin_power':       'celestial', // Merlin's Power (magic/regal)

    // ── IRONREEL ENTERTAINMENT  (earthy copper/stone, nature) ───────
    'wolf_gold':          'ironreel',  // Wolf Gold
    'buffalo_stampede':   'ironreel',  // Buffalo King
    'great_rhino':        'ironreel',  // Great Rhino Megaways
    'chilli_heat':        'ironreel',  // Chilli Heat Megaways
    'wild_toro':          'ironreel',  // Wild Toro 2
    'mega_safari':        'ironreel',  // Mega Moolah
    'goldstorm_ultra':    'ironreel',  // Gold Storm
    'gemhalla':           'ironreel',  // Valhalla Gems (Norse earth)
    'loki_loot':          'ironreel',  // Loki's Wild Loot (Norse)
    'buffalo_extreme':    'ironreel',  // Buffalo Blitz Extreme
    'buffalo_mega':       'ironreel',  // Buffalo King Thunder
    'viking_voyage':      'ironreel',  // Viking Voyage
    'island_tiki':        'ironreel',  // Tiki Tumble

    // ── GOLDENEDGE GAMING  (candy pastel pink/amber) ─────────────────
    'sugar_rush':         'goldenedge',// Sugar Rush 1000
    'lucky_777':          'goldenedge',// Sweet Bonanza
    'starlight_princess': 'goldenedge',// Starlight Princess
    'jammin_fruits':      'goldenedge',// Jammin' Jars 2
    'sweet_bonanza':      'goldenedge',// Sweet Bonanza Xmas
    'fruit_party':        'goldenedge',// Fruit Party 2
    'extra_chilli':       'goldenedge',// Extra Chilli Megaways
    'dog_house_mega':     'goldenedge',// Dog House Megaways
    'puppy_palace':       'goldenedge',// Dog House (original)
    'fat_rabbit':         'goldenedge',// Fat Rabbit
    'esqueleto_fiesta':   'goldenedge',// Esqueleto Explosivo

    // ── VAULTX GAMING  (dark steel heist, western grit) ─────────────
    'black_bull':         'vaultx',    // Black Bull
    'tombstone_reload':   'vaultx',    // Tombstone No Mercy
    'san_quentin':        'vaultx',    // San Quentin xWays
    'wanted_dead':        'vaultx',    // Wanted Dead or a Wild
    'dead_alive':         'vaultx',    // Dead or Alive 2
    'wildfire_gold':      'vaultx',    // Wild Wild Riches
    'money_train':        'vaultx',    // Money Train 3
    'fire_hole':          'vaultx',    // Fire in the Hole xBomb (dark mine)
    'big_bass':           'vaultx',    // Big Bass Bonanza
    'bass_splash':        'vaultx',    // Big Bass Splash
    'razor_shark':        'vaultx',    // Razor Shark

    // ── SOLSTICEFX  (red lacquer, imperial gold filigree) ───────────
    'lucky_dragon':       'solstice',  // Lucky Dragon
    'dragon_megafire':    'solstice',  // Dragon Kingdom
    'five_lions':         'solstice',  // 5 Lions Megaways
    'big_bamboo':         'solstice',  // Big Bamboo
    'gold_rush_frog':     'solstice',  // Fortune Frog
    'coin_volcano':       'solstice',  // Coin Volcano
    'sakura_princess':    'solstice',  // Sakura Fortune

    // ── PHANTOMWORKS  (gothic purple, blood-red, dark/egyptian) ─────
    'crimson_fang':       'phantomworks',// Blood Suckers 2
    'madame_destiny':     'phantomworks',// Madame Destiny Megaways
    'immortal_blood':     'phantomworks',// Immortal Romance
    'le_bandit':          'phantomworks',// The Bandit
    'tome_madness':       'phantomworks',// Tome of Madness
    'eternal_romance':    'phantomworks',// Eternal Romance
    'pirate_fortune':     'phantomworks',// Pirates' Plenty
    'book_dead':          'phantomworks',// Book of Dead
    'gonzos_quest':       'phantomworks',// Gonzo's Quest Megaways
    'pharaoh_legacy':     'phantomworks',// Eye of Horus

    // ── ARCADEFORGE  (chrome ring, retro pub-machine) ────────────────
    'hot_chillies':       'arcadeforge', // 3 Hot Chillies
    'fire_joker':         'arcadeforge', // Fire Joker
    'mega_joker':         'arcadeforge', // Mega Joker (NetEnt classic)
    'coin_strike':        'arcadeforge', // Coin Strike
    'lucha_mania':        'arcadeforge', // Lucha Libre
    'elvis_frog':         'arcadeforge', // Elvis Frog in Vegas
    'super_hot':          'arcadeforge', // 100 Super Hot (EGT)
    // -- WILD COLLECT additions
    'wild_safari':       'ironreel',     // Wild Safari Express
    'wild_deep':         'vaultx',       // Wild Deep Ocean
    'wild_west_rush':    'vaultx',       // Reel Wild West

    // -- MYSTERY STACKS additions
    'golden_pharaoh':    'phantomworks', // Golden Pharaoh's Secret
    'mystic_cauldron':   'phantomworks', // Mystic Cauldron
    'crystal_shrine':    'celestial',    // Crystal Shrine

    // -- COIN RESPIN additions
    'dragon_coins':      'solstice',     // Lucky Dragon Coins
    'mine_coins':        'vaultx',       // Gold Mine Coins
    'vault_coins':       'ironreel',     // Money Vault

    // -- CHAMBER SPINS additions
    'demon_chambers':    'phantomworks', // Demon Chambers
    'norse_vaults':      'novaspin',     // Norse Vaults
    'crystal_chambers':  'celestial',    // Crystal Chambers
    'jade_temple':       'celestial',    // Orient Reels — eastern jade/temple
    'arctic_foxes':      'celestial',    // Celestial Plays — arctic nature
    'neon_viper':        'novaspin',     // NeonCore Labs — neon/cyber
    'midnight_drifter':  'ironreel',     // IronReel Ent. — racing/vehicles
    'pharaoh_march':     'celestial',    // Celestial Plays — Egyptian
    'iron_stampede':     'ironreel',     // IronReel Entertainment — classic reels
    'golden_jaguar':     'celestial',    // Celestial Plays — jungle nature
    'lightning_pearl':   'novaspin',     // NovaSpin Studios — electric ocean
    'samurai_blade':     'celestial',    // Orient Reels — eastern mythic
    'comet_rush':        'novaspin',     // NovaSpin Studios — space sci-fi
    'wolf_rise':         'solstice',     // SolsticeFX — dark nature electric
    'aztec_ascent':      'goldenedge',   // GoldenEdge Gaming — jungle ancient gold
    'diamond_falls':     'novaspin',
    'dragon_tumble':     'phantomworks',
    'golden_cascade':    'ironreel',
    'thunder_reel':      'novaspin',
    'crystal_veil':      'phantomworks',
    'primal_vault':      'ironreel',
    'fortune_bazaar':    'arcadeforge',
    'celestial_bazaar':  'vaultx',
    'titan_forge':       'ironreel',
    'mammoth_riches':    'ironreel',
    'koi_ascension':     'celestial',
    'pharaoh_collect':   'vaultx',
    'midnight_oasis':    'vaultx',
    'neptune_storm':     'novaspin',
    'twin_dragons':      'celestial',
    'mirror_palace':     'phantomworks',
    'golden_vault':      'vaultx',
    'thunder_jackpot':   'novaspin',

    // -- New game chrome mappings (Sprint 73) ──────────────────────────
    'agent_zero':        'ironreel',     // spy/heist
    'big_top_bonanza':   'arcadeforge',  // circus/fun
    'black_ops_heist':   'ironreel',     // heist
    'castle_siege':      'phantomworks', // medieval
    'cleopatra_gold':    'celestial',    // Egyptian
    'clockwork_realm':   'ironreel',     // mechanical
    'dragon_forge':      'phantomworks', // fantasy
    'galactic_raiders':  'novaspin',     // space
    'gold_crown_club':   'vaultx',       // luxury/dark
    'grand_prix_rush':   'ironreel',     // racing
    'jungle_fury':       'celestial',    // nature
    'monaco_million':    'vaultx',       // luxury
    'nova_blackhole':    'novaspin',     // space
    'pixel_rewind':      'arcadeforge',  // retro
    'rockstar_wild':     'arcadeforge',  // music
    'rome_eternal':      'phantomworks', // mythology
    'snow_queen_riches': 'celestial',    // nature
    'solar_fist':        'novaspin',     // energy
    'thunder_hero':      'phantomworks', // mythology
    'world_cup_glory':   'arcadeforge',  // sports

    // -- 30 New Slots (Session 8) ─────────────────────────────────────
    'golden_vault_pharaoh': 'goldenedge',   // GoldenEdge Gaming
    'mythic_olympiad':      'celestial',    // Celestial Plays
    'neon_nexus':           'neoncore',     // NeonCore Labs
    'anglers_fortune':      'vaultx',       // VaultX Gaming
    'mecha_warriors':       'phantomworks', // PhantomWorks
    'enchanted_grove':      'novaspin',     // NovaSpin Studios
    'dragons_hoard':        'ironreel',     // IronReel Entertainment
    'time_keepers_book':    'solstice',     // SolsticeFX
    'cyber_rebellion':      'neoncore',     // NeonCore Labs
    'volcano_riches':       'ironreel',     // IronReel Entertainment
    'sunken_treasure':      'vaultx',       // VaultX Gaming
    'wild_stallion':        'goldenedge',   // GoldenEdge Gaming
    'celestial_cosmos':     'celestial',    // Celestial Plays
    'jade_prosperity':      'orientreels',  // Orient Reels
    'inferno_fiesta':       'arcadeforge',  // ArcadeForge
    'mystic_wolf':          'phantomworks', // PhantomWorks
    'ancient_alchemist':    'solstice',     // SolsticeFX
    'thunder_titan':        'celestial',    // Celestial Plays
    'carnival_chaos':       'arcadeforge',  // ArcadeForge
    'safari_king':          'goldenedge',   // GoldenEdge Gaming
    'crystal_royals':       'novaspin',     // NovaSpin Studios
    'infernal_depths':      'phantomworks', // PhantomWorks
    'rainbow_riches_quest': 'goldenedge',   // GoldenEdge Gaming
    'steampunk_gears':      'solstice',     // SolsticeFX
    'phoenix_rising':       'ironreel',     // IronReel Entertainment
    'arctic_frost':         'frostbyte',    // FrostByte Gaming
    'urban_rooftop':        'novaspin',     // NovaSpin Studios
    'enchanted_maze':       'novaspin',     // NovaSpin Studios
    'samurai_honor':        'desertgold',   // Desert Gold Studios
    'mega_diamond_rush':    'vaultx',       // VaultX Gaming
};

// Fallback chrome style by template type (used when no explicit mapping)
const TEMPLATE_CHROME_FALLBACK = {
    'classic':  'arcadeforge',
    'standard': 'ironreel',
    'extended': 'vaultx',
    'scatter':  'celestial',
    'grid':     'novaspin',
};

/**
 * Returns the chrome style key for a given game definition object.
 * Falls back to the template-based default if no explicit entry.
 * @param {object} game
 * @returns {string} chrome style key
 */
function getGameChromeStyle(game) {
    if (!game) return 'ironreel';
    var style = GAME_CHROME_STYLES[game.id];
    if (typeof style === 'string') return style;
    var tmpl = TEMPLATE_CHROME_FALLBACK[game.template];
    if (typeof tmpl === 'string') return tmpl;
    return 'ironreel';
}

// ═══════════════════════════════════════════════════════════════════
// Provider Full Themes — unified visual + particle + sound config
// ═══════════════════════════════════════════════════════════════════

const PROVIDER_FULL_THEMES = {
    // ── NovaSpin Studios: sci-fi electric cyan / cosmic space ────────────────
    novaspin: {
        visual: { primary: '#00e5ff', secondary: '#0a0a2e', glow: '#00e5ff', accent: 'linear-gradient(135deg,#00e5ff,#7c4dff)' },
        particles: { colors: ['#00e5ff','#7c4dff','#ffffff','#00b8d4','#448aff'], style: 'electric', gravity: 0.02, drag: 0.98, turbulence: 0.3 },
        sound: { waveform: 'sawtooth', baseFreq: 440, scale: [440,523,587,659,784,880], filterFreq: 3000, reverb: 0.3, attack: 0.01, decay: 0.3 },
        ambient: { waveform: 'sine', freq: 110, filterFreq: 800, volume: 0.04 },
        animation: { chrome: 'novaFrameEnergy', idle: 'pulse', win: 'electricBurst' },
        // Game-specific celebration config
        particleColors: ['#00e5ff','#7c4dff','#ffffff','#00b8d4','#448aff'],
        ambientStyle: 'cosmic',
        winTextStyle: 'linear-gradient(135deg, #00e5ff 0%, #7c4dff 100%)',
        symbolHitStyle: 'electric'   // white flash for electric/lightning themes
    },
    // ── Celestial Plays: Greek mythology, lightning, gold columns / azure ────
    celestial: {
        visual: { primary: '#ffd700', secondary: '#0d1b3e', glow: '#ffd700', accent: 'linear-gradient(135deg,#ffd700,#ff8f00)' },
        particles: { colors: ['#ffd700','#ffecb3','#ffffff','#ff8f00','#ffe082'], style: 'feather', gravity: 0.03, drag: 0.97, turbulence: 0.15 },
        sound: { waveform: 'sine', baseFreq: 523, scale: [523,587,659,698,784,880], filterFreq: 2000, reverb: 0.6, attack: 0.05, decay: 0.5 },
        ambient: { waveform: 'triangle', freq: 130, filterFreq: 600, volume: 0.03 },
        animation: { chrome: 'celestialFrameShimmer', idle: 'shimmer', win: 'divineRays' },
        // Game-specific celebration config
        particleColors: ['#ffd700','#4fc3f7','#ffffff','#29b6f6','#ffe082'],
        ambientStyle: 'electric',
        winTextStyle: 'linear-gradient(135deg, #ffd700 0%, #4fc3f7 50%, #ffd700 100%)',
        symbolHitStyle: 'electric'   // lightning/god theme → white flash
    },
    // ── IronReel Entertainment: earthy nature, wolf, copper/stone ───────────
    ironreel: {
        visual: { primary: '#ff6d00', secondary: '#1a1209', glow: '#ff6d00', accent: 'linear-gradient(135deg,#ff6d00,#ffab00)' },
        particles: { colors: ['#ff6d00','#ffab00','#ff3d00','#ffffff','#ffd54f'], style: 'ember', gravity: 0.08, drag: 0.96, turbulence: 0.1 },
        sound: { waveform: 'square', baseFreq: 220, scale: [220,261,293,349,392,440], filterFreq: 1500, reverb: 0.2, attack: 0.005, decay: 0.2 },
        ambient: { waveform: 'sawtooth', freq: 65, filterFreq: 400, volume: 0.03 },
        animation: { chrome: 'ironFrameGrain', idle: 'grain', win: 'emberShower' },
        // Game-specific celebration config
        particleColors: ['#26a69a','#80cbc4','#8d6e63','#a5d6a7','#ffffff'],
        ambientStyle: 'nature',
        winTextStyle: 'linear-gradient(135deg, #ff6d00 0%, #ffab00 100%)',
        symbolHitStyle: 'golden'     // earthy/gold pulse
    },
    // ── GoldenEdge Gaming: candy/sweet, pastel pink/amber/rainbow ───────────
    goldenedge: {
        visual: { primary: '#ffab00', secondary: '#1a0f00', glow: '#ffd54f', accent: 'linear-gradient(135deg,#ffab00,#ffd54f)' },
        particles: { colors: ['#ffd700','#ffab00','#ffd54f','#ffffff','#ffe082'], style: 'droplet', gravity: 0.06, drag: 0.97, turbulence: 0.08 },
        sound: { waveform: 'sine', baseFreq: 392, scale: [392,440,523,587,659,784], filterFreq: 2500, reverb: 0.4, attack: 0.02, decay: 0.4 },
        ambient: { waveform: 'sine', freq: 98, filterFreq: 500, volume: 0.03 },
        animation: { chrome: 'goldenFrameFlow', idle: 'flow', win: 'goldCascade' },
        // Game-specific celebration config
        particleColors: ['#f06292','#ba68c8','#ff80ab','#ea80fc','#ffffff'],
        ambientStyle: 'golden',
        winTextStyle: 'linear-gradient(135deg, #f06292 0%, #ba68c8 33%, #ffab00 66%, #f06292 100%)',
        symbolHitStyle: 'rainbow'    // candy theme → rainbow shimmer
    },
    // ── VaultX Gaming: wealth/heist, dark steel, gold/green ─────────────────
    vaultx: {
        visual: { primary: '#00e676', secondary: '#0a0a0a', glow: '#00e676', accent: 'linear-gradient(135deg,#00e676,#00bfa5)' },
        particles: { colors: ['#00e676','#69f0ae','#00bfa5','#ffffff','#b2ff59'], style: 'matrix', gravity: 0.01, drag: 0.99, turbulence: 0.2 },
        sound: { waveform: 'sawtooth', baseFreq: 330, scale: [330,370,415,440,494,554], filterFreq: 2000, reverb: 0.2, attack: 0.005, decay: 0.25 },
        ambient: { waveform: 'square', freq: 82, filterFreq: 350, volume: 0.025 },
        animation: { chrome: 'vaultFrameScan', idle: 'scan', win: 'matrixRain' },
        // Game-specific celebration config
        particleColors: ['#ffd700','#69f0ae','#00e676','#ffffff','#b2ff59'],
        ambientStyle: 'golden',
        winTextStyle: 'linear-gradient(135deg, #ffd700 0%, #00e676 100%)',
        symbolHitStyle: 'golden'     // coin/gold wealth theme → golden pulse
    },
    // ── SolsticeFX: imperial red lacquer, gold filigree, eastern dragon ─────
    solstice: {
        visual: { primary: '#ff1744', secondary: '#1a0a00', glow: '#ffd700', accent: 'linear-gradient(135deg,#ff1744,#ffd700)' },
        particles: { colors: ['#ff1744','#ffd700','#ff6d00','#ffffff','#ff8a80'], style: 'wisp', gravity: 0.04, drag: 0.97, turbulence: 0.25 },
        sound: { waveform: 'triangle', baseFreq: 349, scale: [349,392,440,523,587,698], filterFreq: 1800, reverb: 0.5, attack: 0.03, decay: 0.4 },
        ambient: { waveform: 'sine', freq: 116, filterFreq: 550, volume: 0.035 },
        animation: { chrome: 'solsticeFrameAurora', idle: 'aurora', win: 'auroraFlare' },
        // Game-specific celebration config
        particleColors: ['#ff1744','#ffd700','#ff6d00','#ef9a9a','#ffffff'],
        ambientStyle: 'mystical',
        winTextStyle: 'linear-gradient(135deg, #ff1744 0%, #ffd700 100%)',
        symbolHitStyle: 'golden'     // imperial gold accent pulse
    },
    // ── PhantomWorks: gothic purple, blood-red, dark/egyptian mystery ────────
    phantomworks: {
        visual: { primary: '#aa00ff', secondary: '#0d0014', glow: '#ea80fc', accent: 'linear-gradient(135deg,#aa00ff,#d500f9)' },
        particles: { colors: ['#aa00ff','#ea80fc','#d500f9','#ce93d8','#ffffff'], style: 'smoke', gravity: -0.02, drag: 0.98, turbulence: 0.35 },
        sound: { waveform: 'sawtooth', baseFreq: 261, scale: [261,293,311,349,392,466], filterFreq: 1200, reverb: 0.7, attack: 0.08, decay: 0.6 },
        ambient: { waveform: 'sawtooth', freq: 73, filterFreq: 300, volume: 0.025 },
        animation: { chrome: 'phantomFrameMist', idle: 'mist', win: 'spectralBurst' },
        // Game-specific celebration config
        particleColors: ['#aa00ff','#ea80fc','#d500f9','#ce93d8','#7c4dff'],
        ambientStyle: 'mystical',
        winTextStyle: 'linear-gradient(135deg, #aa00ff 0%, #ea80fc 50%, #d500f9 100%)',
        symbolHitStyle: 'electric'   // dark/spectral flash
    },
    // ── ArcadeForge: classic/retro pub machine, red/orange/pixel ────────────
    arcadeforge: {
        visual: { primary: '#ff4081', secondary: '#0a0a1a', glow: '#ff80ab', accent: 'linear-gradient(135deg,#ff4081,#536dfe)' },
        particles: { colors: ['#ff4081','#536dfe','#ffff00','#00e676','#ffffff'], style: 'pixel', gravity: 0.05, drag: 0.96, turbulence: 0.15 },
        sound: { waveform: 'square', baseFreq: 523, scale: [523,587,659,698,784,880], filterFreq: 4000, reverb: 0.1, attack: 0.005, decay: 0.15 },
        ambient: { waveform: 'square', freq: 130, filterFreq: 700, volume: 0.02 },
        animation: { chrome: 'arcadeFrameFlicker', idle: 'flicker', win: 'pixelExplosion' },
        // Game-specific celebration config
        particleColors: ['#ff1744','#ff6d00','#ffff00','#ff4081','#ffffff'],
        ambientStyle: 'volcanic',
        winTextStyle: 'linear-gradient(135deg, #ff1744 0%, #ff6d00 50%, #ffff00 100%)',
        symbolHitStyle: 'golden'     // classic hot/retro → warm golden pulse
    },
    // ── NeonCore Labs: matrix green, circuit data streams ────────────────
    neoncore: {
        visual: { primary: '#00ff80', secondary: '#001a0d', glow: '#00ff80', accent: 'linear-gradient(135deg,#00ff80,#00e5ff)' },
        particles: { colors: ['#00ff80','#00e5ff','#b2ff59','#69f0ae','#ffffff'], style: 'digital', gravity: 0.01, drag: 0.98, turbulence: 0.08 },
        sound: { waveform: 'sawtooth', baseFreq: 440, scale: [440,494,554,587,659,740], filterFreq: 3500, reverb: 0.35, attack: 0.01, decay: 0.25 },
        ambient: { waveform: 'sawtooth', freq: 110, filterFreq: 500, volume: 0.015 },
        animation: { chrome: 'neonCoreFrame', idle: 'pulse', win: 'digitalBurst' },
        particleColors: ['#00ff80','#00e5ff','#b2ff59','#ffffff','#69f0ae'],
        ambientStyle: 'digital',
        winTextStyle: 'linear-gradient(135deg, #00ff80 0%, #00e5ff 50%, #b2ff59 100%)',
        symbolHitStyle: 'electric'
    },
    // ── FrostByte Gaming: icy blue, frozen crystal edges ─────────────────
    frostbyte: {
        visual: { primary: '#8cd2ff', secondary: '#041020', glow: '#b4e6ff', accent: 'linear-gradient(135deg,#8cd2ff,#e0f2fe)' },
        particles: { colors: ['#8cd2ff','#b4e6ff','#e0f2fe','#60a5fa','#ffffff'], style: 'snow', gravity: 0.03, drag: 0.97, turbulence: 0.06 },
        sound: { waveform: 'sine', baseFreq: 660, scale: [660,740,830,880,990,1050], filterFreq: 5000, reverb: 0.5, attack: 0.02, decay: 0.4 },
        ambient: { waveform: 'sine', freq: 165, filterFreq: 600, volume: 0.015 },
        animation: { chrome: 'frostFrame', idle: 'shimmer', win: 'iceBurst' },
        particleColors: ['#8cd2ff','#b4e6ff','#e0f2fe','#ffffff','#60a5fa'],
        ambientStyle: 'frozen',
        winTextStyle: 'linear-gradient(135deg, #60a5fa 0%, #e0f2fe 50%, #8cd2ff 100%)',
        symbolHitStyle: 'electric'
    },
    // ── Desert Gold Studios: warm sand, golden heat haze ─────────────────
    desertgold: {
        visual: { primary: '#daa63c', secondary: '#1a0f00', glow: '#f0c040', accent: 'linear-gradient(135deg,#daa63c,#c8963c)' },
        particles: { colors: ['#daa63c','#f0c040','#c8963c','#fbbf24','#ffffff'], style: 'embers', gravity: 0.04, drag: 0.96, turbulence: 0.10 },
        sound: { waveform: 'triangle', baseFreq: 370, scale: [370,415,440,494,554,587], filterFreq: 2800, reverb: 0.3, attack: 0.015, decay: 0.3 },
        ambient: { waveform: 'triangle', freq: 92, filterFreq: 450, volume: 0.018 },
        animation: { chrome: 'desertFrame', idle: 'heatwave', win: 'sandstorm' },
        particleColors: ['#daa63c','#f0c040','#fbbf24','#ffffff','#c8963c'],
        ambientStyle: 'desert',
        winTextStyle: 'linear-gradient(135deg, #c8963c 0%, #f0c040 50%, #fbbf24 100%)',
        symbolHitStyle: 'golden'
    },
    // ── Orient Reels: red lantern, ink brush elegance ────────────────────
    orientreels: {
        visual: { primary: '#e63228', secondary: '#1a0000', glow: '#ff4040', accent: 'linear-gradient(135deg,#e63228,#dc2626)' },
        particles: { colors: ['#e63228','#ff4040','#fbbf24','#dc2626','#ffffff'], style: 'lantern', gravity: -0.02, drag: 0.97, turbulence: 0.05 },
        sound: { waveform: 'triangle', baseFreq: 523, scale: [523,587,659,784,880,1046], filterFreq: 3200, reverb: 0.4, attack: 0.01, decay: 0.35 },
        ambient: { waveform: 'sine', freq: 131, filterFreq: 550, volume: 0.015 },
        animation: { chrome: 'orientFrame', idle: 'lanternFloat', win: 'fireworks' },
        particleColors: ['#e63228','#ff4040','#fbbf24','#dc2626','#ffffff'],
        ambientStyle: 'oriental',
        winTextStyle: 'linear-gradient(135deg, #dc2626 0%, #fbbf24 50%, #e63228 100%)',
        symbolHitStyle: 'golden'
    }
};

/** Get the full theme config for a game. */
function getProviderFullTheme(game) {
    const key = getGameChromeStyle(game);
    return PROVIDER_FULL_THEMES[key] || PROVIDER_FULL_THEMES.ironreel;
}
