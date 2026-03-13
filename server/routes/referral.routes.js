'use strict';

/**
 * Referral System Routes
 *
 * Endpoints:
 *   GET  /api/referral              — Get user's referral code + stats
 *   POST /api/referral/claim        — Claim a referral code during signup
 *   POST /api/referral/reward       — Award bonuses when referred user deposits
 *   GET  /api/referral/admin/stats  — Admin referral statistics
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * Bootstrap the referral tables on module load.
 * Creates:
 *   - referral_codes (user's referral code + generation timestamp)
 *   - referral_claims (tracks referrer → referred relationships & bonus state)
 */
async function bootstrapTables() {
  try {
    // Check if referral_codes table exists
    await db.get('SELECT 1 FROM referral_codes LIMIT 1').catch(async () => {
      // Table doesn't exist, create it
      await db.run(`
        CREATE TABLE IF NOT EXISTS referral_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          code TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.warn('[Referral] referral_codes table created');
    });

    // Check if referral_claims table exists
    await db.get('SELECT 1 FROM referral_claims LIMIT 1').catch(async () => {
      // Table doesn't exist, create it
      await db.run(`
        CREATE TABLE IF NOT EXISTS referral_claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_id INTEGER NOT NULL REFERENCES users(id),
          referred_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          bonus_given INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.warn('[Referral] referral_claims table created');
    });
  } catch (err) {
    console.warn('[Referral] bootstrapTables error:', err.message);
  }
}

// Ensure tables exist on load
bootstrapTables();

/**
 * Generate a referral code from username + random alphanumeric.
 * Format: first 3 chars of username (uppercase) + 5 random alphanumeric chars
 */
function generateReferralCode(username) {
  const prefix = username.substring(0, 3).toUpperCase();
  const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  return prefix + random;
}

/**
 * ── GET /api/referral ──────────────────────────────────────────────────
 * Get the user's referral code and referral statistics.
 *
 * If the user doesn't have a referral code yet, generate one.
 *
 * Response:
 *   {
 *     code: string,
 *     totalReferred: number,
 *     totalEarned: number,
 *     referrals: [
 *       {
 *         referred_id: number,
 *         referred_username: string,
 *         bonus_given: boolean,
 *         created_at: string
 *       }
 *     ]
 *   }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has a referral code
    let refCode = await db.get(
      'SELECT code FROM referral_codes WHERE user_id = ?',
      [userId]
    );

    // If not, generate one
    if (!refCode) {
      const newCode = generateReferralCode(req.user.username);
      await db.run(
        'INSERT INTO referral_codes (user_id, code) VALUES (?, ?)',
        [userId, newCode]
      );
      refCode = { code: newCode };
    }

    // Get referral statistics
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_referred,
        SUM(CASE WHEN bonus_given = 1 THEN 25 ELSE 0 END) as total_earned
      FROM referral_claims
      WHERE referrer_id = ?
    `, [userId]);

    const totalReferred = stats?.total_referred ? parseInt(stats.total_referred, 10) : 0;
    const totalEarned = stats?.total_earned ? parseFloat(stats.total_earned) : 0;

    // Get list of referrals with referred user details
    const referrals = await db.all(`
      SELECT
        rc.referred_id,
        u.username as referred_username,
        rc.bonus_given,
        rc.created_at
      FROM referral_claims rc
      JOIN users u ON u.id = rc.referred_id
      WHERE rc.referrer_id = ?
      ORDER BY rc.created_at DESC
    `, [userId]);

    return res.json({
      code: refCode.code,
      totalReferred,
      totalEarned,
      referrals: referrals.map(r => ({
        referred_id: r.referred_id,
        referred_username: r.referred_username,
        bonus_given: r.bonus_given === 1,
        created_at: r.created_at
      }))
    });
  } catch (err) {
    console.warn('[Referral] GET / error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch referral data' });
  }
});

/**
 * ── POST /api/referral/claim ───────────────────────────────────────────
 * Claim a referral code during signup flow.
 *
 * Request body:
 *   { code: string }
 *
 * Validations:
 *   - Code must exist in referral_codes
 *   - User cannot be the one who created the code (self-referral)
 *   - User cannot already be referred by someone else
 *
 * Response:
 *   { success: true, referrer_username: string }
 */
router.post('/claim', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    // Validate code provided
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Find the referral code owner
    const refCode = await db.get(
      'SELECT user_id FROM referral_codes WHERE code = ?',
      [code]
    );

    if (!refCode) {
      return res.status(400).json({ error: 'Referral code not found' });
    }

    const referrerId = refCode.user_id;

    // Prevent self-referral
    if (referrerId === userId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Check if user is already referred
    const existingClaim = await db.get(
      'SELECT id FROM referral_claims WHERE referred_id = ?',
      [userId]
    );

    if (existingClaim) {
      return res.status(400).json({ error: 'You have already been referred' });
    }

    // Record the claim
    await db.run(
      'INSERT INTO referral_claims (referrer_id, referred_id, bonus_given) VALUES (?, ?, ?)',
      [referrerId, userId, 0]
    );

    // Get referrer username for response
    const referrer = await db.get(
      'SELECT username FROM users WHERE id = ?',
      [referrerId]
    );

    return res.json({
      success: true,
      referrer_username: referrer?.username || 'Unknown'
    });
  } catch (err) {
    console.warn('[Referral] POST /claim error:', err.message);
    return res.status(500).json({ error: 'Failed to claim referral code' });
  }
});

