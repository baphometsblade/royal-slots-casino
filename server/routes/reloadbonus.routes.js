'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap column
db.run("ALTER TABLE users ADD COLUMN reload_bonus_last TEXT").catch(function() {});

var BALANCE_THRESHOLD = 5.00;
var BONUS_AMOUNT      = 1.00;
var MIN_DEPOSIT       = 10.00;
var COOLDOWN_MS       = 24 * 60 * 60 * 1000;

// GET /api/reloadbonus/status
router.get('/status', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get(
      'SELECT balance, reload_bonus_last FROM users WHERE id = ?',
      [userId]
    );

    var balance      = user ? (user.balance || 0) : 0;
    var lastClaimed  = user ? user.reload_bonus_last : null;
    var now          = Date.now();
    var cooldownOk   = !lastClaimed || (now - new Date(lastClaimed).getTime()) >= COOLDOWN_MS;
    var eligible     = balance < BALANCE_THRESHOLD && cooldownOk;

    return res.json({
      eligible:    eligible,
      balance:     balance,
      threshold:   BALANCE_THRESHOLD,
      bonusAmount: BONUS_AMOUNT,
      minDeposit:  MIN_DEPOSIT
    });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reloadbonus/claim
router.post('/claim', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get(
      'SELECT balance, reload_bonus_last FROM users WHERE id = ?',
      [userId]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    var balance = user.balance || 0;
    if (balance >= BALANCE_THRESHOLD) {
      return res.status(400).json({ error: 'Balance too high to qualify for reload bonus' });
    }

    var lastClaimed = user.reload_bonus_last;
    var now         = Date.now();
    if (lastClaimed && (now - new Date(lastClaimed).getTime()) < COOLDOWN_MS) {
      return res.status(400).json({ error: 'Reload bonus already claimed within the last 24 hours' });
    }

    // Require a qualifying deposit of MIN_DEPOSIT or more
    var qualifying = await db.get(
      "SELECT id FROM transactions WHERE user_id = ? AND type = 'deposit' AND amount >= ? ORDER BY created_at DESC LIMIT 1",
      [userId, MIN_DEPOSIT]
    );
    if (!qualifying) {
      return res.status(400).json({ error: 'No qualifying deposit of $' + MIN_DEPOSIT.toFixed(2) + ' or more found' });
    }

    var nowIso = new Date().toISOString();

    await db.run(
      'UPDATE users SET balance = balance + ?, reload_bonus_last = ? WHERE id = ?',
      [BONUS_AMOUNT, nowIso, userId]
    );

    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
      [userId, BONUS_AMOUNT, 'Reload Bonus — $' + BONUS_AMOUNT.toFixed(2) + ' free credit']
    );

    var updated = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success:    true,
      newBalance: updated ? updated.balance : 0
    });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
