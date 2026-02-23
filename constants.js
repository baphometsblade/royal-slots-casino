/**
 * ============================================================
 * Casino App — Global Constants & Configuration
 * ============================================================
 *
 * Extracted from app.js to eliminate magic numbers and provide
 * a single source of truth for all configurable values.
 *
 * Loaded via <script> tag before app.js. All values are plain
 * global `const` declarations (no modules).
 */

// ─────────────────────────────────────────────────────────────
// 1. DEFAULT VALUES
// ─────────────────────────────────────────────────────────────

/** @type {number} Starting balance for new players (in dollars) */
const DEFAULT_BALANCE = 5000;

/** @type {number} Default bet amount */
const DEFAULT_BET = 50;

/** @type {object} Default player statistics on first load or reset */
const DEFAULT_STATS = {
    totalSpins: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    gamesPlayed: {},
    achievements: []
};

/** @type {number} Default starting XP for a new player */
const DEFAULT_PLAYER_XP = 0;

/** @type {number} Default starting level for a new player */
const DEFAULT_PLAYER_LEVEL = 1;

/** @type {number} Base XP required to advance from level 1 */
const BASE_XP_PER_LEVEL = 100;

/** @type {number} XP growth exponent per level: XP = BASE * pow(GROWTH, level-1) */
const XP_LEVEL_GROWTH_RATE = 1.25;

// ─────────────────────────────────────────────────────────────
// 2. TIMING & ANIMATION CONSTANTS
// ─────────────────────────────────────────────────────────────

/**
 * Reel spin animation — symbol cycling interval (ms).
 * Normal and turbo variants.
 */
const REEL_CYCLE_INTERVAL_NORMAL = 70;
const REEL_CYCLE_INTERVAL_TURBO = 40;

/**
 * Reel stop delay — base delay before first reel stops (ms).
 */
const REEL_STOP_BASE_DELAY_NORMAL = 600;
const REEL_STOP_BASE_DELAY_TURBO = 200;

/**
 * Reel stop stagger — per-column delay cap (total divided among columns).
 * The formula is: max(MIN, floor(TOTAL / cols)).
 */
const REEL_STOP_STAGGER_TOTAL_NORMAL = 1200;
const REEL_STOP_STAGGER_MIN_NORMAL = 200;
const REEL_STOP_STAGGER_TOTAL_TURBO = 400;
const REEL_STOP_STAGGER_MIN_TURBO = 60;

/**
 * Free-spin reel stop delays (slightly faster than main spins).
 */
const FREE_SPIN_REEL_STOP_BASE_NORMAL = 500;
const FREE_SPIN_REEL_STOP_BASE_TURBO = 150;
const FREE_SPIN_REEL_STAGGER_TOTAL_NORMAL = 900;
const FREE_SPIN_REEL_STAGGER_MIN_NORMAL = 150;
const FREE_SPIN_REEL_STAGGER_TOTAL_TURBO = 300;
const FREE_SPIN_REEL_STAGGER_MIN_TURBO = 50;

/** Delay after last reel stops before evaluating the win (ms) */
const WIN_EVALUATION_DELAY = 300;

/** Delay before triggering a respin in classic 3-reel mode (ms) */
const RESPIN_TRIGGER_DELAY = 800;

/** Reel column stop animation (visual bounce) duration during respin (ms) */
const RESPIN_REEL_STOP_DELAY = 800;

/** Delay before Starburst-style expanding wild respin (ms) */
const EXPANDING_WILD_RESPIN_DELAY = 1000;

/** Delay before triggering the win cascade particle effect (ms) */
const WIN_CASCADE_TRIGGER_DELAY = 200;

/** How long the win amount overlay stays on screen (ms) */
const WIN_DISPLAY_DURATION_NORMAL = 3000;

/** How long the big win tier overlay stays on screen (ms) */
const WIN_DISPLAY_DURATION_BIG = 5000;

/** Duration the achievement notification is visible before sliding out (ms) */
const ACHIEVEMENT_NOTIFICATION_DURATION = 4000;

/** Slide-out animation time for achievement notification (ms) */
const ACHIEVEMENT_SLIDE_OUT_DURATION = 500;

