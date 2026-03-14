'use strict';

const router = require('express').Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// Bootstrap table creation at module load
(async () => {
  try {
    var isPg = db.isPg ? db.isPg() : false;
    var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    var tsDef = isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : "TEXT DEFAULT (datetime('now'))";

    var createTableSQL = `
      CREATE TABLE IF NOT EXISTS loss_insurance_policies (
        id ${idDef},
        user_id INTEGER NOT NULL,
        tier TEXT NOT NULL,
        cost INTEGER NOT NULL,
        threshold INTEGER NOT NULL,
        refund_pct INTEGER NOT NULL,
        purchased_at ${tsDef},
        expires_at TIMESTAMP,
        claimed INTEGER DEFAULT 0,
        claim_amount INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    await db.run(createTableSQL);
  } catch (err) {
    console.warn('Loss insurance table bootstrap error:', err.message);
  }
})();

// Insurance tier definitions
const TIERS = {
  bronze: { cost: 50, threshold: 200, refund_pct: 10 },
  silver: { cost: 150, threshold: 100, refund_pct: 20 },
  gold: { cost: 500, threshold: 50, refund_pct: 35 }
};

const POLICY_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * GET /
 * Get user's active insurance policy and available tiers
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active policy (not expired, not yet claimed)
    var now = new Date().toISOString();
    var activePolicySQL = `
      SELECT id, user_id, tier, cost, threshold, refund_pct, purchased_at, expires_at, claimed, claim_amount
      FROM loss_insurance_policies
      WHERE user_id = ? AND claimed = 0 AND expires_at > ?
      ORDER BY purchased_at DESC
      LIMIT 1
    `;

    const activePolicy = await db.get(activePolicySQL, [userId, now]);

    res.json({
      active_policy: activePolicy || null,
      available_tiers: TIERS
    });
  } catch (err) {
    console.warn('GET /loss-insurance error:', err.message);
    res.status(500).json({ error: 'Failed to fetch insurance policy' });
  }
});

/**
 * POST /purchase
 * Buy an insurance policy
 */
router.post('/purchase', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier } = req.body;

    // Validate tier
    if (!tier || !TIERS[tier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const tierConfig = TIERS[tier];

    // Check if user already has active policy
    var now = new Date().toISOString();
    var activePolicySQL = `
      SELECT id FROM loss_insurance_policies
      WHERE user_id = ? AND claimed = 0 AND expires_at > ?
      LIMIT 1
    `;
    const existingPolicy = await db.get(activePolicySQL, [userId, now]);

    if (existingPolicy) {
      return res.status(400).json({ error: 'You already have an active insurance policy' });
    }

    // Check user balance
    var getUserSQL = `SELECT balance FROM users WHERE id = ?`;
    const user = await db.get(getUserSQL, [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < tierConfig.cost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct cost from balance
    var updateBalanceSQL = `UPDATE users SET balance = balance - ? WHERE id = ?`;
    await db.run(updateBalanceSQL, [tierConfig.cost, userId]);

    // Create policy
    var expiresAt = new Date(Date.now() + POLICY_DURATION_MS).toISOString();
    var insertPolicySQL = `
      INSERT INTO loss_insurance_policies
      (user_id, tier, cost, threshold, refund_pct, purchased_at, expires_at, claimed, claim_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
    `;

    var result = await db.run(insertPolicySQL, [
      userId,
      tier,
      tierConfig.cost,
      tierConfig.threshold,
      tierConfig.refund_pct,
      now,
      expiresAt
    ]);

    res.json({
      success: true,
      policy_id: result.lastID,
      tier: tier,
      cost: tierConfig.cost,
      expires_at: expiresAt
    });
  } catch (err) {
    console.warn('POST /loss-insurance/purchase error:', err.message);
    res.status(500).json({ error: 'Failed to purchase insurance' });
  }
});

/**
 * POST /claim
 * Claim insurance payout
 */
router.post('/claim', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active policy
    var now = new Date().toISOString();
    var activePolicySQL = `
      SELECT id, user_id, tier, cost, threshold, refund_pct, purchased_at, expires_at, claimed
      FROM loss_insurance_policies
      WHERE user_id = ? AND claimed = 0 AND expires_at > ?
      ORDER BY purchased_at DESC
      LIMIT 1
    `;

    const policy = await db.get(activePolicySQL, [userId, now]);

    if (!policy) {
      return res.status(400).json({ error: 'No active insurance policy' });
    }

    if (policy.claimed === 1) {
      return res.status(400).json({ error: 'Policy already claimed' });
    }

    // Calculate net loss during policy window
    var getSpinsSQL = `
      SELECT SUM(bet_amount) as total_bet, SUM(win_amount) as total_win
      FROM spins
      WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    `;

    const spinData = await db.get(getSpinsSQL, [userId, policy.purchased_at, policy.expires_at]);

    const totalBet = spinData.total_bet || 0;
    const totalWin = spinData.total_win || 0;
    const netLoss = totalBet - totalWin;

    // Check if loss exceeds threshold
    let claimAmount = 0;
    if (netLoss > policy.threshold) {
      const lossesAboveThreshold = netLoss - policy.threshold;
      claimAmount = Math.floor(lossesAboveThreshold * (policy.refund_pct / 100));
    }

    // Update policy as claimed
    var updatePolicySQL = `
      UPDATE loss_insurance_policies
      SET claimed = 1, claim_amount = ?
      WHERE id = ?
    `;
    await db.run(updatePolicySQL, [claimAmount, policy.id]);

    // If eligible, add payout to user balance
    if (claimAmount > 0) {
      var creditBalanceSQL = `UPDATE users SET balance = balance + ? WHERE id = ?`;
      await db.run(creditBalanceSQL, [claimAmount, userId]);
    }

    res.json({
      success: true,
      policy_id: policy.id,
      tier: policy.tier,
      total_loss: netLoss,
      threshold: policy.threshold,
      claim_eligible: netLoss > policy.threshold,
      claim_amount: claimAmount
    });
  } catch (err) {
    console.warn('POST /loss-insurance/claim error:', err.message);
    res.status(500).json({ error: 'Failed to claim insurance' });
  }
});

/**
 * GET /history
 * Get user's past insurance purchases and claims
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    var historySQL = `
      SELECT id, tier, cost, threshold, refund_pct, purchased_at, expires_at, claimed, claim_amount
      FROM loss_insurance_policies
      WHERE user_id = ?
      ORDER BY purchased_at DESC
    `;

    const history = await db.all(historySQL, [userId]);

    res.json({
      history: history || []
    });
  } catch (err) {
    console.warn('GET /loss-insurance/history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch insurance history' });
  }
});

module.exports = router;
