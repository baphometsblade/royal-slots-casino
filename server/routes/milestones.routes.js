'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../database');

// Bootstrap: add milestone_last_claimed column safely (no-op if already exists)
db.run("ALTER TABLE users ADD COLUMN milestone_last_claimed INTEGER DEFAULT 0").catch(function() {});

const MILESTONES = [
  { spins: 100,   gems: 50,   credits: 0,     label: 'First Century' },
  { spins: 250,   gems: 100,  credits: 0.50,  label: 'Quarter Thousand' },
  { spins: 500,   gems: 200,  credits: 1.00,  label: 'Half Grand' },
  { spins: 1000,  gems: 500,  credits: 2.00,  label: 'Spinning Centurion' },
  { spins: 2500,  gems: 1000, credits: 5.00,  label: 'High Roller' },
  { spins: 5000,  gems: 2000, credits: 10.00, label: 'Legend' },
  { spins: 10000, gems: 5000, credits: 25.00, label: 'Elite' },
];

// GET /api/milestones/status
router.get('/status', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;

    var spinRow = await db.get('SELECT COUNT(*) as cnt FROM spins WHERE user_id = ?', [userId]);
    var totalSpins = spinRow ? (spinRow.cnt || 0) : 0;

    var userRow = await db.get('SELECT milestone_last_claimed FROM users WHERE id = ?', [userId]);
    var lastClaimed = userRow ? (userRow.milestone_last_claimed || 0) : 0;

    var pendingMilestone = null;
    for (var i = MILESTONES.length - 1; i >= 0; i--) {
      if (MILESTONES[i].spins <= totalSpins && MILESTONES[i].spins > lastClaimed) {
        pendingMilestone = MILESTONES[i];
        break;
      }
    }

    var nextMilestone = null;
    for (var j = 0; j < MILESTONES.length; j++) {
      if (MILESTONES[j].spins > totalSpins) {
        nextMilestone = MILESTONES[j];
        break;
      }
    }

    return res.json({
      totalSpins: totalSpins,
      nextMilestone: nextMilestone ? nextMilestone.spins : null,
      nextMilestoneLabel: nextMilestone ? nextMilestone.label : null,
      spinsUntilNext: nextMilestone ? nextMilestone.spins - totalSpins : 0,
      pendingClaim: !!pendingMilestone,
      pendingMilestone: pendingMilestone || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/milestones/claim
router.post('/claim', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;

    var spinRow = await db.get('SELECT COUNT(*) as cnt FROM spins WHERE user_id = ?', [userId]);
    var totalSpins = spinRow ? (spinRow.cnt || 0) : 0;

    var userRow = await db.get('SELECT milestone_last_claimed, balance FROM users WHERE id = ?', [userId]);
    var lastClaimed = userRow ? (userRow.milestone_last_claimed || 0) : 0;

    var milestone = null;
    for (var i = MILESTONES.length - 1; i >= 0; i--) {
      if (MILESTONES[i].spins <= totalSpins && MILESTONES[i].spins > lastClaimed) {
        milestone = MILESTONES[i];
        break;
      }
    }

    if (!milestone) {
      return res.status(400).json({ error: 'No milestone to claim' });
    }

    // Award credits to balance
    if (milestone.credits > 0) {
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [milestone.credits, userId]);
    }

    // Record transaction
    var description = 'Milestone: ' + milestone.label + ' (' + milestone.spins + ' spins)';
    await db.run(
      "INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'milestone', ?, ?)",
      [userId, milestone.credits, description]
    );

    // Update milestone_last_claimed
    await db.run('UPDATE users SET milestone_last_claimed = ? WHERE id = ?', [milestone.spins, userId]);

    // Get updated balance
    var updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
    var newBalance = updatedUser ? (updatedUser.balance || 0) : 0;

    return res.json({
      success: true,
      milestone: milestone.spins,
      label: milestone.label,
      reward: {
        gems: milestone.gems,
        credits: milestone.credits,
      },
      newBalance: newBalance,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
