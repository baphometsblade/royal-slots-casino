'use strict';

// ── Locked Games (premium exclusive) ────────────────────────────────────────

var LOCKED_GAMES = [
    'diamond-dynasty',
    'golden-empire',
    'neon-nights-vip',
    'royal-treasures-elite',
    'mega-fortune-deluxe',
    'platinum-express'
];

// ── Rental Tiers ────────────────────────────────────────────────────────────

var RENTAL_TIERS = [
    { id: '1hour',     name: '1 Hour Access',    duration: 60,    creditPrice: 1.99,  gemPrice: 200 },
    { id: '24hours',   name: '24 Hour Access',   duration: 1440,  creditPrice: 4.99,  gemPrice: 500 },
    { id: '7days',     name: '7 Day Access',     duration: 10080, creditPrice: 14.99, gemPrice: 1500 },
    { id: 'permanent', name: 'Permanent Unlock',  duration: 0,     creditPrice: 29.99, gemPrice: 3000 }
];

// ── Schema Init ─────────────────────────────────────────────────────────────

async function initSchema() {
    const isPg      = !!process.env.DATABASE_URL;
    const tsType    = isPg ? 'TIMESTAMPTZ' : 'TEXT';
    const tsDefault = isPg ? 'NOW()' : "(datetime('now'))";
    const idDef     = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const db = require('../database');
    await db.run(`CREATE TABLE IF NOT EXISTS slot_rentals (
        id ${idDef},
        user_id INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        started_at ${tsType} DEFAULT ${tsDefault},
        expires_at TEXT,
        permanent INTEGER DEFAULT 0,
        created_at ${tsType} DEFAULT ${tsDefault}
    )`);
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Return the list of locked (premium exclusive) game IDs.
 */
function getLockedGames() {
    return LOCKED_GAMES;
}

/**
 * Return the list of available rental tiers with pricing.
 */
function getRentalTiers() {
    return RENTAL_TIERS;
}

/**
 * Check whether a user has access to a game.
 * Free games always return true. Locked games require an active rental
 * (permanent=1 OR expires_at > now).
 */
async function isUnlocked(userId, gameId) {
    const db = require('../database');

    // Free games are always unlocked
    if (!LOCKED_GAMES.includes(gameId)) {
        return true;
    }

    const row = await db.get(
        "SELECT id FROM slot_rentals WHERE user_id = ? AND game_id = ? AND (permanent = 1 OR expires_at > datetime('now')) LIMIT 1",
        [userId, gameId]
    );
    return !!row;
}

/**
 * Rent a slot game for a user.
 * @param {number} userId
 * @param {string} gameId - must be in LOCKED_GAMES
 * @param {string} tierId - one of the RENTAL_TIERS ids
 * @param {string} payWith - 'credits' or 'gems'
 * @returns {{ success: boolean, rental: { gameId, tier, expiresAt, permanent } }}
 */
async function rentSlot(userId, gameId, tierId, payWith) {
    const db = require('../database');

    // Validate gameId is a locked game
    if (!LOCKED_GAMES.includes(gameId)) {
        throw new Error('Game is not a locked/premium game');
    }

    // Validate tier
    const tier = RENTAL_TIERS.find(t => t.id === tierId);
    if (!tier) {
        throw new Error('Invalid rental tier');
    }

    // Check if user already has permanent access
    const existingPerm = await db.get(
        'SELECT id FROM slot_rentals WHERE user_id = ? AND game_id = ? AND permanent = 1',
        [userId, gameId]
    );
    if (existingPerm) {
        throw new Error('You already have permanent access to this game');
    }

    // Process payment
    if (payWith === 'credits') {
        const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        if (!user) throw new Error('User not found');
        if (user.balance < tier.creditPrice) {
            throw new Error('Insufficient credit balance (need ' + tier.creditPrice + ', have ' + user.balance.toFixed(2) + ')');
        }
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [tier.creditPrice, userId]);
    } else if (payWith === 'gems') {
        const gemsService = require('./gems.service');
        await gemsService.spendGems(userId, tier.gemPrice, 'Slot rental: ' + gameId + ' (' + tier.name + ')');
    } else {
        throw new Error('Invalid payment method. Use "credits" or "gems".');
    }

    // Determine expiration
    var isPermanent = tier.duration === 0 ? 1 : 0;
    var expiresAt = null;

    if (isPermanent) {
        // Permanent unlock — no expiration
        await db.run(
            "INSERT INTO slot_rentals (user_id, game_id, tier, permanent, expires_at) VALUES (?, ?, ?, 1, NULL)",
            [userId, gameId, tierId]
        );
    } else {
        // Timed rental — expires_at = now + N minutes
        var result = await db.get(
            "SELECT datetime('now', '+' || ? || ' minutes') AS exp",
            [tier.duration]
        );
        expiresAt = result ? result.exp : null;

        await db.run(
            "INSERT INTO slot_rentals (user_id, game_id, tier, permanent, expires_at) VALUES (?, ?, ?, 0, datetime('now', '+' || ? || ' minutes'))",
            [userId, gameId, tierId, tier.duration]
        );
    }

    console.log('[Rental] User %d rented "%s" tier=%s payWith=%s permanent=%d', userId, gameId, tierId, payWith, isPermanent);

    return {
        success: true,
        rental: {
            gameId: gameId,
            tier: tierId,
            expiresAt: expiresAt,
            permanent: !!isPermanent
        }
    };
}

/**
 * Get all active (unexpired + permanent) rentals for a user.
 */
async function getActiveRentals(userId) {
    const db = require('../database');
    const rows = await db.all(
        "SELECT id, game_id, tier, started_at, expires_at, permanent FROM slot_rentals WHERE user_id = ? AND (permanent = 1 OR expires_at > datetime('now')) ORDER BY created_at DESC",
        [userId]
    );
    return rows;
}

/**
 * Get the rental status for a specific game for a user.
 * Returns the active rental row or null if no active rental exists.
 */
async function getRentalStatus(userId, gameId) {
    const db = require('../database');
    const row = await db.get(
        "SELECT id, game_id, tier, started_at, expires_at, permanent FROM slot_rentals WHERE user_id = ? AND game_id = ? AND (permanent = 1 OR expires_at > datetime('now')) ORDER BY permanent DESC, expires_at DESC LIMIT 1",
        [userId, gameId]
    );
    return row || null;
}

module.exports = {
    initSchema,
    getLockedGames,
    getRentalTiers,
    isUnlocked,
    rentSlot,
    getActiveRentals,
    getRentalStatus
};
