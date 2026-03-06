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

module.exports = { sendPasswordReset, sendReengagementEmail, sendWeeklyReport };
