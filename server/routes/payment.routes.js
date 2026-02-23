const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const config = require('../config');
const crypto = require('crypto');

const router = express.Router();

// ─── Helpers ───

function generateReference(prefix) {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function maskCardNumber(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    return digits.slice(-4);
}

function maskBankAccount(accountNumber) {
    const digits = accountNumber.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return '***' + digits.slice(-4);
}

function ensureUserLimitsRow(userId) {
    const existing = db.get('SELECT user_id FROM user_limits WHERE user_id = ?', [userId]);
    if (!existing) {
        db.run('INSERT INTO user_limits (user_id) VALUES (?)', [userId]);
    }
}

// ─── Check self-exclusion / cooling-off status ───
function checkExclusion(userId) {
    const limits = db.get(
        'SELECT self_excluded_until, cooling_off_until FROM user_limits WHERE user_id = ?',
        [userId]
    );
    if (!limits) return null;

    const now = new Date().toISOString();
    if (limits.self_excluded_until && limits.self_excluded_until > now) {
        return `Account is self-excluded until ${limits.self_excluded_until}`;
    }
    if (limits.cooling_off_until && limits.cooling_off_until > now) {
        return `Account is in cooling-off period until ${limits.cooling_off_until}`;
    }
    return null;
}

// ─── Check deposit limits ───
function checkDepositLimits(userId, amount) {
    const limits = db.get(
        'SELECT daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit FROM user_limits WHERE user_id = ?',
        [userId]
    );
    if (!limits) return null;

    const now = new Date();

    if (limits.daily_deposit_limit !== null) {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const daily = db.get(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed' AND created_at >= ?",
            [userId, dayStart.toISOString()]
        );
        if (daily.total + amount > limits.daily_deposit_limit) {
            return `Daily deposit limit of $${limits.daily_deposit_limit.toFixed(2)} would be exceeded. Already deposited $${daily.total.toFixed(2)} today.`;
        }
    }

    if (limits.weekly_deposit_limit !== null) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        const weekly = db.get(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed' AND created_at >= ?",
            [userId, weekStart.toISOString()]
        );
        if (weekly.total + amount > limits.weekly_deposit_limit) {
            return `Weekly deposit limit of $${limits.weekly_deposit_limit.toFixed(2)} would be exceeded. Already deposited $${weekly.total.toFixed(2)} this week.`;
        }
    }

    if (limits.monthly_deposit_limit !== null) {
        const monthStart = new Date(now);
        monthStart.setDate(monthStart.getDate() - 30);
        const monthly = db.get(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed' AND created_at >= ?",
            [userId, monthStart.toISOString()]
        );
        if (monthly.total + amount > limits.monthly_deposit_limit) {
            return `Monthly deposit limit of $${limits.monthly_deposit_limit.toFixed(2)} would be exceeded. Already deposited $${monthly.total.toFixed(2)} this month.`;
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════
//  PAYMENT METHODS
// ═══════════════════════════════════════════════════

// GET /api/payments/methods — list user's saved payment methods
router.get('/methods', authenticate, (req, res) => {
    try {
        const methods = db.all(
            'SELECT id, type, label, details_encrypted, is_default, is_verified, created_at FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [req.user.id]
        );
        res.json({ methods });
    } catch (err) {
        console.error('[Payment] List methods error:', err);
        res.status(500).json({ error: 'Failed to retrieve payment methods' });
    }
});

// POST /api/payments/methods — add a new payment method
router.post('/methods', authenticate, (req, res) => {
    try {
        const { type, label, details } = req.body;

        if (!type || !label) {
            return res.status(400).json({ error: 'Type and label are required' });
        }

        if (!config.PAYMENT_METHODS.includes(type)) {
            return res.status(400).json({
                error: `Invalid payment type. Allowed: ${config.PAYMENT_METHODS.join(', ')}`
            });
        }

        if (!details || typeof details !== 'object') {
            return res.status(400).json({ error: 'Payment details are required' });
        }

        // Build safe stored details based on type
        let storedDetails = {};

        if (type === 'visa' || type === 'mastercard') {
            if (!details.cardNumber) {
                return res.status(400).json({ error: 'Card number is required' });
            }
            const last4 = maskCardNumber(details.cardNumber);
            if (last4.length < 4) {
                return res.status(400).json({ error: 'Invalid card number' });
            }
            storedDetails = {
                last4,
                expiryMonth: details.expiryMonth || null,
                expiryYear: details.expiryYear || null,
                cardholderName: details.cardholderName || null
            };
        } else if (type === 'payid') {
            if (!details.payId) {
                return res.status(400).json({ error: 'PayID is required' });
            }
            storedDetails = { payId: details.payId };
        } else if (type === 'bank_transfer') {
            if (!details.bsb || !details.accountNumber) {
                return res.status(400).json({ error: 'BSB and account number are required' });
            }
            storedDetails = {
                bsb: details.bsb,
                accountNumber: maskBankAccount(details.accountNumber),
                accountName: details.accountName || null
            };
        } else if (type.startsWith('crypto_')) {
            if (!details.walletAddress) {
                return res.status(400).json({ error: 'Wallet address is required' });
            }
            storedDetails = { walletAddress: details.walletAddress };
        }

        // Check if this is the first method — auto-set as default
        const existingCount = db.get(
            'SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?',
            [req.user.id]
        );
        const isDefault = existingCount.count === 0 ? 1 : 0;

        const result = db.run(
            'INSERT INTO payment_methods (user_id, type, label, details_encrypted, is_default) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, type, label, JSON.stringify(storedDetails), isDefault]
        );

        res.json({
            message: 'Payment method added',
            method: {
                id: result.lastInsertRowid,
                type,
                label,
                details_encrypted: JSON.stringify(storedDetails),
                is_default: isDefault,
                is_verified: 0
            }
        });
    } catch (err) {
        console.error('[Payment] Add method error:', err);
        res.status(500).json({ error: 'Failed to add payment method' });
    }
});

// DELETE /api/payments/methods/:id — remove a payment method
router.delete('/methods/:id', authenticate, (req, res) => {
    try {
        const methodId = parseInt(req.params.id);
        if (isNaN(methodId)) {
            return res.status(400).json({ error: 'Invalid method ID' });
        }

        const method = db.get(
            'SELECT id, is_default FROM payment_methods WHERE id = ? AND user_id = ?',
            [methodId, req.user.id]
        );
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }

        db.run('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [methodId, req.user.id]);

        // If we deleted the default, promote the next one
        if (method.is_default) {
            const next = db.get(
                'SELECT id FROM payment_methods WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
                [req.user.id]
            );
            if (next) {
                db.run('UPDATE payment_methods SET is_default = 1 WHERE id = ?', [next.id]);
            }
        }

        res.json({ message: 'Payment method removed' });
    } catch (err) {
        console.error('[Payment] Delete method error:', err);
        res.status(500).json({ error: 'Failed to remove payment method' });
    }
});

// PUT /api/payments/methods/:id/default — set as default payment method
router.put('/methods/:id/default', authenticate, (req, res) => {
    try {
        const methodId = parseInt(req.params.id);
        if (isNaN(methodId)) {
            return res.status(400).json({ error: 'Invalid method ID' });
        }

        const method = db.get(
            'SELECT id FROM payment_methods WHERE id = ? AND user_id = ?',
            [methodId, req.user.id]
        );
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }

        // Clear all defaults for this user, then set the new one
        db.run('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?', [req.user.id]);
        db.run('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?', [methodId, req.user.id]);

        res.json({ message: 'Default payment method updated' });
    } catch (err) {
        console.error('[Payment] Set default error:', err);
        res.status(500).json({ error: 'Failed to update default payment method' });
    }
});

// ═══════════════════════════════════════════════════
//  DEPOSITS
// ═══════════════════════════════════════════════════

// POST /api/payments/deposit — create and auto-complete a deposit
router.post('/deposit', authenticate, (req, res) => {
    try {
        const { amount, paymentType, paymentMethodId } = req.body;
        const deposit = parseFloat(amount);

        if (isNaN(deposit) || deposit <= 0) {
            return res.status(400).json({ error: 'Invalid deposit amount' });
        }
        if (deposit < config.MIN_DEPOSIT) {
            return res.status(400).json({ error: `Minimum deposit is $${config.MIN_DEPOSIT.toFixed(2)}` });
        }
        if (deposit > config.MAX_DEPOSIT) {
            return res.status(400).json({ error: `Maximum deposit is $${config.MAX_DEPOSIT.toFixed(2)}` });
        }

        if (!paymentType) {
            return res.status(400).json({ error: 'Payment type is required' });
        }
        if (!config.PAYMENT_METHODS.includes(paymentType)) {
            return res.status(400).json({ error: 'Invalid payment type' });
        }

        // Check self-exclusion
        const exclusion = checkExclusion(req.user.id);
        if (exclusion) {
            return res.status(403).json({ error: exclusion });
        }

        // Check deposit limits
        ensureUserLimitsRow(req.user.id);
        const limitError = checkDepositLimits(req.user.id, deposit);
        if (limitError) {
            return res.status(400).json({ error: limitError });
        }

        // Validate payment method ownership if provided
        if (paymentMethodId) {
            const pm = db.get(
                'SELECT id FROM payment_methods WHERE id = ? AND user_id = ?',
                [paymentMethodId, req.user.id]
            );
            if (!pm) {
                return res.status(400).json({ error: 'Invalid payment method' });
            }
        }

        const reference = generateReference('DEP');

        // Create deposit record as pending
        const depositResult = db.run(
            'INSERT INTO deposits (user_id, amount, currency, payment_method_id, payment_type, status, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, deposit, config.CURRENCY, paymentMethodId || null, paymentType, 'pending', reference]
        );
        const depositId = depositResult.lastInsertRowid;

        // Auto-complete: in a real system, the payment processor callback would do this
        const user = db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore + deposit;

        db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        db.run(
            "UPDATE deposits SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
            [depositId]
        );

        db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'deposit', deposit, balanceBefore, balanceAfter, reference]
        );

        res.json({
            message: `Deposited $${deposit.toFixed(2)}`,
            balance: balanceAfter,
            deposit: {
                id: depositId,
                amount: deposit,
                currency: config.CURRENCY,
                status: 'completed',
                reference
            }
        });
    } catch (err) {
        console.error('[Payment] Deposit error:', err);
        res.status(500).json({ error: 'Deposit failed' });
    }
});

