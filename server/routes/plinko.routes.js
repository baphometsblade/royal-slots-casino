'use strict';

// Plinko Game Routes — single-request, instant result, server-side RNG
//
// POST /api/plinko/drop  { bet, risk }
//   → { success, path, bucket, multiplier, payout, newBalance }
//
// risk: 'low' | 'medium' | 'high'
// 8-row board → 9 buckets (0-8)
// path: array of 8 values (0=left, 1=right); bucket = sum(path)

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

const MIN_BET = 0.10;
const MAX_BET = 500;
const ROWS    = 8;

// Multiplier tables — symmetric, indexed by bucket (0..8)
// EV verified against binomial(8, 0.5) distribution
const MULTIPLIERS = {
  low:    [0.5,  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
  medium: [9.0,  2.6, 1.3, 0.9, 0.3, 0.9, 1.3, 2.6, 9.0],
  high:   [25.0, 4.5, 1.3, 0.4, 0.1, 0.4, 1.3, 4.5, 25.0],
};

function generatePath() {
  const path = [];
  for (let i = 0; i < ROWS; i++) {
    path.push(Math.random() < 0.5 ? 0 : 1);
  }
  return path;
}

router.post('/drop', authenticate, async function(req, res) {
  try {
    const userId = req.user.id;
    const bet    = parseFloat(req.body.bet)  || 1.0;
    const risk   = ['low', 'medium', 'high'].includes(req.body.risk)
      ? req.body.risk : 'medium';

    if (bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: 'Bet out of range ($0.10 – $500)' });
    }

    const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const balance = parseFloat(user.balance) || 0;
    if (balance < bet) return res.status(400).json({ error: 'Insufficient balance' });

    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [bet, userId]);

    const path       = generatePath();
    const bucket     = path.reduce((s, v) => s + v, 0);
    const multiplier = MULTIPLIERS[risk][bucket];
    const payout     = parseFloat((bet * multiplier).toFixed(2));

    if (payout > 0) {
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, userId]);
      if (payout > bet) {
        await db.run(
          "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, ?)",
          [userId, payout, 'Plinko win ' + multiplier + 'x (' + risk + ')']
        );
      }
    }

    const u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      path,
      bucket,
      multiplier,
      payout,
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[Plinko] POST /drop error:', err.message);
    return res.status(500).json({ error: 'Failed to drop ball' });
  }
});

module.exports = router;
