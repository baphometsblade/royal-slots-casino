'use strict';
const router = require('express').Router();
const db = require('../database');

function maskUsername(username) {
    if (!username || username.length <= 3) return username.slice(0, 1) + '***';
    return username.slice(0, 2) + '***' + username.slice(-1);
}

// GET /api/leaderboard/bigwins — top 20 all-time biggest wins by win_amount
router.get('/bigwins', async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT s.user_id, u.username, s.game_id, s.bet_amount, s.win_amount,
                    ROUND(s.win_amount / s.bet_amount, 2) as multiplier,
                    s.created_at
             FROM spins s
             JOIN users u ON s.user_id = u.id
             WHERE s.win_amount > 0 AND s.bet_amount > 0 AND u.is_banned = 0
             ORDER BY s.win_amount DESC
             LIMIT 20`
        );

        const entries = rows.map(function (r, i) {
            return {
                rank: i + 1,
                maskedUser: maskUsername(r.username),
                gameId: r.game_id,
                betAmount: parseFloat(r.bet_amount) || 0,
                winAmount: parseFloat(r.win_amount) || 0,
                multiplier: parseFloat(r.multiplier) || 0,
                date: r.created_at ? String(r.created_at).slice(0, 10) : ''
            };
        });

        res.json({ entries: entries });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load big wins leaderboard' });
    }
});

// GET /api/leaderboard/weekly — top 20 wagerers this calendar week (Mon 00:00 UTC to now)
router.get('/weekly', async (req, res) => {
    try {
        const now = new Date();
        const dayOfWeek = now.getUTCDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setUTCDate(monday.getUTCDate() - daysToMonday);
        monday.setUTCHours(0, 0, 0, 0);
        const mondayStr = monday.toISOString().slice(0, 19).replace('T', ' ');

        const rows = await db.all(
            `SELECT s.user_id, u.username,
                    SUM(s.bet_amount) as total_wagered,
                    COUNT(*) as spin_count
             FROM spins s
             JOIN users u ON s.user_id = u.id
             WHERE s.created_at >= ? AND u.is_banned = 0
             GROUP BY s.user_id, u.username
             ORDER BY total_wagered DESC
             LIMIT 20`,
            [mondayStr]
        );

        const entries = rows.map(function (r, i) {
            return {
                rank: i + 1,
                maskedUser: maskUsername(r.username),
                totalWagered: parseFloat(r.total_wagered) || 0,
                spinCount: parseInt(r.spin_count, 10) || 0
            };
        });

        res.json({ entries: entries, weekStart: mondayStr });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load weekly leaderboard' });
    }
});

// GET /api/leaderboard/richlist — top 20 users by current balance
router.get('/richlist', async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT id as user_id, username, balance
             FROM users
             WHERE is_banned = 0 AND balance > 0
             ORDER BY balance DESC
             LIMIT 20`
        );

        const entries = rows.map(function (r, i) {
            return {
                rank: i + 1,
                maskedUser: maskUsername(r.username),
                balance: parseFloat(r.balance) || 0
            };
        });

        res.json({ entries: entries });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load rich list' });
    }
});

module.exports = router;