/** Free spins intro overlay auto-dismiss delay (ms) */
const FREE_SPINS_OVERLAY_DISMISS_DELAY = 2500;

/** Delay before starting first free spin after overlay dismisses (ms) */
const FREE_SPINS_FIRST_SPIN_DELAY = 500;

/** Delay between consecutive free spins (ms) */
const FREE_SPINS_ADVANCE_DELAY = 1500;

/** How long the free spins summary overlay stays after bonus ends (ms) */
const FREE_SPINS_SUMMARY_DISPLAY_DURATION = 3500;

/** Delay before hiding the free spins HUD after bonus ends (ms) */
const FREE_SPINS_HUD_HIDE_DELAY = 3000;

/** Duration the bonus effect text floats on screen (ms) */
const BONUS_EFFECT_DURATION = 2500;

/** Page transition slide-in/out duration (ms) */
const PAGE_TRANSITION_DURATION = 300;

/** Confetti particle lifetime before removal (ms) */
const CONFETTI_LIFETIME = 4000;

/** Particle burst lifetime before removal (ms) */
const PARTICLE_LIFETIME = 1500;

/** Toast notification display duration before exit (ms) */
const TOAST_DISPLAY_DURATION = 3500;

/** Toast exit animation duration (ms) */
const TOAST_EXIT_DURATION = 400;

/** Daily bonus modal auto-close delay after claiming (ms) */
const DAILY_BONUS_CLOSE_DELAY = 2000;

/** Bonus wheel modal auto-close delay after winning (ms) */
const BONUS_WHEEL_CLOSE_DELAY = 3000;

/** Bonus wheel spin animation total duration (ms) */
const BONUS_WHEEL_SPIN_DURATION = 4000;

/** Jackpot ticker update interval (ms) */
const JACKPOT_TICKER_INTERVAL = 800;

/** Win ticker message rotation interval (ms) */
const WIN_TICKER_INTERVAL = 4000;

/** Auto-spin polling interval — wait for current spin to finish (ms) */
const AUTO_SPIN_POLL_INTERVAL = 300;

/** Auto-spin retry delay when still spinning (ms) */
const AUTO_SPIN_RETRY_DELAY = 500;

/** Auto-spin pause between spins — normal mode (ms) */
const AUTO_SPIN_PAUSE_NORMAL = 800;

/** Auto-spin pause between spins — turbo mode (ms) */
const AUTO_SPIN_PAUSE_TURBO = 400;

/** Delay before showing daily bonus modal on page load (ms) */
const DAILY_BONUS_SHOW_DELAY = 1500;

/** Orientation change recalculation delay (ms) */
const ORIENTATION_CHANGE_DELAY = 100;

/** Default auto-spin delay from URL parameter (ms) */
const DEFAULT_AUTO_SPIN_DELAY = 700;

// ─────────────────────────────────────────────────────────────
// 3. GAME LIMITS & THRESHOLDS
// ─────────────────────────────────────────────────────────────

/** Maximum free spins cap to prevent runaway retrigger loops */
const MAX_FREE_SPINS = 50;

/** Maximum number of recently played games stored */
const MAX_RECENTLY_PLAYED = 10;

/** Default cluster minimum if not specified by game config */
const DEFAULT_CLUSTER_MIN = 5;

/** Minimum payline match count required for a win */
const PAYLINE_MIN_MATCH_COUNT = 3;

/** Big-win payline match count threshold (4+ of a kind) */
const PAYLINE_BIG_WIN_MATCH_COUNT = 4;

/** Scatter threshold for multi-row games (need 3+ scatters) */
const SCATTER_THRESHOLD_MULTI_ROW = 3;

/** Scatter threshold for classic games (need 2+ scatters) */
const SCATTER_THRESHOLD_CLASSIC = 2;

/** Full scatter threshold for multi-row (4+ for full bonus) */
const FULL_SCATTER_THRESHOLD_MULTI_ROW = 4;

/** Full scatter threshold for classic (3+ for full bonus) */
const FULL_SCATTER_THRESHOLD_CLASSIC = 3;

