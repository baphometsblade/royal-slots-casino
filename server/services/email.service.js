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

module.exports = { sendPasswordReset };
