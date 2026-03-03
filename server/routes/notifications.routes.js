'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: create notifications table
db.run(`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_action TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`).catch(function() {});

// GET /api/notifications — last 20, auth required
router.get('/', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var rows = await db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    var unreadCount = 0;
    rows.forEach(function(r) { if (!r.read) unreadCount++; });
    return res.json({ notifications: rows, unreadCount: unreadCount });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async function(req, res) {
  try {
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/read/:id
router.post('/read/:id', authenticate, async function(req, res) {
  try {
    await db.run(
      'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    return res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/system — internal only (no auth, must check IP or skip in dev)
router.post('/system', async function(req, res) {
  try {
    var ip = req.ip || req.connection.remoteAddress || '';
    var isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!isLocal && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    var body = req.body || {};
    var userId = body.userId;
    var type = body.type || 'info';
    var title = body.title || 'Notification';
    var notifBody = body.body || '';
    var linkAction = body.linkAction || null;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    await db.run(
      'INSERT INTO notifications (user_id, type, title, body, link_action) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, notifBody, linkAction]
    );
    return res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
