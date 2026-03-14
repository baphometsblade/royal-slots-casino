'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const rentalService = require('../services/rental.service');

// GET /api/rentals/locked-games — public. Returns locked game IDs + rental tiers.
router.get('/locked-games', async (req, res) => {
    try {
        res.json({
            lockedGames: rentalService.getLockedGames(),
            tiers: rentalService.getRentalTiers()
        });
    } catch (err) {
        console.warn('[Rental] GET /locked-games error:', err.message);
        res.status(500).json({ error: 'Failed to fetch locked games' });
    }
});

// GET /api/rentals/status/:gameId — auth required. Returns rental status for a specific game.
router.get('/status/:gameId', authenticate, async (req, res) => {
    try {
        const { gameId } = req.params;
        if (!gameId) {
            return res.status(400).json({ error: 'gameId is required' });
        }

        const lockedGames = rentalService.getLockedGames();
        const isLocked = lockedGames.includes(gameId);

        // If the game is not locked, it is always accessible
        if (!isLocked) {
            return res.json({
                gameId: gameId,
                locked: false,
                unlocked: true,
                rental: null
            });
        }

        const rental = await rentalService.getRentalStatus(req.user.id, gameId);
        res.json({
            gameId: gameId,
            locked: true,
            unlocked: !!rental,
            rental: rental
        });
    } catch (err) {
        console.warn('[Rental] GET /status error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rental status' });
    }
});

// GET /api/rentals/my-rentals — auth required. Returns all active rentals.
router.get('/my-rentals', authenticate, async (req, res) => {
    try {
        const rentals = await rentalService.getActiveRentals(req.user.id);
        res.json({ rentals: rentals });
    } catch (err) {
        console.warn('[Rental] GET /my-rentals error:', err.message);
        res.status(500).json({ error: 'Failed to fetch rentals' });
    }
});

// POST /api/rentals/rent — auth required. Body: { gameId, tierId, payWith }
router.post('/rent', authenticate, async (req, res) => {
    try {
        const { gameId, tierId, payWith } = req.body;

        if (!gameId) return res.status(400).json({ error: 'gameId is required' });
        if (!tierId) return res.status(400).json({ error: 'tierId is required' });
        if (!payWith) return res.status(400).json({ error: 'payWith is required (credits or gems)' });

        const result = await rentalService.rentSlot(req.user.id, gameId, tierId, payWith);
        res.json(result);
    } catch (err) {
        console.warn('[Rental] POST /rent error:', err.message);
        // Client-facing validation errors vs server errors
        if (err.message.includes('not a locked') ||
            err.message.includes('Invalid rental') ||
            err.message.includes('Insufficient') ||
            err.message.includes('already have permanent') ||
            err.message.includes('Invalid payment') ||
            err.message.includes('Not enough') ||
            err.message.includes('Insufficient gem')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Rental failed' });
    }
});

module.exports = router;
