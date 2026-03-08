'use strict';
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: add free spin columns
db.run("ALTER TABLE users ADD COLUMN free_spins_count INTEGER DEFAULT 0").catch(function() {});
db.run("ALTER TABLE users ADD COLUMN free_spins_expires TEXT DEFAULT NULL").catch(function() {});
db.run("ALTER TABLE users ADD COLUMN free_spins_last_auto TEXT DEFAULT NULL").catch(function() {});

const FREE_SPIN_VALUE = 0.25; // dollars credited per free spin used

// GET /api/freespins/status
router.get('/status', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var row = await db.get(
      'SELECT free_spins_count, free_spins_expires, free_spins_last_auto FROM users WHERE id = ?',
      [userId]
    );
    if (!row) return res.json({ count: 0, expiresAt: null, expired: false });

    var count = row.free_spins_count || 0;
    var expiresAt = row.free_spins_expires || null;
    var expired = false;

    // Check expiry
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      // Reset expired spins
      await db.run('UPDATE users SET free_spins_count = 0, free_spins_expires = NULL WHERE id = ?', [userId]);
      count = 0;
      expiresAt = null;
      expired = true;
    }

    // Auto-grant welcome-back free spins: check if last spin was > 7 days ago
    if (count === 0 && !expired) {
      var lastSpin = await db.get(
        'SELECT created_at FROM spins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      var lastAutoStr = row.free_spins_last_auto || null;
      var lastAutoWeek = lastAutoStr ? Math.floor(new Date(lastAutoStr).getTime() / (7*24*3600000)) : -1;
      var thisWeek = Math.floor(Date.now() / (7*24*3600000));
      var alreadyGrantedThisWeek = (lastAutoWeek === thisWeek);

      if (lastSpin && !alreadyGrantedThisWeek) {
        var daysSince = (Date.now() - new Date(lastSpin.created_at).getTime()) / (24*3600000);
        if (daysSince >= 7) {
          var grantCount = 3;
          var expires = new Date(Date.now() + 24*3600000).toISOString();
          await db.run(
            'UPDATE users SET free_spins_count = ?, free_spins_expires = ?, free_spins_last_auto = datetime(\'now\') WHERE id = ?',
            [grantCount, expires, userId]
          );
          count = grantCount;
          expiresAt = expires;
        }
      }
    }

    return res.json({ count: count, expiresAt: expiresAt, expired: expired });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/freespins/use — use one free spin
// Uses atomic UPDATE to prevent race condition double-claim
router.post('/use', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;

    // Check for expiry first
    var row = await db.get(
      'SELECT free_spins_count, free_spins_expires FROM users WHERE id = ?',
      [userId]
    );
    if (!row) return res.status(404).json({ error: 'User not found' });
    if ((row.free_spins_count || 0) <= 0) return res.status(400).json({ error: 'No free spins available' });
    if (row.free_spins_expires && new Date(row.free_spins_expires).getTime() < Date.now()) {
      await db.run('UPDATE users SET free_spins_count = 0, free_spins_expires = NULL WHERE id = ?', [userId]);
      return res.status(400).json({ error: 'Free spins have expired' });
    }

    // Atomic: decrement spin count AND credit balance in one UPDATE
    // WHERE free_spins_count > 0 prevents race condition double-claim
    var result = await db.run(
      'UPDATE users SET free_spins_count = free_spins_count - 1, balance = balance + ? WHERE id = ? AND free_spins_count > 0',
      [FREE_SPIN_VALUE, userId]
    );
    if (result.changes === 0) {
      return res.status(400).json({ error: 'No free spins available' });
    }

    // Clear expires if count reached 0
    await db.run(
      'UPDATE users SET free_spins_expires = CASE WHEN free_spins_count = 0 THEN NULL ELSE free_spins_expires END WHERE id = ?',
      [userId]
    );

    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'free_spin', ?, 'Free spin credit')",
      [userId, FREE_SPIN_VALUE]
    );

    // Fetch updated values for response
    var updated = await db.get('SELECT free_spins_count, balance FROM users WHERE id = ?', [userId]);
    return res.json({ success: true, remaining: updated.free_spins_count || 0, newBalance: parseFloat(updated.balance || 0) });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/freespins/grant — admin only
router.post('/grant', requireAdmin, async function(req, res) {
  try {
    var body = req.body || {};
    var targetUserId = body.userId;
    var count = parseInt(body.count) || 5;
    var hours = parseInt(body.hoursValid) || 24;
    if (!targetUserId) return res.status(400).json({ error: 'userId required' });
    var expires = new Date(Date.now() + hours * 3600000).toISOString();
    await db.run(
      'UPDATE users SET free_spins_count = free_spins_count + ?, free_spins_expires = ? WHERE id = ?',
      [count, expires, targetUserId]
    );
    return res.json({ success: true, granted: count, expiresAt: expires });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
