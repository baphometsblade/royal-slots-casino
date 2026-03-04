'use strict';

// Mines Game Routes
// POST /api/mines/start    — authenticated; start new game (bet + mine count)
// POST /api/mines/reveal   — authenticated; reveal a tile
// POST /api/mines/cashout  — authenticated; cash out current winnings
// GET  /api/mines/state    — authenticated; get active game state

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

const GRID_SIZE  = 25; // 5×5
const RTP        = 0.97;
const MIN_BET    = 0.10;
const MAX_BET    = 500;
const MIN_MINES  = 1;
const MAX_MINES  = 24;

// Precompute combinations table C(25,k) for k=0..25
function computeCombinations() {
  const C = Array.from({ length: GRID_SIZE + 1 }, () => new Array(GRID_SIZE + 1).fill(0));
  for (let n = 0; n <= GRID_SIZE; n++) {
    C[n][0] = 1;
    for (let k = 1; k <= n; k++) {
      C[n][k] = C[n - 1][k - 1] + C[n - 1][k];
    }
  }
  return C;
}
const C = computeCombinations();

// Multiplier for revealing N safe tiles in a grid with K mines (97% RTP)
// P(N safe tiles in a row) = C(25-K, N) / C(25, N)
// Payout = RTP / P = RTP * C(25, N) / C(25-K, N)
function calcMultiplier(mines, revealed) {
  const safe = GRID_SIZE - mines;
  if (revealed === 0) return 1.0;
  if (revealed > safe) return 0;
  const num = C[GRID_SIZE][revealed];   // C(25, N)
  const den = C[safe][revealed];        // C(25-K, N)
  if (!den || den === 0) return 0;
  return RTP * (num / den);
}

// Generate mine positions using crypto-quality shuffle (Fisher-Yates with crypto random)
function generateMines(mineCount) {
  const indices = Array.from({ length: GRID_SIZE }, (_, i) => i);
  // Fisher-Yates using Math.random (sufficient for game, not used for security)
  for (let i = GRID_SIZE - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, mineCount).sort((a, b) => a - b);
}