/** Minimum free spins from partial scatter trigger */
const MIN_PARTIAL_FREE_SPINS = 3;

/** Minimum extra free spins from retrigger */
const MIN_RETRIGGER_EXTRA_SPINS = 2;

/** Retrigger extra spins divisor (freeSpinsCount / this) */
const RETRIGGER_EXTRA_SPINS_DIVISOR = 3;

/** Partial scatter spins divisor (freeSpinsCount / this) */
const PARTIAL_SCATTER_SPINS_DIVISOR = 2;

/** Wild bonus pay multiplier (1.5x when wilds on payline) */
const WILD_PAY_MULTIPLIER = 1.5;

/** Expanding symbol boost chance during Book-of-Dead-style free spins */
const EXPANDING_SYMBOL_BOOST_CHANCE = 0.35;

/** Money collect symbol value multipliers (bet multiplier options) */
const MONEY_VALUE_MULTIPLIERS = [1, 2, 3, 5, 8, 10];

/** Username minimum length */
const USERNAME_MIN_LENGTH = 3;

/** Username maximum length */
const USERNAME_MAX_LENGTH = 20;

/** Maximum daily bonus streak count */
const MAX_DAILY_STREAK = 7;

/** Bonus wheel cooldown period (hours) */
const BONUS_WHEEL_COOLDOWN_HOURS = 4;

/** Initial ticker messages to generate on load */
const TICKER_INITIAL_MESSAGE_COUNT = 5;

/** Maximum ticker messages before oldest is dropped */
const TICKER_MAX_MESSAGES = 8;

/** Jackpot ticker base starting value */
const JACKPOT_TICKER_BASE_VALUE = 1247836;

/** Jackpot ticker random range added to base on init */
const JACKPOT_TICKER_RANDOM_RANGE = 50000;

/** Jackpot ticker minimum increment per tick */
const JACKPOT_TICKER_INCREMENT_MIN = 3;

/** Jackpot ticker maximum increment per tick */
const JACKPOT_TICKER_INCREMENT_MAX = 50;

/** Mobile touch minimum swipe distance threshold (px) */
const MIN_SWIPE_DISTANCE = 50;

// ─────────────────────────────────────────────────────────────
// 4. WIN TIER THRESHOLDS (multiplier of bet)
// ─────────────────────────────────────────────────────────────

/**
 * Win tier breakpoints determine which celebratory overlay is shown.
 * Based on win-amount / current-bet ratio.
 */
const WIN_TIER_EPIC_THRESHOLD = 50;
const WIN_TIER_MEGA_THRESHOLD = 20;
const WIN_TIER_BIG_THRESHOLD = 10;
const WIN_TIER_GREAT_THRESHOLD = 5;

/** Threshold (bet multiplier) for playing the mega-win sound */
const SOUND_MEGAWIN_THRESHOLD = 50;

/** Threshold (bet multiplier) for playing the big-win sound */
const SOUND_BIGWIN_THRESHOLD = 20;

/** XP awarded on a big/mega win */
const XP_AWARD_BIG_WIN = 25;

/** XP awarded on a regular win */
const XP_AWARD_REGULAR_WIN = 10;

/** XP awarded on every spin (win or lose) */
const XP_AWARD_PER_SPIN = 5;

// ─────────────────────────────────────────────────────────────
// 5. UI CONFIGURATION
// ─────────────────────────────────────────────────────────────

/** Number of confetti particles spawned per celebration */
const CONFETTI_COUNT = 50;

/** Minimum confetti particle size (px) */
const CONFETTI_MIN_SIZE = 5;

/** Maximum confetti particle size (px) */
const CONFETTI_MAX_SIZE = 15;

/** Default particle count per burst */
const PARTICLE_DEFAULT_COUNT = 8;

/** Particle count for center-screen win burst */
const PARTICLE_CENTER_BURST_COUNT = 15;

/** Particle count per cell during symbol cascade */
const PARTICLE_CASCADE_PER_CELL = 5;

/** Maximum cascade animation index (CSS class suffix cap) */
const SYMBOL_CASCADE_MAX_INDEX = 6;

