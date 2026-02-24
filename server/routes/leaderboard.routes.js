'use strict';

const express = require('express');
const db = require('../database');

const router = express.Router();

function maskUsername(username) {
    if (!username || username.length <= 3) return username;
    return username.slice(0, 3) + '***';
}

function getPeriodFilter(period) {
    switch (period) {
        case 'week': return "AND s.created_at >= datetime('now', '-7 days')";
        case 'all':  return '';
        default:     return "AND s.created_at >= datetime('now', '-1 day')"; // today
    }
}

// GET /api/leaderboard
router.get('/', async (req, res) => {
    try {
        const period   = ['today', 'week', 'all'].includes(req.query.period)   ? req.query.period   : 'today';
        const category = ['net', 'single'].includes(req.query.category) ? req.query.category : 'net';

        const periodFilter = getPeriodFilter(period);

        let rows;

        if (category === 'net') {
            rows = await db.all(
                `SELECT u.username,
                        SUM(s.win_amount) - SUM(s.bet_amount) AS amount,
                        COUNT(*) AS spins
                 FROM spins s
                 JOIN users u ON s.user_id = u.id
                 WHERE u.is_banned = 0
                 ${periodFilter}
                 GROUP BY s.user_id, u.username
                 HAVING SUM(s.win_amount) - SUM(s.bet_amount) > 0
                 ORDER BY SUM(s.win_amount) - SUM(s.bet_amount) DESC
                 LIMIT 10`
            );
        } else {
            // single — biggest single win
            rows = await db.all(
                `SELECT u.username,
                        MAX(s.win_amount) AS amount,
                        COUNT(*) AS spins
                 FROM spins s
                 JOIN users u ON s.user_id = u.id
                 WHERE u.is_banned = 0
                   AND s.win_amount > 0
                 ${periodFilter}
                 GROUP BY s.user_id, u.username
                 ORDER BY MAX(s.win_amount) DESC
                 LIMIT 10`
            );
        }

        const players = rows.map((row, i) => ({
            rank: i + 1,
            username: maskUsername(row.username),
            amount: Math.round(row.amount * 100) / 100,
            spins: row.spins,
        }));

        res.json({ players, period, category });
    } catch (err) {
        console.error('[Leaderboard] Error:', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
