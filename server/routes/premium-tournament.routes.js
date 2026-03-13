'use strict';

const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../database');

// Bootstrap tables at module load
db.run(
    'CREATE TABLE IF NOT EXISTS premium_tournaments (' +
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '  name TEXT NOT NULL,' +
    '  entry_fee REAL NOT NULL,' +
    '  prize_pool REAL NOT NULL,' +
    '  max_players INTEGER DEFAULT 100,' +
    '  current_players INTEGER DEFAULT 0,' +
    '  status TEXT DEFAULT \'active\',' +
    '  starts_at TEXT NOT NULL,' +
    '  ends_at TEXT NOT NULL,' +
    "  created_at TEXT DEFAULT datetime('now')" +
    ')'
).catch(function() {});

db.run(
    'CREATE TABLE IF NOT EXISTS premium_tournament_entries (' +
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '  tournament_id INTEGER NOT NULL,' +
    '  user_id INTEGER NOT NULL,' +
    '  score REAL DEFAULT 0,' +
    '  spins INTEGER DEFAULT 0,' +
    '  best_win REAL DEFAULT 0,' +
    "  joined_at TEXT DEFAULT datetime('now')," +
    '  UNIQUE(tournament_id, user_id),' +
    '  FOREIGN KEY(tournament_id) REFERENCES premium_tournaments(id),' +
    '  FOREIGN KEY(user_id) REFERENCES users(id)' +
    ')'
).catch(function() {});

// Seed default premium tournaments at module load (with 5s delay to allow schema setup)
setTimeout(function() {
    seedDefaultTournaments().catch(function() {});
}, 5000);

/**
 * Seed 3 default premium tournaments if they don't exist
 */
async function seedDefaultTournaments() {
    try {
        // Check if tournaments already seeded
        const count = await db.get(
            'SELECT COUNT(*) as cnt FROM premium_tournaments'
        );

        if (count && parseInt(count.cnt, 10) > 0) {
            return; // Already seeded
        }

        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        // High Roller Showdown — $50 entry, $5000 prize pool, 100 max, 7 days
        await db.run(
            'INSERT INTO premium_tournaments (name, entry_fee, prize_pool, max_players, status, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['High Roller Showdown', 50, 5000, 100, 'active', now.toISOString(), sevenDaysFromNow]
        );

        // Speed Spinner — $10 entry, $500 prize pool, 50 max, 24 hours
        await db.run(
            'INSERT INTO premium_tournaments (name, entry_fee, prize_pool, max_players, status, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Speed Spinner', 10, 500, 50, 'active', now.toISOString(), oneDayFromNow]
        );

        // Diamond Classic — $100 entry, $10000 prize pool, 50 max, 7 days
        await db.run(
            'INSERT INTO premium_tournaments (name, entry_fee, prize_pool, max_players, status, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Diamond Classic', 100, 10000, 50, 'active', now.toISOString(), sevenDaysFromNow]
        );

        console.warn('[premium-tournament] Seeded 3 default tournaments');
    } catch (err) {
        console.warn('[premium-tournament] seedDefaultTournaments error:', err.message);
    }
}

