const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const config = require('../config');
const gameEngine = require('../services/game-engine');
const houseEdge = require('../services/house-edge');
const games = require('../../shared/game-definitions');

const jackpotService = require('../services/jackpot.service');
const router = express.Router();

// Rate limiting state per user
const lastSpinTime = new Map();
const freeSpinStateByUser = new Map();
// Session win cap duration — caps reset after 24 hours
const SESSION_CAP_DURATION_HOURS = 24;

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
router.post('/', authenticate, async (req, res) => {
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
        const currentUser = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const existingFreeSpinState = freeSpinStateByUser.get(userId) || null;
        const usedFreeSpin = Boolean(
            existingFreeSpinState
            && existingFreeSpinState.active
            && existingFreeSpinState.remaining > 0
        );
        if (!usedFreeSpin && currentUser.balance < bet) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // ── Deduct bet ──
        const balanceBefore = currentUser.balance;
        let balanceAfterBet = balanceBefore;
        if (!usedFreeSpin) {
            balanceAfterBet = balanceBefore - bet;
            await db.run('UPDATE users SET balance = ? WHERE id = ?', [balanceAfterBet, userId]);

            // Log bet transaction
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'bet', -bet, balanceBefore, balanceAfterBet, `spin:${gameId}`]
            );
        }

        // ── Resolve spin (server-side RNG + win calc) ──
        const gameStats = await houseEdge.getGameStats(db, gameId);

        // Check if user has active free spins (stored in memory per user)
        const spinResult = await gameEngine.resolveSpin(game, bet, gameStats, existingFreeSpinState, db);

        // ── Apply per-spin win cap (house protection with profit floor) ──
        const uncappedWinAmount = spinResult.winAmount;
        const cappedWinAmount = await houseEdge.capWinAmount(uncappedWinAmount, bet, game, db);
        spinResult.winAmount = cappedWinAmount;
        applyWinCapMetadata(spinResult, uncappedWinAmount, cappedWinAmount);

        // ── Enforce session win cap ($50k cumulative ceiling, persisted to DB) ──
        const capRow = await db.get('SELECT total_wins, session_start FROM session_win_caps WHERE user_id = ?', [userId]);
        let sessionWins = 0;
        if (capRow) {
            const sessionAge = (Date.now() - new Date(capRow.session_start + 'Z').getTime()) / 3600000;
            if (sessionAge < SESSION_CAP_DURATION_HOURS) {
                sessionWins = capRow.total_wins;
            } else {
                // Session expired — reset
                await db.run("UPDATE session_win_caps SET total_wins = 0, session_start = datetime('now') WHERE user_id = ?", [userId]);
            }
        }
        const remaining     = Math.max(0, config.SESSION_WIN_CAP - sessionWins);
        const sessionCapped = Math.min(spinResult.winAmount, remaining);
        if (sessionCapped < spinResult.winAmount) {
            applyWinCapMetadata(spinResult, spinResult.winAmount, sessionCapped);
            spinResult.winAmount = sessionCapped;
        }
        if (sessionCapped > 0) {
            await db.run(
                `INSERT INTO session_win_caps (user_id, total_wins, session_start)
                 VALUES (?, ?, datetime('now'))
                 ON CONFLICT(user_id) DO UPDATE SET total_wins = total_wins + ?`,
                [userId, sessionCapped, sessionCapped]
            );
        }

        // Persist/clear active free-spin runtime state for this user
        if (spinResult.freeSpinState && spinResult.freeSpinState.active && spinResult.freeSpinState.remaining > 0) {
            freeSpinStateByUser.set(userId, spinResult.freeSpinState);
        } else {
            freeSpinStateByUser.delete(userId);
        }

        // ── Credit win ──
        let finalBalance = balanceAfterBet;
        if (spinResult.winAmount > 0) {
            finalBalance = balanceAfterBet + spinResult.winAmount;
            await db.run('UPDATE users SET balance = ? WHERE id = ?', [finalBalance, userId]);

            await db.run(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'win', spinResult.winAmount, balanceAfterBet, finalBalance, `spin:${gameId}`]
            );
        }

        // -- Jackpot contribution + award check --
        if (!usedFreeSpin && bet > 0) {
            // Contribute to pool (fire-and-forget style -- failures do not block spin)
            jackpotService.contribute(bet).catch(err => console.error('[Jackpot] Contribute error:', err));

            // Check for jackpot win
            const isJackpotGame = Boolean(game.jackpot);
            const jackpotWin = await jackpotService.checkAndAward(userId, bet, game.minBet || 0.20, isJackpotGame);
            if (jackpotWin) {
                // Credit jackpot amount to user
                const balanceBeforeJp = finalBalance;
                finalBalance = balanceBeforeJp + jackpotWin.amount;
                await db.run('UPDATE users SET balance = ? WHERE id = ?', [finalBalance, userId]);
                await db.run(
                    'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, 'jackpot', jackpotWin.amount, balanceBeforeJp, finalBalance, 'jackpot:' + jackpotWin.tier]
                );
                spinResult.jackpotWon = jackpotWin;
            }
        }

        // ── Tournament score submission (fire-and-forget) ──────────────────
        {
            const tournamentService = require('../services/tournament.service');
            const _winMult = bet > 0 ? Math.round((spinResult.winAmount / bet) * 100) / 100 : 0;
            if (_winMult > 0) {
                tournamentService.getActive().then(function(ts) {
                    ts.forEach(function(t) {
                        tournamentService.submitScore(t.id, userId, _winMult).catch(function() {});
                    });
                }).catch(function() {});
            }
        }

        // ── Log spin ──
        await db.run(
            'INSERT INTO spins (user_id, game_id, bet_amount, result_grid, win_amount, rng_seed) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, gameId, usedFreeSpin ? 0 : bet, JSON.stringify(spinResult.grid), spinResult.winAmount, spinResult.seed]
        );

        // ── Update game stats (house edge tracking) ──
        await houseEdge.updateGameStats(db, gameId, usedFreeSpin ? 0 : bet, spinResult.winAmount);

        // ── Response ──
        res.json({
            grid: spinResult.grid,
            winAmount: spinResult.winAmount,
            winDetails: spinResult.winDetails,
            balance: finalBalance,
            freeSpinState: spinResult.freeSpinState,
            scatterTriggered: spinResult.scatterTriggered,
            freeSpinsAwarded: spinResult.freeSpinsAwarded,
            usedFreeSpin,
            jackpotWon: spinResult.jackpotWon || null,
        });

    } catch (err) {
        console.error('[Spin] Error:', err);
        res.status(500).json({ error: 'Spin failed' });
    }
});

module.exports = router;
