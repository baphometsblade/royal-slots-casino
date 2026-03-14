const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const crypto = require('crypto');

const router = express.Router();
const emailService = require('../services/email.service');

var isPg = !!process.env.DATABASE_URL;
var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
var tsDef = isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : "TEXT DEFAULT (datetime('now'))";

// Dummy hash for constant-time auth when user not found (prevents timing attacks)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-never-matches', 12);

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {string[]} Array of issues, empty if valid
 */
function validatePassword(password) {
    const issues = [];
    if (password.length < 8) issues.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) issues.push('an uppercase letter');
    if (!/[a-z]/.test(password)) issues.push('a lowercase letter');
    if (!/[0-9]/.test(password)) issues.push('a number');
    return issues;
}

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
        const passwordIssues = validatePassword(password);
        if (passwordIssues.length > 0) {
            return res.status(400).json({ error: `Password must contain ${passwordIssues.join(', ')}` });
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
            'INSERT INTO users (username, email, password_hash, balance, referral_code, referred_by, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, passwordHash, startBalance, newReferralCode, referrerId, 0]
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

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const VERIFICATION_EXPIRY_HOURS = 24;
        const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

        // Store verification token
        await db.run(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, verificationToken, verificationExpiresAt]
        );

        // Send verification email (non-blocking)
        try {
            await emailService.sendVerificationEmail(email, username, verificationToken);
        } catch (emailErr) {
            console.warn('[Auth] Verification email failed:', emailErr.message);
            // In dev mode, log the token
            if (config.NODE_ENV !== 'production') {
                console.log('[Auth] DEV verification token:', verificationToken);
            }
        }

        const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

        res.status(201).json({
            token,
            user: { id: userId, username, email, balance: startBalance, referralCode: newReferralCode, referralBonusGranted: !!referrerId },
        });
    } catch (err) {
        console.warn('[Auth] Register error:', err);
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
        console.warn('[Auth] Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Bootstrap: create password_reset_tokens table
db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id ${idDef},
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at ${tsDef}
)`).catch(() => {});

// Bootstrap: create email_verification_tokens table
db.run(`CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id ${idDef},
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0
)`).catch(() => {});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Always return success to prevent email enumeration
        const successMsg = 'If an account with that email exists, a reset link has been sent.';

        const user = await db.get('SELECT id, email FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (!user) {
            return res.json({ message: successMsg });
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const EXPIRY_HOURS = 1;
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

        // Invalidate any existing tokens for this user
        await db.run('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

        // Store the token
        await db.run(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, expiresAt]
        );

        // Build reset URL
        const baseUrl = config.BASE_URL || 'https://msaart.online';
        const resetUrl = `${baseUrl}/?resetToken=${resetToken}`;

        // Send email (non-blocking — don't fail the request if email doesn't send)
        try {
            const emailService = require('../services/email.service');
            await emailService.sendPasswordReset(user.email, resetUrl, EXPIRY_HOURS);
        } catch (emailErr) {
            console.warn('[Auth] Password reset email failed:', emailErr.message);
            // In dev mode, log the token so it can be used for testing
            if (config.NODE_ENV !== 'production') {
                console.log('[Auth] DEV reset token:', resetToken);
            }
        }

        res.json({ message: successMsg });
    } catch (err) {
        console.warn('[Auth] Forgot password error:', err);
        res.status(500).json({ error: 'Request failed' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        const passwordIssues = validatePassword(newPassword);
        if (passwordIssues.length > 0) {
            return res.status(400).json({ error: `Password must contain ${passwordIssues.join(', ')}` });
        }

        // Find the token
        const resetRecord = await db.get(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
            [token]
        );

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        }

        // Check expiry
        if (new Date(resetRecord.expires_at) < new Date()) {
            await db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetRecord.id]);
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }

        // Hash new password and update user
        const passwordHash = bcrypt.hashSync(newPassword, 12);
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetRecord.user_id]);

        // Mark token as used
        await db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetRecord.id]);

        // Clear any lockouts
        failedLogins.delete(resetRecord.user_id);

        res.json({ message: 'Password reset successful! You can now sign in.' });
    } catch (err) {
        console.warn('[Auth] Reset password error:', err);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        const passwordIssues = validatePassword(newPassword);
        if (passwordIssues.length > 0) {
            return res.status(400).json({ error: `Password must contain ${passwordIssues.join(', ')}` });
        }

        // Fetch current user from database
        const user = await db.get('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const passwordValid = bcrypt.compareSync(currentPassword, user.password_hash);

        if (!passwordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = bcrypt.hashSync(newPassword, 12);

        // Update user password
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.warn('[Auth] Change password error:', err.message);
        res.status(500).json({ error: 'Password change failed' });
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

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        // Find the token
        const verifyRecord = await db.get(
            'SELECT * FROM email_verification_tokens WHERE token = ? AND used = 0',
            [token]
        );

        if (!verifyRecord) {
            return res.status(400).json({ error: 'Invalid or expired verification link' });
        }

        // Check expiry
        if (new Date(verifyRecord.expires_at) < new Date()) {
            await db.run('UPDATE email_verification_tokens SET used = 1 WHERE id = ?', [verifyRecord.id]);
            return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
        }

        // Mark email as verified
        await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [verifyRecord.user_id]);

        // Mark token as used
        await db.run('UPDATE email_verification_tokens SET used = 1 WHERE id = ?', [verifyRecord.id]);

        res.json({ message: 'Email verified successfully!' });
    } catch (err) {
        console.warn('[Auth] Verify email error:', err);
        res.status(500).json({ error: 'Email verification failed' });
    }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const successMsg = 'If an account with that email exists and is not verified, a new verification link has been sent.';

        const user = await db.get('SELECT id, username, email, email_verified FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (!user) {
            return res.json({ message: successMsg });
        }

        // If already verified, return success without doing anything
        if (user.email_verified) {
            return res.json({ message: 'Email is already verified.' });
        }

        // Invalidate any existing tokens for this user
        await db.run('UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const VERIFICATION_EXPIRY_HOURS = 24;
        const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

        // Store verification token
        await db.run(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, verificationToken, verificationExpiresAt]
        );

        // Send verification email (non-blocking)
        try {
            await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
        } catch (emailErr) {
            console.warn('[Auth] Resend verification email failed:', emailErr.message);
            if (config.NODE_ENV !== 'production') {
                console.log('[Auth] DEV verification token:', verificationToken);
            }
        }

        res.json({ message: successMsg });
    } catch (err) {
        console.warn('[Auth] Resend verification error:', err);
        res.status(500).json({ error: 'Request failed' });
    }
});

module.exports = router;
