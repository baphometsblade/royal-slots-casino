'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

/**
 * Mask a username: show first 2 chars, then '***'
 * e.g. "johnsmith" -> "jo***"
 */
function maskUsername(username) {
    if (!username || username.length < 1) return '***';
    var prefix = username.length >= 2 ? username.slice(0, 2) : username.slice(0, 1);
    return prefix + '***';
}

// ---------------------------------------------------------------------------
// GET /api/gifts/inbox — pending gifts for current user
// ---------------------------------------------------------------------------
router.get('/inbox', authenticate, async (req, res) => {
    try {
        var rows = await db.all(
            'SELECT g.id, u.username as fromUsername, g.amount, g.message, g.created_at ' +
            'FROM gifts g JOIN users u ON g.from_user_id = u.id ' +
            'WHERE g.to_user_id = ? AND g.status = \'pending\' ' +
            'ORDER BY g.created_at DESC LIMIT 20',
            [req.user.id]
        );
        var gifts = rows.map(function (row) {
            return {
                id: row.id,
                fromUsername: maskUsername(row.fromUsername),
                amount: row.amount,
                message: row.message || '',
                createdAt: row.created_at
            };
        });
        res.json({ gifts: gifts });
    } catch (err) {
        console.error('[Gifts] GET /inbox error:', err.message);
        res.status(500).json({ error: 'Failed to fetch inbox' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/gifts/sent — gifts sent by current user (last 20)
// ---------------------------------------------------------------------------
router.get('/sent', authenticate, async (req, res) => {
    try {
        var rows = await db.all(
            'SELECT g.id, u.username as toUsername, g.amount, g.message, g.status, g.created_at ' +
            'FROM gifts g JOIN users u ON g.to_user_id = u.id ' +
            'WHERE g.from_user_id = ? ' +
            'ORDER BY g.created_at DESC LIMIT 20',
            [req.user.id]
        );
        var gifts = rows.map(function (row) {
            return {
                id: row.id,
                toUsername: maskUsername(row.toUsername),
                amount: row.amount,
                message: row.message || '',
                status: row.status,
                createdAt: row.created_at
            };
        });
        res.json({ gifts: gifts });
    } catch (err) {
        console.error('[Gifts] GET /sent error:', err.message);
        res.status(500).json({ error: 'Failed to fetch sent gifts' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/gifts/send — send a gift to another player
// ---------------------------------------------------------------------------
router.post('/send', authenticate, async (req, res) => {
    try {
        var toUsername = req.body.toUsername;
        var amount     = parseFloat(req.body.amount);
        var message    = typeof req.body.message === 'string'
            ? req.body.message.trim().slice(0, 100)
            : '';

        // --- Validation ---
        if (!toUsername || typeof toUsername !== 'string' || !toUsername.trim()) {
            return res.status(400).json({ error: 'Recipient username is required' });
        }
        toUsername = toUsername.trim();

        if (isNaN(amount) || amount < 1 || amount > 500) {
            return res.status(400).json({ error: 'Amount must be between $1 and $500' });
        }

        // --- Look up recipient ---
        var recipient = await db.get('SELECT id FROM users WHERE username = ?', [toUsername]);
        if (!recipient) {
            return res.status(404).json({ error: 'User not found' });
        }

        // --- Cannot gift yourself ---
        if (recipient.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot gift yourself' });
        }

        // --- Check sender balance ---
        var sender = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!sender || sender.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        var balanceBefore = sender.balance;
        var balanceAfter  = balanceBefore - amount;

        // --- Deduct from sender ---
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, req.user.id]);

        // --- Insert gift record ---
        await db.run(
            'INSERT INTO gifts (from_user_id, to_user_id, amount, message) VALUES (?, ?, ?, ?)',
            [req.user.id, recipient.id, amount, message]
        );

        // --- Insert transaction record ---
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'gift_sent', -amount, balanceBefore, balanceAfter, 'Gift to ' + toUsername]
        );

        res.json({ ok: true, newBalance: balanceAfter });
    } catch (err) {
        console.error('[Gifts] POST /send error:', err.message);
        res.status(500).json({ error: 'Failed to send gift' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/gifts/claim/:id — claim a pending gift
// ---------------------------------------------------------------------------
router.post('/claim/:id', authenticate, async (req, res) => {
    try {
        var giftId = parseInt(req.params.id, 10);
        if (isNaN(giftId)) {
            return res.status(400).json({ error: 'Invalid gift ID' });
        }

        // --- Fetch the gift (must be pending and addressed to this user) ---
        var gift = await db.get(
            'SELECT * FROM gifts WHERE id = ? AND to_user_id = ? AND status = \'pending\'',
            [giftId, req.user.id]
        );
        if (!gift) {
            return res.status(404).json({ error: 'Gift not found or already claimed' });
        }

        // --- Mark gift as claimed ---
        await db.run(
            'UPDATE gifts SET status = \'claimed\', claimed_at = datetime(\'now\') WHERE id = ?',
            [giftId]
        );

        // --- Credit recipient balance ---
        var recipient = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        var balanceBefore = recipient ? recipient.balance : 0;
        var balanceAfter  = balanceBefore + gift.amount;

        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [gift.amount, req.user.id]);

        // --- Insert transaction record ---
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'gift_claimed', gift.amount, balanceBefore, balanceAfter, 'Gift #' + giftId]
        );

        // --- Fetch confirmed new balance ---
        var updated = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);

        res.json({ ok: true, newBalance: updated ? updated.balance : balanceAfter });
    } catch (err) {
        console.error('[Gifts] POST /claim error:', err.message);
        res.status(500).json({ error: 'Failed to claim gift' });
    }
});

module.exports = router;
