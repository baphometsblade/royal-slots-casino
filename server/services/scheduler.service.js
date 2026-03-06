'use strict';

const cron = require('node-cron');
const db = require('../database');
const emailService = require('./email.service');
const config = require('../config');

let _started = false;

/**
 * Send re-engagement emails to players who haven't logged in recently.
 * Runs daily at 10:00 AM server time.
 */
async function _sendReengagementEmails() {
    if (!config.SMTP_HOST || !config.SMTP_USER) {
        // No SMTP configured — skip silently
        return;
    }
    try {
        // Find players who haven't logged in for 3-7 days and have played at least once
        // Uses last spin as a proxy for "last active"
        const dormant = await db.all(`
            SELECT u.id, u.email, u.username, u.balance,
                   MAX(s.created_at) as last_spin,
                   COUNT(s.id) as total_spins,
                   SUM(s.bet_amount) as total_wagered
            FROM users u
            JOIN spins s ON s.user_id = u.id
            WHERE u.is_banned = 0
              AND u.email IS NOT NULL
              AND s.created_at < datetime('now', '-3 days')
            GROUP BY u.id
            HAVING MAX(s.created_at) > datetime('now', '-7 days')
            ORDER BY total_wagered DESC
            LIMIT 50
        `);

        for (const player of dormant) {
            await emailService.sendReengagementEmail(player.email, player.username, player.balance);
            // Small delay to avoid SMTP rate limits
            await new Promise(r => setTimeout(r, 500));
        }

        if (dormant.length > 0) {
            console.log(`[Scheduler] Re-engagement emails sent to ${dormant.length} players`);
        }
    } catch (err) {
        console.error('[Scheduler] Re-engagement error:', err.message);
    }
}

/**
 * Send weekly P&L report to admin.
 * Runs every Monday at 8:00 AM.
 */
async function _sendWeeklyReport() {
    if (!config.SMTP_HOST || !config.ADMIN_EMAIL) return;
    try {
        const stats = await db.get(`
            SELECT
                COUNT(DISTINCT s.user_id) as active_players,
                COUNT(s.id) as total_spins,
                SUM(s.bet_amount) as total_wagered,
                SUM(s.win_amount) as total_paid,
                SUM(s.bet_amount) - SUM(s.win_amount) as gross_profit,
                COALESCE(SUM(d.amount), 0) as deposits_this_week
            FROM spins s
            LEFT JOIN deposits d ON d.user_id = s.user_id
                AND d.status = 'completed'
                AND d.created_at > datetime('now', '-7 days')
            WHERE s.created_at > datetime('now', '-7 days')
        `);

        await emailService.sendWeeklyReport(config.ADMIN_EMAIL, stats);
    } catch (err) {
        console.error('[Scheduler] Weekly report error:', err.message);
    }
}

function start() {
    if (_started) return;
    _started = true;

    // Daily re-engagement: 10:00 AM
    cron.schedule('0 10 * * *', _sendReengagementEmails);

    // Weekly P&L report: Monday 8:00 AM
    cron.schedule('0 8 * * 1', _sendWeeklyReport);

    console.log('[Scheduler] Cron jobs started (re-engagement daily 10AM, P&L weekly Mon 8AM)');
}

module.exports = { start };
