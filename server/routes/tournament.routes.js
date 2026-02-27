'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const tournamentService = require('../services/tournament.service');

// GET /api/tournaments — public, returns active + upcoming
router.get('/', async (req, res) => {
    try {
        const [active, upcoming] = await Promise.all([
            tournamentService.getActive(),
            tournamentService.getUpcoming(),
        ]);
        res.json({ active, upcoming });
    } catch (err) {
        console.error('[Tournament] GET / error:', err.message);
        res.status(500).json({ error: 'Failed to load tournaments' });
    }
});

// GET /api/tournaments/:id/leaderboard — public
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid tournament id' });
        const board = await tournamentService.getLeaderboard(id);
        res.json({ leaderboard: board });
    } catch (err) {
        console.error('[Tournament] GET leaderboard error:', err.message);
        res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

// POST /api/tournaments/:id/join — auth required
router.post('/:id/join', authenticate, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid tournament id' });
        const result = await tournamentService.join(id, req.user.id);
        res.json(result);
    } catch (err) {
        console.error('[Tournament] POST join error:', err.message);
        res.status(500).json({ error: 'Failed to join tournament' });
    }
});

module.exports = router;
