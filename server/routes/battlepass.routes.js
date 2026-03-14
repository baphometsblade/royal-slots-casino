'use strict';
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const battlepass = require('../services/battlepass.service');

// GET /api/battlepass — current season + player progress
router.get('/', authenticate, async (req, res) => {
    try {
        const progress = await battlepass.getProgress(req.user.id);
        res.json(progress || { error: 'No active season' });
    } catch (err) {
        console.warn('[BattlePass] getProgress error:', err.message);
        res.status(500).json({ error: 'Failed to load battle pass' });
    }
});

// POST /api/battlepass/buy-premium — purchase premium track
router.post('/buy-premium', authenticate, async (req, res) => {
    try {
        const result = await battlepass.buyPremium(req.user.id);
        res.json(result);
    } catch (err) {
        console.warn('[BattlePass] buyPremium error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/battlepass/claim/:level — claim a tier reward
router.post('/claim/:level', authenticate, async (req, res) => {
    try {
        const level = parseInt(req.params.level, 10);
        const track = req.body.track || 'free';
        const result = await battlepass.claimReward(req.user.id, level, track);
        res.json(result);
    } catch (err) {
        console.warn('[BattlePass] claimReward error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