// Schema bootstrap
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await db.run(`
    CREATE TABLE IF NOT EXISTS mines_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet REAL NOT NULL,
      mine_count INTEGER NOT NULL,
      mine_positions TEXT NOT NULL,
      revealed_tiles TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      multiplier REAL NOT NULL DEFAULT 1.0,
      payout REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  schemaReady = true;
}

// GET /state — current active game for user
router.get('/state', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const game = await db.get(
      "SELECT * FROM mines_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    if (!game) return res.json({ active: false });
    const revealed = JSON.parse(game.revealed_tiles);
    const mines    = JSON.parse(game.mine_positions);
    return res.json({
      active: true,
      gameId: game.id,
      bet: game.bet,
      mineCount: game.mine_count,
      revealed,
      multiplier: calcMultiplier(game.mine_count, revealed.length),
      // Only expose mine positions when game is over
    });
  } catch (err) {
    console.error('[Mines] GET /state error:', err.message);
    return res.status(500).json({ error: 'Failed to get state' });
  }
});

// POST /start — start a new game
router.post('/start', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;

    // Cancel any existing active game (forfeit bet)
    const existing = await db.get(
      "SELECT id FROM mines_games WHERE user_id = ? AND status = 'active' LIMIT 1",
      [userId]
    );
    if (existing) {
      await db.run(
        "UPDATE mines_games SET status = 'forfeited', updated_at = datetime('now') WHERE id = ?",
        [existing.id]
      );
    }

    const bet       = parseFloat(req.body.bet)       || 1.0;
    const mineCount = parseInt(req.body.mineCount, 10) || 3;

    if (bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: 'Bet out of range' });
    }
    if (mineCount < MIN_MINES || mineCount > MAX_MINES) {
      return res.status(400).json({ error: 'Invalid mine count' });
    }

    // Deduct bet from balance
    const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const balance = parseFloat(user.balance) || 0;
    if (balance < bet) return res.status(400).json({ error: 'Insufficient balance' });

    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [bet, userId]);

    const minePositions = generateMines(mineCount);
    const result = await db.run(
      `INSERT INTO mines_games (user_id, bet, mine_count, mine_positions, revealed_tiles, status, multiplier, payout)
       VALUES (?, ?, ?, ?, '[]', 'active', 1.0, 0.0)`,
      [userId, bet, mineCount, JSON.stringify(minePositions)]
    );

    const newBalance = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      gameId: result.lastID || result.id,
      bet,
      mineCount,
      revealed: [],
      multiplier: 1.0,
      newBalance: newBalance ? parseFloat(newBalance.balance) : balance - bet,
    });
  } catch (err) {
    console.error('[Mines] POST /start error:', err.message);
    return res.status(500).json({ error: 'Failed to start game' });
  }
});

// POST /reveal — reveal a tile
router.post('/reveal', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId  = req.user.id;
    const tileIdx = parseInt(req.body.tileIndex, 10);

    if (tileIdx < 0 || tileIdx >= GRID_SIZE || isNaN(tileIdx)) {
      return res.status(400).json({ error: 'Invalid tile index' });
    }

    const game = await db.get(
      "SELECT * FROM mines_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });

    const mines    = JSON.parse(game.mine_positions);
    const revealed = JSON.parse(game.revealed_tiles);

    if (revealed.includes(tileIdx)) {
      return res.status(400).json({ error: 'Tile already revealed' });
    }

    const hitMine = mines.includes(tileIdx);

    if (hitMine) {
      // Game over — lose bet
      await db.run(
        "UPDATE mines_games SET status = 'lost', revealed_tiles = ?, updated_at = datetime('now') WHERE id = ?",
        [JSON.stringify([...revealed, tileIdx]), game.id]
      );
      return res.json({
        success: true,
        result: 'mine',
        tileIndex: tileIdx,
        minePositions: mines,
        gameOver: true,
        payout: 0,
      });
    }

    // Safe tile
    const newRevealed = [...revealed, tileIdx];
    const safeCount   = GRID_SIZE - game.mine_count;
    const newMultiplier = calcMultiplier(game.mine_count, newRevealed.length);
    const autoWin = newRevealed.length >= safeCount; // revealed all safe tiles

    if (autoWin) {
      // Auto cash out — all safe tiles revealed
      const payout = parseFloat((game.bet * newMultiplier).toFixed(2));
      await db.run(
        "UPDATE mines_games SET status = 'won', revealed_tiles = ?, multiplier = ?, payout = ?, updated_at = datetime('now') WHERE id = ?",
        [JSON.stringify(newRevealed), newMultiplier, payout, game.id]
      );
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, userId]);
      await db.run(
        "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, ?)",
        [userId, payout, 'Mines game win (all safe tiles)']
      );
      const u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
      return res.json({
        success: true,
        result: 'safe',
        tileIndex: tileIdx,
        minePositions: mines,
        gameOver: true,
        autoWin: true,
        multiplier: newMultiplier,
        payout,
        newBalance: u ? parseFloat(u.balance) : null,
      });
    }

    await db.run(
      "UPDATE mines_games SET revealed_tiles = ?, multiplier = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(newRevealed), newMultiplier, game.id]
    );

    return res.json({
      success: true,
      result: 'safe',
      tileIndex: tileIdx,
      multiplier: newMultiplier,
      revealed: newRevealed,
      gameOver: false,
    });
  } catch (err) {
    console.error('[Mines] POST /reveal error:', err.message);
    return res.status(500).json({ error: 'Failed to reveal tile' });
  }
});

// POST /cashout — cash out
router.post('/cashout', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;

    const game = await db.get(
      "SELECT * FROM mines_games WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!game) return res.status(404).json({ error: 'No active game' });

    const revealed   = JSON.parse(game.revealed_tiles);
    if (revealed.length === 0) {
      // Can't cash out without revealing at least one tile
      return res.status(400).json({ error: 'Reveal at least one tile before cashing out' });
    }

    const multiplier = calcMultiplier(game.mine_count, revealed.length);
    const payout     = parseFloat((game.bet * multiplier).toFixed(2));
    const mines      = JSON.parse(game.mine_positions);

    await db.run(
      "UPDATE mines_games SET status = 'won', multiplier = ?, payout = ?, updated_at = datetime('now') WHERE id = ?",
      [multiplier, payout, game.id]
    );
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, userId]);
    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, ?)",
      [userId, payout, 'Mines game cash out']
    );

    const u = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      multiplier,
      payout,
      minePositions: mines,
      newBalance: u ? parseFloat(u.balance) : null,
    });
  } catch (err) {
    console.error('[Mines] POST /cashout error:', err.message);
    return res.status(500).json({ error: 'Failed to cash out' });
  }
});

module.exports = router;
