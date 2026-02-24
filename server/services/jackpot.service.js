'use strict';

const db = require('../database');

const TIERS = [
    { tier: 'mini',  seed: 500,   rate: 0.002 },
    { tier: 'major', seed: 2500,  rate: 0.003 },
    { tier: 'mega',  seed: 10000, rate: 0.005 },
];

// Base win probabilities per spin (on jackpot-tagged games)
// 10x lower on non-jackpot games
const BASE_PROBS = { mini: 0.005, major: 0.0005, mega: 0.00005 };

async function ensureSeeded() {
    for (const { tier, seed, rate } of TIERS) {
        await db.run(
            'INSERT OR IGNORE INTO jackpot_pool (tier, current_amount, seed_amount, contribution_rate) VALUES (?, ?, ?, ?)',
            [tier, seed, seed, rate]
        );
    }
}

async function contribute(betAmount) {
    for (const { tier, rate } of TIERS) {
        const contribution = Math.round(betAmount * rate * 100) / 100;
        if (contribution > 0) {
            await db.run(
                'UPDATE jackpot_pool SET current_amount = current_amount + ?, total_contributed = total_contributed + ? WHERE tier = ?',
                [contribution, contribution, tier]
            );
        }
    }
}

async function checkAndAward(userId, betAmount, minBet, isJackpotGame) {
    // Win probabilities scale with bet size (capped at 3x boost)
    const betMultiplier = Math.min(3, betAmount / Math.max(minBet, 1));
    const gameMultiplier = isJackpotGame ? 1 : 0.1;

    // Check tiers from lowest to highest (mini first, mega last)
    // Only one jackpot can be won per spin
    for (const { tier } of TIERS) {
        const prob = BASE_PROBS[tier] * betMultiplier * gameMultiplier;
        if (Math.random() < prob) {
            // Won this tier — read current amount and reset
            const row = await db.get('SELECT current_amount, seed_amount FROM jackpot_pool WHERE tier = ?', [tier]);
            if (!row || row.current_amount <= 0) continue;

            const wonAmount = Math.round(row.current_amount * 100) / 100;

            await db.run(
                "UPDATE jackpot_pool SET current_amount = seed_amount, total_paid_out = total_paid_out + ?, last_won_at = datetime('now'), last_winner_id = ? WHERE tier = ?",
                [wonAmount, userId, tier]
            );

            return { tier, amount: wonAmount };
        }
    }
    return null;
}

async function getAmounts() {
    const rows = await db.all('SELECT tier, current_amount FROM jackpot_pool');
    const amounts = { mini: 500, major: 2500, mega: 10000 };
    for (const row of rows) {
        amounts[row.tier] = row.current_amount;
    }
    return amounts;
}

async function getHistory() {
    return db.all(
        `SELECT j.tier, j.total_paid_out, j.last_won_at, u.username as winner
         FROM jackpot_pool j
         LEFT JOIN users u ON j.last_winner_id = u.id
         WHERE j.last_won_at IS NOT NULL
         ORDER BY j.last_won_at DESC`
    );
}

module.exports = { ensureSeeded, contribute, checkAndAward, getAmounts, getHistory };
