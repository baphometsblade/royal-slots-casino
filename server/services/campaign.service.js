'use strict';
const db = require('../database');

/**
 * Get active campaigns visible to a user
 */
async function getActiveCampaigns(userId) {
    const campaigns = await db.all(`
        SELECT c.*,
               (SELECT COUNT(*) FROM campaign_claims cc WHERE cc.campaign_id = c.id AND cc.user_id = ?) as user_claimed
        FROM campaigns c
        WHERE c.active = 1
          AND c.start_at <= datetime('now')
          AND c.end_at > datetime('now')
          AND (c.max_claims = 0 OR c.claims_count < c.max_claims)
        ORDER BY c.end_at ASC
    `, [userId]);

    return campaigns.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        bonusPct: c.bonus_pct,
        maxBonus: c.max_bonus,
        wageringMult: c.wagering_mult,
        minDeposit: c.min_deposit,
        startAt: c.start_at,
        endAt: c.end_at,
        promoCode: c.promo_code,
        claimed: c.user_claimed > 0,
        claimsRemaining: c.max_claims > 0 ? c.max_claims - c.claims_count : null,
        targetSegment: c.target_segment
    }));
}

/**
 * Admin: create a new campaign
 */
async function createCampaign(data) {
    const result = await db.run(`
        INSERT INTO campaigns (name, type, bonus_pct, max_bonus, wagering_mult, min_deposit, start_at, end_at, promo_code, target_segment, max_claims)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.name, data.type || 'deposit_match', data.bonusPct || 50, data.maxBonus || 200,
        data.wageringMult || 25, data.minDeposit || 10, data.startAt, data.endAt,
        data.promoCode || null, data.targetSegment || 'all', data.maxClaims || 0]);
    return result;
}

/**
 * Admin: list all campaigns
 */
async function getAllCampaigns() {
    return db.all(`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 50`);
}

/**
 * Admin: toggle campaign active status
 */
async function toggleCampaign(campaignId, active) {
    return db.run(`UPDATE campaigns SET active = ? WHERE id = ?`, [active ? 1 : 0, campaignId]);
}

module.exports = { getActiveCampaigns, createCampaign, getAllCampaigns, toggleCampaign };
