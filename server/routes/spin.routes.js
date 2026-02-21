const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const config = require('../config');
const gameEngine = require('../services/game-engine');
const houseEdge = require('../services/house-edge');
const games = require('../../shared/game-definitions');

const router = express.Router();

// Rate limiting state per user
const lastSpinTime = new Map();

function applyWinCapMetadata(spinResult, uncappedWinAmount, cappedWinAmount) {
    if (cappedWinAmount >= uncappedWinAmount) return;

    const moneyPattern = /\$\d[\d,]*(?:\.\d{1,2})?/g;
    const cappedText = `$${cappedWinAmount.toFixed(2)}`;
    const uncappedText = `$${uncappedWinAmount.toFixed(2)}`;
    const details = (spinResult.winDetails && typeof spinResult.winDetails === 'object')
        ? { ...spinResult.winDetails }
        : { type: 'win', message: '' };

    if (typeof details.message === 'string' && details.message.length > 0) {
        const matches = details.message.match(moneyPattern);
        if (matches && matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const lastIndex = details.message.lastIndexOf(lastMatch);
            details.message = `${details.message.slice(0, lastIndex)}${cappedText}${details.message.slice(lastIndex + lastMatch.length)}`;
        } else {
            details.message = `${details.message} ${cappedText}`;
        }

        if (!/capped/i.test(details.message)) {
            details.message += ` (capped from ${uncappedText})`;
        }
    } else {
        details.message = `WIN! ${cappedText} (capped from ${uncappedText}).`;
    }

    details.capped = true;
    details.originalWinAmount = uncappedWinAmount;
    details.cappedWinAmount = cappedWinAmount;
    spinResult.winDetails = details;

    if (spinResult.freeSpinState && typeof spinResult.freeSpinState.totalWin === 'number') {
        const capDelta = uncappedWinAmount - cappedWinAmount;
        if (capDelta > 0) {
            const nextTotal = spinResult.freeSpinState.totalWin - capDelta;
            spinResult.freeSpinState.totalWin = Math.max(0, Math.round(nextTotal * 100) / 100);
        }
    }
}

// POST /api/spin
router.post('/', authenticate, (req, res) => {
    try {
        const { gameId, betAmount } = req.body;
        const userId = req.user.id;

        // ── Validate game ──
        const game = games.find(g => g.id === gameId);
        if (!game) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }

        // ── Validate bet ──
        const bet = parseFloat(betAmount);
        if (isNaN(bet) || bet <= 0) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }
        if (bet < game.minBet) {
            return res.status(400).json({ error: `Minimum bet is $${game.minBet}` });
        }
        if (bet > game.maxBet) {
            return res.status(400).json({ error: `Maximum bet is $${game.maxBet}` });
        }
        if (bet > config.MAX_BET) {
            return res.status(400).json({ error: `Maximum bet is $${config.MAX_BET}` });
        }

        // ── Rate limit (2 spins/sec) ──
        const now = Date.now();
        const lastSpin = lastSpinTime.get(userId) || 0;
        if (now - lastSpin < 1000 / config.MAX_SPINS_PER_SECOND) {
            return res.status(429).json({ error: 'Spinning too fast. Please wait.' });
        }
        lastSpinTime.set(userId, now);

        // ── Check balance (fresh from DB) ──
        const currentUser = db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        if (!currentUser || currentUser.balance < bet) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // ── Deduct bet ──
        const balanceBefore = currentUser.balance;
        const balanceAfterBet = balanceBefore - bet;
        db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfterBet, userId]);

        // Log bet transaction
        db.run(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'bet', -bet, balanceBefore, balanceAfterBet, `spin:${gameId}`]
        );

        // ── Resolve spin (server-side RNG + win calc) ──
        const gameStats = houseEdge.getGameStats(db, gameId);

        // Check if user has active free spins (stored in session/memory)
        // For simplicity, free spins are resolved as part of the spin response
        const spinResult = gameEngine.resolveSpin(game, bet, gameStats, null, db);

        // ── Apply win cap (house protection with profit floor) ──
        const uncappedWinAmount = spinResult.winAmount;
        const cappedWinAmount = houseEdge.capWinAmount(uncappedWinAmount, bet, game, db);
        spinResult.winAmount = cappedWinAmount;
        applyWinCapMetadata(spinResult, uncappedWinAmount, cappedWinAmount);

        // ── Credit win ──
        let finalBalance = balanceAfterBet;
        if (spinResult.winAmount > 0) {
            finalBalance = balanceAfterBet + spinResult.winAmount;
            db.run('UPDATE users SET balance = ? WHERE id = ?', [finalBalance, userId]);

            db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'win', spinResult.winAmount, balanceAfterBet, finalBalance, `spin:${gameId}`]
            );
        }

        // ── Log spin ──
        db.run(
            'INSERT INTO spins (user_id, game_id, bet_amount, result_grid, win_amount, rng_seed) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, gameId, bet, JSON.stringify(spinResult.grid), spinResult.winAmount, spinResult.seed]
        );

        // ── Update game stats (house edge tracking) ──
        houseEdge.updateGameStats(db, gameId, bet, spinResult.winAmount);

        // ── Response ──
        res.json({
            grid: spinResult.grid,
            winAmount: spinResult.winAmount,
            winDetails: spinResult.winDetails,
            balance: finalBalance,
            freeSpinState: spinResult.freeSpinState,
            scatterTriggered: spinResult.scatterTriggered,
            freeSpinsAwarded: spinResult.freeSpinsAwarded,
        });

    } catch (err) {
        console.error('[Spin] Error:', err);
        res.status(500).json({ error: 'Spin failed' });
    }
});

module.exports = router;
