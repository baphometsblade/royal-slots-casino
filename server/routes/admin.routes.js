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
        const pendingDeps = await db.get("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'pending'");
        const pendingWds = await db.get("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'pending'");
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
                pendingDeposits: pendingDeps ? pendingDeps.count : 0,
                pendingDepositAmount: pendingDeps ? pendingDeps.total : 0,
                pendingWithdrawals: pendingWds ? pendingWds.count : 0,
                pendingWithdrawalAmount: pendingWds ? pendingWds.total : 0,
            },
            gameStats,
        });
    } catch (err) {
        console.error('[Admin] Stats error:', err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// GET /api/admin/fraud-alerts — Flag suspicious user patterns
router.get('/fraud-alerts', async (req, res) => {
    try {
        const alerts = [];

        // 1. Users with high withdrawal-to-deposit ratio (potential bonus abuse)
        const wdRatio = await db.all(`
            SELECT u.id, u.username, u.balance,
                COALESCE(d.total_dep, 0) as total_deposited,
                COALESCE(w.total_wd, 0) as total_withdrawn,
                COALESCE(s.total_wagered, 0) as total_wagered
            FROM users u
            LEFT JOIN (SELECT user_id, SUM(amount) as total_dep FROM deposits WHERE status = 'completed' GROUP BY user_id) d ON d.user_id = u.id
            LEFT JOIN (SELECT user_id, SUM(amount) as total_wd FROM withdrawals WHERE status = 'completed' GROUP BY user_id) w ON w.user_id = u.id
            LEFT JOIN (SELECT user_id, SUM(bet_amount) as total_wagered FROM spins GROUP BY user_id) s ON s.user_id = u.id
            WHERE COALESCE(w.total_wd, 0) > COALESCE(d.total_dep, 0) * 1.5
            AND COALESCE(d.total_dep, 0) > 0
            ORDER BY COALESCE(w.total_wd, 0) DESC
            LIMIT 20
        `);
        wdRatio.forEach(u => {
            alerts.push({
                type: 'withdrawal_ratio',
                severity: 'high',
                userId: u.id,
                username: u.username,
                message: `Withdrew $${(u.total_withdrawn || 0).toFixed(2)} on $${(u.total_deposited || 0).toFixed(2)} deposits (${((u.total_withdrawn / u.total_deposited) * 100).toFixed(0)}% ratio)`,
                data: { deposited: u.total_deposited, withdrawn: u.total_withdrawn, wagered: u.total_wagered }
            });
        });

        // 2. Rapid deposit velocity (3+ deposits in last hour)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const rapidDeps = await db.all(`
            SELECT user_id, COUNT(*) as count, SUM(amount) as total
            FROM deposits
            WHERE created_at >= ?
            GROUP BY user_id
            HAVING COUNT(*) >= 3
        `, [hourAgo]);
        for (const rd of rapidDeps) {
            const user = await db.get('SELECT username FROM users WHERE id = ?', [rd.user_id]);
            alerts.push({
                type: 'rapid_deposits',
                severity: 'medium',
                userId: rd.user_id,
                username: user ? user.username : 'Unknown',
                message: `${rd.count} deposits in the last hour totaling $${(rd.total || 0).toFixed(2)}`,
                data: { count: rd.count, total: rd.total }
            });
        }

        // 3. Users with suspiciously high win rate (potential exploit)
        const highWinRate = await db.all(`
            SELECT user_id, COUNT(*) as total_spins,
                SUM(CASE WHEN win_amount > 0 THEN 1 ELSE 0 END) as wins,
                SUM(bet_amount) as wagered, SUM(win_amount) as won
            FROM spins
            GROUP BY user_id
            HAVING COUNT(*) >= 50
            AND (SUM(win_amount) * 1.0 / SUM(bet_amount)) > 1.2
            ORDER BY (SUM(win_amount) * 1.0 / SUM(bet_amount)) DESC
            LIMIT 10
        `);
        for (const hw of highWinRate) {
            const user = await db.get('SELECT username FROM users WHERE id = ?', [hw.user_id]);
            const rtp = hw.wagered > 0 ? ((hw.won / hw.wagered) * 100).toFixed(1) : '0';
            alerts.push({
                type: 'high_win_rate',
                severity: 'high',
                userId: hw.user_id,
                username: user ? user.username : 'Unknown',
                message: `RTP ${rtp}% over ${hw.total_spins} spins ($${(hw.wagered || 0).toFixed(2)} wagered, $${(hw.won || 0).toFixed(2)} won)`,
                data: { spins: hw.total_spins, wagered: hw.wagered, won: hw.won, rtp: parseFloat(rtp) }
            });
        }

        // 4. Large pending withdrawals
        const largePending = await db.all(`
            SELECT w.id, w.user_id, w.amount, w.created_at, u.username
            FROM withdrawals w
            JOIN users u ON u.id = w.user_id
            WHERE w.status = 'pending' AND w.amount >= 1000
            ORDER BY w.amount DESC
        `);
        largePending.forEach(wp => {
            alerts.push({
                type: 'large_withdrawal',
                severity: 'medium',
                userId: wp.user_id,
                username: wp.username,
                message: `Pending withdrawal of $${(wp.amount || 0).toFixed(2)} since ${wp.created_at}`,
                data: { withdrawalId: wp.id, amount: wp.amount }
            });
        });

        res.json({ alerts, count: alerts.length });
    } catch (err) {
        console.error('[Admin] Fraud alerts error:', err);
        res.status(500).json({ error: 'Failed to load fraud alerts' });
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

// POST /api/admin/user/:id/send-bonus — Send a targeted bonus to a player
router.post('/user/:id/send-bonus', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { amount, reason } = req.body;
        const bonusAmount = parseFloat(amount);

        if (isNaN(bonusAmount) || bonusAmount <= 0) {
            return res.status(400).json({ error: 'Bonus amount must be a positive number' });
        }
        if (bonusAmount > 50000) {
            return res.status(400).json({ error: 'Bonus cannot exceed $50,000' });
        }

        const user = await db.get('SELECT id, username, balance FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const balanceBefore = user.balance || 0;
        const balanceAfter = balanceBefore + bonusAmount;

        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, userId]);
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'bonus', bonusAmount, balanceBefore, balanceAfter, reason || 'Admin bonus']
        );

        res.json({
            message: 'Bonus sent successfully',
            userId,
            username: user.username,
            bonusAmount,
            newBalance: balanceAfter,
        });
    } catch (err) {
        console.error('[Admin] Send bonus error:', err);
        res.status(500).json({ error: 'Failed to send bonus' });
    }
});

// POST /api/admin/bulk-bonus — Send bonus to multiple users
router.post('/bulk-bonus', async (req, res) => {
    try {
        const { userIds, amount, reason } = req.body;
        const bonusAmount = parseFloat(amount);

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds array is required' });
        }
        if (isNaN(bonusAmount) || bonusAmount <= 0) {
            return res.status(400).json({ error: 'Bonus amount must be a positive number' });
        }
        if (bonusAmount > 10000) {
            return res.status(400).json({ error: 'Bulk bonus cannot exceed $10,000 per user' });
        }
        if (userIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 users per bulk bonus' });
        }

        let credited = 0;
        for (const uid of userIds) {
            const userId = parseInt(uid);
            if (isNaN(userId)) continue;

            const user = await db.get('SELECT id, balance FROM users WHERE id = ?', [userId]);
            if (!user) continue;

            const balanceBefore = user.balance || 0;
            const balanceAfter = balanceBefore + bonusAmount;

            await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, userId]);
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'bonus', bonusAmount, balanceBefore, balanceAfter, reason || 'Admin bulk bonus']
            );
            credited++;
        }

        res.json({ message: 'Bulk bonus sent', credited, totalAmount: credited * bonusAmount });
    } catch (err) {
        console.error('[Admin] Bulk bonus error:', err);
        res.status(500).json({ error: 'Failed to send bulk bonus' });
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

// POST /api/admin/approve-deposit — Approve a pending deposit (credit player balance + bonus to bonus_balance)
router.post('/approve-deposit', async (req, res) => {
    try {
        const { depositId } = req.body;
        if (!depositId) return res.status(400).json({ error: 'depositId is required' });

        const deposit = await db.get('SELECT * FROM deposits WHERE id = ?', [depositId]);
        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
        if (deposit.status !== 'pending') return res.status(400).json({ error: `Deposit is already ${deposit.status}` });

        const user = await db.get('SELECT balance, bonus_balance, wagering_requirement, wagering_progress FROM users WHERE id = ?', [deposit.user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const cfg = require('../config');
        const balanceBefore = user.balance;
        let balanceAfter = balanceBefore + deposit.amount;

        // Determine bonus: first deposit or reload
        let bonusAmount = 0;
        let wageringMult = 0;
        let bonusType = '';
        const priorDeposits = await db.get(
            "SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = 'completed'",
            [deposit.user_id]
        );
        if (priorDeposits && priorDeposits.count === 0) {
            // First deposit: 100% match up to $500
            bonusAmount = Math.min(deposit.amount * (cfg.FIRST_DEPOSIT_BONUS_PCT / 100), cfg.FIRST_DEPOSIT_BONUS_MAX);
            wageringMult = cfg.FIRST_DEPOSIT_WAGERING_MULT || 30;
            bonusType = 'first_deposit_bonus';
        } else {
            // Reload deposit: 50% match up to $250
            bonusAmount = Math.min(deposit.amount * ((cfg.RELOAD_BONUS_PCT || 50) / 100), cfg.RELOAD_BONUS_MAX || 250);
            wageringMult = cfg.RELOAD_WAGERING_MULT || 25;
            bonusType = 'reload_bonus';
        }

        // Credit deposit to real balance
        await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, deposit.user_id]);
        await db.run("UPDATE deposits SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [depositId]);
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [deposit.user_id, 'deposit', deposit.amount, balanceBefore, balanceAfter, deposit.reference || 'admin-approved']
        );

        // Credit bonus to bonus_balance with wagering requirement
        if (bonusAmount > 0) {
            const wagerReq = bonusAmount * wageringMult;
            await db.run(
                'UPDATE users SET bonus_balance = bonus_balance + ?, wagering_requirement = ?, wagering_progress = 0 WHERE id = ?',
                [bonusAmount, wagerReq, deposit.user_id]
            );
            const refLabel = bonusType === 'first_deposit_bonus'
                ? `FIRST-DEPOSIT-${cfg.FIRST_DEPOSIT_BONUS_PCT}PCT-MATCH (${wageringMult}x wagering)`
                : `RELOAD-${cfg.RELOAD_BONUS_PCT || 50}PCT-MATCH (${wageringMult}x wagering)`;
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [deposit.user_id, bonusType, bonusAmount, balanceAfter, balanceAfter, refLabel]
            );
        }

        const msg = bonusAmount > 0
            ? `Deposit approved + $${bonusAmount.toFixed(2)} ${bonusType.replace(/_/g, ' ')} (${wageringMult}x wagering required)`
            : 'Deposit approved';
        res.json({ message: msg, depositId, amount: deposit.amount, bonus: bonusAmount, wageringRequired: bonusAmount * wageringMult, newBalance: balanceAfter });
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
            // Cooling-off status
            var createdTime = new Date(w.created_at).getTime();
            var hoursSince = (Date.now() - createdTime) / (1000 * 60 * 60);
            w.coolingOff = hoursSince < 24;
            w.hoursUntilEligible = w.coolingOff ? Math.ceil(24 - hoursSince) : 0;
        }

        res.json({ withdrawals });
    } catch (err) {
        console.error('[Admin] Pending withdrawals error:', err);
        res.status(500).json({ error: 'Failed to load pending withdrawals' });
    }
});

// POST /api/admin/approve-withdrawal — Process and approve a pending withdrawal
// Enforces 24h cooling-off period — withdrawals cannot be approved until 24h after creation
router.post('/approve-withdrawal', async (req, res) => {
    try {
        const { withdrawalId, forceApprove } = req.body;
        if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });

        const wd = await db.get('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
        if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });
        if (wd.status !== 'pending') return res.status(400).json({ error: `Withdrawal is already ${wd.status}` });

        // 24h cooling-off enforcement (admin can override with forceApprove)
        if (!forceApprove && wd.created_at) {
            var createdTime = new Date(wd.created_at).getTime();
            var hoursSince = (Date.now() - createdTime) / (1000 * 60 * 60);
            if (hoursSince < 24) {
                var hoursLeft = Math.ceil(24 - hoursSince);
                return res.status(400).json({
                    error: 'Cooling-off period active. Withdrawal can be processed in ' + hoursLeft + ' hour(s).',
                    coolingOff: true,
                    hoursRemaining: hoursLeft,
                    eligibleAt: new Date(createdTime + 24 * 60 * 60 * 1000).toISOString()
                });
            }
        }

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


// GET /api/admin/lapsed-players — Detect inactive players for re-engagement campaigns
router.get('/lapsed-players', async (req, res) => {
    try {
        const daysThreshold = Math.max(1, parseInt(req.query.days) || 7);

        // Find users who haven't spun in N+ days but have deposited before
        const lapsedPlayers = await db.all(`
            SELECT u.id, u.username, u.email, u.balance, u.created_at,
                COALESCE(d.total_deposited, 0) as total_deposited,
                COALESCE(s.total_wagered, 0) as total_wagered,
                COALESCE(s.total_spins, 0) as total_spins,
                s.last_spin
            FROM users u
            LEFT JOIN (
                SELECT user_id, SUM(amount) as total_deposited
                FROM deposits WHERE status = 'completed'
                GROUP BY user_id
            ) d ON d.user_id = u.id
            LEFT JOIN (
                SELECT user_id, SUM(bet_amount) as total_wagered, COUNT(*) as total_spins,
                       MAX(created_at) as last_spin
                FROM spins GROUP BY user_id
            ) s ON s.user_id = u.id
            WHERE u.is_banned = 0
            AND (s.last_spin IS NULL OR s.last_spin < datetime('now', '-' || ? || ' days'))
            AND COALESCE(d.total_deposited, 0) > 0
            ORDER BY COALESCE(d.total_deposited, 0) DESC
            LIMIT 100
        `, [daysThreshold]);

        // Calculate suggested bonus based on player value
        const enriched = lapsedPlayers.map(p => {
            const daysSinceActive = p.last_spin
                ? Math.floor((Date.now() - new Date(p.last_spin).getTime()) / 86400000)
                : 999;
            let suggestedBonus = 50; // base
            if (p.total_deposited > 1000) suggestedBonus = 200;
            else if (p.total_deposited > 500) suggestedBonus = 100;
            if (daysSinceActive > 30) suggestedBonus = Math.round(suggestedBonus * 1.5);
            return {
                ...p,
                daysSinceActive,
                suggestedBonus: Math.min(suggestedBonus, 500),
                tier: p.total_deposited > 1000 ? 'whale' : p.total_deposited > 500 ? 'regular' : 'casual',
            };
        });

        res.json({
            lapsedPlayers: enriched,
            count: enriched.length,
            daysThreshold,
        });
    } catch (err) {
        console.error('[Admin] Lapsed players error:', err);
        res.status(500).json({ error: 'Failed to load lapsed players' });
    }
});

module.exports = router;
