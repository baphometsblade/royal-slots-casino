'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

var isPg = !!process.env.DATABASE_URL;
var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
var tsDef = isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : "TEXT DEFAULT (datetime('now'))";

// ─── Bootstrap self_exclusions table ───
db.run(`
    CREATE TABLE IF NOT EXISTS self_exclusions (
        id ${idDef},
        user_id INTEGER NOT NULL,
        exclusion_type TEXT NOT NULL,
        reason TEXT,
        starts_at ${tsDef},
        ends_at TEXT,
        is_active INTEGER DEFAULT 1,
        created_at ${tsDef}
    )
`).catch(function() {});

// Also add is_banned column to users if not present (for permanent exclusions)
db.run("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0").catch(function() {});

/**
 * Helper: Calculate end timestamp based on exclusion type
 * @param {string} type - 'cooldown_24h', 'cooldown_7d', 'cooldown_30d', 'permanent'
 * @returns {string|null} - ISO timestamp or null for permanent
 */
function calculateEndsAt(type) {
    const now = new Date();
    if (type === 'cooldown_24h') {
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (type === 'cooldown_7d') {
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (type === 'cooldown_30d') {
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    // permanent: return null
    return null;
}

/**
 * Helper: Check if user is currently excluded
 * @param {number} userId
 * @returns {Promise<{excluded: boolean, endsAt: string|null, type: string|null}>}
 */
async function checkExclusion(userId) {
    try {
        // Check if user is banned
        const user = await db.get('SELECT is_banned FROM users WHERE id = ?', [userId]);
        if (user && user.is_banned === 1) {
            return { excluded: true, endsAt: null, type: 'permanent' };
        }

        // Check active exclusions
        const exclusion = await db.get(
            `SELECT id, exclusion_type, ends_at FROM self_exclusions
             WHERE user_id = ? AND is_active = 1
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (!exclusion) {
            return { excluded: false, endsAt: null, type: null };
        }

        // Check if cooldown has expired
        if (exclusion.ends_at) {
            const endTime = new Date(exclusion.ends_at);
            if (endTime < new Date()) {
                // Cooldown expired — mark as inactive
                await db.run(
                    'UPDATE self_exclusions SET is_active = 0 WHERE id = ?',
                    [exclusion.id]
                ).catch(function() {});
                return { excluded: false, endsAt: null, type: null };
            }
        }

        // Still excluded
        return { excluded: true, endsAt: exclusion.ends_at, type: exclusion.exclusion_type };
    } catch (err) {
        console.warn('[SelfExclusion] Check exclusion error:', err.message);
        return { excluded: false, endsAt: null, type: null };
    }
}

// ═══════════════════════════════════════════════════════════
// GET /api/self-exclusion/status
// ═══════════════════════════════════════════════════════════
router.get('/status', authenticate, async (req, res) => {
    try {
        const result = await checkExclusion(req.user.id);
        res.json(result);
    } catch (err) {
        console.warn('[SelfExclusion] Status check error:', err.message);
        res.status(500).json({ error: 'Failed to check exclusion status' });
    }
});

// ═══════════════════════════════════════════════════════════
// POST /api/self-exclusion/activate
// ═══════════════════════════════════════════════════════════
router.post('/activate', authenticate, async (req, res) => {
    try {
        const { type, reason } = req.body;

        // Validate type
        const validTypes = ['cooldown_24h', 'cooldown_7d', 'cooldown_30d', 'permanent'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid exclusion type' });
        }

        // Check if user is already excluded
        const current = await checkExclusion(req.user.id);
        if (current.excluded) {
            return res.status(400).json({
                error: 'User already has an active self-exclusion',
                currentExclusion: current
            });
        }

        const endsAt = calculateEndsAt(type);

        // Insert exclusion record
        const result = await db.run(
            `INSERT INTO self_exclusions (user_id, exclusion_type, reason, ends_at, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [req.user.id, type, reason || null, endsAt]
        );

        // If permanent, also set is_banned flag on user
        if (type === 'permanent') {
            await db.run(
                'UPDATE users SET is_banned = 1 WHERE id = ?',
                [req.user.id]
            ).catch(function() {});
        }

        res.json({
            activated: true,
            exclusionId: result.lastID,
            type,
            endsAt,
            isPermanent: type === 'permanent'
        });
    } catch (err) {
        console.warn('[SelfExclusion] Activation error:', err.message);
        res.status(500).json({ error: 'Failed to activate self-exclusion' });
    }
});

// ═══════════════════════════════════════════════════════════
// GET /api/self-exclusion/check
// Middleware-style endpoint: returns { excluded, endsAt }
// Can be called by spin/game endpoints to block gameplay
// ═══════════════════════════════════════════════════════════
router.get('/check', authenticate, async (req, res) => {
    try {
        const result = await checkExclusion(req.user.id);
        res.json({
            excluded: result.excluded,
            endsAt: result.endsAt
        });
    } catch (err) {
        console.warn('[SelfExclusion] Middleware check error:', err.message);
        res.json({ excluded: false, endsAt: null });
    }
});

module.exports = router;
