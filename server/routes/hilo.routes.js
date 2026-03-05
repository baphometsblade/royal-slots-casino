'use strict';

// Hi-Lo Card Game Routes — 97% RTP, server-validated guesses
//
// POST /api/hilo/start    { bet }             — deal first card, deduct bet
// POST /api/hilo/cashout                      — pay out current multiplier
// GET  /api/hilo/state                        — active game state

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

const MIN_BET = 0.10;
const MAX_BET = 500;
const RTP     = 0.97;
const CARDS   = 13; // A(1) through K(13)

// Payout multiplier for a correct guess given current card value
// higher: (13 - card) winning cards out of 13
// lower:  (card - 1) winning cards out of 13
// tie (equal card) counts as a loss for simplicity
function calcMultiplier(card, direction) {
  var wins = direction === 'higher' ? (CARDS - card) : (card - 1);
  if (wins <= 0) return null; // impossible guess
  return parseFloat((RTP * CARDS / wins).toFixed(4));
}

function dealCard() {
  return Math.floor(Math.random() * CARDS) + 1; // 1-13
}

function cardLabel(v) {
  if (v === 1)  return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

// Schema bootstrap
var schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await db.run(`
    CREATE TABLE IF NOT EXISTS hilo_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet REAL NOT NULL,
      current_card INTEGER NOT NULL,
      multiplier REAL NOT NULL DEFAULT 1.0,
      rounds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      payout REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  schemaReady = true;
}

// GET /state
router.get('/state', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var game = await db.get(
      "SELECT * FROM hilo_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    if (!game) return res.json({ active: false });
    return res.json({
      active: true,
      gameId: game.id,
      bet: game.bet,
      card: game.current_card,
      cardLabel: cardLabel(game.current_card),
      multiplier: game.multiplier,
      rounds: game.rounds,
      higherMult: calcMultiplier(game.current_card, 'higher'),
      lowerMult:  calcMultiplier(game.current_card, 'lower'),
    });
  } catch (err) {
    console.error('[HiLo] GET /state error:', err.message);
    return res.status(500).json({ error: 'Failed to get state' });
  }
});

// POST /start
router.post('/start', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId = req.user.id;

    // Forfeit any existing active game
    await db.run(
      "UPDATE hilo_games SET status = 'forfeited' WHERE user_id = ? AND status = 'active'",
      [userId]
    );

    var bet = parseFloat(req.body.bet) || 1.0;
    if (bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: 'Bet out of range ($0.10 – $500)' });
    }

    var user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    var balance = parseFloat(user.balance) || 0;
    if (balance < bet) return res.status(400).json({ error: 'Insufficient balance' });

    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [bet, userId]);

    var card   = dealCard();
    var result = await db.run(
      "INSERT INTO hilo_games (user_id, bet, current_card, multiplier, rounds, status, payout) VALUES (?, ?, ?, 1.0, 0, 'active', 0.0)",
      [userId, bet, card]
    );

    var u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      gameId: result.lastID || result.id,
      bet,
      card,
      cardLabel: cardLabel(card),
      multiplier: 1.0,
      rounds: 0,
      higherMult: calcMultiplier(card, 'higher'),
      lowerMult:  calcMultiplier(card, 'lower'),
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[HiLo] POST /start error:', err.message);
    return res.status(500).json({ error: 'Failed to start game' });
  }
});

// POST /guess
router.post('/guess', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId    = req.user.id;
    var direction = req.body.direction; // 'higher' | 'lower'

    if (direction !== 'higher' && direction !== 'lower') {
      return res.status(400).json({ error: 'direction must be higher or lower' });
    }

    var game = await db.get(
      "SELECT * FROM hilo_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });

    var mult = calcMultiplier(game.current_card, direction);
    if (mult === null) {
      return res.status(400).json({ error: 'That guess is impossible for this card' });
    }

    var nextCard   = dealCard();
    var correct    = direction === 'higher'
      ? nextCard > game.current_card
      : nextCard < game.current_card;

    if (!correct) {
      // Wrong guess — lose
      await db.run(
        "UPDATE hilo_games SET status = 'lost', current_card = ? WHERE id = ?",
        [nextCard, game.id]
      );
      return res.json({
        correct: false,
        nextCard,
        nextCardLabel: cardLabel(nextCard),
        prevCard: game.current_card,
        direction,
        gameOver: true,
        payout: 0,
      });
    }

    // Correct — multiply
    var newMult   = parseFloat((game.multiplier * mult).toFixed(4));
    var newRounds = game.rounds + 1;

    await db.run(
      "UPDATE hilo_games SET current_card = ?, multiplier = ?, rounds = ? WHERE id = ?",
      [nextCard, newMult, newRounds, game.id]
    );

    return res.json({
      correct: true,
      nextCard,
      nextCardLabel: cardLabel(nextCard),
      prevCard: game.current_card,
      direction,
      gameOver: false,
      multiplier: newMult,
      rounds: newRounds,
      higherMult: calcMultiplier(nextCard, 'higher'),
      lowerMult:  calcMultiplier(nextCard, 'lower'),
    });
  } catch (err) {
    console.error('[HiLo] POST /guess error:', err.message);
    return res.status(500).json({ error: 'Failed to process guess' });
  }
});

// POST /cashout
router.post('/cashout', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId = req.user.id;

    var game = await db.get(
      "SELECT * FROM hilo_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });
    if (game.rounds === 0) {
      return res.status(400).json({ error: 'Guess at least once before cashing out' });
    }

    var payout = parseFloat((game.bet * game.multiplier).toFixed(2));
    await db.run(
      "UPDATE hilo_games SET status = 'won', payout = ? WHERE id = ?",
      [payout, game.id]
    );
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, userId]);
    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, ?)",
      [userId, payout, 'Hi-Lo cash out at ' + game.multiplier + 'x (' + game.rounds + ' rounds)']
    );

    var u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      multiplier: game.multiplier,
      payout,
      rounds: game.rounds,
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[HiLo] POST /cashout error:', err.message);
    return res.status(500).json({ error: 'Failed to cash out' });
  }
});

module.exports = router;
