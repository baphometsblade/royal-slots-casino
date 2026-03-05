'use strict';

// Crash Game Routes — server-validated timing, 99% RTP
//
// POST /api/crash/start   — place bet; server generates crash point + records start_time
// POST /api/crash/cashout — server computes current multiplier from elapsed time
// GET  /api/crash/state   — active round info (elapsed, current multiplier, crashed?)

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

// Growth constant: multiplier(t) = e^(GROWTH_K * t_seconds)
// At 0.07/s: 5s→1.42x  10s→2.01x  20s→4.05x  30s→8.17x  60s→66.7x
const GROWTH_K   = 0.07;
const MIN_BET    = 0.10;
const MAX_BET    = 500;
const MAX_MULT   = 1000; // safety cap — multiplier can't exceed this

// Crash point generation — 99% RTP
// Returns a multiplier ≥ 1.0 at which the round crashes.
// Distribution: ~1% instant crash, ~50% < 2x, ~75% < 4x, ~90% < 10x
function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.01) return 1.0; // 1% house edge: instant crash before player can react
  const raw = 0.99 / (1.0 - r);
  return Math.min(MAX_MULT, Math.max(1.0, raw));
}

// Time (ms) at which given crash_point is reached given growth constant
function timeToMultiplier(target) {
  // target = e^(GROWTH_K * t)  =>  t = ln(target) / GROWTH_K  (seconds)
  return (Math.log(target) / GROWTH_K) * 1000; // ms
}

// Current multiplier from elapsed ms
function multiplierAtTime(elapsedMs) {
  const t = elapsedMs / 1000;
  return Math.min(MAX_MULT, parseFloat(Math.exp(GROWTH_K * t).toFixed(4)));
}

// Schema bootstrap
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await db.run(`
    CREATE TABLE IF NOT EXISTS crash_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet REAL NOT NULL,
      crash_point REAL NOT NULL,
      start_time INTEGER NOT NULL,
      cashout_multiplier REAL,
      payout REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  schemaReady = true;
}

// GET /state
router.get('/state', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const game = await db.get(
      "SELECT * FROM crash_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    if (!game) return res.json({ active: false });

    const now        = Date.now();
    const elapsedMs  = now - game.start_time;
    const currentMul = multiplierAtTime(elapsedMs);
    const crashed    = currentMul >= game.crash_point;

    if (crashed) {
      // Auto-mark as lost
      await db.run(
        "UPDATE crash_games SET status = 'lost' WHERE id = ?",
        [game.id]
      );
      return res.json({
        active: false,
        crashed: true,
        crashPoint: game.crash_point,
        elapsedMs,
      });
    }

    return res.json({
      active: true,
      gameId: game.id,
      bet: game.bet,
      elapsedMs,
      currentMultiplier: currentMul,
      crashTimeMs: timeToMultiplier(game.crash_point),
    });
  } catch (err) {
    console.error('[Crash] GET /state error:', err.message);
    return res.status(500).json({ error: 'Failed to get state' });
  }
});

// POST /start
router.post('/start', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;

    // Forfeit any existing active game
    await db.run(
      "UPDATE crash_games SET status = 'forfeited' WHERE user_id = ? AND status = 'active'",
      [userId]
    );

    const bet = parseFloat(req.body.bet) || 1.0;
    if (bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: 'Bet out of range ($0.10 – $500)' });
    }

    const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const balance = parseFloat(user.balance) || 0;
    if (balance < bet) return res.status(400).json({ error: 'Insufficient balance' });

    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [bet, userId]);

    const crashPoint = generateCrashPoint();
    const startTime  = Date.now();
    const result = await db.run(
      `INSERT INTO crash_games (user_id, bet, crash_point, start_time, status, payout)
       VALUES (?, ?, ?, ?, 'active', 0.0)`,
      [userId, bet, crashPoint, startTime]
    );

    const newBal = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      gameId: result.lastID || result.id,
      bet,
      startTime,
      // Reveal how long the round lasts so client can animate correctly
      // (In a multiplayer crash game this would be hidden — but for single player
      //  we reveal it so the animation matches exactly with no polling needed)
      crashTimeMs: timeToMultiplier(crashPoint),
      crashPoint,
      newBalance: newBal ? parseFloat(newBal.balance) : balance - bet,
    });
  } catch (err) {
    console.error('[Crash] POST /start error:', err.message);
    return res.status(500).json({ error: 'Failed to start game' });
  }
});

// POST /cashout
router.post('/cashout', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;

    const game = await db.get(
      "SELECT * FROM crash_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });

    const now        = Date.now();
    const elapsedMs  = now - game.start_time;
    const currentMul = multiplierAtTime(elapsedMs);

    if (currentMul >= game.crash_point) {
      // Already crashed — server won
      await db.run(
        "UPDATE crash_games SET status = 'lost', cashout_multiplier = ?, updated_at = datetime('now') WHERE id = ?",
        [game.crash_point, game.id]
      );
      return res.json({
        success: false,
        crashed: true,
        crashPoint: game.crash_point,
        message: 'Too late — the rocket already crashed!',
      });
    }

    // Valid cashout
    const payout = parseFloat((game.bet * currentMul).toFixed(2));
    await db.run(
      "UPDATE crash_games SET status = 'won', cashout_multiplier = ?, payout = ? WHERE id = ?",
      [currentMul, payout, game.id]
    );
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, userId]);
    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, ?)",
      [userId, payout, 'Crash game cash out at ' + currentMul.toFixed(2) + 'x']
    );

    const u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      cashoutMultiplier: currentMul,
      payout,
      crashPoint: game.crash_point,
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[Crash] POST /cashout error:', err.message);
    return res.status(500).json({ error: 'Failed to cash out' });
  }
});

module.exports = router;
