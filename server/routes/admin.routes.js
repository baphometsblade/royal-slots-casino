const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats — Casino-wide statistics
router.get('/stats', (req, res) => {
    const users = db.get('SELECT COUNT(*) as count, SUM(balance) as totalBalance FROM users');
    const spins = db.get('SELECT COUNT(*) as count, SUM(bet_amount) as totalWagered, SUM(win_amount) as totalPaid FROM spins');
    const deposits = db.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit'");
    const withdrawals = db.get("SELECT COALESCE(ABS(SUM(amount)), 0) as total FROM transactions WHERE type = 'withdrawal'");
    const gameStats = db.all('SELECT * FROM game_stats ORDER BY total_spins DESC');

    const totalWagered = spins ? spins.totalWagered || 0 : 0;
    const totalPaid = spins ? spins.totalPaid || 0 : 0;
    const houseProfit = totalWagered - totalPaid;
    const overallRtp = totalWagered > 0 ? (totalPaid / totalWagered) : 0;

    res.json({
        overview: {
            totalUsers: users ? users.count : 0,
            totalPlayerBalance: users ? users.totalBalance || 0 : 0,
            totalSpins: spins ? spins.count : 0,
            totalWagered,
            totalPaid,
            houseProfit,
            overallRtp: (overallRtp * 100).toFixed(2) + '%',
            totalDeposits: deposits ? deposits.total : 0,
            totalWithdrawals: withdrawals ? withdrawals.total : 0,
        },
        gameStats,
    });
});

// GET /api/admin/users — User list
router.get('/users', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;

    const users = db.all(
        'SELECT id, username, email, balance, is_admin, is_banned, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?',
        [limit, offset]
    );
    const total = db.get('SELECT COUNT(*) as count FROM users');

    res.json({ users, total: total ? total.count : 0 });
});

// GET /api/admin/user/:id — User details with transactions
router.get('/user/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = db.get('SELECT id, username, email, balance, is_admin, is_banned, created_at FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = db.all(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100',
        [userId]
    );
    const spinHistory = db.all(
        'SELECT id, game_id, bet_amount, win_amount, created_at FROM spins WHERE user_id = ? ORDER BY id DESC LIMIT 50',
        [userId]
    );

    const spinStats = db.get(
        'SELECT COUNT(*) as totalSpins, SUM(bet_amount) as totalWagered, SUM(win_amount) as totalWon FROM spins WHERE user_id = ?',
        [userId]
    );

    res.json({ user, transactions, spinHistory, spinStats });
});

// POST /api/admin/user/:id/ban
router.post('/user/:id/ban', (req, res) => {
    const userId = parseInt(req.params.id);
    db.run('UPDATE users SET is_banned = 1 WHERE id = ?', [userId]);
    res.json({ message: 'User banned' });
});

// POST /api/admin/user/:id/unban
router.post('/user/:id/unban', (req, res) => {
    const userId = parseInt(req.params.id);
    db.run('UPDATE users SET is_banned = 0 WHERE id = ?', [userId]);
    res.json({ message: 'User unbanned' });
});

// POST /api/admin/user/:id/adjust-balance
router.post('/user/:id/adjust-balance', (req, res) => {
    const userId = parseInt(req.params.id);
    const { amount, reason } = req.body;
    const adjustment = parseFloat(amount);

    if (isNaN(adjustment)) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balanceBefore = user.balance;
    const balanceAfter = Math.max(0, balanceBefore + adjustment);

    db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, userId]);
    db.run(
        'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'admin_adjustment', adjustment, balanceBefore, balanceAfter, reason || 'Admin adjustment']
    );

    res.json({ balance: balanceAfter });
});

// GET /api/admin/recent-spins
router.get('/recent-spins', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const spins = db.all(
        `SELECT s.id, s.game_id, s.bet_amount, s.win_amount, s.created_at, u.username
         FROM spins s JOIN users u ON s.user_id = u.id
         ORDER BY s.id DESC LIMIT ?`,
        [limit]
    );
    res.json({ spins });
});

// GET /api/admin/profit-status — Detailed profit analysis
router.get('/profit-status', (req, res) => {
    const config = require('../config');
    const overall = db.get('SELECT COUNT(*) as spins, SUM(bet_amount) as wagered, SUM(win_amount) as paid FROM spins');
    const wagered = overall ? overall.wagered || 0 : 0;
    const paid = overall ? overall.paid || 0 : 0;
    const profit = wagered - paid;
    const rtp = wagered > 0 ? paid / wagered : 0;

    // Per-game breakdown
    const gameStats = db.all('SELECT * FROM game_stats ORDER BY total_wagered DESC');

    // Hourly profit (last 24h)
    const hourlyProfit = db.all(`
        SELECT strftime('%Y-%m-%d %H:00', created_at) as hour,
               SUM(bet_amount) as wagered, SUM(win_amount) as paid,
               COUNT(*) as spins
        FROM spins
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY hour ORDER BY hour
    `);

    // Top winners (potential threats to profitability)
    const topWinners = db.all(`
        SELECT u.username, SUM(s.win_amount - s.bet_amount) as net_win,
               SUM(s.bet_amount) as wagered, SUM(s.win_amount) as paid,
               COUNT(*) as spins
        FROM spins s JOIN users u ON s.user_id = u.id
        GROUP BY s.user_id
        HAVING net_win > 0
        ORDER BY net_win DESC LIMIT 10
    `);

    res.json({
        summary: {
            totalWagered: wagered,
            totalPaid: paid,
            houseProfit: profit,
            currentRTP: (rtp * 100).toFixed(2) + '%',
            targetRTP: (config.TARGET_RTP * 100).toFixed(0) + '%',
            totalSpins: overall ? overall.spins : 0,
            profitMargin: wagered > 0 ? ((1 - rtp) * 100).toFixed(2) + '%' : '0%',
            isHealthy: profit >= 0 && rtp <= config.TARGET_RTP + 0.05,
            emergencyMode: profit < (config.PROFIT_FLOOR || -500),
        },
        gameStats,
        hourlyProfit,
        topWinners,
    });
});

// POST /api/admin/house-edge/config — Update house edge config
router.post('/house-edge/config', (req, res) => {
    const config = require('../config');
    const { targetRTP, maxWinMultiplier, profitFloor } = req.body;
    if (targetRTP !== undefined) config.TARGET_RTP = Math.max(0.5, Math.min(0.99, parseFloat(targetRTP)));
    if (maxWinMultiplier !== undefined) config.MAX_WIN_MULTIPLIER = Math.max(10, Math.min(10000, parseInt(maxWinMultiplier)));
    if (profitFloor !== undefined) config.PROFIT_FLOOR = parseFloat(profitFloor);
    res.json({ message: 'Config updated', config: { TARGET_RTP: config.TARGET_RTP, MAX_WIN_MULTIPLIER: config.MAX_WIN_MULTIPLIER, PROFIT_FLOOR: config.PROFIT_FLOOR } });
});

module.exports = router;
