'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: create session_reengage_claims table
const isPg = !!process.env.DATABASE_URL;
const idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
const tsType = isPg ? 'TIMESTAMPTZ' : 'TEXT';
const tsDefault = isPg ? 'NOW()' : "datetime('now')";

db.run(
  `CREATE TABLE IF NOT EXISTS session_reengage_claims (
    id ${idDef},
    user_id INTEGER NOT NULL,
    bonus_amount REAL NOT NULL,
    claimed_at ${tsType} DEFAULT ${tsDefault},
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`
).catch(function() {});

// Constant: valid bonus amount range
const MIN_BONUS = 5;
const MAX_BONUS = 25;
const COOLDOWN_MINUTES = 30;

// POST /api/session-reengage/claim
router.post('/claim', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var body = req.body || {};
    var amount = parseFloat(body.amount) || 0;

    // Validate amount is in range
    if (amount < MIN_BONUS || amount > MAX_BONUS) {
      return res.status(400).json({
        error: 'Bonus amount must be between $' + MIN_BONUS + ' and $' + MAX_BONUS,
        minBonus: MIN_BONUS,
        maxBonus: MAX_BONUS
      });
    }

    // Check if user has claimed in the last 30 minutes
    var lastClaim = await db.get(
      'SELECT claimed_at FROM session_reengage_claims WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 1',
      [userId]
    );

    if (lastClaim) {
      var lastClaimTime = new Date(lastClaim.claimed_at).getTime();
      var timeSinceLastClaim = Date.now() - lastClaimTime;
      var cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

      if (timeSinceLastClaim < cooldownMs) {
        var remainingMs = cooldownMs - timeSinceLastClaim;
        var remainingMinutes = Math.ceil(remainingMs / 60000);
        return res.status(400).json({
          error: 'You can claim re-engagement bonus again in ' + remainingMinutes + ' minutes',
          nextAvailableAt: new Date(lastClaimTime + cooldownMs).toISOString(),
          remainingSeconds: Math.ceil(remainingMs / 1000)
        });
      }
    }

    // Credit amount to user's balance
    await db.run(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [amount, userId]
    );

    // Record in session_reengage_claims
    await db.run(
      'INSERT INTO session_reengage_claims (user_id, bonus_amount) VALUES (?, ?)',
      [userId, amount]
    );

    // Record transaction
    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'session_bonus', ?, 'Session re-engagement bonus')",
      [userId, amount]
    );

    // Fetch updated balance
    var updated = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    var newBalance = updated ? parseFloat(updated.balance) || 0 : 0;

    return res.json({
      success: true,
      amount: parseFloat(amount.toFixed(2)),
      newBalance: parseFloat(newBalance.toFixed(2))
    });
  } catch (err) {
    console.warn('[session-reengage] POST /claim error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/session-reengage/stats
router.get('/stats', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;

    // Count claims today
    var todayStats = await db.get(
      `SELECT
        COUNT(*) as claim_count,
        COALESCE(SUM(bonus_amount), 0) as total_bonus
      FROM session_reengage_claims
      WHERE user_id = ? AND DATE(claimed_at) = DATE(?)`,
      isPg
        ? [userId, new Date().toISOString()]
        : [userId, "datetime('now')"]
    );

    var claimCount = todayStats ? (todayStats.claim_count || 0) : 0;
    var totalBonus = todayStats ? parseFloat(todayStats.total_bonus || 0) : 0;

    return res.json({
      claimsToday: claimCount,
      totalBonusToday: parseFloat(totalBonus.toFixed(2))
    });
  } catch (err) {
    console.warn('[session-reengage] GET /stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
