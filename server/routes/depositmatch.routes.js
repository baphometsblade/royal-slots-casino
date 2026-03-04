'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap columns
db.run('ALTER TABLE users ADD COLUMN deposit_match_credits REAL DEFAULT 0').catch(function() {});
db.run('ALTER TABLE users ADD COLUMN deposit_match_last TEXT DEFAULT NULL').catch(function() {});

// GET /api/depositmatch/status
router.get('/status', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get('SELECT deposit_match_credits, deposit_match_last FROM users WHERE id = ?', [userId]);
    var pendingMatch = user ? (user.deposit_match_credits || 0) : 0;
    
    // Check if there's a recent deposit that hasn't been matched yet
    var lastDeposit = await db.get(
      "SELECT amount, created_at FROM transactions WHERE user_id = ? AND type = 'deposit' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    
    var matchRate = 0.50; // 50% match
    var maxMatch = 5.00;  // up to $5 bonus
    var eligible = false;
    var matchAmount = 0;
    
    if (lastDeposit) {
      var lastMatchTime = user ? user.deposit_match_last : null;
      if (!lastMatchTime || lastDeposit.created_at > lastMatchTime) {
        eligible = true;
        matchAmount = Math.min(lastDeposit.amount * matchRate, maxMatch);
      }
    }
    
    return res.json({
      eligible: eligible,
      matchRate: matchRate,
      maxMatch: maxMatch,
      matchAmount: matchAmount,
      pendingCredits: pendingMatch,
      lastDeposit: lastDeposit ? lastDeposit.amount : 0
    });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/depositmatch/claim
router.post('/claim', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get('SELECT deposit_match_last FROM users WHERE id = ?', [userId]);
    
    var lastDeposit = await db.get(
      "SELECT amount, created_at FROM transactions WHERE user_id = ? AND type = 'deposit' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    
    if (!lastDeposit) return res.status(400).json({ error: 'No deposit found' });
    
    var lastMatchTime = user ? user.deposit_match_last : null;
    if (lastMatchTime && lastDeposit.created_at <= lastMatchTime) {
      return res.status(400).json({ error: 'Already claimed for this deposit' });
    }
    
    var matchRate = 0.50;
    var maxMatch = 5.00;
    var matchAmount = Math.min(lastDeposit.amount * matchRate, maxMatch);
    matchAmount = Math.round(matchAmount * 100) / 100;
    
    if (matchAmount <= 0) return res.status(400).json({ error: 'No match available' });
    
    await db.run('UPDATE users SET balance = balance + ?, deposit_match_credits = COALESCE(deposit_match_credits, 0) + ?, deposit_match_last = ? WHERE id = ?',
      [matchAmount, matchAmount, lastDeposit.created_at, userId]);
    await db.run("INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
      [userId, matchAmount, 'Deposit Match ' + Math.round(matchRate * 100) + '% — $' + matchAmount.toFixed(2)]);
    
    var updated = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      matchAmount: matchAmount,
      newBalance: updated ? updated.balance : 0
    });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
