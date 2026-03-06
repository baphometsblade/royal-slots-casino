'use strict';
const db = require('../database');
const config = require('../config');

/**
 * Evaluate bonus rules for a user and return personalized bonus offers.
 * Called after login or on demand to show personalized promotions.
 */
async function getPersonalizedOffers(userId) {
    const offers = [];

    try {
        // Get user profile
        const user = await db.get(
            `SELECT id, balance, bonus_balance, wagering_requirement, wagering_progress,
                    created_at, last_daily_claim, daily_streak
             FROM users WHERE id = ?`, [userId]
        );
        if (!user) return offers;

        // Get recent activity stats
        const last7d = await db.get(`
            SELECT COUNT(*) as spins, COALESCE(SUM(bet_amount), 0) as wagered,
                   COALESCE(SUM(win_amount), 0) as won
            FROM spins WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
        `, [userId]);

        const last24h = await db.get(`
            SELECT COUNT(*) as spins, COALESCE(SUM(bet_amount), 0) as wagered
            FROM spins WHERE user_id = ? AND created_at >= datetime('now', '-1 day')
        `, [userId]);

        const depositCount = await db.get(
            `SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
             FROM deposits WHERE user_id = ? AND status = 'completed'`, [userId]
        );

        const lastDeposit = await db.get(
            `SELECT amount, created_at FROM deposits WHERE user_id = ? AND status = 'completed'
             ORDER BY created_at DESC LIMIT 1`, [userId]
        );

        // Rule 1: Low balance nudge -- if balance < $10 and they've been active
        if (user.balance < 10 && last7d && last7d.spins > 20) {
            offers.push({
                type: 'low_balance',
                title: 'Top Up Bonus',
                message: 'Your balance is running low! Deposit now and get 75% extra.',
                bonusPct: 75,
                maxBonus: 150,
                priority: 10,
                cta: 'Deposit Now'
            });
        }

        // Rule 2: Losing streak comfort -- if lost more than won in last 7 days
        if (last7d && last7d.wagered > 100 && last7d.won < last7d.wagered * 0.5) {
            offers.push({
                type: 'loss_recovery',
                title: 'Luck Recovery Bonus',
                message: 'Tough week? Here\'s a cashback boost on your next deposit.',
                bonusPct: 40,
                maxBonus: 100,
                priority: 8,
                cta: 'Claim Cashback'
            });
        }

        // Rule 3: Inactive player nudge (2+ days without spins but was active before)
        if (last24h && last24h.spins === 0 && last7d && last7d.spins > 0) {
            offers.push({
                type: 'comeback',
                title: 'Welcome Back!',
                message: 'We missed you! Spin now and your first win is doubled.',
                bonusPct: 100,
                maxBonus: 50,
                priority: 6,
                cta: 'Play Now'
            });
        }

        // Rule 4: High roller incentive -- big spender in last 7 days
        if (last7d && last7d.wagered > 1000) {
            offers.push({
                type: 'high_roller',
                title: 'VIP Reload Boost',
                message: 'Thanks for your loyalty! Enjoy an enhanced reload bonus.',
                bonusPct: 80,
                maxBonus: 400,
                priority: 9,
                cta: 'Get VIP Bonus'
            });
        }

        // Rule 5: First deposit hasn't happened yet
        if (!depositCount || depositCount.cnt === 0) {
            offers.push({
                type: 'first_deposit',
                title: 'Welcome Bonus',
                message: '100% match on your first deposit up to $500!',
                bonusPct: 100,
                maxBonus: 500,
                priority: 10,
                cta: 'Deposit & Double'
            });
        }

        // Rule 6: Streak reward -- 5+ day login streak
        if (user.daily_streak >= 5) {
            offers.push({
                type: 'streak_reward',
                title: 'Streak Master!',
                message: user.daily_streak + '-day streak! Extra spin on the bonus wheel.',
                bonusPct: 0,
                maxBonus: 0,
                priority: 5,
                cta: 'Claim Wheel Spin'
            });
        }

        // Sort by priority (highest first) and return top 3
        offers.sort((a, b) => b.priority - a.priority);
        return offers.slice(0, 3);

    } catch (e) {
        console.error('[BonusRules] error:', e.message);
        return offers;
    }
}

module.exports = { getPersonalizedOffers };
