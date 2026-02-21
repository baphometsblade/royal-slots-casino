const config = require('../config');
const rng = require('./rng.service');

/**
 * House Edge / RTP Enforcement Service.
 *
 * Based on real slot mathematics scraped from actual Pragmatic Play,
 * Play'n GO, and other major provider paytables:
 *
 * KEY REAL-WORLD SLOT DATA:
 * ─────────────────────────
 * Wolf Gold (5x3, 25 lines): RTP 96.01%, medium volatility, max 2500x
 *   - Low symbols (J,Q,K,A): 0.2x-2x total bet for 3-5 of a kind
 *   - High symbols: 0.4x-20x total bet for 3-5 of a kind
 *   - Hit frequency: ~25-30%
 *
 * Gates of Olympus (6x5, scatter pays): RTP 96.50%, high volatility, max 5000x
 *   - Low symbols: 0.25x-10x total bet for 8-12+ of a kind
 *   - High symbols: 1.5x-50x total bet for 8-12+ of a kind
 *   - Requires 8+ matching symbols (much harder than paylines)
 *
 * Sweet Bonanza (6x5, scatter pays): RTP 96.48%, high volatility, max 21100x
 *   - Low symbols: 0.25x-2x for 8-12+
 *   - High candy: up to 50x for 12+
 *
 * Sugar Rush (7x7, cluster pays): RTP 96.50%, high volatility, max 5000x
 *   - 5-symbol cluster: 0.2x-1x bet
 *   - 15+ cluster: 20x-150x bet (extremely rare)
 *
 * Fire Joker (3x3, classic): RTP 96.15%, medium volatility, max 800x
 *   - Per-line pays: 2x-80x (but only 5 paylines)
 *   - Most value comes from wheel bonus
 *
 * CRITICAL INSIGHT: Real slots have 10-30% hit frequency.
 * Most spins are complete losses. Wins that DO occur are mostly
 * smaller than the bet ("losses disguised as wins" = ~27% of outcomes).
 */

// ═══════════════════════════════════════════════════════════
// VIRTUAL REEL STRIP WEIGHTS
// ═══════════════════════════════════════════════════════════
// Real slots use virtual reels with 100-200 stops per reel.
// Most stops are low-value symbols. Wild/scatter are very rare.
//
// Our games have 6 symbols indexed 0-5:
// [0]=common, [1]=common, [2]=medium, [3]=medium-high, [4]=rare, [5]=wild
//
// These weights control how often each symbol appears on the grid.

// 5x3 payline games (Wolf Gold style) — 15 cells
// With 6 symbols, 20 paylines, 3+ match = too many hits with uniform distribution
// Real Wolf Gold has ~9 regular symbols + wild + scatter on a 128-stop virtual reel
// To simulate: commons need 10-15x the weight of rare symbols
const BASE_WEIGHTS_5x3 = [100, 90, 50, 25, 8, 3]; // Wild ~1.1%

// 5x4 payline games — 20 cells, 40 paylines
const BASE_WEIGHTS_5x4 = [110, 100, 55, 25, 6, 2]; // Wild ~0.7%

// 6x5 cluster/scatter games (Gates of Olympus, Sweet Bonanza) — 30 cells
// Need 8+ matching to win. More symbols on grid = higher base match chance
// So weights must be even more skewed toward commons
const BASE_WEIGHTS_6x5 = [120, 110, 60, 28, 5, 1]; // Wild ~0.3%

// 7x7 cluster games (Sugar Rush) — 49 cells
// Massive grid. Clusters form easily. Need extremely rare high symbols.
const BASE_WEIGHTS_7x7 = [140, 130, 70, 30, 4, 1]; // Wild ~0.3%

// 3x3 classic games (Fire Joker) — 9 cells
// Small grid, few paylines. Can be slightly more generous with rare symbols.
const BASE_WEIGHTS_3x3 = [80, 70, 40, 20, 10, 5]; // Wild ~2.2%

// 3x1 single-line classic — 3 cells
const BASE_WEIGHTS_3x1 = [70, 60, 35, 18, 10, 6]; // Wild ~3.0%

// 5x5 cluster games — 25 cells
const BASE_WEIGHTS_5x5 = [110, 100, 55, 25, 6, 2]; // Wild ~0.7%

