const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// GET /api/balance
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        res.json({ balance: user ? user.balance : 0 });
    } catch (err) {
        console.error('[Balance] Get balance error:', err);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

// POST /api/deposit
// In production, this would integrate with a payment gateway (Stripe, etc.)
// For now, it's a manual admin-approved deposit or dev helper
router.post('/deposit', authenticate, async (req, res) => {
    try {
        const { amount, paymentRef } = req.body;
        const deposit = parseFloat(amount);

        if (isNaN(deposit) || deposit <= 0) {
            return res.status(400).json({ error: 'Invalid deposit amount' });
        }
        if (deposit > 100000) {
            return res.status(400).json({ error: 'Maximum deposit is $100,000' });
        }

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore + deposit;

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'deposit', deposit, balanceBefore, balanceAfter, paymentRef || 'manual']
        );

        res.json({ balance: balanceAfter, message: `Deposited $${deposit.toFixed(2)}` });
    } catch (err) {
        console.error('[Balance] Deposit error:', err);
        res.status(500).json({ error: 'Deposit failed' });
    }
});

// POST /api/withdraw
router.post('/withdraw', authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        const withdrawal = parseFloat(amount);

        if (isNaN(withdrawal) || withdrawal <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.balance < withdrawal) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore - withdrawal;

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'withdrawal', -withdrawal, balanceBefore, balanceAfter, 'pending']
        );

        res.json({ balance: balanceAfter, message: `Withdrawal of $${withdrawal.toFixed(2)} submitted` });
    } catch (err) {
        console.error('[Balance] Withdrawal error:', err);
        res.status(500).json({ error: 'Withdrawal failed' });
    }
});

// GET /api/transactions
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const rows = await db.all(
            'SELECT id, type, amount, balance_before, balance_after, reference, created_at FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?',
            [req.user.id, limit]
        );
        res.json({ transactions: rows });
    } catch (err) {
        console.error('[Balance] Transactions error:', err);
        res.status(500).json({ error: 'Failed to load transactions' });
    }
});

module.exports = router;