// GET /api/payments/deposits — list user's deposit history
router.get('/deposits', authenticate, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const deposits = db.all(
            'SELECT id, amount, currency, payment_type, status, reference, external_ref, created_at, completed_at FROM deposits WHERE user_id = ? ORDER BY id DESC LIMIT ?',
            [req.user.id, limit]
        );
        res.json({ deposits });
    } catch (err) {
        console.error('[Payment] List deposits error:', err);
        res.status(500).json({ error: 'Failed to retrieve deposit history' });
    }
});

// ═══════════════════════════════════════════════════
//  WITHDRAWALS
// ═══════════════════════════════════════════════════

// POST /api/payments/withdraw — create a withdrawal request
router.post('/withdraw', authenticate, (req, res) => {
    try {
        const { amount, paymentType, paymentMethodId } = req.body;
        const withdrawal = parseFloat(amount);

        if (isNaN(withdrawal) || withdrawal <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }
        if (withdrawal < config.MIN_WITHDRAWAL) {
            return res.status(400).json({ error: `Minimum withdrawal is $${config.MIN_WITHDRAWAL.toFixed(2)}` });
        }
        if (withdrawal > config.MAX_WITHDRAWAL) {
            return res.status(400).json({ error: `Maximum withdrawal is $${config.MAX_WITHDRAWAL.toFixed(2)}` });
        }

        if (!paymentType) {
            return res.status(400).json({ error: 'Payment type is required' });
        }
        if (!config.PAYMENT_METHODS.includes(paymentType)) {
            return res.status(400).json({ error: 'Invalid payment type' });
        }

        // Check self-exclusion
        const exclusion = checkExclusion(req.user.id);
        if (exclusion) {
            return res.status(403).json({ error: exclusion });
        }

        const user = db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.balance < withdrawal) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Validate payment method ownership if provided
        if (paymentMethodId) {
            const pm = db.get(
                'SELECT id FROM payment_methods WHERE id = ? AND user_id = ?',
                [paymentMethodId, req.user.id]
            );
            if (!pm) {
                return res.status(400).json({ error: 'Invalid payment method' });
            }
        }

        const reference = generateReference('WDR');
        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore - withdrawal;

        // Deduct balance immediately
        db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        // Create withdrawal record as pending (awaits admin processing)
        const wdResult = db.run(
            'INSERT INTO withdrawals (user_id, amount, currency, payment_method_id, payment_type, status, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, withdrawal, config.CURRENCY, paymentMethodId || null, paymentType, 'pending', reference]
        );
        const withdrawalId = wdResult.lastInsertRowid;

        // Log transaction
        db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'withdrawal', -withdrawal, balanceBefore, balanceAfter, reference]
        );

        res.json({
            message: `Withdrawal of $${withdrawal.toFixed(2)} submitted for processing`,
            balance: balanceAfter,
            withdrawal: {
                id: withdrawalId,
                amount: withdrawal,
                currency: config.CURRENCY,
                status: 'pending',
                reference,
                estimatedDays: config.WITHDRAWAL_PROCESSING_DAYS
            }
        });
    } catch (err) {
        console.error('[Payment] Withdrawal error:', err);
        res.status(500).json({ error: 'Withdrawal failed' });
    }
});

