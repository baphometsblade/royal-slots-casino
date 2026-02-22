// ═══════════════════════════════════════════════════════════════════
// Chrome Styles — maps every game ID to its provider chrome key
// ═══════════════════════════════════════════════════════════════════
//
// 8 fictional provider brands, each with a distinct visual identity:
//
//  novaspin     — NovaSpin Studios     (sci-fi electric cyan, dark space)
//  celestial    — Celestial Plays      (Greek gold columns, deep azure)
//  ironreel     — IronReel Ent.        (earthy copper/stone, nature)
//  goldenedge   — GoldenEdge Gaming    (candy pastel pink/amber)
//  vaultx       — VaultX Gaming        (dark steel heist/western grit)
//  solstice     — SolsticeFX           (red lacquer, imperial gold)
//  phantomworks — PhantomWorks         (gothic purple, blood-red shadow)
//  arcadeforge  — ArcadeForge          (chrome ring, retro pub-machine)
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
    return GAME_CHROME_STYLES[game.id]
        || TEMPLATE_CHROME_FALLBACK[game.template]
        || 'ironreel';
}
