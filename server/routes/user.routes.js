const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── Validation Helpers ───

const VALID_CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP'];
const DATE_OF_BIRTH_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

// ═══════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════

// GET /api/user/profile — get full user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await db.get(
            `SELECT id, username, email, balance, display_name, avatar_url, phone,
                    date_of_birth, country, currency, email_verified, phone_verified,
                    kyc_status, is_admin, created_at, updated_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (err) {
        console.error('[User] Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/user/profile — update profile fields
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { display_name, phone, date_of_birth, country, currency } = req.body;

        // Validate date_of_birth format (YYYY-MM-DD)
        if (date_of_birth !== undefined && date_of_birth !== null) {
            if (typeof date_of_birth !== 'string' || !DATE_OF_BIRTH_REGEX.test(date_of_birth)) {
                return res.status(400).json({ error: 'date_of_birth must be in YYYY-MM-DD format' });
            }
            // Basic date validity check
            const parsed = new Date(date_of_birth);
            if (isNaN(parsed.getTime())) {
                return res.status(400).json({ error: 'Invalid date_of_birth value' });
            }
        }

        // Validate country is 2-letter code
        if (country !== undefined && country !== null) {
            if (typeof country !== 'string' || !COUNTRY_CODE_REGEX.test(country)) {
                return res.status(400).json({ error: 'country must be a 2-letter ISO code (e.g. AU, US)' });
            }
        }

        // Validate currency
        if (currency !== undefined && currency !== null) {
            if (!VALID_CURRENCIES.includes(currency)) {
                return res.status(400).json({ error: `currency must be one of: ${VALID_CURRENCIES.join(', ')}` });
            }
        }

        // Validate display_name length
        if (display_name !== undefined && display_name !== null) {
            if (typeof display_name !== 'string' || display_name.length > 50) {
                return res.status(400).json({ error: 'display_name must be 50 characters or fewer' });
            }
        }

        // Build dynamic update
        const fields = [];
        const values = [];

        if (display_name !== undefined) { fields.push('display_name = ?'); values.push(display_name); }
        if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
        if (date_of_birth !== undefined) { fields.push('date_of_birth = ?'); values.push(date_of_birth); }
        if (country !== undefined) { fields.push('country = ?'); values.push(country); }
        if (currency !== undefined) { fields.push('currency = ?'); values.push(currency); }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        fields.push("updated_at = datetime('now')");
        values.push(req.user.id);

        await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        // Return updated profile
        const updated = await db.get(
            `SELECT id, username, email, balance, display_name, avatar_url, phone,
                    date_of_birth, country, currency, email_verified, phone_verified,
                    kyc_status, is_admin, created_at, updated_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        res.json({ user: updated, message: 'Profile updated' });
    } catch (err) {
        console.error('[User] Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/user/profile/avatar — update avatar URL
router.put('/profile/avatar', authenticate, async (req, res) => {
    try {
        const { avatar_url } = req.body;

        if (avatar_url === undefined || avatar_url === null) {
            return res.status(400).json({ error: 'avatar_url is required' });
        }
        if (typeof avatar_url !== 'string' || avatar_url.length > 500) {
            return res.status(400).json({ error: 'avatar_url must be a string of 500 characters or fewer' });
        }

        await db.run(
            "UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
            [avatar_url, req.user.id]
        );

        res.json({ avatar_url, message: 'Avatar updated' });
    } catch (err) {
        console.error('[User] Avatar update error:', err);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});

// ═══════════════════════════════════════════════════════════
//  PASSWORD MANAGEMENT
// ═══════════════════════════════════════════════════════════

// PUT /api/user/change-password — change password (authenticated)
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'current_password and new_password are required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Fetch current hash
        const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        if (!bcrypt.compareSync(current_password, user.password_hash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash and store new password
        const newHash = bcrypt.hashSync(new_password, 12);
        await db.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            [newHash, req.user.id]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('[User] Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// POST /api/user/forgot-password — generate password reset token
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (!user) {
            // Return success even if user not found (prevents email enumeration)
            return res.json({ message: 'If that email is registered, a reset token has been generated' });
        }

        // Check active token limit
        const activeTokens = await db.get(
            `SELECT COUNT(*) as count FROM password_reset_tokens
             WHERE user_id = ? AND used = 0 AND expires_at > datetime('now')`,
            [user.id]
        );
        if (activeTokens && activeTokens.count >= config.PASSWORD_RESET_MAX_ACTIVE) {
            return res.status(429).json({ error: 'Too many active reset tokens. Please wait or use an existing one.' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expiryHours = config.PASSWORD_RESET_EXPIRY_HOURS;
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

        await db.run(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, token, expiresAt]
        );

        // In production this token would be emailed — for dev we return it directly
        const response = { message: 'If that email is registered, a reset token has been generated' };
        if (process.env.NODE_ENV !== 'production') {
            response.token = token;
        }
        res.json(response);
    } catch (err) {
        console.error('[User] Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// POST /api/user/reset-password — reset password using token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;

        if (!token || !new_password) {
            return res.status(400).json({ error: 'token and new_password are required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Find valid, unexpired, unused token
        const resetRecord = await db.get(
            `SELECT id, user_id FROM password_reset_tokens
             WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
            [token]
        );
        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash and update password
        const newHash = bcrypt.hashSync(new_password, 12);
        await db.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            [newHash, resetRecord.user_id]
        );

        // Mark token as used
        await db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetRecord.id]);

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('[User] Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ═══════════════════════════════════════════════════════════
//  VERIFICATION / KYC
// ═══════════════════════════════════════════════════════════

// GET /api/user/verification — get KYC status
router.get('/verification', authenticate, async (req, res) => {
    try {
        const verification = await db.get(
            'SELECT user_id, status, document_type, submitted_at, verified_at, notes FROM user_verification WHERE user_id = ?',
            [req.user.id]
        );

        const user = await db.get('SELECT kyc_status FROM users WHERE id = ?', [req.user.id]);

        res.json({
            kyc_status: user ? user.kyc_status : 'unverified',
            verification: verification || null,
        });
    } catch (err) {
        console.error('[User] Verification fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch verification status' });
    }
});

// POST /api/user/verification — submit verification
router.post('/verification', authenticate, async (req, res) => {
    try {
        const { document_type } = req.body;

        if (!document_type) {
            return res.status(400).json({ error: 'document_type is required' });
        }

        const validTypes = ['passport', 'drivers_license', 'national_id', 'utility_bill'];
        if (!validTypes.includes(document_type)) {
            return res.status(400).json({ error: `document_type must be one of: ${validTypes.join(', ')}` });
        }

        // Check if a verification record already exists
        const existing = await db.get('SELECT user_id, status FROM user_verification WHERE user_id = ?', [req.user.id]);

        if (existing) {
            // Update existing record
            await db.run(
                "UPDATE user_verification SET status = 'pending', document_type = ?, submitted_at = datetime('now'), verified_at = NULL, notes = NULL WHERE user_id = ?",
                [document_type, req.user.id]
            );
        } else {
            // Create new record
            await db.run(
                "INSERT INTO user_verification (user_id, status, document_type, submitted_at) VALUES (?, 'pending', ?, datetime('now'))",
                [req.user.id, document_type]
            );
        }

        // Update user's kyc_status
        await db.run(
            "UPDATE users SET kyc_status = 'pending', updated_at = datetime('now') WHERE id = ?",
            [req.user.id]
        );

        res.json({ message: 'Verification submitted', kyc_status: 'pending' });
    } catch (err) {
        console.error('[User] Verification submit error:', err);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
});

// ═══════════════════════════════════════════════════════════
//  TRANSACTION HISTORY
// ═══════════════════════════════════════════════════════════

// GET /api/user/transactions — paginated transaction history
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
        const offset = (page - 1) * limit;
        const type = req.query.type || null;

        // Build query with optional type filter
        let countSql = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?';
        let dataSql = `SELECT id, type, amount, balance_before, balance_after, reference, created_at
                       FROM transactions WHERE user_id = ?`;
        const params = [req.user.id];

        if (type) {
            countSql += ' AND type = ?';
            dataSql += ' AND type = ?';
            params.push(type);
        }

        dataSql += ' ORDER BY id DESC LIMIT ? OFFSET ?';

        // Get total count
        const countResult = await db.get(countSql, params);
        const total = countResult ? countResult.total : 0;

        // Get paginated data
        const dataParams = [...params, limit, offset];
        const transactions = await db.all(dataSql, dataParams);

        res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[User] Transactions fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ═══════════════════════════════════════════════════════════
//  ACCOUNT
// ═══════════════════════════════════════════════════════════

// POST /api/user/close-account — soft-close account
router.post('/close-account', authenticate, async (req, res) => {
    try {
        await db.run(
            "UPDATE users SET is_banned = 1, updated_at = datetime('now') WHERE id = ?",
            [req.user.id]
        );

        res.json({ message: 'Account has been closed' });
    } catch (err) {
        console.error('[User] Close account error:', err);
        res.status(500).json({ error: 'Failed to close account' });
    }
});

module.exports = router;
