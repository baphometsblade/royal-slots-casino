const express = require('express');
const router = express.Router();

// Profanity filter - basic server-side list
const PROFANITY_FILTER = [
  'badword1', 'badword2', 'badword3', 'badword4', 'badword5',
  'offensive', 'inappropriate', 'vulgar', 'crude', 'nasty',
  'spam', 'scam', 'hack', 'cheat', 'bot'
];

const MAX_MESSAGE_LENGTH = 200;
const RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds
const MESSAGES_LIMIT = 50;

// Track user message timestamps for rate limiting
const userRateLimits = new Map();

/**
 * Bootstrap the chat_messages table
 */
function bootstrapChatTable(db) {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      (err) => {
        if (err) {
          console.warn('[Chat] Failed to create table:', err.message);
          reject(err);
        } else {
          console.warn('[Chat] chat_messages table ready');
          resolve();
        }
      }
    );
  });
}

/**
 * Filter profanity from text
 */
function filterProfanity(text) {
  let filtered = text;
  PROFANITY_FILTER.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

/**
 * Check and enforce rate limiting
 * Returns { allowed: boolean, message?: string, nextAvailableAt?: number }
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const lastMessageTime = userRateLimits.get(userId) || 0;
  const timeSinceLast = now - lastMessageTime;

  if (timeSinceLast < RATE_LIMIT_WINDOW_MS) {
    const waitMs = RATE_LIMIT_WINDOW_MS - timeSinceLast;
    return {
      allowed: false,
      message: `Rate limited. Please wait ${Math.ceil(waitMs / 1000)} second(s).`,
      nextAvailableAt: now + waitMs
    };
  }

  return { allowed: true };
}

/**
 * Update rate limit for user
 */
function updateRateLimit(userId) {
  userRateLimits.set(userId, Date.now());

  // Cleanup old entries periodically (keep only recent)
  if (userRateLimits.size > 1000) {
    const cutoffTime = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
    for (const [id, time] of userRateLimits.entries()) {
      if (time < cutoffTime) {
        userRateLimits.delete(id);
      }
    }
  }
}

/**
 * GET /api/chat/messages
 * Fetch chat messages (authenticated)
 * Query params:
 *   - since: (optional) only fetch messages with id > since
 */
router.get('/messages', (req, res) => {
  // Check authentication
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = req.app.locals.db;
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  const sinceId = req.query.since ? parseInt(req.query.since, 10) : 0;

  // Build query
  let query = 'SELECT id, user_id, username, message, created_at FROM chat_messages';
  const params = [];

  if (sinceId > 0) {
    query += ' WHERE id > ?';
    params.push(sinceId);
  }

  query += ' ORDER BY id ASC LIMIT ?';
  params.push(MESSAGES_LIMIT);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.warn('[Chat] Failed to fetch messages:', err.message);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      messages: rows || []
    });
  });
});

/**
 * POST /api/chat/send
 * Send a chat message (authenticated)
 * Body: { message: string }
 */
router.post('/send', (req, res) => {
  // Check authentication
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = req.app.locals.db;
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  const userId = req.session.userId;
  const username = req.session.username || `Player${userId}`;
  const message = req.body.message;

  // Validate input
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`
    });
  }

  // Check rate limit
  const rateLimitCheck = checkRateLimit(userId);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: rateLimitCheck.message,
      retryAfterMs: rateLimitCheck.nextAvailableAt - Date.now()
    });
  }

  // Filter profanity
  const filteredMessage = filterProfanity(trimmedMessage);

  // Insert message
  db.run(
    'INSERT INTO chat_messages (user_id, username, message) VALUES (?, ?, ?)',
    [userId, username, filteredMessage],
    function(err) {
      if (err) {
        console.warn('[Chat] Failed to insert message:', err.message);
        return res.status(500).json({ error: 'Failed to send message' });
      }

      // Update rate limit for this user
      updateRateLimit(userId);

      // Return created message
      const messageId = this.lastID;
      db.get(
        'SELECT id, user_id, username, message, created_at FROM chat_messages WHERE id = ?',
        [messageId],
        (err, row) => {
          if (err) {
            console.warn('[Chat] Failed to fetch created message:', err.message);
            return res.status(500).json({ error: 'Message created but failed to retrieve' });
          }

          res.status(201).json({
            message: row
          });
        }
      );
    }
  );
});

/**
 * Initialize chat routes with database
 * Call this in your main server file before using the router
 */
async function initChatRoutes(db) {
  try {
    await bootstrapChatTable(db);
  } catch (error) {
    console.warn('[Chat] Initialization failed:', error.message);
    throw error;
  }
}

// Initialize chat tables on first load
initChatRoutes().catch(err => console.warn('[Chat] Init error:', err.message));

module.exports = router;
