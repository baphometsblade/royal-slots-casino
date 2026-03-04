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

        // ── Daily loss limit check (before spinning) ──
        const lossLimitService = require('../services/loss-limit.service');
        const lossCheck = await lossLimitService.checkDailyLossLimit(userId, bet);
        if (!lossCheck.allowed) {
            // Re-read balance in case cashback was just credited
            const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
            return res.json({
                error: 'daily_loss_limit',
                message: 'Daily loss limit reached',
                dailyLoss: lossCheck.dailyLoss,
                limit: lossCheck.limit,
                cashback: lossCheck.cashback,
                balance: updatedUser ? updatedUser.balance : undefined
            });
        }

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

        // ── Bonus event payout multiplier (fail-open — never blocks spin) ──
        let eventBonus = null;
        if (spinResult.winAmount > 0) {
            try {
                const eventService = require('../services/event.service');
                const activeEvent = await eventService.getActiveEventForGame(gameId, 'payout_boost');
                if (activeEvent && activeEvent.multiplier > 1) {
                    const baseWin = spinResult.winAmount;
                    const boostedWin = Math.round(baseWin * activeEvent.multiplier * 100) / 100;
                    const bonusAmount = Math.round((boostedWin - baseWin) * 100) / 100;
                    spinResult.winAmount = boostedWin;
                    eventBonus = {
                        eventId: activeEvent.id,
                        eventName: activeEvent.name,
                        multiplier: activeEvent.multiplier,
                        bonusAmount,
                    };
                }
            } catch (evtErr) {
                console.error('[Spin] Event boost check error:', evtErr);
                // Non-blocking — proceed without boost
            }
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

                // Also record into weekly tournament_scores leaderboard
                (function() {
                    try {
                        const now = new Date();
                        const day = now.getUTCDay();
                        const daysBack = day === 0 ? 6 : day - 1;
                        const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack));
                        const weekStart = monday.toISOString().slice(0, 10);
                        const initScore = (_winMult * 10) + (spinResult.winAmount * 0.001);
                        db.run(
                            'INSERT INTO tournament_scores' +
                            '  (user_id, week_start, best_multiplier, total_wins, spin_count, score, updated_at)' +
                            " VALUES (?, ?, ?, ?, 1, ?, datetime('now'))" +
                            ' ON CONFLICT(user_id, week_start) DO UPDATE SET' +
                            '   spin_count      = tournament_scores.spin_count + 1,' +
                            '   total_wins      = tournament_scores.total_wins + excluded.total_wins,' +
                            '   best_multiplier = CASE WHEN excluded.best_multiplier > tournament_scores.best_multiplier THEN excluded.best_multiplier ELSE tournament_scores.best_multiplier END,' +
                            '   score           = (CASE WHEN excluded.best_multiplier > tournament_scores.best_multiplier THEN excluded.best_multiplier ELSE tournament_scores.best_multiplier END * 10) + ((tournament_scores.total_wins + excluded.total_wins) * 0.001),' +
                            "   updated_at      = datetime('now')",
                            [userId, weekStart, _winMult, spinResult.winAmount, initScore]
                        ).catch(function() {});
                    } catch (e) {}
                }());
            }
        }

        // ── Weekly contest entry (fire-and-forget) ──────────────────────
        if (!usedFreeSpin && bet > 0) {
            const contestService = require('../services/contest.service');
            contestService.recordContestEntry(userId, 'spins', 1).catch(function() {});
            contestService.recordContestEntry(userId, 'total_wagered', bet).catch(function() {});
            if (spinResult.winAmount > 0) {
                contestService.recordContestEntry(userId, 'biggest_win', spinResult.winAmount).catch(function() {});
            }
        }

        // ── Log spin ──
        await db.run(
            'INSERT INTO spins (user_id, game_id, bet_amount, result_grid, win_amount, rng_seed) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, gameId, usedFreeSpin ? 0 : bet, JSON.stringify(spinResult.grid), spinResult.winAmount, spinResult.seed]
        );

        // ── Update game stats (house edge tracking) ──
        await houseEdge.updateGameStats(db, gameId, usedFreeSpin ? 0 : bet, spinResult.winAmount);

        // ── Wagering progress tracking ──
        if (!usedFreeSpin && bet > 0) {
            try {
                const wagerUser = await db.get(
                    'SELECT wagering_requirement, wagering_progress, bonus_balance FROM users WHERE id = ?',
                    [userId]
                );
                if (wagerUser && wagerUser.wagering_requirement > 0 && wagerUser.wagering_progress < wagerUser.wagering_requirement) {
                    const newProgress = Math.min(
                        wagerUser.wagering_progress + bet,
                        wagerUser.wagering_requirement
                    );
                    if (newProgress >= wagerUser.wagering_requirement && wagerUser.bonus_balance > 0) {
                        // Wagering complete — convert bonus to real balance
                        const userNow = await db.get('SELECT balance, bonus_balance FROM users WHERE id = ?', [userId]);
                        const convertAmount = userNow.bonus_balance;
                        await db.run(
                            'UPDATE users SET wagering_progress = ?, bonus_balance = 0, balance = balance + ? WHERE id = ?',
                            [newProgress, convertAmount, userId]
                        );
                        finalBalance += convertAmount;
                        await db.run(
                            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference) VALUES (?, ?, ?, ?, ?, ?)',
                            [userId, 'bonus_conversion', convertAmount, finalBalance - convertAmount, finalBalance, 'Wagering requirement completed']
                        );
                    } else {
                        await db.run(
                            'UPDATE users SET wagering_progress = ? WHERE id = ?',
                            [newProgress, userId]
                        );
                    }
                }
            } catch (wagerErr) {
                console.error('[Spin] Wagering progress error:', wagerErr);
                // Non-blocking — don't fail the spin
            }
        }

        // Include wagering status in response
        let wageringStatus = null;
        try {
            const wu = await db.get(
                'SELECT bonus_balance, wagering_requirement, wagering_progress FROM users WHERE id = ?',
                [userId]
            );
            if (wu && wu.wagering_requirement > 0) {
                wageringStatus = {
                    bonusBalance: wu.bonus_balance,
                    requirement: wu.wagering_requirement,
                    progress: wu.wagering_progress,
                    complete: wu.wagering_progress >= wu.wagering_requirement,
                    pct: Math.min(100, Math.round((wu.wagering_progress / wu.wagering_requirement) * 100)),
                };
            }
        } catch (_) {}

        // ── Achievement check (non-blocking) ──
        let newAchievements = [];
        try {
            const achievementService = require('../services/achievement.service');
            const spinCountRow = await db.get('SELECT COUNT(*) as cnt FROM spins WHERE user_id = ?', [userId]);
            const distinctRow = await db.get('SELECT COUNT(DISTINCT game_id) as cnt FROM spins WHERE user_id = ?', [userId]);
            const spinCount = spinCountRow ? spinCountRow.cnt : 0;
            const distinctGames = distinctRow ? distinctRow.cnt : 0;
            const winMult = bet > 0 ? spinResult.winAmount / bet : 0;
            newAchievements = await achievementService.checkSpinAchievements(userId, spinCount, winMult, distinctGames);
        } catch (e) { console.error('[Achievement] check error:', e.message); }

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
            wageringStatus,
            newAchievements,
            eventBonus,
            lossStatus: lossCheck ? { dailyLoss: lossCheck.dailyLoss, limit: lossCheck.limit, remaining: lossCheck.remaining } : null,
        });

    } catch (err) {
        console.error('[Spin] Error:', err);
        res.status(500).json({ error: 'Spin failed' });
    }
});

module.exports = router;
