const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Dummy hash for constant-time auth when user not found (prevents timing attacks)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-never-matches', 12);

// Failed login tracking for account lockout
const failedLogins = new Map(); // userId -> { count, lockedUntil }
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/register
router.post('/register', (req, res) => {
    try {
        const { username, email, password } = req.body;

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
        const existingUser = db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }

        const passwordHash = bcrypt.hashSync(password, 12);
        const startBalance = config.DEFAULT_BALANCE;

        const result = db.run(
            'INSERT INTO users (username, email, password_hash, balance) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, startBalance]
        );

        const userId = result.lastInsertRowid;

        // Log initial balance transaction if > 0
        if (startBalance > 0) {
            db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'bonus', startBalance, 0, startBalance, 'Welcome bonus']
            );
        }

        const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

        res.status(201).json({
            token,
            user: { id: userId, username, email, balance: startBalance },
        });
    } catch (err) {
        console.error('[Auth] Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);

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

        // Check account lockout
        const lockRecord = failedLogins.get(user.id);
        if (lockRecord && lockRecord.lockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((lockRecord.lockedUntil - Date.now()) / 60000);
            return res.status(429).json({ error: `Account temporarily locked. Try again in ${minutesLeft} minutes.` });
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
        },
    });
});

module.exports = router;