function getBaseWeightsForGrid(game) {
    const cols = game.gridCols || 3;
    const rows = game.gridRows || 1;
    const cells = cols * rows;

    if (cols === 7 && rows === 7) return BASE_WEIGHTS_7x7;
    if (cols === 6 && rows === 5) return BASE_WEIGHTS_6x5;
    if (cols === 5 && rows === 4) return BASE_WEIGHTS_5x4;
    if (cols === 5 && rows === 5) return BASE_WEIGHTS_5x5;
    if (cols === 5 && rows === 3) return BASE_WEIGHTS_5x3;
    if (cols === 3 && rows === 3) return BASE_WEIGHTS_3x3;
    if (rows === 1) return BASE_WEIGHTS_3x1;

    // Fallback based on cell count
    if (cells >= 40) return BASE_WEIGHTS_7x7;
    if (cells >= 25) return BASE_WEIGHTS_6x5;
    if (cells >= 15) return BASE_WEIGHTS_5x3;
    return BASE_WEIGHTS_3x3;
}

// ═══════════════════════════════════════════════════════════
// HIT FREQUENCY GATE
// ═══════════════════════════════════════════════════════════
// Even with weighted symbols, our simplified grid generation
// produces too many winning combos compared to real virtual reels.
//
// Real slots have a "miss" probability baked into their reel strips.
// We simulate this with a pre-spin probability check.
// If the check fails, the spin is forced to be a loss by replacing
// any potential winning patterns.
//
// Real hit frequencies by game type:
// - 3x3 classic: ~15-25% (medium volatility)
// - 5x3 payline: ~25-33% (but many wins < bet amount)
// - 6x5 scatter: ~20-30%
// - 7x7 cluster: ~25-35% (frequent small clusters, rare big ones)
//
// These values are the MAXIMUM possible win rate before RTP adjustment
// kicks in. The actual effective rate will be lower due to weight adjustment.

function getHitFrequency(game) {
    const cols = game.gridCols || 3;
    const rows = game.gridRows || 1;
    const winType = game.winType || 'classic';

    if (winType === 'classic') {
        if (rows === 1) return 0.15; // Single-line classic: 15%
        return 0.20; // 3x3 classic: 20%
    }

    if (winType === 'cluster') {
        if (cols >= 7) return 0.28; // 7x7 clusters: 28% (but mostly tiny wins)
        if (cols >= 6) return 0.25; // 6x5 clusters: 25%
        return 0.22; // 5x5 or smaller clusters
    }

    if (winType === 'payline') {
        if (rows >= 4) return 0.28; // 5x4 with 40 lines: 28%
        if (cols >= 5) return 0.30; // 5x3 with 20 lines: 30%
        return 0.20; // Smaller payline games
    }

    return 0.25; // Default
}

// ═══════════════════════════════════════════════════════════
// SYMBOL WEIGHT CALCULATION (with RTP tracking)
// ═══════════════════════════════════════════════════════════

