'use strict';

/**
 * XP Shop — server-side validation for XP-to-reward purchases.
 *
 * Replaces the former client-side-only balance grants which were a security
 * exploit (anyone could manipulate localStorage to claim $500/$2000 for free).
 *
 * POST /api/xpshop/purchase  — validate XP, deduct, credit reward, log transaction
 * GET  /api/xpshop/xp        — return authenticated user's current server-side XP
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: add xp column to users table if it doesn't exist yet.
// Uses the same fire-and-forget ALTER TABLE pattern as other routes (e.g. loyaltyshop).
db.run('ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0').catch(function () {});

// XP Shop catalogue — must mirror the client-side XP_SHOP_ITEMS array in js/ui-modals.js.
// type: 'balance' rewards are the only ones that require server enforcement;
//       'freespins' and 'xpboost' are cosmetic/gameplay only and are allowed
//       to fall back to client-side logic when the server is unreachable.
const XP_SHOP_ITEMS = {
    freespins5:  { cost: 100,  type: 'freespins', amount: 5 },
    balance500:  { cost: 250,  type: 'balance',   amount: 500 },
    xpboost50:   { cost: 500,  type: 'xpboost',   amount: 50 },
    balance2000: { cost: 1000, type: 'balance',   amount: 2000 },
};

// POST /api/xpshop/purchase
// Body: { itemId: string }
// Validates that the authenticated user has enough XP, deducts it, grants the
// reward, and (for balance items) records an auditable transaction row.
router.post('/purchase', authenticate, async function (req, res) {
    try {
        const { itemId } = req.body;
        if (!itemId || typeof itemId !== 'string') {
            return res.status(400).json({ error: 'itemId is required' });
        }

        const item = XP_SHOP_ITEMS[itemId];
        if (!item) {
            return res.status(400).json({ error: 'Unknown item: ' + itemId });
        }

        const userId = req.user.id;
        const user = await db.get(
            'SELECT xp, balance FROM users WHERE id = ?',
            [userId]
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userXp = parseInt(user.xp, 10) || 0;
        if (userXp < item.cost) {
            return res.status(400).json({
                error: 'Insufficient XP. Need ' + item.cost + ', have ' + userXp,
                currentXp: userXp,
            });
        }

        // Atomically deduct XP.
        await db.run(
            'UPDATE users SET xp = xp - ? WHERE id = ?',
            [item.cost, userId]
        );

        const currentBalance = parseFloat(user.balance) || 0;
        let newBalance = currentBalance;
        let granted = {};

        if (item.type === 'balance') {
            // Credit the cash reward and log it for auditing.
            const balanceAfter = currentBalance + item.amount;
            await db.run(
                'UPDATE users SET balance = balance + ? WHERE id = ?',
                [item.amount, userId]
            );
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    userId,
                    'xpshop',
                    item.amount,
                    currentBalance,
                    balanceAfter,
                    'XP Shop: ' + itemId + ' (cost ' + item.cost + ' XP)',
                ]
            );
            newBalance = balanceAfter;
            granted = { type: 'balance', amount: item.amount };
        } else if (item.type === 'freespins') {
            // Free spins are fulfilled client-side; server just validates XP deduction.
            granted = { type: 'freespins', amount: item.amount };
        } else if (item.type === 'xpboost') {
            // XP boost is stored client-side; server just validates XP deduction.
            granted = { type: 'xpboost', amount: item.amount };
        }

        const updatedUser = await db.get('SELECT xp FROM users WHERE id = ?', [userId]);
        const newXp = parseInt((updatedUser && updatedUser.xp) || 0, 10);

        return res.json({
            success: true,
            newXp,
            newBalance,
            granted,
        });
    } catch (err) {
        console.error('[XPShop] purchase error:', err.message);
        return res.status(500).json({ error: 'Purchase failed' });
    }
});

// GET /api/xpshop/xp
// Returns the authenticated user's current server-side XP balance.
// Used by the client to sync localStorage XP with the authoritative server value.
router.get('/xp', authenticate, async function (req, res) {
    try {
        const user = await db.get('SELECT xp FROM users WHERE id = ?', [req.user.id]);
        return res.json({ xp: parseInt((user && user.xp) || 0, 10) });
    } catch (err) {
        console.error('[XPShop] GET /xp error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch XP' });
    }
});

// POST /api/xpshop/sync-xp
// Allows the client to push its locally-earned XP to the server so the two
// stay in sync. XP earned client-side (per spin, big win, etc.) is forwarded
// here. The server only accepts increases — it never decrements XP via this
// endpoint (purchases use /purchase instead).
router.post('/sync-xp', authenticate, async function (req, res) {
    try {
        const { xp } = req.body;
        const clientXp = parseInt(xp, 10);
        if (isNaN(clientXp) || clientXp < 0) {
            return res.status(400).json({ error: 'xp must be a non-negative integer' });
        }

        const userId = req.user.id;
        const user = await db.get('SELECT xp FROM users WHERE id = ?', [userId]);
        const serverXp = parseInt((user && user.xp) || 0, 10);

        // Only update if the client reports more XP than the server has on record
        // (prevents clients from rolling back another session's earned XP).
        if (clientXp > serverXp) {
            await db.run(
                'UPDATE users SET xp = ? WHERE id = ?',
                [clientXp, userId]
            );
            return res.json({ xp: clientXp });
        }

        return res.json({ xp: serverXp });
    } catch (err) {
        console.error('[XPShop] sync-xp error:', err.message);
        return res.status(500).json({ error: 'Failed to sync XP' });
    }
});

module.exports = router;