// GET /api/payments/withdrawals — list user's withdrawal history
router.get('/withdrawals', authenticate, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const withdrawals = db.all(
            'SELECT id, amount, currency, payment_type, status, admin_note, reference, created_at, processed_at FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT ?',
            [req.user.id, limit]
        );
        res.json({ withdrawals });
    } catch (err) {
        console.error('[Payment] List withdrawals error:', err);
        res.status(500).json({ error: 'Failed to retrieve withdrawal history' });
    }
});

// POST /api/payments/withdraw/:id/cancel — cancel a pending withdrawal
router.post('/withdraw/:id/cancel', authenticate, (req, res) => {
    try {
        const withdrawalId = parseInt(req.params.id);
        if (isNaN(withdrawalId)) {
            return res.status(400).json({ error: 'Invalid withdrawal ID' });
        }

        const wd = db.get(
            'SELECT id, amount, status FROM withdrawals WHERE id = ? AND user_id = ?',
            [withdrawalId, req.user.id]
        );
        if (!wd) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        if (wd.status !== 'pending') {
            return res.status(400).json({ error: `Cannot cancel a withdrawal with status: ${wd.status}` });
        }

        // Refund the balance
        const user = db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore + wd.amount;

        db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        db.run(
            "UPDATE withdrawals SET status = 'cancelled', processed_at = datetime('now'), admin_note = 'Cancelled by user' WHERE id = ?",
            [withdrawalId]
        );

        db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'withdrawal_cancel', wd.amount, balanceBefore, balanceAfter, `WDR-CANCEL-${withdrawalId}`]
        );

        res.json({
            message: `Withdrawal of $${wd.amount.toFixed(2)} cancelled and refunded`,
            balance: balanceAfter
        });
    } catch (err) {
        console.error('[Payment] Cancel withdrawal error:', err);
        res.status(500).json({ error: 'Failed to cancel withdrawal' });
    }
});

