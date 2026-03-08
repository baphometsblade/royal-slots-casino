'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const gemsService = require('../services/gems.service');

// GET /api/gems — gem balance (returns 0 if not authed)
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await gemsService.getBalance(req.user.id);
        res.json(result);
    } catch (err) {
        console.error('[Gems] GET / error:', err.message);
        res.status(500).json({ error: 'Failed to fetch gem balance' });
    }
});

// GET /api/gems/packs — available gem packs (public, no auth)
router.get('/packs', async (req, res) => {
    try {
        res.json({ packs: gemsService.GEM_PACKS });
    } catch (err) {
        console.error('[Gems] GET /packs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch gem packs' });
    }
});

// POST /api/gems/purchase — buy a gem pack (auth required)
router.post('/purchase', authenticate, async (req, res) => {
    try {
        const { packId } = req.body;
        if (!packId) return res.status(400).json({ error: 'Pack ID required' });
        const result = await gemsService.purchaseGems(req.user.id, packId);
        res.json(result);
    } catch (err) {
        console.error('[Gems] POST /purchase error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/gems/history — gem transaction history (auth required)
router.get('/history', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20;
        const history = await gemsService.getHistory(req.user.id, limit);
        res.json({ history });
    } catch (err) {
        console.error('[Gems] GET /history error:', err.message);
        res.status(500).json({ error: 'Failed to fetch gem history' });
    }
});

// POST /api/gems/award — award gems earned through gameplay (auth required)
// Body: { amount: N, reason: 'win_10x' } — fire-and-forget from spin flow
// Rate limited: max 20 gem awards per minute per user to prevent abuse
var _gemAwardRateMap = new Map();
setInterval(function() { _gemAwardRateMap.clear(); }, 60000); // clear every minute
router.post('/award', authenticate, async (req, res) => {
    try {
        // Rate limit: max 20 awards per minute per user
        var rateKey = String(req.user.id);
        var rateCount = _gemAwardRateMap.get(rateKey) || 0;
        if (rateCount >= 20) {
            return res.status(429).json({ error: 'Too many gem awards — slow down' });
        }
        _gemAwardRateMap.set(rateKey, rateCount + 1);

        const amount = parseInt(req.body.amount, 10);
        if (!amount || amount <= 0 || amount > 50) {
            return res.status(400).json({ error: 'Invalid gem amount (max 50)' });
        }
        const reason = (req.body.reason || 'gameplay_win').slice(0, 64);
        const result = await gemsService.addGems(req.user.id, amount, 'Earned via gameplay: ' + reason);
        res.json({ success: true, gemsAwarded: amount, newBalance: result.newBalance });
    } catch (err) {
        console.error('[Gems] POST /award error:', err.message);
        res.status(500).json({ error: 'Failed to award gems' });
    }
});

module.exports = router;