/** Maximum top games shown in stats modal */
const STATS_TOP_GAMES_COUNT = 8;

/** Number of confetti colors (CSS classes: confetti-1 through confetti-5) */
const CONFETTI_COLOR_COUNT = 5;

// ─────────────────────────────────────────────────────────────
// 6. SOUND FREQUENCIES (Hz)
// ─────────────────────────────────────────────────────────────

/**
 * Musical note frequencies used by the Web Audio synthesizer.
 * Named after standard musical notes (scientific pitch notation).
 */

/** @type {number} E4 — 330 Hz */
const FREQ_E4 = 330;

/** @type {number} A4 — 440 Hz (concert pitch) */
const FREQ_A4 = 440;

/** @type {number} C5 — 523 Hz */
const FREQ_C5 = 523;

/** @type {number} C#5 / Db5 — 554 Hz */
const FREQ_CS5 = 554;

/** @type {number} D5 — 587 Hz */
const FREQ_D5 = 587;

/** @type {number} E5 — 659 Hz */
const FREQ_E5 = 659;

/** @type {number} G5 — 784 Hz */
const FREQ_G5 = 784;

/** @type {number} A5 — 880 Hz */
const FREQ_A5 = 880;

/** @type {number} B5 — 988 Hz */
const FREQ_B5 = 988;

/** @type {number} C6 — 1047 Hz */
const FREQ_C6 = 1047;

/**
 * Sound-specific frequency sequences.
 * Each array represents the notes played for a particular sound effect.
 */

/** Spin start: rising pitch sweep from 300 to 600 Hz */
const SOUND_SPIN_FREQ_START = 300;
const SOUND_SPIN_FREQ_END = 600;

/** Reel click: single percussive tone */
const SOUND_CLICK_FREQ = 1200;

/** Toggle beep: neutral single tone */
const SOUND_TOGGLE_FREQ = 700;

/** Scatter glimmer: rising sweep from 1200 to 1800 Hz */
const SOUND_SCATTER_FREQ_START = 1200;
const SOUND_SCATTER_FREQ_END = 1800;

/** Regular win: ascending two-note (C5, E5) */
const SOUND_WIN_FREQS = [FREQ_C5, FREQ_E5];

/** Big win: triumphant chord (C5, E5, G5, B5) */
const SOUND_BIGWIN_FREQS = [FREQ_C5, FREQ_E5, FREQ_G5, FREQ_B5];

/** Mega win: dramatic ascending sweep (A4, C#5, E5, G5, B5, C6) */
const SOUND_MEGAWIN_FREQS = [FREQ_A4, FREQ_CS5, FREQ_E5, FREQ_G5, FREQ_B5, FREQ_C6];

/** Free spin activation: magical three-note (D5, E5, G5) */
const SOUND_FREESPIN_FREQS = [FREQ_D5, FREQ_E5, FREQ_G5];

/** Bonus feature: celebratory three-note (E5, G5, A5) */
const SOUND_BONUS_FREQS = [FREQ_E5, FREQ_G5, FREQ_A5];

/** Lose: descending two-note (A4, E4) */
const SOUND_LOSE_FREQS = [FREQ_A4, FREQ_E4];

// ─────────────────────────────────────────────────────────────
// 6b. SOUND ENVELOPE PARAMETERS
// ─────────────────────────────────────────────────────────────

/** Spin sound gain and duration */
const SOUND_SPIN_GAIN = 0.3;
const SOUND_SPIN_DURATION = 0.15;

/** Click sound gain and duration */
const SOUND_CLICK_GAIN = 0.15;
const SOUND_CLICK_DURATION = 0.05;

/** Win sound gain and note spacing */
const SOUND_WIN_GAIN = 0.2;
const SOUND_WIN_NOTE_SPACING = 0.1;
const SOUND_WIN_NOTE_DURATION = 0.3;

/** Big win gain and note spacing */
const SOUND_BIGWIN_GAIN = 0.15;
const SOUND_BIGWIN_NOTE_SPACING = 0.08;
const SOUND_BIGWIN_NOTE_DURATION = 0.8;

