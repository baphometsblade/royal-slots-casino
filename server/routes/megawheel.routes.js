'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const megawheelService = require('../services/megawheel.service');

// GET /api/megawheel/config — wheel segments for a tier (public, no auth)
router.get('/config', async (req, res) => {
    try {
        var tier = req.query.tier || 'basic';
        var config = megawheelService.getWheelConfig(tier);
        res.json(config);
    } catch (err) {
        console.warn('[MegaWheel] GET /config error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/megawheel/spin — spin the wheel (auth required)
router.post('/spin', authenticate, async (req, res) => {
    try {
        var tier = (req.body && req.body.tier) || 'basic';
        var result = await megawheelService.spin(req.user.id, tier);
        res.json(result);
    } catch (err) {
        console.warn('[MegaWheel] POST /spin error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/megawheel/history — recent spin history (auth required)
router.get('/history', authenticate, async (req, res) => {
    try {
        var limit = parseInt(req.query.limit, 10) || 20;
        var history = await megawheelService.getHistory(req.user.id, limit);
        res.json({ history: history });
    } catch (err) {
        console.warn('[MegaWheel] GET /history error:', err.message);
        res.status(500).json({ error: 'Failed to fetch spin history' });
    }
});

module.exports = router;