function getSymbolWeights(game, gameStats) {
    const symbols = game.symbols;
    const numSymbols = symbols.length;
    const baseWeights = getBaseWeightsForGrid(game);

    // Start with base weights
    const weights = [];
    for (let i = 0; i < numSymbols; i++) {
        if (i < baseWeights.length) {
            weights.push(baseWeights[i]);
        } else {
            // Extra symbols get the lowest weight tier
            weights.push(baseWeights[baseWeights.length - 1]);
        }
    }

    // Dynamic RTP adjustment — kicks in after 50 spins for accuracy
    if (gameStats && gameStats.total_wagered > 0 && gameStats.total_spins > 50) {
        const actualRTP = gameStats.total_paid / gameStats.total_wagered;
        const targetRTP = config.TARGET_RTP;
        const drift = actualRTP - targetRTP;

        if (Math.abs(drift) > config.RTP_ADJUSTMENT_THRESHOLD) {
            const driftMagnitude = Math.min(Math.abs(drift), 2.0);

            // Strong asymmetry: house recovers FAST when RTP too high
            // Gentle increase when RTP too low (player-friendly)
            const baseAdj = drift > 0 ? -0.40 : 0.08;
            const scaleFactor = Math.min(driftMagnitude / 0.05, 5); // Scale up to 5x for large drift
            const adjustment = baseAdj * scaleFactor;

            for (let i = 0; i < numSymbols; i++) {
                if (i >= numSymbols - 2) {
                    // Wild + rare: adjust most aggressively
                    weights[i] = Math.max(0.1, weights[i] * (1 + adjustment));
                } else if (i >= numSymbols - 4) {
                    // Medium-high symbols
                    weights[i] = Math.max(0.5, weights[i] * (1 + adjustment * 0.5));
                }
                // When RTP too high: flood with commons to dilute winning combos
                if (i < 2 && drift > 0) {
                    weights[i] *= 1 + driftMagnitude * 0.5;
                }
            }
        }
    }

    return weights;
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC HIT FREQUENCY (adjusted by RTP tracking)
// ═══════════════════════════════════════════════════════════
// When RTP is running above target, we reduce the hit frequency
// to bring it back down. When below target, slightly increase it.

function getEffectiveHitFrequency(game, gameStats) {
    let baseHitFreq = getHitFrequency(game);

    if (gameStats && gameStats.total_wagered > 0 && gameStats.total_spins > 30) {
        const actualRTP = gameStats.total_paid / gameStats.total_wagered;
        const targetRTP = config.TARGET_RTP;
        const drift = actualRTP - targetRTP;

        if (drift > 0.05) {
            // RTP too high — reduce hit frequency more aggressively
            const reduction = Math.min(drift * 0.8, 0.20); // Up to 20% reduction
            baseHitFreq = Math.max(0.05, baseHitFreq - reduction);
        } else if (drift < -0.10) {
            // RTP too low — slightly increase hit frequency
            const increase = Math.min(Math.abs(drift) * 0.2, 0.08);
            baseHitFreq = Math.min(0.45, baseHitFreq + increase);
        }
    }

    return baseHitFreq;
}

/**
 * Determine if this spin should be allowed to produce a win.
 * Returns true if the spin CAN win, false if it must be a loss.
 * This is the "hit frequency gate" that real slots implement
 * via their virtual reel strip design.
 */
function shouldAllowWin(game, gameStats) {
    const hitFreq = getEffectiveHitFrequency(game, gameStats);
    return rng.randomFloat() < hitFreq;
}

// ═══════════════════════════════════════════════════════════
// WIN AMOUNT CAPPING
// ═══════════════════════════════════════════════════════════

/**
 * Cap the maximum win for a single spin based on bet amount.
 * Real slots cap at specific multipliers:
 * - Wolf Gold: 2500x
 * - Gates of Olympus: 5000x
 * - Sugar Rush 1000: 25000x
 * - Sweet Bonanza: 21100x
 * - Fire Joker: 800x
 */
function capWinAmount(winAmount, betAmount, game) {
    const maxMultiplier = game.jackpot > 0 ? 2500 : 500;
    const maxWin = betAmount * maxMultiplier;
    return Math.min(winAmount, maxWin);
}

// ═══════════════════════════════════════════════════════════
// REAL PAYTABLE MULTIPLIERS
// ═══════════════════════════════════════════════════════════
// These are the actual pay values expressed as multipliers of TOTAL BET.
// Scraped from real Pragmatic Play / Play'n GO paytables.
//
// For payline games (like Wolf Gold):
//   Pay is per winning line, but expressed as fraction of total bet.
//   With 20-25 paylines, a 3-of-a-kind on one line = small fraction of bet.
//
// For cluster/scatter games (like Gates of Olympus):
//   Pay is for the total cluster, as multiplier of total bet.

const PAYLINE_PAYTABLE = {
    // Symbol index: [3oak, 4oak, 5oak] as multiplier of total bet
    // Based on Wolf Gold: royals pay 0.2x-2x, animals pay 0.4x-20x
    0: [0.04, 0.12, 0.40],   // Common 1 (like J) — tiny pay
    1: [0.04, 0.16, 0.40],   // Common 2 (like Q/K)
    2: [0.08, 0.40, 1.60],   // Medium (like Cougar) — 8x bet for 5oak
    3: [0.12, 0.80, 2.40],   // Medium-High (like Horse)
    4: [0.20, 1.20, 3.20],   // Rare (like Eagle)
    5: [0.20, 2.00, 4.00],   // Wild (like Buffalo/Wolf) — pays same as highest
};

const CLUSTER_PAYTABLE = {
    // Symbol index: [5-7 cluster, 8-9 cluster, 10-11 cluster, 12+ cluster]
    // Based on Gates of Olympus / Sweet Bonanza real values
    0: [0.05, 0.25, 0.75, 2.0],   // Common 1 (like Blue Stone / Banana)
    1: [0.08, 0.40, 0.90, 4.0],   // Common 2 (like Green Stone / Grapes)
    2: [0.10, 0.50, 1.00, 5.0],   // Medium (like Yellow Stone / Watermelon)
    3: [0.15, 1.00, 2.50, 10.0],  // Medium-High (like Ring / Plum)
    4: [0.25, 1.50, 5.00, 15.0],  // Rare (like Hourglass / Apple)
    5: [0.50, 2.50, 10.0, 25.0],  // Highest (like Crown / Heart Candy)
};

const CLASSIC_PAYTABLE = {
    // Symbol index: [double, triple] as multiplier of total bet
    // Based on Fire Joker: pays are per-line, with 5 lines on a 3x3
    // So triple cherry (4x per line) = 4x * 1/5 of bet = 0.8x total bet
    0: [0.10, 0.40],   // Common 1 (like Blue X)
    1: [0.10, 0.50],   // Common 2 (like Cherry)
    2: [0.15, 1.00],   // Medium (like Lemon)
    3: [0.20, 1.40],   // Medium-High (like Grapes)
    4: [0.30, 3.00],   // Rare (like Gold BAR)
    5: [0.50, 5.00],   // Wild/Joker (highest)
};

/**
 * Get the payout multiplier for a payline win.
 * @param {number} symbolIndex - index of the symbol in the game's symbols array
 * @param {number} matchCount - 3, 4, or 5 matching symbols
 * @returns {number} multiplier of total bet
 */
function getPaylinePay(symbolIndex, matchCount) {
    const tier = Math.min(symbolIndex, 5);
    const pays = PAYLINE_PAYTABLE[tier];
    if (matchCount >= 5) return pays[2];
    if (matchCount >= 4) return pays[1];
    return pays[0]; // 3-of-a-kind
}

/**
 * Get the payout multiplier for a cluster win.
 * @param {number} symbolIndex - index of symbol in game's symbols array
 * @param {number} clusterSize - number of connected matching symbols
 * @returns {number} multiplier of total bet
 */
function getClusterPay(symbolIndex, clusterSize) {
    const tier = Math.min(symbolIndex, 5);
    const pays = CLUSTER_PAYTABLE[tier];
    if (clusterSize >= 12) return pays[3];
    if (clusterSize >= 10) return pays[2];
    if (clusterSize >= 8) return pays[1];
    return pays[0]; // 5-7 cluster
}

/**
 * Get the payout multiplier for a classic (3-reel) win.
 * @param {number} symbolIndex - index of symbol
 * @param {string} type - 'double' or 'triple'
 * @returns {number} multiplier of total bet
 */
function getClassicPay(symbolIndex, type) {
    const tier = Math.min(symbolIndex, 5);
    const pays = CLASSIC_PAYTABLE[tier];
    return type === 'triple' ? pays[1] : pays[0];
}

// ═══════════════════════════════════════════════════════════
// GAME STATS TRACKING
// ═══════════════════════════════════════════════════════════

function updateGameStats(db, gameId, betAmount, winAmount) {
    const existing = db.get('SELECT * FROM game_stats WHERE game_id = ?', [gameId]);

    if (existing) {
        const totalWagered = existing.total_wagered + betAmount;
        const totalPaid = existing.total_paid + winAmount;
        const actualRtp = totalWagered > 0 ? totalPaid / totalWagered : 0;

        db.run(
            `UPDATE game_stats SET total_spins = total_spins + 1, total_wagered = ?, total_paid = ?, actual_rtp = ? WHERE game_id = ?`,
            [totalWagered, totalPaid, actualRtp, gameId]
        );
    } else {
        const actualRtp = betAmount > 0 ? winAmount / betAmount : 0;
        db.run(
            `INSERT INTO game_stats (game_id, total_spins, total_wagered, total_paid, actual_rtp) VALUES (?, 1, ?, ?, ?)`,
            [gameId, betAmount, winAmount, actualRtp]
        );
    }
}

function getGameStats(db, gameId) {
    return db.get('SELECT * FROM game_stats WHERE game_id = ?', [gameId]) || {
        game_id: gameId,
        total_spins: 0,
        total_wagered: 0,
        total_paid: 0,
        actual_rtp: 0,
    };
}

module.exports = {
    getSymbolWeights,
    getEffectiveHitFrequency,
    shouldAllowWin,
    updateGameStats,
    getGameStats,
    capWinAmount,
    getPaylinePay,
    getClusterPay,
    getClassicPay,
    getHitFrequency,
};
