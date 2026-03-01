const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats — Casino-wide statistics
router.get('/stats', async (req, res) => {
    try {
        const users = await db.get('SELECT COUNT(*) as count, SUM(balance) as totalBalance FROM users');
        const spins = await db.get('SELECT COUNT(*) as count, SUM(bet_amount) as totalWagered, SUM(win_amount) as totalPaid FROM spins');
        const deposits = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit'");
        const withdrawals = await db.get("SELECT COALESCE(ABS(SUM(amount)), 0) as total FROM transactions WHERE type = 'withdrawal'");
        const gameStats = await db.all('SELECT * FROM game_stats ORDER BY total_spins DESC');

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
    } catch (err) {
        console.error('[Admin] Stats error:', err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// GET /api/admin/users — User list
router.get('/users', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const offset = parseInt(req.query.offset) || 0;

        const users = await db.all(
            'SELECT id, username, email, balance, is_admin, is_banned, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const total = await db.get('SELECT COUNT(*) as count FROM users');

        res.json({ users, total: total ? total.count : 0 });
    } catch (err) {
        console.error('[Admin] Users list error:', err);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// GET /api/admin/user/:id — User details with transactions
router.get('/user/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await db.get('SELECT id, username, email, balance, is_admin, is_banned, created_at FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const transactions = await db.all(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100',
            [userId]
        );
        const spinHistory = await db.all(
            'SELECT id, game_id, bet_amount, win_amount, created_at FROM spins WHERE user_id = ? ORDER BY id DESC LIMIT 50',
            [userId]
        );

        const spinStats = await db.get(
            'SELECT COUNT(*) as totalSpins, SUM(bet_amount) as totalWagered, SUM(win_amount) as totalWon FROM spins WHERE user_id = ?',
            [userId]
        );

        res.json({ user, transactions, spinHistory, spinStats });
    } catch (err) {
        console.error('[Admin] User detail error:', err);
        res.status(500).json({ error: 'Failed to load user details' });
    }
});

// POST /api/admin/user/:id/ban
router.post('/user/:id/ban', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await db.run('UPDATE users SET is_banned = 1 WHERE id = ?', [userId]);
        res.json({ message: 'User banned' });
    } catch (err) {
        console.error('[Admin] Ban error:', err);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// POST /api/admin/user/:id/unban
router.post('/user/:id/unban', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await db.run('UPDATE users SET is_banned = 0 WHERE id = ?', [userId]);
        res.json({ message: 'User unbanned' });
    } catch (err) {
        console.error('[Admin] Unban error:', err);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// POST /api/admin/user/:id/adjust-balance
router.post('/user/:id/adjust-balance', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { amount, reason } = req.body;
        const adjustment = parseFloat(amount);

        if (isNaN(adjustment)) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const balanceBefore = user.balance;
        const balanceAfter = Math.max(0, balanceBefore + adjustment);

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, userId]);
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'admin_adjustment', adjustment, balanceBefore, balanceAfter, reason || 'Admin adjustment']
        );

        res.json({ balance: balanceAfter });
    } catch (err) {
        console.error('[Admin] Adjust balance error:', err);
        res.status(500).json({ error: 'Failed to adjust balance' });
    }
});

// GET /api/admin/recent-spins
router.get('/recent-spins', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const spins = await db.all(
            `SELECT s.id, s.game_id, s.bet_amount, s.win_amount, s.created_at, u.username
             FROM spins s JOIN users u ON s.user_id = u.id
             ORDER BY s.id DESC LIMIT ?`,
            [limit]
        );
        res.json({ spins });
    } catch (err) {
        console.error('[Admin] Recent spins error:', err);
        res.status(500).json({ error: 'Failed to load recent spins' });
    }
});

