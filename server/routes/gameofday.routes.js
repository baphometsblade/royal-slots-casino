'use strict';
const express = require('express');
const games = require('../../shared/game-definitions');
const router = express.Router();

// GET /api/game-of-day — deterministic daily game selection (no DB needed)
router.get('/', (req, res) => {
    const dayIndex = Math.floor(Date.now() / 86400000);
    const sortedIds = games.map(g => g.id).sort();
    const gameId = sortedIds[dayIndex % sortedIds.length];
    const game = games.find(g => g.id === gameId);
    const msUntilMidnightUTC = 86400000 - (Date.now() % 86400000);
    res.json({
        gameId: game ? game.id : null,
        gameName: game ? game.name : null,
        secondsUntilNext: Math.floor(msUntilMidnightUTC / 1000)
    });
});

module.exports = router;
