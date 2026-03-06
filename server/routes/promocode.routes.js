'use strict';

const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../database');

// Bootstrap tables
db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  reward_gems INTEGER DEFAULT 0,
  reward_credits REAL DEFAULT 0,
  reward_spins INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  uses_count INTEGER DEFAULT 0,
  expires_at TEXT DEFAULT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
)`).catch(function() {});

db.run(`CREATE TABLE IF NOT EXISTS promo_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_id INTEGER NOT NULL,
  redeemed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, code_id)
)`).catch(function() {});

// Seed default codes on startup
setTimeout(async function() {
  try {
    var count = await db.get('SELECT COUNT(*) as cnt FROM promo_codes');
    if (count && count.cnt === 0) {
      await db.run("INSERT OR IGNORE INTO promo_codes (code, type, reward_gems, reward_credits, max_uses) VALUES (?, ?, ?, ?, ?)", ['WELCOME100', 'gems', 100, 0, 0]);
      await db.run("INSERT OR IGNORE INTO promo_codes (code, type, reward_gems, reward_credits, max_uses) VALUES (?, ?, ?, ?, ?)", ['SPIN25', 'mixed', 25, 0.50, 0]);
      await db.run("INSERT OR IGNORE INTO promo_codes (code, type, reward_gems, reward_credits, max_uses) VALUES (?, ?, ?, ?, ?)", ['BIGWIN', 'mixed', 200, 1.00, 1000]);
    }
  } catch(e) {}
}, 2000);

// POST /api/promocode/redeem
router.post('/redeem', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var code = (req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Code is required' });

    var row = await db.get('SELECT * FROM promo_codes WHERE UPPER(code) = ? AND active = 1', [code]);
    if (!row) return res.status(404).json({ error: 'Invalid code' });

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code has expired' });
    }
    if (row.max_uses > 0 && row.uses_count >= row.max_uses) {
      return res.status(400).json({ error: 'Code has reached its usage limit' });
    }

    var existing = await db.get('SELECT id FROM promo_redemptions WHERE user_id = ? AND code_id = ?', [userId, row.id]);
    if (existing) return res.status(400).json({ error: 'You have already redeemed this code' });

    if (row.reward_gems > 0) {
      await db.run('UPDATE users SET gems = COALESCE(gems, 0) + ? WHERE id = ?', [row.reward_gems, userId]);
    }
    if (row.reward_credits > 0) {
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [row.reward_credits, userId]);
      await db.run("INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'promo', ?, ?)",
        [userId, row.reward_credits, 'Promo code: ' + row.code]);
    }

    await db.run('INSERT INTO promo_redemptions (user_id, code_id) VALUES (?, ?)', [userId, row.id]);
    await db.run('UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?', [row.id]);

    var user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      reward: { gems: row.reward_gems, credits: row.reward_credits, spins: row.reward_spins },
      newBalance: user ? user.balance : 0
    });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/promocode/list — admin only
router.get('/list', authenticate, requireAdmin, async function(req, res) {
  try {
    var codes = await db.all('SELECT * FROM promo_codes ORDER BY created_at DESC');
    return res.json({ codes: codes });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/promocode/create — admin only
router.post('/create', authenticate, requireAdmin, async function(req, res) {
  try {
    var { code, type, reward_gems, reward_credits, reward_spins, max_uses, expires_at } = req.body;
    if (!code || !type) return res.status(400).json({ error: 'code and type are required' });
    var upper = code.trim().toUpperCase();
    await db.run(
      'INSERT INTO promo_codes (code, type, reward_gems, reward_credits, reward_spins, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [upper, type, reward_gems || 0, reward_credits || 0, reward_spins || 0, max_uses || 0, expires_at || null]
    );
    return res.json({ success: true, code: upper });
  } catch(err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Code already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
