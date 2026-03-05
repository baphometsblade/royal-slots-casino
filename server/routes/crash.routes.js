'use strict';

// Crash Game — real-time two-phase model (start → cashout), ~99% RTP
//
// GET  /api/crash/state   — last 20 completed results for history display
// POST /api/crash/start   — deduct bet, generate crash point, begin round
// POST /api/crash/cashout — cash out at current multiplier (or bust if too late)
//
// Multiplier formula (matches client): mult = e^(GROWTH_K * elapsed_seconds)
// GROWTH_K = 0.07 → ~3.8x at 20s, ~7.4x at 30s, etc.

const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { authenticate } = require('../middleware/auth');

const MIN_BET    = 0.50;
const MAX_BET    = 500;
const MAX_MULT   = 1000;
const GROWTH_K   = 0.07;   // must match client constant
const GRACE_MS   = 200;    // network grace window for cashout

// Generate crash point — ~99% RTP
function generateCrashPoint() {
  var raw = 99 / (100 * Math.random());
  return Math.min(MAX_MULT, Math.max(1.01, parseFloat(raw.toFixed(2))));
}

// Time in ms at which crash occurs given multiplier
function crashTimeMs(crashPoint) {
  return Math.round((Math.log(crashPoint) / GROWTH_K) * 1000);
}

// Multiplier at elapsed ms
function multAtMs(elapsedMs) {
  return Math.exp(GROWTH_K * elapsedMs / 1000);
}

// ── schema ────────────────────────────────────────────────────────────────────

var schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await db.run(
    'CREATE TABLE IF NOT EXISTS crash_games (' +
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '  user_id INTEGER NOT NULL,' +
    '  bet REAL NOT NULL,' +
    '  crash_point REAL NOT NULL,' +
    '  crash_time_ms INTEGER NOT NULL,' +
    '  start_time INTEGER NOT NULL,' +
    '  cashout_multiplier REAL DEFAULT NULL,' +
    '  status TEXT NOT NULL DEFAULT \'active\',' +
    '  payout REAL NOT NULL DEFAULT 0,' +
    '  created_at TEXT DEFAULT (datetime(\'now\'))' +
    ')'
  );
  schemaReady = true;
}

// ── GET /state — history ──────────────────────────────────────────────────────

router.get('/state', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var rows = await db.all(
      'SELECT id, crash_point, cashout_multiplier, status FROM crash_games ' +
      'WHERE status != \'active\' ORDER BY id DESC LIMIT 20'
    );
    return res.json({ success: true, history: rows });
  } catch (err) {
    console.error('[Crash] GET /state error:', err.message);
    return res.status(500).json({ error: 'Failed to load history' });
  }
});

// ── POST /start ───────────────────────────────────────────────────────────────

router.post('/start', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId = req.user.id;

    // Forfeit any existing active game (player walked away)
    await db.run(
      'UPDATE crash_games SET status=\'forfeited\' WHERE user_id=? AND status=\'active\'',
      [userId]
    );

    var bet = parseFloat(req.body.bet);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: 'Bet must be $' + MIN_BET + ' – $' + MAX_BET });
    }
    bet = parseFloat(bet.toFixed(2));

    var user = await db.get('SELECT balance FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (parseFloat(user.balance) < bet) return res.status(400).json({ error: 'Insufficient balance' });

    await db.run('UPDATE users SET balance = balance - ? WHERE id=?', [bet, userId]);

    var cp        = generateCrashPoint();
    var ctMs      = crashTimeMs(cp);
    var startTime = Date.now();

    await db.run(
      'INSERT INTO crash_games (user_id, bet, crash_point, crash_time_ms, start_time, status) ' +
      'VALUES (?,?,?,?,?,\'active\')',
      [userId, bet, cp, ctMs, startTime]
    );

    var u = await db.get('SELECT balance FROM users WHERE id=?', [userId]);
    return res.json({
      success:      true,
      startTime:    startTime,
      crashTimeMs:  ctMs,
      crashPoint:   cp,
      newBalance:   u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[Crash] POST /start error:', err.message);
    return res.status(500).json({ error: 'Failed to start' });
  }
});

// ── POST /cashout ─────────────────────────────────────────────────────────────

router.post('/cashout', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId = req.user.id;

    var game = await db.get(
      'SELECT * FROM crash_games WHERE user_id=? AND status=\'active\' ORDER BY id DESC LIMIT 1',
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });

    var now     = Date.now();
    var elapsed = now - game.start_time;

    // Check if rocket already crashed (with grace period)
    if (elapsed >= game.crash_time_ms + GRACE_MS) {
      // Too late — player busted
      await db.run(
        'UPDATE crash_games SET status=\'crashed\', cashout_multiplier=NULL WHERE id=?',
        [game.id]
      );
      return res.json({
        success:          true,
        crashed:          true,
        crashPoint:       game.crash_point,
        cashoutMultiplier: null,
        payout:           0,
        newBalance:       null,
      });
    }

    // Cash out at current multiplier (capped at crash point)
    var mult   = Math.min(game.crash_point, parseFloat(multAtMs(elapsed).toFixed(2)));
    var payout = parseFloat((game.bet * mult).toFixed(2));
    var profit = parseFloat((payout - game.bet).toFixed(2));

    await db.run(
      'UPDATE crash_games SET status=\'cashed_out\', cashout_multiplier=?, payout=? WHERE id=?',
      [mult, payout, game.id]
    );

    await db.run('UPDATE users SET balance = balance + ? WHERE id=?', [payout, userId]);

    if (profit > 0) {
      await db.run(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES (?,\'win\',?,?)',
        [userId, profit, 'Crash: cashed out ' + mult + 'x (crashed ' + game.crash_point + 'x)']
      ).catch(function() {});
    }

    var u = await db.get('SELECT balance FROM users WHERE id=?', [userId]);
    return res.json({
      success:           true,
      crashed:           false,
      cashoutMultiplier: mult,
      crashPoint:        game.crash_point,
      payout:            payout,
      profit:            profit,
      newBalance:        u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[Crash] POST /cashout error:', err.message);
    return res.status(500).json({ error: 'Failed to cashout' });
  }
});

module.exports = router;