/** Mega win gain and note spacing */
const SOUND_MEGAWIN_GAIN = 0.1;
const SOUND_MEGAWIN_NOTE_SPACING = 0.06;
const SOUND_MEGAWIN_NOTE_DURATION = 1.2;

/** Free spin sound gain and note spacing */
const SOUND_FREESPIN_GAIN = 0.2;
const SOUND_FREESPIN_NOTE_SPACING = 0.15;
const SOUND_FREESPIN_NOTE_DURATION = 0.5;

/** Toggle sound gain and duration */
const SOUND_TOGGLE_GAIN = 0.15;
const SOUND_TOGGLE_DURATION = 0.1;

/** Scatter sound gain and duration */
const SOUND_SCATTER_GAIN = 0.15;
const SOUND_SCATTER_DURATION = 0.25;

/** Bonus sound gain and note spacing */
const SOUND_BONUS_GAIN = 0.15;
const SOUND_BONUS_NOTE_SPACING = 0.12;
const SOUND_BONUS_NOTE_DURATION = 0.6;

/** Lose sound gain and note spacing */
const SOUND_LOSE_GAIN = 0.1;
const SOUND_LOSE_NOTE_SPACING = 0.15;
const SOUND_LOSE_NOTE_DURATION = 0.25;

/** Minimum gain floor for exponential ramp (must be > 0) */
const SOUND_GAIN_FLOOR = 0.01;

// ─────────────────────────────────────────────────────────────
// 7. STORAGE KEYS (localStorage)
// ─────────────────────────────────────────────────────────────

/**
 * All localStorage key strings used by the application.
 * Centralised here to prevent typos and enable easy key migration.
 */

/** Player balance */
const STORAGE_KEY_BALANCE = 'casinoBalance';

/** Player statistics (JSON) */
const STORAGE_KEY_STATS = 'casinoStats';

/** Auth token */
const STORAGE_KEY_TOKEN = 'casinoToken';

/** Current user profile (JSON) */
const STORAGE_KEY_USER = 'casinoUser';

/** All registered users (JSON map) */
const STORAGE_KEY_USERS = 'casinoUsers';

/** Sound enabled/disabled flag */
const STORAGE_KEY_SOUND_ENABLED = 'soundEnabled';

/** Recently played game IDs (JSON array) */
const STORAGE_KEY_RECENTLY_PLAYED = 'casinoRecentlyPlayed';

/** XP and level data (JSON) */
const STORAGE_KEY_XP = 'casinoXP';

/** Daily bonus streak and claim state (JSON) */
const STORAGE_KEY_DAILY_BONUS = 'casinoDailyBonus';

/** Bonus wheel last-spin timestamp (JSON) */
const STORAGE_KEY_BONUS_WHEEL = 'casinoBonusWheel';

/** User settings (JSON) */
const STORAGE_KEY_SETTINGS = 'casinoSettings';

// ─────────────────────────────────────────────────────────────
// 8. ACHIEVEMENT DEFINITIONS
// ─────────────────────────────────────────────────────────────

/**
 * Player achievements — each has:
 *   id: unique key
 *   name: display name
 *   desc: description shown to the player
 *   icon: emoji icon
 *   requirement: function(stats) => boolean
 */
