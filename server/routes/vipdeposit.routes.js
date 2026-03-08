'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: add vip_deposit_claimed column safely
db.run('ALTER TABLE users ADD COLUMN vip_deposit_claimed TEXT DEFAULT NULL').catch(function() {});

// VIP tier definitions based on lifetime wagered amount
var VIP_TIERS = [
    { name: 'Bronze',   minWagered: 0,     matchPercent: 10, maxBonus: 100 },
    { name: 'Silver',   minWagered: 1000,  matchPercent: 15, maxBonus: 200 },
    { name: 'Gold',     minWagered: 5000,  matchPercent: 25, maxBonus: 300 },
    { name: 'Platinum', minWagered: 20000, matchPercent: 40, maxBonus: 400 },
    { name: 'Diamond',  minWagered: 50000, matchPercent: 50, maxBonus: 500 }
];

var MIN_DEPOSIT_AMOUNT = 20;
var WAGERING_MULTIPLIER = 20;
var COOLDOWN_DAYS = 7;

/**
 * Determine VIP tier from lifetime wagered amount.
 * Iterates in reverse so the highest qualifying tier is returned.
 */
function getVipTier(lifetimeWagered) {
    var wagered = parseFloat(lifetimeWagered) || 0;
    for (var i = VIP_TIERS.length - 1; i >= 0; i--) {
        if (wagered >= VIP_TIERS[i].minWagered) {
            return VIP_TIERS[i];
        }
    }
    return VIP_TIERS[0];
}

/**
 * Check whether the weekly cooldown has elapsed since the last claim.
 * Returns true if the player can claim again.
 */
