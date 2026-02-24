'use strict';

const express = require('express');
const jackpotService = require('../services/jackpot.service');

const router = express.Router();

// GET /api/jackpot — current pool amounts (public, no auth)
router.get('/', async (req, res) => {
    try {
        await jackpotService.ensureSeeded();
        const amounts = await jackpotService.getAmounts();
        res.json(amounts);
    } catch (err) {
        console.error('[Jackpot] Error fetching amounts:', err);
        res.status(500).json({ error: 'Failed to fetch jackpot amounts' });
    }
});

// GET /api/jackpot/history — recent jackpot wins (public, no auth)
router.get('/history', async (req, res) => {
    try {
        const history = await jackpotService.getHistory();
        res.json({ history });
    } catch (err) {
        console.error('[Jackpot] Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch jackpot history' });
    }
});

module.exports = router;
