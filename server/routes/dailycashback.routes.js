const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: add cashback_last column if it doesn't exist yet
db.run("ALTER TABLE users ADD COLUMN cashback_last TEXT").catch(function() {});

const CASHBACK_RATE = 0.05;   // 5 %
const CASHBACK_CAP  = 10.00;  // $10 maximum per day
const CASHBACK_MIN  = 0.50;   // $0.50 minimum net loss to qualify

/**
 * Calculate the cashback amount owed to a user for the past 24 hours.
 * Net losses = sum of bet_amount for spins where win_amount < bet_amount.
 * Returns { netLosses, cashbackAmount }
 */
async function computeCashback(userId) {
    const row = await db.get(
        "SELECT COALESCE(SUM(bet_amount - win_amount), 0) AS net_losses " +
        "FROM spins " +
        "WHERE user_id = ? " +
        "  AND win_amount < bet_amount " +
        "  AND created_at >= datetime('now', '-24 hours')",
        [userId]
    );
    const netLosses = parseFloat(row.net_losses) || 0;
    const cashbackAmount = Math.min(netLosses * CASHBACK_RATE, CASHBACK_CAP);
    return { netLosses, cashbackAmount };
}

/**
 * GET /api/dailycashback/status
 * Returns eligibility info for the authenticated user.
 * Response: { eligible, amount, claimed, claimedAt }
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT cashback_last FROM users WHERE id = ?',
            [req.user.id]
        );

        const claimedAt = user ? user.cashback_last : null;

        // Check 24-hour cooldown
        let claimed = false;
        if (claimedAt) {
            const lastClaim = new Date(claimedAt);
            const msSinceClaim = Date.now() - lastClaim.getTime();
            claimed = msSinceClaim < 24 * 60 * 60 * 1000;
        }

        const { netLosses, cashbackAmount } = await computeCashback(req.user.id);

        const eligible = !claimed && netLosses >= CASHBACK_MIN && cashbackAmount > 0;

        res.json({
            eligible,
            amount: parseFloat(cashbackAmount.toFixed(2)),
            netLosses: parseFloat(netLosses.toFixed(2)),
            claimed,
            claimedAt: claimedAt || null
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cashback status' });
    }
});

/**
 * POST /api/dailycashback/claim
 * Credits daily cashback to balance and records a transaction.
 * Response: { success, credited, newBalance }
 */
router.post('/claim', authenticate, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT balance, cashback_last FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Enforce 24-hour cooldown
        if (user.cashback_last) {
            const lastClaim = new Date(user.cashback_last);
            const msSinceClaim = Date.now() - lastClaim.getTime();
            if (msSinceClaim < 24 * 60 * 60 * 1000) {
                return res.status(400).json({ error: 'Cashback already claimed in the past 24 hours' });
            }
        }

        const { netLosses, cashbackAmount } = await computeCashback(req.user.id);

        if (netLosses < CASHBACK_MIN) {
            return res.status(400).json({
                error: 'Minimum $' + CASHBACK_MIN.toFixed(2) + ' in net losses required to qualify'
            });
        }

        if (cashbackAmount <= 0) {
            return res.status(400).json({ error: 'No cashback available to claim' });
        }

        const credited = parseFloat(cashbackAmount.toFixed(2));

        // Credit balance
        await db.run(
            'UPDATE users SET balance = balance + ?, cashback_last = datetime(\'now\') WHERE id = ?',
            [credited, req.user.id]
        );

        // Record transaction
        await db.run(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'cashback', ?, ?)",
            [
                req.user.id,
                credited,
                'Daily cashback — 5% of $' + netLosses.toFixed(2) + ' net losses'
            ]
        );

        const updatedUser = await db.get(
            'SELECT balance FROM users WHERE id = ?',
            [req.user.id]
        );
        const newBalance = updatedUser ? parseFloat(updatedUser.balance) : 0;

        res.json({ success: true, credited, newBalance });
    } catch (err) {
        res.status(500).json({ error: 'Claim failed' });
    }
});

module.exports = router;
