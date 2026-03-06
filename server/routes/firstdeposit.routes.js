'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: add first_deposit_bonus_claimed column safely
db.run('ALTER TABLE users ADD COLUMN first_deposit_bonus_claimed INTEGER DEFAULT 0').catch(function() {});

// GET /api/firstdeposit/status
router.get('/status', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get('SELECT first_deposit_bonus_claimed FROM users WHERE id = ?', [userId]);
    var claimed = user ? (user.first_deposit_bonus_claimed || 0) : 0;

    var eligible = false;
    if (!claimed) {
      var deposit = await db.get(
        "SELECT id FROM transactions WHERE user_id = ? AND type = 'deposit' LIMIT 1",
        [userId]
      );
      eligible = !!deposit;
    }

    return res.json({ eligible: eligible, claimed: !!claimed });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/firstdeposit/claim
router.post('/claim', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get('SELECT first_deposit_bonus_claimed, balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.first_deposit_bonus_claimed) return res.status(400).json({ error: 'Already claimed' });

    var deposit = await db.get(
      "SELECT id FROM transactions WHERE user_id = ? AND type = 'deposit' LIMIT 1",
      [userId]
    );
    if (!deposit) return res.status(400).json({ error: 'No deposit found' });

    var BONUS_GEMS = 500;
    var BONUS_CREDITS = 2.00;

    await db.run('UPDATE users SET gems = COALESCE(gems, 0) + ?, balance = balance + ?, first_deposit_bonus_claimed = 1 WHERE id = ?',
      [BONUS_GEMS, BONUS_CREDITS, userId]);
    await db.run("INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
      [userId, BONUS_CREDITS, 'First Deposit Welcome Bonus']);

    var updated = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      reward: { gems: BONUS_GEMS, credits: BONUS_CREDITS },
      newBalance: updated ? updated.balance : 0
    });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
