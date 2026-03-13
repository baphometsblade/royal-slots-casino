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
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT game_id FROM game_favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        console.warn('Error fetching favorites:', err);
        return res.status(500).json({ error: 'Failed to fetch favorites' });
      }

      const favorites = rows.map(row => row.game_id);
      res.json({ favorites });
    }
  );
});

// POST /api/favorites/toggle - Toggle a game as favorite
router.post('/toggle', authenticate, (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  // Check if already favorited
  db.get(
    'SELECT id FROM game_favorites WHERE user_id = ? AND game_id = ?',
    [userId, gameId],
    (err, row) => {
      if (err) {
        console.warn('Error checking favorite status:', err);
        return res.status(500).json({ error: 'Failed to process request' });
      }

      if (row) {
        // Remove favorite
        db.run(
          'DELETE FROM game_favorites WHERE user_id = ? AND game_id = ?',
          [userId, gameId],
          (deleteErr) => {
            if (deleteErr) {
              console.warn('Error removing favorite:', deleteErr);
              return res.status(500).json({ error: 'Failed to remove favorite' });
            }
            res.json({ favorited: false, gameId });
          }
        );
      } else {
        // Add favorite
        db.run(
          'INSERT INTO game_favorites (user_id, game_id) VALUES (?, ?)',
          [userId, gameId],
          (insertErr) => {
            if (insertErr) {
              console.warn('Error adding favorite:', insertErr);
              return res.status(500).json({ error: 'Failed to add favorite' });
            }
            res.json({ favorited: true, gameId });
          }
        );
      }
    }
  );
});

// GET /api/favorites/count - Get favorite counts per game (no auth required)
router.get('/count', (req, res) => {
  db.all(
    'SELECT game_id, COUNT(*) as count FROM game_favorites GROUP BY game_id HAVING count > 0',
    (err, rows) => {
      if (err) {
        console.warn('Error fetching favorite counts:', err);
        return res.status(500).json({ error: 'Failed to fetch counts' });
      }

      const counts = {};
      rows.forEach(row => {
        counts[row.game_id] = row.count;
      });

      res.json({ counts });
    }
  );
});

module.exports = router;
