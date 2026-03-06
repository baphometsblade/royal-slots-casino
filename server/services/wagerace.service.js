'use strict';

const db = require('../database');

// ── Prize Configuration ─────────────────────────────────────────────────────

const RACE_PRIZES = [
    { place: 1, credits: 50, gems: 500 },
    { place: 2, credits: 25, gems: 300 },
    { place: 3, credits: 15, gems: 200 },
    { place: 4, credits: 5,  gems: 100 },
    { place: 5, credits: 5,  gems: 100 },
    { place: 6, credits: 2,  gems: 50 },
    { place: 7, credits: 2,  gems: 50 },
    { place: 8, credits: 2,  gems: 50 },
    { place: 9, credits: 2,  gems: 50 },
    { place: 10, credits: 2, gems: 50 },
];

const PARTICIPATION_GEMS = 10;

// ── Schema ──────────────────────────────────────────────────────────────────

async function initSchema() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS wager_races (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            starts_at TEXT NOT NULL,
            ends_at TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS wager_race_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            total_wagered REAL DEFAULT 0,
            spin_count INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(race_id, user_id)
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS wager_race_prizes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            place INTEGER,
            credit_prize REAL DEFAULT 0,
            gem_prize INTEGER DEFAULT 0,
            claimed_at TEXT DEFAULT (datetime('now'))
        )
    `);
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Ensures there is an active race. If none exists (or current one expired),
 * creates a new 1-hour race starting now.
 */
async function ensureActiveRace() {
    const active = await db.get(
        "SELECT id, starts_at, ends_at FROM wager_races WHERE status = 'active' AND ends_at > datetime('now')"
    );
    if (active) return active;

    await db.run(
        "INSERT INTO wager_races (starts_at, ends_at, status) VALUES (datetime('now'), datetime('now', '+1 hour'), 'active')"
    );

    const race = await db.get(
        "SELECT id, starts_at, ends_at FROM wager_races WHERE status = 'active' AND ends_at > datetime('now') ORDER BY id DESC LIMIT 1"
    );
    return race;
}

/**
 * Returns the current active race with its top-20 leaderboard.
 */
async function getActiveRace() {
    const race = await ensureActiveRace();
    if (!race) return { race: null, leaderboard: [] };

    const leaderboard = await db.all(
        `SELECT u.username, u.display_name, e.total_wagered, e.spin_count
         FROM wager_race_entries e
         JOIN users u ON e.user_id = u.id
         WHERE e.race_id = ?
         ORDER BY e.total_wagered DESC
         LIMIT 20`,
        [race.id]
    );

    return {
        race: { id: race.id, starts_at: race.starts_at, ends_at: race.ends_at },
        leaderboard: leaderboard.map((row, i) => ({
            username: row.username,
            display_name: row.display_name,
            total_wagered: row.total_wagered,
            spin_count: row.spin_count,
            place: i + 1,
        })),
    };
}

/**
 * Records a wager for the given user in the current active race.
 * Uses UPSERT: inserts a new entry or increments existing totals.
 */
async function recordWager(userId, amount) {
    const race = await ensureActiveRace();
    if (!race) return;

    await db.run(
        `INSERT INTO wager_race_entries (race_id, user_id, total_wagered, spin_count, updated_at)
         VALUES (?, ?, ?, 1, datetime('now'))
         ON CONFLICT(race_id, user_id) DO UPDATE SET
             total_wagered = total_wagered + ?,
             spin_count = spin_count + 1,
             updated_at = datetime('now')`,
        [race.id, userId, amount, amount]
    );
}

/**
 * Completes a race: sets status, awards prizes to top 10,
 * and gives participation gems to everyone else who spun at least once.
 */
async function completeRace(raceId) {
    await db.run(
        "UPDATE wager_races SET status = 'completed' WHERE id = ?",
        [raceId]
    );

    // Top 10 by total wagered
    const topEntries = await db.all(
        `SELECT user_id, total_wagered, spin_count
         FROM wager_race_entries
         WHERE race_id = ?
         ORDER BY total_wagered DESC
         LIMIT 10`,
        [raceId]
    );

    const topUserIds = new Set();

    for (let i = 0; i < topEntries.length; i++) {
        const entry = topEntries[i];
        const prize = RACE_PRIZES[i];
        if (!prize) continue;

        topUserIds.add(entry.user_id);
        const place = i + 1;

        // Insert prize record
        await db.run(
            `INSERT INTO wager_race_prizes (race_id, user_id, place, credit_prize, gem_prize)
             VALUES (?, ?, ?, ?, ?)`,
            [raceId, entry.user_id, place, prize.credits, prize.gems]
        );

        // Credit balance
        try {
            await db.run(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                [prize.credits, entry.user_id]
            );
        } catch (e) {
            console.error('[WagerRace] Credit prize error for user', entry.user_id, ':', e.message);
        }

        // Credit gems
        try {
            const gemsService = require('./gems.service');
            await gemsService.addGems(entry.user_id, prize.gems, 'Wager Race #' + raceId + ' - Place ' + place);
        } catch (e) {
            // gems.service may not exist yet; silently skip
        }
    }

    // Participation gems for everyone who spun but didn't place top 10
    const allEntries = await db.all(
        "SELECT user_id FROM wager_race_entries WHERE race_id = ? AND spin_count >= 1",
        [raceId]
    );

    for (const entry of allEntries) {
        if (topUserIds.has(entry.user_id)) continue;
        try {
            const gemsService = require('./gems.service');
            await gemsService.addGems(entry.user_id, PARTICIPATION_GEMS, 'Wager Race #' + raceId + ' - Participation');
        } catch (e) {
            // gems.service may not exist yet; silently skip
        }
    }
}

/**
 * Tick function called on a setInterval. Completes expired races
 * and ensures a new active race exists.
 */
async function tick() {
    // Find active races that have expired
    const expired = await db.all(
        "SELECT id FROM wager_races WHERE status = 'active' AND ends_at <= datetime('now')"
    );

    for (const race of expired) {
        try {
            await completeRace(race.id);
        } catch (e) {
            console.error('[WagerRace] Complete error for race', race.id, ':', e.message);
        }
    }

    // Ensure there's always an active race
    await ensureActiveRace();
}

/**
 * Returns recent race prize history for a given user.
 */
async function getRaceHistory(userId, limit = 10) {
    const rows = await db.all(
        `SELECT p.race_id, p.place, p.credit_prize, p.gem_prize, p.claimed_at,
                r.starts_at, r.ends_at
         FROM wager_race_prizes p
         JOIN wager_races r ON p.race_id = r.id
         WHERE p.user_id = ?
         ORDER BY p.claimed_at DESC
         LIMIT ?`,
        [userId, limit]
    );
    return rows;
}

module.exports = {
    initSchema,
    ensureActiveRace,
    getActiveRace,
    recordWager,
    completeRace,
    tick,
    getRaceHistory,
    RACE_PRIZES,
    PARTICIPATION_GEMS,
};
