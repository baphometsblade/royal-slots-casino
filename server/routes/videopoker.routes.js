'use strict';

// Video Poker — Jacks or Better, 9/6 full-pay table (~99.5% RTP)
// Routes:
//   GET  /api/videopoker/state          — active game state (dealt hand, awaiting draw)
//   POST /api/videopoker/deal   {bet}   — deal 5 cards, deduct bet
//   POST /api/videopoker/draw   {holds} — replace non-held cards, evaluate & payout

const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { authenticate } = require('../middleware/auth');

const MIN_BET = 0.25;
const MAX_BET = 100;

// 9/6 full-pay multipliers (applied to bet)
const PAY_TABLE = {
  royal_flush:     800,
  straight_flush:  50,
  four_of_a_kind:  25,
  full_house:       9,
  flush:            6,
  straight:         4,
  three_of_a_kind:  3,
  two_pair:         2,
  jacks_or_better:  1,
  nothing:          0,
};

const SUITS  = ['H', 'D', 'C', 'S'];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
// 1=A, 11=J, 12=Q, 13=K

// ── helpers ──────────────────────────────────────────────────────────────────

function buildDeck() {
  var deck = [];
  for (var s = 0; s < SUITS.length; s++) {
    for (var vi = 0; vi < VALUES.length; vi++) {
      deck.push({ s: SUITS[s], v: VALUES[vi] });
    }
  }
  // Fisher-Yates shuffle
  for (var i = deck.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

function cardLabel(v) {
  if (v === 1)  return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

function publicCard(c) {
  return { s: c.s, v: c.v, l: cardLabel(c.v) };
}

// ── hand evaluator ──────────────────────────────────────────────────────────

function evaluateHand(hand) {
  // hand: array of 5 {s, v} objects
  var vals   = hand.map(function(c) { return c.v; }).sort(function(a, b) { return a - b; });
  var suits  = hand.map(function(c) { return c.s; });
  var isFlush = suits.every(function(s) { return s === suits[0]; });

  // Count occurrences of each value
  var counts = {};
  vals.forEach(function(v) { counts[v] = (counts[v] || 0) + 1; });
  var groups = Object.values(counts).sort(function(a, b) { return b - a; });

  // Straight check (ace-low A-2-3-4-5 and ace-high 10-J-Q-K-A)
  function isStraight(v) {
    var sorted = v.slice();
    // Ace-low: [1,2,3,4,5]
    if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3 && sorted[3] === 4 && sorted[4] === 5) {
      return true;
    }
    // Ace-high: [1,10,11,12,13]
    if (sorted[0] === 1 && sorted[1] === 10 && sorted[2] === 11 && sorted[3] === 12 && sorted[4] === 13) {
      return true;
    }
    // Normal sequential
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  }

  var straight = isStraight(vals);

  // Royal flush: ace-high straight flush
  if (isFlush && vals[0] === 1 && vals[1] === 10 && vals[2] === 11 && vals[3] === 12 && vals[4] === 13) {
    return 'royal_flush';
  }
  if (isFlush && straight)          return 'straight_flush';
  if (groups[0] === 4)              return 'four_of_a_kind';
  if (groups[0] === 3 && groups[1] === 2) return 'full_house';
  if (isFlush)                      return 'flush';
  if (straight)                     return 'straight';
  if (groups[0] === 3)              return 'three_of_a_kind';
  if (groups[0] === 2 && groups[1] === 2) return 'two_pair';

  // Jacks or better: a pair of J, Q, K, or A (v===1,11,12,13)
  if (groups[0] === 2) {
    var HIGH_VALS = { 1: true, 11: true, 12: true, 13: true };
    var valKeys = Object.keys(counts);
    for (var k = 0; k < valKeys.length; k++) {
      if (counts[valKeys[k]] === 2 && HIGH_VALS[valKeys[k]]) {
        return 'jacks_or_better';
      }
    }
  }

  return 'nothing';
}

// ── schema ────────────────────────────────────────────────────────────────────

var schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await db.run(
    'CREATE TABLE IF NOT EXISTS vp_games (' +
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '  user_id INTEGER NOT NULL,' +
    '  bet REAL NOT NULL,' +
    '  deck TEXT NOT NULL,' +
    '  hand TEXT NOT NULL,' +
    '  status TEXT NOT NULL DEFAULT \'dealt\',' +
    '  result TEXT,' +
    '  payout REAL NOT NULL DEFAULT 0,' +
    '  created_at TEXT DEFAULT (datetime(\'now\'))' +
    ')'
  );
  schemaReady = true;
}

// ── GET /state ────────────────────────────────────────────────────────────────

router.get('/state', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var game = await db.get(
      "SELECT * FROM vp_games WHERE user_id = ? AND status = 'dealt' ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    if (!game) return res.json({ active: false });
    var hand = JSON.parse(game.hand);
    return res.json({
      active:  true,
      gameId:  game.id,
      bet:     game.bet,
      hand:    hand.map(publicCard),
      holds:   [false, false, false, false, false],
    });
  } catch (err) {
    console.error('[VP] GET /state error:', err.message);
    return res.status(500).json({ error: 'Failed to get state' });
  }
});