const ACHIEVEMENTS = [
    {
        id: 'first_spin',
        name: 'First Spin',
        desc: 'Make your first spin',
        icon: '\u{1F3B0}',
        requirement: (stats) => stats.totalSpins >= 1
    },
    {
        id: 'big_spender',
        name: 'Big Spender',
        desc: 'Wager $10,000 total',
        icon: '\u{1F4B0}',
        requirement: (stats) => stats.totalWagered >= 10000
    },
    {
        id: 'lucky_7',
        name: 'Lucky 7',
        desc: 'Win 7 times',
        icon: '\u{1F340}',
        requirement: (stats) =>
            stats.totalWon > stats.totalWagered &&
            Object.values(stats.gamesPlayed).reduce((a, b) => a + b, 0) >= 7
    },
    {
        id: 'high_roller',
        name: 'High Roller',
        desc: 'Win $5,000 in one spin',
        icon: '\u{1F451}',
        requirement: (stats) => stats.biggestWin >= 5000
    },
    {
        id: 'slot_master',
        name: 'Slot Master',
        desc: 'Play 100 spins',
        icon: '\u2B50',
        requirement: (stats) => stats.totalSpins >= 100
    },
    {
        id: 'millionaire',
        name: 'Millionaire',
        desc: 'Win $50,000 total',
        icon: '\u{1F48E}',
        requirement: (stats) => stats.totalWon >= 50000
    },
    {
        id: 'game_explorer',
        name: 'Game Explorer',
        desc: 'Play 10 different games',
        icon: '\u{1F5FA}\uFE0F',
        requirement: (stats) => Object.keys(stats.gamesPlayed || {}).length >= 10
    },
    {
        id: 'jackpot_hunter',
        name: 'Jackpot Hunter',
        desc: 'Win $25,000 in one spin',
        icon: '\u{1F3AF}',
        requirement: (stats) => stats.biggestWin >= 25000
    }
];

/** Achievement requirement thresholds (for reference / testing) */
const ACHIEVEMENT_THRESHOLD_FIRST_SPIN = 1;
const ACHIEVEMENT_THRESHOLD_BIG_SPENDER_WAGERED = 10000;
const ACHIEVEMENT_THRESHOLD_LUCKY_7_WINS = 7;
const ACHIEVEMENT_THRESHOLD_HIGH_ROLLER_WIN = 5000;
const ACHIEVEMENT_THRESHOLD_SLOT_MASTER_SPINS = 100;
const ACHIEVEMENT_THRESHOLD_MILLIONAIRE_WON = 50000;
const ACHIEVEMENT_THRESHOLD_GAME_EXPLORER_GAMES = 10;
const ACHIEVEMENT_THRESHOLD_JACKPOT_HUNTER_WIN = 25000;

// ─────────────────────────────────────────────────────────────
// 9. WHEEL SEGMENTS (Bonus Wheel)
// ─────────────────────────────────────────────────────────────

/**
 * Bonus wheel prize segments.
 * Each segment defines:
 *   label: text rendered on the wheel
 *   value: dollar amount awarded
 *   color: fill color for the wheel slice
 *   xp: XP bonus awarded alongside the prize
 */
const WHEEL_SEGMENTS = [
    { label: '$100',  value: 100,  color: '#ef4444', xp: 10  },
    { label: '$250',  value: 250,  color: '#3b82f6', xp: 20  },
    { label: '$500',  value: 500,  color: '#10b981', xp: 30  },
    { label: '$1000', value: 1000, color: '#f59e0b', xp: 50  },
    { label: '$2500', value: 2500, color: '#8b5cf6', xp: 75  },
    { label: '$100',  value: 100,  color: '#ec4899', xp: 10  },
    { label: '$250',  value: 250,  color: '#06b6d4', xp: 20  },
    { label: '$5000', value: 5000, color: '#ffd700', xp: 150 }
];

// ─────────────────────────────────────────────────────────────
// 10. TICKER NAMES (fake player names for the win ticker)
// ─────────────────────────────────────────────────────────────

/** Display names randomly chosen for the rolling win ticker in the lobby */
const TICKER_NAMES = [
    'LuckyAce', 'JackpotKing', 'SlotMaster', 'BigWinner',
    'CasinoQueen', 'DiamondDan', 'GoldenStar', 'RoyalFlush',
    'MegaSpinner', 'FortuneHunter', 'VelvetRoller', 'NeonNight',
    'CherryBomb77', 'WildCard', 'HighStakes'
];

// ─────────────────────────────────────────────────────────────
// 11. XP TIER DEFINITIONS
// ─────────────────────────────────────────────────────────────

/**
 * Player tier progression tiers based on level.
 * Higher tiers unlock at higher levels.
 */
const XP_TIERS = [
    { name: 'BRONZE',   color: '#cd7f32', minLevel: 1  },
    { name: 'SILVER',   color: '#c0c0c0', minLevel: 5  },
    { name: 'GOLD',     color: '#ffd700', minLevel: 10 },
    { name: 'PLATINUM', color: '#e5e4e2', minLevel: 20 },
    { name: 'DIAMOND',  color: '#b9f2ff', minLevel: 35 },
    { name: 'LEGEND',   color: '#ff4500', minLevel: 50 }
];

