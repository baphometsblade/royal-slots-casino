'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const sessionTimer = require('../services/session-timer.service');

const router = express.Router();

// GET /api/session/status — current session status (elapsed, remaining, limit)
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const info = sessionTimer.getSessionInfo(userId);

        if (!info) {
            return res.json({
                active: false,
                elapsed: 0,
                limit: null,
                remaining: null
            });
        }

        // Fetch limit from DB to include in response
        const limitsRow = await db.get(
            'SELECT session_time_limit FROM user_limits WHERE user_id = ?',
            [userId]
        );
        const limit = (limitsRow && limitsRow.session_time_limit != null)
            ? limitsRow.session_time_limit
            : null;

        const remaining = (limit !== null)
            ? Math.max(0, limit - info.elapsedMinutes)
            : null;

        res.json({
            active: true,
            startedAt: info.startedAt,
            elapsed: info.elapsedMinutes,
            limit,
            remaining
        });
    } catch (err) {
        console.error('[Session] Status error:', err);
        res.status(500).json({ error: 'Failed to get session status' });
    }
});

// POST /api/session/start — start a new session timer
router.post('/start', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const session = sessionTimer.startSession(userId);

        res.json({
            message: 'Session started',
            startedAt: new Date(session.startedAt).toISOString()
        });
    } catch (err) {
        console.error('[Session] Start error:', err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// POST /api/session/end — end current session
router.post('/end', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const info = sessionTimer.getSessionInfo(userId);
        sessionTimer.endSession(userId);

        res.json({
            message: 'Session ended',
            elapsed: info ? info.elapsedMinutes : 0
        });
    } catch (err) {
        console.error('[Session] End error:', err);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// GET /api/session/limit — get user's configured time limit
router.get('/limit', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const limitsRow = await db.get(
            'SELECT session_time_limit FROM user_limits WHERE user_id = ?',
            [userId]
        );
        const limit = (limitsRow && limitsRow.session_time_limit != null)
            ? limitsRow.session_time_limit
            : null;

        res.json({ limit });
    } catch (err) {
        console.error('[Session] Get limit error:', err);
        res.status(500).json({ error: 'Failed to get session limit' });
    }
});

// PUT /api/session/limit — set session time limit (minutes, min 15, max 1440)
router.put('/limit', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit } = req.body;

        // Allow null to remove the limit
        if (limit !== null && limit !== undefined) {
            const minutes = parseInt(limit, 10);
            if (isNaN(minutes) || minutes < 15 || minutes > 1440) {
                return res.status(400).json({
                    error: 'Session time limit must be between 15 and 1440 minutes (24 hours)'
                });
            }

            // Ensure user_limits row exists
            const existing = await db.get(
                'SELECT user_id FROM user_limits WHERE user_id = ?',
                [userId]
            );
            if (!existing) {
                await db.run('INSERT INTO user_limits (user_id) VALUES (?)', [userId]);
            }

            await db.run(
                "UPDATE user_limits SET session_time_limit = ?, updated_at = datetime('now') WHERE user_id = ?",
                [minutes, userId]
            );

            res.json({ message: 'Session time limit updated', limit: minutes });
        } else {
            // Remove limit (set to null)
            const existing = await db.get(
                'SELECT user_id FROM user_limits WHERE user_id = ?',
                [userId]
            );
            if (!existing) {
                await db.run('INSERT INTO user_limits (user_id) VALUES (?)', [userId]);
            }

            await db.run(
                "UPDATE user_limits SET session_time_limit = NULL, updated_at = datetime('now') WHERE user_id = ?",
                [userId]
            );

            res.json({ message: 'Session time limit removed', limit: null });
        }
    } catch (err) {
        console.error('[Session] Set limit error:', err);
        res.status(500).json({ error: 'Failed to set session limit' });
    }
});

module.exports = router;