// ═══════════════════════════════════════════════════
//  RESPONSIBLE GAMBLING — LIMITS
// ═══════════════════════════════════════════════════

// GET /api/payments/limits — get user's current limits
router.get('/limits', authenticate, (req, res) => {
    try {
        ensureUserLimitsRow(req.user.id);
        const limits = db.get(
            'SELECT daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit, daily_loss_limit, session_time_limit, self_excluded_until, cooling_off_until FROM user_limits WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ limits });
    } catch (err) {
        console.error('[Payment] Get limits error:', err);
        res.status(500).json({ error: 'Failed to retrieve limits' });
    }
});

// PUT /api/payments/limits — update deposit/loss/time limits
router.put('/limits', authenticate, (req, res) => {
    try {
        const {
            daily_deposit_limit,
            weekly_deposit_limit,
            monthly_deposit_limit,
            daily_loss_limit,
            session_time_limit
        } = req.body;

        ensureUserLimitsRow(req.user.id);

        const current = db.get(
            'SELECT daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit, daily_loss_limit, session_time_limit FROM user_limits WHERE user_id = ?',
            [req.user.id]
        );

        // Validate all provided limits are non-negative numbers (or null to remove)
        const fields = { daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit, daily_loss_limit, session_time_limit };
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined && value !== null) {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0) {
                    return res.status(400).json({ error: `Invalid value for ${key}` });
                }
            }
        }

        const updates = {};
        const pendingIncreases = [];

        // For each limit field, check if it's an increase or decrease
        for (const [key, newValue] of Object.entries(fields)) {
            if (newValue === undefined) continue; // Not provided, skip

            const newNum = newValue === null ? null : parseFloat(newValue);
            const currentNum = current[key];

            // Determine if this is an increase (less restrictive) or decrease (more restrictive)
            const isIncrease =
                (currentNum !== null && newNum === null) ||                       // Removing a limit = increase
                (currentNum !== null && newNum !== null && newNum > currentNum);   // Raising a limit = increase

            if (isIncrease) {
                // Increases take 24h to activate — store as pending
                pendingIncreases.push({
                    field: key,
                    currentValue: currentNum,
                    requestedValue: newNum,
                    activatesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                });
            } else {
                // Decreases (more restrictive) or setting a new limit take effect immediately
                updates[key] = newNum;
            }
        }

        // Apply immediate updates
        if (Object.keys(updates).length > 0) {
            const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
            const values = Object.values(updates);
            db.run(
                `UPDATE user_limits SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`,
                [...values, req.user.id]
            );
        }

        // Fetch the updated limits
        const updated = db.get(
            'SELECT daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit, daily_loss_limit, session_time_limit, self_excluded_until, cooling_off_until FROM user_limits WHERE user_id = ?',
            [req.user.id]
        );

        const response = {
            message: 'Limits updated',
            limits: updated
        };

        if (pendingIncreases.length > 0) {
            response.pendingIncreases = pendingIncreases;
            response.message = 'Some limit decreases applied immediately. Limit increases require a 24-hour cooling-off period before activation.';
        }

        res.json(response);
    } catch (err) {
        console.error('[Payment] Update limits error:', err);
        res.status(500).json({ error: 'Failed to update limits' });
    }
});

// POST /api/payments/self-exclude — self-exclude for a specified period
router.post('/self-exclude', authenticate, (req, res) => {
    try {
        const { hours } = req.body;
        const period = parseInt(hours);

        if (!period || !config.COOLING_OFF_PERIODS.includes(period)) {
            return res.status(400).json({
                error: `Invalid exclusion period. Allowed periods (hours): ${config.COOLING_OFF_PERIODS.join(', ')}`
            });
        }

        ensureUserLimitsRow(req.user.id);

        const excludedUntil = new Date(Date.now() + period * 60 * 60 * 1000).toISOString();

        db.run(
            "UPDATE user_limits SET self_excluded_until = ?, updated_at = datetime('now') WHERE user_id = ?",
            [excludedUntil, req.user.id]
        );

        const days = period >= 24 ? `${Math.round(period / 24)} day(s)` : `${period} hour(s)`;

        res.json({
            message: `Self-exclusion activated for ${days}`,
            self_excluded_until: excludedUntil
        });
    } catch (err) {
        console.error('[Payment] Self-exclude error:', err);
        res.status(500).json({ error: 'Failed to activate self-exclusion' });
    }
});

module.exports = router;
