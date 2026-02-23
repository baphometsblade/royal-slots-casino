// ═══════════════════════════════════════════════════════
// UI-SLOT MODULE
// ═══════════════════════════════════════════════════════


        // Build symbol image HTML for any game symbol
        function getSymbolHtml(symbolName, gameId) {
            var useAnimated = window.appSettings &&
                window.appSettings.animationQuality !== 'low' &&
                window.appSettings.animationQuality !== 'off';

            if (useAnimated) {
                return '<img class="reel-symbol-img reel-symbol-animated" ' +
                    'src="assets/game_symbols/' + gameId + '/' + symbolName + '.webp" ' +
                    'alt="' + symbolName + '" draggable="false" ' +
                    'onerror="this.src=\'assets/game_symbols/' + gameId + '/' + symbolName + '.png\'; this.classList.remove(\'reel-symbol-animated\'); this.onerror=null;">';
            }
            return '<img class="reel-symbol-img" src="assets/game_symbols/' + gameId + '/' + symbolName + '.png" alt="' + symbolName + '" draggable="false" onerror="this.style.display=\'none\'">';
        }


        /** Preload animated WebP assets for the current game */
        function preloadAnimatedAssets(game) {
            if (!game) return;
            var quality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
            if (quality === 'low' || quality === 'off') return;

            // Preload animated symbols
            if (game.symbols) {
                game.symbols.forEach(function(sym) {
                    var img = new Image();
                    img.src = 'assets/game_symbols/' + game.id + '/' + sym + '.webp';
                });
            }

            // Preload animated background
            if (quality !== 'low') {
                var bgImg = new Image();
                bgImg.src = 'assets/backgrounds/slots/' + game.id + '_bg.webp';
            }
        }


        // Get cell dimensions for a game's grid config
        function getCellDims(game) {
            const key = `${getGridCols(game)}x${getGridRows(game)}`;
            return REEL_CELL_DIMS[key] || { h: 80, gap: 2 };
        }


        // Get template for a game (from game def or derive from grid)
        function getGameTemplate(game) {
            if (game.template) return game.template;
            const c = getGridCols(game), r = getGridRows(game);
            if (c === 3 && r === 3) return 'classic';
            if (c === 5 && r === 3) return 'standard';
            if (c === 5 && r === 4) return 'extended';
            if (c === 6 && r === 5) return 'scatter';
            return 'grid';
        }


        function clamp01(value) {
            return Math.max(0, Math.min(1, value));
        }


        function hexToRgb(hex) {
            const clean = String(hex || '').replace('#', '');
            if (clean.length !== 6) return { r: 251, g: 191, b: 36 };
            return {
                r: parseInt(clean.slice(0, 2), 16) || 0,
                g: parseInt(clean.slice(2, 4), 16) || 0,
                b: parseInt(clean.slice(4, 6), 16) || 0,
            };
        }


        function mixRgb(a, b, ratio) {
            const t = clamp01(ratio);
            return {
                r: Math.round(a.r + (b.r - a.r) * t),
                g: Math.round(a.g + (b.g - a.g) * t),
                b: Math.round(a.b + (b.b - a.b) * t),
            };
        }


        function rgbCss(rgb, alpha = 1) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        }


        function hashThemeSeed(text) {
            let hash = FNV_OFFSET_BASIS;
            const input = String(text || '');
            for (let i = 0; i < input.length; i++) {
                hash ^= input.charCodeAt(i);
                hash = Math.imul(hash, FNV_PRIME);
            }
            return hash >>> 0;
        }


        function buildSlotThemeVars(game) {
            const accent = hexToRgb(game.accentColor || '#fbbf24');
            const dark = { r: 7, g: 10, b: 18 };
            const light = { r: 245, g: 248, b: 255 };
            const seed = hashThemeSeed(game.id);
            const variant = seed % 5;
            const radius = 8 + (seed % 8);
            const chromeBlend = 0.18 + ((seed >>> 3) % 30) / 100;
            const panelStrength = 0.2 + ((seed >>> 5) % 30) / 100;
            const fontPool = [
                '"Trebuchet MS", "Segoe UI", sans-serif',
                '"Verdana", "Segoe UI", sans-serif',
                '"Tahoma", "Segoe UI", sans-serif',
                '"Lucida Sans Unicode", "Segoe UI", sans-serif',
                '"Gill Sans", "Trebuchet MS", sans-serif'
            ];

            const warm = mixRgb(accent, { r: 255, g: 180, b: 90 }, 0.35);
            const cool = mixRgb(accent, { r: 110, g: 180, b: 255 }, 0.35);
            const dimAccent = mixRgb(accent, dark, 0.6);
            const punch = variant % 2 === 0 ? warm : cool;

            return {
                font: fontPool[seed % fontPool.length],
                radius: `${radius}px`,
                panelRadius: `${Math.max(10, radius + 2)}px`,
                topBg: `linear-gradient(120deg, ${rgbCss(mixRgb(dark, accent, 0.38), 0.95)} 0%, ${rgbCss(mixRgb(dark, punch, 0.25), 0.92)} 48%, ${rgbCss(mixRgb(dimAccent, dark, 0.35), 0.95)} 100%)`,
                bottomBg: `linear-gradient(145deg, ${rgbCss(mixRgb(dark, accent, 0.24), 0.94)} 0%, ${rgbCss(mixRgb(dark, punch, 0.2), 0.95)} 55%, ${rgbCss(mixRgb(dark, accent, 0.12), 0.96)} 100%)`,
                panelBg: `linear-gradient(170deg, ${rgbCss(mixRgb(dark, accent, panelStrength), 0.55)} 0%, ${rgbCss(mixRgb(dark, dark, 0.65), 0.5)} 100%)`,
                panelBorder: rgbCss(mixRgb(accent, light, 0.15), 0.42),
                panelShadow: `0 0 30px ${rgbCss(mixRgb(accent, dark, 0.3), 0.35)}, inset 0 0 22px ${rgbCss(dark, 0.52)}`,
                spinBg: `radial-gradient(circle at 34% 28%, ${rgbCss(mixRgb(accent, light, 0.3), 0.96)} 0%, ${rgbCss(mixRgb(accent, punch, 0.2), 0.95)} 46%, ${rgbCss(mixRgb(accent, dark, 0.5), 0.96)} 100%)`,
                spinBorder: rgbCss(mixRgb(accent, light, 0.24), 0.9),
                spinRing: rgbCss(mixRgb(accent, dark, 0.2), 0.28),
                spinGlow: `0 0 24px ${rgbCss(accent, 0.45)}, 0 2px 14px rgba(0,0,0,0.55), inset 0 2px 4px rgba(255,255,255,0.22)`,
                chromeBlend: `${chromeBlend}`,
                stripeAngle: `${(seed % 150) + 15}deg`,
            };
        }


        function applySlotThemeToModal(modal, game) {
            if (!modal || !game) return;
            const vars = buildSlotThemeVars(game);
            modal.setAttribute('data-slot-theme', game.id);
            modal.style.setProperty('--slot-ui-font', vars.font);
            modal.style.setProperty('--slot-ui-radius', vars.radius);
            modal.style.setProperty('--slot-panel-radius', vars.panelRadius);
            modal.style.setProperty('--slot-top-bg', vars.topBg);
            modal.style.setProperty('--slot-bottom-bg', vars.bottomBg);
            modal.style.setProperty('--slot-panel-bg', vars.panelBg);
            modal.style.setProperty('--slot-panel-border', vars.panelBorder);
            modal.style.setProperty('--slot-panel-shadow', vars.panelShadow);
            modal.style.setProperty('--slot-spin-bg', vars.spinBg);
            modal.style.setProperty('--slot-spin-border', vars.spinBorder);
            modal.style.setProperty('--slot-spin-ring', vars.spinRing);
            modal.style.setProperty('--slot-spin-glow', vars.spinGlow);
            modal.style.setProperty('--slot-chrome-blend', vars.chromeBlend);
            modal.style.setProperty('--slot-stripe-angle', vars.stripeAngle);
            modal.style.setProperty('--slot-chrome-image', 'none');

            const chromeImagePath = `assets/ui/slot_chrome/${game.id}_chrome.png`;
            const chromeProbe = new Image();
            chromeProbe.onload = () => {
                modal.style.setProperty('--slot-chrome-image', `url('${chromeImagePath}')`);
            };
            chromeProbe.onerror = () => {
                modal.style.setProperty('--slot-chrome-image', 'none');
            };
            chromeProbe.src = chromeImagePath;
        }


        // Build the reel DOM with rolling strip architecture
        function buildReelGrid(game) {
            const reelsContainer = document.getElementById('reels');
            if (!reelsContainer) return;
            reelsContainer.innerHTML = '';
            reelStripData = [];

            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const winType = getWinType(game);
            const dims = getCellDims(game);
            const syms = game.symbols || SLOT_SYMBOLS;
            const totalStrip = REEL_STRIP_BUFFER + rows + REEL_STRIP_BUFFER;

            // Set CSS grid data attributes for styling
            reelsContainer.setAttribute('data-cols', cols);
            reelsContainer.setAttribute('data-rows', rows);
            reelsContainer.setAttribute('data-wintype', winType);

            const visibleH = rows * dims.h + (rows - 1) * dims.gap;

            for (let c = 0; c < cols; c++) {
                const reelCol = document.createElement('div');
                reelCol.className = 'reel-column';
                reelCol.id = `reelCol${c}`;
                reelCol.style.height = visibleH + 'px';
                reelCol.style.overflow = 'hidden';

                const strip = document.createElement('div');
                strip.className = 'reel-strip';
                strip.id = `reelStrip${c}`;

                for (let s = 0; s < totalStrip; s++) {
                    const cell = document.createElement('div');
                    cell.className = 'reel-cell';
                    cell.style.height = dims.h + 'px';
                    cell.style.minHeight = dims.h + 'px';
                    if (s > 0) cell.style.marginTop = dims.gap + 'px';

                    // Mark visible-zone cells with proper IDs
                    const visIdx = s - REEL_STRIP_BUFFER;
                    if (visIdx >= 0 && visIdx < rows) {
                        cell.id = `reel_${c}_${visIdx}`;
                        cell.setAttribute('data-col', c);
                        cell.setAttribute('data-row', visIdx);
                    } else {
                        cell.setAttribute('data-buffer', 'true');
                    }

                    // Fill with random symbol
                    const sym = syms[Math.floor(Math.random() * syms.length)];
                    cell.innerHTML = renderSymbol(sym);
                    strip.appendChild(cell);
                }

                reelCol.appendChild(strip);
                reelsContainer.appendChild(reelCol);

                // Calculate initial Y to show visible zone
                const initialY = -(REEL_STRIP_BUFFER * (dims.h + dims.gap));
                strip.style.transform = `translateY(${initialY}px)`;

                reelStripData.push({
                    stripEl: strip,
                    colEl: reelCol,
                    animFrameId: null,
                    currentY: initialY,
                    targetY: initialY,
                    cellH: dims.h,
                    cellGap: dims.gap,
                    totalCells: totalStrip,
                    visibleRows: rows,
                    visibleH: visibleH,
                    totalH: totalStrip * (dims.h + dims.gap) - dims.gap,
                    stopped: true
                });
            }
        }


        // Rescale reel cells to fit the actual available height of .slot-reel-area.
        // Measures from the REEL AREA parent (not the container, which may already be
        // flex-shrunk and give a misleadingly small number).
        // Called on open (double-RAF) and on window resize (debounced).
        function rescaleReelGridToFit(game) {
            if (!reelStripData || !reelStripData.length) return;
            if (spinning) return;  // never rescale mid-spin
            const container = document.querySelector('.reels-container');
            if (!container) return;

            const rows = getGridRows(game);
            const dims = getCellDims(game);
            const gap  = dims.gap;

            // Measure from .slot-reel-area (the actual bounding box), not the
            // container — the container may already be flex-shrunk to a smaller
            // height than the reel columns inside it.
            const reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;

            const areaCS = window.getComputedStyle(reelArea);
            const cCS    = window.getComputedStyle(container);

            const areaH = reelArea.clientHeight
                        - (parseFloat(areaCS.paddingTop)    || 0)
                        - (parseFloat(areaCS.paddingBottom) || 0);

            // Subtract container padding + border from both sides
            const containerInsets = (parseFloat(cCS.paddingTop)        || 0)
                                  + (parseFloat(cCS.paddingBottom)      || 0)
                                  + (parseFloat(cCS.borderTopWidth)     || 0)
                                  + (parseFloat(cCS.borderBottomWidth)  || 0);

            const availH = areaH - containerInsets;

            // Clamp to designed size; minimum 36px so symbols stay readable on small mobiles
            const minCellH = window.innerHeight < 600 ? 36 : 44;
            const scaledCellH    = Math.min(dims.h, Math.max(minCellH, Math.floor((availH - (rows - 1) * gap) / rows)));
            const scaledVisibleH = rows * scaledCellH + (rows - 1) * gap;

            for (let i = 0; i < reelStripData.length; i++) {
                const rd = reelStripData[i];
                if (rd.cellH === scaledCellH) continue;  // already correct — skip

                // Resize the visible column window
                rd.colEl.style.height = scaledVisibleH + 'px';

                // Resize every cell in the strip (buffer + visible rows)
                rd.stripEl.querySelectorAll('.reel-cell').forEach(cell => {
                    cell.style.height    = scaledCellH + 'px';
                    cell.style.minHeight = scaledCellH + 'px';
                });

                // Recalculate strip Y so the visible zone stays centred
                const newInitialY = -(REEL_STRIP_BUFFER * (scaledCellH + gap));
                const newTotalH   = rd.totalCells * (scaledCellH + gap) - gap;

                rd.cellH    = scaledCellH;
                rd.visibleH = scaledVisibleH;
                rd.totalH   = newTotalH;
                rd.currentY = newInitialY;
                rd.targetY  = newInitialY;
                rd.stripEl.style.transform = `translateY(${newInitialY}px)`;
            }
        }


        // Render entire grid to DOM (visible-zone cells only)
        function renderGrid(grid, game) {
            if (!grid) return;
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const cell = document.getElementById(`reel_${c}_${r}`);
                    if (cell && grid[c] && grid[c][r]) {
                        cell.innerHTML = renderSymbol(grid[c][r]);
                    }
                }
            }
        }


        // Randomize buffer symbols in a strip (off-screen visual variety)
        function randomizeStripBuffers(colIdx, game) {
            const data = reelStripData[colIdx];
            if (!data) return;
            const syms = (game || currentGame).symbols || SLOT_SYMBOLS;
            const cells = data.stripEl.querySelectorAll('.reel-cell[data-buffer]');
            cells.forEach(cell => {
                const sym = syms[Math.floor(Math.random() * syms.length)];
                cell.innerHTML = renderSymbol(sym);
            });
        }


        // Render single cell
        function renderCell(col, row, symbol) {
            const cell = document.getElementById(`reel_${col}_${row}`);
            if (cell) cell.innerHTML = renderSymbol(symbol);
        }


        // Get all reel-cell elements
        function getAllCells() {
            return document.querySelectorAll('.reel-cell');
        }


        // Get all reel-column elements
        function getAllColumns() {
            return document.querySelectorAll('.reel-column');
        }


        // Upgrade win cells to mega glow for big wins
        function upgradeWinGlow(winAmount) {
            if (winAmount >= currentBet * 10) {
                document.querySelectorAll('.reel-win-glow').forEach(cell => {
                    cell.classList.remove('reel-win-glow');
                    cell.classList.add('reel-big-win-glow');
                });
            }
        }


        function clearReelAnimations(cells) {
            cells.forEach(cell => {
                REEL_CELL_ANIMATION_CLASSES.forEach(cls => cell.classList.remove(cls));
            });
        }


        function showGambleButton(amount) {
            const btn = document.getElementById('gambleBtn');
            if (btn) {
                btn.style.display = 'flex';
                btn.style.animation = 'gambleBtnPop 0.4s cubic-bezier(0.34,1.56,0.64,1)';
            }
            gambleState.amount = amount;
        }


        function hideGambleButton() {
            const btn = document.getElementById('gambleBtn');
            if (btn) btn.style.display = 'none';
        }


        function openGamble() {
            if (!gambleState.amount) return;
            gambleState.active = true;
            gambleState.round = 1;
            updateGambleUI();
            document.getElementById('gambleOverlay').style.display = 'flex';
            document.getElementById('gambleHistory').innerHTML = '';
            resetGambleCard();
            hideGambleButton();
        }


        function updateGambleUI() {
            document.getElementById('gambleRound').textContent = gambleState.round;
            document.getElementById('gambleWinAmount').textContent = '$' + gambleState.amount.toLocaleString();
            document.getElementById('gambleCollectAmt').textContent = gambleState.amount.toLocaleString();
            document.getElementById('gambleResult').style.display = 'none';
            document.getElementById('gambleChoices').style.display = 'flex';
        }


        function resetGambleCard() {
            const inner = document.getElementById('gambleCardInner');
            if (inner) {
                inner.style.transition = 'none';
                inner.style.transform = 'rotateY(0deg)';
            }
        }


        function makeGambleChoice(playerChoice) {
            if (!gambleState.active) return;
            const choices = document.getElementById('gambleChoices');
            if (choices) choices.style.display = 'none';

            // Determine random card outcome
            const suits = { red: ['♥','♦'], black: ['♠','♣'] };
            const outcome = Math.random() < 0.5 ? 'red' : 'black';
            const suitList = suits[outcome];
            const suit = suitList[Math.floor(Math.random() * suitList.length)];
            const win = (outcome === playerChoice);

            // Flip card animation
            const inner = document.getElementById('gambleCardInner');
            const front = document.getElementById('gambleCardFront');
            const suitEl = document.getElementById('gambleCardSuit');
            const labelEl = document.getElementById('gambleColorLabel');

            suitEl.textContent = suit;
            labelEl.textContent = outcome.toUpperCase();
            front.style.color = outcome === 'red' ? '#e74c3c' : '#1a1a2e';
            front.style.background = outcome === 'red'
                ? 'linear-gradient(135deg,#fff5f5,#ffe0e0)'
                : 'linear-gradient(135deg,#f0f0f8,#e0e0f0)';

            inner.style.transition = 'transform 0.6s cubic-bezier(0.4,0,0.2,1)';
            inner.style.transform = 'rotateY(180deg)';

            setTimeout(() => {
                const resultEl = document.getElementById('gambleResult');
                resultEl.style.display = 'block';

                // Add to history
                const histEl = document.getElementById('gambleHistory');
                const dot = document.createElement('span');
                dot.className = 'gamble-history-dot ' + (win ? 'dot-win' : 'dot-lose');
                dot.textContent = win ? '✓' : '✗';
                dot.title = `Round ${gambleState.round}: ${playerChoice.toUpperCase()} vs ${outcome.toUpperCase()} — ${win ? 'WIN' : 'LOSE'}`;
                histEl.appendChild(dot);

                if (win) {
                    gambleState.amount *= 2;
                    resultEl.textContent = `✅ ${outcome.toUpperCase()}! WIN doubled → $${gambleState.amount.toLocaleString()}`;
                    resultEl.className = 'gamble-result gamble-result-win';
                    playProviderSound('win', currentGame);

                    if (gambleState.round >= gambleState.maxRound) {
                        setTimeout(() => collectGamble(), 1200);
                    } else {
                        gambleState.round++;
                        setTimeout(() => {
                            resetGambleCard();
                            updateGambleUI();
                        }, 1400);
                    }
                } else {
                    // Lose: deduct the win amount that was already added to balance
                    balance -= gambleState.amount;
                    updateBalance();
                    saveBalance();
                    gambleState.amount = 0;
                    resultEl.textContent = `❌ ${outcome.toUpperCase()}! You lose. Better luck next time!`;
                    resultEl.className = 'gamble-result gamble-result-lose';
                    playSound('lose');
                    updateSlotWinDisplay(0);

                    setTimeout(() => closeGamble(false), 1800);
                }
            }, 700);
        }


        function collectGamble() {
            if (!gambleState.active) return;
            // Balance already has the win — update display
            updateSlotWinDisplay(gambleState.amount);
            showMessage(`Collected $${gambleState.amount.toLocaleString()}!`, 'win');
            closeGamble(true);
        }


        function closeGamble(collected) {
            gambleState.active = false;
            document.getElementById('gambleOverlay').style.display = 'none';
            if (!collected) hideGambleButton();
        }


        // ═══════════════════════════════════════════════════════
        // PAYTABLE / GAME INFO PANEL
        // ═══════════════════════════════════════════════════════

        function togglePaytable() {
            const panel = document.getElementById('paytablePanel');
            if (!panel) return;
            const isOpen = panel.classList.contains('active');
            if (isOpen) {
                panel.classList.remove('active');
            } else {
                renderPaytable();
                panel.classList.add('active');
            }
            playSound('click');
        }


        function formatSymbolName(sym) {
            // Turn 's1_lollipop' → 'Lollipop', 'wild_sugar' → 'Wild Sugar'
            return sym.replace(/^s\d+_/, '').replace(/^wild_/, 'Wild ').replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
        }


        function renderPaytable() {
            const game = currentGame;
            if (!game) return;
            const body = document.getElementById('paytableBody');
            if (!body) return;

            const isMulti = game.gridRows && game.gridRows > 1;
            const rtp = (94 + Math.random() * 2.5).toFixed(2); // Simulated RTP

            // Grid info section
            let html = `<div class="paytable-section">
                <div class="paytable-section-title">Grid Layout</div>
                <div class="paytable-grid-info">
                    <div class="paytable-stat">
                        <div class="paytable-stat-label">Grid</div>
                        <div class="paytable-stat-value">${game.gridCols}×${game.gridRows || 1}</div>
                    </div>
                    <div class="paytable-stat">
                        <div class="paytable-stat-label">Win Type</div>
                        <div class="paytable-stat-value" style="font-size:13px;">${(game.winType || 'classic').toUpperCase()}</div>
                    </div>
                    <div class="paytable-stat">
                        <div class="paytable-stat-label">Max Win</div>
                        <div class="paytable-stat-value">${game.payouts.triple}x</div>
                    </div>
                    <div class="paytable-stat">
                        <div class="paytable-stat-label">Bet Range</div>
                        <div class="paytable-stat-value" style="font-size:13px;">$${game.minBet}-$${game.maxBet}</div>
                    </div>
                </div>
            </div>`;

            // Bonus mechanics
            if (game.bonusDesc) {
                html += `<div class="paytable-section">
                    <div class="paytable-section-title">Bonus Feature</div>
                    <div class="paytable-bonus-desc">${game.bonusDesc}</div>
                </div>`;
            }

            // Symbols section
            html += `<div class="paytable-section">
                <div class="paytable-section-title">Symbols</div>
                <div class="paytable-symbols">`;

            if (game.symbols) {
                game.symbols.forEach(sym => {
                    const isWildSym = sym === game.wildSymbol;
                    const isScatterSym = sym === game.scatterSymbol;
                    const nameClass = isWildSym ? 'wild-symbol' : isScatterSym ? 'scatter-symbol' : '';
                    const badge = isWildSym ? ' (WILD)' : isScatterSym ? ' (SCATTER)' : '';
                    const imgPath = `assets/game_symbols/${game.id}/${sym}.png`;

                    html += `<div class="paytable-symbol-row">
                        <div class="paytable-symbol-icon">
                            <img src="${imgPath}" alt="${sym}" onerror="this.style.display='none';this.parentElement.textContent='${sym.charAt(0).toUpperCase()}'">
                        </div>
                        <div class="paytable-symbol-name ${nameClass}">${formatSymbolName(sym)}${badge}</div>
                        <div class="paytable-symbol-pay">${isWildSym ? 'Substitutes' : isScatterSym ? 'Triggers Bonus' : ''}</div>
                    </div>`;
                });
            }
            html += `</div></div>`;

            // Payouts section
            html += `<div class="paytable-section">
                <div class="paytable-section-title">Payouts</div>
                <div class="paytable-symbols">`;

            const payoutEntries = Object.entries(game.payouts);
            payoutEntries.forEach(([key, val]) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                html += `<div class="paytable-symbol-row">
                    <div class="paytable-symbol-name">${label}</div>
                    <div class="paytable-symbol-pay">${val}x</div>
                </div>`;
            });

            html += `</div></div>`;

            // RTP
            html += `<div class="paytable-section">
                <div class="paytable-rtp">RTP: <strong>${rtp}%</strong> &middot; Volatility: <strong>${game.payouts.triple >= 100 ? 'High' : game.payouts.triple >= 50 ? 'Medium' : 'Low'}</strong></div>
            </div>`;

            body.innerHTML = html;
        }


        // Derive RTP from game properties (simulated since not stored in game data)
        function deriveGameRTP(game) {
            const maxPayout = game.payouts.triple || 100;
            if (maxPayout >= 200) return '96.8%';
            if (maxPayout >= 100) return '96.5%';
            if (maxPayout >= 70) return '96.2%';
            return '95.8%';
        }


        // Derive volatility from game properties
        function deriveGameVolatility(game) {
            const maxPayout = game.payouts.triple || 100;
            const hasMultipliers = game.tumbleMultipliers || game.zeusMultipliers || game.randomMultiplierRange || game.avalancheMultipliers;
            if (maxPayout >= 200 || (hasMultipliers && maxPayout >= 100)) return 'Very High';
            if (maxPayout >= 100 || hasMultipliers) return 'High';
            if (maxPayout >= 60) return 'Medium';
            return 'Low';
        }


        // Build the feature list for a game
        function buildFeatureList(game) {
            const features = [];

            // 1. Primary bonus feature
            if (game.bonusType && featureInfo[game.bonusType]) {
                const info = featureInfo[game.bonusType];
                let desc = info.desc;
                // Enhance description with game-specific data
                if (game.tumbleMultipliers) {
                    const maxMult = Math.max(...game.tumbleMultipliers);
                    desc = `Winning symbols cascade away! Multipliers climb up to ${maxMult}x!`;
                }
                if (game.zeusMultipliers) {
                    const maxMult = Math.max(...game.zeusMultipliers);
                    desc = `Divine multipliers rain down, reaching up to ${maxMult}x!`;
                }
                if (game.randomMultiplierRange) {
                    const maxMult = Math.max(...game.randomMultiplierRange);
                    desc = `Random multiplier symbols appear, boosting wins up to ${maxMult}x!`;
                }
                if (game.avalancheMultipliers) {
                    const maxMult = Math.max(...game.avalancheMultipliers);
                    desc = `Symbols shatter and cascade! Multipliers climb up to ${maxMult}x!`;
                }
                if (game.wheelMultipliers) {
                    const maxMult = Math.max(...game.wheelMultipliers);
                    desc = `Trigger the bonus wheel for multipliers up to ${maxMult}x!`;
                }
                features.push({ icon: info.icon, title: info.title, desc: desc });
            }

            // 2. Free Spins
            if (game.freeSpinsCount && game.freeSpinsCount > 0) {
                const retrigg = game.freeSpinsRetrigger ? ' Retriggerable!' : '';
                features.push({
                    icon: '🎰',
                    title: 'Free Spins',
                    desc: `Trigger ${game.freeSpinsCount} free spins with special features!${retrigg}`
                });
            }

            // 3. Wild Symbol
            if (game.wildSymbol) {
                features.push({
                    icon: '🃏',
                    title: 'Wild Symbol',
                    desc: 'Substitutes for all regular symbols to complete wins!'
                });
            }

            // 4. Scatter Symbol
            if (game.scatterSymbol && game.scatterSymbol !== game.wildSymbol) {
                features.push({
                    icon: '💫',
                    title: 'Scatter Symbol',
                    desc: 'Land 3+ scatters anywhere to trigger bonus features!'
                });
            }

            // 5. Win type specific
            if (game.winType === 'cluster' && game.clusterMin) {
                features.push({
                    icon: '🧩',
                    title: 'Cluster Pays',
                    desc: `Match ${game.clusterMin}+ connected symbols to win big!`
                });
            } else if (game.winType === 'payline') {
                const cols = game.gridCols || 5;
                const rows = game.gridRows || 3;
                const paylines = cols * rows; // approximate
                features.push({
                    icon: '📐',
                    title: 'Payline Wins',
                    desc: `Match symbols across multiple paylines on the ${cols}x${rows} grid!`
                });
            } else if (game.winType === 'classic') {
                features.push({
                    icon: '🎲',
                    title: 'Classic Wins',
                    desc: 'Match symbols across the reels for classic slot payouts!'
                });
            }

            // 6. Grid info
            if (game.gridCols && game.gridRows) {
                const gridSize = game.gridCols * game.gridRows;
                if (gridSize >= 25) {
                    features.push({
                        icon: '📊',
                        title: `${game.gridCols}x${game.gridRows} Grid`,
                        desc: `Massive ${gridSize}-position grid for more ways to win!`
                    });
                }
            }

            // Limit to 5 features max
            return features.slice(0, 5);
        }


        // Show the feature popup for a game
        function showFeaturePopup(game) {
            // Check sessionStorage — only show once per game per session
            const storageKey = `featurePopupSeen_${game.id}`;
            if (sessionStorage.getItem(storageKey)) return;

            const overlay = document.getElementById('slotFeaturePopup');
            if (!overlay) return;

            // Mark as seen
            sessionStorage.setItem(storageKey, '1');

            // Set title and provider
            document.getElementById('featurePopupTitle').textContent = game.name;
            document.getElementById('featurePopupProvider').textContent = game.provider || 'Matrix Games';

            // Set logo icon from bonusType
            const logoEl = document.getElementById('featurePopupLogo');
            const bonusInfo = featureInfo[game.bonusType];
            logoEl.textContent = bonusInfo ? bonusInfo.icon : '🎰';

            // Set feature image (SDXL background or fallback gradient)
            const imageEl = document.getElementById('featurePopupImage');
            const bgImagePath = `assets/backgrounds/slots/${game.id}_bg.png`;
            const testImg = new Image();
            testImg.onload = () => {
                imageEl.style.background = `url('${bgImagePath}') center/cover no-repeat`;
            };
            testImg.onerror = () => {
                imageEl.style.background = game.bgGradient || 'linear-gradient(135deg, #1a0033 0%, #2d1b4e 100%)';
            };
            testImg.src = bgImagePath;
            // Set gradient immediately as placeholder
            imageEl.style.background = game.bgGradient || 'linear-gradient(135deg, #1a0033 0%, #2d1b4e 100%)';

            // Build feature cards
            const featuresContainer = document.getElementById('featurePopupFeatures');
            const features = buildFeatureList(game);
            featuresContainer.innerHTML = features.map(f => `
                <div class="feature-card">
                    <div class="feature-card-icon">${f.icon}</div>
                    <div class="feature-card-text">
                        <div class="feature-card-title">${f.title}</div>
                        <div class="feature-card-desc">${f.desc}</div>
                    </div>
                </div>
            `).join('');

            // Set game stats
            document.getElementById('featureStatRTP').textContent = deriveGameRTP(game);
            document.getElementById('featureStatVolatility').textContent = deriveGameVolatility(game);
            document.getElementById('featureStatMaxWin').textContent = (game.payouts.triple || 100) + 'x';

            // Show with animation
            overlay.classList.remove('dismissing');
            overlay.style.display = 'flex';
        }


        // Dismiss the feature popup
        function dismissFeaturePopup() {
            const overlay = document.getElementById('slotFeaturePopup');
            if (!overlay || overlay.style.display === 'none') return;

            overlay.classList.add('dismissing');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('dismissing');
            }, 350);
        }


        // ═══ Reel Anticipation ═══
        function checkAnticipation(colIdx, grid) {
            if (colIdx < 1 || !grid || !currentGame) return false;
            const rows = currentGame.gridRows || 3;
            const midRow = Math.floor(rows / 2);
            const sym0 = grid[0] && grid[0][midRow];
            const sym1 = grid[1] && grid[1][midRow];
            if (!sym0 || !sym1) return false;
            const wild0 = isWild ? isWild(sym0, currentGame) : false;
            const wild1 = isWild ? isWild(sym1, currentGame) : false;
            return sym0 === sym1 || wild0 || wild1;
        }

        // ═══ Idle Spin Invitation ═══
        function resetIdleTimer() {
            if (_idleInviteTimer) clearTimeout(_idleInviteTimer);
            _idleInviteTimer = null;
            const sBtn = document.getElementById('spinBtn');
            if (sBtn) sBtn.classList.remove('spin-btn-idle-pulse');
            _idleInviteTimer = setTimeout(function() {
                const btn = document.getElementById('spinBtn');
                if (btn && !spinning) btn.classList.add('spin-btn-idle-pulse');
            }, 12000);
        }

        function openSlot(gameId) {
            currentGame = games.find(g => g.id === gameId);
            if (!currentGame) return;

            preloadAnimatedAssets(currentGame);

            addRecentlyPlayed(gameId);

            // Set game-specific CSS theme
            document.getElementById('slotModal').setAttribute('data-game-id', currentGame.id);

            // Apply slot UI template
            const modal = document.getElementById('slotModal');
            SLOT_TEMPLATES.forEach(t => modal.classList.remove(`slot-template-${t}`));
            const tmpl = getGameTemplate(currentGame);
            modal.classList.add(`slot-template-${tmpl}`);

            // Apply per-game chrome style (replicates parent slot visual chrome)
            const CHROME_STYLES = ['candy','olympus','wild','egyptian','neon',
                                   'western','oriental','joker','dark','fishing'];
            CHROME_STYLES.forEach(c => modal.classList.remove(`slot-chrome-${c}`));
            const chromeStyle = (typeof getGameChromeStyle === 'function')
                ? getGameChromeStyle(currentGame) : 'wild';
            modal.classList.add(`slot-chrome-${chromeStyle}`);

            // Update buy bonus button visibility for this game
            if (typeof updateBuyBonusBtn === 'function') updateBuyBonusBtn();

            applySlotThemeToModal(modal, currentGame);

            // Set CSS custom properties for accent color
            const acHex = currentGame.accentColor || '#fbbf24';
            modal.style.setProperty('--accent-color', acHex);
            const rr = parseInt(acHex.slice(1,3), 16) || 0;
            const gg = parseInt(acHex.slice(3,5), 16) || 0;
            const bb = parseInt(acHex.slice(5,7), 16) || 0;
            modal.style.setProperty('--accent-rgb', `${rr}, ${gg}, ${bb}`);

            showPageTransition(() => {
                closeStatsModal();
                document.getElementById('slotGameName').textContent = currentGame.name;
                document.getElementById('slotProvider').textContent = currentGame.provider || '';
                document.getElementById('slotMaxPayout').textContent = currentGame.payouts.triple;

            const tagEl = document.getElementById('slotGameTag');
            if (currentGame.tag) {
                tagEl.textContent = currentGame.tag;
                tagEl.className = `game-tag ${currentGame.tagClass}`;
                tagEl.style.display = 'inline-block';
            } else {
                tagEl.style.display = 'none';
            }

            currentBet = currentGame.minBet;
            refreshBetControls();

            // Apply game-specific theming
            const reelsContainer = document.querySelector('.reels-container');
            if (reelsContainer && currentGame.reelBg) {
                reelsContainer.style.background = currentGame.reelBg;
            }
            // Build dynamic reel grid
            buildReelGrid(currentGame);

            // Apply accent color to reel borders and top bar accent
            const accent = currentGame.accentColor || '#fbbf24';
            // Use game-specific cell bg, or derive a dark tint from reelBg color
            const cellBg = currentGame.cellBg || currentGame.reelBg || 'linear-gradient(180deg, rgba(20,12,22,0.95) 0%, rgba(10,6,12,0.98) 100%)';
            getAllCells().forEach(cell => {
                cell.style.borderColor = accent;
                cell.style.background = cellBg;
            });
            const topBar = document.querySelector('.slot-top-bar');
            if (topBar) {
                topBar.style.borderBottomColor = accent + '44';
            }
            const bottomBar = document.querySelector('.slot-bottom-bar');
            if (bottomBar) {
                bottomBar.style.borderTopColor = accent + '44';
            }
            // Set game background on reel area (prefer animated WebP, fallback to SDXL PNG, then gradient)
            var reelArea = document.querySelector('.slot-reel-area');
            if (reelArea) {
                var bgQuality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
                var bgUseAnimated = bgQuality === 'ultra' || bgQuality === 'high' || bgQuality === 'medium';
                var bgAnimPath = 'assets/backgrounds/slots/' + currentGame.id + '_bg.webp';
                var bgStaticPath = 'assets/backgrounds/slots/' + currentGame.id + '_bg.png';

                if (bgUseAnimated) {
                    var testBgImg = new Image();
                    testBgImg.onload = function() {
                        reelArea.style.background = 'url(' + bgAnimPath + ') center/cover no-repeat';
                        reelArea.classList.add('has-bg-image');
                    };
                    testBgImg.onerror = function() {
                        // Fallback to static PNG
                        var fallbackImg = new Image();
                        fallbackImg.onload = function() {
                            reelArea.style.background = 'url(' + bgStaticPath + ') center/cover no-repeat';
                            reelArea.classList.add('has-bg-image');
                        };
                        fallbackImg.onerror = function() {
                            // Fallback to CSS gradient
                            if (currentGame && currentGame.bgGradient) {
                                reelArea.style.background = currentGame.bgGradient;
                            }
                            reelArea.classList.remove('has-bg-image');
                        };
                        fallbackImg.src = bgStaticPath;
                    };
                    testBgImg.src = bgAnimPath;
                } else {
                    // Low/off quality: use static PNG only
                    var testImg = new Image();
                    testImg.onload = function() {
                        reelArea.style.background = 'url(' + bgStaticPath + ') center/cover no-repeat';
                        reelArea.classList.add('has-bg-image');
                    };
                    testImg.onerror = function() {
                        // Fallback to CSS gradient
                        if (currentGame && currentGame.bgGradient) {
                            reelArea.style.background = currentGame.bgGradient;
                        }
                        reelArea.classList.remove('has-bg-image');
                    };
                    testImg.src = bgStaticPath;
                }
                // Set gradient immediately as placeholder while image loads
                if (currentGame.bgGradient) {
                    reelArea.style.background = currentGame.bgGradient;
                }
            }
            // Update slot bottom bar balance
            const slotBal = document.getElementById('slotBalance');
            if (slotBal) slotBal.textContent = formatMoney(balance);
            // Reset win display
            updateSlotWinDisplay(0);

            // Set initial grid with game's symbols
            const cols = getGridCols(currentGame);
            const rows = getGridRows(currentGame);
            const syms = currentGame.symbols || SLOT_SYMBOLS;
            const initGrid = createEmptyGrid(cols, rows);
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    initGrid[c][r] = syms[(c * rows + r) % syms.length];
                }
            }
            currentGrid = initGrid;
            currentReels = flattenGrid(initGrid);
            renderGrid(initGrid, currentGame);

            // Show bonus feature info
            const bonusInfoEl = document.getElementById('slotBonusInfo');
            if (bonusInfoEl && currentGame.bonusDesc) {
                bonusInfoEl.textContent = currentGame.bonusDesc;
                bonusInfoEl.style.display = 'block';
                bonusInfoEl.style.color = currentGame.accentColor || '#fbbf24';
            } else if (bonusInfoEl) {
                bonusInfoEl.style.display = 'none';
            }

            // Clean up old free spins UI
            hideFreeSpinsDisplay();
            freeSpinsActive = false;
            freeSpinsRemaining = 0;

                document.getElementById('slotModal').classList.add('active');
                // Wait two animation frames so flex layout + CSS transitions settle,
                // then rescale reel cells to fit whatever height the container was given.
                requestAnimationFrame(() => requestAnimationFrame(() => rescaleReelGridToFit(currentGame)));
                // Wire a debounced resize listener so reels rescale if the window is resized
                if (_reelResizeHandler) window.removeEventListener('resize', _reelResizeHandler);
                let _reelResizeDebounce = null;
                _reelResizeHandler = function() {
                    clearTimeout(_reelResizeDebounce);
                    _reelResizeDebounce = setTimeout(function() {
                        if (currentGame) rescaleReelGridToFit(currentGame);
                    }, 120);
                };
                window.addEventListener('resize', _reelResizeHandler);
                window.addEventListener('orientationchange', _reelResizeHandler);
                if (window.visualViewport) window.visualViewport.addEventListener('resize', _reelResizeHandler);
                document.getElementById('messageDisplay').innerHTML = '';
                document.getElementById('winAnimation').innerHTML = '';
                updateSlotWinDisplay(0);
                refreshQaSymbolList();
                lastMessage = { type: 'info', text: '' };

                // ── Live Jackpot Banner ──
                const jackpotBannerEl = document.getElementById('slotJackpotBanner');
                const jackpotValueEl  = document.getElementById('slotJackpotValue');
                if (jackpotBannerEl) {
                    const isJackpotGame = currentGame && (currentGame.jackpot || currentGame.tag === 'JACKPOT' || currentGame.tag === 'MEGA');
                    if (isJackpotGame) {
                        if (jackpotValueEl) jackpotValueEl.textContent = '$' + jackpotValue.toLocaleString();
                        jackpotBannerEl.style.display = '';
                        if (_slotJackpotTickInterval) clearInterval(_slotJackpotTickInterval);
                        _slotJackpotTickInterval = setInterval(function() {
                            jackpotValue += Math.floor(Math.random() * (JACKPOT_TICKER_INCREMENT_MAX - JACKPOT_TICKER_INCREMENT_MIN + 1) + JACKPOT_TICKER_INCREMENT_MIN);
                            if (jackpotValueEl) jackpotValueEl.textContent = '$' + jackpotValue.toLocaleString();
                        }, JACKPOT_TICKER_INTERVAL);
                    } else {
                        jackpotBannerEl.style.display = 'none';
                    }
                }

                // Show feature popup (once per game per session)
                if (currentGame) {
                    showFeaturePopup(currentGame);
                }
                // Start ambient visual effects
                if (typeof startAmbientParticles === 'function') {
                    var providerKey = typeof getGameChromeStyle === 'function' ? getGameChromeStyle(currentGame) : 'ironreel';
                    startAmbientParticles(providerKey);
                }
                // Start ambient sound
                if (typeof SoundManager !== 'undefined' && SoundManager.startAmbient) {
                    var soundProvider = typeof getGameChromeStyle === 'function' ? getGameChromeStyle(currentGame) : 'ironreel';
                    SoundManager.startAmbient(soundProvider);
                }
                // Add ambient breath to reel area
                var reelGridEl = document.querySelector('.reel-grid');
                if (reelGridEl) reelGridEl.classList.add('reel-ambient-breath');

                // Start idle spin invitation timer
                resetIdleTimer();
            });
        }


        function closeSlot() {
            if (spinning) {
                showMessage('Wait for the current spin to finish.', 'lose');
                return;
            }
            if (freeSpinsActive) {
                showMessage('Free spins in progress! Wait for them to finish.', 'lose');
                return;
            }
            // Stop auto-spin if active
            if (autoSpinActive) stopAutoSpin();
            // Stop jackpot banner ticker and hide banner
            if (_slotJackpotTickInterval) { clearInterval(_slotJackpotTickInterval); _slotJackpotTickInterval = null; }
            const jackpotBannerClose = document.getElementById('slotJackpotBanner');
            if (jackpotBannerClose) jackpotBannerClose.style.display = 'none';
            // Close paytable if open
            const paytable = document.getElementById('paytablePanel');
            if (paytable) paytable.classList.remove('active');
            // Immediately hide feature popup if still visible
            const featurePopup = document.getElementById('slotFeaturePopup');
            if (featurePopup) { featurePopup.style.display = 'none'; featurePopup.classList.remove('dismissing'); }
            const slotModalEl = document.getElementById('slotModal');
            slotModalEl.classList.remove('active');
            slotModalEl.removeAttribute('data-slot-theme');
            currentGame = null;
            // Clean up reel strip animation loops
            reelStripData.forEach(data => {
                data.stopped = true;
                if (data.animFrameId) {
                    cancelAnimationFrame(data.animFrameId);
                    data.animFrameId = null;
                }
            });
            reelStripData = [];
            // Clean up free spins UI
            hideFreeSpinsDisplay();
            freeSpinsActive = false;
            freeSpinsRemaining = 0;
            // Clean up idle invite timer
            if (_idleInviteTimer) clearTimeout(_idleInviteTimer);
            _idleInviteTimer = null;
            // Clean up reel resize listener
            if (_reelResizeHandler) { window.removeEventListener('resize', _reelResizeHandler); window.removeEventListener('orientationchange', _reelResizeHandler); if (window.visualViewport) window.visualViewport.removeEventListener('resize', _reelResizeHandler); _reelResizeHandler = null; }
            const spinBtnClose = document.getElementById('spinBtn');
            if (spinBtnClose) spinBtnClose.classList.remove('spin-btn-idle-pulse');
            // Stop ambient effects
            if (typeof stopAmbientParticles === 'function') stopAmbientParticles();
            if (typeof SoundManager !== 'undefined' && SoundManager.stopAmbient) SoundManager.stopAmbient();
            if (typeof destroyParticleEngine === 'function') destroyParticleEngine();
        }


        function updateBetDisplay() {
            // Show as integer if whole number, otherwise 2 decimal places
            const display = Number.isInteger(currentBet)
                ? String(currentBet)
                : currentBet.toFixed(2);
            document.getElementById('betAmount').textContent = display;
        }


        function setPresetBet(index) {
            if (!currentGame) return;
            const bounds = getBetBounds();
            if (!bounds) return;
            const validSteps = BET_STEPS.filter(v => v >= bounds.minBet - 0.001 && v <= bounds.maxBet + 0.001);
            if (validSteps.length === 0) return;
            const midIdx = Math.floor((validSteps.length - 1) / 2);
            const presets = [validSteps[0], validSteps[midIdx], validSteps[validSteps.length - 1]];
            currentBet = presets[Math.min(index, 2)] ?? bounds.minBet;
            const betRange = document.getElementById('betRange');
            if (betRange) betRange.value = validSteps.findIndex(v => Math.abs(v - currentBet) < 0.001);
            updateBetDisplay();
        }


        // ═══ Pragmatic Play-style bet adjustment (+/- buttons) ═══
        function adjustBet(direction) {
            if (!currentGame || spinning) return;
            const bounds = getBetBounds();
            if (!bounds) return;
            // Build the valid step list for the current game/balance
            const validSteps = BET_STEPS.filter(v => v >= bounds.minBet - 0.001 && v <= bounds.maxBet + 0.001);
            if (validSteps.length === 0) return;
            // Find current position (float-safe)
            let idx = validSteps.findIndex(v => Math.abs(v - currentBet) < 0.001);
            if (idx === -1) {
                // Snap to nearest step before navigating
                idx = validSteps.reduce((best, v, i) =>
                    Math.abs(v - currentBet) < Math.abs(validSteps[best] - currentBet) ? i : best, 0);
            }
            const newIdx = Math.max(0, Math.min(validSteps.length - 1, idx + direction));
            currentBet = validSteps[newIdx];
            const betRange = document.getElementById('betRange');
            if (betRange) betRange.value = newIdx;
            updateBetDisplay();
            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) spinBtn.disabled = spinning || currentBet > balance;
        }

        function toggleTurbo() {
            turboMode = !turboMode;
            const btn = document.getElementById('turboBtn');
            if (btn) {
                btn.classList.toggle('turbo-active', turboMode);
            }
        }


        // ═══ Update slot win display in bottom bar ═══
        function updateSlotWinDisplay(amount) {
            const el = document.getElementById('slotWinDisplay');
            if (!el) return;
            if (amount <= 0) {
                el.textContent = '$0.00';
                el.style.color = '#64748b';
                el.style.textShadow = 'none';
                return;
            }
            // Apply win styling immediately
            el.style.color = '#10b981';
            el.style.textShadow = '0 0 12px rgba(16,185,129,0.6)';
            // Cancel any running counter
            if (_winCounterRaf) { cancelAnimationFrame(_winCounterRaf); _winCounterRaf = null; }
            const start = performance.now();
            const duration = Math.min(1200, 300 + amount * 0.15);
            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(1, elapsed / duration);
                const eased = 1 - Math.pow(1 - progress, 5);
                const current = amount * eased;
                el.textContent = '$' + current.toFixed(2);
                if (progress < 1) {
                    _winCounterRaf = requestAnimationFrame(tick);
                } else {
                    el.textContent = '$' + amount.toFixed(2);
                    _winCounterRaf = null;
                }
            }
            _winCounterRaf = requestAnimationFrame(tick);
        }
        // Payline colours — cycle through for multiple simultaneous wins
        const PAYLINE_COLORS = [
            '#34d399', '#f472b6', '#60a5fa', '#fbbf24',
            '#a78bfa', '#fb923c', '#2dd4bf', '#f87171'
        ];

        // Draw SVG lines through winning cell centres
        function showPaylinePaths() {
            var reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;
            if (!_lastWinLines || !_lastWinLines.length) return;

            // Remove any previous SVG overlay
            var old = reelArea.querySelector('.payline-svg');
            if (old) old.remove();

            var areaRect = reelArea.getBoundingClientRect();

            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'payline-svg');
            svg.setAttribute('viewBox', '0 0 ' + areaRect.width + ' ' + areaRect.height);

            // Blur filter for glow
            var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            filter.setAttribute('id', 'plBlur');
            var blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
            blur.setAttribute('stdDeviation', '4');
            filter.appendChild(blur);
            defs.appendChild(filter);
            svg.appendChild(defs);

            _lastWinLines.forEach(function(winLine, idx) {
                var cells = winLine.cells;
                if (!cells || cells.length < 2) return;

                var color = PAYLINE_COLORS[idx % PAYLINE_COLORS.length];
                var points = [];

                for (var i = 0; i < cells.length; i++) {
                    var cellEl = document.getElementById('reel_' + cells[i][0] + '_' + cells[i][1]);
                    if (!cellEl) continue;
                    var cr = cellEl.getBoundingClientRect();
                    points.push({
                        x: cr.left + cr.width / 2 - areaRect.left,
                        y: cr.top + cr.height / 2 - areaRect.top
                    });
                }
                if (points.length < 2) return;

                // Build path string
                var d = 'M' + points[0].x + ',' + points[0].y;
                for (var j = 1; j < points.length; j++) {
                    d += ' L' + points[j].x + ',' + points[j].y;
                }

                // Glow layer (wide, blurred)
                var glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                glow.setAttribute('d', d);
                glow.setAttribute('stroke', color);
                glow.setAttribute('stroke-width', '10');
                glow.setAttribute('fill', 'none');
                glow.setAttribute('stroke-linecap', 'round');
                glow.setAttribute('stroke-linejoin', 'round');
                glow.setAttribute('opacity', '0.35');
                glow.setAttribute('filter', 'url(#plBlur)');
                svg.appendChild(glow);

                // Main crisp line
                var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                line.setAttribute('d', d);
                line.setAttribute('stroke', color);
                line.setAttribute('stroke-width', '3');
                line.setAttribute('fill', 'none');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('stroke-linejoin', 'round');
                line.setAttribute('opacity', '0.9');
                svg.appendChild(line);

                // Dots at each cell centre
                for (var p = 0; p < points.length; p++) {
                    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('cx', points[p].x);
                    dot.setAttribute('cy', points[p].y);
                    dot.setAttribute('r', '5');
                    dot.setAttribute('fill', color);
                    dot.setAttribute('stroke', '#fff');
                    dot.setAttribute('stroke-width', '1.5');
                    dot.setAttribute('opacity', '0.9');
                    svg.appendChild(dot);
                }
            });

            reelArea.appendChild(svg);

            // Auto-remove after CSS fade-out completes (2.8s)
            setTimeout(function() { if (svg.parentNode) svg.remove(); }, 3000);
        }



        function renderSymbol(symbol) {
            // If current game has its own symbols, render from game_symbols folder
            if (currentGame && currentGame.symbols && currentGame.symbols.includes(symbol)) {
                return getSymbolHtml(symbol, currentGame.id);
            }
            // Fallback to legacy shared asset templates
            return assetTemplates[symbol] || `<span class="reel-symbol-text">${symbol}</span>`;
        }


        function updateReels(symbolsOrGrid) {
            if (!currentGame) return;
            if (Array.isArray(symbolsOrGrid) && Array.isArray(symbolsOrGrid[0])) {
                // It's a 2D grid
                currentGrid = symbolsOrGrid;
                currentReels = flattenGrid(symbolsOrGrid);
                renderGrid(symbolsOrGrid, currentGame);
            } else {
                // It's a 1D array (backward compat)
                currentReels = [...symbolsOrGrid];
                const grid = gridFrom1D(symbolsOrGrid, currentGame);
                currentGrid = grid;
                renderGrid(grid, currentGame);
            }
        }


        function updateSingleReel(colIndex, symbolOrColArray) {
            if (!currentGame) return;
            const rows = getGridRows(currentGame);
            if (rows > 1 && Array.isArray(symbolOrColArray)) {
                // Multi-row: update entire column
                if (currentGrid) currentGrid[colIndex] = [...symbolOrColArray];
                for (let r = 0; r < symbolOrColArray.length; r++) {
                    renderCell(colIndex, r, symbolOrColArray[r]);
                }
            } else {
                // Classic single-row: update single cell
                const symbol = Array.isArray(symbolOrColArray) ? symbolOrColArray[0] : symbolOrColArray;
                if (currentGrid && currentGrid[colIndex]) currentGrid[colIndex][0] = symbol;
                renderCell(colIndex, 0, symbol);
                currentReels[colIndex] = symbol;
            }
        }


        function stopReelScrollingImmediately() {
            reelStripData.forEach(data => {
                data.stopped = true;
                if (data.animFrameId) {
                    cancelAnimationFrame(data.animFrameId);
                    data.animFrameId = null;
                }
                if (data.stripEl) {
                    data.stripEl.classList.remove('spinning', 'decelerating', 'bouncing');
                }
                if (data.colEl) {
                    data.colEl.classList.remove('spinning');
                }
            });
        }


        function canUseServerSpin(game) {
            if (!game) return false;
            if (!isServerAuthToken()) return false;
            if (freeSpinsActive) return false;
            if (forcedSpinQueue.length > 0) return false;
            if (deterministicRng) return false;
            const freeSpinCount = Number(game.freeSpinsCount || 0);
            return freeSpinCount <= 0;
        }


        async function spin() {
            if (spinning || !currentGame) return;
            if (freeSpinsActive) return;
            if (currentBet > balance) {
                showMessage('Insufficient balance. Deposit funds to continue.', 'lose');
                return;
            }

            // Hide gamble button on new spin
            hideGambleButton();
            closeBigWin();

            // Reset per-spin bonus state
            respinCount = 0;
            expandingWildRespinsLeft = 0;

            playProviderSound('spin', currentGame);
            spinning = true;
            resetIdleTimer(); // reset idle pulse at spin start
            updateSlotWinDisplay(0);
            // Add bg zoom effect during spin
            const reelAreaSpin = document.querySelector('.slot-reel-area');
            if (reelAreaSpin) reelAreaSpin.classList.add('spinning-active');

            const spinBtn = document.getElementById('spinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = '';
            document.getElementById('messageDisplay').innerHTML = '';
            document.getElementById('winAnimation').innerHTML = '';
            lastMessage = { type: 'info', text: '' };

            const spinGame = currentGame;
            const cols = getGridCols(spinGame);
            const useServerSpin = canUseServerSpin(spinGame);

            // Start reel strip scrolling animation (real rolling)
            startReelScrolling(turboMode);

            let finalGrid = null;
            let serverResult = null;

            try {
                if (useServerSpin) {
                    serverResult = await apiRequest('/api/spin', {
                        method: 'POST',
                        body: { gameId: spinGame.id, betAmount: currentBet },
                        requireAuth: true
                    });
                    if (!serverResult || !Array.isArray(serverResult.grid)) {
                        throw new Error('Invalid spin response from server.');
                    }
                    finalGrid = serverResult.grid;
                    const serverBalance = Number(serverResult.balance);
                    if (Number.isFinite(serverBalance)) {
                        balance = serverBalance;
                        updateBalance();
                        saveBalance();
                    }
                } else {
                    finalGrid = generateSpinResult(spinGame);
                    balance -= currentBet;
                    updateBalance();
                    saveBalance();
                }
            } catch (error) {
                stopReelScrollingImmediately();
                spinning = false;
                const ra = document.querySelector('.slot-reel-area');
                if (ra) ra.classList.remove('spinning-active');
                spinBtn.disabled = currentBet > balance;
                spinBtn.textContent = '';
                refreshBetControls();
                showMessage(error?.message || 'Spin failed. Please try again.', 'lose');
                return;
            }

            // Stagger stop times per column
            const stopDelays = calculateStopDelays(cols, turboMode, false);

            // Stop each column one by one with decel + bounce
            stopDelays.forEach((delay, colIdx) => {
                setTimeout(() => {
                    // Trigger reel anticipation on last reel(s) when 2 matching middle symbols seen
                    if (!turboMode && colIdx === cols - 1 && checkAnticipation(colIdx, finalGrid)) {
                        const colEl = document.getElementById('reelCol' + colIdx);
                        if (colEl) {
                            colEl.classList.add('reel-anticipation');
                            setTimeout(function() { colEl.classList.remove('reel-anticipation'); }, 700);
                        }
                        if (typeof playSound === 'function') playSound('scatter');
                    }
                    animateReelStop(colIdx, finalGrid[colIdx], null, cols, finalGrid, spinGame, () => {
                        if (serverResult) {
                            displayServerWinResult(serverResult, spinGame);
                        } else {
                            checkWin(flattenGrid(finalGrid), spinGame);
                        }
                        spinning = false;
                        resetIdleTimer(); // restart idle pulse after spin
                        const ra = document.querySelector('.slot-reel-area');
                        if (ra) ra.classList.remove('spinning-active');
                        spinBtn.disabled = currentBet > balance;
                        spinBtn.textContent = '';
                        refreshBetControls();
                        saveBalance();
                    });
                }, delay);
            });

            // Update local stats
            stats.totalSpins++;
            if (!serverResult || !serverResult.usedFreeSpin) {
                stats.totalWagered += currentBet;
            }
            if (!stats.gamesPlayed[spinGame.id]) stats.gamesPlayed[spinGame.id] = 0;
            stats.gamesPlayed[spinGame.id]++;
            saveStats();
            updateStatsSummary();
        }


        // Display win result from server (no client-side win calculation)
        // -- Near-Miss Detection
        function detectAndShowNearMiss(grid, game) {
            if (!grid) return;
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const nearMissCells = [];

            if (cols <= 4) {
                for (let r = 0; r < rows; r++) {
                    const rowSyms = [];
                    for (let c = 0; c < cols; c++) {
                        rowSyms.push(grid[c] ? grid[c][r] : null);
                    }
                    const freq = {};
                    rowSyms.forEach(function(sym) {
                        if (!sym || isWild(sym, game) || isScatter(sym, game)) return;
                        freq[sym] = (freq[sym] || 0) + 1;
                    });
                    Object.keys(freq).forEach(function(sym) {
                        const count = freq[sym];
                        if (count >= 2 && count < cols) {
                            rowSyms.forEach(function(s, c) {
                                if (s !== sym && !isWild(s, game)) {
                                    nearMissCells.push([c, r]);
                                }
                            });
                        }
                    });
                }
            } else {
                const midRow = Math.floor(rows / 2);
                const sym0 = grid[0] ? grid[0][midRow] : null;
                if (sym0 && !isWild(sym0, game) && !isScatter(sym0, game)) {
                    let matchCount = 0;
                    for (let c = 0; c < 4 && c < cols; c++) {
                        const s = grid[c] ? grid[c][midRow] : null;
                        if (s === sym0 || isWild(s, game)) matchCount++;
                    }
                    if (matchCount >= 4 && cols > 4) {
                        const col4Sym = grid[4] ? grid[4][midRow] : null;
                        if (col4Sym && col4Sym !== sym0 && !isWild(col4Sym, game)) {
                            nearMissCells.push([4, midRow]);
                        }
                    }
                }
            }

            if (nearMissCells.length > 0) {
                nearMissCells.forEach(function(pair) {
                    const c = pair[0], r = pair[1];
                    const cellEl = document.getElementById("reel_" + c + "_" + r);
                    if (cellEl) {
                        cellEl.classList.add("reel-near-miss");
                        setTimeout(function() { cellEl.classList.remove("reel-near-miss"); }, 1200);
                    }
                });
                showMessage("So Close! 👀", "near-miss");
            }
        }

        // -- Win Streak Toast
        function showStreakToast(streak) {
            const reelArea = document.querySelector(".slot-reel-area");
            if (!reelArea) return;
            const toast = document.createElement("div");
            toast.className = "streak-toast";
            let icon = "🔥";
            const text = streak + " WIN STREAK!";
            if (streak >= 10) {
                icon = "🔥🔥🔥";
                toast.classList.add("streak-toast--legendary");
            } else if (streak >= 5) {
                icon = "🔥🔥";
                toast.classList.add("streak-toast--hot");
            }
            toast.textContent = icon + " " + text;
            reelArea.appendChild(toast);
            setTimeout(function() { toast.remove(); }, 2500);
        }

        // Display win result from server (no client-side win calculation)
        function displayServerWinResult(result, game) {
            const grid = result.grid;
            const winAmount = result.winAmount;
            const details = result.winDetails || {};

            // Clear highlights
            getAllCells().forEach(function(cell) {
                cell.classList.remove("reel-win-glow", "reel-wild-glow", "reel-scatter-glow", "reel-wild-expand");
            });

            // Highlight wilds and scatters
            if (grid) {
                const cols = getGridCols(game);
                const rows = getGridRows(game);
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        const cell = document.getElementById("reel_" + c + "_" + r);
                        if (!cell || !grid[c]) continue;
                        if (isWild(grid[c][r], game)) cell.classList.add("reel-wild-glow");
                        if (isScatter(grid[c][r], game)) cell.classList.add("reel-scatter-glow");
                    }
                }
            }

            if (winAmount > 0) {
                const serverBalance = Number(result.balance);
                if (Number.isFinite(serverBalance)) {
                    balance = serverBalance;
                }
                updateBalance();
                saveBalance();
                showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                setTimeout(showPaylinePaths, 300);
                updateSlotWinDisplay(winAmount);

                // Win entrance animation on highlighted cells
                const winCells = document.querySelectorAll(".reel-win-glow, .reel-big-win-glow");
                winCells.forEach(function(cell) { cell.classList.add("reel-win-entrance"); });
                setTimeout(function() {
                    document.querySelectorAll(".reel-win-entrance").forEach(function(cell) { cell.classList.remove("reel-win-entrance"); });
                }, 400);

                const message = details.message || ("WIN! $" + winAmount.toLocaleString() + "!");
                if (winAmount >= currentBet * 20) {
                    playProviderSound("bigwin", currentGame);
                } else {
                    playProviderSound("win", currentGame);
                }
                showMessage(message, "win");

                stats.totalWon += winAmount;
                if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                saveStats();
                updateStatsSummary();

                if (typeof awardXP === "function") awardXP(winAmount >= currentBet * WIN_TIER_BIG_THRESHOLD ? XP_AWARD_BIG_WIN : XP_AWARD_REGULAR_WIN);

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }

                // Show gamble button for wins >= 1x bet (not during free spins)
                if (!freeSpinsActive && !autoSpinActive && winAmount >= currentBet) {
                    showGambleButton(winAmount);
                }

                // Big win celebration for wins >= 10x bet
                if (winAmount >= currentBet * 10 && !freeSpinsActive) {
                    setTimeout(function() { showBigWinCelebration(winAmount); }, 800);
                }

                // Win streak tracking
                _winStreak++;
                if (_winStreak >= 3) {
                    showStreakToast(_winStreak);
                }
            } else {
                // Streak ended
                if (_winStreak >= 3) {
                    showMessage("Streak ended at " + _winStreak + "! Keep spinning!", "lose");
                } else {
                    showMessage(details.message || "No win. Try again.", "lose");
                }
                _winStreak = 0;
                hideGambleButton();
                detectAndShowNearMiss(grid, game);
            }
            if (typeof awardXP === "function") awardXP(XP_AWARD_PER_SPIN);

            // Promo engagement triggers
            if (typeof checkPromoTriggers === "function") {
                checkPromoTriggers("spin_result", {
                    won: winAmount > 0,
                    winAmount: winAmount,
                    betAmount: currentBet
                });
            }
        }


        function showMessage(text, type) {
            lastMessage = { type, text };
            const msgDiv = document.getElementById('messageDisplay');
            msgDiv.innerHTML = `<div class="message-display message-${type}">${text}</div>`;
        }


        function showWinAnimation(amount) {
            const winDiv = document.getElementById('winAnimation');
            const multiplier = currentBet > 0 ? amount / currentBet : 0;

            // Determine win tier (like Pragmatic Play)
            let winTier = '';
            let tierClass = '';
            if (multiplier >= WIN_TIER_EPIC_THRESHOLD) {
                winTier = 'EPIC WIN';
                tierClass = 'win-tier-epic';
            } else if (multiplier >= WIN_TIER_MEGA_THRESHOLD) {
                winTier = 'MEGA WIN';
                tierClass = 'win-tier-mega';
            } else if (multiplier >= WIN_TIER_BIG_THRESHOLD) {
                winTier = 'BIG WIN';
                tierClass = 'win-tier-big';
            } else if (multiplier >= WIN_TIER_GREAT_THRESHOLD) {
                winTier = 'GREAT WIN';
                tierClass = 'win-tier-great';
            }

            if (winTier) {
                // Big win overlay with animated counter
                winDiv.innerHTML = `
                    <div class="pp-win-overlay ${tierClass}">
                        <div class="pp-win-burst"></div>
                        <div class="pp-win-content">
                            <div class="pp-win-tier">${winTier}</div>
                            <div class="pp-win-amount" id="ppWinAmount">$0</div>
                            <div class="pp-win-multiplier">${multiplier.toFixed(1)}x</div>
                        </div>
                    </div>`;
                // Animated counter — count up to final amount
                const amtEl = document.getElementById('ppWinAmount');
                if (amtEl) {
                    const dur = Math.min(2500, 800 + multiplier * 30);
                    const t0 = performance.now();
                    (function tick(now) {
                        const p = Math.min((now - t0) / dur, 1);
                        const eased = 1 - Math.pow(1 - p, 2.5);
                        amtEl.textContent = '$' + (eased * amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        if (p < 1) requestAnimationFrame(tick);
                    })(performance.now());
                }
                createConfetti();
                // Trigger screen shake + particle cascade for big wins
                if (multiplier >= WIN_TIER_GREAT_THRESHOLD) {
                    triggerScreenShake('mega');
                } else if (multiplier >= 2) {
                    triggerScreenShake('big');
                }
                if (currentGame) {
                    setTimeout(() => triggerWinCascade(currentGame), 200);
                }
            } else {
                // Small win — just show amount overlay
                winDiv.innerHTML = `<div class="win-amount">+$${amount.toLocaleString()}</div>`;
            }

            // Update bottom bar win display
            updateSlotWinDisplay(amount);

            setTimeout(() => {
                winDiv.innerHTML = '';
            }, winTier ? 5000 : 3000);
        }


        // Confetti, particles & cascade system moved to animations.js

        // ═══════════════════════════════════════════════════════
        // FREE SPINS ENGINE
        // ═══════════════════════════════════════════════════════

        function triggerFreeSpins(game, count) {
            freeSpinsActive = true;
            freeSpinsRemaining = count;
            freeSpinsTotalWin = 0;
            freeSpinsMultiplier = 1;
            freeSpinsCascadeLevel = 0;
            expandingWildRespinsLeft = 0;
            respinCount = 0;

            // Book of Dead: pick a random expanding symbol
            if (game.bonusType === 'expanding_symbol') {
                const regularSyms = game.symbols.filter(s => s !== game.wildSymbol && s !== game.scatterSymbol);
                freeSpinsExpandedSymbol = regularSyms[Math.floor(getRandomNumber() * regularSyms.length)];
                showBonusEffect(`Expanding Symbol: ${freeSpinsExpandedSymbol.replace(/^s\d+_/, '').replace(/_/g, ' ').toUpperCase()}!`, '#c7a94e');
            }

            showFreeSpinsOverlay(game, count);
            updateFreeSpinsDisplay();
            createConfetti();
        }


        function advanceFreeSpins(game) {
            if (!freeSpinsActive) return;

            freeSpinsRemaining--;
            updateFreeSpinsDisplay();

            if (freeSpinsRemaining <= 0) {
                endFreeSpins(game);
            } else {
                // Auto-spin the next free spin after a delay
                setTimeout(() => {
                    if (freeSpinsActive && currentGame && !spinning) {
                        freeSpinSpin(game);
                    }
                }, 1500);
            }
        }


        function freeSpinSpin(game) {
            if (!freeSpinsActive || spinning || !currentGame) return;

            spinning = true;
            resetIdleTimer(); // reset idle pulse at free spin start
            const spinBtn = document.getElementById('spinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = 'FREE SPIN...';

            const cols = getGridCols(game);

            // Start reel scrolling animation
            startReelScrolling(false);

            let finalGrid = consumeSpinResult(true); // true = free spins mode

            // Book of Dead: expanding symbol mechanic — boost chance of expanded symbol
            if (game.bonusType === 'expanding_symbol' && freeSpinsExpandedSymbol) {
                for (let c = 0; c < finalGrid.length; c++) {
                    for (let r = 0; r < finalGrid[c].length; r++) {
                        if (getRandomNumber() < 0.35) finalGrid[c][r] = freeSpinsExpandedSymbol;
                    }
                }
            }

            // Super Hot: stacked wilds mechanic
            if (game.bonusType === 'stacked_wilds' && game.stackedWildChance) {
                for (let c = 0; c < finalGrid.length; c++) {
                    // Stacked: if first row of column is wild, fill entire column
                    if (getRandomNumber() < game.stackedWildChance) {
                        for (let r = 0; r < finalGrid[c].length; r++) {
                            finalGrid[c][r] = game.wildSymbol;
                        }
                    }
                }
            }

            // Stagger stop times (free spin uses tighter timing)
            const stopDelays = calculateStopDelays(cols, turboMode, true);

            stopDelays.forEach((delay, colIdx) => {
                setTimeout(() => {
                    animateReelStop(colIdx, finalGrid[colIdx], null, cols, finalGrid, game, () => {
                        checkWin(flattenGrid(finalGrid), game);
                        spinning = false;
                        resetIdleTimer(); // restart idle pulse after free spin
                        const ra2 = document.querySelector('.slot-reel-area');
                        if (ra2) ra2.classList.remove('spinning-active');
                        spinBtn.disabled = false;
                        spinBtn.textContent = freeSpinsActive ? `FREE SPIN (${freeSpinsRemaining})` : 'SPIN NOW!';
                        refreshQaStateDisplay();
                    });
                }, delay);
            });

            playProviderSound('spin', currentGame);
        }


        function endFreeSpins(game) {
            freeSpinsActive = false;
            freeSpinsExpandedSymbol = null;
            freeSpinsCascadeLevel = 0;
            expandingWildRespinsLeft = 0;

            // Show summary
            showFreeSpinsSummary(freeSpinsTotalWin, game);

            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.textContent = 'SPIN NOW!';
                spinBtn.disabled = currentBet > balance;
            }

            // Remove free spins display
            setTimeout(() => {
                hideFreeSpinsDisplay();
            }, 3000);
        }


        function triggerRespin(reelIndex, currentSymbols, game) {
            if (spinning) return;
            spinning = true;

            // Clear win highlights before respinning
            clearReelAnimations(getAllCells());

            const data = reelStripData[reelIndex];
            const newSymbol = getRandomSymbol();
            const newSymbols = [...currentSymbols];
            newSymbols[reelIndex] = newSymbol;
            if (currentGrid && currentGrid[reelIndex]) {
                currentGrid[reelIndex][0] = newSymbol;
            }

            if (data) {
                // Use strip scrolling for the respun column
                data.stopped = false;
                data.stripEl.classList.add('spinning');
                data.colEl.classList.add('spinning');
                randomizeStripBuffers(reelIndex, game);

                const speed = REEL_SPIN_PX_PER_SEC;
                let lastTime = performance.now();
                function scrollFrame(ts) {
                    if (data.stopped) return;
                    const dt = (ts - lastTime) / 1000;
                    lastTime = ts;
                    data.currentY -= speed * dt;
                    const wrapThreshold = -(data.totalH - data.visibleH);
                    if (data.currentY < wrapThreshold) {
                        data.currentY = -(REEL_STRIP_BUFFER * (data.cellH + data.cellGap));
                        randomizeStripBuffers(reelIndex, game);
                    }
                    data.stripEl.style.transform = `translateY(${data.currentY}px)`;
                    data.animFrameId = requestAnimationFrame(scrollFrame);
                }
                data.animFrameId = requestAnimationFrame(scrollFrame);

                setTimeout(() => {
                    // Stop the strip for this column
                    const rows = getGridRows(game);
                    const finalCol = rows > 1 ? (currentGrid[reelIndex] || [newSymbol]) : [newSymbol];
                    animateReelStop(reelIndex, finalCol, null, getGridCols(game), currentGrid, game, () => {});
                    updateSingleReel(reelIndex, newSymbol);
                    setTimeout(() => {
                        spinning = false;
                        checkWin(newSymbols, game);
                    }, REEL_DECEL_DURATION + REEL_BOUNCE_DURATION + 100);
                }, 800);
            } else {
                // Fallback for no strip data
                setTimeout(() => {
                    updateSingleReel(reelIndex, newSymbol);
                    playSound('click');
                    setTimeout(() => { spinning = false; checkWin(newSymbols, game); }, 300);
                }, 800);
            }
        }


        function triggerExpandingWildRespin(currentSymbols, game) {
            if (spinning) return;
            spinning = true;

            // Clear win highlights before expanding wild respin
            clearReelAnimations(getAllCells());

            const cols = getGridCols(game);
            const respinIndices = [];
            for (let c = 0; c < cols; c++) {
                let hasWildInCol = false;
                if (currentGrid && currentGrid[c]) {
                    hasWildInCol = currentGrid[c].some(s => isWild(s, game));
                } else {
                    hasWildInCol = isWild(currentSymbols[c], game);
                }
                if (!hasWildInCol) {
                    respinIndices.push(c);
                    // Start strip scrolling for this column
                    const data = reelStripData[c];
                    if (data) {
                        data.stopped = false;
                        data.stripEl.classList.add('spinning');
                        data.colEl.classList.add('spinning');
                        randomizeStripBuffers(c, game);
                        const speed = REEL_SPIN_PX_PER_SEC;
                        let lastTime = performance.now();
                        function scrollFrame(ts) {
                            if (data.stopped) return;
                            const dt = (ts - lastTime) / 1000;
                            lastTime = ts;
                            data.currentY -= speed * dt;
                            const wrapThreshold = -(data.totalH - data.visibleH);
                            if (data.currentY < wrapThreshold) {
                                data.currentY = -(REEL_STRIP_BUFFER * (data.cellH + data.cellGap));
                                randomizeStripBuffers(c, game);
                            }
                            data.stripEl.style.transform = `translateY(${data.currentY}px)`;
                            data.animFrameId = requestAnimationFrame(scrollFrame);
                        }
                        data.animFrameId = requestAnimationFrame(scrollFrame);
                    }
                }
            }

            if (respinIndices.length === 0) {
                spinning = false;
                return;
            }

            // Generate new symbols for respun columns
            const newGrid = currentGrid ? currentGrid.map(col => [...col]) : gridFrom1D([...currentSymbols], game);
            const syms = getGameSymbols(game);
            respinIndices.forEach(c => {
                for (let r = 0; r < newGrid[c].length; r++) {
                    newGrid[c][r] = syms[Math.floor(getRandomNumber() * syms.length)];
                }
            });

            setTimeout(() => {
                respinIndices.forEach(c => {
                    const data = reelStripData[c];
                    if (data) {
                        // Place final symbols and stop with bounce
                        const rows = getGridRows(game);
                        for (let r = 0; r < rows; r++) {
                            const cell = document.getElementById(`reel_${c}_${r}`);
                            if (cell && newGrid[c][r]) cell.innerHTML = renderSymbol(newGrid[c][r]);
                        }
                        data.stopped = true;
                        if (data.animFrameId) { cancelAnimationFrame(data.animFrameId); data.animFrameId = null; }
                        const targetY = -(REEL_STRIP_BUFFER * (data.cellH + data.cellGap));
                        data.stripEl.classList.remove('spinning');
                        data.stripEl.classList.add('decelerating');
                        data.colEl.classList.remove('spinning');
                        data.stripEl.style.transform = `translateY(${targetY + REEL_BOUNCE_OVERSHOOT}px)`;
                        setTimeout(() => {
                            data.stripEl.classList.remove('decelerating');
                            data.stripEl.classList.add('bouncing');
                            data.stripEl.style.transform = `translateY(${targetY}px)`;
                            data.currentY = targetY;
                            data.colEl.classList.add('stopped');
                            setTimeout(() => data.stripEl.classList.remove('bouncing'), REEL_BOUNCE_DURATION);
                        }, REEL_DECEL_DURATION);
                    }
                    updateSingleReel(c, newGrid[c]);
                });
                currentGrid = newGrid;
                currentReels = flattenGrid(newGrid);
                playSound('click');

                setTimeout(() => {
                    spinning = false;
                    checkWin(flattenGrid(newGrid), game);
                }, REEL_DECEL_DURATION + REEL_BOUNCE_DURATION + 100);
            }, 800);
        }


        // ═══ Free Spins UI ═══

        function showFreeSpinsOverlay(game, count) {
            const modal = document.querySelector('.slot-modal-fullscreen');
            const accent = game.accentColor || '#fbbf24';

            // Step 1: Flash scatter cells gold
            getAllCells().forEach(cell => {
                const img = cell.querySelector('img');
                if (img && img.src && game.scatterSymbol && img.src.includes(game.scatterSymbol)) {
                    cell.classList.add('fs-scatter-pop');
                    setTimeout(() => cell.classList.remove('fs-scatter-pop'), 800);
                }
            });

            // Step 2: Screen flash (immediate)
            if (modal) {
                modal.classList.add('fs-screen-flash');
                setTimeout(() => modal.classList.remove('fs-screen-flash'), 700);
            }

            // Step 3: Screen shake after the flash peak
            setTimeout(() => {
                if (modal) {
                    modal.classList.add('fs-shake');
                    setTimeout(() => modal.classList.remove('fs-shake'), 550);
                }
            }, 250);

            // Step 4: Show overlay after intro sequence
            setTimeout(() => {
                let overlay = document.getElementById('freeSpinsOverlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'freeSpinsOverlay';
                    overlay.className = 'free-spins-overlay';
                    document.querySelector('.slot-modal-fullscreen')?.appendChild(overlay);
                }

                const bonusName = game.bonusDesc ? game.bonusDesc.split(':')[0] : 'FREE SPINS';
                // Build conic-gradient starburst rays using accent color
                const rayGradient = `conic-gradient(from 0deg, transparent 0deg, ${accent}22 8deg, transparent 16deg, ${accent}18 24deg, transparent 32deg, ${accent}22 40deg, transparent 48deg, ${accent}18 56deg, transparent 64deg, ${accent}22 72deg, transparent 80deg, ${accent}18 88deg, transparent 96deg, ${accent}22 104deg, transparent 112deg, ${accent}18 120deg, transparent 128deg, ${accent}22 136deg, transparent 144deg, ${accent}18 152deg, transparent 160deg, ${accent}22 168deg, transparent 176deg, ${accent}18 184deg, transparent 192deg, ${accent}22 200deg, transparent 208deg, ${accent}18 216deg, transparent 224deg, ${accent}22 232deg, transparent 240deg, ${accent}18 248deg, transparent 256deg, ${accent}22 264deg, transparent 272deg, ${accent}18 280deg, transparent 288deg, ${accent}22 296deg, transparent 304deg, ${accent}18 312deg, transparent 320deg, ${accent}22 328deg, transparent 336deg, ${accent}18 344deg, transparent 352deg)`;

                overlay.innerHTML = `
                    <div class="free-spins-intro" style="border-color: ${accent}; box-shadow: 0 0 80px ${accent}80, 0 0 200px ${accent}28, inset 0 0 40px ${accent}0d">
                        <div class="fs-rays" style="background: ${rayGradient}"></div>
                        <div class="fs-intro-banner" style="color: ${accent}">⭐ &nbsp; BONUS TRIGGERED &nbsp; ⭐</div>
                        <div class="fs-intro-title" style="color: ${accent}; text-shadow: 0 0 30px ${accent}, 0 0 60px ${accent}80">${bonusName}</div>
                        <div class="fs-intro-count" style="text-shadow: 0 0 40px ${accent}cc, 0 0 80px ${accent}55">${count}</div>
                        <div class="fs-intro-sublabel">Free Spins</div>
                        <div class="fs-intro-desc">${game.bonusDesc || ''}</div>
                        <div class="fs-intro-tap">— tap to start —</div>
                    </div>
                `;
                overlay.classList.add('active');

                // Auto-dismiss after 3.5s and start first free spin
                setTimeout(() => {
                    overlay.classList.remove('active');
                    showFreeSpinsHUD(game);
                    setTimeout(() => {
                        if (freeSpinsActive && currentGame && !spinning) {
                            freeSpinSpin(game);
                        }
                    }, 500);
                }, 3500);
            }, 700);
        }


        function showFreeSpinsHUD(game) {
            let hud = document.getElementById('freeSpinsHUD');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'freeSpinsHUD';
                hud.className = 'free-spins-hud';
                (document.querySelector('.slot-reel-area') || document.querySelector('.slot-modal-fullscreen'))?.insertAdjacentElement('beforebegin', hud);
            }
            hud.style.borderColor = game.accentColor;
            hud.style.display = 'flex';
            updateFreeSpinsDisplay();
        }


        function updateFreeSpinsDisplay() {
            const hud = document.getElementById('freeSpinsHUD');
            if (!hud) return;

            const game = currentGame;
            let multText = '';
            if (freeSpinsMultiplier > 1) multText = ` | ${freeSpinsMultiplier}x`;
            if (freeSpinsCascadeLevel > 0 && game && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                const mults = game.tumbleMultipliers || game.avalancheMultipliers || [1];
                const idx = Math.min(freeSpinsCascadeLevel, mults.length - 1);
                multText = ` | CASCADE ${mults[idx]}x`;
            }
            if (freeSpinsExpandedSymbol) {
                const symName = freeSpinsExpandedSymbol.replace(/^s\d+_/, '').replace(/_/g, ' ');
                multText += ` | EXPANDING: ${symName.toUpperCase()}`;
            }

            hud.innerHTML = `
                <div class="fs-hud-spins">
                    <span class="fs-hud-label">FREE SPINS</span>
                    <span class="fs-hud-value">${freeSpinsRemaining}</span>
                </div>
                <div class="fs-hud-win">
                    <span class="fs-hud-label">TOTAL WIN</span>
                    <span class="fs-hud-value fs-hud-win-value">$${freeSpinsTotalWin.toLocaleString()}</span>
                </div>
                ${multText ? `<div class="fs-hud-mult"><span class="fs-hud-label">BONUS</span><span class="fs-hud-value">${multText.replace(' | ', '')}</span></div>` : ''}
            `;
        }


        function hideFreeSpinsDisplay() {
            const hud = document.getElementById('freeSpinsHUD');
            if (hud) hud.style.display = 'none';
            const overlay = document.getElementById('freeSpinsOverlay');
            if (overlay) overlay.classList.remove('active');
        }


        function showFreeSpinsSummary(totalWin, game) {
            let overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'freeSpinsOverlay';
                overlay.className = 'free-spins-overlay';
                document.querySelector('.slot-modal-fullscreen')?.appendChild(overlay);
            }

            const accent = game.accentColor || '#fbbf24';
            overlay.innerHTML = `
                <div class="fs-summary-card" style="--fs-accent: ${accent}">
                    <div class="fs-summary-rays"></div>
                    <div class="fs-summary-label">FREE SPINS COMPLETE!</div>
                    <div class="fs-summary-subtitle">Bonus Round Winnings</div>
                    <div class="fs-summary-amount" id="fsSummaryAmount">$0.00</div>
                    <div class="fs-summary-subtext">${totalWin > 0 ? 'Added to your balance' : 'Better luck next time!'}</div>
                    <button class="fs-summary-close-btn" onclick="document.getElementById('freeSpinsOverlay').classList.remove('active')">
                        COLLECT &amp; CONTINUE
                    </button>
                </div>
            `;
            overlay.classList.add('active');

            if (totalWin > 0) {
                createConfetti();
                playProviderSound('bigwin', currentGame);
                // Animated counter
                const el = document.getElementById('fsSummaryAmount');
                let start = 0;
                const duration = 2000;
                const startTime = performance.now();
                function tick(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                    const val = eased * totalWin;
                    if (el) el.textContent = '$' + val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    if (progress < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
            }

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 5000);
        }


        function toggleAutoSpin(count) {
            if (autoSpinActive) {
                stopAutoSpin();
                return;
            }
            autoSpinActive = true;
            autoSpinMax = count;
            autoSpinCount = 0;
            updateAutoSpinUI();
            runAutoSpin();
        }


        function stopAutoSpin() {
            autoSpinActive = false;
            autoSpinCount = 0;
            autoSpinMax = 0;
            updateAutoSpinUI();
        }


        function updateAutoSpinUI() {
            const btn = document.getElementById('autoSpinBtn');
            if (!btn) return;
            if (autoSpinActive) {
                btn.innerHTML = `<span class="auto-btn-icon">\u25A0</span><span class="auto-btn-label">STOP (${autoSpinMax - autoSpinCount})</span>`;
                btn.classList.add('auto-spin-active');
            } else {
                btn.innerHTML = '<span class="auto-btn-icon">\u21BB</span><span class="auto-btn-label">AUTO</span>';
                btn.classList.remove('auto-spin-active');
            }
        }


        function runAutoSpin() {
            if (!autoSpinActive || !currentGame) {
                stopAutoSpin();
                return;
            }
            if (autoSpinCount >= autoSpinMax) {
                stopAutoSpin();
                return;
            }
            if (currentBet > balance) {
                showToast('Auto-spin stopped: insufficient balance.', 'lose');
                stopAutoSpin();
                return;
            }
            if (spinning || freeSpinsActive) {
                // Poll until current spin/free spins finish
                setTimeout(runAutoSpin, 500);
                return;
            }

            autoSpinCount++;
            updateAutoSpinUI();
            spin();

            // Poll for spin completion instead of fixed timeout
            waitForSpinThenContinue();
        }


        function waitForSpinThenContinue() {
            if (!autoSpinActive) return;
            if (spinning || freeSpinsActive) {
                setTimeout(waitForSpinThenContinue, 300);
                return;
            }
            // Check win/loss limits before next spin
            if (checkAutoplayLimits()) return;
            // Small pause between spins for readability
            setTimeout(runAutoSpin, turboMode ? 400 : 800);
        }


        function checkAutoplayLimits() {
            if (autoplayWinLimitAmount > 0 && (balance - autoplayStartBalance) >= autoplayWinLimitAmount) {
                stopAutoSpin();
                showMessage(`Autoplay stopped: Win limit +$${autoplayWinLimitAmount.toLocaleString()} reached!`, 'win');
                return true;
            }
            if (autoplayLossLimitAmount > 0 && (autoplayStartBalance - balance) >= autoplayLossLimitAmount) {
                stopAutoSpin();
                showMessage(`Autoplay stopped: Loss limit $${autoplayLossLimitAmount.toLocaleString()} reached!`, 'lose');
                return true;
            }
            return false;
        }


        // ═══════════════════════════════════════════════════════════
        // PROFIT MONITOR (Admin Overlay — Ctrl+Shift+P)
        // ═══════════════════════════════════════════════════════════
        function toggleProfitMonitor() {
            let monitor = document.getElementById('profitMonitor');
            if (monitor) {
                monitor.remove();
                return;
            }

            if (!window.HouseEdge) return;
            const status = window.HouseEdge.getProfitStatus();
            const breakdown = window.HouseEdge.getGameProfitBreakdown();

            monitor = document.createElement('div');
            monitor.id = 'profitMonitor';
            monitor.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,0.95);color:#e2e8f0;padding:16px 20px;border-radius:12px;border:1px solid #334155;font-family:monospace;font-size:12px;max-width:380px;max-height:80vh;overflow-y:auto;backdrop-filter:blur(10px);';

            const profitColor = status.houseProfit >= 0 ? '#10b981' : '#ef4444';
            const rtpColor = parseFloat(status.currentRTP) <= 90 ? '#10b981' : parseFloat(status.currentRTP) <= 96 ? '#fbbf24' : '#ef4444';

            let html = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="color:#fbbf24;font-weight:700;font-size:14px;">📊 PROFIT MONITOR</span>
                    <span onclick="document.getElementById('profitMonitor').remove()" style="cursor:pointer;color:#94a3b8;font-size:16px;">✕</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-bottom:10px;">
                    <span style="color:#94a3b8;">Total Wagered:</span><span style="text-align:right;">$${status.totalWagered.toLocaleString()}</span>
                    <span style="color:#94a3b8;">Total Paid:</span><span style="text-align:right;">$${status.totalPaid.toLocaleString()}</span>
                    <span style="color:#94a3b8;font-weight:700;">House Profit:</span><span style="text-align:right;color:${profitColor};font-weight:700;">$${status.houseProfit.toLocaleString()}</span>
                    <span style="color:#94a3b8;">Current RTP:</span><span style="text-align:right;color:${rtpColor};">${status.currentRTP}</span>
                    <span style="color:#94a3b8;">Target RTP:</span><span style="text-align:right;">${status.targetRTP}</span>
                    <span style="color:#94a3b8;">Total Spins:</span><span style="text-align:right;">${status.totalSpins.toLocaleString()}</span>
                </div>
                <div style="margin-bottom:10px;padding:6px 8px;border-radius:6px;background:${status.emergencyMode ? '#ef44441a' : status.killSwitchActive ? '#ef44441a' : '#10b9811a'};border:1px solid ${status.emergencyMode || status.killSwitchActive ? '#ef4444' : '#10b981'}33;">
                    <span style="font-size:11px;color:${status.emergencyMode || status.killSwitchActive ? '#ef4444' : '#10b981'};">
                        ${status.emergencyMode ? '🚨 EMERGENCY MODE — Wins severely restricted' : status.killSwitchActive ? '🔴 KILL SWITCH — All wins blocked until recovery' : status.sessionCapped ? '⚠️ Session win cap reached' : '✅ Profit protection: HEALTHY'}
                    </span>
                </div>`;

            if (breakdown.length > 0) {
                html += '<div style="margin-top:8px;border-top:1px solid #334155;padding-top:8px;"><span style="color:#fbbf24;font-size:11px;">PER-GAME BREAKDOWN</span>';
                html += '<table style="width:100%;font-size:10px;margin-top:4px;"><tr style="color:#94a3b8;"><th style="text-align:left;padding:2px;">Game</th><th style="text-align:right;padding:2px;">Spins</th><th style="text-align:right;padding:2px;">Profit</th><th style="text-align:right;padding:2px;">RTP</th></tr>';
                for (const g of breakdown.slice(0, 10)) {
                    const gpColor = g.profit >= 0 ? '#10b981' : '#ef4444';
                    html += `<tr><td style="padding:2px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.gameId}</td><td style="text-align:right;padding:2px;">${g.spins}</td><td style="text-align:right;padding:2px;color:${gpColor};">$${g.profit.toFixed(0)}</td><td style="text-align:right;padding:2px;">${g.rtp}</td></tr>`;
                }
                html += '</table></div>';
            }

            html += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #334155;font-size:10px;color:#64748b;">Press Ctrl+Shift+P to close | Session: ${status.sessionStats.spins} spins</div>`;

            monitor.innerHTML = html;
            document.body.appendChild(monitor);
        }


        // ═══════════════════════════════════════════════════════════
        // BUY BONUS
        // ═══════════════════════════════════════════════════════════

        function buyBonus() {
            if (!currentGame) return;
            const spinsCount = currentGame.freeSpinsCount || 0;
            if (spinsCount <= 0) {
                showMessage('No bonus feature available for this game', 'lose');
                return;
            }
            const multiplier = 100;
            const cost = currentBet * multiplier;
            document.getElementById('buyBonusGameName').textContent = currentGame.name;
            document.getElementById('buyBonusSpins').textContent = `${spinsCount} FREE SPINS`;
            document.getElementById('buyBonusDesc').textContent = 'Instantly triggers the bonus round!';
            document.getElementById('buyBonusCostValue').textContent = `$${cost.toLocaleString()}`;
            document.getElementById('buyBonusOverlay').style.display = 'flex';
        }


        function confirmBuyBonus() {
            if (!currentGame) return;
            const cost = currentBet * 100;
            if (balance < cost) {
                showMessage('Insufficient balance to buy bonus!', 'lose');
                closeBuyBonus();
                return;
            }
            balance -= cost;
            updateBalance();
            closeBuyBonus();
            triggerFreeSpins(currentGame, currentGame.freeSpinsCount || 10);
            showMessage(`⚡ BONUS BOUGHT! ${currentGame.freeSpinsCount || 10} FREE SPINS TRIGGERED!`, 'win');
        }


        function closeBuyBonus() {
            document.getElementById('buyBonusOverlay').style.display = 'none';
        }


        // Show/hide buy bonus button when a game is loaded
        function updateBuyBonusBtn() {
            const btn = document.getElementById('buyBonusBtn');
            if (!btn) return;
            const hasFreeSpins = currentGame && (currentGame.freeSpinsCount || 0) > 0;
            btn.style.display = hasFreeSpins ? 'flex' : 'none';
            if (hasFreeSpins) {
                document.getElementById('buyBonusCost').textContent = `${100}x`;
            }
        }


        function openAutoplayModal() {
            if (autoSpinActive) {
                stopAutoSpin();
                return;
            }
            // Sync button highlights
            document.querySelectorAll('.autoplay-spin-btn').forEach(btn => {
                btn.classList.toggle('autoplay-spin-selected',
                    parseInt(btn.dataset.count) === autoplaySelectedCount);
            });
            updateAutoplayLimitDisplay('win');
            updateAutoplayLimitDisplay('loss');
            document.getElementById('autoplayOverlay').style.display = 'flex';
        }


        function closeAutoplayModal() {
            document.getElementById('autoplayOverlay').style.display = 'none';
        }


        function selectAutoplayCount(count) {
            autoplaySelectedCount = count;
            document.querySelectorAll('.autoplay-spin-btn').forEach(btn => {
                btn.classList.toggle('autoplay-spin-selected',
                    parseInt(btn.dataset.count) === count);
            });
        }


        function adjustAutoplayLimit(type, dir) {
            if (type === 'win') {
                autoplayWinLimitIdx = Math.max(0, Math.min(AUTOPLAY_WIN_LIMITS.length - 1, autoplayWinLimitIdx + dir));
                updateAutoplayLimitDisplay('win');
            } else {
                autoplayLossLimitIdx = Math.max(0, Math.min(AUTOPLAY_LOSS_LIMITS.length - 1, autoplayLossLimitIdx + dir));
                updateAutoplayLimitDisplay('loss');
            }
        }


        function updateAutoplayLimitDisplay(type) {
            if (type === 'win') {
                const val = AUTOPLAY_WIN_LIMITS[autoplayWinLimitIdx];
                const el = document.getElementById('autoplayWinLimit');
                if (el) el.textContent = val === 0 ? '$0 (No Limit)' : `$${val.toLocaleString()}`;
            } else {
                const val = AUTOPLAY_LOSS_LIMITS[autoplayLossLimitIdx];
                const el = document.getElementById('autoplayLossLimit');
                if (el) el.textContent = val === 0 ? '$0 (No Limit)' : `$${val.toLocaleString()}`;
            }
        }


        function startEnhancedAutoplay() {
            closeAutoplayModal();
            // Capture limits before starting
            autoplayWinLimitAmount  = AUTOPLAY_WIN_LIMITS[autoplayWinLimitIdx];
            autoplayLossLimitAmount = AUTOPLAY_LOSS_LIMITS[autoplayLossLimitIdx];
            autoplayStartBalance    = balance;
            toggleAutoSpin(autoplaySelectedCount);
        }


        function showBigWinCelebration(amount) {
            const multiplier = Math.round(amount / currentBet);
            const overlay = document.getElementById('bigWinOverlay');
            if (!overlay) return;

            // Determine tier
            const isMega  = multiplier >= WIN_TIER_EPIC_THRESHOLD * 2;
            const isSuper = !isMega  && multiplier >= WIN_TIER_EPIC_THRESHOLD;
            const isBig   = !isSuper && multiplier >= WIN_TIER_MEGA_THRESHOLD;
            const tierClass = isMega ? 'bigwin-tier-mega' : isSuper ? 'bigwin-tier-super' : isBig ? 'bigwin-tier-big' : 'bigwin-tier-nice';

            // Label
            const label = document.getElementById('bigWinLabel');
            if (isMega)       { label.textContent = '🏆 MEGA WIN!';  }
            else if (isSuper) { label.textContent = '💎 SUPER WIN!'; }
            else if (isBig)   { label.textContent = '🔥 BIG WIN!';   }
            else              { label.textContent = '⭐ NICE WIN!';   }
            label.className = 'bigwin-label ' + tierClass;

            // Overlay tier class for CSS theming
            overlay.className = 'bigwin-overlay ' + tierClass;

            // Multiplier
            document.getElementById('bigWinMultiplier').textContent = '×' + multiplier;

            // Animated amount counter
            const amountEl = document.getElementById('bigWinAmount');
            amountEl.textContent = '$0';
            if (_winCounterRaf) cancelAnimationFrame(_winCounterRaf);
            const duration = Math.min(2000, 500 + amount * 0.06);
            const startTime = performance.now();
            function animateOverlayAmount(now) {
                const t = Math.min(1, (now - startTime) / duration);
                const ease = 1 - Math.pow(1 - t, 4);
                amountEl.textContent = '$' + Math.round(ease * amount).toLocaleString();
                if (t < 1) { _winCounterRaf = requestAnimationFrame(animateOverlayAmount); }
                else { amountEl.textContent = '$' + amount.toLocaleString(); _winCounterRaf = null; }
            }
            _winCounterRaf = requestAnimationFrame(animateOverlayAmount);

            // Provider-themed particle emojis
            const defaultCoins = ['🪙','💰','💎','⭐','🏅'];
            let coinPool = defaultCoins;
            if (typeof getProviderAnimTheme === 'function' && currentGame) {
                const theme = getProviderAnimTheme(currentGame);
                if (theme && theme.particles && theme.particles.length) {
                    coinPool = theme.particles.concat(defaultCoins);
                }
            }
            const particleCount = isMega ? 50 : isSuper ? 38 : 28;
            const coinsEl = document.getElementById('bigWinCoins');
            coinsEl.innerHTML = '';
            for (let i = 0; i < particleCount; i++) {
                const coin = document.createElement('div');
                coin.className = 'bigwin-coin';
                coin.textContent = coinPool[Math.floor(Math.random() * coinPool.length)];
                coin.style.cssText = `left:${Math.random()*92+4}%;animation-delay:${Math.random()*2}s;animation-duration:${1.8+Math.random()*2}s;font-size:${16+Math.floor(Math.random()*22)}px;`;
                coinsEl.appendChild(coin);
            }

            // Brief screen flash
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.22;pointer-events:none;z-index:8499;transition:opacity 0.35s;';
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 350); }, 60);

            overlay.style.display = 'flex';
            playProviderSound(isMega ? 'megawin' : 'bigwin', currentGame);

            // Auto-close after tier-dependent delay
            if (_bigWinCloseTimer) clearTimeout(_bigWinCloseTimer);
            _bigWinCloseTimer = setTimeout(() => closeBigWin(), isMega ? 7000 : isSuper ? 6000 : 5000);
        }

        function closeBigWin() {
            if (_bigWinCloseTimer) { clearTimeout(_bigWinCloseTimer); _bigWinCloseTimer = null; }
            if (_winCounterRaf)    { cancelAnimationFrame(_winCounterRaf); _winCounterRaf = null; }
            const overlay = document.getElementById('bigWinOverlay');
            if (overlay) overlay.style.display = 'none';
        }

        function startReelScrolling(turbo) {
            const speed = turbo ? REEL_SPIN_PX_PER_SEC_TURBO : REEL_SPIN_PX_PER_SEC;
            const game = currentGame;

            // Clear all win/wild/scatter highlights from the previous spin
            clearReelAnimations(getAllCells());
            // Also clear the reel-area pulse that lingers after big wins
            const reelArea = document.querySelector('.slot-reel-area');
            if (reelArea) reelArea.classList.remove('big-win-pulse');

            reelStripData.forEach((data, colIdx) => {
                data.stopped = false;
                data.stripEl.classList.add('spinning');
                data.stripEl.classList.remove('decelerating', 'bouncing');
                data.colEl.classList.add('spinning');
                data.colEl.classList.remove('stopped');

                // Randomize buffers for visual variety
                randomizeStripBuffers(colIdx, game);

                let lastTime = performance.now();

                function scrollFrame(timestamp) {
                    if (data.stopped) return;

                    const dt = (timestamp - lastTime) / 1000; // seconds
                    lastTime = timestamp;

                    // Move strip upward (negative Y)
                    data.currentY -= speed * dt;

                    // Wrap-around: when scrolled past bottom buffer, reset to top
                    const wrapThreshold = -(data.totalH - data.visibleH);
                    if (data.currentY < wrapThreshold) {
                        // Reset to initial position and re-randomize buffers
                        data.currentY = -(REEL_STRIP_BUFFER * (data.cellH + data.cellGap));
                        randomizeStripBuffers(colIdx, game);
                    }

                    data.stripEl.style.transform = `translateY(${data.currentY}px)`;
                    data.animFrameId = requestAnimationFrame(scrollFrame);
                }

                data.animFrameId = requestAnimationFrame(scrollFrame);
            });
        }

        function calculateStopDelays(cols, turbo, isFree) {
            const baseDelay = turbo
                ? (isFree ? 150 : 200)
                : (isFree ? 500 : 600);
            const staggerTotal = turbo
                ? (isFree ? 300 : 400)
                : (isFree ? 900 : 1200);
            const staggerMin = turbo
                ? (isFree ? 50 : 60)
                : (isFree ? 150 : 200);
            const stagger = Math.max(staggerMin, Math.floor(staggerTotal / cols));
            return Array.from({ length: cols }, (_, i) => baseDelay + i * stagger);
        }

        function animateReelStop(colIdx, finalColumn, spinInterval, cols, finalGrid, game, onComplete) {
            const data = reelStripData[colIdx];

            if (data) {
                // Cancel the rAF scroll loop
                data.stopped = true;
                if (data.animFrameId) {
                    cancelAnimationFrame(data.animFrameId);
                    data.animFrameId = null;
                }

                const rows = getGridRows(game);
                const cellStep = data.cellH + data.cellGap;
                const targetY = -(REEL_STRIP_BUFFER * cellStep);
                const syms = game.symbols || SLOT_SYMBOLS;

                // ── Natural landing: seed the strip so symbols "scroll into view" ──
                // 1. Place final result symbols into the visible-zone cells
                for (let r = 0; r < rows; r++) {
                    const cell = document.getElementById(`reel_${colIdx}_${r}`);
                    if (cell && finalColumn && finalColumn[r]) {
                        cell.innerHTML = renderSymbol(finalColumn[r]);
                    }
                }

                // 2. Also fill surrounding buffer cells with contextual symbols
                //    so the strip looks like a continuous reel
                const allCells = data.stripEl.querySelectorAll('.reel-cell');
                const visStart = REEL_STRIP_BUFFER;
                // Fill 4 cells above visible zone (approaching symbols the player glimpses)
                for (let i = Math.max(0, visStart - 4); i < visStart; i++) {
                    if (allCells[i]) allCells[i].innerHTML = renderSymbol(syms[Math.floor(Math.random() * syms.length)]);
                }
                // Fill 4 cells below visible zone (just-passed symbols)
                for (let i = visStart + rows; i < Math.min(allCells.length, visStart + rows + 4); i++) {
                    if (allCells[i]) allCells[i].innerHTML = renderSymbol(syms[Math.floor(Math.random() * syms.length)]);
                }

                // 3. Position strip so visible zone is ~3 cells BELOW the viewport
                //    (symbols still scrolling upward, approaching landing position)
                const approachOffset = cellStep * 3;
                data.stripEl.style.transition = 'none';
                data.stripEl.style.transform = `translateY(${targetY - approachOffset}px)`;

                // Force reflow so the "jump" position applies before transition starts
                void data.stripEl.offsetHeight;

                // 4. Remove blur/spinning classes — player now sees symbols clearly as they decelerate
                data.stripEl.classList.remove('spinning');
                data.colEl.classList.remove('spinning');

                // 5. Apply deceleration: smooth ease-out to overshoot position
                data.stripEl.classList.add('decelerating');
                const overshootY = targetY + REEL_BOUNCE_OVERSHOOT;
                data.stripEl.style.transform = `translateY(${overshootY}px)`;

                // 6. After deceleration finishes, do the settle-bounce
                setTimeout(() => {
                    data.stripEl.classList.remove('decelerating');
                    data.stripEl.classList.add('bouncing');
                    data.stripEl.style.transform = `translateY(${targetY}px)`;
                    data.currentY = targetY;
                    data.colEl.classList.add('stopped');

                    // Add 3D landing tilt if quality supports it
                    var landQuality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
                    if (landQuality === 'ultra' || landQuality === 'high') {
                        for (var lr = 0; lr < rows; lr++) {
                            var landCell = document.getElementById('reel_' + colIdx + '_' + lr);
                            if (landCell) {
                                landCell.classList.add('reel-landing-tilt');
                                (function(c) { setTimeout(function() { c.classList.remove('reel-landing-tilt'); }, 500); })(landCell);
                            }
                        }
                    }

                    // Clean up after bounce
                    setTimeout(() => {
                        data.stripEl.classList.remove('bouncing');
                    }, REEL_BOUNCE_DURATION);
                }, REEL_DECEL_DURATION);
            }

            playSound('click');

            // On last column: finalize
            if (colIdx === cols - 1) {
                if (spinInterval) clearInterval(spinInterval);
                currentGrid = finalGrid;
                currentReels = flattenGrid(finalGrid);
                renderGrid(finalGrid, game);
                setTimeout(onComplete, REEL_DECEL_DURATION + REEL_BOUNCE_DURATION + 100);
            }
        }