// ── POST /deal ────────────────────────────────────────────────────────────────

router.post('/deal', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId = req.user.id;

    // Forfeit any dangling dealt game (didn't draw)
    await db.run(
      "UPDATE vp_games SET status = 'forfeited' WHERE user_id = ? AND status = 'dealt'",
      [userId]
    );

    var bet = parseFloat(req.body.bet) || 1.0;
    if (bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: 'Bet out of range ($0.25 – $100)' });
    }

    var user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    var balance = parseFloat(user.balance) || 0;
    if (balance < bet) return res.status(400).json({ error: 'Insufficient balance' });

    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [bet, userId]);

    var deck = buildDeck();
    var hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

    var result = await db.run(
      'INSERT INTO vp_games (user_id, bet, deck, hand, status) VALUES (?,?,?,?,?)',
      [userId, bet, JSON.stringify(deck), JSON.stringify(hand), 'dealt']
    );
    var gameId = result.lastID || result.id;

    var u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success:    true,
      gameId:     gameId,
      bet:        bet,
      hand:       hand.map(publicCard),
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[VP] POST /deal error:', err.message);
    return res.status(500).json({ error: 'Failed to deal' });
  }
});

// ── POST /draw ────────────────────────────────────────────────────────────────

router.post('/draw', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    var userId = req.user.id;

    var game = await db.get(
      "SELECT * FROM vp_games WHERE user_id = ? AND status = 'dealt' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });

    var holds = req.body.holds;
    if (!Array.isArray(holds) || holds.length !== 5) {
      return res.status(400).json({ error: 'holds must be array of 5 booleans' });
    }

    var deck = JSON.parse(game.deck);
    var hand = JSON.parse(game.hand);

    // Replace non-held cards
    for (var i = 0; i < 5; i++) {
      if (!holds[i]) {
        hand[i] = deck.pop();
      }
    }

    var handResult = evaluateHand(hand);
    var multiplier = PAY_TABLE[handResult] || 0;
    var payout     = parseFloat((game.bet * multiplier).toFixed(2));

    await db.run(
      'UPDATE vp_games SET deck=?, hand=?, status=?, result=?, payout=? WHERE id=?',
      [JSON.stringify(deck), JSON.stringify(hand), 'drawn', handResult, payout, game.id]
    );

    if (payout > 0) {
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, userId]);
      var profit = parseFloat((payout - game.bet).toFixed(2));
      if (profit > 0) {
        await db.run(
          "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, 'Video Poker win')",
          [userId, profit]
        ).catch(function() {});
      }
    }

    var u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success:    true,
      gameId:     game.id,
      bet:        game.bet,
      hand:       hand.map(publicCard),
      holds:      holds,
      result:     handResult,
      payout:     payout,
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[VP] POST /draw error:', err.message);
    return res.status(500).json({ error: 'Failed to draw' });
  }
});

module.exports = router;