// ─────────────────────────────────────────────────────────────
// 12. DAILY BONUS REWARDS
// ─────────────────────────────────────────────────────────────

/**
 * Daily login bonus rewards, indexed by streak day (0-6).
 * Day 7 loops back to the last entry.
 */
const DAILY_REWARDS = [
    { amount: 500,  xp: 25  },
    { amount: 750,  xp: 35  },
    { amount: 1000, xp: 50  },
    { amount: 1500, xp: 75  },
    { amount: 2000, xp: 100 },
    { amount: 3000, xp: 150 },
    { amount: 5000, xp: 250 }
];

// ─────────────────────────────────────────────────────────────
// 13. LEGACY SYMBOL LIST
// ─────────────────────────────────────────────────────────────

/**
 * Legacy global symbol names used for QA/forced-spin compatibility.
 * Modern games define their own symbol arrays per-game.
 */
const SLOT_SYMBOLS = [
    'diamond', 'cherry', 'seven', 'crown', 'star',
    'bell', 'coin', 'bar', 'clover', 'watermelon'
];

// ─────────────────────────────────────────────────────────────
// 14. REAL ROLLING REEL STRIP CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Number of buffer symbols above and below the visible area per strip */
const REEL_STRIP_BUFFER = 12;

/** Pixels per second during normal spin scroll */
const REEL_SPIN_PX_PER_SEC = 3000;

/** Pixels per second during turbo spin scroll */
const REEL_SPIN_PX_PER_SEC_TURBO = 5000;

/** Duration of deceleration when stopping a reel (ms) */
const REEL_DECEL_DURATION = 650;

/** Overshoot bounce distance in pixels */
const REEL_BOUNCE_OVERSHOOT = 12;

/** Duration of bounce-back after overshoot (ms) */
const REEL_BOUNCE_DURATION = 220;

/** Cell dimensions lookup by grid config (height in px, gap in px) */
const REEL_CELL_DIMS = {
    '3x3': { h: 140, gap: 4 },
    '5x3': { h: 100, gap: 3 },
    '5x4': { h: 85,  gap: 3 },
    '5x5': { h: 80,  gap: 2 },
    '6x5': { h: 72,  gap: 2 },
    '7x7': { h: 58,  gap: 2 }
};

/** Template class names for slot UI templates */
const SLOT_TEMPLATES = ['classic', 'standard', 'extended', 'scatter', 'grid'];

// ─────────────────────────────────────────────────────────────
// 15-old. SEEDED RNG CONSTANTS
// ─────────────────────────────────────────────────────────────

/** FNV-1a hash offset basis */
const FNV_OFFSET_BASIS = 2166136261;

/** FNV-1a hash prime */
const FNV_PRIME = 16777619;

/** Default seed state if hash is zero */
const DEFAULT_SEED_STATE = 0x9e3779b9;

/** Seed step increment per call */
const SEED_STEP_INCREMENT = 0x6d2b79f5;

/** Max unsigned 32-bit int + 1 (for normalization to [0,1)) */
const UINT32_MAX_PLUS_ONE = 4294967296;

// ─────────────────────────────────────────────────────────────
// 15. BONUS WHEEL PHYSICS
// ─────────────────────────────────────────────────────────────

/** Minimum full rotations before the wheel lands */
const WHEEL_MIN_ROTATIONS = 5;

/** Maximum additional random rotations */
const WHEEL_MAX_EXTRA_ROTATIONS = 3;

/** Wheel center button radius (px) */
const WHEEL_CENTER_RADIUS = 18;

/** Wheel label font size definition */
const WHEEL_LABEL_FONT = 'bold 14px sans-serif';

/** Wheel border offset from canvas edge (px) */
const WHEEL_BORDER_OFFSET = 4;

/** Wheel center border stroke width (px) */
const WHEEL_CENTER_STROKE_WIDTH = 3;
