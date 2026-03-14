'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// ── Bootstrap: add loyalty columns if they don't exist yet ──────────────────
db.run('ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 0').catch(function() {});
db.run('ALTER TABLE users ADD COLUMN loyalty_lifetime INTEGER DEFAULT 0').catch(function() {});

// Constants
const POINTS_PER_SPIN      = 1;   // points awarded per spin
const POINTS_PER_DOLLAR    = 100; // 100 points = $1.00
const MIN_REDEEM_POINTS    = 100; // minimum redemption block

// ── GET /api/loyaltyshop/status ──────────────────────────────────────────────
// Returns current loyalty points balance for the authenticated user.
router.get('/status', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get(
      'SELECT loyalty_points, loyalty_lifetime FROM users WHERE id = ?',
      [userId]
    );
    var points         = user ? (parseInt(user.loyalty_points, 10)  || 0) : 0;
    var lifetimePoints = user ? (parseInt(user.loyalty_lifetime, 10) || 0) : 0;

    // pendingPoints: points earned this session but not yet redeemed (same as current balance)
    return res.json({
      points:         points,
      lifetimePoints: lifetimePoints,
      pendingPoints:  points
    });
  } catch (err) {
    console.warn('[LoyaltyShop] GET /status error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch loyalty status' });
  }
});

// ── POST /api/loyaltyshop/earn ───────────────────────────────────────────────
// Called after each spin to award loyalty points.
// Body: { spinsCount: 1 }  (defaults to 1 if omitted)
router.post('/earn', authenticate, async function(req, res) {
  try {
    var userId     = req.user.id;

    // Server-side verification: only award points if the user has recent spins.
    // Check that there's a spin in the last 30 seconds to prevent fabricated earn requests.
    var recentSpin = await db.get(
      "SELECT id FROM spins WHERE user_id = ? AND created_at >= datetime('now', '-30 seconds') ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    if (!recentSpin) {
      return res.status(400).json({ error: 'No recent spin detected' });
    }

    // Always award exactly 1 point per verified call (ignore client spinsCount)
    var earned = POINTS_PER_SPIN;

    await db.run(
      'UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ?, loyalty_lifetime = COALESCE(loyalty_lifetime, 0) + ? WHERE id = ?',
      [earned, earned, userId]
    );

    var updated = await db.get('SELECT loyalty_points FROM users WHERE id = ?', [userId]);
    var points  = updated ? (parseInt(updated.loyalty_points, 10) || 0) : 0;

    return res.json({ points: points, earned: earned });
  } catch (err) {
    console.warn('[LoyaltyShop] POST /earn error:', err.message);
    return res.status(500).json({ error: 'Failed to award loyalty points' });
  }
});

// ── POST /api/loyaltyshop/redeem ─────────────────────────────────────────────
// Redeem loyalty points for real balance credit.
// Body: { points: <integer> }  — must be a multiple of 100, minimum 100.
// Rate: 100 points = $1.00
router.post('/redeem', authenticate, async function(req, res) {
  try {
    var userId      = req.user.id;
    var redeemPts   = parseInt(req.body.points, 10);

    if (!redeemPts || isNaN(redeemPts)) {
      return res.status(400).json({ error: 'points is required' });
    }
    if (redeemPts < MIN_REDEEM_POINTS) {
      return res.status(400).json({ error: 'Minimum redemption is ' + MIN_REDEEM_POINTS + ' points' });
    }
    if (redeemPts % POINTS_PER_DOLLAR !== 0) {
      return res.status(400).json({ error: 'Points must be a multiple of ' + POINTS_PER_DOLLAR });
    }

    var user = await db.get('SELECT loyalty_points, balance FROM users WHERE id = ?', [userId]);
    var currentPoints = user ? (parseInt(user.loyalty_points, 10) || 0) : 0;

    if (currentPoints < redeemPts) {
      return res.status(400).json({ error: 'Insufficient loyalty points', points: currentPoints });
    }

    var creditAmount = redeemPts / POINTS_PER_DOLLAR; // e.g. 200 pts → $2.00
    creditAmount = Math.round(creditAmount * 100) / 100;

    // Credit to bonus_balance with 15x wagering requirement (not withdrawable balance)
    var wageringMult = 15;
    await db.run(
      'UPDATE users SET loyalty_points = loyalty_points - ?, bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ? WHERE id = ?',
      [redeemPts, creditAmount, creditAmount * wageringMult, userId]
    );

    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
      [userId, creditAmount, 'Loyalty Points Redemption — ' + redeemPts + ' pts → $' + creditAmount.toFixed(2) + ' (15x wagering)']
    );

    var updated   = await db.get('SELECT balance, loyalty_points FROM users WHERE id = ?', [userId]);
    var newBalance = updated ? parseFloat(updated.balance) : 0;
    var newPoints  = updated ? (parseInt(updated.loyalty_points, 10) || 0) : 0;

    return res.json({
      success:    true,
      newBalance: newBalance,
      newPoints:  newPoints,
      credited:   creditAmount
    });
  } catch (err) {
    console.warn('[LoyaltyShop] POST /redeem error:', err.message);
    return res.status(500).json({ error: 'Redemption failed' });
  }
});

module.exports = router;
