const router = require('express').Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// Bootstrap game_favorites table (deferred to avoid calling db before init)
async function _bootstrapFavoritesTable() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS game_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, game_id)
      )
    `);
  } catch (e) {
    console.warn('[Favorites] Table bootstrap:', e.message);
  }
}
_bootstrapFavoritesTable();

// GET /api/favorites/ - Get list of favorited game IDs for authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.all(
      'SELECT game_id FROM game_favorites WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const favorites = (rows || []).map(row => row.game_id);
    res.json({ favorites });
  } catch (err) {
    console.warn('Error fetching favorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites/toggle - Toggle a game as favorite
router.post('/toggle', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }

    // Check if already favorited
    const row = await db.get(
      'SELECT id FROM game_favorites WHERE user_id = ? AND game_id = ?',
      [userId, gameId]
    );

    if (row) {
      // Remove favorite
      await db.run(
        'DELETE FROM game_favorites WHERE user_id = ? AND game_id = ?',
        [userId, gameId]
      );
      res.json({ favorited: false, gameId });
    } else {
      // Add favorite
      await db.run(
        'INSERT INTO game_favorites (user_id, game_id) VALUES (?, ?)',
        [userId, gameId]
      );
      res.json({ favorited: true, gameId });
    }
  } catch (err) {
    console.warn('Error toggling favorite:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// GET /api/favorites/count - Get favorite counts per game (no auth required)
router.get('/count', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT game_id, COUNT(*) as count FROM game_favorites GROUP BY game_id HAVING COUNT(*) > 0',
      []
    );

    const counts = {};
    (rows || []).forEach(row => {
      counts[row.game_id] = row.count;
    });

    res.json({ counts });
  } catch (err) {
    console.warn('Error fetching favorite counts:', err);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

module.exports = router;
