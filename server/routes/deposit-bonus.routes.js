'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// ════════════════════════════════════════════════════════════════════════════
// DEPOSIT BONUS MATCHER ROUTES
// Handles bonus eligibility, claiming, and wagering progress
// ════════════════════════════════════════════════════════════════════════════

var _tablesInitialized = false;

// ────────────────────────────────────────────────────────────────────────────
// Lazy init: ensure deposit_bonuses table exists
// ────────────────────────────────────────────────────────────────────────────
async function _ensureDepositBonusTables() {
    if (_tablesInitialized) return;
    _tablesInitialized = true;

    var isPg = !!process.env.DATABASE_URL;
    var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS deposit_bonuses (
                id ${idDef},
                user_id INTEGER NOT NULL,
                bonus_type TEXT NOT NULL,
                deposit_amount INTEGER NOT NULL,
                bonus_amount INTEGER NOT NULL,
                bonus_multiplier REAL NOT NULL,
                wagering_requirement INTEGER NOT NULL,
                wagered_so_far INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                created_at TEXT,
                expires_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
    } catch (err) {
        console.warn('[DepositBonus] Table creation error:', err.message);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Bonus definitions
// ────────────────────────────────────────────────────────────────────────────
var BONUS_TYPES = {
    'first_deposit': {
        name: 'First Deposit Bonus',
        multiplier: 2.0,  // 200%
        maxBonus: 5000,
        minDeposit: 10,
        wageringMultiplier: 10,
        oneTimeOnly: true,
        daysValid: 30
    },
    'reload': {
        name: 'Reload Bonus',
        multiplier: 0.5,  // 50%
        maxBonus: 1000,
        minDeposit: 10,
        wageringMultiplier: 10,
        maxPerDay: 1,
        daysValid: 7
    },
    'weekend': {
        name: 'Weekend Bonus',
        multiplier: 1.0,  // 100%
        maxBonus: 2000,
        minDeposit: 10,
        wageringMultiplier: 10,
        availableOn: ['Saturday', 'Sunday'],
        daysValid: 2
    },
    'high_roller': {
        name: 'High Roller Bonus',
        multiplier: 0.75,  // 75%
        maxBonus: 10000,
        minDeposit: 5000,
        wageringMultiplier: 10,
        daysValid: 14
    }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/deposit-bonus/available — list available bonuses for current user
// ────────────────────────────────────────────────────────────────────────────
router.get('/available', authenticate, async (req, res) => {
    try {
        await _ensureDepositBonusTables();

        var userId = req.user.id;
        var bonusesAvailable = [];

        // Check first deposit bonus (one-time only)
        var hasFirstDeposit = await db.get(
            'SELECT id FROM deposit_bonuses WHERE user_id = ? AND bonus_type = ?',
            [userId, 'first_deposit']
        );

        if (!hasFirstDeposit) {
            var bonus = BONUS_TYPES['first_deposit'];
            bonusesAvailable.push({
                type: 'first_deposit',
                name: bonus.name,
                multiplier: Math.round(bonus.multiplier * 100),
                maxBonus: bonus.maxBonus,
                minDeposit: bonus.minDeposit,
                wageringRequirement: bonus.wageringMultiplier,
                badge: 'BEST VALUE'
            });
        }

        // Check reload bonus (daily)
        var now = new Date();
        var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        var todayReload = await db.get(
            'SELECT id FROM deposit_bonuses WHERE user_id = ? AND bonus_type = ? AND created_at > ?',
            [userId, 'reload', todayStart]
        );

        if (!todayReload) {
            var bonus = BONUS_TYPES['reload'];
            bonusesAvailable.push({
                type: 'reload',
                name: bonus.name,
                multiplier: Math.round(bonus.multiplier * 100),
                maxBonus: bonus.maxBonus,
                minDeposit: bonus.minDeposit,
                wageringRequirement: bonus.wageringMultiplier
            });
        }

        // Check weekend bonus (Sat/Sun only)
        var dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
            var bonus = BONUS_TYPES['weekend'];
            bonusesAvailable.push({
                type: 'weekend',
                name: bonus.name,
                multiplier: Math.round(bonus.multiplier * 100),
                maxBonus: bonus.maxBonus,
                minDeposit: bonus.minDeposit,
                wageringRequirement: bonus.wageringMultiplier,
                limitedTime: true
            });
        }

        // Check high roller bonus
        var bonus = BONUS_TYPES['high_roller'];
        bonusesAvailable.push({
            type: 'high_roller',
            name: bonus.name,
            multiplier: Math.round(bonus.multiplier * 100),
            maxBonus: bonus.maxBonus,
            minDeposit: bonus.minDeposit,
            wageringRequirement: bonus.wageringMultiplier
        });

        res.json({ bonuses: bonusesAvailable });
    } catch (err) {
        console.warn('[DepositBonus] GET /available error:', err.message);
        res.status(500).json({ error: 'Failed to fetch available bonuses' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/deposit-bonus/active — list user's active bonuses with progress
// ────────────────────────────────────────────────────────────────────────────
router.get('/active', authenticate, async (req, res) => {
    try {
        await _ensureDepositBonusTables();

        var userId = req.user.id;
        var activeBonuses = await db.all(
            `SELECT id, bonus_type, deposit_amount, bonus_amount, bonus_multiplier,
                    wagering_requirement, wagered_so_far, status, created_at, expires_at
             FROM deposit_bonuses
             WHERE user_id = ? AND status = 'active'
             ORDER BY created_at DESC`,
            [userId]
        );

        var result = activeBonuses.map(function(b) {
            var wagerRemaining = Math.max(0, b.wagering_requirement - b.wagered_so_far);
            var progressPercent = b.wagering_requirement > 0 ? Math.round((b.wagered_so_far / b.wagering_requirement) * 100) : 0;
            return {
                id: b.id,
                type: b.bonus_type,
                depositAmount: b.deposit_amount,
                bonusAmount: b.bonus_amount,
                multiplier: b.bonus_multiplier,
                wageringRequirement: b.wagering_requirement,
                wageredSoFar: b.wagered_so_far,
                wagerRemaining: wagerRemaining,
                progressPercent: progressPercent,
                status: b.status,
                createdAt: b.created_at,
                expiresAt: b.expires_at
            };
        });

        res.json({ bonuses: result });
    } catch (err) {
        console.warn('[DepositBonus] GET /active error:', err.message);
        res.status(500).json({ error: 'Failed to fetch active bonuses' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/deposit-bonus/claim — claim a bonus with deposit amount
// ────────────────────────────────────────────────────────────────────────────
router.post('/claim', authenticate, async (req, res) => {
    try {
        await _ensureDepositBonusTables();

        var userId = req.user.id;
        var { bonusType, depositAmount } = req.body;

        if (!bonusType || !depositAmount) {
            return res.status(400).json({ error: 'bonusType and depositAmount required' });
        }

        depositAmount = Math.floor(depositAmount);

        var bonusDef = BONUS_TYPES[bonusType];
        if (!bonusDef) {
            return res.status(400).json({ error: 'Invalid bonus type' });
        }

        // Validate minimum deposit
        if (depositAmount < bonusDef.minDeposit) {
            return res.status(400).json({ error: 'Deposit below minimum for this bonus' });
        }

        // Check eligibility based on bonus type
        if (bonusType === 'first_deposit' && bonusDef.oneTimeOnly) {
            var existing = await db.get(
                'SELECT id FROM deposit_bonuses WHERE user_id = ? AND bonus_type = ?',
                [userId, 'first_deposit']
            );
            if (existing) {
                return res.status(400).json({ error: 'First deposit bonus already claimed' });
            }
        }

        if (bonusType === 'reload' && bonusDef.maxPerDay) {
            var now = new Date();
            var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            var reloadToday = await db.get(
                'SELECT id FROM deposit_bonuses WHERE user_id = ? AND bonus_type = ? AND created_at > ?',
                [userId, 'reload', todayStart]
            );
            if (reloadToday) {
                return res.status(400).json({ error: 'Daily reload bonus already claimed' });
            }
        }

        // Calculate bonus amount
        var calculatedBonus = Math.floor(depositAmount * bonusDef.multiplier);
        var bonusAmount = Math.min(calculatedBonus, bonusDef.maxBonus);
        var wageringRequirement = bonusAmount * bonusDef.wageringMultiplier;

        // Calculate expiry
        var createdAt = new Date().toISOString();
        var expiresAt = new Date(Date.now() + (bonusDef.daysValid * 24 * 60 * 60 * 1000)).toISOString();

        // Insert bonus record
        var result = await db.run(
            `INSERT INTO deposit_bonuses
             (user_id, bonus_type, deposit_amount, bonus_amount, bonus_multiplier,
              wagering_requirement, wagered_so_far, status, created_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, bonusType, depositAmount, bonusAmount, bonusDef.multiplier,
             wageringRequirement, 0, 'active', createdAt, expiresAt]
        );

        res.json({
            bonusId: result.id || result.lastID,
            type: bonusType,
            depositAmount: depositAmount,
            bonusAmount: bonusAmount,
            multiplier: bonusDef.multiplier,
            wageringRequirement: wageringRequirement,
            expiresAt: expiresAt
        });
    } catch (err) {
        console.warn('[DepositBonus] POST /claim error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/deposit-bonus/wager — record wagering progress
// Called from spin hook in ui-slot.js
// ────────────────────────────────────────────────────────────────────────────
router.post('/wager', authenticate, async (req, res) => {
    try {
        await _ensureDepositBonusTables();

        var userId = req.user.id;
        var { wagerAmount } = req.body;

        if (!wagerAmount || wagerAmount <= 0) {
            return res.status(400).json({ error: 'Valid wagerAmount required' });
        }

        wagerAmount = Math.floor(wagerAmount);

        // Get all active bonuses for this user
        var activeBonuses = await db.all(
            'SELECT id, wagered_so_far, wagering_requirement FROM deposit_bonuses WHERE user_id = ? AND status = ?',
            [userId, 'active']
        );

        // Update each active bonus
        var updated = 0;
        for (var i = 0; i < activeBonuses.length; i++) {
            var bonus = activeBonuses[i];
            var newWagered = bonus.wagered_so_far + wagerAmount;

            // Mark as completed if wagering requirement met
            var newStatus = newWagered >= bonus.wagering_requirement ? 'completed' : 'active';

            await db.run(
                'UPDATE deposit_bonuses SET wagered_so_far = ?, status = ? WHERE id = ?',
                [Math.min(newWagered, bonus.wagering_requirement), newStatus, bonus.id]
            );
            updated++;
        }

        res.json({ updated: updated, wagerAmount: wagerAmount });
    } catch (err) {
        console.warn('[DepositBonus] POST /wager error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
