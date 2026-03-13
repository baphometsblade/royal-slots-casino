'use strict';

/**
 * Weekly Slot Tournament routes
 *
 * POST /api/tournament/record      -- record a spin result (auth required)
 * GET  /api/tournament/leaderboard -- top-20 for current week (public)
 * GET  /api/tournament/mystats     -- caller stats + rank (auth required)
 */

const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const db       = require('../database');
const { JWT_SECRET } = require('../config');

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function verifyToken(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  const isPg = !!process.env.DATABASE_URL;
  const idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  await db.run(
    'CREATE TABLE IF NOT EXISTS tournament_scores (' +
    '  id               ' + idDef + ',' +
    '  user_id          INTEGER NOT NULL,' +
    '  week_start       TEXT    NOT NULL,' +
    '  best_multiplier  REAL    DEFAULT 0,' +
    '  total_wins       REAL    DEFAULT 0,' +
    '  spin_count       INTEGER DEFAULT 0,' +
    '  score            REAL    DEFAULT 0,' +
    "  updated_at       TEXT    DEFAULT (datetime('now'))," +
    '  UNIQUE(user_id, week_start)' +
    ')'
  );
  schemaReady = true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ISO date string (YYYY-MM-DD) of the most recent Monday.
 * Monday is weekday index 1; if today IS Monday, returns today.
 * Example: Wednesday 2026-03-04 -> 2026-03-03
 */
function getWeekStart() {
  const now      = new Date();
  const day      = now.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const daysBack = day === 0 ? 6 : day - 1; // back to nearest Monday
  const monday   = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysBack
  ));
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * ISO string for the NEXT Monday at midnight UTC (next tournament reset).
 */
