'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const challengesService = require('../services/challenges.service');

const router = express.Router();

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