function isCooldownExpired(claimedAt) {
    if (!claimedAt) return true;
    var claimedDate = new Date(claimedAt);
    var cooldownEnd = new Date(claimedDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    return new Date() >= cooldownEnd;
}

/**
 * Calculate when the next claim becomes available.
 * Returns an ISO string or null if already available.
 */
function getNextAvailableAt(claimedAt) {
    if (!claimedAt) return null;
    var claimedDate = new Date(claimedAt);
    var cooldownEnd = new Date(claimedDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() >= cooldownEnd) return null;
    return cooldownEnd.toISOString();
}

// GET /api/user/vip-deposit-bonus
router.get('/vip-deposit-bonus', authenticate, async function(req, res) {
    try {
        var userId = req.user.id;

        // Calculate lifetime wagered from spins table
        var wagerRow = await db.get(
            'SELECT COALESCE(SUM(bet_amount), 0) as lifetime_wagered FROM spins WHERE user_id = ?',
            [userId]
        );
        var lifetimeWagered = wagerRow ? parseFloat(wagerRow.lifetime_wagered) || 0 : 0;

        var tier = getVipTier(lifetimeWagered);

        // Check weekly cooldown
        var user = await db.get(
            'SELECT vip_deposit_claimed FROM users WHERE id = ?',
            [userId]
        );
        var claimedAt = user ? user.vip_deposit_claimed : null;
        var available = isCooldownExpired(claimedAt);
        var nextAvailableAt = getNextAvailableAt(claimedAt);

        // Check for a qualifying deposit in the last 24 hours
        var recentDeposit = await db.get(
            "SELECT COALESCE(SUM(amount), 0) as total_deposited FROM transactions WHERE user_id = ? AND type = 'deposit' AND created_at >= datetime('now', '-1 day')",
            [userId]
        );
        var recentDepositAmount = recentDeposit ? parseFloat(recentDeposit.total_deposited) || 0 : 0;
        var hasMinDeposit = recentDepositAmount >= MIN_DEPOSIT_AMOUNT;

        // Calculate potential bonus
        var potentialBonus = Math.min(
            recentDepositAmount * (tier.matchPercent / 100),
            tier.maxBonus
        );
        potentialBonus = Math.round(potentialBonus * 100) / 100;

        return res.json({
            tier: tier.name,
            matchPercent: tier.matchPercent,
            maxBonus: tier.maxBonus,
            lifetimeWagered: Math.round(lifetimeWagered * 100) / 100,
            available: available,
            hasMinDeposit: hasMinDeposit,
            eligible: available && hasMinDeposit,
            recentDepositAmount: Math.round(recentDepositAmount * 100) / 100,
            minDeposit: MIN_DEPOSIT_AMOUNT,
            potentialBonus: potentialBonus,
            wageringMultiplier: WAGERING_MULTIPLIER,
            claimedAt: claimedAt,
            nextAvailableAt: nextAvailableAt,
            allTiers: VIP_TIERS.map(function(t) {
                return {
                    name: t.name,
                    minWagered: t.minWagered,
                    matchPercent: t.matchPercent,
                    maxBonus: t.maxBonus
                };
            })
        });
    } catch (err) {
        console.error('[vipdeposit] GET /vip-deposit-bonus error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/user/claim-vip-deposit-bonus
router.post('/claim-vip-deposit-bonus', authenticate, async function(req, res) {
    try {
        var userId = req.user.id;

        // Calculate lifetime wagered from spins table
        var wagerRow = await db.get(
            'SELECT COALESCE(SUM(bet_amount), 0) as lifetime_wagered FROM spins WHERE user_id = ?',
            [userId]
        );
        var lifetimeWagered = wagerRow ? parseFloat(wagerRow.lifetime_wagered) || 0 : 0;

        var tier = getVipTier(lifetimeWagered);

        // Check weekly cooldown
        var user = await db.get(
            'SELECT vip_deposit_claimed, bonus_balance FROM users WHERE id = ?',
            [userId]
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        var claimedAt = user.vip_deposit_claimed;
        if (!isCooldownExpired(claimedAt)) {
            return res.status(400).json({
                error: 'VIP deposit bonus already claimed this week',
                nextAvailableAt: getNextAvailableAt(claimedAt)
            });
        }

        // Check for minimum deposit in the last 24 hours
        var recentDeposit = await db.get(
            "SELECT COALESCE(SUM(amount), 0) as total_deposited FROM transactions WHERE user_id = ? AND type = 'deposit' AND created_at >= datetime('now', '-1 day')",
            [userId]
        );
        var recentDepositAmount = recentDeposit ? parseFloat(recentDeposit.total_deposited) || 0 : 0;

        if (recentDepositAmount < MIN_DEPOSIT_AMOUNT) {
            return res.status(400).json({
                error: 'Minimum deposit of $' + MIN_DEPOSIT_AMOUNT + ' in the last 24 hours required',
                recentDepositAmount: Math.round(recentDepositAmount * 100) / 100,
                minDeposit: MIN_DEPOSIT_AMOUNT
            });
        }

        // Calculate bonus amount
        var bonusAmount = Math.min(
            recentDepositAmount * (tier.matchPercent / 100),
            tier.maxBonus
        );
        bonusAmount = Math.round(bonusAmount * 100) / 100;

        if (bonusAmount <= 0) {
            return res.status(400).json({ error: 'No bonus available' });
        }

        var wageringRequired = Math.round(bonusAmount * WAGERING_MULTIPLIER * 100) / 100;

        // Credit bonus_balance and update wagering requirement
        await db.run(
            "UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ?, wagering_requirement = COALESCE(wagering_requirement, 0) + ?, vip_deposit_claimed = datetime('now') WHERE id = ?",
            [bonusAmount, wageringRequired, userId]
        );

        // Record transaction
        await db.run(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bonus', ?, ?)",
            [userId, bonusAmount, 'VIP Deposit Bonus ' + tier.matchPercent + '% (' + tier.name + ') — $' + bonusAmount.toFixed(2)]
        );

        var updated = await db.get(
            'SELECT balance, bonus_balance FROM users WHERE id = ?',
            [userId]
        );

        return res.json({
            success: true,
            tier: tier.name,
            matchPercent: tier.matchPercent,
            bonusAmount: bonusAmount,
            wageringRequired: wageringRequired,
            wageringMultiplier: WAGERING_MULTIPLIER,
            newBalance: updated ? parseFloat(updated.balance) || 0 : 0,
            newBonusBalance: updated ? parseFloat(updated.bonus_balance) || 0 : 0
        });
    } catch (err) {
        console.error('[vipdeposit] POST /claim-vip-deposit-bonus error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/user/weekend-cashback
router.get('/weekend-cashback', authenticate, async function(req, res) {
    try {
        var now = new Date();
        var dayOfWeek = now.getUTCDay(); // 0=Sunday, 6=Saturday
        var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        if (isWeekend) {
            // Calculate next Monday 00:00 UTC
            var daysUntilMonday = dayOfWeek === 6 ? 2 : 1; // Sat → +2 days, Sun → +1 day
            var nextMonday = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + daysUntilMonday,
                0, 0, 0, 0
            ));
            return res.json({
                active: true,
                cashbackPercent: 15,
                label: 'VIP Weekend Cashback',
                message: 'Earn 15% cashback on all losses this weekend!',
                expiresAt: nextMonday.toISOString()
            });
        } else {
            // Calculate next Saturday 00:00 UTC
            // dayOfWeek: 1=Mon,2=Tue,3=Wed,4=Thu,5=Fri → days to Sat = 6 - dayOfWeek
            var daysUntilSaturday = 6 - dayOfWeek;
            var nextSaturday = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + daysUntilSaturday,
                0, 0, 0, 0
            ));
            return res.json({
                active: false,
                nextWeekendAt: nextSaturday.toISOString()
            });
        }
    } catch (err) {
        console.error('[vipdeposit] GET /weekend-cashback error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
