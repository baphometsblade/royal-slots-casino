'use strict';
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/leaderboard — top 10 all-time wins by multiplier (>= 10x), no auth required
router.get('/', async (req, res) => {
    try {
        const rows = await db.all([
            'SELECT u.username,',
            '       s.game_id,',
            '       s.win_amount,',
            '       s.bet_amount,',
            '       ROUND(s.win_amount / CAST(s.bet_amount AS REAL), 1) AS mult,',
            '       s.created_at,',
            '       (SELECT COALESCE(SUM(s2.bet_amount), 0) FROM spins s2 WHERE s2.user_id = s.user_id) AS total_wagered',
            'FROM spins s',
            'JOIN users u ON s.user_id = u.id',
            'WHERE s.bet_amount > 0',
            '  AND s.win_amount >= s.bet_amount * 10',
            'ORDER BY mult DESC',
            'LIMIT 10'
        ].join(' '));

        function computeVipTier(totalWagered) {
            const w = parseFloat(totalWagered) || 0;
            if (w >= 100000) return 'Elite';
            if (w >= 50000)  return 'Diamond';
            if (w >= 20000)  return 'Platinum';
            if (w >= 10000)  return 'Gold';
            if (w >= 5000)   return 'Silver';
            if (w >= 250)    return 'Bronze';
            return null;
        }

        const masked = rows.map(function(r) {
            const name = String(r.username || '');
            const maskedName = name.length > 2 ? name.slice(0, 2) + '***' : name + '***';
            return {
                username: maskedName,
                gameId: r.game_id,
                winAmount: parseFloat(r.win_amount) || 0,
                betAmount: parseFloat(r.bet_amount) || 0,
                mult: parseFloat(r.mult) || 0,
                date: r.created_at ? String(r.created_at).slice(0, 10) : '',
                vip_tier: computeVipTier(r.total_wagered)
            };
        });

        res.json({ leaderboard: masked });
    } catch (err) {
        console.error('leaderboard error:', err);
        res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

module.exports = router;
