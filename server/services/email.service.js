'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;
    if (!config.SMTP_HOST || !config.SMTP_USER) return null;

    _transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });
    return _transporter;
}

/**
 * Send a password reset email.
 * Returns true on success, false if SMTP is not configured.
 * Throws on SMTP delivery failure.
 */
async function sendPasswordReset(toEmail, resetUrl, expiryHours) {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('[Email] SMTP not configured — password reset email not sent');
        return false;
    }

    await transporter.sendMail({
        from: config.SMTP_FROM,
        to: toEmail,
        subject: 'Matrix Spins — Password Reset',
        text: [
            'You requested a password reset for your Matrix Spins account.',
            '',
            `Click the link below to reset your password (expires in ${expiryHours} hour${expiryHours !== 1 ? 's' : ''}):`,
            '',
            resetUrl,
            '',
            'If you did not request this, please ignore this email.',
            '',
            'Matrix Spins',
        ].join('\n'),
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#0d0d1a;color:#fff;padding:40px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,215,0,0.3);border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#ffd700,#ff8c00);padding:20px;text-align:center">
      <h1 style="margin:0;color:#0d0d1a;font-size:24px">&#127920; Matrix Spins</h1>
    </div>
    <div style="padding:32px">
      <h2 style="color:#ffd700;margin-top:0">Password Reset Request</h2>
      <p style="color:#ccc;line-height:1.6">We received a request to reset your password. Click the button below to create a new one. This link expires in <strong style="color:#ffd700">${expiryHours} hour${expiryHours !== 1 ? 's' : ''}</strong>.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}" style="background:linear-gradient(135deg,#ffd700,#ff8c00);color:#0d0d1a;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block">Reset My Password</a>
      </div>
      <p style="color:#888;font-size:13px">If the button doesn&rsquo;t work, copy and paste this link:</p>
      <p style="color:#aaa;font-size:12px;word-break:break-all">${resetUrl}</p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0">
      <p style="color:#666;font-size:12px">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
    </div>
  </div>
</body>
</html>`,
    });

    return true;
}

async function sendReengagementEmail(toEmail, username, balance) {
    const transporter = getTransporter();
    if (!transporter) return false;

    const balStr = Number(balance) > 0 ? `${Number(balance).toFixed(2)}` : null;
    const balLine = balStr
        ? `<p style="color:#10b981;font-size:14px;">You still have <strong>${balStr}</strong> in your account ready to play!</p>`
        : '';

    await transporter.sendMail({
        from: config.SMTP_FROM,
        to: toEmail,
        subject: `${username}, your luck is waiting at Matrix Spins 🎰`,
        text: `Hi ${username},

We noticed you haven't spun in a few days. Come back and try your luck — new games added daily!

Play now: https://matrixspins.com

Matrix Spins`,
        html: `<!DOCTYPE html><html><body style="background:#0d0d1a;font-family:sans-serif;padding:24px;">
<div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:12px;padding:28px;color:#f1f5f9;text-align:center;">
  <div style="font-size:3rem;margin-bottom:8px;">🎰</div>
  <h2 style="color:#ffd700;margin:0 0 8px;">We miss you, ${username}!</h2>
  <p style="color:#94a3b8;margin:0 0 16px;">It's been a few days since your last spin. Your luck could be different today.</p>
  ${balLine}
  <a href="https://matrixspins.com" style="display:inline-block;margin:16px 0;background:linear-gradient(135deg,#ffd700,#ff8c00);color:#0d0d1a;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Spin Now</a>
  <p style="color:#64748b;font-size:12px;margin-top:20px;">Matrix Spins — Play responsibly. Unsubscribe at any time.</p>
</div></body></html>`,
    });
    return true;
}

async function sendWeeklyReport(toEmail, stats) {
    const transporter = getTransporter();
    if (!transporter) {
        console.log('[Scheduler] Weekly P&L:', JSON.stringify(stats));
        return false;
    }
    const profit   = Number(stats && stats.gross_profit   || 0).toFixed(2);
    const wagered  = Number(stats && stats.total_wagered  || 0).toFixed(2);
    const players  = stats && stats.active_players || 0;
    const spins    = stats && stats.total_spins    || 0;
    const deposits = Number(stats && stats.deposits_this_week || 0).toFixed(2);

    await transporter.sendMail({
        from: config.SMTP_FROM,
        to: toEmail,
        subject: `Matrix Spins Weekly P&L — ${profit} profit`,
        text: `Weekly Report

Gross Profit: ${profit}
Total Wagered: ${wagered}
Active Players: ${players}
Total Spins: ${spins}
Deposits: ${deposits}`,
        html: `<!DOCTYPE html><html><body style="background:#0d0d1a;font-family:sans-serif;padding:24px;">
<div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:12px;padding:24px;color:#f1f5f9;">
<h2 style="color:#ffd700;margin:0 0 16px;">Weekly P&amp;L Report</h2>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="color:#94a3b8;padding:8px 0;">Gross Profit</td><td style="color:#10b981;font-size:20px;font-weight:700;">${profit}</td></tr>
  <tr><td style="color:#94a3b8;padding:8px 0;">Total Wagered</td><td style="font-weight:700;">${wagered}</td></tr>
  <tr><td style="color:#94a3b8;padding:8px 0;">Deposits This Week</td><td style="font-weight:700;">${deposits}</td></tr>
  <tr><td style="color:#94a3b8;padding:8px 0;">Active Players</td><td style="font-weight:700;">${players}</td></tr>
  <tr><td style="color:#94a3b8;padding:8px 0;">Total Spins</td><td style="font-weight:700;">${spins}</td></tr>
</table>
</div></body></html>`,
    });
    return true;
}

/**
 * Send a deposit nudge email to a user who registered but never deposited.
 * Highlights the 100% welcome bonus to drive first-time deposits.
 */
async function sendDepositNudgeEmail(toEmail, username) {
    const transporter = getTransporter();
    if (!transporter) return false;

    await transporter.sendMail({
        from: config.SMTP_FROM,
        to: toEmail,
        subject: `${username}, claim your welcome bonus at Matrix Spins 🎰`,
        text: `Hi ${username},

You registered at Matrix Spins but haven't made your first deposit yet.

Don't miss out — we'll match your first deposit 100% up to $500!

That means if you deposit $100, you'll play with $200. Welcome bonus expires in 7 days.

Claim your bonus now: https://matrixspins.com

Matrix Spins`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#0d0d1a;color:#fff;padding:40px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,215,0,0.3);border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#ffd700,#ff8c00);padding:24px;text-align:center">
      <h1 style="margin:0;color:#0d0d1a;font-size:26px">&#127920; Matrix Spins</h1>
      <p style="margin:6px 0 0;color:#0d0d1a;font-size:14px;font-weight:bold;">Your welcome bonus is waiting</p>
    </div>
    <div style="padding:32px;text-align:center">
      <h2 style="color:#ffd700;margin-top:0;font-size:22px">Hi ${username}!</h2>
      <p style="color:#ccc;line-height:1.7;margin:0 0 20px;">You're just one step away from unlocking the full Matrix Spins experience. Make your first deposit and we'll <strong style="color:#ffd700">double it instantly</strong>.</p>

      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,140,0,0.1));border:2px solid rgba(255,215,0,0.5);border-radius:12px;padding:24px;margin:0 0 24px;">
        <div style="font-size:42px;margin-bottom:8px;">&#127775;</div>
        <div style="color:#ffd700;font-size:32px;font-weight:900;letter-spacing:-1px;">100% MATCH BONUS</div>
        <div style="color:#fff;font-size:16px;margin:6px 0 4px;">on your first deposit up to</div>
        <div style="color:#10b981;font-size:36px;font-weight:900;">$500</div>
      </div>

      <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">Deposit $100 &rarr; Play with $200</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Deposit $500 &rarr; Play with $1,000</p>

      <a href="https://matrixspins.com" style="display:inline-block;background:linear-gradient(135deg,#ffd700,#ff8c00);color:#0d0d1a;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:900;font-size:18px;letter-spacing:0.5px;">Claim My Bonus &#8594;</a>

      <div style="margin:24px 0 0;padding:12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;">
        <p style="color:#fca5a5;font-size:13px;margin:0;">&#9201; Welcome bonus expires in <strong>7 days</strong> — don't let it go to waste!</p>
      </div>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:28px 0 20px">
      <p style="color:#475569;font-size:12px;margin:0;">Matrix Spins — Play responsibly. 18+ only. Terms apply.</p>
    </div>
  </div>
</body>
</html>`,
    });
    return true;
}