function getNextReset() {
  const weekStart = getWeekStart();
  const monday    = new Date(weekStart + 'T00:00:00.000Z');
  const next      = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

/**
 * Score formula: big wins weighted heavily, total volume breaks ties.
 *   score = (best_multiplier * 10) + (total_wins * 0.001)
 */
function calcScore(bestMultiplier, totalWins) {
  return (bestMultiplier * 10) + (totalWins * 0.001);
}

/**
 * Full prize table (1-based position -> prize amount USD).
 */
const PRIZES = [
  { position: 1,  amount: 15.00 },
  { position: 2,  amount:  8.00 },
  { position: 3,  amount:  4.00 },
  { position: 4,  amount:  2.00 },
  { position: 5,  amount:  2.00 },
  { position: 6,  amount:  1.00 },
  { position: 7,  amount:  1.00 },
  { position: 8,  amount:  1.00 },
  { position: 9,  amount:  1.00 },
  { position: 10, amount:  1.00 },
];

// ---------------------------------------------------------------------------
// POST /api/tournament/record  -- record a winning spin
// ---------------------------------------------------------------------------

router.post('/record', verifyToken, async (req, res) => {
  try {
    await ensureSchema();

    const { winAmount, betAmount, multiplier } = req.body;

    if (!winAmount || winAmount <= 0) {
      return res.status(400).json({ error: 'winAmount must be > 0' });
    }

    const userId    = req.user.id;
    const weekStart = getWeekStart();
    const newMult   = (typeof multiplier === 'number' && isFinite(multiplier)) ? multiplier : 0;
    const initScore = calcScore(newMult, winAmount);

    // Upsert: insert fresh row OR update existing row on unique-constraint hit.
    // ON CONFLICT recomputes best_multiplier and score atomically in SQL.
    await db.run(
      'INSERT INTO tournament_scores' +
      '  (user_id, week_start, best_multiplier, total_wins, spin_count, score, updated_at)' +
      " VALUES (?, ?, ?, ?, 1, ?, datetime('now'))" +
      ' ON CONFLICT(user_id, week_start) DO UPDATE SET' +
      '   spin_count      = tournament_scores.spin_count + 1,' +
      '   total_wins      = tournament_scores.total_wins + excluded.total_wins,' +
      '   best_multiplier = CASE' +
      '                       WHEN excluded.best_multiplier > tournament_scores.best_multiplier' +
      '                       THEN excluded.best_multiplier' +
      '                       ELSE tournament_scores.best_multiplier' +
      '                     END,' +
      '   score           = (' +
      '                       CASE' +
      '                         WHEN excluded.best_multiplier > tournament_scores.best_multiplier' +
      '                         THEN excluded.best_multiplier' +
      '                         ELSE tournament_scores.best_multiplier' +
      '                       END * 10' +
      '                     ) + (' +
      '                       (tournament_scores.total_wins + excluded.total_wins) * 0.001' +
      '                     ),' +
      "   updated_at      = datetime('now')",
      [userId, weekStart, newMult, winAmount, initScore]
    );

    // Read back the freshly upserted row
    const row = await db.get(
      'SELECT score, best_multiplier FROM tournament_scores WHERE user_id = ? AND week_start = ?',
      [userId, weekStart]
    );

    // Rank = rows with a strictly higher score + 1
    const rankRow = await db.get(
      'SELECT COUNT(*) AS cnt FROM tournament_scores WHERE week_start = ? AND score > ?',
      [weekStart, row.score]
    );

    const rank = (rankRow ? parseInt(rankRow.cnt, 10) : 0) + 1;

    // Grant tournament_win achievement when player reaches #1 (idempotent — fires once)
    if (rank === 1) {
        require('../services/achievement.service').grant(userId, 'tournament_win').catch(function() {});
    }

    return res.json({ recorded: true, score: row.score, rank });
  } catch (err) {
    console.warn('[Tournament] POST /record error:', err.message);
    return res.status(500).json({ error: 'Failed to record tournament score' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tournament/leaderboard  -- top-20 for the current week (public)
// ---------------------------------------------------------------------------

router.get('/leaderboard', async (req, res) => {
  try {
    await ensureSchema();

    const weekStart = getWeekStart();

    const rows = await db.all(
      'SELECT' +
      '  ts.score,' +
      '  ts.best_multiplier,' +
      '  ts.total_wins,' +
      '  ts.spin_count,' +
      '  COALESCE(u.display_name, u.username) AS username' +
      ' FROM tournament_scores ts' +
      ' JOIN users u ON u.id = ts.user_id' +
      ' WHERE ts.week_start = ?' +
      ' ORDER BY ts.score DESC' +
      ' LIMIT 20',
      [weekStart]
    );

    const leaderboard = rows.map((row, idx) => ({
      rank:           idx + 1,
      username:       row.username,
      score:          row.score,
      bestMultiplier: row.best_multiplier,
      totalWins:      row.total_wins,
      spinCount:      row.spin_count,
    }));

    return res.json({ weekStart, leaderboard });
  } catch (err) {
    console.warn('[Tournament] GET /leaderboard error:', err.message);
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tournament/mystats  -- caller stats + rank (auth required)
// ---------------------------------------------------------------------------

router.get('/mystats', verifyToken, async (req, res) => {
  try {
    await ensureSchema();

    const userId    = req.user.id;
    const weekStart = getWeekStart();
    const nextReset = getNextReset();

    const row = await db.get(
      'SELECT score, best_multiplier, total_wins, spin_count' +
      ' FROM tournament_scores' +
      ' WHERE user_id = ? AND week_start = ?',
      [userId, weekStart]
    );

    let myStats = null;
    if (row) {
      const rankRow = await db.get(
        'SELECT COUNT(*) AS cnt FROM tournament_scores WHERE week_start = ? AND score > ?',
        [weekStart, row.score]
      );
      const rank = (rankRow ? parseInt(rankRow.cnt, 10) : 0) + 1;
      myStats = {
        score:          row.score,
        rank,
        bestMultiplier: row.best_multiplier,
        totalWins:      row.total_wins,
        spinCount:      row.spin_count,
      };
    }

    return res.json({
      weekStart,
      myStats,
      prizes:    PRIZES,
      nextReset,
    });
  } catch (err) {
    console.warn('[Tournament] GET /mystats error:', err.message);
    return res.status(500).json({ error: 'Failed to load tournament stats' });
  }
});

// ---------------------------------------------------------------------------
// Compatibility layer — existing ui-tournament.js expects list/join/id-leaderboard
// ---------------------------------------------------------------------------

// GET /  — list tournaments (weekly leaderboard presented as active tournament)
router.get('/', async (req, res) => {
  try {
    await ensureSchema();
    const weekStart = getWeekStart();
    const countRow  = await db.get(
      'SELECT COUNT(*) AS cnt FROM tournament_scores WHERE week_start = ?',
      [weekStart]
    );
    const PRIZE_TOTAL = PRIZES.reduce(function (sum, p) { return sum + p.amount; }, 0);

    const active = [{
      id:          weekStart,
      name:        'Weekly Spin Champion',
      type:        'weekly',
      status:      'active',
      prize_pool:  PRIZE_TOTAL,
      entry_fee:   0,
      entry_count: countRow ? parseInt(countRow.cnt, 10) : 0,
      ends_at:     getNextReset(),
      starts_at:   weekStart + 'T00:00:00.000Z',
    }];

    return res.json({ active, upcoming: [] });
  } catch (err) {
    console.warn('[Tournament] GET / error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// GET /:id/leaderboard  — per-tournament leaderboard (uses current week)
router.get('/:id/leaderboard', async (req, res) => {
  try {
    await ensureSchema();
    const weekStart = getWeekStart();

    const rows = await db.all(
      'SELECT ts.score, ts.best_multiplier, ts.total_wins, ts.spin_count,' +
      '       COALESCE(u.display_name, u.username) AS username, u.id AS user_id' +
      ' FROM tournament_scores ts' +
      ' JOIN users u ON u.id = ts.user_id' +
      ' WHERE ts.week_start = ?' +
      ' ORDER BY ts.score DESC LIMIT 20',
      [weekStart]
    );

    const leaderboard = rows.map(function (row, idx) {
      return {
        rank:           idx + 1,
        username:       row.username,
        user_id:        row.user_id,
        score:          row.score,
        bestMultiplier: row.best_multiplier,
        totalWins:      row.total_wins,
        spinCount:      row.spin_count,
      };
    });

    return res.json({ weekStart, leaderboard });
  } catch (err) {
    console.warn('[Tournament] GET /:id/leaderboard error:', err.message);
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// POST /:id/join  — weekly tournament auto-enrolment
router.post('/:id/join', verifyToken, async (req, res) => {
  return res.json({ joined: true, message: 'You\'re enrolled in the weekly tournament — spin to climb the leaderboard!' });
});

// ---------------------------------------------------------------------------

module.exports = router;
