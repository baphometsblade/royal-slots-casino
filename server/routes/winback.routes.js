'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const winbackService = require('../services/winback.service');
const db = require('../database');

// POST /api/admin/run-winback — manually trigger a win-back cycle (admin only)
router.post('/admin/run-winback', authenticate, requireAdmin, async function (req, res) {
    try {
        const result = await winbackService.runWinBackCycle();
        res.json({
            success: true,
            processed: result.processed,
            totalBonused: result.totalBonused,
        });
    } catch (err) {
        console.error('[WinBack] Run cycle error:', err.message);
        res.status(500).json({ error: 'Failed to run win-back cycle' });
    }
});

// GET /api/user/winback-status — check if current user has an active win-back bonus
router.get('/user/winback-status', authenticate, async function (req, res) {
    try {
        const user = await db.get(
            'SELECT bonus_balance, wagering_requirement FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const recentWinback = await db.get(
            `SELECT amount, created_at FROM transactions
             WHERE user_id = ? AND type = 'winback_bonus'
             ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
        );

        const hasActiveWinback = user.bonus_balance > 0 && recentWinback != null;

        res.json({
            hasActiveWinback,
            bonusBalance: user.bonus_balance,
            wageringRequirement: user.wagering_requirement,
            lastWinbackBonus: recentWinback ? {
                amount: recentWinback.amount,
                grantedAt: recentWinback.created_at,
            } : null,
        });
    } catch (err) {
        console.error('[WinBack] Status check error:', err.message);
        res.status(500).json({ error: 'Failed to check win-back status' });
    }
});

module.exports = router;
