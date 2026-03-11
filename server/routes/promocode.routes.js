'use strict';

const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../database');

// Bootstrap tables
{
  var _isPg  = !!process.env.DATABASE_URL;
  var _idDef = _isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  var _tsType    = _isPg ? 'TIMESTAMPTZ' : 'TEXT';
  var _tsDefault = _isPg ? 'NOW()' : "(datetime('now'))";
  db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
  id ${_idDef},
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  reward_gems INTEGER DEFAULT 0,
  reward_credits REAL DEFAULT 0,
  reward_spins INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  uses_count INTEGER DEFAULT 0,
  expires_at TEXT DEFAULT NULL,
  active INTEGER DEFAULT 1,
  created_at ${_tsType} DEFAULT ${_tsDefault}
)`).catch(function() {});

  db.run(`CREATE TABLE IF NOT EXISTS promo_redemptions (
  id ${_idDef},
  user_id INTEGER NOT NULL,
  code_id INTEGER NOT NULL,
  redeemed_at ${_tsType} DEFAULT ${_tsDefault},
  UNIQUE(user_id, code_id)
)`).catch(function() {});
}

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
    // Atomic: increment uses_count only if under limit (prevents race condition)
    if (row.max_uses > 0) {
      var usesResult = await db.run(
        'UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ? AND uses_count < ?',
        [row.id, row.max_uses]
      );
      if (!usesResult || usesResult.changes === 0) {
        return res.status(400).json({ error: 'Code has reached its usage limit' });
      }
    } else {
      await db.run('UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?', [row.id]);
    }

    // Atomic: INSERT redemption with unique constraint to prevent race condition double-redeem
    try {
      await db.run('INSERT INTO promo_redemptions (user_id, code_id) VALUES (?, ?)', [userId, row.id]);
    } catch (dupErr) {
      // Unique constraint violation = already redeemed (concurrent request won the race)
      // Undo the uses_count increment
      await db.run('UPDATE promo_codes SET uses_count = uses_count - 1 WHERE id = ? AND uses_count > 0', [row.id]);
      return res.status(400).json({ error: 'You have already redeemed this code' });
    }
    if (row.reward_gems > 0) {
      await db.run('UPDATE users SET gems = COALESCE(gems, 0) + ? WHERE id = ?', [row.reward_gems, userId]);
    }
    if (row.reward_credits > 0) {
      await db.run('UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ? WHERE id = ?', [row.reward_credits, row.reward_credits * 15, userId]);
      await db.run("INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'promo', ?, ?)",
        [userId, row.reward_credits, 'Promo code: ' + row.code + ' (bonus, 15x wagering)']);
    }

    var user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      reward: { gems: row.reward_gems, credits: row.reward_credits, spins: row.reward_spins },
      newBalance: user ? user.balance : 0
    });
  } catch(err) {
    console.error('[PromoCode] Redemption error:', err.message);
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
