'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../config');

const router = express.Router();

// Tier display order: mini → minor → major → grand
const TIER_ORDER = { mini: 0, minor: 1, major: 2, grand: 3 };

function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
}

// ---------------------------------------------------------------------------
// GET /api/jackpot/status  (public — no auth required)
// Returns live pool amounts from jackpot_pool (managed by jackpot.service.js)
// ---------------------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT jp.tier, jp.current_amount, jp.seed_amount, jp.last_won_at,
              u.username AS last_winner_username
       FROM jackpot_pool jp
       LEFT JOIN users u ON jp.last_winner_id = u.id`
    );

    const pools = rows
      .sort((a, b) => (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99))
      .map(row => ({
        tier: row.tier,
        currentAmount: parseFloat(row.current_amount) || 0,
        lastWinner: row.last_winner_username
          ? { username: row.last_winner_username, wonAt: row.last_won_at }
          : null,
      }));

    return res.json({ pools });
  } catch (err) {
    console.error('[Jackpot] status error:', err);
    return res.status(500).json({ error: 'Failed to fetch jackpot status' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jackpot/mywin  (auth required)
// Returns the most recent jackpot win for the authenticated user (last 24h)
// ---------------------------------------------------------------------------
router.get('/mywin', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const row = await db.get(
      `SELECT amount, reference, created_at
       FROM transactions
       WHERE user_id = ?
         AND type = 'jackpot'
         AND created_at > datetime('now', '-1 day')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!row) return res.json({ recentWin: null });

    const tierMatch = row.reference
      ? row.reference.toLowerCase().match(/^(mini|minor|major|grand)/)
      : null;
    const tier = tierMatch ? tierMatch[1] : null;

    return res.json({
      recentWin: { amount: parseFloat(row.amount), tier, wonAt: row.created_at },
    });
  } catch (err) {
    console.error('[Jackpot] mywin error:', err);
    return res.status(500).json({ error: 'Failed to fetch recent win' });
  }
});

module.exports = router;
