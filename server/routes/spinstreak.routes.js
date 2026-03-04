const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// Bootstrap columns
db.run("ALTER TABLE users ADD COLUMN spin_streak_count INTEGER DEFAULT 0").catch(function() {});
db.run("ALTER TABLE users ADD COLUMN spin_streak_last TEXT").catch(function() {});

// Streak tiers: spins needed → multiplier
var TIERS = [
  { min: 0,  mult: 1.0, label: 'No Streak' },
  { min: 5,  mult: 1.2, label: 'Warm' },
  { min: 15, mult: 1.5, label: 'Hot' },
  { min: 30, mult: 2.0, label: 'On Fire' },
  { min: 50, mult: 3.0, label: 'Blazing' }
];

var STREAK_GAP_MS = 5 * 60 * 1000; // 5 minutes max gap between spins

function getTier(count) {
  var tier = TIERS[0];
  for (var i = 1; i < TIERS.length; i++) {
    if (count >= TIERS[i].min) tier = TIERS[i];
  }
  return tier;
}

function getNextTier(count) {
  for (var i = 0; i < TIERS.length; i++) {
    if (count < TIERS[i].min) return TIERS[i];
  }
  return null;
}

// GET /api/spinstreak/status
router.get('/status', authenticate, async function(req, res) {
  try {
    var row = await db.get(
      "SELECT spin_streak_count, spin_streak_last FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!row) return res.status(404).json({ error: 'User not found' });

    var count = row.spin_streak_count || 0;
    var last = row.spin_streak_last;
    var now = Date.now();

    // Check if streak expired
    if (last && (now - new Date(last).getTime()) > STREAK_GAP_MS) {
      count = 0;
      await db.run(
        "UPDATE users SET spin_streak_count = 0 WHERE id = ?",
        [req.user.id]
      );
    }

    var tier = getTier(count);
    var next = getNextTier(count);

    res.json({
      count: count,
      multiplier: tier.mult,
      tierLabel: tier.label,
      nextTier: next ? { spinsNeeded: next.min - count, multiplier: next.mult, label: next.label } : null,
      lastSpin: last,
      gapMs: STREAK_GAP_MS
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/spinstreak/tick — called after each spin
router.post('/tick', authenticate, async function(req, res) {
  try {
    var row = await db.get(
      "SELECT spin_streak_count, spin_streak_last FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!row) return res.status(404).json({ error: 'User not found' });

    var count = row.spin_streak_count || 0;
    var last = row.spin_streak_last;
    var now = Date.now();
    var nowISO = new Date(now).toISOString();

    // Reset streak if gap exceeded
    if (last && (now - new Date(last).getTime()) > STREAK_GAP_MS) {
      count = 0;
    }

    count++;

    await db.run(
      "UPDATE users SET spin_streak_count = ?, spin_streak_last = ? WHERE id = ?",
      [count, nowISO, req.user.id]
    );

    var tier = getTier(count);
    var next = getNextTier(count);
    var prevTier = getTier(count - 1);
    var tieredUp = tier.mult > prevTier.mult;

    res.json({
      count: count,
      multiplier: tier.mult,
      tierLabel: tier.label,
      tieredUp: tieredUp,
      nextTier: next ? { spinsNeeded: next.min - count, multiplier: next.mult, label: next.label } : null,
      gapMs: STREAK_GAP_MS
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