/**
 * ── POST /api/referral/reward ──────────────────────────────────────────
 * Award bonuses when a referred user makes their first deposit.
 *
 * Called internally when referred user deposits. Awards:
 *   - Referrer: $25 bonus
 *   - Referred user: $15 bonus
 *
 * Request body:
 *   { referred_user_id: number } (optional, defaults to authenticated user)
 *
 * Response:
 *   {
 *     success: true,
 *     referrer_bonus: 25,
 *     referred_bonus: 15
 *   }
 */
router.post('/reward', authenticate, async (req, res) => {
  try {
    const referredUserId = req.body.referred_user_id || req.user.id;

    // Find unclaimed referral record for this user
    const claim = await db.get(
      'SELECT referrer_id, bonus_given FROM referral_claims WHERE referred_id = ? AND bonus_given = 0',
      [referredUserId]
    );

    if (!claim) {
      return res.status(400).json({ error: 'No pending referral bonus found' });
    }

    const referrerId = claim.referrer_id;
    const referrerBonus = 25;
    const referredBonus = 15;

    // Get current balances
    const referrer = await db.get(
      'SELECT balance FROM users WHERE id = ?',
      [referrerId]
    );

    const referred = await db.get(
      'SELECT balance FROM users WHERE id = ?',
      [referredUserId]
    );

    if (!referrer || !referred) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Update referrer balance
    const referrerNewBalance = parseFloat(referrer.balance) + referrerBonus;
    await db.run(
      'UPDATE users SET balance = ? WHERE id = ?',
      [referrerNewBalance, referrerId]
    );

    // Record referrer transaction
    await db.run(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
      [referrerId, 'referral_bonus', referrerBonus, parseFloat(referrer.balance), referrerNewBalance, `Referral of user ${referredUserId}`]
    );

    // Update referred user balance
    const referredNewBalance = parseFloat(referred.balance) + referredBonus;
    await db.run(
      'UPDATE users SET balance = ? WHERE id = ?',
      [referredNewBalance, referredUserId]
    );

    // Record referred transaction
    await db.run(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
      [referredUserId, 'referral_bonus', referredBonus, parseFloat(referred.balance), referredNewBalance, `Referral bonus from user ${referrerId}`]
    );

    // Mark bonus as given
    await db.run(
      'UPDATE referral_claims SET bonus_given = 1 WHERE referred_id = ?',
      [referredUserId]
    );

    return res.json({
      success: true,
      referrer_bonus: referrerBonus,
      referred_bonus: referredBonus
    });
  } catch (err) {
    console.warn('[Referral] POST /reward error:', err.message);
    return res.status(500).json({ error: 'Failed to award referral bonus' });
  }
});

/**
 * ── GET /api/referral/admin/stats ──────────────────────────────────────
 * Admin-only endpoint for referral system statistics.
 *
 * Response:
 *   {
 *     total_referrals: number,
 *     total_bonuses_paid: number,
 *     top_referrers: [
 *       {
 *         referrer_username: string,
 *         referral_count: number,
 *         bonuses_earned: number
 *       }
 *     ]
 *   }
 */
router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    // Total referrals (all claimed codes)
    const totalStats = await db.get(`
      SELECT
        COUNT(*) as total_referrals,
        SUM(CASE WHEN bonus_given = 1 THEN 25 ELSE 0 END) as total_bonuses_paid
      FROM referral_claims
    `);

    const totalReferrals = totalStats?.total_referrals ? parseInt(totalStats.total_referrals, 10) : 0;
    const totalBonusesPaid = totalStats?.total_bonuses_paid ? parseFloat(totalStats.total_bonuses_paid) : 0;

    // Top referrers
    const topReferrers = await db.all(`
      SELECT
        u.username as referrer_username,
        COUNT(*) as referral_count,
        SUM(CASE WHEN rc.bonus_given = 1 THEN 25 ELSE 0 END) as bonuses_earned
      FROM referral_claims rc
      JOIN users u ON u.id = rc.referrer_id
      GROUP BY rc.referrer_id, u.username
      ORDER BY referral_count DESC
      LIMIT 10
    `);

    return res.json({
      total_referrals: totalReferrals,
      total_bonuses_paid: totalBonusesPaid,
      top_referrers: topReferrers.map(r => ({
        referrer_username: r.referrer_username,
        referral_count: parseInt(r.referral_count, 10),
        bonuses_earned: parseFloat(r.bonuses_earned) || 0
      }))
    });
  } catch (err) {
    console.warn('[Referral] GET /admin/stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

module.exports = router;
