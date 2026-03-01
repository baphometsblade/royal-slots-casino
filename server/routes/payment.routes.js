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

async function ensureUserLimitsRow(userId) {
    const existing = await db.get('SELECT user_id FROM user_limits WHERE user_id = ?', [userId]);
    if (!existing) {
        await db.run('INSERT INTO user_limits (user_id) VALUES (?)', [userId]);
    }
}

// ─── Check self-exclusion / cooling-off status ───
async function checkExclusion(userId) {
    const limits = await db.get(
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
async function checkDepositLimits(userId, amount) {
    const limits = await db.get(
        'SELECT daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit FROM user_limits WHERE user_id = ?',
        [userId]
    );
    if (!limits) return null;

    const now = new Date();

    if (limits.daily_deposit_limit !== null) {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const daily = await db.get(
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
        const weekly = await db.get(
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
        const monthly = await db.get(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed' AND created_at >= ?",
            [userId, monthStart.toISOString()]
        );
        if (monthly.total + amount > limits.monthly_deposit_limit) {
            return `Monthly deposit limit of $${limits.monthly_deposit_limit.toFixed(2)} would be exceeded. Already deposited $${monthly.total.toFixed(2)} this month.`;
        }
    }

    return null;
}

// ─── Deposit velocity fraud detection ───
// Blocks rapid-fire deposits that indicate automated abuse or stolen cards
async function checkDepositVelocity(userId) {
    // Max 3 deposits per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const hourly = await db.get(
        "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND created_at >= ?",
        [userId, hourAgo]
    );
    if (hourly && hourly.count >= 3) {
        return 'Too many deposit attempts. Please wait before trying again.';
    }

    // Max 5 deposits per 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const daily = await db.get(
        "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND created_at >= ?",
        [userId, dayAgo]
    );
    if (daily && daily.count >= 5) {
        return 'Daily deposit attempt limit reached. Please try again tomorrow.';
    }

    // Max 3 pending deposits at once (prevents queue flooding)
    const pending = await db.get(
        "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = 'pending'",
        [userId]
    );
    if (pending && pending.count >= 3) {
        return 'You have too many pending deposits. Please wait for them to process.';
    }

    return null;
}

// ═══════════════════════════════════════════════════
//  PAYMENT METHODS
// ═══════════════════════════════════════════════════

// GET /api/payments/methods — list user's saved payment methods
router.get('/methods', authenticate, async (req, res) => {
    try {
        const methods = await db.all(
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
router.post('/methods', authenticate, async (req, res) => {
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
        const existingCount = await db.get(
            'SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?',
            [req.user.id]
        );
        const isDefault = existingCount.count === 0 ? 1 : 0;

        const result = await db.run(
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
router.delete('/methods/:id', authenticate, async (req, res) => {
    try {
        const methodId = parseInt(req.params.id);
        if (isNaN(methodId)) {
            return res.status(400).json({ error: 'Invalid method ID' });
        }

        const method = await db.get(
            'SELECT id, is_default FROM payment_methods WHERE id = ? AND user_id = ?',
            [methodId, req.user.id]
        );
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }

        await db.run('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [methodId, req.user.id]);

        // If we deleted the default, promote the next one
        if (method.is_default) {
            const next = await db.get(
                'SELECT id FROM payment_methods WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
                [req.user.id]
            );
            if (next) {
                await db.run('UPDATE payment_methods SET is_default = 1 WHERE id = ?', [next.id]);
            }
        }

        res.json({ message: 'Payment method removed' });
    } catch (err) {
        console.error('[Payment] Delete method error:', err);
        res.status(500).json({ error: 'Failed to remove payment method' });
    }
});

// PUT /api/payments/methods/:id/default — set as default payment method
router.put('/methods/:id/default', authenticate, async (req, res) => {
    try {
        const methodId = parseInt(req.params.id);
        if (isNaN(methodId)) {
            return res.status(400).json({ error: 'Invalid method ID' });
        }

        const method = await db.get(
            'SELECT id FROM payment_methods WHERE id = ? AND user_id = ?',
            [methodId, req.user.id]
        );
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }

        // Clear all defaults for this user, then set the new one
        await db.run('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?', [req.user.id]);
        await db.run('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?', [methodId, req.user.id]);

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
router.post('/deposit', authenticate, async (req, res) => {
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
        const exclusion = await checkExclusion(req.user.id);
        if (exclusion) {
            return res.status(403).json({ error: exclusion });
        }

        // Check deposit limits
        await ensureUserLimitsRow(req.user.id);
        const limitError = await checkDepositLimits(req.user.id, deposit);
        if (limitError) {
            return res.status(400).json({ error: limitError });
        }

        // Deposit velocity fraud check
        const velocityError = await checkDepositVelocity(req.user.id);
        if (velocityError) {
            return res.status(429).json({ error: velocityError });
        }

        // Validate payment method ownership if provided
        if (paymentMethodId) {
            const pm = await db.get(
                'SELECT id FROM payment_methods WHERE id = ? AND user_id = ?',
                [paymentMethodId, req.user.id]
            );
            if (!pm) {
                return res.status(400).json({ error: 'Invalid payment method' });
            }
        }

        const reference = generateReference('DEP');

        // Create deposit record as PENDING — balance is NOT credited yet.
        // In production, a payment processor webhook (Stripe, PayPal, etc.) calls
        // a separate callback endpoint to confirm payment, which then credits balance.
        // This prevents users from getting free money by calling this endpoint directly.
        const depositResult = await db.run(
            'INSERT INTO deposits (user_id, amount, currency, payment_method_id, payment_type, status, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, deposit, config.CURRENCY, paymentMethodId || null, paymentType, 'pending', reference]
        );
        const depositId = depositResult.lastInsertRowid;

        res.json({
            message: `Deposit of $${deposit.toFixed(2)} submitted — awaiting payment confirmation`,
            deposit: {
                id: depositId,
                amount: deposit,
                currency: config.CURRENCY,
                status: 'pending',
                reference
            }
        });
    } catch (err) {
        console.error('[Payment] Deposit error:', err);
        res.status(500).json({ error: 'Deposit failed' });
    }
});

// GET /api/payments/deposits — list user's deposit history
router.get('/deposits', authenticate, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const deposits = await db.all(
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
router.post('/withdraw', authenticate, async (req, res) => {
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
        const exclusion = await checkExclusion(req.user.id);
        if (exclusion) {
            return res.status(403).json({ error: exclusion });
        }

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.balance < withdrawal) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Wagering requirement: must wager at least 1x total deposits before withdrawing
        const totalDeposited = await db.get(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed'",
            [req.user.id]
        );
        const totalWagered = await db.get(
            'SELECT COALESCE(SUM(bet_amount), 0) as total FROM spins WHERE user_id = ?',
            [req.user.id]
        );
        const deposited = totalDeposited ? totalDeposited.total : 0;
        const wagered = totalWagered ? totalWagered.total : 0;
        if (deposited > 0 && wagered < deposited) {
            const remaining = (deposited - wagered).toFixed(2);
            return res.status(400).json({
                error: `Wagering requirement not met. You must wager $${remaining} more before withdrawing. (Wagered: $${wagered.toFixed(2)} / Required: $${deposited.toFixed(2)})`,
                wagerRequired: deposited,
                wagerCompleted: wagered,
                wagerRemaining: deposited - wagered
            });
        }

        // Validate payment method ownership if provided
        if (paymentMethodId) {
            const pm = await db.get(
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
        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        // Create withdrawal record as pending (awaits admin processing)
        const wdResult = await db.run(
            'INSERT INTO withdrawals (user_id, amount, currency, payment_method_id, payment_type, status, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, withdrawal, config.CURRENCY, paymentMethodId || null, paymentType, 'pending', reference]
        );
        const withdrawalId = wdResult.lastInsertRowid;

        // Log transaction
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'withdrawal', -withdrawal, balanceBefore, balanceAfter, reference]
        );

        // Calculate when cooling-off ends (24h from now)
        var coolingOffEnds = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        res.json({
            message: `Withdrawal of $${withdrawal.toFixed(2)} submitted. 24-hour review period before processing.`,
            balance: balanceAfter,
            withdrawal: {
                id: withdrawalId,
                amount: withdrawal,
                currency: config.CURRENCY,
                status: 'pending',
                reference,
                coolingOffEnds: coolingOffEnds,
                estimatedDays: config.WITHDRAWAL_PROCESSING_DAYS + 1
            }
        });
    } catch (err) {
        console.error('[Payment] Withdrawal error:', err);
        res.status(500).json({ error: 'Withdrawal failed' });
    }
});

// GET /api/payments/withdrawals — list user's withdrawal history
router.get('/withdrawals', authenticate, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const withdrawals = await db.all(
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
router.post('/withdraw/:id/cancel', authenticate, async (req, res) => {
    try {
        const withdrawalId = parseInt(req.params.id);
        if (isNaN(withdrawalId)) {
            return res.status(400).json({ error: 'Invalid withdrawal ID' });
        }

        const wd = await db.get(
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
        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore + wd.amount;

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);

        await db.run(
            "UPDATE withdrawals SET status = 'cancelled', processed_at = datetime('now'), admin_note = 'Cancelled by user' WHERE id = ?",
            [withdrawalId]
        );

        await db.run(
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
router.get('/limits', authenticate, async (req, res) => {
    try {
        await ensureUserLimitsRow(req.user.id);
        const limits = await db.get(
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
router.put('/limits', authenticate, async (req, res) => {
    try {
        const {
            daily_deposit_limit,
            weekly_deposit_limit,
            monthly_deposit_limit,
            daily_loss_limit,
            session_time_limit
        } = req.body;

        await ensureUserLimitsRow(req.user.id);

        const current = await db.get(
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
            await db.run(
                `UPDATE user_limits SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`,
                [...values, req.user.id]
            );
        }

        // Fetch the updated limits
        const updated = await db.get(
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
router.post('/self-exclude', authenticate, async (req, res) => {
    try {
        const { hours } = req.body;
        const period = parseInt(hours);

        if (!period || !config.COOLING_OFF_PERIODS.includes(period)) {
            return res.status(400).json({
                error: `Invalid exclusion period. Allowed periods (hours): ${config.COOLING_OFF_PERIODS.join(', ')}`
            });
        }

        await ensureUserLimitsRow(req.user.id);

        const excludedUntil = new Date(Date.now() + period * 60 * 60 * 1000).toISOString();

        await db.run(
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

// ═══════════════════════════════════════════════════
//  ADMIN: APPROVE PENDING DEPOSIT
// ═══════════════════════════════════════════════════

// POST /api/payments/admin/approve-deposit — admin-only: approve a pending deposit and credit balance
router.post('/admin/approve-deposit', authenticate, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { depositId } = req.body;
        if (!depositId) {
            return res.status(400).json({ error: 'depositId is required' });
        }

        const deposit = await db.get(
            'SELECT id, user_id, amount, status, reference FROM deposits WHERE id = ?',
            [depositId]
        );
        if (!deposit) {
            return res.status(404).json({ error: 'Deposit not found' });
        }
        if (deposit.status !== 'pending') {
            return res.status(400).json({ error: `Deposit already ${deposit.status}` });
        }

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [deposit.user_id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance;
        let balanceAfter = balanceBefore + deposit.amount;

        // First-deposit bonus: 100% match up to $500
        let bonusAmount = 0;
        const priorDeposits = await db.get(
            "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = 'completed'",
            [deposit.user_id]
        );
        if (priorDeposits && priorDeposits.count === 0) {
            bonusAmount = Math.min(deposit.amount * (config.FIRST_DEPOSIT_BONUS_PCT / 100), config.FIRST_DEPOSIT_BONUS_MAX);
            balanceAfter += bonusAmount;
        }

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, deposit.user_id]);

        await db.run(
            "UPDATE deposits SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
            [deposit.id]
        );

        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [deposit.user_id, 'deposit', deposit.amount, balanceBefore, balanceAfter, deposit.reference]
        );

        if (bonusAmount > 0) {
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [deposit.user_id, 'first_deposit_bonus', bonusAmount, balanceAfter - bonusAmount, balanceAfter, 'FIRST-DEPOSIT-100PCT-MATCH']
            );
        }

        const bonusMsg = bonusAmount > 0 ? ` + $${bonusAmount.toFixed(2)} first-deposit bonus!` : '';
        res.json({
            message: `Deposit #${deposit.id} approved — $${deposit.amount.toFixed(2)} credited${bonusMsg}`,
            userId: deposit.user_id,
            balance: balanceAfter,
            bonus: bonusAmount
        });
    } catch (err) {
        console.error('[Payment] Approve deposit error:', err);
        res.status(500).json({ error: 'Failed to approve deposit' });
    }
});

// ═══════════════════════════════════════════════════
//  WEBHOOK: PAYMENT CONFIRMATION
// ═══════════════════════════════════════════════════

// POST /api/payments/webhook/confirm — Payment processor callback
// Validates the deposit reference and secret, then credits the player.
// Call this from Stripe/PayPal webhook handlers or manually via curl.
router.post('/webhook/confirm', async (req, res) => {
    try {
        const { reference, webhookSecret } = req.body;

        // Validate webhook secret (must match WEBHOOK_SECRET env var)
        const expectedSecret = process.env.WEBHOOK_SECRET || config.JWT_SECRET;
        if (!webhookSecret || webhookSecret !== expectedSecret) {
            return res.status(403).json({ error: 'Invalid webhook secret' });
        }

        if (!reference) {
            return res.status(400).json({ error: 'reference is required' });
        }

        const deposit = await db.get(
            'SELECT id, user_id, amount, status, reference FROM deposits WHERE reference = ?',
            [reference]
        );
        if (!deposit) {
            return res.status(404).json({ error: 'Deposit not found' });
        }
        if (deposit.status !== 'pending') {
            return res.status(200).json({ message: `Deposit already ${deposit.status}`, depositId: deposit.id });
        }

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [deposit.user_id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance;
        let balanceAfter = balanceBefore + deposit.amount;

        // First-deposit bonus
        let bonusAmount = 0;
        const priorDeposits = await db.get(
            "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = 'completed'",
            [deposit.user_id]
        );
        if (priorDeposits && priorDeposits.count === 0) {
            bonusAmount = Math.min(deposit.amount * (config.FIRST_DEPOSIT_BONUS_PCT / 100), config.FIRST_DEPOSIT_BONUS_MAX);
            balanceAfter += bonusAmount;
        }

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, deposit.user_id]);
        await db.run("UPDATE deposits SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [deposit.id]);
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [deposit.user_id, 'deposit', deposit.amount, balanceBefore, balanceAfter, deposit.reference]
        );

        if (bonusAmount > 0) {
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [deposit.user_id, 'first_deposit_bonus', bonusAmount, balanceAfter - bonusAmount, balanceAfter, 'FIRST-DEPOSIT-100PCT-MATCH']
            );
        }

        console.log(`[Webhook] Deposit ${deposit.id} confirmed — $${deposit.amount} + $${bonusAmount} bonus credited to user ${deposit.user_id}`);
        res.json({ message: 'Deposit confirmed', depositId: deposit.id, amount: deposit.amount, bonus: bonusAmount });
    } catch (err) {
        console.error('[Webhook] Payment confirm error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