/**
 * Send a VIP tier-up congratulation email.
 * @param {string} toEmail
 * @param {string} username
 * @param {{ tierName: string, emoji: string, benefit: string }} tier
 */
async function sendVipTierEmail(toEmail, username, tier) {
    const transporter = getTransporter();
    if (!transporter) return false;

    const tierColors = {
        Silver:   { bg: '#c0c0c0', text: '#1a1a2e', glow: 'rgba(192,192,192,0.4)' },
        Gold:     { bg: '#ffd700', text: '#0d0d1a', glow: 'rgba(255,215,0,0.4)'   },
        Platinum: { bg: '#e5e4e2', text: '#1a1a2e', glow: 'rgba(229,228,226,0.4)' },
        Diamond:  { bg: '#b9f2ff', text: '#0d0d1a', glow: 'rgba(185,242,255,0.5)' },
    };
    const colors = tierColors[tier.tierName] || tierColors.Gold;

    await transporter.sendMail({
        from: config.SMTP_FROM,
        to: toEmail,
        subject: `${tier.emoji} Congratulations ${username} — You've reached ${tier.tierName} VIP!`,
        text: `Congratulations ${username}!

You've reached ${tier.tierName} VIP status at Matrix Spins!

Your new benefit: ${tier.benefit}

Keep playing to unlock even more rewards.

Play now: https://matrixspins.com

Matrix Spins`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#0d0d1a;color:#fff;padding:40px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid ${colors.glow};border-radius:12px;overflow:hidden;box-shadow:0 0 30px ${colors.glow}">
    <div style="background:linear-gradient(135deg,${colors.bg},${colors.bg}cc);padding:28px;text-align:center">
      <div style="font-size:52px;line-height:1;">${tier.emoji}</div>
      <h1 style="margin:8px 0 4px;color:${colors.text};font-size:22px;">&#127920; Matrix Spins</h1>
      <p style="margin:0;color:${colors.text};font-size:14px;opacity:0.8;">VIP Status Upgrade</p>
    </div>
    <div style="padding:32px;text-align:center">
      <h2 style="color:#ffd700;margin-top:0;font-size:20px;">Congratulations, ${username}!</h2>
      <p style="color:#ccc;line-height:1.7;margin:0 0 24px;">Your dedication has paid off. You've officially reached <strong style="color:${colors.bg}">${tier.tierName} VIP</strong> status — one of our most valued players!</p>

      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,140,0,0.05));border:2px solid ${colors.glow};border-radius:14px;padding:28px;margin:0 0 24px;">
        <div style="font-size:60px;margin-bottom:12px;">${tier.emoji}</div>
        <div style="color:${colors.bg};font-size:28px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">${tier.tierName} VIP</div>
        <div style="width:60px;height:3px;background:${colors.bg};margin:12px auto;border-radius:2px;"></div>
        <div style="color:#e2e8f0;font-size:15px;line-height:1.6;">&#10003; <strong>${tier.benefit}</strong></div>
      </div>

      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Your new perks are active immediately. Keep playing to unlock the next tier and even greater rewards!</p>

      <a href="https://matrixspins.com" style="display:inline-block;background:linear-gradient(135deg,${colors.bg},${colors.bg}cc);color:${colors.text};text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:900;font-size:17px;">Play as ${tier.tierName} VIP &#8594;</a>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:28px 0 20px">
      <p style="color:#475569;font-size:12px;margin:0;">Matrix Spins — Play responsibly. 18+ only.</p>
    </div>
  </div>
</body>
</html>`,
    });
    return true;
}

module.exports = {
    sendPasswordReset,
    sendReengagementEmail,
    sendWeeklyReport,
    sendDepositNudgeEmail,
    sendVipTierEmail,
};
