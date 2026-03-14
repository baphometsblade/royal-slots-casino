'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATIC CASHBACK REWARDS ROUTES
// Daily cashback on losses that keeps players depositing and playing through losses
// ════════════════════════════════════════════════════════════════════════════

var _tablesInitialized = false;

// ────────────────────────────────────────────────────────────────────────────
// Lazy init: ensure cashback_rewards table exists
// ────────────────────────────────────────────────────────────────────────────
async function _ensureCashbackTables() {
    if (_tablesInitialized) return;
    _tablesInitialized = true;

    var isPg = !!process.env.DATABASE_URL;
    var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS cashback_rewards (
                id ${idDef},
                user_id INTEGER NOT NULL,
                period_date TEXT NOT NULL,
                total_wagered INTEGER DEFAULT 0,
                total_won INTEGER DEFAULT 0,
                net_loss INTEGER DEFAULT 0,
                cashback_rate REAL DEFAULT 0,
                cashback_amount INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                claimed_at TEXT,
                created_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, period_date)
            )
        `);
    } catch (err) {
        console.warn('[Cashback] Table creation error:', err.message);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Cashback tier calculation (based on total wagered in the period)
// Under 1000 wagered: 5% cashback on net losses
// 1000-5000 wagered: 8% cashback
// 5000-20000 wagered: 12% cashback
// 20000+ wagered: 15% cashback (VIP rate)
// ────────────────────────────────────────────────────────────────────────────
function _getCashbackTier(totalWagered) {
    if (totalWagered >= 20000) return { rate: 0.15, label: 'VIP' };
    if (totalWagered >= 5000) return { rate: 0.12, label: 'Gold' };
    if (totalWagered >= 1000) return { rate: 0.08, label: 'Silver' };
    return { rate: 0.05, label: 'Bronze' };
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/cashback/status — today's play stats + yesterday's pending cashback
// ────────────────────────────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
    try {
        await _ensureCashbackTables();
        var userId = req.user.id;

        var isPg = !!process.env.DATABASE_URL;
        var todayDate = isPg ? "CURRENT_DATE::text" : "date('now')";
        var yesterdayDate = isPg ? "(CURRENT_DATE - INTERVAL '1 day')::text" : "date('now', '-1 day')";

        // Today's stats
        var today = await db.get(`
            SELECT
                total_wagered,
                total_won,
                net_loss,
                cashback_rate,
                cashback_amount
            FROM cashback_rewards
            WHERE user_id = ? AND period_date = ${todayDate}
        `, [userId]);

        var todayStats = {
            totalWagered: (today ? today.total_wagered : 0),
            totalWon: (today ? today.total_won : 0),
            netLoss: (today ? today.net_loss : 0),
            cashbackRate: (today ? today.cashback_rate : 0),
            cashbackAmount: (today ? today.cashback_amount : 0)
        };

        // Calculate current tier based on today's wagers
        var currentTier = _getCashbackTier(todayStats.totalWagered);

        // Yesterday's pending cashback (if exists)
        var yesterday = await db.get(`
            SELECT id, cashback_amount, cashback_rate
            FROM cashback_rewards
            WHERE user_id = ? AND period_date = ${yesterdayDate} AND status = 'pending'
        `, [userId]);

        var pendingCashback = yesterday ? {
            id: yesterday.id,
            amount: yesterday.cashback_amount,
            rate: yesterday.cashback_rate
        } : null;

        // Progress to next tier
        var nextTier = null;
        if (todayStats.totalWagered < 1000) {
            nextTier = { wagerThreshold: 1000, label: 'Silver', rate: 0.08 };
        } else if (todayStats.totalWagered < 5000) {
            nextTier = { wagerThreshold: 5000, label: 'Gold', rate: 0.12 };
        } else if (todayStats.totalWagered < 20000) {
            nextTier = { wagerThreshold: 20000, label: 'VIP', rate: 0.15 };
        }

        res.json({
            todayStats,
            currentTier,
            nextTier,
            pendingCashback
        });
    } catch (err) {
        console.warn('[Cashback] Status error:', err.message);
        res.status(500).json({ error: 'Failed to fetch cashback status' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/cashback/claim — claim yesterday's cashback reward
// ────────────────────────────────────────────────────────────────────────────
router.post('/claim', authenticate, async (req, res) => {
    try {
        await _ensureCashbackTables();
        var userId = req.user.id;
        var rewardId = req.body.rewardId;

        if (!rewardId || typeof rewardId !== 'number') {
            return res.status(400).json({ error: 'Valid reward ID required' });
        }

        // Atomic claim — prevent double-claim
        var claimResult = await db.run(
            'UPDATE cashback_rewards SET status = ?, claimed_at = ? WHERE id = ? AND user_id = ? AND status = ?',
            ['claimed', new Date().toISOString(), rewardId, userId, 'pending']
        );

        if (!claimResult || claimResult.changes === 0) {
            return res.status(400).json({ error: 'Reward not found or already claimed' });
        }

        // Fetch reward details
        var reward = await db.get(
            'SELECT cashback_amount FROM cashback_rewards WHERE id = ?',
            [rewardId]
        );

        // Add to user balance
        var user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        var newBalance = (user ? user.balance : 0) + (reward ? reward.cashback_amount : 0);

        await db.run(
            'UPDATE users SET balance = ? WHERE id = ?',
            [newBalance, userId]
        );

        res.json({
            claimed: true,
            cashbackAmount: reward ? reward.cashback_amount : 0,
            newBalance: newBalance
        });
    } catch (err) {
        console.warn('[Cashback] Claim error:', err.message);
        res.status(400).json({ error: 'Failed to claim cashback' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/cashback/history — last 30 days of cashback rewards
// ────────────────────────────────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
    try {
        await _ensureCashbackTables();
        var userId = req.user.id;

        var history = await db.all(`
            SELECT
                id,
                period_date,
                total_wagered,
                total_won,
                net_loss,
                cashback_rate,
                cashback_amount,
                status,
                claimed_at,
                created_at
            FROM cashback_rewards
            WHERE user_id = ?
            ORDER BY period_date DESC
            LIMIT 30
        `, [userId]);

        var rewards = (history || []).map(function(r) {
            return {
                id: r.id,
                periodDate: r.period_date,
                totalWagered: r.total_wagered,
                totalWon: r.total_won,
                netLoss: r.net_loss,
                cashbackRate: r.cashback_rate,
                cashbackAmount: r.cashback_amount,
                status: r.status,
                claimedAt: r.claimed_at,
                createdAt: r.created_at
            };
        });

        res.json({ rewards });
    } catch (err) {
        console.warn('[Cashback] History error:', err.message);
        res.status(500).json({ error: 'Failed to fetch cashback history' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/cashback/record — record wager/win for current day (called from spin hook)
// ────────────────────────────────────────────────────────────────────────────
router.post('/record', authenticate, async (req, res) => {
    try {
        await _ensureCashbackTables();
        var userId = req.user.id;
        var wagerAmount = parseInt(req.body.wagerAmount, 10) || 0;
        var winAmount = parseInt(req.body.winAmount, 10) || 0;

        if (wagerAmount < 0) wagerAmount = 0;
        if (winAmount < 0) winAmount = 0;

        var isPg = !!process.env.DATABASE_URL;
        var todayDate = isPg ? "CURRENT_DATE::text" : "date('now')";

        // Get or create today's record
        var today = await db.get(`
            SELECT id, total_wagered, total_won
            FROM cashback_rewards
            WHERE user_id = ? AND period_date = ${todayDate}
        `, [userId]);

        var newTotalWagered = wagerAmount;
        var newTotalWon = winAmount;

        if (today) {
            newTotalWagered += today.total_wagered;
            newTotalWon += today.total_won;

            // Update existing record
            await db.run(`
                UPDATE cashback_rewards
                SET total_wagered = ?, total_won = ?, net_loss = ?
                WHERE id = ?
            `, [
                newTotalWagered,
                newTotalWon,
                Math.max(0, newTotalWagered - newTotalWon),
                today.id
            ]);
        } else {
            // Create new record for today
            var netLoss = Math.max(0, newTotalWagered - newTotalWon);

            await db.run(`
                INSERT INTO cashback_rewards (user_id, period_date, total_wagered, total_won, net_loss, created_at)
                VALUES (?, ${todayDate}, ?, ?, ?, ?)
            `, [
                userId,
                newTotalWagered,
                newTotalWon,
                netLoss,
                new Date().toISOString()
            ]);
        }

        res.json({ recorded: true });
    } catch (err) {
        console.warn('[Cashback] Record error:', err.message);
        res.status(500).json({ error: 'Failed to record cashback data' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// BACKGROUND: Calculate yesterday's cashback (run daily, e.g., via cron)
// ────────────────────────────────────────────────────────────────────────────
async function _calculateYesterdaysCashback() {
    try {
        await _ensureCashbackTables();

        var isPg = !!process.env.DATABASE_URL;
        var yesterdayDate = isPg ? "(CURRENT_DATE - INTERVAL '1 day')::text" : "date('now', '-1 day')";

        // Get all users with yesterday's data that haven't been calculated yet
        var records = await db.all(`
            SELECT id, user_id, total_wagered, net_loss
            FROM cashback_rewards
            WHERE period_date = ${yesterdayDate}
            AND (cashback_amount = 0 OR cashback_rate = 0)
            AND status = 'pending'
        `);

        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            var tier = _getCashbackTier(record.total_wagered);
            var rawCashback = Math.floor(record.net_loss * tier.rate);

            // Apply min/max limits
            var cashbackAmount = rawCashback;
            if (cashbackAmount < 10) cashbackAmount = 0; // Min 10 gems
            if (cashbackAmount > 5000) cashbackAmount = 5000; // Max 5000 gems

            await db.run(`
                UPDATE cashback_rewards
                SET cashback_rate = ?, cashback_amount = ?
                WHERE id = ?
            `, [tier.rate, cashbackAmount, record.id]);
        }

        console.warn('[Cashback] Calculated cashback for', records.length, 'users');
    } catch (err) {
        console.warn('[Cashback] Background calculation error:', err.message);
    }
}

module.exports = router;
