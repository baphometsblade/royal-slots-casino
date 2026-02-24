// ═══════════════════════════════════════════════════════
// WIN-LOGIC MODULE
// ═══════════════════════════════════════════════════════


        // ═══ Payline Definitions ═══
        // Standard paylines for different grid configs
        // Each payline is an array of row indices, one per column
        function getPaylines(game) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);

            if (rows === 1) {
                // Classic 1-row: just the single row
                return [[0, 0, 0]];
            }

            if (rows === 3 && cols === 3) {
                // Classic 3×3 (Fire Joker style): horizontal + diagonal + V shapes
                return [
                    [0, 0, 0], // top
                    [1, 1, 1], // middle
                    [2, 2, 2], // bottom
                    [0, 1, 2], // diagonal down
                    [2, 1, 0], // diagonal up
                ];
            }

            if (rows === 3 && cols === 5) {
                // Standard 5×3 (20 paylines — Book of Dead / Wolf Gold / Starburst / Big Bass / Gonzo's)
                return [
                    [1, 1, 1, 1, 1], // middle
                    [0, 0, 0, 0, 0], // top
                    [2, 2, 2, 2, 2], // bottom
                    [0, 1, 2, 1, 0], // V shape
                    [2, 1, 0, 1, 2], // inverted V
                    [0, 0, 1, 0, 0], // slight dip
                    [2, 2, 1, 2, 2], // slight rise
                    [1, 0, 0, 0, 1], // U shape
                    [1, 2, 2, 2, 1], // inverted U
                    [0, 1, 1, 1, 0], // flat top dip
                    [2, 1, 1, 1, 2], // flat bottom rise
                    [1, 0, 1, 0, 1], // zigzag high
                    [1, 2, 1, 2, 1], // zigzag low
                    [0, 1, 0, 1, 0], // wave high
                    [2, 1, 2, 1, 2], // wave low
                    [1, 1, 0, 1, 1], // center dip
                    [1, 1, 2, 1, 1], // center bump
                    [0, 0, 1, 2, 2], // descending stair
                    [2, 2, 1, 0, 0], // ascending stair
                    [0, 2, 0, 2, 0], // zigzag extreme
                ];
            }

            if (rows === 4 && cols === 5) {
                // 5×4 (Black Bull style — 40 paylines)
                return [
                    [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 0, 0, 0, 0], [3, 3, 3, 3, 3],
                    [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
                    [0, 0, 1, 2, 2], [3, 3, 2, 1, 1], [1, 2, 3, 2, 1], [2, 1, 0, 1, 2],
                    [0, 1, 1, 1, 0], [3, 2, 2, 2, 3], [1, 0, 1, 0, 1], [2, 3, 2, 3, 2],
                    [0, 2, 0, 2, 0], [3, 1, 3, 1, 3], [1, 1, 0, 1, 1], [2, 2, 3, 2, 2],
                    [0, 0, 2, 0, 0], [3, 3, 1, 3, 3], [1, 2, 1, 2, 1], [2, 1, 2, 1, 2],
                    [0, 1, 0, 1, 0], [3, 2, 3, 2, 3], [0, 0, 0, 1, 2], [3, 3, 3, 2, 1],
                    [1, 1, 2, 3, 3], [2, 2, 1, 0, 0], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0],
                    [1, 0, 0, 1, 2], [2, 3, 3, 2, 1], [0, 2, 1, 2, 0], [3, 1, 2, 1, 3],
                    [1, 0, 2, 0, 1], [2, 3, 1, 3, 2], [0, 3, 0, 3, 0], [1, 2, 0, 2, 1],
                ];
            }

            // Fallback: generate basic paylines
            const lines = [];
            for (let r = 0; r < rows; r++) {
                lines.push(Array(cols).fill(r));
            }
            return lines;
        }


        // ═══ Cluster Pay Detection ═══
        // Flood-fill to find connected clusters of matching symbols
        function findClusters(grid, game) {
            const cols = grid.length;
            const rows = grid[0].length;
            const visited = createEmptyGrid(cols, rows);
            const clusters = [];

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    if (visited[c][r]) continue;
                    const symbol = grid[c][r];
                    if (!symbol) continue;

                    // BFS to find cluster
                    const cluster = [];
                    const queue = [[c, r]];
                    visited[c][r] = true;

                    while (queue.length > 0) {
                        const [cc, cr] = queue.shift();
                        cluster.push([cc, cr]);

                        // Check 4-directional neighbors
                        const neighbors = [[cc-1, cr], [cc+1, cr], [cc, cr-1], [cc, cr+1]];
                        for (const [nc, nr] of neighbors) {
                            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
                            if (visited[nc][nr]) continue;
                            const nSym = grid[nc][nr];
                            if (nSym === symbol || isWild(nSym, game) || isWild(symbol, game)) {
                                visited[nc][nr] = true;
                                queue.push([nc, nr]);
                            }
                        }
                    }

                    if (cluster.length >= (game.clusterMin || 5)) {
                        clusters.push({ symbol, cells: cluster, size: cluster.length });
                    }
                }
            }

            return clusters;
        }


        // ═══ Payline Win Detection ═══
        function checkPaylineWins(grid, game) {
            const paylines = getPaylines(game);
            const cols = getGridCols(game);
            const wins = [];

            for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
                const line = paylines[lineIdx];
                // Get symbols on this payline
                const lineSymbols = [];
                for (let c = 0; c < Math.min(cols, line.length); c++) {
                    lineSymbols.push(grid[c][line[c]]);
                }

                // Check for left-to-right consecutive matches
                const firstSym = lineSymbols[0];
                let matchCount = 1;
                let effectiveSym = isWild(firstSym, game) ? null : firstSym;

                for (let i = 1; i < lineSymbols.length; i++) {
                    const s = lineSymbols[i];
                    if (isWild(s, game)) {
                        matchCount++;
                    } else if (effectiveSym === null) {
                        effectiveSym = s;
                        matchCount++;
                    } else if (s === effectiveSym) {
                        matchCount++;
                    } else {
                        break;
                    }
                }

                if (matchCount >= PAYLINE_MIN_MATCH_COUNT) {
                    wins.push({
                        lineIndex: lineIdx,
                        line,
                        matchCount,
                        symbol: effectiveSym || firstSym,
                        cells: line.slice(0, matchCount).map((row, col) => [col, row])
                    });
                }
            }

            return wins;
        }


        // ═══ Bonus Mechanic Handlers ═══

        // Apply game-specific bonus multiplier to win
        function applyBonusMultiplier(baseWin, game) {
            let multiplier = freeSpinsMultiplier;
            let bonusText = '';

            if (freeSpinsActive && game.bonusType === 'random_multiplier') {
                // Sweet Bonanza: random bomb multiplier
                const range = game.randomMultiplierRange || [2, 3, 5];
                const bombMult = range[Math.floor(getRandomNumber() * range.length)];
                multiplier *= bombMult;
                bonusText = ` (${bombMult}x Bomb!)`;
                showBonusEffect(`${bombMult}x MULTIPLIER!`, game.accentColor);
            }

            if (freeSpinsActive && game.bonusType === 'zeus_multiplier') {
                // Gates of Olympus: Zeus drops a multiplier on wins
                const zMults = game.zeusMultipliers || [2, 3, 5];
                const zeusMult = zMults[Math.floor(getRandomNumber() * zMults.length)];
                multiplier *= zeusMult;
                bonusText = ` (Zeus ${zeusMult}x!)`;
                showBonusEffect(`ZEUS ${zeusMult}x!`, '#f5c842');
            }

            if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                const mults = game.tumbleMultipliers || game.avalancheMultipliers || [1, 2, 3, 5];
                const idx = Math.min(freeSpinsCascadeLevel, mults.length - 1);
                multiplier = mults[idx];
                freeSpinsCascadeLevel++;
                bonusText = ` (Cascade ${multiplier}x!)`;
                if (multiplier > 1) showBonusEffect(`CASCADE ${multiplier}x!`, game.accentColor);
            }

            return { amount: Math.round(baseWin * multiplier * 100) / 100, multiplier, bonusText };
        }


        // Get money value for money-type symbols (Black Bull, Big Bass)
        function getMoneyValue(symbol, game) {
            const moneySyms = game.moneySymbols || game.fishSymbols || [];
            if (!moneySyms.includes(symbol)) return 0;
            // Realistic money values: small fractions of bet (real Hold & Win values)
            const values = [0.5, 1, 1.5, 2, 3, 5];
            return currentBet * values[Math.floor(getRandomNumber() * values.length)] * 0.05;
        }


        // Fire Joker wheel multiplier
        function getWheelMultiplier(game) {
            const mults = game.wheelMultipliers || [2, 3, 5];
            return mults[Math.floor(getRandomNumber() * mults.length)];
        }


        // ═══ Main Win Check — supports classic, payline, and cluster win types ═══
        function checkWin(symbols, game = currentGame) {
            if (!game) return;

            const winType = getWinType(game);
            const grid = currentGrid;
            let winAmount = 0;
            let message = '';
            let isTriple = false;
            let isDouble = false;

            // Reset win lines for SVG visualiser
            _lastWinLines = [];
            let isBigWin = false;

            // Clear all cell highlights
            getAllCells().forEach(cell => {
                cell.classList.remove('reel-win-glow', 'reel-wild-glow', 'reel-scatter-glow', 'reel-wild-expand');
            });

            // Highlight wilds and scatters across entire grid
            if (grid) {
                const cols = getGridCols(game);
                const rows = getGridRows(game);
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        const cell = document.getElementById(`reel_${c}_${r}`);
                        if (!cell || !grid[c]) continue;
                        if (isWild(grid[c][r], game)) cell.classList.add('reel-wild-glow');
                        if (isScatter(grid[c][r], game)) cell.classList.add('reel-scatter-glow');
                    }
                }
            }

            // ═══ CLUSTER PAY DETECTION ═══
            if (winType === 'cluster' && grid) {
                const clusters = findClusters(grid, game);
                let totalClusterWin = 0;
                let clusterCount = 0;

                for (const cluster of clusters) {
                    const size = cluster.size;
                    let payMultiplier = 0;

                    // Use realistic paytable from House Edge engine
                    const symIdx = game.symbols.indexOf(cluster.symbol);
                    if (window.HouseEdge) {
                        payMultiplier = window.HouseEdge.getClusterPayMultiplier(
                            symIdx >= 0 ? symIdx : 0, size
                        );
                    } else {
                        // Fallback: use realistic fractions
                        if (size >= 12) payMultiplier = 2.0;
                        else if (size >= 10) payMultiplier = 0.75;
                        else if (size >= 8) payMultiplier = 0.25;
                        else if (size >= 5) payMultiplier = 0.05;
                    }

                    if (payMultiplier > 0) {
                        let clusterWin = currentBet * payMultiplier;
                        const bonus = applyBonusMultiplier(clusterWin, game);
                        totalClusterWin += bonus.amount;
                        clusterCount++;

                        // Highlight winning cells
                        cluster.cells.forEach(([c, r]) => {
                            const cell = document.getElementById(`reel_${c}_${r}`);
                            if (cell) {
                                cell.classList.add('reel-win-glow');
                                if (typeof triggerSymbolHitAnimation === 'function') {
                                    triggerSymbolHitAnimation(cell, game);
                                }
                            }
                        });
                    }
                }

                if (totalClusterWin > 0) {
                    winAmount = totalClusterWin;
                    isBigWin = winAmount >= currentBet * 3;
                    const totalSize = clusters.reduce((sum, cl) => sum + cl.size, 0);
                    message = `CLUSTER WIN! ${clusterCount} cluster${clusterCount > 1 ? 's' : ''} (${totalSize} symbols) = $${winAmount.toLocaleString()}!`;
                    if (winAmount >= currentBet * 10) {
                        playSound('megawin');
                    } else if (winAmount >= currentBet * 3) {
                        playSound('bigwin');
                    } else {
                        playSound('win');
                    }
                    showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                } else {
                    message = 'No clusters. Try again.';
                    if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                        freeSpinsCascadeLevel = 0;
                    }
                }

            // ═══ PAYLINE WIN DETECTION ═══
            } else if (winType === 'payline' && grid) {
                const paylineWins = checkPaylineWins(grid, game);
                let totalPaylineWin = 0;
                let bestLine = null;

                for (const win of paylineWins) {
                    // Use realistic paytable from House Edge engine
                    const symIdx = game.symbols.indexOf(win.symbol);
                    let payMultiplier;
                    if (window.HouseEdge) {
                        payMultiplier = window.HouseEdge.getPaylinePayMultiplier(
                            symIdx >= 0 ? symIdx : 0, win.matchCount
                        );
                    } else {
                        // Fallback: realistic fractions
                        if (win.matchCount >= 5) payMultiplier = 0.40;
                        else if (win.matchCount >= 4) payMultiplier = 0.12;
                        else payMultiplier = 0.04;
                    }

                    // Wild bonus: 1.5x on wild-assisted wins
                    const lineSymbols = win.cells.map(([c, r]) => grid[c][r]);
                    const lineWilds = lineSymbols.filter(s => isWild(s, game)).length;
                    if (lineWilds > 0) payMultiplier *= 1.5;

                    let lineWin = currentBet * payMultiplier;
                    const bonus = applyBonusMultiplier(lineWin, game);
                    totalPaylineWin += bonus.amount;

                    // Highlight winning cells
                    win.cells.forEach(([c, r]) => {
                        const cell = document.getElementById(`reel_${c}_${r}`);
                        if (cell) {
                            cell.classList.add('reel-win-glow');
                            if (typeof triggerSymbolHitAnimation === 'function') {
                                triggerSymbolHitAnimation(cell, game);
                            }
                        }
                    });

                    // Store for SVG payline visualiser
                    _lastWinLines.push({ cells: win.cells, lineIndex: win.lineIndex });

                    if (!bestLine || bonus.amount > bestLine.amount) {
                        bestLine = { ...win, amount: bonus.amount, bonusText: bonus.bonusText };
                    }
                }

                if (totalPaylineWin > 0) {
                    winAmount = totalPaylineWin;
                    isBigWin = winAmount >= currentBet * 3;
                    isTriple = paylineWins.some(w => w.matchCount >= 3);
                    if (paylineWins.length === 1) {
                        message = `WIN! ${bestLine.matchCount}-of-a-kind on payline = $${winAmount.toLocaleString()}!${bestLine.bonusText || ''}`;
                    } else {
                        message = `MULTI-LINE WIN! ${paylineWins.length} paylines = $${winAmount.toLocaleString()}!`;
                    }

                    // Fire Joker wheel on 5-of-a-kind
                    if (game.bonusType === 'wheel_multiplier' && !freeSpinsActive && paylineWins.some(w => w.matchCount >= getGridCols(game))) {
                        const wheelMult = getWheelMultiplier(game);
                        winAmount = Math.round(winAmount * wheelMult * 100) / 100;
                        message = `WHEEL OF FIRE! Full match x${wheelMult} = $${winAmount.toLocaleString()}!`;
                        showBonusEffect(`WHEEL ${wheelMult}x!`, '#ff0844');
                    }

                    if (winAmount >= currentBet * 10) {
                        playSound('megawin');
                    } else if (winAmount >= currentBet * 3) {
                        playSound('bigwin');
                    } else {
                        playSound('win');
                    }
                    showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                } else {
                    message = 'No winning lines. Try again.';
                    playSound('lose');
                    if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                        freeSpinsCascadeLevel = 0;
                    }
                }

            // ═══ CLASSIC 3-REEL WIN DETECTION ═══
            } else {
                const wildCount = countWilds(symbols, game);
                const hasWild = wildCount > 0;

                if (isTripleMatch(symbols, game)) {
                    isTriple = true;
                    isBigWin = true;
                    const allWilds = wildCount === 3;
                    // Use realistic paytable from House Edge engine
                    const matchSym = symbols.find(s => !isWild(s, game)) || symbols[0];
                    const symIdx = game.symbols.indexOf(matchSym);
                    let payMultiplier;
                    if (window.HouseEdge) {
                        payMultiplier = window.HouseEdge.getClassicPayMultiplier(
                            symIdx >= 0 ? symIdx : 0, 'triple'
                        );
                    } else {
                        payMultiplier = 1.0; // Fallback: 1x bet
                    }
                    // Wild bonus
                    if (hasWild) payMultiplier *= 1.5;
                    let baseWin = currentBet * payMultiplier;
                    const bonus = applyBonusMultiplier(baseWin, game);
                    winAmount = bonus.amount;

                    if (allWilds) {
                        message = `WILD JACKPOT! Triple wilds paid $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                    } else if (hasWild) {
                        message = `WILD MEGA WIN! Wild helped complete a triple for $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                    } else {
                        message = `MEGA WIN! Triple match paid $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                    }

                    // Fire Joker: Wheel of Multipliers on triple
                    if (game.bonusType === 'wheel_multiplier' && !freeSpinsActive) {
                        const wheelMult = getWheelMultiplier(game);
                        winAmount = Math.round(winAmount * wheelMult * 100) / 100;
                        message = `WHEEL OF FIRE! Triple match x${wheelMult} = $${winAmount.toLocaleString()}!`;
                        showBonusEffect(`WHEEL ${wheelMult}x!`, '#ff0844');
                    }

                    if (winAmount >= currentBet * 5) {
                        playSound('bigwin');
                    } else {
                        playSound('win');
                    }
                    showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                    getAllCells().forEach(cell => {
                        cell.classList.add('reel-win-glow');
                        if (typeof triggerSymbolHitAnimation === 'function') {
                            triggerSymbolHitAnimation(cell, game);
                        }
                    });
                    // Classic 3-reel triple: line through all 3 cells on row 0
                    const cols3 = getGridCols(game);
                    _lastWinLines.push({ cells: Array.from({length: cols3}, (_, c) => [c, 0]), lineIndex: 0 });

                } else {
                    const doublePair = getDoubleMatch(symbols, game);
                    if (doublePair) {
                        isDouble = true;
                        // Use realistic paytable from House Edge engine
                        const matchSym = symbols[doublePair[0]];
                        const symIdx = game.symbols.indexOf(matchSym);
                        let payMultiplier;
                        if (window.HouseEdge) {
                            payMultiplier = window.HouseEdge.getClassicPayMultiplier(
                                symIdx >= 0 ? symIdx : 0, 'double'
                            );
                        } else {
                            payMultiplier = 0.15; // Fallback
                        }
                        let baseWin = currentBet * payMultiplier;
                        if (hasWild) baseWin *= 1.5;
                        const bonus = applyBonusMultiplier(baseWin, game);
                        winAmount = bonus.amount;

                        if (hasWild) {
                            message = `WILD WIN! Wild symbol helped match for $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                        } else {
                            message = `Nice win! Two symbols matched for $${winAmount.toLocaleString()}.${bonus.bonusText}`;
                        }
                        playSound('win');
                        showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                        doublePair.forEach(idx => {
                            const cell = document.getElementById(`reel_${idx}_0`);
                            if (cell) {
                                cell.classList.add('reel-win-glow');
                                if (typeof triggerSymbolHitAnimation === 'function') {
                                    triggerSymbolHitAnimation(cell, game);
                                }
                            }
                        });
                        // Classic double: line through the 2 matched cells
                        _lastWinLines.push({ cells: doublePair.map(idx => [idx, 0]), lineIndex: 0 });
                    } else {
                        message = 'No match. Try again.';
                        if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                            freeSpinsCascadeLevel = 0;
                        }
                    }
                }
            }

            // ── Money Collect mechanics (Black Bull, Big Bass) — grid-aware ──
            const gridWilds = grid ? countWildsInGrid(grid, game) : countWilds(symbols, game);
            if (gridWilds > 0 && (game.bonusType === 'money_collect' || game.bonusType === 'fisherman_collect')) {
                const collectSyms = game.moneySymbols || game.fishSymbols || [];
                let collectTotal = 0;
                if (grid) {
                    for (const col of grid) {
                        for (const s of col) {
                            if (collectSyms.includes(s)) collectTotal += getMoneyValue(s, game);
                        }
                    }
                } else {
                    symbols.forEach(s => {
                        if (collectSyms.includes(s)) collectTotal += getMoneyValue(s, game);
                    });
                }
                if (collectTotal > 0) {
                    winAmount += collectTotal;
                    message += ` Collected $${collectTotal.toLocaleString()} in ${game.bonusType === 'fisherman_collect' ? 'fish' : 'coin'} values!`;
                    showBonusEffect(`COLLECT $${collectTotal.toLocaleString()}!`, game.accentColor);
                }
            }

            // ── Scatter detection — grid-aware ──
            const scatterCount = grid ? countSymbolInGrid(grid, game.scatterSymbol || '') : countScatters(symbols, game);
            const scatterThreshold     = isMultiRow(game) ? SCATTER_THRESHOLD_MULTI_ROW      : SCATTER_THRESHOLD_CLASSIC;
            const fullScatterThreshold = isMultiRow(game) ? FULL_SCATTER_THRESHOLD_MULTI_ROW : FULL_SCATTER_THRESHOLD_CLASSIC;

            // ── Hold & Win / Coin Respin bonus trigger ──
            if (scatterCount >= scatterThreshold && !freeSpinsActive &&
                (game.bonusType === 'hold_and_win' || game.bonusType === 'coin_respin') &&
                typeof triggerHoldAndWin === 'function') {
                // Build list of locked cell positions from currentGrid
                const scatterCells = [];
                if (grid) {
                    const cols = getGridCols(game);
                    const rows = getGridRows(game);
                    for (let c = 0; c < cols; c++) {
                        for (let r = 0; r < rows; r++) {
                            if (grid[c] && grid[c][r] === game.scatterSymbol) {
                                scatterCells.push({ col: c, row: r });
                            }
                        }
                    }
                }
                playSound('freespin');
                message = `BONUS! HOLD & WIN TRIGGERED!`;
                triggerHoldAndWin(game, scatterCells, currentBet);
            } else if (scatterCount >= scatterThreshold && !freeSpinsActive && game.freeSpinsCount > 0) {
                // Realistic scatter pay: 0.5x per scatter (real slots: 0.5x-1x)
                const scatterPayMult = window.HouseEdge ? window.HouseEdge.getScatterPay(scatterCount) : scatterCount * 0.5;
                const scatterWin = currentBet * scatterPayMult;
                winAmount += scatterWin;

                // ── chamber_spins hook — Eternal Romance ──
                if (game.bonusType === 'chamber_spins') {
                    if (typeof triggerChamberSpins === 'function') {
                        playSound('freespin');
                        message = `CHAMBER BONUS! +$${scatterWin.toLocaleString()} scatter pay!`;
                        triggerChamberSpins(game);
                    }
                } else if (game.bonusType === 'sticky_wilds') {
                    if (typeof triggerStickyWildsFreeSpins === 'function') {
                        message = `STICKY WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                        triggerStickyWildsFreeSpins(game, scatterWin);
                    } else {
                        playSound('freespin');
                        triggerFreeSpins(game, game.freeSpinsCount);
                        message = `STICKY WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                    }
                } else if (game.bonusType === 'walking_wilds') {
                    if (typeof triggerWalkingWildsFreeSpins === 'function') {
                        message = `WALKING WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                        triggerWalkingWildsFreeSpins(game, scatterWin);
                    } else {
                        playSound('freespin');
                        triggerFreeSpins(game, game.freeSpinsCount);
                        message = `WALKING WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                    }
                } else if (scatterCount >= fullScatterThreshold) {
                    playSound('freespin');
                    triggerFreeSpins(game, game.freeSpinsCount);
                    message = `SCATTER BONUS! ${game.freeSpinsCount} FREE SPINS AWARDED! +$${scatterWin.toLocaleString()} scatter pay!`;
                } else {
                    const halfSpins = Math.max(3, Math.floor(game.freeSpinsCount / 2));
                    playSound('freespin');
                    triggerFreeSpins(game, halfSpins);
                    message = `SCATTER! ${halfSpins} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                }
            }

            // ── Scatter retrigger during free spins (capped to prevent runaway) ──
            // MAX_FREE_SPINS — from constants.js
            if (scatterCount >= scatterThreshold && freeSpinsActive && game.freeSpinsRetrigger && freeSpinsRemaining < MAX_FREE_SPINS) {
                // ── chamber_spins retrigger — advance chamber level ──
                if (game.bonusType === 'chamber_spins') {
                    if (typeof advanceChamberLevel === 'function') {
                        advanceChamberLevel(game);
                        message += ' CHAMBER ADVANCED!';
                    }
                } else {
                    const extraSpins = scatterCount >= fullScatterThreshold ? game.freeSpinsCount : Math.max(2, Math.floor(game.freeSpinsCount / 3));
                    const capped = Math.min(extraSpins, MAX_FREE_SPINS - freeSpinsRemaining);
                    if (capped > 0) {
                        freeSpinsRemaining += capped;
                        message += ` +${capped} EXTRA FREE SPINS!`;
                        updateFreeSpinsDisplay();
                        showBonusEffect(`+${capped} FREE SPINS!`, '#fbbf24');
                    }
                }
            }

            // ── HOUSE EDGE: Cap win amount before crediting ──
            if (winAmount > 0 && window.HouseEdge) {
                winAmount = window.HouseEdge.capWin(winAmount, currentBet, game);
                winAmount = Math.round(winAmount * 100) / 100;
            }

            // ── HOUSE EDGE: Record spin for profit tracking ──
            if (window.HouseEdge) {
                window.HouseEdge.recordSpin(currentBet, winAmount, game.id);
            }

            // ── Process win ──
            if (winAmount > 0) {
                balance += winAmount;
                updateBalance();
                saveBalance();
                stats.totalWon += winAmount;
                if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                saveStats();
                updateStatsSummary();
                showMessage(message, 'win');
                const xpBonus = isBigWin ? XP_AWARD_BIG_WIN : XP_AWARD_REGULAR_WIN;
                if (typeof awardXP === 'function') awardXP(xpBonus);

                // Apply celebration animations based on win size (adjusted thresholds)
                const isMegaWin = winAmount >= currentBet * 10;
                const winCells = document.querySelectorAll('.reel-win-glow');
                if (winCells.length > 0) {
                    if (isMegaWin) {
                        winCells.forEach(cell => cell.classList.add('reel-mega-win'));
                    } else {
                        winCells.forEach(cell => cell.classList.add('reel-celebrating'));
                    }
                }

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }

                // Show gamble button for wins >= 1x bet (not during free spins / autoplay)
                if (!freeSpinsActive && !autoSpinActive && winAmount >= currentBet) {
                    showGambleButton(winAmount);
                }

                // Big win celebration for wins >= 10x bet
                if (winAmount >= currentBet * 10 && !freeSpinsActive) {
                    setTimeout(() => showBigWinCelebration(winAmount), 800);
                }
            } else {
                // Still record the loss for tracking
                if (window.HouseEdge && winAmount === 0) {
                    // Already recorded above
                }
                showMessage(message, 'lose');
                hideGambleButton();
            }
            if (typeof awardXP === 'function') awardXP(XP_AWARD_PER_SPIN);

            // ── Hot Chillies Respin (classic 3-reel only) ──
            if (winType === 'classic' && !freeSpinsActive && isDouble && !isTriple && game.bonusType === 'respin' && respinCount < (game.maxRespins || 3)) {
                const doublePair = getDoubleMatch(symbols, game);
                if (doublePair) {
                    respinCount++;
                    const nonMatch = [0, 1, 2].filter(i => !doublePair.includes(i))[0];
                    showBonusEffect(`RESPIN ${respinCount}/${game.maxRespins || 3}!`, game.accentColor);
                    setTimeout(() => triggerRespin(nonMatch, symbols, game), 800);
                    return;
                }
            } else if (!isDouble || isTriple) {
                respinCount = 0;
            }

            // ── Starburst Expanding Wild Respin ──
            if (gridWilds > 0 && game.bonusType === 'expanding_wild_respin' && expandingWildRespinsLeft < (game.expandingWildMaxRespins || 3)) {
                expandingWildRespinsLeft++;
                showBonusEffect('EXPANDING WILD RESPIN!', '#a855f7');
                if (grid) {
                    for (let c = 0; c < grid.length; c++) {
                        for (let r = 0; r < grid[c].length; r++) {
                            if (isWild(grid[c][r], game)) {
                                const cell = document.getElementById(`reel_${c}_${r}`);
                                if (cell) cell.classList.add('reel-wild-expand');
                            }
                        }
                    }
                }
                setTimeout(() => triggerExpandingWildRespin(symbols, game), 1000);
                return;
            }

            // ── Process free spin advancement ──
            if (freeSpinsActive) {
                advanceFreeSpins(game);
            }
        }
