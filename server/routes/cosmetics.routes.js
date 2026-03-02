'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const cosmeticsService = require('../services/cosmetics.service');

const router = express.Router();

// GET /api/cosmetics/shop — public, returns all shop items organized by category
router.get('/shop', async (req, res) => {
    try {
        const shop = await cosmeticsService.getShop();
        res.json({ shop });
    } catch (err) {
        console.error('[Cosmetics] Shop error:', err.message);
        res.status(500).json({ error: 'Failed to load cosmetic shop' });
    }
});

// GET /api/cosmetics/inventory — auth required, returns player's owned items
router.get('/inventory', authenticate, async (req, res) => {
    try {
        const inventory = await cosmeticsService.getInventory(req.user.id);
        res.json({ inventory });
    } catch (err) {
        console.error('[Cosmetics] Inventory error:', err.message);
        res.status(500).json({ error: 'Failed to load inventory' });
    }
});

// POST /api/cosmetics/purchase — auth required, purchase a cosmetic with gems
router.post('/purchase', authenticate, async (req, res) => {
    try {
        const { itemId } = req.body;
        if (!itemId) {
            return res.status(400).json({ error: 'itemId is required' });
        }
        const result = await cosmeticsService.purchaseItem(req.user.id, parseInt(itemId));
        res.json(result);
    } catch (err) {
        console.error('[Cosmetics] Purchase error:', err.message);
        // Client-facing errors (validation, balance) vs server errors
        if (err.message.includes('not found') || err.message.includes('already own') || err.message.includes('Not enough gems')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Purchase failed' });
    }
});

// POST /api/cosmetics/equip — auth required, equip a cosmetic item
router.post('/equip', authenticate, async (req, res) => {
    try {
        const { itemId } = req.body;
        if (!itemId) {
            return res.status(400).json({ error: 'itemId is required' });
        }
        const result = await cosmeticsService.equipItem(req.user.id, parseInt(itemId));
        res.json(result);
    } catch (err) {
        console.error('[Cosmetics] Equip error:', err.message);
        if (err.message.includes('do not own') || err.message.includes('not found')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Equip failed' });
    }
});

// GET /api/cosmetics/equipped — auth required, returns player's equipped cosmetics
router.get('/equipped', authenticate, async (req, res) => {
    try {
        const equipped = await cosmeticsService.getEquipped(req.user.id);
        res.json({ equipped });
    } catch (err) {
        console.error('[Cosmetics] Equipped error:', err.message);
        res.status(500).json({ error: 'Failed to load equipped cosmetics' });
    }
});

module.exports = router;
