'use strict';

// Daily Missions Routes
// GET  /api/dailymissions -- authenticated; get today's missions with progress
// POST /api/dailymissions/progress  -- authenticated; update progress
// POST /api/dailymissions/claim/:id -- authenticated; claim reward

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

// Mission templates -- 3 randomly assigned per user per day
const MISSION_TEMPLATES = [
  { type: 'spins',  target: 5,   reward_type: 'cash',   reward_amount: 0.50, label: 'Spin 5 times'    },
  { type: 'spins',  target: 10,  reward_type: 'cash',   reward_amount: 1.00, label: 'Spin 10 times'   },
  { type: 'wins',   target: 3,   reward_type: 'cash',   reward_amount: 0.50, label: 'Win 3 times'     },
  { type: 'wins',   target: 5,   reward_type: 'cash',   reward_amount: 1.00, label: 'Win 5 times'     },
  { type: 'bet',    target: 5,   reward_type: 'points', reward_amount: 50,   label: 'Wager $5 total'  },
  { type: 'bet',    target: 10,  reward_type: 'cash',   reward_amount: 0.75, label: 'Wager $10 total' },
  { type: 'spins',  target: 20,  reward_type: 'points', reward_amount: 100,  label: 'Spin 20 times'   },
  { type: 'wins',   target: 10,  reward_type: 'cash',   reward_amount: 1.50, label: 'Win 10 times'    },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Seeded random -- same 3 missions for all users on a given calendar day
function seededPick(seed, arr, count) {
  let s = seed;
  const shuffle = arr.slice();
  for (let i = shuffle.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]];
  }
  return shuffle.slice(0, count);
}

function getDayMissions() {
  const today = todayStr();
  const seed = today.split('-').reduce((acc, n) => acc * 31 + parseInt(n), 0);
  return seededPick(seed, MISSION_TEMPLATES, 3).map((t, i) => ({ ...t, slot: i }));
}

// Schema bootstrap
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await db.run(
    'CREATE TABLE IF NOT EXISTS daily_mission_progress (' +
    '  id            INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '  user_id       INTEGER NOT NULL,' +
    '  mission_date  TEXT    NOT NULL,' +
    '  slot          INTEGER NOT NULL,' +
    '  progress      REAL    DEFAULT 0,' +
    '  completed     INTEGER DEFAULT 0,' +
    '  claimed       INTEGER DEFAULT 0,' +
    '  UNIQUE(user_id, mission_date, slot)' +
    ')'
  );
  // Ensure loyalty_points column exists (may already be present from loyaltyshop)
  try { await db.run('ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 0'); } catch (_) {}
  schemaReady = true;
}

// Merge template missions with DB progress rows
async function getMissionsWithProgress(userId) {
  await ensureSchema();
  const today = todayStr();
  const templates = getDayMissions();
  const rows = await db.all(
    'SELECT slot, progress, completed, claimed FROM daily_mission_progress WHERE user_id = ? AND mission_date = ?',
    [userId, today]
  );
  const bySlot = {};
  rows.forEach(function(r) { bySlot[r.slot] = r; });
  return templates.map(function(t) {
    const r = bySlot[t.slot] || { progress: 0, completed: 0, claimed: 0 };
    return {
      slot: t.slot,
      type: t.type,
      label: t.label,
      target: t.target,
      reward_type: t.reward_type,
      reward_amount: t.reward_amount,
      progress: r.progress || 0,
      completed: !!r.completed,
      claimed: !!r.claimed,
    };
  });
}

// GET / -- list today's missions
router.get('/', authenticate, async function(req, res) {
  try {
    const missions = await getMissionsWithProgress(req.user.id);
    return res.json({ missions, date: todayStr() });
  } catch (err) {
    console.error('[DailyMissions] GET / error:', err.message);
    return res.status(500).json({ error: 'Failed to get missions' });
  }
});

// POST /progress -- update progress after a spin
// Body: { spins: 1, wins: 0|1, betAmount: number }
router.post('/progress', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;
    const today  = todayStr();
    const spins  = parseInt((req.body && req.body.spins)  || 0, 10);
    const wins   = parseInt((req.body && req.body.wins)   || 0, 10);
    const bet    = parseFloat((req.body && req.body.betAmount) || 0);

    const templates = getDayMissions();
    for (const t of templates) {
      let increment = 0;
      if (t.type === 'spins') increment = spins;
      else if (t.type === 'wins')  increment = wins;
      else if (t.type === 'bet')   increment = bet;
      if (increment <= 0) continue;

      const upsertSql = [
        'INSERT INTO daily_mission_progress (user_id, mission_date, slot, progress, completed)',
        'VALUES (?, ?, ?, ?, 0)',
        'ON CONFLICT(user_id, mission_date, slot) DO UPDATE SET',
        '  progress = MIN(daily_mission_progress.progress + ?, ?),',
        '  completed = CASE WHEN MIN(daily_mission_progress.progress + ?, ?) >= ? THEN 1 ELSE completed END',
      ].join(' ');
      await db.run(upsertSql, [userId, today, t.slot, Math.min(increment, t.target),
        increment, t.target,
        increment, t.target, t.target]);
    }

    const missions = await getMissionsWithProgress(userId);
    return res.json({ success: true, missions });
  } catch (err) {
    console.error('[DailyMissions] POST /progress error:', err.message);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
});

// POST /claim/:slot -- claim reward for a completed mission
router.post('/claim/:slot', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;
    const today  = todayStr();
    const slot   = parseInt(req.params.slot, 10);
    const templates = getDayMissions();
    const mission = templates.find(function(t) { return t.slot === slot; });
    if (!mission) return res.status(400).json({ error: 'Invalid mission slot' });

    const row = await db.get(
      'SELECT completed, claimed FROM daily_mission_progress WHERE user_id = ? AND mission_date = ? AND slot = ?',
      [userId, today, slot]
    );
    if (!row || !row.completed) return res.status(400).json({ error: 'Mission not yet completed' });
    if (row.claimed) return res.status(409).json({ error: 'Mission reward already claimed' });

    // Mark as claimed
    await db.run(
      'UPDATE daily_mission_progress SET claimed = 1 WHERE user_id = ? AND mission_date = ? AND slot = ?',
      [userId, today, slot]
    );

    // Credit reward
    let newBalance = null;
    if (mission.reward_type === 'cash') {
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [mission.reward_amount, userId]);
      await db.run(
        "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
        [userId, mission.reward_amount, 'Daily mission reward: ' + mission.label]
      );
      const u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
      newBalance = u ? parseFloat(u.balance) : null;
    } else if (mission.reward_type === 'points') {
      await db.run(
        'UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?',
        [mission.reward_amount, userId]
      );
    }

    return res.json({
      success: true,
      reward_type: mission.reward_type,
      reward_amount: mission.reward_amount,
      newBalance,
    });
  } catch (err) {
    console.error('[DailyMissions] POST /claim error:', err.message);
    return res.status(500).json({ error: 'Failed to claim mission reward' });
  }
});

module.exports = router;
