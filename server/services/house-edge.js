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
const BASE_WEIGHTS_5x3 = [100, 90, 50, 25, 8, 3]; // Wild ~1.1%

// 5x4 payline games — 20 cells, 40 paylines
const BASE_WEIGHTS_5x4 = [110, 100, 55, 25, 6, 2]; // Wild ~0.7%

// 6x5 cluster/scatter games (Gates of Olympus, Sweet Bonanza) — 30 cells
const BASE_WEIGHTS_6x5 = [120, 110, 60, 28, 5, 1]; // Wild ~0.3%

// 7x7 cluster games (Sugar Rush) — 49 cells
const BASE_WEIGHTS_7x7 = [140, 130, 70, 30, 4, 1]; // Wild ~0.3%

// 3x3 classic games (Fire Joker) — 9 cells
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

function getHitFrequency(game) {
    const cols = game.gridCols || 3;
    const rows = game.gridRows || 1;
    const winType = game.winType || 'classic';

    if (winType === 'classic') {
        if (rows === 1) return 0.15;
        return 0.20;
    }

    if (winType === 'cluster') {
        if (cols >= 7) return 0.28;
        if (cols >= 6) return 0.25;
        return 0.22;
    }

    if (winType === 'payline') {
        if (rows >= 4) return 0.28;
        if (cols >= 5) return 0.30;
        return 0.20;
    }

    return 0.25;
}

// ═══════════════════════════════════════════════════════════
// SYMBOL WEIGHT CALCULATION (with RTP tracking)
// ═══════════════════════════════════════════════════════════

