'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const challengesService = require('../services/challenges.service');
const db = require('../database');

const router = express.Router();

// Bootstrap claimed column (silently ignore if already exists)
db.run("ALTER TABLE daily_challenges ADD COLUMN claimed INTEGER DEFAULT 0").catch(function() {});

// GET /api/challenges — auth required, returns today's challenges + streak
router.get('/', authenticate, async (req, res) => {
    try {
        var result = await challengesService.getDailyChallenges(req.user.id);
        res.json(result);
    } catch (err) {
        console.error('[Challenges] Get error:', err.message);
        res.status(500).json({ error: 'Failed to load daily challenges' });
    }
});

// POST /api/challenges/:id/claim — auth required, acknowledge reward receipt
router.post('/:id/claim', authenticate, async (req, res) => {
    try {
        var id = parseInt(req.params.id, 10);
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid challenge id' });

        var ch = await db.get(
            "SELECT * FROM daily_challenges WHERE id = ? AND user_id = ? AND date = date('now')",
            [id, req.user.id]
        );

        if (!ch)              return res.status(404).json({ error: 'Challenge not found' });
        if (!ch.completed)    return res.status(400).json({ error: 'Challenge not yet completed' });
        if (ch.claimed)       return res.status(400).json({ error: 'Already claimed' });

        await db.run(
            "UPDATE daily_challenges SET claimed = 1 WHERE id = ?",
            [id]
        );

        // Rewards were already credited by updateProgress; return amounts for the toast
        return res.json({
            success:     true,
            xpAwarded:   0,
            gemsAwarded: ch.reward_gems || 0,
            credits:     ch.reward_credits || 0,
        });
    } catch (err) {
        console.error('[Challenges] Claim error:', err.message);
        res.status(500).json({ error: 'Failed to claim challenge reward' });
    }
});

// POST /api/challenges/skip — auth required, skip a challenge for gems
router.post('/skip', authenticate, async (req, res) => {
    try {
        var { challengeId } = req.body;
        if (!challengeId) {
            return res.status(400).json({ error: 'challengeId is required' });
        }
        var result = await challengesService.skipChallenge(req.user.id, parseInt(challengeId));
        res.json(result);
    } catch (err) {
        console.error('[Challenges] Skip error:', err.message);
        if (err.message.includes('not found') || err.message.includes('already completed') || err.message.includes('Insufficient gem balance')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to skip challenge' });
    }
});

module.exports = router;
