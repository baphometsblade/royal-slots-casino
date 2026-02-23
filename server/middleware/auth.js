const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');

// JWT authentication middleware
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
        const user = db.get('SELECT id, username, email, balance, is_admin, is_banned FROM users WHERE id = ?', [payload.userId]);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        if (user.is_banned) {
            return res.status(403).json({ error: 'Account banned' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Admin-only middleware (must be used AFTER authenticate)
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { authenticate, requireAdmin };
