'use strict';

// Level-Up Bonus Routes
// GET  /api/levelupbonus/status  -- authenticated; returns current level and whether bonus is claimable
// POST /api/levelupbonus/claim   -- authenticated; claim bonus for leveling up

const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { authenticate } = require('../middleware/auth');

// XP thresholds matching the client-side level system
// Level = floor(sqrt(xp / 100)) + 1  (same formula used client-side)
function xpToLevel(xp) {
  return Math.floor(Math.sqrt((xp || 0) / 100)) + 1;
}

const BONUS_PER_LEVEL = 1.00; // $1.00 per level gained

// Schema bootstrap
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  try { await db.run('ALTER TABLE users ADD COLUMN last_bonus_level INTEGER DEFAULT 1'); } catch (_) {}
  schemaReady = true;
}

// GET /status
router.get('/status', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;
    const user = await db.get('SELECT xp, last_bonus_level FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const currentLevel = xpToLevel(user.xp || 0);
    const lastBonusLevel = user.last_bonus_level || 1;
    const levelsGained = Math.max(0, currentLevel - lastBonusLevel);
    return res.json({
      currentLevel,
      lastBonusLevel,
      levelsGained,
      bonusAmount: parseFloat((levelsGained * BONUS_PER_LEVEL).toFixed(2)),
      claimable: levelsGained > 0,
    });
  } catch (err) {
    console.error('[LevelUpBonus] GET /status error:', err.message);
    return res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /claim
router.post('/claim', authenticate, async function(req, res) {
  try {
    await ensureSchema();
    const userId = req.user.id;
    const user = await db.get('SELECT xp, last_bonus_level, balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const currentLevel = xpToLevel(user.xp || 0);
    const lastBonusLevel = user.last_bonus_level || 1;
    const levelsGained = Math.max(0, currentLevel - lastBonusLevel);
    if (levelsGained === 0) {
      return res.json({ success: false, message: 'No new levels to claim' });
    }
    const bonus = parseFloat((levelsGained * BONUS_PER_LEVEL).toFixed(2));
    await db.run(
      'UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ?, last_bonus_level = ? WHERE id = ?',
      [bonus, bonus * 15, currentLevel, userId]
    );
    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
      [userId, bonus, 'Level-up bonus: reached level ' + currentLevel + ' (bonus, 15x wagering)']
    );
    const updated = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    return res.json({
      success: true,
      levelsGained,
      bonus,
      newLevel: currentLevel,
      newBalance: updated ? parseFloat(updated.balance) : null,
    });
  } catch (err) {
    console.error('[LevelUpBonus] POST /claim error:', err.message);
    return res.status(500).json({ error: 'Failed to claim bonus' });
  }
});

module.exports = router;
