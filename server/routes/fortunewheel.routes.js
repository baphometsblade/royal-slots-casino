'use strict';

// Fortune Wheel Routes (free daily spin for all users)
// GET  /api/fortunewheel/status  -- authenticated; whether spin is available today
// POST /api/fortunewheel/spin    -- authenticated; spin the wheel, get reward

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

// 8 wheel segments with weights (higher weight = more frequent)
const SEGMENTS = [
  { label: '$0.25 Cash',    type: 'cash',   amount: 0.25,  weight: 30 },
  { label: '$0.25 Cash',    type: 'cash',   amount: 0.25,  weight: 30 },
  { label: '$0.50 Cash',    type: 'cash',   amount: 0.50,  weight: 20 },
  { label: '$0.50 Cash',    type: 'cash',   amount: 0.50,  weight: 20 },
  { label: '$1.00 Cash',    type: 'cash',   amount: 1.00,  weight: 10 },
  { label: '50 Points',     type: 'points', amount: 50,    weight: 15 },
  { label: '100 Points',    type: 'points', amount: 100,   weight: 10 },
  { label: '3 Free Spins',  type: 'freespins', amount: 3,  weight: 15 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pickSegment() {
  const total = SEGMENTS.reduce(function(s, seg) { return s + seg.weight; }, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return SEGMENTS.length - 1;
}

// Schema bootstrap
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  try { await db.run('ALTER TABLE users ADD COLUMN fortune_wheel_last TEXT'); } catch (_) {}
  // Ensure free_spins_remaining column exists (may be added by freespins routes)
  try { await db.run('ALTER TABLE users ADD COLUMN free_spins_remaining INTEGER DEFAULT 0'); } catch (_) {}
  // Ensure loyalty_points column exists
  try { await db.run('ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 0'); } catch (_) {}
  schemaReady = true;
}

// GET /status
router.get('/status', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const user = await db.get('SELECT fortune_wheel_last FROM users WHERE id = ?', [req.user.id]);
    const lastSpin = user ? user.fortune_wheel_last : null;
    const available = lastSpin !== todayStr();
    return res.json({ available, lastSpin, segments: SEGMENTS.map(function(s, i) { return { index: i, label: s.label, type: s.type }; }) });
  } catch (err) {
    console.warn('[FortuneWheel] GET /status error:', err.message);
    return res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /spin
router.post('/spin', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;
    const user = await db.get('SELECT fortune_wheel_last, balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = todayStr();
    if (user.fortune_wheel_last === today) {
      return res.status(429).json({ error: 'Already spun today', available: false });
    }

    // Atomic guard: claim today's spin only if not already claimed (prevents race condition)
    const claimGuard = await db.run(
      "UPDATE users SET fortune_wheel_last = ? WHERE id = ? AND (fortune_wheel_last IS NULL OR fortune_wheel_last != ?)",
      [today, userId, today]
    );
    if (!claimGuard || claimGuard.changes === 0) {
      return res.status(429).json({ error: 'Already spun today', available: false });
    }

    const segIdx = pickSegment();
    const seg = SEGMENTS[segIdx];

    // Credit reward
    let newBalance = parseFloat(user.balance) || 0;
    if (seg.type === 'cash') {
      // fortune_wheel_last already set by atomic guard above
      await db.run('UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ? WHERE id = ?', [seg.amount, seg.amount * 15, userId]);
      await db.run(
        "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
        [userId, seg.amount, 'Fortune Wheel reward: ' + seg.label + ' (bonus, 15x wagering)']
      );
      const u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
      newBalance = u ? parseFloat(u.balance) : newBalance + seg.amount;
    } else if (seg.type === 'points') {
      // fortune_wheel_last already set by atomic guard above
      await db.run(
        'UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?',
        [seg.amount, userId]
      );
    } else if (seg.type === 'freespins') {
      // fortune_wheel_last already set by atomic guard above
      await db.run(
        'UPDATE users SET free_spins_remaining = COALESCE(free_spins_remaining, 0) + ? WHERE id = ?',
        [seg.amount, userId]
      );
    }

    // fortune_wheel_last already set by atomic guard at the top

    return res.json({
      success: true,
      segmentIndex: segIdx,
      reward: { type: seg.type, amount: seg.amount, label: seg.label },
      newBalance,
    });
  } catch (err) {
    console.warn('[FortuneWheel] POST /spin error:', err.message);
    return res.status(500).json({ error: 'Failed to spin' });
  }
});

module.exports = router;