function getSymbolWeights(game, gameStats) {
    const symbols = game.symbols;
    const numSymbols = symbols.length;
    const baseWeights = getBaseWeightsForGrid(game);

    const weights = [];
    for (let i = 0; i < numSymbols; i++) {
        if (i < baseWeights.length) {
            weights.push(baseWeights[i]);
        } else {
            weights.push(baseWeights[baseWeights.length - 1]);
        }
    }

    if (gameStats && gameStats.total_wagered > 0 && gameStats.total_spins > 50) {
        const actualRTP = gameStats.total_paid / gameStats.total_wagered;
        const targetRTP = config.TARGET_RTP;
        const drift = actualRTP - targetRTP;

        if (Math.abs(drift) > config.RTP_ADJUSTMENT_THRESHOLD) {
            const driftMagnitude = Math.min(Math.abs(drift), 2.0);
            const baseAdj = drift > 0 ? -0.40 : 0.08;
            const scaleFactor = Math.min(driftMagnitude / 0.05, 5);
            const adjustment = baseAdj * scaleFactor;

            for (let i = 0; i < numSymbols; i++) {
                if (i >= numSymbols - 2) {
                    weights[i] = Math.max(0.1, weights[i] * (1 + adjustment));
                } else if (i >= numSymbols - 4) {
                    weights[i] = Math.max(0.5, weights[i] * (1 + adjustment * 0.5));
                }
                if (i < 2 && drift > 0) {
                    weights[i] *= 1 + driftMagnitude * 0.5;
                }
            }
        }
    }

    return weights;
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC HIT FREQUENCY
// ═══════════════════════════════════════════════════════════

function getEffectiveHitFrequency(game, gameStats) {
    let baseHitFreq = getHitFrequency(game);

    if (gameStats && gameStats.total_wagered > 0 && gameStats.total_spins > 30) {
        const actualRTP = gameStats.total_paid / gameStats.total_wagered;
        const targetRTP = config.TARGET_RTP;
        const drift = actualRTP - targetRTP;

        if (drift > 0.05) {
            const reduction = Math.min(drift * 0.8, 0.20);
            baseHitFreq = Math.max(0.05, baseHitFreq - reduction);
        } else if (drift < -0.10) {
            const increase = Math.min(Math.abs(drift) * 0.2, 0.08);
            baseHitFreq = Math.min(0.45, baseHitFreq + increase);
        }
    }

    return baseHitFreq;
}

/**
 * Determine if this spin should be allowed to produce a win.
 */
async function shouldAllowWin(game, gameStats, db) {
    let hitFreq = getEffectiveHitFrequency(game, gameStats);

    if (db) {
        const globalStats = await db.get('SELECT SUM(bet_amount) as wagered, SUM(win_amount) as paid FROM spins');
        if (globalStats && globalStats.wagered > 0) {
            const globalRTP = (globalStats.paid || 0) / globalStats.wagered;
            if (globalRTP > 1.0) {
                hitFreq = 0.02;
            } else if (globalRTP > 0.95) {
                hitFreq *= 0.5;
            }
        }
    }

    return rng.randomFloat() < hitFreq;
}

// ═══════════════════════════════════════════════════════════
// WIN AMOUNT CAPPING
// ═══════════════════════════════════════════════════════════

async function capWinAmount(winAmount, betAmount, game, db) {
    const maxMultiplier = game.jackpot > 0
        ? config.MAX_WIN_MULTIPLIER || 500
        : Math.min(config.MAX_WIN_MULTIPLIER || 500, 200);
    let capped = Math.min(winAmount, betAmount * maxMultiplier);

    if (db) {
        const globalStats = await db.get('SELECT SUM(bet_amount) as wagered, SUM(win_amount) as paid FROM spins');
        if (globalStats && globalStats.wagered > 0) {
            const currentProfit = (globalStats.wagered || 0) - (globalStats.paid || 0);
            const projectedProfit = currentProfit - capped;
            if (projectedProfit < (config.PROFIT_FLOOR || -500)) {
                const maxAllowed = Math.max(0, currentProfit - (config.PROFIT_FLOOR || -500));
                capped = Math.min(capped, Math.max(betAmount * 0.1, maxAllowed));
            }
        }
    }

    return Math.round(capped * 100) / 100;
}

// ═══════════════════════════════════════════════════════════
// REAL PAYTABLE MULTIPLIERS
// ═══════════════════════════════════════════════════════════

const PAYLINE_PAYTABLE = {
    0: [0.04, 0.12, 0.40],
    1: [0.04, 0.16, 0.40],
    2: [0.08, 0.40, 1.60],
    3: [0.12, 0.80, 2.40],
    4: [0.20, 1.20, 3.20],
    5: [0.20, 2.00, 4.00],
};

const CLUSTER_PAYTABLE = {
    0: [0.05, 0.25, 0.75, 2.0],
    1: [0.08, 0.40, 0.90, 4.0],
    2: [0.10, 0.50, 1.00, 5.0],
    3: [0.15, 1.00, 2.50, 10.0],
    4: [0.25, 1.50, 5.00, 15.0],
    5: [0.50, 2.50, 10.0, 25.0],
};

const CLASSIC_PAYTABLE = {
    0: [0.10, 0.40],
    1: [0.10, 0.50],
    2: [0.15, 1.00],
    3: [0.20, 1.40],
    4: [0.30, 3.00],
    5: [0.50, 5.00],
};

function getPaylinePay(symbolIndex, matchCount) {
    const tier = Math.min(symbolIndex, 5);
    const pays = PAYLINE_PAYTABLE[tier];
    if (matchCount >= 5) return pays[2];
    if (matchCount >= 4) return pays[1];
    return pays[0];
}

function getClusterPay(symbolIndex, clusterSize) {
    const tier = Math.min(symbolIndex, 5);
    const pays = CLUSTER_PAYTABLE[tier];
    if (clusterSize >= 12) return pays[3];
    if (clusterSize >= 10) return pays[2];
    if (clusterSize >= 8) return pays[1];
    return pays[0];
}

function getClassicPay(symbolIndex, type) {
    const tier = Math.min(symbolIndex, 5);
    const pays = CLASSIC_PAYTABLE[tier];
    return type === 'triple' ? pays[1] : pays[0];
}

// ═══════════════════════════════════════════════════════════
// GAME STATS TRACKING
// ═══════════════════════════════════════════════════════════

async function updateGameStats(db, gameId, betAmount, winAmount) {
    const existing = await db.get('SELECT * FROM game_stats WHERE game_id = ?', [gameId]);

    if (existing) {
        const totalWagered = existing.total_wagered + betAmount;
        const totalPaid = existing.total_paid + winAmount;
        const actualRtp = totalWagered > 0 ? totalPaid / totalWagered : 0;

        await db.run(
            `UPDATE game_stats SET total_spins = total_spins + 1, total_wagered = ?, total_paid = ?, actual_rtp = ? WHERE game_id = ?`,
            [totalWagered, totalPaid, actualRtp, gameId]
        );
    } else {
        const actualRtp = betAmount > 0 ? winAmount / betAmount : 0;
        await db.run(
            `INSERT INTO game_stats (game_id, total_spins, total_wagered, total_paid, actual_rtp) VALUES (?, 1, ?, ?, ?)`,
            [gameId, betAmount, winAmount, actualRtp]
        );
    }
}

async function getGameStats(db, gameId) {
    return await db.get('SELECT * FROM game_stats WHERE game_id = ?', [gameId]) || {
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
