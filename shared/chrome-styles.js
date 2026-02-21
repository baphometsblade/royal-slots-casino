// ═══════════════════════════════════════════════════════════════════
// Chrome Styles — maps every game ID to its parent-slot chrome type
// ═══════════════════════════════════════════════════════════════════
//
// 10 chrome archetypes, each visually faithful to the real-world
// slot-machine UI family it replicates:
//
//  candy    — Sugar Rush / Sweet Bonanza   (candy-coloured rounded frame)
//  olympus  — Gates of Olympus family      (gold Greek columns)
//  wild     — Wolf Gold / Buffalo / Rhino  (earthy stone / copper)
//  egyptian — Book of Dead / Gonzo's Quest (sand-gold hieroglyph)
//  neon     — Starburst / Reactoonz        (electric neon on dark space)
//  western  — Tombstone / Wanted / DOA     (rope-wood plank)
//  oriental — 5 Lions / Dragon / Bamboo    (red lacquer, gold filigree)
//  joker    — Fire Joker / 100 Super Hot   (chrome ring, pub-machine)
//  dark     — Immortal Blood / Money Train (gothic purple, blood-red)
//  fishing  — Big Bass / Razor Shark       (ocean-wood dock)
// ═══════════════════════════════════════════════════════════════════

const GAME_CHROME_STYLES = {
    // ── CANDY ────────────────────────────────────────────────────────
    'sugar_rush':         'candy',   // Sugar Rush 1000
    'lucky_777':          'candy',   // Sweet Bonanza
    'starlight_princess': 'candy',   // Starlight Princess
    'jammin_fruits':      'candy',   // Jammin' Jars 2
    'sweet_bonanza':      'candy',   // Sweet Bonanza Xmas
    'fruit_party':        'candy',   // Fruit Party 2
    'extra_chilli':       'candy',   // Extra Chilli Megaways
    'dog_house_mega':     'candy',   // Dog House Megaways
    'puppy_palace':       'candy',   // Dog House (original)
    'fat_rabbit':         'candy',   // Fat Rabbit
    'esqueleto_fiesta':   'candy',   // Esqueleto Explosivo

    // ── OLYMPUS ───────────────────────────────────────────────────────
    'gates_olympus':      'olympus', // Gates of Olympus
    'olympus_rising':     'olympus', // Gates of Olympus 1000
    'olympian_gods':      'olympus', // Olympian Gods
    'golden_fortune':     'olympus', // Golden Fortune Wheel
    'ares_blade':         'olympus', // Ares: Blade of Chaos
    'crown_fire':         'olympus', // Crown of Fire
    'olympus_dream':      'olympus', // Olympus Dream Drop
    'pots_olympus':       'olympus', // Pots of Zeus
    'power_crown':        'olympus', // Crown of Power
    'merlin_power':       'olympus', // Merlin's Power (magic/regal)

    // ── WILD ─────────────────────────────────────────────────────────
    'wolf_gold':          'wild',    // Wolf Gold
    'buffalo_stampede':   'wild',    // Buffalo King
    'great_rhino':        'wild',    // Great Rhino Megaways
    'chilli_heat':        'wild',    // Chilli Heat Megaways
    'wild_toro':          'wild',    // Wild Toro 2
    'mega_safari':        'wild',    // Mega Moolah
    'goldstorm_ultra':    'wild',    // Gold Storm
    'gemhalla':           'wild',    // Valhalla Gems (Norse earth)
    'loki_loot':          'wild',    // Loki's Wild Loot (Norse)
    'buffalo_extreme':    'wild',    // Buffalo Blitz Extreme
    'buffalo_mega':       'wild',    // Buffalo King Thunder
    'viking_voyage':      'wild',    // Viking Voyage
    'island_tiki':        'wild',    // Tiki Tumble

    // ── EGYPTIAN ─────────────────────────────────────────────────────
    'book_dead':          'egyptian',// Book of Dead
    'gonzos_quest':       'egyptian',// Gonzo's Quest Megaways
    'pharaoh_legacy':     'egyptian',// Eye of Horus

    // ── NEON ─────────────────────────────────────────────────────────
    'starburst_xxl':      'neon',    // Starburst XXXtreme
    'quantum_burst':      'neon',    // Quantum cluster
    'twin_helix':         'neon',    // Twin Helix
    'neon_nights':        'neon',    // Neon Staxx
    'diamond_vault':      'neon',    // Diamond Vortex
    'nitro_street':       'neon',    // Nitro Rush
    'chaos_crew':         'neon',    // Chaos Crew 2
    'snoop_dollars':      'neon',    // Hip Hop Panda
    'reactoonz':          'neon',    // Reactoonz 2
    'gems_bonanza':       'neon',    // Gem Rocks / Gems Bonanza
    'mental_meltdown':    'neon',    // Mental (Nolimit City)

    // ── WESTERN ──────────────────────────────────────────────────────
    'black_bull':         'western', // Black Bull
    'tombstone_reload':   'western', // Tombstone No Mercy
    'san_quentin':        'western', // San Quentin xWays
    'wanted_dead':        'western', // Wanted Dead or a Wild
    'dead_alive':         'western', // Dead or Alive 2
    'wildfire_gold':      'western', // Wild Wild Riches
    'money_train':        'western', // Money Train 3
    'fire_hole':          'western', // Fire in the Hole xBomb (dark mine)

    // ── ORIENTAL ─────────────────────────────────────────────────────
    'lucky_dragon':       'oriental',// Lucky Dragon
    'dragon_megafire':    'oriental',// Dragon Kingdom
    'five_lions':         'oriental',// 5 Lions Megaways
    'big_bamboo':         'oriental',// Big Bamboo
    'gold_rush_frog':     'oriental',// Fortune Frog
    'coin_volcano':       'oriental',// Coin Volcano
    'sakura_princess':    'oriental',// Sakura Fortune

    // ── JOKER ────────────────────────────────────────────────────────
    'hot_chillies':       'joker',   // 3 Hot Chillies
    'fire_joker':         'joker',   // Fire Joker
    'mega_joker':         'joker',   // Mega Joker (NetEnt classic)
    'coin_strike':        'joker',   // Coin Strike
    'lucha_mania':        'joker',   // Lucha Libre
    'elvis_frog':         'joker',   // Elvis Frog in Vegas
    'super_hot':          'joker',   // 100 Super Hot (EGT)

    // ── DARK ─────────────────────────────────────────────────────────
    'crimson_fang':       'dark',    // Blood Suckers 2
    'madame_destiny':     'dark',    // Madame Destiny Megaways
    'immortal_blood':     'dark',    // Immortal Romance
    'le_bandit':          'dark',    // The Bandit
    'tome_madness':       'dark',    // Tome of Madness
    'eternal_romance':    'dark',    // Eternal Romance
    'pirate_fortune':     'dark',    // Pirates' Plenty

    // ── FISHING ──────────────────────────────────────────────────────
    'big_bass':           'fishing', // Big Bass Bonanza
    'bass_splash':        'fishing', // Big Bass Splash
    'razor_shark':        'fishing', // Razor Shark
    'madame_destiny':     'dark',    // (override above)
};

// Fallback chrome style by template type (used when no explicit mapping)
const TEMPLATE_CHROME_FALLBACK = {
    'classic':  'joker',
    'standard': 'wild',
    'extended': 'western',
    'scatter':  'olympus',
    'grid':     'neon',
};

/**
 * Returns the chrome style key for a given game definition object.
 * Falls back to the template-based default if no explicit entry.
 * @param {object} game
 * @returns {string} chrome style key
 */
function getGameChromeStyle(game) {
    if (!game) return 'wild';
    return GAME_CHROME_STYLES[game.id]
        || TEMPLATE_CHROME_FALLBACK[game.template]
        || 'wild';
}