// GET /api/premium-tournament/
// List active premium tournaments
router.get('/', async function(req, res) {
    try {
        const rows = await db.all(
            "SELECT id, name, entry_fee, prize_pool, max_players, current_players, status, starts_at, ends_at FROM premium_tournaments WHERE status = 'active' AND ends_at > datetime('now') ORDER BY ends_at ASC"
        );

        if (!rows || rows.length === 0) {
            return res.json({ tournaments: [] });
        }

        const tournaments = rows.map(function(row) {
            const now = new Date();
            const endsAt = new Date(row.ends_at);
            const timeRemaining = Math.max(0, endsAt.getTime() - now.getTime()); // milliseconds

            return {
                id: row.id,
                name: row.name,
                entryFee: parseFloat(row.entry_fee) || 0,
                prizePool: parseFloat(row.prize_pool) || 0,
                maxPlayers: parseInt(row.max_players, 10) || 100,
                currentPlayers: parseInt(row.current_players, 10) || 0,
                status: row.status,
                startsAt: row.starts_at,
                endsAt: row.ends_at,
                timeRemainingMs: timeRemaining
            };
        });

        return res.json({ tournaments: tournaments });
    } catch (err) {
        console.warn('[premium-tournament] GET / error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
});

// POST /api/premium-tournament/:id/join
// Join a premium tournament (authenticate required)
router.post('/:id/join', authenticate, async function(req, res) {
    try {
        const tournamentId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        // Check tournament exists and is active
        const tournament = await db.get(
            "SELECT id, name, entry_fee, prize_pool, max_players, current_players, status, ends_at FROM premium_tournaments WHERE id = ? AND status = 'active' AND ends_at > datetime('now')",
            [tournamentId]
        );

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found or inactive' });
        }

        // Check user not already joined
        const existingEntry = await db.get(
            'SELECT id FROM premium_tournament_entries WHERE tournament_id = ? AND user_id = ?',
            [tournamentId, userId]
        );

        if (existingEntry) {
            return res.status(400).json({ error: 'You have already joined this tournament' });
        }

        // Check max_players not reached
        const currentPlayers = parseInt(tournament.current_players, 10) || 0;
        const maxPlayers = parseInt(tournament.max_players, 10) || 100;

        if (currentPlayers >= maxPlayers) {
            return res.status(400).json({ error: 'Tournament is full' });
        }

        // Check user balance
        const user = await db.get(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        const entryFee = parseFloat(tournament.entry_fee) || 0;

        if (!user || user.balance === null) {
            return res.status(400).json({ error: 'Unable to verify balance' });
        }

        const userBalance = parseFloat(user.balance) || 0;
        if (userBalance < entryFee) {
            return res.status(400).json({ error: 'Insufficient balance. Entry fee: $' + entryFee.toFixed(2) });
        }

        // Deduct entry_fee from user's balance
        await db.run(
            'UPDATE users SET balance = balance - ? WHERE id = ?',
            [entryFee, userId]
        );

        // Record transaction
        await db.run(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'tournament_entry', ?, ?)",
            [userId, -entryFee, 'Premium Tournament Entry: ' + tournament.name]
        );

        // Create tournament entry
        await db.run(
            'INSERT INTO premium_tournament_entries (tournament_id, user_id, score, spins, best_win) VALUES (?, ?, 0, 0, 0)',
            [tournamentId, userId]
        );

        // Increment current_players
        await db.run(
            'UPDATE premium_tournaments SET current_players = current_players + 1 WHERE id = ?',
            [tournamentId]
        );

        // Fetch updated user balance
        const updated = await db.get(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        const newBalance = updated ? parseFloat(updated.balance) || 0 : 0;

        return res.json({
            joined: true,
            tournamentId: tournamentId,
            tournamentName: tournament.name,
            entryFee: entryFee,
            newBalance: newBalance,
            message: 'Successfully joined tournament'
        });
    } catch (err) {
        console.warn('[premium-tournament] POST /:id/join error:', err.message);
        return res.status(500).json({ error: 'Failed to join tournament' });
    }
});

// POST /api/premium-tournament/:id/score
// Record a spin score during tournament (authenticate required)
router.post('/:id/score', authenticate, async function(req, res) {
    try {
        const tournamentId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { scoreIncrement, spinCount, bestWin } = req.body;

        if (typeof scoreIncrement !== 'number' || scoreIncrement < 0) {
            return res.status(400).json({ error: 'scoreIncrement must be a non-negative number' });
        }

        // Check user has joined tournament
        const entry = await db.get(
            'SELECT id, score, spins, best_win FROM premium_tournament_entries WHERE tournament_id = ? AND user_id = ?',
            [tournamentId, userId]
        );

        if (!entry) {
            return res.status(403).json({ error: 'You have not joined this tournament' });
        }

        // Update score (cumulative), spins, and best_win
        const newScore = parseFloat(entry.score) || 0 + scoreIncrement;
        const newSpins = (spinCount !== undefined) ? parseInt(spinCount, 10) : (parseInt(entry.spins, 10) || 0) + 1;
        const newBestWin = (bestWin !== undefined && bestWin > parseFloat(entry.best_win) || 0) ? bestWin : parseFloat(entry.best_win) || 0;

        await db.run(
            'UPDATE premium_tournament_entries SET score = ?, spins = ?, best_win = ? WHERE tournament_id = ? AND user_id = ?',
            [newScore, newSpins, newBestWin, tournamentId, userId]
        );

        // Get rank
        const rankRow = await db.get(
            'SELECT COUNT(*) as cnt FROM premium_tournament_entries WHERE tournament_id = ? AND score > ?',
            [tournamentId, newScore]
        );

        const rank = (rankRow ? parseInt(rankRow.cnt, 10) : 0) + 1;

        return res.json({
            score: newScore,
            spins: newSpins,
            bestWin: newBestWin,
            rank: rank
        });
    } catch (err) {
        console.warn('[premium-tournament] POST /:id/score error:', err.message);
        return res.status(500).json({ error: 'Failed to record score' });
    }
});

// GET /api/premium-tournament/:id/leaderboard
// Tournament leaderboard (public, top 50)
router.get('/:id/leaderboard', async function(req, res) {
    try {
        const tournamentId = parseInt(req.params.id, 10);

        const rows = await db.all(
            'SELECT pte.score, pte.spins, pte.best_win, COALESCE(u.display_name, u.username) as username ' +
            'FROM premium_tournament_entries pte ' +
            'JOIN users u ON u.id = pte.user_id ' +
            'WHERE pte.tournament_id = ? ' +
            'ORDER BY pte.score DESC ' +
            'LIMIT 50',
            [tournamentId]
        );

        if (!rows || rows.length === 0) {
            return res.json({ leaderboard: [] });
        }

        const leaderboard = rows.map(function(row, idx) {
            return {
                rank: idx + 1,
                username: row.username,
                score: parseFloat(row.score) || 0,
                spins: parseInt(row.spins, 10) || 0,
                bestWin: parseFloat(row.best_win) || 0
            };
        });

        return res.json({ leaderboard: leaderboard });
    } catch (err) {
        console.warn('[premium-tournament] GET /:id/leaderboard error:', err.message);
        return res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

// GET /api/premium-tournament/my-tournaments
// User's tournament history (authenticate required)
router.get('/my-tournaments', authenticate, async function(req, res) {
    try {
        const userId = req.user.id;

        const rows = await db.all(
            'SELECT pt.id, pt.name, pt.entry_fee, pt.prize_pool, pt.status, pt.starts_at, pt.ends_at, ' +
            '       pte.score, pte.spins, pte.best_win, pte.joined_at, ' +
            '       (SELECT COUNT(*) FROM premium_tournament_entries WHERE tournament_id = pt.id AND score > pte.score) + 1 as placement ' +
            'FROM premium_tournament_entries pte ' +
            'JOIN premium_tournaments pt ON pt.id = pte.tournament_id ' +
            'WHERE pte.user_id = ? ' +
            'ORDER BY pt.ends_at DESC',
            [userId]
        );

        if (!rows || rows.length === 0) {
            return res.json({ tournaments: [] });
        }

        const tournaments = rows.map(function(row) {
            return {
                id: row.id,
                name: row.name,
                entryFee: parseFloat(row.entry_fee) || 0,
                prizePool: parseFloat(row.prize_pool) || 0,
                status: row.status,
                startsAt: row.starts_at,
                endsAt: row.ends_at,
                joinedAt: row.joined_at,
                score: parseFloat(row.score) || 0,
                spins: parseInt(row.spins, 10) || 0,
                bestWin: parseFloat(row.best_win) || 0,
                placement: parseInt(row.placement, 10) || 0,
                winnings: calculateWinnings(parseInt(row.placement, 10), parseFloat(row.prize_pool) || 0)
            };
        });

        return res.json({ tournaments: tournaments });
    } catch (err) {
        console.warn('[premium-tournament] GET /my-tournaments error:', err.message);
        return res.status(500).json({ error: 'Failed to load tournament history' });
    }
});

// POST /api/premium-tournament/admin/create
// Create a new tournament (admin required)
router.post('/admin/create', authenticate, requireAdmin, async function(req, res) {
    try {
        const { name, entryFee, prizePool, maxPlayers, startsAt, endsAt } = req.body;

        if (!name || !entryFee || !prizePool || !maxPlayers || !startsAt || !endsAt) {
            return res.status(400).json({ error: 'Missing required fields: name, entryFee, prizePool, maxPlayers, startsAt, endsAt' });
        }

        const fee = parseFloat(entryFee) || 0;
        const pool = parseFloat(prizePool) || 0;
        const max = parseInt(maxPlayers, 10) || 100;

        if (fee < 0 || pool < 0 || max <= 0) {
            return res.status(400).json({ error: 'Invalid values: fees/pool must be >= 0, maxPlayers must be > 0' });
        }

        const startDate = new Date(startsAt);
        const endDate = new Date(endsAt);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format for startsAt or endsAt' });
        }

        if (endDate <= startDate) {
            return res.status(400).json({ error: 'endsAt must be after startsAt' });
        }

        const result = await db.run(
            'INSERT INTO premium_tournaments (name, entry_fee, prize_pool, max_players, status, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, fee, pool, max, 'active', startDate.toISOString(), endDate.toISOString()]
        );

        return res.json({
            created: true,
            tournamentId: result.id,
            name: name,
            entryFee: fee,
            prizePool: pool,
            maxPlayers: max,
            startsAt: startDate.toISOString(),
            endsAt: endDate.toISOString()
        });
    } catch (err) {
        console.warn('[premium-tournament] POST /admin/create error:', err.message);
        return res.status(500).json({ error: 'Failed to create tournament' });
    }
});

// POST /api/premium-tournament/admin/finalize/:id
// End tournament and pay out prizes (admin required)
router.post('/admin/finalize/:id', authenticate, requireAdmin, async function(req, res) {
    try {
        const tournamentId = parseInt(req.params.id, 10);

        // Get tournament details
        const tournament = await db.get(
            'SELECT id, name, prize_pool, status FROM premium_tournaments WHERE id = ?',
            [tournamentId]
        );

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        if (tournament.status === 'completed') {
            return res.status(400).json({ error: 'Tournament already finalized' });
        }

        // Mark tournament as completed
        await db.run(
            "UPDATE premium_tournaments SET status = 'completed' WHERE id = ?",
            [tournamentId]
        );

        // Get top 5 finishers
        const topFinishers = await db.all(
            'SELECT pte.user_id, pte.score FROM premium_tournament_entries WHERE tournament_id = ? ORDER BY pte.score DESC LIMIT 5',
            [tournamentId]
        );

        if (!topFinishers || topFinishers.length === 0) {
            return res.json({
                finalized: true,
                tournamentId: tournamentId,
                message: 'Tournament finalized with no participants',
                payouts: []
            });
        }

        // Prize distribution: 1st=50%, 2nd=25%, 3rd=15%, 4th-5th=5% each
        const prizePool = parseFloat(tournament.prize_pool) || 0;
        const prizeDistribution = [
            { position: 1, percent: 0.50 },
            { position: 2, percent: 0.25 },
            { position: 3, percent: 0.15 },
            { position: 4, percent: 0.05 },
            { position: 5, percent: 0.05 }
        ];

        const payouts = [];

        for (let i = 0; i < topFinishers.length && i < 5; i++) {
            const finisher = topFinishers[i];
            const distribution = prizeDistribution[i];
            const winnings = Math.round(prizePool * distribution.percent * 100) / 100;

            // Credit winner's balance
            await db.run(
                'UPDATE users SET balance = balance + ? WHERE id = ?',
                [winnings, finisher.user_id]
            );

            // Record transaction
            await db.run(
                "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'tournament_payout', ?, ?)",
                [finisher.user_id, winnings, tournament.name + ' Prize — ' + distribution.position + '{st,nd,rd,th}'[Math.min(3, distribution.position - 1)] + ' place: $' + winnings.toFixed(2)]
            );

            payouts.push({
                position: distribution.position,
                userId: finisher.user_id,
                winnings: winnings
            });
        }

        return res.json({
            finalized: true,
            tournamentId: tournamentId,
            tournamentName: tournament.name,
            prizePool: prizePool,
            payouts: payouts
        });
    } catch (err) {
        console.warn('[premium-tournament] POST /admin/finalize/:id error:', err.message);
        return res.status(500).json({ error: 'Failed to finalize tournament' });
    }
});

/**
 * Calculate winnings based on placement and prize pool
 * Prize distribution: 1st=50%, 2nd=25%, 3rd=15%, 4th-5th=5% each
 */
function calculateWinnings(placement, prizePool) {
    if (!placement || placement > 5) {
        return 0;
    }

    const distribution = [0.50, 0.25, 0.15, 0.05, 0.05];
    const percent = distribution[placement - 1] || 0;
    const winnings = Math.round(prizePool * percent * 100) / 100;

    return winnings;
}

module.exports = router;