// GET /api/admin/profit-status — Detailed profit analysis
router.get('/profit-status', async (req, res) => {
    try {
        const config = require('../config');
        const overall = await db.get('SELECT COUNT(*) as spins, SUM(bet_amount) as wagered, SUM(win_amount) as paid FROM spins');
        const wagered = overall ? overall.wagered || 0 : 0;
        const paid = overall ? overall.paid || 0 : 0;
        const profit = wagered - paid;
        const rtp = wagered > 0 ? paid / wagered : 0;

        // Per-game breakdown
        const gameStats = await db.all('SELECT * FROM game_stats ORDER BY total_wagered DESC');

        // Hourly profit (last 24h)
        const hourlyProfit = await db.all(`
            SELECT strftime('%Y-%m-%d %H:00', created_at) as hour,
                   SUM(bet_amount) as wagered, SUM(win_amount) as paid,
                   COUNT(*) as spins
            FROM spins
            WHERE created_at > datetime('now', '-24 hours')
            GROUP BY hour ORDER BY hour
        `);

        // Top winners (potential threats to profitability)
        // NOTE: GROUP BY includes u.username for PG compat (strict non-aggregated column rule).
        // HAVING repeats the expression (PG disallows SELECT aliases in HAVING).
        const topWinners = await db.all(`
            SELECT u.username, SUM(s.win_amount - s.bet_amount) as net_win,
                   SUM(s.bet_amount) as wagered, SUM(s.win_amount) as paid,
                   COUNT(*) as spins
            FROM spins s JOIN users u ON s.user_id = u.id
            GROUP BY s.user_id, u.username
            HAVING SUM(s.win_amount - s.bet_amount) > 0
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
    } catch (err) {
        console.error('[Admin] Profit status error:', err);
        res.status(500).json({ error: 'Failed to load profit status' });
    }
});

// POST /api/admin/house-edge/config — Update house edge config
router.post('/house-edge/config', async (req, res) => {
    try {
        const config = require('../config');
        const { targetRTP, maxWinMultiplier, profitFloor } = req.body;
        if (targetRTP !== undefined) config.TARGET_RTP = Math.max(0.5, Math.min(0.99, parseFloat(targetRTP)));
        if (maxWinMultiplier !== undefined) config.MAX_WIN_MULTIPLIER = Math.max(10, Math.min(10000, parseInt(maxWinMultiplier)));
        if (profitFloor !== undefined) config.PROFIT_FLOOR = parseFloat(profitFloor);
        res.json({ message: 'Config updated', config: { TARGET_RTP: config.TARGET_RTP, MAX_WIN_MULTIPLIER: config.MAX_WIN_MULTIPLIER, PROFIT_FLOOR: config.PROFIT_FLOOR } });
    } catch (err) {
        console.error('[Admin] House edge config error:', err);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// GET /api/admin/pending-deposits — List deposits awaiting admin approval
router.get('/pending-deposits', async (req, res) => {
    try {
        const deposits = await db.all(
            `SELECT d.id, d.user_id, d.amount, d.currency, d.status, d.reference, d.created_at,
                    u.username, u.email
             FROM deposits d
             JOIN users u ON d.user_id = u.id
             WHERE d.status = 'pending'
             ORDER BY d.created_at ASC`
        );
        res.json({ deposits });
    } catch (err) {
        console.error('[Admin] Pending deposits error:', err);
        res.status(500).json({ error: 'Failed to load pending deposits' });
    }
});

// POST /api/admin/approve-deposit — Approve a pending deposit (credit player balance)
router.post('/approve-deposit', async (req, res) => {
    try {
        const { depositId } = req.body;
        if (!depositId) return res.status(400).json({ error: 'depositId is required' });

        const deposit = await db.get('SELECT * FROM deposits WHERE id = ?', [depositId]);
        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
        if (deposit.status !== 'pending') return res.status(400).json({ error: `Deposit is already ${deposit.status}` });

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [deposit.user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const balanceBefore = user.balance;
        let balanceAfter = balanceBefore + deposit.amount;

        // First-deposit bonus: 100% match up to $500
        let bonusAmount = 0;
        const priorDeposits = await db.get(
            "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = 'completed'",
            [deposit.user_id]
        );
        if (priorDeposits && priorDeposits.count === 0) {
            const cfg = require('../config');
            bonusAmount = Math.min(deposit.amount * (cfg.FIRST_DEPOSIT_BONUS_PCT / 100), cfg.FIRST_DEPOSIT_BONUS_MAX);
            balanceAfter += bonusAmount;
        }

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, deposit.user_id]);
        await db.run("UPDATE deposits SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [depositId]);
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [deposit.user_id, 'deposit', deposit.amount, balanceBefore, balanceAfter, deposit.reference || 'admin-approved']
        );

        // Log bonus as separate transaction if awarded
        if (bonusAmount > 0) {
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [deposit.user_id, 'first_deposit_bonus', bonusAmount, balanceAfter - bonusAmount, balanceAfter, 'FIRST-DEPOSIT-100PCT-MATCH']
            );
        }

        const msg = bonusAmount > 0
            ? `Deposit approved + $${bonusAmount.toFixed(2)} first-deposit bonus!`
            : 'Deposit approved';
        res.json({ message: msg, depositId, amount: deposit.amount, bonus: bonusAmount, newBalance: balanceAfter });
    } catch (err) {
        console.error('[Admin] Approve deposit error:', err);
        res.status(500).json({ error: 'Failed to approve deposit' });
    }
});

// POST /api/admin/reject-deposit — Reject a pending deposit
router.post('/reject-deposit', async (req, res) => {
    try {
        const { depositId, reason } = req.body;
        if (!depositId) return res.status(400).json({ error: 'depositId is required' });

        const deposit = await db.get('SELECT * FROM deposits WHERE id = ?', [depositId]);
        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
        if (deposit.status !== 'pending') return res.status(400).json({ error: `Deposit is already ${deposit.status}` });

        await db.run("UPDATE deposits SET status = 'rejected', completed_at = datetime('now') WHERE id = ?", [depositId]);

        res.json({ message: 'Deposit rejected', depositId, reason: reason || 'No reason provided' });
    } catch (err) {
        console.error('[Admin] Reject deposit error:', err);
        res.status(500).json({ error: 'Failed to reject deposit' });
    }
});

// ═══════════════════════════════════════════════════
//  WITHDRAWAL MANAGEMENT
// ═══════════════════════════════════════════════════

// GET /api/admin/pending-withdrawals — List withdrawals awaiting admin processing
router.get('/pending-withdrawals', async (req, res) => {
    try {
        const withdrawals = await db.all(
            `SELECT w.id, w.user_id, w.amount, w.currency, w.payment_type, w.status, w.reference, w.created_at,
                    u.username, u.email, u.balance
             FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             WHERE w.status = 'pending'
             ORDER BY w.created_at ASC`
        );

        // For each withdrawal, get wagering stats to help admin evaluate
        for (const w of withdrawals) {
            const deposits = await db.get(
                "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed'",
                [w.user_id]
            );
            const wagered = await db.get(
                'SELECT COALESCE(SUM(bet_amount), 0) as total FROM spins WHERE user_id = ?',
                [w.user_id]
            );
            w.totalDeposited = deposits ? deposits.total : 0;
            w.totalWagered = wagered ? wagered.total : 0;
            w.wagerRatio = w.totalDeposited > 0 ? (w.totalWagered / w.totalDeposited).toFixed(1) : 'N/A';
        }

        res.json({ withdrawals });
    } catch (err) {
        console.error('[Admin] Pending withdrawals error:', err);
        res.status(500).json({ error: 'Failed to load pending withdrawals' });
    }
});

// POST /api/admin/approve-withdrawal — Process and approve a pending withdrawal
router.post('/approve-withdrawal', async (req, res) => {
    try {
        const { withdrawalId } = req.body;
        if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });

        const wd = await db.get('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
        if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });
        if (wd.status !== 'pending') return res.status(400).json({ error: `Withdrawal is already ${wd.status}` });

        // Mark as completed (balance was already deducted at request time)
        await db.run(
            "UPDATE withdrawals SET status = 'completed', processed_at = datetime('now'), admin_note = 'Approved by admin' WHERE id = ?",
            [withdrawalId]
        );

        res.json({ message: 'Withdrawal approved and ready for payout', withdrawalId, amount: wd.amount });
    } catch (err) {
        console.error('[Admin] Approve withdrawal error:', err);
        res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
});

// POST /api/admin/reject-withdrawal — Reject a withdrawal and refund balance
router.post('/reject-withdrawal', async (req, res) => {
    try {
        const { withdrawalId, reason } = req.body;
        if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });

        const wd = await db.get('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
        if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });
        if (wd.status !== 'pending') return res.status(400).json({ error: `Withdrawal is already ${wd.status}` });

        // Refund the balance back to the user
        const user = await db.get('SELECT balance FROM users WHERE id = ?', [wd.user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const balanceBefore = user.balance;
        const balanceAfter = balanceBefore + wd.amount;

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, wd.user_id]);
        await db.run(
            "UPDATE withdrawals SET status = 'rejected', processed_at = datetime('now'), admin_note = ? WHERE id = ?",
            [reason || 'Rejected by admin', withdrawalId]
        );
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [wd.user_id, 'withdrawal_refund', wd.amount, balanceBefore, balanceAfter, `WDR-REJECT-${withdrawalId}`]
        );

        res.json({ message: 'Withdrawal rejected and refunded', withdrawalId, amount: wd.amount, newBalance: balanceAfter });
    } catch (err) {
        console.error('[Admin] Reject withdrawal error:', err);
        res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
});

module.exports = router;
