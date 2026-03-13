'use strict';

/**
 * Player Stats Dashboard API
 *
 * Routes:
 *   GET  /api/player-stats/          — comprehensive player lifetime stats
 *   GET  /api/player-stats/history   — daily aggregated play history
 */

const router = require('express').Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/player-stats
 * Returns comprehensive player stats:
 * - Total spins played
 * - Total wagered (sum of bet amounts)
 * - Total won (sum of win amounts)
 * - Net P&L (total won - total wagered)
 * - Biggest single win
 * - Current win/loss streak
 * - Favorite game (most played)
 * - Average bet size
 * - Session count (approximated by counting distinct dates played)
 * - Member since date
 * - Account level/XP if available
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user registration date
        const userRow = await db.get(
            'SELECT created_at FROM users WHERE id = ?',
            [userId]
        );

        // Total spins, wagered, and won
        const spinStats = await db.get(
            `SELECT
                COUNT(*) as total_spins,
                COALESCE(SUM(bet_amount), 0) as total_wagered,
                COALESCE(SUM(win_amount), 0) as total_won
             FROM spins WHERE user_id = ?`,
            [userId]
        );

        // Biggest single win
        const biggestWin = await db.get(
            'SELECT COALESCE(MAX(win_amount), 0) as biggest_win FROM spins WHERE user_id = ?',
            [userId]
        );

        // Average bet size
        const avgBet = await db.get(
            `SELECT COALESCE(AVG(bet_amount), 0) as avg_bet FROM spins WHERE user_id = ?`,
            [userId]
        );

        // Session count (distinct dates)
        const sessionCount = await db.get(
            `SELECT COUNT(DISTINCT DATE(created_at)) as session_count FROM spins WHERE user_id = ?`,
            [userId]
        );

        // Favorite game (most played)
        const favoriteGame = await db.get(
            `SELECT game_id, COUNT(*) as spin_count FROM spins WHERE user_id = ?
             GROUP BY game_id ORDER BY spin_count DESC LIMIT 1`,
            [userId]
        );

        // Calculate win/loss streak (last 10 spins or fewer)
        const recentSpins = await db.all(
            `SELECT win_amount, bet_amount FROM spins WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 10`,
            [userId]
        );

        let winStreak = 0;
        let lossStreak = 0;
        let currentStreak = 0;
        let streakType = null;

        if (recentSpins.length > 0) {
            for (const spin of recentSpins) {
                const won = spin.win_amount > spin.bet_amount;
                if (streakType === null) {
                    streakType = won ? 'win' : 'loss';
                    currentStreak = 1;
                } else if ((won && streakType === 'win') || (!won && streakType === 'loss')) {
                    currentStreak++;
                } else {
                    break;
                }
            }
            if (streakType === 'win') {
                winStreak = currentStreak;
            } else {
                lossStreak = currentStreak;
            }
        }

        // Prepare response
        const totalWagered = parseFloat(spinStats.total_wagered) || 0;
        const totalWon = parseFloat(spinStats.total_won) || 0;
        const netPl = totalWon - totalWagered;

        res.json({
            totalSpins: spinStats.total_spins || 0,
            totalWagered: parseFloat(totalWagered.toFixed(2)),
            totalWon: parseFloat(totalWon.toFixed(2)),
            netPl: parseFloat(netPl.toFixed(2)),
            biggestSingleWin: parseFloat(biggestWin.biggest_win).toFixed(2),
            winStreak: winStreak,
            lossStreak: lossStreak,
            favoriteGame: favoriteGame ? favoriteGame.game_id : null,
            favoriteGameSpins: favoriteGame ? favoriteGame.spin_count : 0,
            averageBetSize: parseFloat(avgBet.avg_bet).toFixed(2),
            sessionCount: sessionCount.session_count || 0,
            memberSinceDate: userRow ? userRow.created_at : null
        });
    } catch (err) {
        console.warn('[PlayerStats] Get stats error:', err);
        res.status(500).json({ error: 'Failed to retrieve player stats' });
    }
});

/**
 * GET /api/player-stats/history
 * Returns daily aggregated play history
 *
 * Query params:
 * - days: number of days to return (default 30, max 90)
 *
 * Returns array of { date, spins, wagered, won, netPl } for each day
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        let days = parseInt(req.query.days) || 30;

        // Enforce max 90 days
        if (days > 90) days = 90;
        if (days < 1) days = 1;

        // Get daily aggregated stats
        const dailyStats = await db.all(
            `SELECT
                DATE(created_at) as date,
                COUNT(*) as spins,
                COALESCE(SUM(bet_amount), 0) as wagered,
                COALESCE(SUM(win_amount), 0) as won
             FROM spins
             WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            [userId, days]
        );

        // Transform response
        const history = dailyStats.map(row => ({
            date: row.date,
            spins: row.spins,
            wagered: parseFloat(row.wagered).toFixed(2),
            won: parseFloat(row.won).toFixed(2),
            netPl: parseFloat((parseFloat(row.won) - parseFloat(row.wagered)).toFixed(2))
        }));

        res.json({
            daysRequested: days,
            recordCount: history.length,
            history: history
        });
    } catch (err) {
        console.warn('[PlayerStats] Get history error:', err);
        res.status(500).json({ error: 'Failed to retrieve play history' });
    }
});

module.exports = router;
