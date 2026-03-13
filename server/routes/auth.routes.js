const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const crypto = require('crypto');

const router = express.Router();

// Dummy hash for constant-time auth when user not found (prevents timing attacks)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-never-matches', 12);

/** Generate an 8-char uppercase alphanumeric referral code */
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Failed login tracking for account lockout
const failedLogins = new Map(); // userId -> { count, lockedUntil }
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, referralCode } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }

        // Check existing
        const existingUser = await db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }

        // Resolve referrer if a referral code was provided
        let referrerId = null;
        if (referralCode && typeof referralCode === 'string') {
            const referrer = await db.get(
                'SELECT id FROM users WHERE referral_code = ?',
                [referralCode.trim().toUpperCase()]
            );
            if (referrer) {
                referrerId = referrer.id;
            }
        }

        // Generate a unique referral code for the new user
        let newReferralCode = generateReferralCode();
        // Retry up to 5 times on collision (extremely unlikely with 4 random bytes)
        for (let i = 0; i < 5; i++) {
            const dup = await db.get('SELECT id FROM users WHERE referral_code = ?', [newReferralCode]);
            if (!dup) break;
            newReferralCode = generateReferralCode();
        }

        const passwordHash = bcrypt.hashSync(password, 12);
        const startBalance = config.DEFAULT_BALANCE;

        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, balance, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, passwordHash, startBalance, newReferralCode, referrerId]
        );

        const userId = result.lastInsertRowid;

        // Log initial balance transaction if > 0
        if (startBalance > 0) {
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'bonus', startBalance, 0, startBalance, 'Welcome bonus']
            );
        }

        // Auto-grant referral bonus to both referrer and new user ($1 each)
        if (referrerId) {
            const REFERRAL_BONUS = 1.00;
            const WAGERING_MULT = 15;
            try {
                // Create referral record
                await db.run(
                    'INSERT INTO referrals (referrer_id, referred_id, bonus_amount) VALUES (?, ?, ?)',
                    [referrerId, userId, REFERRAL_BONUS]
                );
                // Credit referrer
                await db.run(
                    'UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ?, referral_count = COALESCE(referral_count, 0) + 1, referral_bonus_earned = COALESCE(referral_bonus_earned, 0) + ? WHERE id = ?',
                    [REFERRAL_BONUS, REFERRAL_BONUS * WAGERING_MULT, REFERRAL_BONUS, referrerId]
                );
                await db.run(
                    "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
                    [referrerId, REFERRAL_BONUS, 'Referral bonus — new user joined with your code']
                );
                // Credit new user
                await db.run(
                    'UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ? WHERE id = ?',
                    [REFERRAL_BONUS, REFERRAL_BONUS * WAGERING_MULT, userId]
                );
                await db.run(
                    "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
                    [userId, REFERRAL_BONUS, 'Welcome bonus — joined via referral code']
                );
            } catch (refErr) {
                // Non-fatal: log but don't fail registration
                console.warn('[Auth] Referral bonus grant failed:', refErr.message);
            }
        }

        const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

        res.status(201).json({
            token,
            user: { id: userId, username, email, balance: startBalance, referralCode: newReferralCode, referralBonusGranted: !!referrerId },
        });
    } catch (err) {
        console.error('[Auth] Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);

        // Check account lockout BEFORE bcrypt (saves CPU and prevents timing leaks)
        if (user) {
            const lockRecord = failedLogins.get(user.id);
            if (lockRecord && lockRecord.lockedUntil > Date.now()) {
                const minutesLeft = Math.ceil((lockRecord.lockedUntil - Date.now()) / 60000);
                return res.status(429).json({ error: `Account temporarily locked. Try again in ${minutesLeft} minutes.` });
            }
        }

        // Always run bcrypt comparison (constant-time — prevents user enumeration via timing)
        const hashToCompare = user ? user.password_hash : DUMMY_HASH;
        const passwordValid = bcrypt.compareSync(password, hashToCompare);

        if (!user || !passwordValid) {
            // Track failed attempts for real users
            if (user) {
                const record = failedLogins.get(user.id) || { count: 0, lockedUntil: 0 };
                record.count += 1;
                if (record.count >= MAX_FAILED_ATTEMPTS) {
                    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
                    record.count = 0;
                }
                failedLogins.set(user.id, record);
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.is_banned) {
            return res.status(403).json({ error: 'Account has been banned' });
        }

        // Successful login — clear failed attempts
        failedLogins.delete(user.id);

        const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                is_admin: !!user.is_admin,
            },
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            balance: req.user.balance,
            is_admin: !!req.user.is_admin,
            referralCode: req.user.referral_code || null,
        },
    });
});

module.exports = router;
