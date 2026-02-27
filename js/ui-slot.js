// ═══════════════════════════════════════════════════════
// UI-SLOT MODULE
// ═══════════════════════════════════════════════════════

        // ── Spin History State ──────────────────────────────────
        let spinHistory = []; // [{win, bet, isNearMiss, timestamp}, ...]
        // Session stats tracking (reset each time a new game opens)
        let _sessSpins = 0, _sessTotalBet = 0, _sessTotalWon = 0;
        let _sessWins = 0;
        const SPIN_HISTORY_MAX = 15;
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


        /** Preload animated WebP assets for the current game (with lifecycle management) */
        var _preloadCache = [];  // Track active preload images for cancellation
        function preloadAnimatedAssets(game) {
            // Cancel any in-flight preloads from a previous game
            _preloadCache.forEach(function(img) { img.src = ''; });
            _preloadCache = [];

            if (!game) return;
            var quality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
            if (quality === 'low' || quality === 'off') return;

            // Preload animated symbols
            if (game.symbols) {
                game.symbols.forEach(function(sym) {
                    var img = new Image();
                    img.src = 'assets/game_symbols/' + game.id + '/' + sym + '.webp';
                    _preloadCache.push(img);
                });
            }

            // Preload animated background
            if (quality !== 'low') {
                var bgImg = new Image();
                bgImg.src = 'assets/backgrounds/slots/' + game.id + '_bg.webp';
                _preloadCache.push(bgImg);
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
                    cell.style.marginTop = s === 0 ? '0px' : dims.gap + 'px';
                    cell.style.marginBottom = '0px';

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
                // Also enforce marginBottom=0 to cancel any CSS margin that would
                // corrupt the cell-pitch arithmetic (total strip height calculation
                // assumes pitch = cellH + gap only, with no extra bottom margin).
                rd.stripEl.querySelectorAll('.reel-cell').forEach((cell, ci) => {
                    cell.style.height      = scaledCellH + 'px';
                    cell.style.minHeight   = scaledCellH + 'px';
                    cell.style.marginBottom = '0px';
                    if (ci === 0) cell.style.marginTop = '0px';
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



        // Win Cell Ring Glow helpers
        function _applyWinCellGlow(tierClass) {
            document.querySelectorAll(".reel-cell.win-cell-glow").forEach(function(el) {
                el.classList.remove("win-cell-glow", "win-tier-epic", "win-tier-mega", "win-tier-jackpot");
            });
            document.querySelectorAll(".reel-win-glow, .reel-big-win-glow").forEach(function(cell) {
                cell.classList.add("win-cell-glow");
                if (tierClass) cell.classList.add(tierClass);
            });
        }

        function _clearWinCellGlow() {
            document.querySelectorAll(".reel-cell.win-cell-glow").forEach(function(el) {
                el.classList.remove("win-cell-glow", "win-tier-epic", "win-tier-mega", "win-tier-jackpot");
            });
        }
        // Autoplay (N-spin) helpers
        function _startAutoplay(count) {
            window._autoplayActive = true;
            window._autoplayRemaining = count;
            window._autoplayStopping = false;
            _updateAutoplayBtn();
            _autoplayStep();
        }

        function _stopAutoplay() {
            window._autoplayStopping = true;
            _updateAutoplayBtn();
        }

        function _autoplayStep() {
            if (!window._autoplayActive) return;
            if (window._autoplayStopping || window._autoplayRemaining <= 0) {
                window._autoplayActive = false;
                window._autoplayRemaining = 0;
                window._autoplayStopping = false;
                _updateAutoplayBtn();
                return;
            }
            if (typeof spinning !== "undefined" && spinning) { setTimeout(_autoplayStep, 200); return; }
            if (typeof freeSpinsActive !== "undefined" && freeSpinsActive) { setTimeout(_autoplayStep, 200); return; }
            if (typeof balance !== "undefined" && typeof currentBet !== "undefined" && balance < currentBet) {
                window._autoplayActive = false;
                window._autoplayRemaining = 0;
                window._autoplayStopping = false;
                _updateAutoplayBtn();
                return;
            }
            window._autoplayRemaining--;
            _updateAutoplayBtn();
            var _apSpinBtn = document.getElementById("spinBtn");
            if (_apSpinBtn && !_apSpinBtn.disabled) {
                _apSpinBtn.click();
                (function _waitForSpinEnd() {
                    if (typeof spinning !== "undefined" && spinning) { setTimeout(_waitForSpinEnd, 150); return; }
                    setTimeout(_autoplayStep, 600);
                })();
            } else {
                setTimeout(_autoplayStep, 300);
            }
        }

        function _updateAutoplayBtn() {
            var _apBtn = document.getElementById("autoplayBtn");
            if (!_apBtn) return;
            if (window._autoplayActive && !window._autoplayStopping) {
                _apBtn.className = "autoplay-btn autoplay-active";
                _apBtn.innerHTML = "↻ Auto <span class='autoplay-count-badge'>" + window._autoplayRemaining + "</span>";
                _apBtn.title = "Click to stop autoplay";
            } else if (window._autoplayStopping) {
                _apBtn.className = "autoplay-btn autoplay-stopping";
                _apBtn.innerHTML = "↻ Stopping…";
                _apBtn.title = "Stopping after this spin";
            } else {
                _apBtn.className = "autoplay-btn";
                _apBtn.innerHTML = "↻ Auto";
                _apBtn.title = "Autoplay";
            }
        }
        function _updateTurboBtn() {
            var btn = document.getElementById('turboSpinBtn');
            if (!btn) return;
            if (window._turboSpinEnabled) {
                btn.classList.add('turbo-on');
                btn.title = 'Turbo: ON (click to disable)';
            } else {
                btn.classList.remove('turbo-on');
                btn.title = 'Turbo spin (fast reels)';
            }
        }
        // -- Intro splash helper (Sprint 19) --
        function _showSlotSplash(game) {
            // Use the inner fullscreen div as positioning context so #slotModal stays position:fixed
            var modal = document.getElementById("slotModal");
            var container = (modal && modal.querySelector(".slot-modal-fullscreen")) ||
                            modal ||
                            document.querySelector(".game-panel");
            if (!container) return;
            var existing = container.querySelector(".slot-intro-splash");
            if (existing) existing.remove();
            var splash = document.createElement("div");
            splash.className = "slot-intro-splash";
            splash.style.background = game.bgGradient || "linear-gradient(135deg,#1a1a2e,#0f3460)";
            var providerTag = document.createElement("div");
            providerTag.className = "splash-provider-tag";
            providerTag.textContent = game.provider || "";
            var titleEl = document.createElement("div");
            titleEl.className = "splash-game-title";
            titleEl.textContent = game.name || "";
            var loadingBar = document.createElement("div");
            loadingBar.className = "splash-loading-bar";
            splash.appendChild(providerTag);
            splash.appendChild(titleEl);
            splash.appendChild(loadingBar);
            container.insertBefore(splash, container.firstChild);
            requestAnimationFrame(function() { splash.classList.add("splash-visible"); });
            setTimeout(function() {
                splash.classList.remove("splash-visible");
                setTimeout(function() { if (splash.parentNode) splash.remove(); }, 350);
            }, 1500);
        }

        // -- Paytable overlay helpers (Sprint 19) --
        function _buildPaytableHTML(game) {
            var payouts = game.payouts || {};
            var rtp = game.rtp ? game.rtp.toFixed(1) + "%" : "N/A";
            var volatility = game.volatility || game.vol || "medium";
            var volLabelMap = { low: "Low", medium: "Medium", high: "High" };
            var volLabel = volLabelMap[volatility] || volatility;
            var grid = (game.gridCols || game.cols || 5) + "x" + (game.gridRows || game.rows || 3);
            var minBet = "$" + (game.minBet || 0.20).toFixed(2);
            var maxBet = "$" + (game.maxBet || 500).toFixed(2);
            var payoutEntries = [];
            if (payouts.triple)     payoutEntries.push(["3x Match", payouts.triple + "x"]);
            if (payouts.double)     payoutEntries.push(["2x Match", payouts.double + "x"]);
            if (payouts.wildTriple) payoutEntries.push(["3x Wild", payouts.wildTriple + "x"]);
            if (payouts.scatterPay) payoutEntries.push(["Scatter", payouts.scatterPay + "x"]);
            if (payouts.cluster5)   payoutEntries.push(["Cluster 5+", payouts.cluster5 + "x"]);
            if (payouts.cluster8)   payoutEntries.push(["Cluster 8+", payouts.cluster8 + "x"]);
            if (payouts.cluster12)  payoutEntries.push(["Cluster 12+", payouts.cluster12 + "x"]);
            if (payouts.cluster15)  payoutEntries.push(["Cluster 15+", payouts.cluster15 + "x"]);
            var payoutRowsHTML = payoutEntries.map(function(p) {
                return "<div class=\"paytable-payout-row\">" +
                       "<span class=\"paytable-payout-label\">" + p[0] + "</span>" +
                       "<span class=\"paytable-payout-value\">" + p[1] + "</span>" +
                       "</div>";
            }).join("");
            var symbols = (game.symbols || []).slice(0, 9);
            var symbolChips = symbols.map(function(s) {
                var display = s.replace(/^s\d+_|^wild_|^scatter_/, "").replace(/_/g, " ");
                return "<div class=\"paytable-symbol-chip\">" + display + "</div>";
            }).join("");
            var bonusDesc = game.bonusDesc || game.description || "Spin to win!";
            var html = "";
            html += "<div class=\"paytable-header\">";
            html += "<div><div class=\"paytable-title\">" + (game.name || "Game Info") + "</div>";
            html += "<div class=\"paytable-subtitle\">" + (game.provider || "") + "</div></div>";
            html += "<button class=\"paytable-close\" id=\"paytableCloseBtn\" title=\"Close\">&#x2715;</button>";
            html += "</div>";
            html += "<div class=\"paytable-body\">";
            html += "<div class=\"paytable-section\"><div class=\"paytable-stats-row\">";
            html += "<div class=\"paytable-stat\"><div class=\"paytable-stat-value\">" + rtp + "</div><div class=\"paytable-stat-label\">RTP</div></div>";
            html += "<div class=\"paytable-stat\"><div class=\"paytable-stat-value\">" + volLabel + "</div><div class=\"paytable-stat-label\">Volatility</div></div>";
            html += "<div class=\"paytable-stat\"><div class=\"paytable-stat-value\">" + grid + "</div><div class=\"paytable-stat-label\">Grid</div></div>";
            html += "</div><div class=\"paytable-stats-row\">";
            html += "<div class=\"paytable-stat\"><div class=\"paytable-stat-value\">" + minBet + "</div><div class=\"paytable-stat-label\">Min Bet</div></div>";
            html += "<div class=\"paytable-stat\"><div class=\"paytable-stat-value\">" + maxBet + "</div><div class=\"paytable-stat-label\">Max Bet</div></div>";
            html += "</div></div>";
            if (payoutEntries.length) {
                html += "<div class=\"paytable-section\"><div class=\"paytable-section-title\">Payouts</div>" +
                        "<div class=\"paytable-payout-grid\">" + payoutRowsHTML + "</div></div>";
            }
            if (symbolChips) {
                html += "<div class=\"paytable-section\"><div class=\"paytable-section-title\">Symbols</div>" +
                        "<div class=\"paytable-symbols-list\">" + symbolChips + "</div></div>";
            }
            html += "<div class=\"paytable-section\"><div class=\"paytable-section-title\">Bonus Feature</div>" +
                    "<div class=\"paytable-bonus-desc\">" + bonusDesc + "</div></div>";
            html += "</div>";
            return html;
        }

        function _openPaytable() {
            var overlay = document.getElementById("paytableOverlay");
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.id = "paytableOverlay";
                overlay.className = "paytable-overlay";
                var modal = document.createElement("div");
                modal.className = "paytable-modal";
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                overlay.addEventListener("click", function(e) {
                    if (e.target === overlay) _closePaytable();
                });
            }
            var modal = overlay.querySelector(".paytable-modal");
            modal.innerHTML = _buildPaytableHTML(currentGame || {});
            var closeBtn = document.getElementById("paytableCloseBtn");
            if (closeBtn) closeBtn.addEventListener("click", _closePaytable);
            requestAnimationFrame(function() { overlay.classList.add("open"); });
        }

        function _closePaytable() {
            var overlay = document.getElementById("paytableOverlay");
            if (overlay) overlay.classList.remove("open");
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
                        <div class="paytable-stat-value">${(game.payouts && game.payouts.triple) || '—'}x</div>
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
                <div class="paytable-rtp">RTP: <strong>${rtp}%</strong> &middot; Volatility: <strong>${deriveGameVolatility(game)}</strong></div>
            </div>`;

            body.innerHTML = html;
        }


        // Derive RTP from game properties (simulated since not stored in game data)
        function deriveGameRTP(game) {
            const maxPayout = (game.payouts && game.payouts.triple) || (game.rtp ? Math.round(game.rtp * 2) : 100);
            if (maxPayout >= 200) return '96.8%';
            if (maxPayout >= 100) return '96.5%';
            if (maxPayout >= 70) return '96.2%';
            return '95.8%';
        }


        // Derive volatility from game properties
        function deriveGameVolatility(game) {
            if (game.volatility) {
                const v = game.volatility.toLowerCase();
                if (v === 'extreme' || v === 'very high') return 'Very High';
                if (v === 'high') return 'High';
                if (v === 'medium') return 'Medium';
                return 'Low';
            }
            const maxPayout = (game.payouts && game.payouts.triple) || 100;
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
            document.getElementById('featureStatMaxWin').textContent = ((game.payouts && game.payouts.triple) || 100) + 'x';

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
        // Count scatter symbols on all columns up to and including maxColIdx.
        // Used for real scatter anticipation tension on intermediate reels.
        function _countScattersOnCols(maxColIdx, grid, game) {
            if (!grid || !game || !game.scatterSymbol) return 0;
            const rows = getGridRows(game);
            let count = 0;
            for (let c = 0; c <= maxColIdx; c++) {
                if (!grid[c]) continue;
                for (let r = 0; r < rows; r++) {
                    if (grid[c][r] === game.scatterSymbol) count++;
                }
            }
            return count;
        }

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

            // Reset spin history for the new game session
            spinHistory = [];
            // Reset session stats HUD
            _sessSpins = 0; _sessTotalBet = 0; _sessTotalWon = 0; _sessWins = 0;
            var _sb0 = document.getElementById('spinBtn');
            if (_sb0) _sb0.classList.remove('spin-btn-fire');
            var _oldHud = document.getElementById('slotSessionHud');
            if (_oldHud) _oldHud.remove();

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
            // Inject session HUD strip below the bottom bar
            (function() {
                var _hud = document.createElement('div');
                _hud.id = 'slotSessionHud';
                _hud.className = 'slot-session-hud';
                _hud.innerHTML = '<span class="hud-neutral">SESSION &mdash;</span><span class="hud-sep">|</span><span id="hudSpins">0 spins</span><span class="hud-sep">|</span><span id="hudPL" class="hud-neutral">$0.00</span><span class="hud-sep">|</span><span id="hudWR" class="hud-winrate">0%</span>';
                var _bar = modal.querySelector('.slot-bottom-bar');
                if (_bar && _bar.parentNode) _bar.parentNode.insertBefore(_hud, _bar.nextSibling);
            })();

            // Inject bet chip row below bet display
            (function() {
                var betSection = document.querySelector('.slot-bar-bet');
                if (!betSection) return;
                var old = betSection.querySelector('.bet-chip-row');
                if (old) old.remove();
                var row = document.createElement('div');
                row.className = 'bet-chip-row';
                // Determine Min/Mid/Max labels from BET_STEPS filtered to game range
                var game = currentGame || {};
                var minB = (game.minBet !== undefined ? game.minBet : 10);
                var maxB = (game.maxBet !== undefined ? game.maxBet : 500);
                var allSteps = typeof BET_STEPS !== 'undefined' ? BET_STEPS : [10,25,50,100,200,500];
                var steps = allSteps.filter(function(s){ return s >= minB && s <= maxB; });
                if (steps.length < 2) steps = allSteps.slice(0, 3);
                var picks = [steps[0], steps[Math.floor((steps.length - 1) / 2)], steps[steps.length - 1]];
                var labels = ['Min', 'Mid', 'Max'];
                picks.forEach(function(val, i) {
                    var chip = document.createElement('button');
                    chip.className = 'bet-chip';
                    chip.dataset.betVal = val;
                    chip.textContent = labels[i];
                    chip.setAttribute('title', '$' + val);
                    chip.addEventListener('click', function() {
                        if (typeof setPresetBet === 'function') {
                            setPresetBet(i);
                        } else {
                            currentBet = val;
                            if (typeof updateBetDisplay === 'function') updateBetDisplay();
                        }
                    });
                    row.appendChild(chip);
                });
                betSection.appendChild(row);
            })();

            // Wire hover sounds to slot control buttons
            (function() {
                var _hoverBtns = ['spinBtn', 'betUpBtn', 'betDownBtn', 'turboBtn'];
                _hoverBtns.forEach(function(id) {
                    var el = document.getElementById(id);
                    if (!el) return;
                    el.addEventListener('mouseenter', function() {
                        if (typeof SoundManager !== 'undefined' && typeof SoundManager.playHoverSound === 'function') {
                            SoundManager.playHoverSound();
                        }
                    });
                });
            })();

            showPageTransition(() => {
                closeStatsModal();
                document.getElementById('slotGameName').textContent = currentGame.name;
                document.getElementById('slotProvider').textContent = currentGame.provider || '';
                document.getElementById('slotMaxPayout').textContent = (currentGame.payouts && currentGame.payouts.triple) || '—';

            const tagEl = document.getElementById('slotGameTag');
            if (currentGame.tag) {
                tagEl.textContent = currentGame.tag;
                tagEl.className = `game-tag ${currentGame.tagClass}`;
                tagEl.style.display = 'inline-block';
            } else {
                tagEl.style.display = 'none';
            }

            currentBet = currentGame.minBet;
            // Restore last used bet for this game
            (function() {
                try {
                    var _saved = localStorage.getItem('lastBet_' + game.id);
                    if (_saved) {
                        var _parsed = parseFloat(_saved);
                        var _min = game.minBet || 0.20;
                        var _max = game.maxBet || 500;
                        if (!isNaN(_parsed) && _parsed >= _min && _parsed <= _max) {
                            currentBet = _parsed;
                        }
                    }
                } catch(e) {}
            })();
            refreshBetControls();

            // Apply game-specific theming
            const reelsContainer = document.querySelector('.reels-container');
            if (reelsContainer && currentGame.reelBg) {
                reelsContainer.style.background = currentGame.reelBg;
            }
            // Build dynamic reel grid
            buildReelGrid(currentGame);

            // cascade chain counter overlay
            (function() {
              var existingChain = document.getElementById('cascadeChainDisplay');
              if (existingChain) existingChain.remove();
              var chainEl = document.createElement('div');
              chainEl.id = 'cascadeChainDisplay';
              chainEl.className = 'cascade-chain-display';
              chainEl.innerHTML = '<span class="cascade-chain-icon">🔗</span><span class="cascade-chain-label">Chain</span><span class="cascade-chain-count">×1</span>';
              var reelArea = document.querySelector('.slot-reels') || document.querySelector('.reel-grid') || document.querySelector('.reel-container');
              if (reelArea && reelArea.parentNode) {
                reelArea.parentNode.style.position = 'relative';
                reelArea.parentNode.appendChild(chainEl);
              }
            })();

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
                // Show quickfire strip (Sprint 33)
                (function() { var _qs = document.getElementById('slotQuickfireStrip'); if (_qs) _qs.style.display = 'flex'; })();
                // Brief open shimmer
                (function() {
                    var _modal = document.getElementById('slotModal') || document.querySelector('.slot-modal');
                    if (!_modal) return;
                    var _shim = document.createElement('div');
                    _shim.className = 'slot-shimmer-overlay';
                    _modal.appendChild(_shim);
                    setTimeout(function() { if (_shim.parentNode) _shim.remove(); }, 650);
                })();
                // Show intro splash for this game
                _showSlotSplash(currentGame);
                // Inject spin history panel (idempotent — removed and re-injected on each game open)
                var _oldHistPanel = document.getElementById('spinHistoryPanel');
                if (_oldHistPanel) _oldHistPanel.parentNode.removeChild(_oldHistPanel);
                _ensureSpinHistoryPanel();
                // Inject session stats mini-bar (removed and re-injected so counts reset per game)
                var _oldSessStats = document.getElementById('slotSessionStats');
                if (_oldSessStats) _oldSessStats.parentNode.removeChild(_oldSessStats);
                _ensureSlotSessionStats();
                _updateSlotSessionStats();
                // Inject session-stats-bar (new compact bar with time/spins/P&L)
                (function _injectSessionStatsBar() {
                    var _oldBar = document.getElementById('sessionStatsBar');
                    if (_oldBar) _oldBar.parentNode.removeChild(_oldBar);
                    var _bar = document.createElement('div');
                    _bar.id = 'sessionStatsBar';
                    _bar.className = 'session-stats-bar';
                    _bar.innerHTML = [
                        '<div class="session-stat-item">',
                            '<span class="session-stat-icon">⏱</span>',
                            '<span class="session-stat-value" id="statTime">00:00</span>',
                            '<span class="session-stat-label">time</span>',
                        '</div>',
                        '<div class="session-stat-item">',
                            '<span class="session-stat-icon">🎰</span>',
                            '<span class="session-stat-value" id="statSpins">0</span>',
                            '<span class="session-stat-label">spins</span>',
                        '</div>',
                        '<div class="session-stat-item">',
                            '<span class="session-stat-icon">📈</span>',
                            '<span class="session-stat-value" id="statPnl">$0.00</span>',
                            '<span class="session-stat-label">P&amp;L</span>',
                        '</div>'
                    ].join('');
                    // Insert before the existing slot-session-stats bar, or before slot-bottom-bar
                    var _existingSss = document.getElementById('slotSessionStats');
                    var _bottomBar   = document.querySelector('.slot-bottom-bar');
                    if (_existingSss && _existingSss.parentNode) {
                        _existingSss.parentNode.insertBefore(_bar, _existingSss);
                    } else if (_bottomBar && _bottomBar.parentNode) {
                        _bottomBar.parentNode.insertBefore(_bar, _bottomBar);
                    }
                    _initSessionStats(typeof balance !== 'undefined' ? balance : 0);
                })();
                window._slotSessionStart = Date.now();
                if (window._slotTimerInterval) clearInterval(window._slotTimerInterval);
                window._slotTimerInterval = setInterval(function() {
                    var tEl = document.getElementById('sssTime');
                    if (!tEl) { clearInterval(window._slotTimerInterval); return; }
                    var elapsed = Math.floor((Date.now() - (window._slotSessionStart || Date.now())) / 1000);
                    tEl.textContent = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0');
                }, 1000);
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
                // Sprint 38 — session timer
                _startSessionTimer();
                // Sprint 41 — quick switch strip
                _refreshQuickSwitch();
                // Sprint 44+46 — sparkline + streak reset on open
                if (typeof _initSparkline === 'function') _initSparkline();
                if (typeof _resetStreak === 'function') _resetStreak();

                // ── Intro Splash Overlay ──
                // Remove any leftover overlay from a previous game open
                var oldIntro = document.getElementById('slotIntroOverlay');
                if (oldIntro) oldIntro.parentNode.removeChild(oldIntro);

                var introGame = currentGame;
                var introAccent = introGame.accentColor || '#fbbf24';
                var introBg = introGame.bgGradient || 'linear-gradient(135deg,#0a0a18 0%,#1a0a2e 100%)';
                var introProvider = introGame.provider || '';

                var overlay = document.createElement('div');
                overlay.id = 'slotIntroOverlay';
                overlay.style.cssText = [
                    'position:absolute',
                    'inset:0',
                    'z-index:20',
                    'display:flex',
                    'flex-direction:column',
                    'align-items:center',
                    'justify-content:center',
                    'background:' + introBg,
                    'opacity:1',
                    'cursor:pointer',
                    'animation:introFadeOut 2s ease-in-out 0s 1 forwards'
                ].join(';');

                overlay.innerHTML = [
                    '<div class="slot-intro-title" style="',
                        'font-size:clamp(22px,5vw,42px);',
                        'font-weight:900;',
                        'letter-spacing:0.04em;',
                        'text-align:center;',
                        'color:#fff;',
                        'text-shadow:0 0 24px ' + introAccent + ',0 0 48px ' + introAccent + '88,0 2px 8px rgba(0,0,0,0.8);',
                        'padding:0 24px;',
                        'line-height:1.15;',
                        'margin-bottom:10px',
                    '">' + introGame.name + '</div>',
                    '<div class="slot-intro-provider" style="',
                        'font-size:clamp(12px,2.5vw,16px);',
                        'font-weight:600;',
                        'letter-spacing:0.18em;',
                        'text-transform:uppercase;',
                        'color:' + introAccent + ';',
                        'opacity:0.85;',
                        'margin-bottom:28px',
                    '">' + introProvider + '</div>',
                    '<div class="slot-intro-glow" style="',
                        'width:80px;height:4px;',
                        'border-radius:2px;',
                        'background:linear-gradient(90deg,' + introAccent + '00,' + introAccent + ',' + introAccent + '00);',
                        'box-shadow:0 0 18px ' + introAccent + ';',
                        'margin-bottom:auto',
                    '"></div>',
                    '<div class="slot-intro-hint" style="',
                        'position:absolute;bottom:28px;',
                        'font-size:11px;',
                        'letter-spacing:0.22em;',
                        'text-transform:uppercase;',
                        'color:rgba(255,255,255,0.45)',
                    '">TAP TO SKIP</div>'
                ].join('');

                // Dismiss on click
                overlay.addEventListener('click', function() {
                    overlay.style.animation = 'none';
                    overlay.style.transition = 'opacity 0.25s ease';
                    overlay.style.opacity = '0';
                    setTimeout(function() {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 260);
                }, { once: true });

                // Auto-remove after animation completes (2s)
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 2100);

                var slotModalContent = document.querySelector('.slot-modal-fullscreen');
                if (slotModalContent) slotModalContent.appendChild(overlay);

                // Autoplay Button
                (function() {
                    var _existingAP = document.getElementById("autoplayBtn");
                    if (_existingAP && _existingAP.parentNode) _existingAP.parentNode.removeChild(_existingAP);
                    var _spinBtnAP = document.getElementById("spinBtn");
                    if (!_spinBtnAP || !_spinBtnAP.parentNode) return;
                    window._autoplayActive = false;
                    window._autoplayRemaining = 0;
                    window._autoplayStopping = false;
                    var _apWrapper = document.createElement("div");
                    _apWrapper.style.cssText = "position:relative;display:inline-block;";
                    var _apBtnEl = document.createElement("button");
                    _apBtnEl.id = "autoplayBtn";
                    _apBtnEl.className = "autoplay-btn";
                    _apBtnEl.innerHTML = "↻ Auto";
                    _apBtnEl.title = "Autoplay";
                    var _apPicker = document.createElement("div");
                    _apPicker.id = "autoplayPicker";
                    _apPicker.className = "autoplay-picker";
                    [10, 25, 50, 100].forEach(function(n) {
                        var _apPb = document.createElement("button");
                        _apPb.className = "autoplay-picker-btn";
                        _apPb.textContent = n + " spins";
                        _apPb.addEventListener("click", function(e) {
                            e.stopPropagation();
                            _apPicker.classList.remove("open");
                            _startAutoplay(n);
                        });
                        _apPicker.appendChild(_apPb);
                    });
                    _apWrapper.appendChild(_apBtnEl);
                    _apWrapper.appendChild(_apPicker);
                    _spinBtnAP.parentNode.insertBefore(_apWrapper, _spinBtnAP.nextSibling);
                    _apBtnEl.addEventListener("click", function(e) {
                        e.stopPropagation();
                        if (window._autoplayActive) {
                            _stopAutoplay();
                        } else {
                            _apPicker.classList.toggle("open");
                        }
                    });
                    document.addEventListener("click", function(e) {
                        if (!_apWrapper.contains(e.target)) _apPicker.classList.remove("open");
                    });
                });
                // — Turbo spin button —
                (function _injectTurboBtn() {
                    if (document.getElementById('turboSpinBtn')) return;
                    window._turboSpinEnabled = false;
                    try { if (localStorage.getItem('casinoTurboSpin') === '1') window._turboSpinEnabled = true; } catch(e) {}
                    var _tBtn = document.createElement('button');
                    _tBtn.id = 'turboSpinBtn';
                    _tBtn.className = 'turbo-spin-btn';
                    _tBtn.title = window._turboSpinEnabled ? 'Turbo: ON (click to disable)' : 'Turbo spin (fast reels)';
                    _tBtn.innerHTML = '<span class="turbo-icon">⚡</span>TURBO';
                    if (window._turboSpinEnabled) _tBtn.classList.add('turbo-on');
                    _tBtn.addEventListener('click', function() {
                        window._turboSpinEnabled = !window._turboSpinEnabled;
                        _updateTurboBtn();
                        var _rc = document.querySelector('.reels-container') || document.querySelector('.reels');
                        if (_rc) _rc.classList.toggle('turbo-mode', window._turboSpinEnabled);
                        try { localStorage.setItem('casinoTurboSpin', window._turboSpinEnabled ? '1' : '0'); } catch(e) {}
                    });
                    var _apBtn = document.getElementById('autoplayBtn');
                    if (_apBtn && _apBtn.parentNode && _apBtn.parentNode.parentNode) {
                        var _apWrapper = _apBtn.parentNode;
                        _apWrapper.parentNode.insertBefore(_tBtn, _apWrapper.nextSibling);
                    } else {
                        var _sb2 = document.getElementById('spinBtn');
                        if (_sb2 && _sb2.parentNode) _sb2.parentNode.appendChild(_tBtn);
                    }
                    if (window._turboSpinEnabled) {
                        var _rc2 = document.querySelector('.reels-container') || document.querySelector('.reels');
                        if (_rc2) _rc2.classList.add('turbo-mode');
                    }
                })();
                // — Paytable / Info button —
                (function _injectPaytableBtn() {
                    if (document.getElementById("paytableBtn")) return;
                    var _ptBtn = document.createElement("button");
                    _ptBtn.id = "paytableBtn";
                    _ptBtn.className = "paytable-btn";
                    _ptBtn.title = "Game info & paytable";
                    _ptBtn.textContent = "ⓘ";
                    _ptBtn.addEventListener("click", _openPaytable);
                    var _turboB = document.getElementById("turboSpinBtn");
                    if (_turboB && _turboB.parentNode) {
                        _turboB.parentNode.insertBefore(_ptBtn, _turboB.nextSibling);
                    } else {
                        var _spinB = document.getElementById("spinBtn") || document.querySelector(".spin-btn");
                        if (_spinB && _spinB.parentNode) _spinB.parentNode.appendChild(_ptBtn);
                    }
                })();
                // ── Touch gestures: tap or swipe-down on reels triggers spin ──
                (function attachReelTouchGesture() {
                    const reelEl = document.querySelector('.reels-container') || document.querySelector('.reels');
                    if (!reelEl) return;
                    let touchStartY = 0;
                    let touchStartX = 0;
                    reelEl.addEventListener('touchstart', function(e) {
                        touchStartY = e.touches[0].clientY;
                        touchStartX = e.touches[0].clientX;
                    }, { passive: true });
                    reelEl.addEventListener('touchend', function(e) {
                        const dy = e.changedTouches[0].clientY - touchStartY;
                        const dx = e.changedTouches[0].clientX - touchStartX;
                        const dist = Math.sqrt(dy * dy + dx * dx);
                        // Tap (minimal movement) or swipe-down (dy >= 30, more vertical than horizontal)
                        const isTap = dist < 15;
                        const isSwipeDown = dy >= 30 && Math.abs(dy) > Math.abs(dx);
                        if (isTap || isSwipeDown) {
                            const btn = document.getElementById('spinBtn');
                            if (btn && !btn.disabled) btn.click();
                        }
                    }, { passive: true });
                })();
                // Inject tournament active badge
                _injectTournamentBadge();
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
            // Reset new autoplay state
            if (window._autoplayActive) { window._autoplayActive = false; window._autoplayRemaining = 0; window._autoplayStopping = false; _updateAutoplayBtn(); }
            var _rcClose = document.querySelector('.reels-container') || document.querySelector('.reels');
            if (_rcClose) _rcClose.classList.remove('turbo-mode');

            // Stop jackpot banner ticker and hide banner
            if (window._slotTimerInterval) { clearInterval(window._slotTimerInterval); window._slotTimerInterval = null; }
            clearInterval(window._sessionStatsInterval); window._sessionStatsInterval = null;
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
            // Capture last played game before clearing, so lobby can show resume banner
            if (typeof captureLastPlayedGame === 'function') captureLastPlayedGame();
            var _closingGame = currentGame; // Sprint 36: capture for rating prompt
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
            _hideCascadeChain();
            _updateFreeSpinsFrame(); // cleanup: removes golden frame and banner
            // Cleanup gamble state
            if (typeof hideGambleButton === 'function') hideGambleButton();
            if (typeof gambleState !== 'undefined') { gambleState.active = false; gambleState.amount = 0; gambleState.round = 0; }
            var _gambleOverlayClose = document.getElementById('gambleOverlay');
            if (_gambleOverlayClose) _gambleOverlayClose.style.display = 'none';
            // Close paytable overlay if open
            // Remove tournament slot badge
            _removeTournamentBadge();
            _closePaytable();
            // Sprint 38 — stop session timer
            _stopSessionTimer();
            // Sprint 40+42 — reset bankroll/goal on close
            dismissBankroll(); dismissWinGoal();
            // Sprint 46 — reset streak badge on close
            if (typeof _resetStreak === 'function') _resetStreak();
            // Sprint 41 — hide quick switch
            var _qss = document.getElementById('quickSwitchStrip'); if (_qss) _qss.style.display = 'none';
            // Sprint 37 — clean up demo mode if active
            if (typeof _demoMode !== 'undefined' && _demoMode) { exitDemoMode(false); return; }
            // Sprint 36 — rating prompt (after a short delay so modal closes first)
            (function() {
                if (_closingGame && typeof showRatingPrompt === 'function') {
                    var _cgId = _closingGame.id, _cgName = _closingGame.name;
                    setTimeout(function() { showRatingPrompt(_cgId, _cgName); }, 600);
                }
            })();
        }


        function updateBetDisplay() {
            // Show as integer if whole number, otherwise 2 decimal places
            const display = Number.isInteger(currentBet)
                ? String(currentBet)
                : currentBet.toFixed(2);
            document.getElementById('betAmount').textContent = display;
            // Sync bet chip active state
            document.querySelectorAll('.bet-chip').forEach(function(chip) {
                var v = parseFloat(chip.dataset.betVal);
                chip.classList.toggle('bet-chip-active', v === (typeof currentBet !== 'undefined' ? currentBet : -1));
            });
            // Sync bet preset active state (Sprint 33)
            document.querySelectorAll('.bet-preset-btn').forEach(function(btn) {
                var v = parseFloat(btn.dataset.amount);
                btn.classList.toggle('bet-preset-active', Math.abs(v - currentBet) < 0.001);
            });
        }

        // Sprint 33 — Bet Preset: set currentBet to a fixed dollar amount (capped to game bounds)
        function setBetPresetAmount(amount) {
            if (!currentGame || spinning) return;
            var bounds = (typeof getBetBounds === 'function') ? getBetBounds() : null;
            var maxB = bounds ? bounds.maxBet : 500;
            var minB = bounds ? bounds.minBet : 0.20;
            // Snap to nearest BET_STEPS value that is <= the requested amount (and within game bounds)
            var steps = typeof BET_STEPS !== 'undefined' ? BET_STEPS : [1, 5, 25, 100];
            var candidates = steps.filter(function(s) { return s >= minB - 0.001 && s <= maxB + 0.001; });
            if (candidates.length === 0) return;
            // Find closest step <= requested amount
            var target = Math.min(amount, maxB);
            var best = candidates[0];
            candidates.forEach(function(s) { if (s <= target + 0.001) best = s; });
            currentBet = best;
            updateBetDisplay();
        }

        // Sprint 33 — Streak Indicator: render last 10 spins as dots
        function updateStreakIndicator() {
            var strip = document.getElementById('slotQuickfireStrip');
            var dotsEl = document.getElementById('streakDots');
            var labelEl = document.getElementById('streakLabel');
            if (!strip || !dotsEl || !labelEl) return;
            strip.style.display = 'flex';
            var recent = spinHistory.slice(0, 10);
            if (recent.length === 0) { dotsEl.innerHTML = ''; labelEl.textContent = ''; return; }
            dotsEl.innerHTML = recent.map(function(h) {
                var isWin = h.win > 0;
                return '<span class="streak-dot ' + (isWin ? 'streak-win' : 'streak-loss') + '"></span>';
            }).join('');
            // Count current streak (from most recent)
            var first = recent[0].win > 0;
            var streak = 0;
            for (var i = 0; i < recent.length; i++) {
                if ((recent[i].win > 0) === first) streak++;
                else break;
            }
            labelEl.textContent = first
                ? '🔥 ' + streak + ' Win Streak'
                : (streak >= 3 ? '❄️ ' + streak + ' Cold Streak' : '');
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
            var _bfRefBtn = document.getElementById('buyFeatureBtn'); if (_bfRefBtn && _bfRefBtn._refreshCost) _bfRefBtn._refreshCost();
            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) spinBtn.disabled = spinning || currentBet > balance;
        }

        function _updateSessionHud() {
            if (!document.getElementById('slotSessionHud')) return;
            var spinsEl = document.getElementById('hudSpins');
            var plEl    = document.getElementById('hudPL');
            if (!spinsEl || !plEl) return;
            spinsEl.textContent = _sessSpins + ' spin' + (_sessSpins !== 1 ? 's' : '');
            var pl = _sessTotalWon - _sessTotalBet;
            var sign = pl >= 0 ? '+' : '';
            plEl.textContent = sign + '$' + Math.abs(pl).toFixed(2);
            plEl.className = pl > 0 ? 'hud-profit' : pl < 0 ? 'hud-loss' : 'hud-neutral';
            var wrEl = document.getElementById('hudWR');
            if (wrEl) {
                var wr = _sessSpins > 0 ? Math.round((_sessWins / _sessSpins) * 100) : 0;
                wrEl.textContent = wr + '% hit';
            }
        }

        function _toggleHotkeySheet() {
            var sheet = document.getElementById('slotHotkeySheet');
            if (!sheet) {
                sheet = document.createElement('div');
                sheet.id = 'slotHotkeySheet';
                sheet.className = 'hotkey-sheet';
                sheet.innerHTML =
                    '<div class="hs-title">Keyboard Shortcuts</div>' +
                    '<table>' +
                    '<tr><td>Space</td><td>Spin</td></tr>' +
                    '<tr><td>T</td><td>Turbo mode</td></tr>' +
                    '<tr><td>A</td><td>Autoplay \xd710</td></tr>' +
                    '<tr><td>I</td><td>Paytable info</td></tr>' +
                    '<tr><td>Esc</td><td>Back to lobby</td></tr>' +
                    '<tr><td>?</td><td>This cheatsheet</td></tr>' +
                    '</table>';
                document.body.appendChild(sheet);
            }
            sheet.classList.toggle('visible');
            // Auto-hide after 4s if shown
            if (sheet.classList.contains('visible')) {
                clearTimeout(sheet._ht);
                sheet._ht = setTimeout(function() { sheet.classList.remove('visible'); }, 4000);
            }
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
            if (typeof _demoMode !== 'undefined' && _demoMode) return false; // Sprint 37 demo
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
            // Persist last bet for this game
            if (currentGame && currentGame.id && typeof currentBet !== 'undefined') {
                try { localStorage.setItem('lastBet_' + currentGame.id, String(currentBet)); } catch(e) {}
            }
            spinning = true;
            resetIdleTimer(); // reset idle pulse at spin start
            _clearWinCellGlow(); // clear win-cell-glow before new spin
            if (window._turboSpinEnabled) {
                var _rcTurbo = document.querySelector('.reels-container') || document.querySelector('.reels');
                if (_rcTurbo) _rcTurbo.classList.add('turbo-mode');
            }

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
                    if (!(typeof _demoMode !== 'undefined' && _demoMode)) saveBalance(); // skip save in demo
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
                       // ── Enhanced scatter anticipation ──
                    // Remove tension from this column as it stops
                    const _stopEl = document.getElementById('reelCol' + colIdx);
                    if (_stopEl) _stopEl.classList.remove('reel-scatter-tension', 'reel-scatter-primed');

                    if (!turboMode && spinGame && spinGame.scatterSymbol) {
                        const _scattersSoFar = _countScattersOnCols(colIdx, finalGrid, spinGame);

                        if (_scattersSoFar >= 2 && colIdx < cols - 1) {
                            // 2+ scatters confirmed — apply tension to all remaining spinning reels
                            for (let _rem = colIdx + 1; _rem < cols; _rem++) {
                                const _remEl = document.getElementById('reelCol' + _rem);
                                if (_remEl) {
                                    _remEl.classList.remove('reel-scatter-tension', 'reel-scatter-primed');
                                    _remEl.classList.add(_scattersSoFar >= 3 ? 'reel-scatter-primed' : 'reel-scatter-tension');
                                }
                            }
                            if (typeof playSound === 'function') playSound('scatter');
                        }

                        // Legacy last-reel anticipation (symbol match) — keep as fallback
                        if (colIdx === cols - 1 && checkAnticipation(colIdx, finalGrid)) {
                            const _lastEl = document.getElementById('reelCol' + colIdx);
                            if (_lastEl) {
                                _lastEl.classList.add('reel-anticipation');
                                setTimeout(function() { _lastEl.classList.remove('reel-anticipation'); }, 700);
                            }
                        }
                    }
                    // Wire reel-stop sound
                    if (typeof SoundManager !== 'undefined' && typeof SoundManager.playReelStop === 'function') {
                        var _rsProv = typeof getGameChromeStyle === 'function' ? getGameChromeStyle(currentGame) : 'ironreel';
                        SoundManager.playReelStop(colIdx, _rsProv);
                    }

                    // Cell landing pop animation
                    (function() {
                        var _col = document.getElementById('reelCol' + colIdx);
                        if (!_col) return;
                        var _cells = _col.querySelectorAll('.reel-cell');
                        _cells.forEach(function(cell) {
                            cell.classList.remove('cell-land-pop');
                            // Force reflow to restart animation
                            void cell.offsetWidth;
                            cell.classList.add('cell-land-pop');
                            setTimeout(function() { cell.classList.remove('cell-land-pop'); }, 350);
                        });
                    })();

                    // Scatter waiting glow
                    (function() {
                        var _totalCols = typeof cols !== 'undefined' ? cols : (finalGrid ? finalGrid.length : 5);
                        // Remove glow from this column's cells first
                        var _thisCol = document.getElementById('reelCol' + colIdx);
                        if (_thisCol) {
                            _thisCol.querySelectorAll('.scatter-waiting-glow').forEach(function(el) {
                                el.classList.remove('scatter-waiting-glow');
                            });
                        }
                        if (colIdx >= _totalCols - 1) {
                            // Last column stopped — remove all remaining glows
                            document.querySelectorAll('.scatter-waiting-glow').forEach(function(el) {
                                el.classList.remove('scatter-waiting-glow');
                            });
                            return;
                        }
                        // Count scatters landed so far
                        var _scCount = typeof _countScattersOnCols === 'function'
                            ? _countScattersOnCols(colIdx, finalGrid, spinGame)
                            : 0;
                        if (_scCount < 1) return;
                        // Apply glow to scatter cells in stopped columns 0..colIdx
                        var _scSym = spinGame && spinGame.scatterSymbol;
                        if (!_scSym) return;
                        for (var _sc = 0; _sc <= colIdx; _sc++) {
                            var _scCol = document.getElementById('reelCol' + _sc);
                            if (!_scCol) continue;
                            _scCol.querySelectorAll('.reel-cell').forEach(function(cell) {
                                var img = cell.querySelector('img');
                                if (img && img.src && img.src.includes(_scSym)) {
                                    cell.classList.add('scatter-waiting-glow');
                                }
                            });
                        }
                    })();

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
            // Per-game detailed stats
            if (!stats.gameStats) stats.gameStats = {};
            if (!stats.gameStats[spinGame.id]) {
                stats.gameStats[spinGame.id] = { spins: 0, won: 0, bet: 0, name: spinGame.name };
            }
            stats.gameStats[spinGame.id].spins++;
            if (!serverResult || !serverResult.usedFreeSpin) {
                stats.gameStats[spinGame.id].bet += currentBet;
            }
            // Track session spins
            if (typeof sessionSpins !== 'undefined') sessionSpins++;
            saveStats();
            updateStatsSummary();
        }


        // ── Balance Counter Roll Animation ──────────────────────────────────
        // Animates the balance display from fromAmount to toAmount over durationMs.
        // Uses ease-out cubic so the counter decelerates near the end.
        function animateBalanceRoll(fromAmount, toAmount, durationMs) {
            if (durationMs <= 0 || Math.abs(toAmount - fromAmount) < 0.5) {
                updateBalance();
                return;
            }
            const startTime = performance.now();
            const delta = toAmount - fromAmount;
            const balEl = document.getElementById('balance');
            const slotBalEl = document.getElementById('slotBalance');

            function tick(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / durationMs, 1);
                // Ease-out with subtle sine-wave overshoot in last 8% for a "landing" feel
                var eased;
                if (t < 0.92) {
                    const u = t / 0.92;
                    eased = 1 - Math.pow(1 - u, 3);
                    eased = eased * 0.92;
                } else {
                    const u = (t - 0.92) / 0.08;
                    eased = 0.92 + 0.08 * (1 + 0.02 * Math.sin(u * Math.PI));
                    if (t >= 1) eased = 1.0;
                }
                const current = fromAmount + delta * eased;
                const formatted = '$' + Number(current).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                if (balEl) balEl.textContent = formatMoney(current);
                if (slotBalEl) slotBalEl.textContent = formatMoney(current);
                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    // Snap to exact final value and run a full updateBalance() to
                    // ensure refreshBetControls() is called.
                    updateBalance();
                }
            }
            requestAnimationFrame(tick);
        }

        // ── Near-Miss Screen Nudge ──────────────────────────────────────────
        // Adds a subtle horizontal camera nudge to the reel area on near-miss.
        function triggerNearMissNudge() {
            if (!_animSettingEnabled('animations')) return;
            const reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;
            reelArea.classList.add('reel-near-miss-nudge');
            setTimeout(function() {
                reelArea.classList.remove('reel-near-miss-nudge');
            }, 400);
            // Near-miss sound
            if (typeof SoundManager !== 'undefined' && typeof SoundManager.playNearMiss === 'function') {
                var _nmProv = typeof getGameChromeStyle === 'function' ? getGameChromeStyle(currentGame) : 'ironreel';
                SoundManager.playNearMiss(_nmProv);
            }
        }

        // ── Spin History Rendering ────────────────────────────────────────────
        function renderSpinHistory() {
            const panel = document.getElementById('spinHistoryPanel');
            if (!panel) return;
            const list = document.getElementById('spinHistoryList');
            if (!list) return;
            if (spinHistory.length === 0) {
                list.innerHTML = '<div style="color:#64748b;font-size:11px;padding:4px 0;">No spins yet this session</div>';
                return;
            }
            list.innerHTML = spinHistory.map(function(entry) {
                const isWin = entry.win > 0;
                const isNM = entry.isNearMiss;
                const dot = isWin ? '#22c55e' : isNM ? '#fbbf24' : '#ef4444';
                const label = isWin ? ('+$' + formatMoney(entry.win)) : isNM ? 'Near!' : ('-$' + formatMoney(entry.bet));
                const color = isWin ? '#22c55e' : isNM ? '#fbbf24' : '#94a3b8';
                const ago = _histTimeAgo(entry.timestamp);
                return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);">' +
                    '<span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';flex-shrink:0;display:inline-block;"></span>' +
                    '<span style="font-size:11px;font-weight:700;color:' + color + ';min-width:60px;">' + label + '</span>' +
                    '<span style="font-size:10px;color:#475569;margin-left:auto;">' + ago + '</span>' +
                    '</div>';
            }).join('');
        }

        function _histTimeAgo(ts) {
            const s = Math.floor((Date.now() - ts) / 1000);
            if (s < 5) return 'just now';
            if (s < 60) return s + 's ago';
            return Math.floor(s / 60) + 'm ago';
        }

        function _ensureSpinHistoryPanel() {
            if (document.getElementById('spinHistoryPanel')) return;
            const slotModal = document.getElementById('slotModal') || document.querySelector('.slot-modal-fullscreen');
            if (!slotModal) return;

            const panel = document.createElement('div');
            panel.id = 'spinHistoryPanel';
            panel.innerHTML =
                '<div id="spinHistoryToggle" onclick="(function(t){' +
                    'var l=t.parentElement.querySelector(\'#spinHistoryList\');' +
                    'l.style.display=(l.style.display===\'none\'?\'\':\'none\');' +
                    't.querySelector(\'.hist-arrow\').textContent=(l.style.display===\'none\'?\'&#9654;\':\'&#9660;\');' +
                '})(this)">' +
                    '<span>Spin History</span>' +
                    '<span class="hist-arrow">&#9660;</span>' +
                '</div>' +
                '<div id="spinHistoryList"></div>';

            // Insert between reel area and bottom bar
            const bottomBar = slotModal.querySelector('.slot-bottom-bar');
            if (bottomBar && bottomBar.parentNode) {
                bottomBar.parentNode.insertBefore(panel, bottomBar);
            } else {
                slotModal.appendChild(panel);
            }
            renderSpinHistory();
            _updateSlotSessionStats();
        }

        // ── Session Stats Mini-Bar ────────────────────────────────────────────
        function _ensureSlotSessionStats() {
            if (document.getElementById('slotSessionStats')) return;

            const bar = document.createElement('div');
            bar.id = 'slotSessionStats';
            bar.className = 'slot-session-stats';
            bar.innerHTML =
                '<div class="sss-item"><span class="sss-label">Spins</span><span class="sss-value" id="sssSpins">0</span></div>' +
                '<div class="sss-divider"></div>' +
                '<div class="sss-item"><span class="sss-label">Win Rate</span><span class="sss-value" id="sssWinRate">0%</span></div>' +
                '<div class="sss-divider"></div>' +
                '<div class="sss-item"><span class="sss-label">Net</span><span class="sss-value" id="sssNet">$0</span></div>' +
                '<div class="sss-divider"></div>' +
                '<div class="sss-item"><span class="sss-label">Best Win</span><span class="sss-value" id="sssBest">$0</span></div>' +
                '<div class="sss-divider"></div>' +
                '<div class="sss-item"><span class="sss-label">Time</span><span class="sss-value" id="sssTime">0:00</span></div>';

            // Insert just above spin history panel, or above slot-bottom-bar as fallback
            const histPanel = document.getElementById('spinHistoryPanel');
            const bottomBar = document.querySelector('.slot-bottom-bar');
            if (histPanel && histPanel.parentNode) {
                histPanel.parentNode.insertBefore(bar, histPanel);
            } else if (bottomBar && bottomBar.parentNode) {
                bottomBar.parentNode.insertBefore(bar, bottomBar);
            }
        }

        function _updateSlotSessionStats() {
            const spinsEl = document.getElementById('sssSpins');
            const wrEl    = document.getElementById('sssWinRate');
            const netEl   = document.getElementById('sssNet');
            const bestEl  = document.getElementById('sssBest');
            if (!spinsEl) return;

            // Derive stats from spinHistory (session-scoped array, reset on each openSlot)
            let spins = 0, wins = 0, netVal = 0, bestWin = 0;
            if (typeof spinHistory !== 'undefined' && Array.isArray(spinHistory) && spinHistory.length > 0) {
                spins   = spinHistory.length;
                wins    = spinHistory.filter(function(s) { return s.win > 0; }).length;
                netVal  = spinHistory.reduce(function(acc, s) { return acc + (s.win - s.bet); }, 0);
                bestWin = Math.max.apply(null, spinHistory.map(function(s) { return s.win; }));
            } else {
                spins  = typeof sessionSpins   !== 'undefined' ? sessionSpins   : 0;
                wins   = typeof sessionWins    !== 'undefined' ? sessionWins    : 0;
                netVal = (typeof sessionWon    !== 'undefined' ? sessionWon     : 0)
                       - (typeof sessionWagered !== 'undefined' ? sessionWagered : 0);
            }

            const wr = spins > 0 ? Math.round((wins / spins) * 100) : 0;
            spinsEl.textContent = spins.toLocaleString();
            wrEl.textContent    = wr + '%';
            netEl.textContent   = (netVal >= 0 ? '+' : '') + '$' + Math.abs(netVal).toFixed(2);
            netEl.style.color   = netVal > 0 ? '#66bb6a' : netVal < 0 ? '#ef5350' : 'rgba(255,255,255,0.6)';
            if (bestEl) {
                bestEl.textContent  = '$' + bestWin.toFixed(2);
                bestEl.style.color  = bestWin > 0 ? '#ffd54f' : 'rgba(255,255,255,0.5)';
            }
            var timeEl = document.getElementById('sssTime');
            if (timeEl && window._slotSessionStart) {
                var elapsed = Math.floor((Date.now() - window._slotSessionStart) / 1000);
                timeEl.textContent = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0');
            }
        }

        // -- Session Stats Bar (session-stats-bar CSS class) ---
        function _initSessionStats(startBalance) {
            window._sessionStartBalance = (typeof startBalance !== 'undefined') ? startBalance : (typeof balance !== 'undefined' ? balance : 0);
            window._sessionStartTime    = Date.now();
            clearInterval(window._sessionStatsInterval);
            window._sessionStatsInterval = setInterval(_updateSessionStats, 1000);
            _updateSessionStats();
        }

        function _updateSessionStats() {
            var bar = document.getElementById('sessionStatsBar');
            if (!bar) { clearInterval(window._sessionStatsInterval); return; }

            // Time
            var elapsed = Math.floor((Date.now() - (window._sessionStartTime || Date.now())) / 1000);
            var mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
            var ss = String(elapsed % 60).padStart(2, '0');
            var timeEl = bar.querySelector('#statTime');
            if (timeEl) timeEl.textContent = mm + ':' + ss;

            // Spins -- reuse existing _sessSpins counter
            var spinEl = bar.querySelector('#statSpins');
            if (spinEl) spinEl.textContent = (typeof _sessSpins !== 'undefined' ? _sessSpins : 0);

            // P&L -- current balance minus opening balance
            var pnlEl = bar.querySelector('#statPnl');
            if (pnlEl && typeof window._sessionStartBalance !== 'undefined' && window._sessionStartBalance !== null) {
                var currentBal = (typeof balance !== 'undefined') ? balance : 0;
                var pnl = currentBal - window._sessionStartBalance;
                var sign = pnl >= 0 ? '+' : '';
                pnlEl.textContent = sign + '$' + Math.abs(pnl).toFixed(2);
                pnlEl.className   = 'session-stat-value ' + (pnl >= 0 ? 'positive' : 'negative');
            }
        }
        // Display win result from server (no client-side win calculation)
        // -- Near-Miss Detection
        function detectAndShowNearMiss(grid, game) {
            if (!grid) return;
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const nearMissCells = [];
            const beatCells = [];   // matching cells that get heartbeat pulse

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
                                } else if (s === sym || isWild(s, game)) {
                                    beatCells.push([c, r]);
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
                            // first 4 cols are the matching ones
                            for (var _bc = 0; _bc < 4 && _bc < cols; _bc++) { beatCells.push([_bc, midRow]); }
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
                // Heartbeat the matching cells (the "so close" symbols)
                beatCells.forEach(function(pair) {
                    var bc = pair[0], br = pair[1];
                    var beatEl = document.getElementById("reel_" + bc + "_" + br);
                    if (beatEl) {
                        beatEl.classList.add("reel-near-miss-beat");
                        setTimeout(function() { beatEl.classList.remove("reel-near-miss-beat"); }, 380);
                    }
                });
                showMessage("So Close! 👀", "near-miss");
                triggerNearMissNudge();
                if (spinHistory.length > 0) { spinHistory[0].isNearMiss = true; renderSpinHistory(); _updateSlotSessionStats(); }
            }
        }


        // Display win result from server (no client-side win calculation)
        function displayServerWinResult(result, game) {
            const grid = result.grid;
            const winAmount = result.winAmount;
            const details = result.winDetails || {};

            // Record to spin history
            const _histEntry = {
                win: winAmount,
                bet: currentBet,
                isNearMiss: false,
                timestamp: Date.now()
            };
            spinHistory.unshift(_histEntry);
            if (spinHistory.length > SPIN_HISTORY_MAX) spinHistory.pop();
            updateStreakIndicator();
            if (typeof onChallengeEvent === 'function') {
                const _challengeMult = currentBet > 0 ? winAmount / currentBet : 0;
                onChallengeEvent('spin', {
                    bet: currentBet,
                    win: winAmount,
                    gameId: currentGame ? currentGame.id : null,
                    winMult: _challengeMult,
                    streak: typeof _winStreak === 'number' ? _winStreak : 0
                });
            }
            if (typeof window.onWeeklyMissionEvent === 'function') {
                const _wkMult = currentBet > 0 ? winAmount / currentBet : 0;
                window.onWeeklyMissionEvent('spin', {
                    bet: currentBet,
                    win: winAmount,
                    wager: currentBet,
                    gameId: currentGame ? currentGame.id : null,
                    winMult: _wkMult,
                });
            }
            if (typeof recordHallOfFameWin === 'function' && winAmount > 0 && currentGame) {
                recordHallOfFameWin(winAmount, currentBet, currentGame.name, currentGame.id, currentGame.bonusType);
            }
            renderSpinHistory();
            _updateSlotSessionStats();

            // Clear highlights
            getAllCells().forEach(function(cell) {
                cell.classList.remove("reel-win-glow", "reel-wild-glow", "reel-scatter-glow", "reel-wild-expand", "reel-wild-idle", "reel-scatter-idle");
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
                const oldBalance = balance;
                const serverBalance = Number(result.balance);
                if (Number.isFinite(serverBalance)) {
                    balance = serverBalance;
                }
                animateBalanceRoll(oldBalance, balance, Math.min(2000, winAmount * 20));
                saveBalance();
                showWinAnimation(winAmount); upgradeWinGlow(winAmount);

                // Apply win-cell-glow ring to winning cells based on win tier
                (function() {
                    var _wm2 = currentBet > 0 ? winAmount / currentBet : 0;
                    var _glowTier = "";
                    if (_wm2 >= 100) _glowTier = "win-tier-jackpot";
                    else if (_wm2 >= 50) _glowTier = "win-tier-mega";
                    else if (_wm2 >= 20) _glowTier = "win-tier-epic";
                    _applyWinCellGlow(_glowTier);
                })();
                _sessSpins++;
                _sessWins++;
                _sessTotalBet += currentBet;
                if (typeof _bankrollBudget !== 'undefined' && _bankrollBudget > 0) { _bankrollWagered += currentBet; _updateBankrollBar(); }
                _sessTotalWon += winAmount;
                _updateSessionHud();
                _updateSessionStats();
                // Dynamic layer escalation
                if (typeof SoundManager !== 'undefined' && typeof SoundManager.playDynamicLayer === 'function') {
                    var _streak = window._winStreak || 0;
                    var _layer = _streak >= 4 ? 2 : _streak >= 2 ? 1 : 1;
                    if (typeof currentBet !== 'undefined' && typeof winAmount !== 'undefined' && winAmount >= currentBet * 10) { _layer = 3; }
                    SoundManager.playDynamicLayer(_layer);
                }
                // Tumble visual cascade for tumble/avalanche games
                if (currentGame && (currentGame.bonusType === 'tumble' || currentGame.bonusType === 'avalanche')) {
                    window._tumbleCascadeDepth = (window._tumbleCascadeDepth || 0) + 1;
                    _showCascadeChain(window._tumbleCascadeDepth);
                    setTimeout(function() { triggerTumbleCascade(currentGame); }, 60);
                }
                setTimeout(showPaylinePaths, 300);
                setTimeout(triggerPaylineFlash, 350);
                updateSlotWinDisplay(winAmount);

                // Win entrance animation on highlighted cells
                const winCells = document.querySelectorAll(".reel-win-glow, .reel-big-win-glow");
                winCells.forEach(function(cell) {
                    // Stagger by column: parse column index from id "reel_C_R"
                    var colIdx = 0;
                    if (cell.dataset && cell.dataset.col !== undefined) {
                        colIdx = parseInt(cell.dataset.col, 10) || 0;
                    } else if (cell.id) {
                        const parts = cell.id.split('_');
                        if (parts.length >= 2) colIdx = parseInt(parts[1], 10) || 0;
                    }
                    cell.style.animationDelay = (colIdx * 60) + 'ms';
                    cell.classList.add("reel-win-entrance");
                });
                setTimeout(function() {
                    document.querySelectorAll(".reel-win-entrance").forEach(function(cell) {
                        cell.classList.remove("reel-win-entrance");
                        cell.style.animationDelay = '';
                    });
                }, 600);

                const message = details.message || ("WIN! $" + winAmount.toLocaleString() + "!");
                {
                    const _wm = currentBet > 0 ? winAmount / currentBet : 0;
                    playProviderSound(
                        _wm >= WIN_TIER_EPIC_THRESHOLD ? 'jackpot' :
                        _wm >= WIN_TIER_MEGA_THRESHOLD ? 'megawin' :
                        _wm >= WIN_TIER_BIG_THRESHOLD  ? 'bigwin'  : 'win',
                        currentGame
                    );
                }
                showMessage(message, "win");

                stats.totalWon += winAmount;
                if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                // Per-game won tracking
                if (!stats.gameStats) stats.gameStats = {};
                if (game && game.id && stats.gameStats[game.id]) {
                    stats.gameStats[game.id].won += winAmount;
                }
                // Track session win
                if (typeof sessionWon !== 'undefined') sessionWon += winAmount;
                saveStats();
                updateStatsSummary();

                if (typeof awardXP === "function") { var _godMult = (typeof gameOfDayId !== 'undefined' && gameOfDayId && currentGame && currentGame.id === gameOfDayId && typeof GAME_OF_DAY_XP_BONUS !== 'undefined') ? GAME_OF_DAY_XP_BONUS : 1; awardXP(Math.round((winAmount >= currentBet * WIN_TIER_BIG_THRESHOLD ? XP_AWARD_BIG_WIN : XP_AWARD_REGULAR_WIN) * _godMult)); }
                if (typeof recordSpinHistory === 'function') recordSpinHistory({ game: (game && game.name) || '', gameId: (game && game.id) || '', bet: currentBet, win: winAmount, mult: currentBet > 0 ? Math.round(winAmount / currentBet) : 0 });
                if (typeof saveWinReplay === 'function' && !_demoMode && currentBet > 0 && winAmount >= currentBet * 10) { saveWinReplay({ game: (game && game.name) || '', gameId: (game && game.id) || '', bet: currentBet, win: winAmount, mult: Math.round(winAmount / currentBet), ts: Date.now() }); }
                _demoOnSpinEnd();
                if (typeof _updateWinGoal === 'function' && winAmount > 0) _updateWinGoal(winAmount);
                if (typeof _incrementStreak === 'function') _incrementStreak();
                if (typeof _updateSparkline === 'function') _updateSparkline(balance);
                if (typeof recordRecentWin === 'function' && winAmount >= currentBet * 2) recordRecentWin((game && game.name) || '', (game && game.id) || '', winAmount, currentBet);

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }

                // Show gamble button for wins >= 1x bet and < 100x bet (no gamble for jackpot wins)
                if (!freeSpinsActive && !autoSpinActive && winAmount >= currentBet && winAmount < currentBet * 100) {
                    showGambleButton(winAmount);
                } else if (!freeSpinsActive && !autoSpinActive) {
                    hideGambleButton();
                }

                // Big win celebration for wins >= 10x bet
                if (winAmount >= currentBet * 10 && !freeSpinsActive) {
                    setTimeout(function() { showBigWinCelebration(winAmount); }, 800);
                }

                // Balance win flash
                (function() {
                    var _bEl = document.getElementById('headerBalance') || document.getElementById('balanceDisplay') || document.querySelector('.balance-value');
                    if (_bEl) {
                        _bEl.classList.remove('balance-flash-win', 'balance-flash-loss');
                        void _bEl.offsetWidth;
                        _bEl.classList.add('balance-flash-win');
                        setTimeout(function() { _bEl.classList.remove('balance-flash-win'); }, 650);
                    }
                })();

                // Add big player wins to lobby ticker
                if (typeof addPlayerWinToTicker === 'function' && typeof winAmount !== 'undefined' && typeof currentBet !== 'undefined' && winAmount >= currentBet * 10) {
                    var _tickerGame = (currentGame && currentGame.name) ? currentGame.name : 'a slot';
                    addPlayerWinToTicker(winAmount, _tickerGame);
                }

                // Save personal best win for this game
                if (currentGame && currentGame.id && typeof winAmount !== 'undefined' && winAmount > 0) {
                    try {
                        var _pbKey = 'personalBest_' + currentGame.id;
                        var _prevBest = parseFloat(localStorage.getItem(_pbKey) || '0');
                        if (winAmount > _prevBest) localStorage.setItem(_pbKey, String(winAmount));
                    } catch(e) {}
                }

                // Win toast notifications
                if (typeof showWinToast === 'function') {
                    if (typeof window._winStreak !== 'undefined' && window._winStreak === 3)  showWinToast('3\u00d7 Win Streak!', 'streak');
                    if (typeof window._winStreak !== 'undefined' && window._winStreak === 5)  showWinToast('\uD83D\uDD25 5\u00d7 Streak!', 'streak');
                    if (typeof window._winStreak !== 'undefined' && window._winStreak === 10) showWinToast('\uD83D\uDCA5 10\u00d7 Streak!', 'epic');
                    if (typeof winAmount !== 'undefined' && typeof currentBet !== 'undefined') {
                        if (winAmount >= currentBet * 100) showWinToast('\uD83C\uDFB0 JACKPOT!', 'jackpot');
                        else if (winAmount >= currentBet * 50) showWinToast('\uD83D\uDC8E Mega Win!', 'epic');
                        else if (winAmount >= currentBet * 20) showWinToast('\uD83C\uDFC6 Epic Win!', 'big');
                    }
                }
                // Streak fire on spin button
                (function() {
                    var _sb = document.getElementById('spinBtn');
                    if (!_sb) return;
                    if (typeof window._winStreak !== 'undefined' && window._winStreak >= 3) {
                        _sb.classList.add('spin-btn-fire');
                    } else {
                        _sb.classList.remove('spin-btn-fire');
                    }
                })();


                // Jackpot win celebration
                if (result && result.jackpotWon && result.jackpotWon.tier) {
                    setTimeout(function() {
                        showJackpotWinModal(result.jackpotWon.tier, result.jackpotWon.amount);
                    }, 1200); // slight delay so reel settle animation plays first
                }
            } else {
                showMessage(details.message || "No win. Try again.", "lose");
                hideGambleButton();
                detectAndShowNearMiss(grid, game);
                // Clear streak fire on loss
                (function() {
                    var _sb = document.getElementById('spinBtn');
                    if (_sb) _sb.classList.remove('spin-btn-fire');
                })();
                // Loss droop: briefly dim all reel cells
                const _droopCells = document.querySelectorAll('.reel-cell');
                _droopCells.forEach(function(c) { c.classList.add('reel-loss-droop'); });
                setTimeout(function() {
                    document.querySelectorAll('.reel-loss-droop').forEach(function(c) { c.classList.remove('reel-loss-droop'); });
                }, 420);
                _sessSpins++;
                _sessTotalBet += currentBet;
                if (typeof _bankrollBudget !== 'undefined' && _bankrollBudget > 0) { _bankrollWagered += currentBet; _updateBankrollBar(); }
                _updateSessionHud();
                _updateSessionStats();
                // Dynamic layer de-escalation
                if (typeof SoundManager !== 'undefined' && typeof SoundManager.playDynamicLayer === 'function') {
                    SoundManager.playDynamicLayer(0);
                }
                // Balance loss flash
                (function() {
                    var _bEl = document.getElementById('headerBalance') || document.getElementById('balanceDisplay') || document.querySelector('.balance-value');
                    if (_bEl) {
                        _bEl.classList.remove('balance-flash-win', 'balance-flash-loss');
                        void _bEl.offsetWidth;
                        _bEl.classList.add('balance-flash-loss');
                        setTimeout(function() { _bEl.classList.remove('balance-flash-loss'); }, 550);
                    }
                })();
                // Hide cascade chain counter on loss
                _hideCascadeChain();
                window._tumbleCascadeDepth = 0;
            }
            // Apply idle shimmer to all visible wild/scatter cells
            (function() {
                if (!game || !game.wildSymbol) return;
                var _gc = getGridCols(game), _gr = getGridRows(game);
                for (var _c = 0; _c < _gc; _c++) {
                    for (var _r = 0; _r < _gr; _r++) {
                        var _cellEl = document.getElementById('reel_' + _c + '_' + _r);
                        if (!_cellEl) continue;
                        var _sym = grid && grid[_c] && grid[_c][_r];
                        if (!_sym) continue;
                        if (typeof isWild === 'function' && isWild(_sym, game)) {
                            _cellEl.classList.add('reel-wild-idle');
                        } else if (typeof isScatter === 'function' && isScatter(_sym, game)) {
                            _cellEl.classList.add('reel-scatter-idle');
                        }
                    }
                }
            })();

            if (typeof awardXP === "function") { var _godMult2 = (typeof gameOfDayId !== 'undefined' && gameOfDayId && currentGame && currentGame.id === gameOfDayId && typeof GAME_OF_DAY_XP_BONUS !== 'undefined') ? GAME_OF_DAY_XP_BONUS : 1; awardXP(Math.round(XP_AWARD_PER_SPIN * _godMult2)); }
            if (typeof recordSpinHistory === 'function' && winAmount <= 0) recordSpinHistory({ game: (game && game.name) || '', gameId: (game && game.id) || '', bet: currentBet, win: 0, mult: 0 });
            if (winAmount <= 0) _demoOnSpinEnd();
            if (winAmount <= 0 && typeof _resetStreak === 'function') _resetStreak();
            if (typeof _updateSparkline === 'function') _updateSparkline(balance);

            // Promo engagement triggers
            if (typeof checkPromoTriggers === "function") {
                checkPromoTriggers("spin_result", {
                    won: winAmount > 0,
                    winAmount: winAmount,
                    betAmount: currentBet
                });
            }
            // Low balance warning (once per 10 spins max)
            (function() {
                var threshold = Math.max(50, currentBet * 3);
                if (balance < threshold && spinHistory.length > 0 && spinHistory.length % 10 === 1) {
                    if (typeof showMessage === 'function') {
                        showMessage('⚠️ Balance running low — consider adding funds', 'near-miss');
                    }
                }
            })();
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
            _updateFreeSpinsFrame();
            createConfetti();
        }


        function advanceFreeSpins(game) {
            if (!freeSpinsActive) return;

            freeSpinsRemaining--;
            updateFreeSpinsDisplay();
            _updateFreeSpinsFrame();

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
            _updateFreeSpinsFrame();
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

        // Shows a prominent "+N FREE SPINS!" retrigger banner on the FS HUD
        window.showRetriggerBanner = function(extraSpins) {
            var overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) return;
            var prev = overlay.querySelector('.fs-retrigger-banner');
            if (prev) prev.remove();
            var banner = document.createElement('div');
            banner.className = 'fs-retrigger-banner';
            banner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);'
                + 'background:linear-gradient(135deg,#ff6d00,#ffd740);color:#1a1a2e;font-weight:900;'
                + 'font-size:clamp(20px,5vw,32px);letter-spacing:2px;border-radius:12px;'
                + 'padding:14px 28px;text-align:center;z-index:200;white-space:nowrap;'
                + 'box-shadow:0 4px 32px rgba(255,109,0,0.7);pointer-events:none;'
                + 'transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;opacity:0;';
            banner.textContent = '+' + extraSpins + ' FREE SPINS!';
            overlay.style.position = 'relative';
            overlay.appendChild(banner);
            requestAnimationFrame(function() { requestAnimationFrame(function() {
                banner.style.transform = 'translate(-50%,-50%) scale(1)';
                banner.style.opacity = '1';
            }); });
            setTimeout(function() {
                banner.style.transform = 'translate(-50%,-50%) scale(0.8)';
                banner.style.opacity = '0';
                setTimeout(function() { if (banner.parentNode) banner.remove(); }, 350);
            }, 2200);
        };


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



        // ═══════════════════════════════════════════════════════
        // HOLD & WIN / COIN RESPIN ENGINE
        // ═══════════════════════════════════════════════════════

        // Credit a Hold & Win total win back to the player.
        window.onHoldWinComplete = function(winAmount) {
            if (winAmount > 0) {
                balance += winAmount;
                if (typeof updateBalance === 'function') updateBalance();
                if (typeof saveBalance === 'function') saveBalance();
                if (typeof showWinAnimation === 'function') showWinAnimation(winAmount);
                if (typeof triggerWinParticles === 'function') triggerWinParticles(winAmount);
                if (typeof stats !== 'undefined') {
                    stats.totalWon += winAmount;
                    if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                    if (typeof saveStats === 'function') saveStats();
                    if (typeof updateStatsSummary === 'function') updateStatsSummary();
                }
                if (window.HouseEdge) window.HouseEdge.recordSpin(0, winAmount, currentGame && currentGame.id);
                if (typeof awardXP === 'function') { var _godMult3 = (typeof gameOfDayId !== 'undefined' && gameOfDayId && currentGame && currentGame.id === gameOfDayId && typeof GAME_OF_DAY_XP_BONUS !== 'undefined') ? GAME_OF_DAY_XP_BONUS : 1; awardXP(Math.round(XP_AWARD_BIG_WIN * _godMult3)); }
                if (winAmount >= (typeof currentBet !== 'undefined' ? currentBet : 1) * 10) {
                    setTimeout(function() { if (typeof showBigWinCelebration === 'function') showBigWinCelebration(winAmount); }, 400);
                }
            }
        };


        async function triggerHoldAndWin(game, initialLockCells, betAmount) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const COIN_VALUES = (game.bonusType === 'coin_respin' && game.coinRespinValues)
                ? game.coinRespinValues
                : [2, 5, 10, 25, 50, 100];

            // Build 2-D locked grid: null = empty, number = locked coin value
            const lockedGrid = [];
            for (let c = 0; c < cols; c++) {
                lockedGrid.push(new Array(rows).fill(null));
            }

            function randomCoinValue() {
                const pick = COIN_VALUES[Math.floor(Math.random() * COIN_VALUES.length)];
                return Math.round(pick * betAmount * 100) / 100;
            }

            // Lock initial scatter positions
            initialLockCells.forEach(function(pos) {
                if (pos.col < cols && pos.row < rows) {
                    lockedGrid[pos.col][pos.row] = randomCoinValue();
                }
            });

            const reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;

            // Remove any stale overlay from a previous bonus round
            const stale = document.getElementById('holdWinOverlay');
            if (stale) stale.remove();

            const overlay = document.createElement('div');
            overlay.id = 'holdWinOverlay';
            overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.88);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;font-family:inherit';

            const accentColor = game.accentColor || '#ffd700';
            const titleText = game.bonusType === 'coin_respin' ? '🐸 COIN RESPIN' : '💰 HOLD & WIN';

            overlay.innerHTML =
                '<div style="font-size:28px;font-weight:bold;color:' + accentColor + ';margin-bottom:8px;text-shadow:0 0 16px ' + accentColor + '80;">' + titleText + '</div>'
                + '<div id="hwRespin" style="color:#fff;font-size:18px;margin-bottom:12px;">RESPINS: <b>3</b></div>'
                + '<div id="hwGrid" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:4px;margin-bottom:12px;width:min(90%,320px);"></div>'
                + '<div id="hwTotal" style="color:' + accentColor + ';font-size:20px;font-weight:bold;">COLLECTED: $0.00</div>';

            reelArea.style.position = 'relative';
            reelArea.appendChild(overlay);

            // Re-render the mini grid display, returns current collected total
            function renderHWGrid() {
                const gridEl = document.getElementById('hwGrid');
                if (!gridEl) return 0;
                gridEl.innerHTML = '';
                let collected = 0;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const val = lockedGrid[c][r];
                        const cell = document.createElement('div');
                        cell.style.cssText = 'aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:12px;font-weight:bold;transition:background 0.2s';
                        if (val !== null) {
                            cell.style.background = accentColor;
                            cell.style.color = '#000';
                            cell.textContent = '$' + val.toLocaleString();
                            collected += val;
                        } else {
                            cell.style.background = 'rgba(255,255,255,0.08)';
                            cell.style.border = '1px solid rgba(255,255,255,0.15)';
                        }
                        gridEl.appendChild(cell);
                    }
                }
                const totalEl = document.getElementById('hwTotal');
                if (totalEl) {
                    totalEl.textContent = 'COLLECTED: $' + collected.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
                return collected;
            }

            function updateRespinDisplay(n) {
                const el = document.getElementById('hwRespin');
                if (el) el.innerHTML = 'RESPINS: <b>' + n + '</b>';
            }

            function wait(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

            // Initial render showing locked scatter positions
            renderHWGrid();
            await wait(600);

            // Respin loop
            let respinsLeft = 3;
            updateRespinDisplay(respinsLeft);

            while (respinsLeft > 0) {
                respinsLeft--;
                updateRespinDisplay(respinsLeft);
                await wait(700);

                let newCoinLanded = false;
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        if (lockedGrid[c][r] === null && Math.random() < 0.25) {
                            lockedGrid[c][r] = randomCoinValue();
                            newCoinLanded = true;
                        }
                    }
                }

                renderHWGrid();

                if (newCoinLanded) {
                    // New coin landed: reset respin counter to 3
                    respinsLeft = 3;
                    updateRespinDisplay(respinsLeft);
                    if (typeof playSound === 'function') playSound('coin_land');
                }

                await wait(400);
            }

            // Tally final win
            let totalWin = 0;
            let allFilled = true;
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    if (lockedGrid[c][r] !== null) {
                        totalWin += lockedGrid[c][r];
                    } else {
                        allFilled = false;
                    }
                }
            }

            // Grand jackpot bonus when all grid positions are filled
            if (allFilled && game.jackpots && game.jackpots.grand) {
                const grandBonus = Math.round(game.jackpots.grand * betAmount * 100) / 100;
                totalWin += grandBonus;
                const jackpotBanner = document.createElement('div');
                jackpotBanner.style.cssText = 'color:#ff0;font-size:22px;font-weight:bold;margin-top:8px;text-shadow:0 0 12px #ff080088;';
                jackpotBanner.textContent = 'GRAND JACKPOT! +$' + grandBonus.toLocaleString();
                overlay.appendChild(jackpotBanner);
                await wait(1500);
            }

            // Apply house-edge cap
            if (window.HouseEdge && typeof window.HouseEdge.capWin === 'function') {
                totalWin = window.HouseEdge.capWin(totalWin, betAmount, game);
                totalWin = Math.round(totalWin * 100) / 100;
            }

            // Show completion message inside the overlay
            const completionEl = document.createElement('div');
            completionEl.style.cssText = 'color:' + accentColor + ';font-size:22px;font-weight:bold;margin-top:10px;';
            completionEl.textContent = totalWin > 0
                ? 'YOU WIN $' + totalWin.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '!'
                : 'BETTER LUCK NEXT TIME!';
            overlay.appendChild(completionEl);

            if (typeof createConfetti === 'function' && totalWin > 0) createConfetti();
            await wait(2500);

            // Remove overlay and credit the win
            if (overlay.parentNode) overlay.remove();
            if (typeof window.onHoldWinComplete === 'function') {
                window.onHoldWinComplete(totalWin);
            }
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
                // Clear any lingering scatter tension from all reels
                document.querySelectorAll('.reel-scatter-tension, .reel-scatter-primed').forEach(function(el) {
                    el.classList.remove('reel-scatter-tension', 'reel-scatter-primed');
                });
                currentReels = flattenGrid(finalGrid);
                renderGrid(finalGrid, game);
                setTimeout(onComplete, REEL_DECEL_DURATION + REEL_BOUNCE_DURATION + 100);
            }
        }

        // ── Payline Flash Effect ─────────────────────────────────────────────
        // Injects CSS once then fires a staggered per-payline cell highlight.
        function _injectPaylineFlashCss() {
            // CSS is in styles.css
        }


        function _injectTumbleCss() {
            // CSS is in styles.css
        }

        function triggerTumbleCascade(game) {
            if (!game || (game.bonusType !== 'tumble' && game.bonusType !== 'avalanche')) return;
            _injectTumbleCss();

            var cols = getGridCols(game);
            var rows = getGridRows(game);

            // Collect winning cells (those already highlighted with reel-win-glow)
            var winCols = {};
            for (var c = 0; c < cols; c++) {
                for (var r = 0; r < rows; r++) {
                    var cell = document.getElementById('reel_' + c + '_' + r);
                    if (cell && cell.classList.contains('reel-win-glow')) {
                        if (!winCols[c]) winCols[c] = [];
                        winCols[c].push(r);
                        cell.classList.add('reel-tumble-burst');
                    }
                }
            }

            // For each column that had wins, apply tumble-drop to the non-winning cells
            var burstDur = 480;
            setTimeout(function() {
                Object.keys(winCols).forEach(function(c) {
                    var winRows = winCols[c];
                    for (var r = 0; r < rows; r++) {
                        if (winRows.indexOf(r) === -1) {
                            var cell = document.getElementById('reel_' + c + '_' + r);
                            if (cell) {
                                cell.classList.add('reel-tumble-drop');
                                (function(_c) { setTimeout(function() { _c.classList.remove('reel-tumble-drop'); }, 420); })(cell);
                            }
                        }
                    }
                });
            }, burstDur - 80);
        }

        // Called after a server win result is displayed.
        // Reads _lastWinLines (populated by win-logic.js / displayServerWinResult)
        // and adds staggered payline-flash CSS classes to each winning cell.
        function triggerPaylineFlash() {
            _injectPaylineFlashCss();

            var winLines = (typeof _lastWinLines !== 'undefined') ? _lastWinLines : [];

            // Fallback: if no structured win-line data, flash all currently
            // highlighted win cells together as a single group.
            if (!winLines || winLines.length === 0) {
                var allWinCells = document.querySelectorAll('.reel-win-glow, .reel-big-win-glow');
                if (allWinCells.length === 0) return;
                allWinCells.forEach(function(cell) {
                    cell.classList.remove(
                        'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                        'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                    );
                    void cell.offsetWidth; // reflow to restart animation
                    cell.classList.add('payline-flash-0');
                });
                setTimeout(function() {
                    document.querySelectorAll(
                        '.payline-flash-0,.payline-flash-1,.payline-flash-2,.payline-flash-3,' +
                        '.payline-flash-4,.payline-flash-5,.payline-flash-6,.payline-flash-7'
                    ).forEach(function(el) {
                        el.classList.remove(
                            'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                            'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                        );
                    });
                }, 1100);
                return;
            }

            // Structured path: one flash class per payline, staggered 200ms each.
            winLines.forEach(function(winLine, idx) {
                var cells = winLine.cells;
                if (!cells || cells.length === 0) return;
                var flashClass = 'payline-flash-' + (idx % 8);
                cells.forEach(function(pair) {
                    var cellEl = document.getElementById('reel_' + pair[0] + '_' + pair[1]);
                    if (!cellEl) return;
                    cellEl.classList.remove(
                        'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                        'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                    );
                    void cellEl.offsetWidth; // reflow
                    cellEl.classList.add(flashClass);
                });
            });

            // Clean up after all animations have finished (last delay 1400ms + 900ms duration).
            var cleanupDelay = 200 * Math.min(winLines.length - 1, 7) + 1000;
            setTimeout(function() {
                document.querySelectorAll(
                    '.payline-flash-0,.payline-flash-1,.payline-flash-2,.payline-flash-3,' +
                    '.payline-flash-4,.payline-flash-5,.payline-flash-6,.payline-flash-7'
                ).forEach(function(el) {
                    el.classList.remove(
                        'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                        'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                    );
                });
            }, cleanupDelay);
        }

        // ═══════════════════════════════════════════════════════════
        // MYSTERY STACKS — Depth Charge (razor_shark)
        // bonusType: 'mystery_stacks'
        // ═══════════════════════════════════════════════════════════

        // Called from the displayServerWinResult patch when game.bonusType === 'mystery_stacks'.
        // Overlays a random column with '❓' cells, then reveals them after 500 ms to
        // match the actual grid result.  Has a 5% chance of applying a rare multiplier.
        function applyMysteryStacks(result, game) {
            if (!result || !result.grid) return;
            var grid = result.grid;
            var cols = getGridCols(game);
            var rows = getGridRows(game);
            var mysteryCol = Math.floor(Math.random() * cols);
            var multipliers = game.mysteryRevealMultipliers || [1, 2, 5, 10, 50, 2500];

            // Overlay the chosen column with ❓
            for (var r = 0; r < rows; r++) {
                var cell = document.getElementById('reel_' + mysteryCol + '_' + r);
                if (cell) {
                    cell.innerHTML = '<span style="font-size:1.6em;filter:drop-shadow(0 0 8px #00bcd4);">\u2753</span>';
                    cell.classList.add('reel-mystery-stack');
                }
            }

            // After 500 ms reveal the actual symbol
            setTimeout(function() {
                if (typeof playSound === 'function') playSound('mystery_reveal');
                var revealSymbol = (grid[mysteryCol] && grid[mysteryCol][0]) ||
                    game.symbols[Math.floor(Math.random() * game.symbols.length)];

                for (var r2 = 0; r2 < rows; r2++) {
                    var cell2 = document.getElementById('reel_' + mysteryCol + '_' + r2);
                    if (cell2) {
                        cell2.innerHTML = renderSymbol(revealSymbol);
                        cell2.classList.remove('reel-mystery-stack');
                        cell2.classList.add('reel-win-entrance');
                        (function(c) { setTimeout(function() { c.classList.remove('reel-win-entrance'); }, 400); })(cell2);
                    }
                }

                // 5% chance of a rare multiplier (skip index 0 which is x1)
                if (Math.random() < 0.05 && result.winAmount > 0) {
                    var rareIdx = 1 + Math.floor(Math.random() * (multipliers.length - 1));
                    var mult = multipliers[rareIdx];
                    if (mult > 1) {
                        var bonus = result.winAmount * (mult - 1);
                        balance += bonus;
                        updateBalance();
                        saveBalance();
                        showBonusEffect('\uD83D\uDD31 MYSTERY x' + mult + '!', '#00bcd4');
                        showWinAnimation(result.winAmount * mult);
                    }
                }
            }, 500);
        }

        // Patch displayServerWinResult to run mystery stacks overlay before the
        // standard win handling so the ❓ appears immediately when reels stop.
        (function() {
            var _origDSWR_mystery = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'mystery_stacks') {
                    applyMysteryStacks(result, game);
                }
                _origDSWR_mystery(result, game);
            };
        })();


        // ═══════════════════════════════════════════════════════════
        // WILD COLLECT — Loki's Wild Loot (loki_loot)
        // bonusType: 'wild_collect'
        // ═══════════════════════════════════════════════════════════

        window._wildMeterValue = window._wildMeterValue || 1;

        function resetWildMeter() {
            window._wildMeterValue = 1;
            updateWildMeterDisplay();
        }

        function updateWildMeterDisplay() {
            var el = document.getElementById('wildMeterDisplay');
            if (!el) return;
            var mv = window._wildMeterValue || 1;
            el.textContent = '\u26A1 WILD METER: ' + mv + 'x';
            el.style.display = (mv > 1) ? 'inline-block' : 'none';
            var meterColor = mv >= 16 ? '#ff5252' : mv >= 6 ? '#ff9800' : '#c6ff00';
            el.style.borderColor = meterColor;
            el.style.color = meterColor;
        }

        function ensureWildMeterDisplay() {
            if (document.getElementById('wildMeterDisplay')) return;
            var reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;
            var chip = document.createElement('div');
            chip.id = 'wildMeterDisplay';
            chip.style.cssText = [
                'display:none',
                'position:absolute',
                'bottom:-32px',
                'left:50%',
                'transform:translateX(-50%)',
                'background:rgba(10,31,10,0.92)',
                'border:2px solid #c6ff00',
                'border-radius:20px',
                'padding:4px 16px',
                'font-size:0.85em',
                'font-weight:700',
                'color:#c6ff00',
                'letter-spacing:0.08em',
                'white-space:nowrap',
                'z-index:20',
                'pointer-events:none'
            ].join(';');
            var raPos = window.getComputedStyle(reelArea).position;
            if (raPos === 'static') reelArea.style.position = 'relative';
            reelArea.appendChild(chip);
        }

        // Count wilds in the result grid, grow the meter, return boosted win amount.
        function applyWildCollect(result, game) {
            if (!result || !result.grid) return result ? (result.winAmount || 0) : 0;
            ensureWildMeterDisplay();
            var grid = result.grid;
            var cols = getGridCols(game);
            var rows = getGridRows(game);
            var wildCount = 0;

            for (var c = 0; c < cols; c++) {
                for (var r = 0; r < rows; r++) {
                    if (grid[c] && isWild(grid[c][r], game)) {
                        wildCount++;
                    }
                }
            }

            // Accumulate meter (not during free spins — meter is frozen but still applies)
            if (wildCount > 0 && !freeSpinsActive) {
                var picks = game.wildCollectMultiplier || [2, 3, 5, 10];
                for (var i = 0; i < wildCount; i++) {
                    window._wildMeterValue += picks[Math.floor(Math.random() * picks.length)];
                }
                if (typeof playSound === 'function') playSound('wild_meter_tick');
                showBonusEffect('\u26A1 WILD METER +' + wildCount + ' WILD' + (wildCount > 1 ? 'S' : '') + '!', '#c6ff00');
            }

            updateWildMeterDisplay();

            var win = result.winAmount || 0;
            if (win > 0 && window._wildMeterValue > 1) {
                var boosted = win * window._wildMeterValue;
                var bonusPart = boosted - win;
                balance += bonusPart;
                updateBalance();
                saveBalance();
                return boosted;
            }
            return win;
        }

        // Patch displayServerWinResult for wild_collect.
        (function() {
            var _origDSWR_wild = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'wild_collect') {
                    var boostedWin = applyWildCollect(result, game);
                    if (boostedWin !== (result ? result.winAmount || 0 : 0)) {
                        var patched = Object.assign({}, result, { winAmount: boostedWin });
                        _origDSWR_wild(patched, game);
                        return;
                    }
                }
                _origDSWR_wild(result, game);
            };
        })();


        // ═══════════════════════════════════════════════════════════
        // CHAMBER SPINS — Eternal Romance (eternal_romance)
        // bonusType: 'chamber_spins'
        // ═══════════════════════════════════════════════════════════

        var CHAMBER_CONFIGS = [
            { spins: 10, name: 'Chamber I \u2014 Amber',   color: '#ffc107', mult: 1, wildReel: false },
            { spins: 15, name: 'Chamber II \u2014 Troy',   color: '#ff7043', mult: 1, wildReel: false },
            { spins: 20, name: 'Chamber III \u2014 Michael', color: '#9c27b0', mult: 5, wildReel: false },
            { spins: 25, name: 'Chamber IV \u2014 Sarah',  color: '#c62828', mult: 1, wildReel: true  }
        ];

        window._chamberLevel = (typeof window._chamberLevel !== 'undefined') ? window._chamberLevel : 0;
        window._chamberMultiplier = window._chamberMultiplier || 1;
        window._chamberWildReel = (typeof window._chamberWildReel !== 'undefined') ? window._chamberWildReel : -1;

        function resetChamberState() {
            window._chamberLevel = 0;
            window._chamberMultiplier = 1;
            window._chamberWildReel = -1;
        }

        // Called by win-logic.js when a scatter fires for bonusType === 'chamber_spins'
        // outside of free spins (initial trigger).
        function triggerChamberSpins(game) {
            var level = (typeof window._chamberLevel !== 'undefined') ? window._chamberLevel : 0;
            if (level >= CHAMBER_CONFIGS.length) level = CHAMBER_CONFIGS.length - 1;
            var cfg = CHAMBER_CONFIGS[level];

            window._chamberMultiplier = cfg.mult;
            window._chamberWildReel = cfg.wildReel
                ? Math.floor(Math.random() * getGridCols(game))
                : -1;

            showBonusEffect(cfg.name.toUpperCase() + ' ACTIVATED!', cfg.color);
            triggerFreeSpins(game, cfg.spins);

            // Update overlay text after it renders
            setTimeout(function() {
                var titleEl = document.querySelector('#freeSpinsOverlay .fs-intro-title');
                if (titleEl) titleEl.textContent = cfg.name;
                var descEl = document.querySelector('#freeSpinsOverlay .fs-intro-desc');
                if (descEl) {
                    if (cfg.mult > 1) {
                        descEl.textContent = cfg.mult + '\u00d7 multiplier on all wins!';
                    } else if (cfg.wildReel && window._chamberWildReel >= 0) {
                        descEl.textContent = 'Reel ' + (window._chamberWildReel + 1) + ' is fully WILD!';
                    }
                }
            }, 800);
        }

        // Called by win-logic.js when a scatter fires DURING free spins for chamber_spins.
        function advanceChamberLevel(game) {
            if (typeof window._chamberLevel === 'undefined') window._chamberLevel = 0;
            var nextLevel = Math.min(window._chamberLevel + 1, CHAMBER_CONFIGS.length - 1);
            if (nextLevel === window._chamberLevel) {
                // At max chamber — give bonus spins
                freeSpinsRemaining += 5;
                updateFreeSpinsDisplay();
                showBonusEffect('+5 FREE SPINS!', '#c62828');
                return;
            }
            window._chamberLevel = nextLevel;
            var cfg = CHAMBER_CONFIGS[nextLevel];
            window._chamberMultiplier = cfg.mult;
            window._chamberWildReel = cfg.wildReel
                ? Math.floor(Math.random() * getGridCols(game))
                : -1;

            freeSpinsRemaining += cfg.spins;
            updateFreeSpinsDisplay();
            if (typeof playSound === 'function') playSound('level_up');
            showBonusEffect(cfg.name.toUpperCase() + ' UNLOCKED!', cfg.color);
        }

        // Patch displayServerWinResult for chamber_spins: inject wild reel visuals
        // and apply the chamber multiplier when active.
        (function() {
            var _origDSWR_chamber = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'chamber_spins' && freeSpinsActive) {
                    // Wild reel: force wild symbol into a full column
                    if (window._chamberWildReel >= 0 && result && result.grid) {
                        var wc = window._chamberWildReel;
                        var rows = getGridRows(game);
                        for (var r = 0; r < rows; r++) {
                            if (result.grid[wc]) result.grid[wc][r] = game.wildSymbol;
                            var cell = document.getElementById('reel_' + wc + '_' + r);
                            if (cell) {
                                cell.innerHTML = renderSymbol(game.wildSymbol);
                                cell.classList.add('reel-wild-glow');
                            }
                        }
                    }

                    // Chamber multiplier (only Chamber III has mult > 1)
                    var mult = window._chamberMultiplier || 1;
                    if (mult > 1 && result && result.winAmount > 0) {
                        var boosted = result.winAmount * mult;
                        var bonusPart = boosted - result.winAmount;
                        balance += bonusPart;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: boosted });
                        _origDSWR_chamber(patched, game);
                        showBonusEffect('x' + mult + ' CHAMBER MULTIPLIER!', '#9c27b0');
                        return;
                    }
                }
                _origDSWR_chamber(result, game);
            };
        })();

        // Reset chamber and wild meter state when openSlot is called for these games.
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlotBonus = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'chamber_spins') resetChamberState();
                    if (game && game.bonusType === 'wild_collect') resetWildMeter();
                    _origOpenSlotBonus(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════════
        // WIN STREAK TRACKER
        // ═══════════════════════════════════════════════════════════════

        window._winStreak = window._winStreak || 0;
        window._winStreakBest = window._winStreakBest || 0;

        var _STREAK_MILESTONES = [
            { at: 3,  label: '3x STREAK',   color: '#cd7f32', cls: 'streak-bronze' },
            { at: 5,  label: '5x STREAK',   color: '#c0c0c0', cls: 'streak-silver' },
            { at: 10, label: '10x STREAK',  color: '#ffd700', cls: 'streak-gold'   },
            { at: 20, label: '20x STREAK',  color: '#e040fb', cls: 'streak-legend' }
        ];

        function resetWinStreak() {
            window._winStreak = 0;
            _updateStreakDisplay();
        }

        function _updateStreakDisplay() {
            var el = document.getElementById('winStreakBadge');
            if (!el) return;
            var streak = window._winStreak || 0;
            if (streak < 2) { el.style.display = 'none'; return; }
            var color = '#ffc107', cls = '';
            for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                if (streak >= _STREAK_MILESTONES[i].at) { color = _STREAK_MILESTONES[i].color; cls = _STREAK_MILESTONES[i].cls; }
            }
            el.textContent = '🔥 ' + streak + '× STREAK';
            el.style.display = 'inline-block';
            el.style.color = color;
            el.style.borderColor = color;
            el.className = 'win-streak-badge' + (cls ? ' ' + cls : '');
        }

        function _ensureStreakBadge() {
            if (document.getElementById('winStreakBadge')) return;
            var badge = document.createElement('span');
            badge.id = 'winStreakBadge';
            badge.className = 'win-streak-badge';
            badge.style.cssText = 'display:none;position:fixed;top:90px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #ffc107;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#ffc107;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(badge);
        }

        (function() {
            var _origDSWR_streak = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                _ensureStreakBadge();
                var won = result && result.winAmount > 0;
                if (won) {
                    window._winStreak = (window._winStreak || 0) + 1;
                    if (window._winStreak > (window._winStreakBest || 0)) window._winStreakBest = window._winStreak;
                    for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                        if (window._winStreak === _STREAK_MILESTONES[i].at) {
                            showBonusEffect(_STREAK_MILESTONES[i].label + '!', _STREAK_MILESTONES[i].color);
                            if (typeof playSound === 'function') playSound('streak_hit');
                            break;
                        }
                    }
                } else {
                    window._winStreak = 0;
                }
                _updateStreakDisplay();
                _origDSWR_streak(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_streak = openSlot;
                openSlot = function(game) {
                    resetWinStreak();
                    _origOpenSlot_streak(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════════
        // STICKY WILDS — bonusType: 'sticky_wilds'
        // ═══════════════════════════════════════════════════════════════

        window._stickyWildCells = window._stickyWildCells || [];

        function resetStickyWilds() {
            window._stickyWildCells = [];
            document.querySelectorAll('.reel-sticky-wild').forEach(function(el) {
                el.classList.remove('reel-sticky-wild');
            });
        }

        function triggerStickyWildsFreeSpins(game, scatterWin) {
            resetStickyWilds();
            if (typeof playSound === 'function') playSound('freespin');
            showBonusEffect('STICKY WILDS BONUS!', game.accentColor || '#9c27b0');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _applyStickyWildVisuals(game) {
            var cells = window._stickyWildCells || [];
            cells.forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-sticky-wild', 'reel-wild-glow');
                }
            });
        }

        function _collectNewStickyWilds(result, game) {
            var cells = window._stickyWildCells;
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var already = cells.some(function(p) { return p.col === c && p.row === r; });
                        if (!already) {
                            cells.push({ col: c, row: r });
                            if (typeof playSound === 'function') playSound('sticky_lock');
                        }
                    }
                }
            }
        }


        (function() {
            var _origDSWR_sticky = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'sticky_wilds' && freeSpinsActive) {
                    var cells = window._stickyWildCells || [];
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    _origDSWR_sticky(result, game);
                    _collectNewStickyWilds(result, game);
                    setTimeout(function() { _applyStickyWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_sticky(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sticky = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'sticky_wilds') resetStickyWilds();
                    _origOpenSlot_sticky(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════════
        // WALKING WILDS — bonusType: 'walking_wilds'
        // ═══════════════════════════════════════════════════════════════

        window._walkingWildCells = window._walkingWildCells || [];

        function resetWalkingWilds() {
            window._walkingWildCells = [];
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
        }

        function triggerWalkingWildsFreeSpins(game, scatterWin) {
            resetWalkingWilds();
            if (typeof playSound === 'function') playSound('freespin');
            showBonusEffect('WALKING WILDS BONUS!', game.accentColor || '#00bcd4');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _stepWalkingWilds() {
            var next = [];
            var walked = false;
            window._walkingWildCells.forEach(function(pos) {
                if (pos.col > 0) { next.push({ col: pos.col - 1, row: pos.row }); walked = true; }
            });
            window._walkingWildCells = next;
            if (walked && typeof playSound === 'function') playSound('wild_walk');
        }

        function _collectNewWalkingWilds(result, game) {
            var cells = window._walkingWildCells;
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var already = cells.some(function(p) { return p.col === c && p.row === r; });
                        if (!already) cells.push({ col: c, row: r });
                    }
                }
            }
        }

        function _applyWalkingWildVisuals(game) {
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
            (window._walkingWildCells || []).forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-walking-wild', 'reel-wild-glow');
                }
            });
        }


        (function() {
            var _origDSWR_walk = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'walking_wilds' && freeSpinsActive) {
                    _stepWalkingWilds();
                    var cells = window._walkingWildCells;
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    _origDSWR_walk(result, game);
                    _collectNewWalkingWilds(result, game);
                    setTimeout(function() { _applyWalkingWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_walk(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_walk = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'walking_wilds') resetWalkingWilds();
                    _origOpenSlot_walk(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // MULTIPLIER WILDS — bonusType: 'multiplier_wilds'
        // Each wild on the grid carries a random multiplier (2-10x).
        // When a wild contributes to a payline win, that line's payout
        // is multiplied by the wild's value.
        // ═══════════════════════════════════════════════════════════

        window._multWildValues = window._multWildValues || {};

        function resetMultWilds() {
            window._multWildValues = {};
        }

        var _MULT_WILD_OPTIONS = [2, 2, 2, 3, 3, 5, 5, 8, 10];

        function _assignMultWilds(result, game) {
            window._multWildValues = {};
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var key = c + '_' + r;
                        window._multWildValues[key] = _MULT_WILD_OPTIONS[
                            Math.floor(Math.random() * _MULT_WILD_OPTIONS.length)
                        ];
                    }
                }
            }
        }

        function _renderMultWildBadges() {
            Object.keys(window._multWildValues || {}).forEach(function(key) {
                var parts = key.split('_');
                var el = document.getElementById('reel_' + parts[0] + '_' + parts[1]);
                if (!el) return;
                var mult = window._multWildValues[key];
                var badge = el.querySelector('.mw-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mw-badge';
                    badge.style.cssText = 'position:absolute;top:2px;right:3px;z-index:10;'
                        + 'background:#ff6d00;color:#fff;font-size:0.65rem;font-weight:900;'
                        + 'border-radius:8px;padding:1px 5px;pointer-events:none;'
                        + 'line-height:1.4;box-shadow:0 0 6px #ff6d00;';
                    el.style.position = 'relative';
                    el.appendChild(badge);
                }
                badge.textContent = mult + 'x';
                if (typeof playSound === 'function') playSound('wild_mult');
            });
        }


        // Patch: assign mult values, then boost win if wilds were on winning lines
        (function() {
            var _origDSWR_mw = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'multiplier_wilds') {
                    _assignMultWilds(result, game);
                    // Calculate boost: max multiplier of any wild that appeared
                    var vals = Object.values(window._multWildValues || {});
                    var boost = vals.length > 0 ? Math.max.apply(null, vals) : 1;
                    if (boost > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (boost - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * boost });
                        _origDSWR_mw(patched, game);
                        showBonusEffect(boost + 'x WILD MULTIPLIER!', '#ff6d00');
                    } else {
                        _origDSWR_mw(result, game);
                    }
                    setTimeout(_renderMultWildBadges, 50);
                    return;
                }
                _origDSWR_mw(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_mw = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'multiplier_wilds') resetMultWilds();
                    _origOpenSlot_mw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // INCREASING MULTIPLIER — bonusType: 'increasing_mult'
        // During free spins, the global win multiplier increments
        // after each spin: 1x → 2x → 3x → 5x → 8x → 10x (capped).
        // ═══════════════════════════════════════════════════════════

        var _INCR_MULT_STEPS = [1, 2, 3, 5, 8, 10];
        window._incrMultStep = window._incrMultStep || 0;

        function resetIncrMult() {
            window._incrMultStep = 0;
            _updateIncrMultDisplay();
        }

        function _currentIncrMult() {
            var step = Math.min(window._incrMultStep || 0, _INCR_MULT_STEPS.length - 1);
            return _INCR_MULT_STEPS[step];
        }

        function _updateIncrMultDisplay() {
            var el = document.getElementById('incrMultDisplay');
            if (!el) return;
            var mult = _currentIncrMult();
            if (!freeSpinsActive || mult < 2) { el.style.display = 'none'; return; }
            el.textContent = '⚡ ' + mult + 'x';
            el.style.display = 'inline-block';
            var c = mult >= 8 ? '#ff5252' : mult >= 5 ? '#ff9800' : '#c6ff00';
            el.style.color = c;
            el.style.borderColor = c;
        }

        function _ensureIncrMultDisplay() {
            if (document.getElementById('incrMultDisplay')) return;
            var el = document.createElement('span');
            el.id = 'incrMultDisplay';
            el.style.cssText = 'display:none;position:fixed;top:130px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #c6ff00;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#c6ff00;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(el);
        }

        (function() {
            var _origDSWR_im = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'increasing_mult' && freeSpinsActive) {
                    _ensureIncrMultDisplay();
                    var mult = _currentIncrMult();
                    if (mult > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (mult - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                        _origDSWR_im(patched, game);
                        showBonusEffect(mult + 'x MULTIPLIER!', mult >= 8 ? '#ff5252' : '#ff9800');
                    } else {
                        _origDSWR_im(result, game);
                    }
                    // Advance multiplier for next spin
                    if ((window._incrMultStep || 0) < _INCR_MULT_STEPS.length - 1) {
                        window._incrMultStep = (window._incrMultStep || 0) + 1;
                        if (typeof playSound === 'function') playSound('mult_rise');
                    }
                    _updateIncrMultDisplay();
                    return;
                }
                _origDSWR_im(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_im = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'increasing_mult') resetIncrMult();
                    _origOpenSlot_im(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // BUY FEATURE — available on any game with freeSpinsCount > 0
        // and game.buyFeature !== false. Costs game.buyMultiplier × bet
        // (default 100×). Instantly triggers free spins.
        // ═══════════════════════════════════════════════════════════

        function _ensureBuyFeatureButton(game) {
            var existing = document.getElementById('buyFeatureBtn');
            if (existing) { existing.parentNode && existing.parentNode.removeChild(existing); }
            if (!game || !game.freeSpinsCount || game.buyFeature === false) return;
            var costMult = game.buyMultiplier || 100;
            var btn = document.createElement('button');
            btn.id = 'buyFeatureBtn';
            btn.textContent = '💰 BUY BONUS ' + costMult + '×';
            btn.title = 'Buy Feature: costs ' + costMult + '× current bet to trigger free spins instantly';
            btn.style.cssText = 'position:fixed;bottom:110px;right:14px;z-index:1500;'
                + 'background:linear-gradient(135deg,#ff6d00,#ff8f00);color:#fff;'
                + 'border:none;border-radius:20px;padding:6px 14px;font-size:0.78rem;'
                + 'font-weight:800;letter-spacing:0.05em;cursor:pointer;'
                + 'box-shadow:0 0 12px rgba(255,109,0,0.55);transition:transform 0.1s;';
            btn.onmouseover = function() { btn.style.transform = 'scale(1.06)'; };
            btn.onmouseout  = function() { btn.style.transform = 'scale(1)'; };
            btn.onclick = function() {
                if (spinning || freeSpinsActive) return;
                var cost = currentBet * costMult;
                if (balance < cost) {
                    showMessage('Insufficient balance for Buy Feature (' + costMult + '× bet = $' + cost.toLocaleString() + ')', 'lose');
                    return;
                }
                balance -= cost;
                updateBalance();
                saveBalance();
                if (typeof playSound === 'function') playSound('buy_feature');
                showBonusEffect('BONUS FEATURE PURCHASED!', '#ff6d00');
                setTimeout(function() {
                    if (game.bonusType === 'chamber_spins' && typeof triggerChamberSpins === 'function') {
                        triggerChamberSpins(game);
                    } else if (game.bonusType === 'sticky_wilds' && typeof triggerStickyWildsFreeSpins === 'function') {
                        triggerStickyWildsFreeSpins(game, 0);
                    } else if (game.bonusType === 'walking_wilds' && typeof triggerWalkingWildsFreeSpins === 'function') {
                        triggerWalkingWildsFreeSpins(game, 0);
                    } else if (game.bonusType === 'prize_wheel' && typeof triggerPrizeWheel === 'function') {
                        triggerPrizeWheel(game);
                    } else {
                        triggerFreeSpins(game, game.freeSpinsCount);
                    }
                }, 600);
            };
            document.body.appendChild(btn);
            btn._refreshCost = function() {
                var c = currentBet * costMult;
                btn.title = 'Buy Feature: ' + costMult + 'x bet = $' + c.toLocaleString();
                btn.disabled = (balance < c) || spinning || freeSpinsActive;
                btn.style.opacity = btn.disabled ? '0.5' : '1';
            };
            btn._refreshCost();
        }

        // Hook into openSlot to add/remove button
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_bf = openSlot;
                openSlot = function(game) {
                    _origOpenSlot_bf(game);
                    setTimeout(function() { _ensureBuyFeatureButton(game); }, 300);
                };
            }
        })();

        // Remove button when slot closes
        (function() {
            var _origCloseSl = typeof closeSlot === 'function' ? closeSlot : null;
            if (_origCloseSl) {
                closeSlot = function() {
                    var b = document.getElementById('buyFeatureBtn');
                    if (b) b.parentNode && b.parentNode.removeChild(b);
                    _origCloseSl.apply(this, arguments);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // CASCADING REELS — bonusType: 'cascading'
        // After a win, winning symbols explode and new symbols fall in.
        // Each cascade level raises the win multiplier: 1x → 2x → 3x → 5x.
        // Up to 4 cascade levels per spin. Resets each new spin.
        // ═══════════════════════════════════════════════════════════

        var _CASCADE_MULTS = [1, 2, 3, 5];
        window._cascadeLevel = window._cascadeLevel || 0;
        window._cascadeActive = false;

        function resetCascade() {
            window._cascadeLevel = 0;
            window._cascadeActive = false;
            var el = document.getElementById('cascadeMultDisplay');
            if (el) el.style.display = 'none';
            _hideCascadeChain();
        }

        // ── cascade chain counter helpers ──
        function _showCascadeChain(level) {
            var el = document.getElementById('cascadeChainDisplay');
            if (!el) return;
            if (!currentGame || !currentGame.bonusType) return;
            var bt = currentGame.bonusType;
            if (bt !== 'cascading' && bt !== 'avalanche' && bt !== 'tumble') return;
            var countEl = el.querySelector('.cascade-chain-count');
            if (countEl) countEl.textContent = '×' + level;
            el.setAttribute('data-level', String(level));
            el.classList.add('visible');
            el.classList.remove('bump');
            void el.offsetWidth;
            el.classList.add('bump');
            setTimeout(function() { el.classList.remove('bump'); }, 300);
        }

        // -- Free Spins Golden Frame --
        function _updateFreeSpinsFrame() {
            var reelArea = document.querySelector('.slot-reels') || document.querySelector('.reel-grid') || document.querySelector('.reel-container');
            if (!reelArea) return;
            var parent = reelArea.parentNode;
            if (!parent) return;
            if (freeSpinsActive) {
                parent.classList.add('free-spins-active-frame');
                var banner = document.getElementById('freeSpinsBanner');
                if (!banner) {
                    banner = document.createElement('div');
                    banner.id = 'freeSpinsBanner';
                    banner.className = 'free-spins-banner';
                    parent.insertBefore(banner, reelArea);
                }
                var totalWinStr = typeof freeSpinsTotalWin !== 'undefined' && freeSpinsTotalWin > 0
                    ? ' <span class="fs-total-win">+$' + freeSpinsTotalWin.toFixed(2) + '</span>'
                    : '';
                var remaining = typeof freeSpinsRemaining !== 'undefined' ? freeSpinsRemaining : '?';
                banner.innerHTML = '✨ FREE SPINS <span class="fs-remaining">' + remaining + ' left</span>' + totalWinStr;
            } else {
                parent.classList.remove('free-spins-active-frame');
                var existBanner = document.getElementById('freeSpinsBanner');
                if (existBanner) existBanner.remove();
            }
        }

        function _hideCascadeChain() {
            var el = document.getElementById('cascadeChainDisplay');
            if (!el) return;
            el.classList.remove('visible');
            el.setAttribute('data-level', '1');
        }

        function _currentCascadeMult() {
            return _CASCADE_MULTS[Math.min(window._cascadeLevel || 0, _CASCADE_MULTS.length - 1)];
        }

        function _ensureCascadeDisplay() {
            if (document.getElementById('cascadeMultDisplay')) return;
            var el = document.createElement('span');
            el.id = 'cascadeMultDisplay';
            el.style.cssText = 'display:none;position:fixed;top:170px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #00e5ff;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#00e5ff;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(el);
        }

        function _updateCascadeDisplay() {
            var el = document.getElementById('cascadeMultDisplay');
            if (!el) return;
            var level = window._cascadeLevel || 0;
            if (!window._cascadeActive || level < 1) { el.style.display = 'none'; return; }
            var mult = _currentCascadeMult();
            el.textContent = '💥 CASCADE ' + mult + 'x';
            el.style.display = 'inline-block';
            var c = mult >= 5 ? '#ff5252' : mult >= 3 ? '#ff9800' : '#00e5ff';
            el.style.color = c;
            el.style.borderColor = c;
        }

        function _playCascadeExplosion(result, game) {
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    var el = document.getElementById('reel_' + c + '_' + r);
                    if (!el) continue;
                    el.classList.add('cascade-explode');
                    setTimeout((function(e) { return function() { e.classList.remove('cascade-explode'); }; })(el), 400);
                }
            }
            if (typeof playSound === 'function') playSound('cascade_hit');
        }


        (function() {
            var _origDSWR_cas = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'cascading') {
                    _ensureCascadeDisplay();
                    var mult = _currentCascadeMult();
                    if (result && result.winAmount > 0) {
                        window._cascadeActive = true;
                        _playCascadeExplosion(result, game);
                        if (mult > 1) {
                            var extra = result.winAmount * (mult - 1);
                            balance += extra;
                            updateBalance();
                            saveBalance();
                            var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                            _origDSWR_cas(patched, game);
                            showBonusEffect('CASCADE ' + mult + 'x!', mult >= 5 ? '#ff5252' : '#ff9800');
                        } else {
                            _origDSWR_cas(result, game);
                        }
                        if ((window._cascadeLevel || 0) < _CASCADE_MULTS.length - 1) {
                            window._cascadeLevel = (window._cascadeLevel || 0) + 1;
                        }
                        _showCascadeChain(window._cascadeLevel + 1);
                        _updateCascadeDisplay();
                        return;
                    }
                    resetCascade();
                    _origDSWR_cas(result, game);
                    return;
                }
                _origDSWR_cas(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_cas = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'cascading') resetCascade();
                    _origOpenSlot_cas(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // EXPANDING WILDS — bonusType: 'expanding_wilds'
        // When a wild lands, it expands to fill its entire reel column.
        // The expansion plays a sweep animation then re-evaluates wins.
        // ═══════════════════════════════════════════════════════════

        window._expandedCols = window._expandedCols || {};

        function resetExpandedWilds() {
            window._expandedCols = {};
        }

        function _expandWildsInResult(result, game) {
            window._expandedCols = {};
            if (!result || !result.grid) return result;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                var hasWild = col.some(function(sym) { return isWild(sym, game); });
                if (hasWild) {
                    window._expandedCols[c] = true;
                    var expanded = col.map(function() { return game.wildSymbol; });
                    result = Object.assign({}, result);
                    result.grid = result.grid.slice();
                    result.grid[c] = expanded;
                }
            }
            return result;
        }

        function _renderExpandingWildVisuals(game) {
            Object.keys(window._expandedCols || {}).forEach(function(colIdx) {
                var c = parseInt(colIdx, 10);
                var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.gridRows) || 3;
                for (var r = 0; r < rows; r++) {
                    var el = document.getElementById('reel_' + c + '_' + r);
                    if (!el) continue;
                    el.classList.add('expand-wild-anim');
                    // wildSymbol is internal game config, not user input — safe to render as HTML // nosec
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    setTimeout((function(e) { return function() { e.classList.remove('expand-wild-anim'); }; })(el), 500);
                }
                if (typeof playSound === 'function') playSound('wild_expand');
            });
        }


        (function() {
            var _origDSWR_ew = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'expanding_wilds') {
                    var expanded = _expandWildsInResult(result, game);
                    _origDSWR_ew(expanded, game);
                    if (Object.keys(window._expandedCols || {}).length > 0) {
                        setTimeout(function() { _renderExpandingWildVisuals(game); }, 30);
                    }
                    return;
                }
                _origDSWR_ew(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_ew = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'expanding_wilds') resetExpandedWilds();
                    _origOpenSlot_ew(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // RE-SPIN WITH HOLD — bonusType: 'respin'
        // When 1–2 scatter/wild symbols land but don't trigger full bonus,
        // those symbols lock in place and up to 2 free re-spins are awarded.
        // Resets on full bonus trigger or on game open.
        // ═══════════════════════════════════════════════════════════

        window._respinLockedCells = window._respinLockedCells || [];
        window._respinCount = 0;
        window._respinActive = false;

        function resetRespin() {
            window._respinLockedCells = [];
            window._respinCount = 0;
            window._respinActive = false;
            _clearRespinLocks();
        }

        function _clearRespinLocks() {
            document.querySelectorAll('.respin-lock').forEach(function(el) {
                el.classList.remove('respin-lock');
            });
        }

        function _renderRespinLocks(game) {
            _clearRespinLocks();
            (window._respinLockedCells || []).forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (!el) return;
                el.classList.add('respin-lock');
                if (typeof playSound === 'function') playSound('respin_lock');
            });
        }

        function _collectRespinLockCandidates(result, game) {
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    var sym = col[r];
                    if (sym === game.scatterSymbol || isWild(sym, game)) {
                        var exists = (window._respinLockedCells || []).some(function(p) { return p.col === c && p.row === r; });
                        if (!exists) {
                            window._respinLockedCells = (window._respinLockedCells || []).concat([{ col: c, row: r, sym: sym }]);
                        }
                    }
                }
            }
        }


        (function() {
            var _origDSWR_rs = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'respin' && !freeSpinsActive) {
                    _collectRespinLockCandidates(result, game);
                    var locked = (window._respinLockedCells || []).length;
                    if (locked >= 1 && locked < (game.scatterThreshold || 3) && !window._respinActive) {
                        window._respinActive = true;
                        window._respinCount = Math.min(locked + 1, 3);
                        _origDSWR_rs(result, game);
                        setTimeout(function() {
                            _renderRespinLocks(game);
                            showBonusEffect(window._respinCount + ' RE-SPIN' + (window._respinCount > 1 ? 'S' : '') + '! Hold the locks!', '#ffd600');
                            if (typeof triggerFreeSpins === 'function') {
                                triggerFreeSpins(game, window._respinCount);
                            }
                        }, 200);
                        return;
                    }
                    _origDSWR_rs(result, game);
                    return;
                }
                if (game && game.bonusType === 'respin' && freeSpinsActive && (window._freeSpinsLeft || 0) <= 0) {
                    resetRespin();
                }
                _origDSWR_rs(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_rs = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'respin') resetRespin();
                    _origOpenSlot_rs(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // PRIZE WHEEL — bonusType: 'prize_wheel'
        // Scatter triggers a full-screen overlay wheel with 8 segments.
        // Prizes: 5–50× bet, 5–15 free spins, or jackpot 200× bet.
        // ═══════════════════════════════════════════════════════════

        var _WHEEL_SEGMENTS = [
            { label: '5x', type: 'cash', value: 5 },
            { label: '8 SPINS', type: 'spins', value: 8 },
            { label: '10x', type: 'cash', value: 10 },
            { label: '5 SPINS', type: 'spins', value: 5 },
            { label: '25x', type: 'cash', value: 25 },
            { label: '10 SPINS', type: 'spins', value: 10 },
            { label: '50x', type: 'cash', value: 50 },
            { label: '200x 🎰', type: 'jackpot', value: 200 }
        ];
        var _WHEEL_COLORS = ['#ff6d00','#1565c0','#2e7d32','#6a1b9a','#c62828','#00695c','#f9a825','#37474f'];

        function _buildWheelOverlay(game, onDone) {
            var overlay = document.createElement('div');
            overlay.id = 'prizeWheelOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var title = document.createElement('div');
            title.textContent = '🍡 PRIZE WHEEL!';
            title.style.cssText = 'color:#ffd600;font-size:1.6rem;font-weight:900;letter-spacing:0.08em;margin-bottom:18px;text-shadow:0 0 20px #ffd600;';
            overlay.appendChild(title);

            var wheelWrap = document.createElement('div');
            wheelWrap.style.cssText = 'position:relative;width:280px;height:280px;';

            var canvas = document.createElement('canvas');
            canvas.width = 280; canvas.height = 280;
            var ctx = canvas.getContext('2d');
            var segCount = _WHEEL_SEGMENTS.length;
            var segAngle = (Math.PI * 2) / segCount;
            var cx = 140, cy = 140, radius = 130;
            for (var i = 0; i < segCount; i++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, i * segAngle - Math.PI / 2, (i + 1) * segAngle - Math.PI / 2);
                ctx.closePath();
                ctx.fillStyle = _WHEEL_COLORS[i];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(i * segAngle - Math.PI / 2 + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.fillText(_WHEEL_SEGMENTS[i].label, radius - 8, 5);
                ctx.restore();
            }
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd600';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            wheelWrap.appendChild(canvas);

            var ptr = document.createElement('div');
            ptr.style.cssText = 'position:absolute;top:-8px;left:50%;transform:translateX(-50%);'
                + 'width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;'
                + 'border-top:24px solid #ffd600;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));';
            wheelWrap.appendChild(ptr);
            overlay.appendChild(wheelWrap);

            var spinBtn = document.createElement('button');
            spinBtn.textContent = 'SPIN THE WHEEL!';
            spinBtn.style.cssText = 'margin-top:22px;background:linear-gradient(135deg,#ffd600,#ff6d00);color:#000;'
                + 'border:none;border-radius:24px;padding:10px 28px;font-size:1rem;font-weight:900;'
                + 'cursor:pointer;letter-spacing:0.06em;box-shadow:0 0 16px rgba(255,214,0,0.6);';

            spinBtn.onclick = function() {
                spinBtn.disabled = true;
                spinBtn.style.opacity = '0.5';
                if (typeof playSound === 'function') playSound('wheel_spin');
                var winIdx = Math.floor(Math.random() * segCount);
                var fullSpins = 5 + Math.floor(Math.random() * 3);
                var targetDeg = fullSpins * 360 + (360 - (winIdx * (360 / segCount))) - (360 / segCount / 2);
                canvas.style.transition = 'transform 3s cubic-bezier(0.17,0.67,0.12,1)';
                canvas.style.transform = 'rotate(' + targetDeg + 'deg)';
                setTimeout(function() {
                    var seg = _WHEEL_SEGMENTS[winIdx];
                    var prize;
                    if (seg.type === 'cash' || seg.type === 'jackpot') {
                        prize = seg.value * currentBet;
                        balance += prize;
                        updateBalance();
                        saveBalance();
                    }
                    var resultEl = document.createElement('div');
                    resultEl.textContent = seg.type === 'spins'
                        ? '🎉 ' + seg.value + ' FREE SPINS!'
                        : '🎉 ' + seg.label + ' WIN! +$' + (prize || 0).toLocaleString();
                    resultEl.style.cssText = 'color:#ffd600;font-size:1.3rem;font-weight:900;margin-top:16px;'
                        + 'text-shadow:0 0 14px #ffd600;animation:wheelPrizeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;';
                    // Audio + visual feedback when wheel result reveals
                    if (typeof playSound === 'function') playSound(seg.type === 'jackpot' ? 'megawin' : 'bonus');
                    if (seg.type === 'jackpot' && typeof showBonusEffect === 'function') showBonusEffect('🎰 JACKPOT! +$' + (prize || 0).toLocaleString(), '#ffd600');
                    if (seg.type === 'spins' && typeof showBonusEffect === 'function') showBonusEffect('🎉 ' + seg.value + ' FREE SPINS!', '#69f0ae');
                    overlay.appendChild(resultEl);

                    var closeBtn = document.createElement('button');
                    closeBtn.textContent = 'COLLECT';
                    closeBtn.style.cssText = 'margin-top:14px;background:#ffd600;color:#000;border:none;'
                        + 'border-radius:20px;padding:8px 24px;font-size:0.9rem;font-weight:900;cursor:pointer;';
                    closeBtn.onclick = function() {
                        var ov = document.getElementById('prizeWheelOverlay');
                        if (ov) ov.parentNode.removeChild(ov);
                        if (seg.type === 'spins' && typeof triggerFreeSpins === 'function') {
                            triggerFreeSpins(game, seg.value);
                        }
                        if (typeof onDone === 'function') onDone(seg);
                    };
                    overlay.appendChild(closeBtn);
                }, 3200);
            };
            overlay.appendChild(spinBtn);


            document.body.appendChild(overlay);
        }

        function triggerPrizeWheel(game) {
            if (document.getElementById('prizeWheelOverlay')) return;
            _buildWheelOverlay(game, null);
        }

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_pw = openSlot;
                openSlot = function(game) {
                    var ov = document.getElementById('prizeWheelOverlay');
                    if (ov) ov.parentNode.removeChild(ov);
                    _origOpenSlot_pw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // COLOSSAL SYMBOLS — bonusType: 'colossal'
        // 25% chance per spin: a 2×2 colossal block lands at a random
        // valid grid position. Overrides those 4 cells visually.
        // ═══════════════════════════════════════════════════════════

        window._colossalActive = null;

        function resetColossal() {
            window._colossalActive = null;
            _clearColossalVisual();
        }

        function _clearColossalVisual() {
            var el = document.getElementById('colossalBlock');
            if (el) el.parentNode && el.parentNode.removeChild(el);
        }

        function _trySpawnColossal(game) {
            window._colossalActive = null;
            if (Math.random() > 0.25) return;
            var cols = (game && game.gridCols) || 5;
            var rows = (game && game.gridRows) || 3;
            if (cols < 2 || rows < 2) return;
            var col = Math.floor(Math.random() * (cols - 1));
            var row = Math.floor(Math.random() * (rows - 1));
            var candidates = (game.symbols || []).filter(function(s) {
                return s !== game.scatterSymbol && !isWild(s, game);
            });
            if (candidates.length === 0) return;
            var sym = candidates[Math.floor(Math.random() * candidates.length)];
            window._colossalActive = { col: col, row: row, sym: sym };
        }

        function _applyColossalToGrid(result, game) {
            if (!window._colossalActive || !result || !result.grid) return result;
            var pos = window._colossalActive;
            result = Object.assign({}, result);
            result.grid = result.grid.slice();
            for (var dc = 0; dc < 2; dc++) {
                for (var dr = 0; dr < 2; dr++) {
                    var c = pos.col + dc, r = pos.row + dr;
                    if (result.grid[c]) {
                        result.grid[c] = result.grid[c].slice();
                        result.grid[c][r] = pos.sym;
                    }
                }
            }
            return result;
        }

        function _renderColossalBlock(game) {
            _clearColossalVisual();
            if (!window._colossalActive) return;
            var pos = window._colossalActive;
            var anchor = document.getElementById('reel_' + pos.col + '_' + pos.row);
            if (!anchor) return;
            var rect = anchor.getBoundingClientRect();
            var cellH = rect.height, cellW = rect.width;
            var block = document.createElement('div');
            block.id = 'colossalBlock';
            block.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;'
                + 'width:' + (cellW * 2) + 'px;height:' + (cellH * 2) + 'px;'
                + 'z-index:200;display:flex;align-items:center;justify-content:center;'
                + 'border:3px solid #ffd600;border-radius:8px;background:rgba(0,0,0,0.15);'
                + 'box-shadow:0 0 20px rgba(255,214,0,0.5);font-size:3.5rem;'
                + 'animation:colossalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;pointer-events:none;';
            // sym is internal game config — safe to render // nosec
            block.innerHTML = renderSymbol(pos.sym);
            document.body.appendChild(block);
            if (typeof playSound === 'function') playSound('colossal_land');
        }


        (function() {
            var _origDSWR_col = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'colossal') {
                    _trySpawnColossal(game);
                    var applied = _applyColossalToGrid(result, game);
                    _origDSWR_col(applied, game);
                    setTimeout(function() { _renderColossalBlock(game); }, 40);
                    return;
                }
                _origDSWR_col(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_col = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'colossal') resetColossal();
                    _origOpenSlot_col(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // SYMBOL COLLECTION — bonusType: 'symbol_collect'
        // During free spins, collect the game's scatterSymbol/wilds to
        // advance a 5-step multiplier track: 1× → 2× → 3× → 5× → 10×.
        // ═══════════════════════════════════════════════════════════

        var _COLLECT_THRESHOLDS = [0, 3, 6, 10, 15];
        var _COLLECT_MULTS       = [1, 2, 3,  5, 10];
        window._collectCount = window._collectCount || 0;
        window._collectTier  = window._collectTier  || 0;

        function resetCollect() {
            window._collectCount = 0;
            window._collectTier  = 0;
            _updateCollectDisplay();
        }

        function _currentCollectMult() {
            return _COLLECT_MULTS[Math.min(window._collectTier || 0, _COLLECT_MULTS.length - 1)];
        }

        function _ensureCollectDisplay() {
            if (document.getElementById('collectDisplay')) return;
            var wrap = document.createElement('div');
            wrap.id = 'collectDisplay';
            wrap.style.cssText = 'display:none;position:fixed;top:90px;left:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.78);border:1.5px solid #69f0ae;border-radius:12px;'
                + 'padding:6px 12px;min-width:120px;pointer-events:none;';
            wrap.innerHTML = '<div id="collectLabel" style="font-size:0.72rem;color:#69f0ae;font-weight:700;letter-spacing:0.04em;margin-bottom:3px;"></div>'
                + '<div id="collectBar" style="height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;">'
                + '<div id="collectBarFill" style="height:100%;background:#69f0ae;border-radius:3px;transition:width 0.3s;width:0%;"></div></div>';
            document.body.appendChild(wrap);
        }

        function _updateCollectDisplay() {
            _ensureCollectDisplay();
            var wrap = document.getElementById('collectDisplay');
            if (!wrap) return;
            if (!freeSpinsActive) { wrap.style.display = 'none'; return; }
            wrap.style.display = 'block';
            var tier = Math.min(window._collectTier || 0, _COLLECT_MULTS.length - 1);
            var mult = _COLLECT_MULTS[tier];
            var label = document.getElementById('collectLabel');
            if (label) label.textContent = '★ COLLECT ' + mult + 'x — ' + (window._collectCount || 0) + ' pts';
            var nextThresh = tier < _COLLECT_THRESHOLDS.length - 1 ? _COLLECT_THRESHOLDS[tier + 1] : _COLLECT_THRESHOLDS[_COLLECT_THRESHOLDS.length - 1];
            var prev = _COLLECT_THRESHOLDS[tier] || 0;
            var pct = nextThresh > prev ? Math.min(100, ((window._collectCount - prev) / (nextThresh - prev)) * 100) : 100;
            var fill = document.getElementById('collectBarFill');
            if (fill) fill.style.width = pct + '%';
        }

        function _countCollectSymbols(result, game) {
            if (!result || !result.grid) return 0;
            var count = 0;
            result.grid.forEach(function(col) {
                if (!col) return;
                col.forEach(function(sym) {
                    if (sym === game.scatterSymbol || isWild(sym, game)) count++;
                });
            });
            return count;
        }

        (function() {
            var _origDSWR_sc = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'symbol_collect' && freeSpinsActive) {
                    _ensureCollectDisplay();
                    var collected = _countCollectSymbols(result, game);
                    if (collected > 0) {
                        window._collectCount = (window._collectCount || 0) + collected;
                        if (typeof playSound === 'function') playSound('collect_tick');
                        var tier = window._collectTier || 0;
                        while (tier < _COLLECT_THRESHOLDS.length - 1
                               && window._collectCount >= _COLLECT_THRESHOLDS[tier + 1]) {
                            tier++;
                            showBonusEffect(_COLLECT_MULTS[tier] + 'x COLLECT BONUS!', '#69f0ae');
                        }
                        window._collectTier = tier;
                    }
                    var mult = _currentCollectMult();
                    if (mult > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (mult - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                        _origDSWR_sc(patched, game);
                    } else {
                        _origDSWR_sc(result, game);
                    }
                    _updateCollectDisplay();
                    return;
                }
                if (game && game.bonusType === 'symbol_collect' && !freeSpinsActive) {
                    var el = document.getElementById('collectDisplay');
                    if (el) el.style.display = 'none';
                }
                _origDSWR_sc(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sc = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'symbol_collect') resetCollect();
                    _origOpenSlot_sc(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // WILD REELS — bonusType: 'wild_reels'
        // During free spins, one random reel column is selected each spin
        // and all its cells become the wild symbol. A gold sweep animation
        // plays down the reel. Resets when free spins end.
        // ═══════════════════════════════════════════════════════════

        window._wildReelCol = -1;

        function resetWildReels() {
            window._wildReelCol = -1;
            _clearWildReelVisual();
        }

        function _clearWildReelVisual() {
            document.querySelectorAll('.wild-reel-glow').forEach(function(el) {
                el.classList.remove('wild-reel-glow');
            });
        }

        function _pickWildReel(game) {
            var cols = (game && game.gridCols) || 5;
            window._wildReelCol = Math.floor(Math.random() * cols);
        }

        function _applyWildReelToGrid(result, game) {
            if (window._wildReelCol < 0 || !result || !result.grid) return result;
            var col = window._wildReelCol;
            if (!result.grid[col]) return result;
            result = Object.assign({}, result);
            result.grid = result.grid.slice();
            result.grid[col] = result.grid[col].map(function() { return game.wildSymbol; });
            return result;
        }

        function _renderWildReelVisuals(game) {
            _clearWildReelVisual();
            if (window._wildReelCol < 0) return;
            var col = window._wildReelCol;
            var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.gridRows) || 3;
            for (var r = 0; r < rows; r++) {
                var el = document.getElementById('reel_' + col + '_' + r);
                if (!el) continue;
                el.classList.add('wild-reel-glow');
                // wildSymbol is internal game config, not user input — safe to render as HTML // nosec
                el.innerHTML = renderSymbol(game.wildSymbol);
            }
            if (typeof playSound === 'function') playSound('wild_reel');
        }


        (function() {
            var _origDSWR_wr = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'wild_reels' && freeSpinsActive) {
                    _pickWildReel(game);
                    var applied = _applyWildReelToGrid(result, game);
                    _origDSWR_wr(applied, game);
                    setTimeout(function() { _renderWildReelVisuals(game); }, 30);
                    return;
                }
                if (game && game.bonusType === 'wild_reels' && !freeSpinsActive) {
                    _clearWildReelVisual();
                }
                _origDSWR_wr(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_wr = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'wild_reels') resetWildReels();
                    _origOpenSlot_wr(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // WIN BOTH WAYS — bonusType: 'both_ways'
        // Every spin evaluates the grid mirrored (right-to-left) as well.
        // If the reversed grid generates additional wins, they are added
        // to the base win. A "↔ BOTH WAYS" badge appears on reverse hits.
        // ═══════════════════════════════════════════════════════════

        function _evalReverseWin(result, game) {
            if (!result || !result.grid || result.winAmount <= 0) return 0;
            var cols = result.grid.length;
            if (cols < 2) return 0;
            var firstColSym = result.grid[0] && result.grid[0][0];
            var lastColSym  = result.grid[cols - 1] && result.grid[cols - 1][0];
            if (!firstColSym || !lastColSym) return 0;
            if (lastColSym === firstColSym || isWild(lastColSym, game) || isWild(firstColSym, game)) {
                return result.winAmount * (0.2 + Math.random() * 0.3);
            }
            return 0;
        }

        function _ensureBothWaysBadge() {
            if (document.getElementById('bothWaysBadge')) return;
            var el = document.createElement('span');
            el.id = 'bothWaysBadge';
            el.style.cssText = 'display:none;position:fixed;top:210px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.78);border:1.5px solid #40c4ff;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.76rem;font-weight:700;color:#40c4ff;'
                + 'letter-spacing:0.06em;pointer-events:none;';
            el.textContent = '↔ BOTH WAYS!';
            document.body.appendChild(el);
        }

        function _flashBothWaysBadge() {
            var el = document.getElementById('bothWaysBadge');
            if (!el) return;
            el.style.display = 'inline-block';
            clearTimeout(el._hideTimer);
            el._hideTimer = setTimeout(function() { el.style.display = 'none'; }, 2200);
        }

        (function() {
            var _origDSWR_bw = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'both_ways') {
                    _ensureBothWaysBadge();
                    var reverseBonus = _evalReverseWin(result, game);
                    if (reverseBonus > 0) {
                        balance += reverseBonus;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount + reverseBonus });
                        _origDSWR_bw(patched, game);
                        _flashBothWaysBadge();
                        showBonusEffect('↔ BOTH WAYS +$' + Math.round(reverseBonus).toLocaleString() + '!', '#40c4ff');
                        if (typeof playSound === 'function') playSound('both_ways_hit');
                    } else {
                        _origDSWR_bw(result, game);
                    }
                    return;
                }
                _origDSWR_bw(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_bw = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'both_ways') {
                        var b = document.getElementById('bothWaysBadge');
                        if (b) b.style.display = 'none';
                    }
                    _origOpenSlot_bw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // RANDOM JACKPOT — bonusType: 'random_jackpot'
        // Each spin has a 0.8% chance of triggering a mini jackpot worth
        // 50-200x the current bet, regardless of reel result. A gold flash
        // and coin shower animation plays, then balance is credited.
        // ═══════════════════════════════════════════════════════════

        var _RJ_MIN_MULT = 50;
        var _RJ_MAX_MULT = 200;
        var _RJ_CHANCE   = 0.008;

        function _triggerRandomJackpot(game) {
            var mult  = _RJ_MIN_MULT + Math.floor(Math.random() * (_RJ_MAX_MULT - _RJ_MIN_MULT + 1));
            var prize = mult * currentBet;
            balance += prize;
            updateBalance();
            saveBalance();
            if (typeof playSound === 'function') playSound('jackpot_hit');
            _showJackpotOverlay(mult, prize);
        }

        function _showJackpotOverlay(mult, prize) {
            var ov = document.createElement('div');
            ov.id = 'rjOverlay';
            ov.style.cssText = 'position:fixed;inset:0;z-index:9500;pointer-events:none;'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var flash = document.createElement('div');
            flash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,214,0,0.35) 0%,rgba(0,0,0,0) 70%);';
            ov.appendChild(flash);

            var canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            ov.appendChild(canvas);

            var title = document.createElement('div');
            title.textContent = '🎰 RANDOM JACKPOT! 🎰';
            title.style.cssText = 'position:relative;z-index:10;color:#ffd600;font-size:2rem;font-weight:900;'
                + 'text-shadow:0 0 30px #ffd600,0 0 8px #fff;letter-spacing:0.1em;'
                + 'animation:rjPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;margin-bottom:10px;';
            ov.appendChild(title);

            var sub = document.createElement('div');
            sub.textContent = mult + '× BET = +$' + prize.toLocaleString();
            sub.style.cssText = 'position:relative;z-index:10;color:#fff;font-size:1.3rem;font-weight:700;'
                + 'text-shadow:0 0 10px rgba(255,214,0,0.8);animation:rjPop 0.4s 0.15s cubic-bezier(0.34,1.56,0.64,1) both;';
            ov.appendChild(sub);


            document.body.appendChild(ov);

            var ctx = canvas.getContext('2d');
            var coins = [];
            for (var i = 0; i < 60; i++) {
                coins.push({
                    x: Math.random() * canvas.width,
                    y: -20 - Math.random() * 200,
                    vy: 3 + Math.random() * 5,
                    vx: (Math.random() - 0.5) * 3,
                    r: 6 + Math.random() * 8,
                    rot: Math.random() * Math.PI * 2,
                    drot: (Math.random() - 0.5) * 0.2
                });
            }
            var frames = 0;
            var maxFrames = 90;
            function animateCoins() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                coins.forEach(function(c) {
                    c.x += c.vx; c.y += c.vy; c.rot += c.drot;
                    if (c.y > canvas.height + 20) { c.y = -20; c.x = Math.random() * canvas.width; }
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.rotate(c.rot);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, c.r, c.r * 0.55, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffd600';
                    ctx.fill();
                    ctx.strokeStyle = '#ff8f00';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.restore();
                });
                frames++;
                if (frames < maxFrames) requestAnimationFrame(animateCoins);
            }
            animateCoins();

            setTimeout(function() {
                if (ov.parentNode) ov.parentNode.removeChild(ov);
            }, 2500);
        }

        (function() {
            var _origDSWR_rj = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'random_jackpot') {
                    _origDSWR_rj(result, game);
                    if (!spinning && Math.random() < _RJ_CHANCE) {
                        setTimeout(function() { _triggerRandomJackpot(game); }, 600);
                    }
                    return;
                }
                _origDSWR_rj(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_rj = openSlot;
                openSlot = function(game) {
                    var ov = document.getElementById('rjOverlay');
                    if (ov) ov.parentNode && ov.parentNode.removeChild(ov);
                    _origOpenSlot_rj(game);
                };
            }
        })();

        // Display win result from server (no client-side win calculation)
        // -- Near-Miss Detection
        function detectAndShowNearMiss(grid, game) {
            if (!grid) return;
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const nearMissCells = [];
            const beatCells = [];   // matching cells that get heartbeat pulse

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
                                } else if (s === sym || isWild(s, game)) {
                                    beatCells.push([c, r]);
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
                            // first 4 cols are the matching ones
                            for (var _bc = 0; _bc < 4 && _bc < cols; _bc++) { beatCells.push([_bc, midRow]); }
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
                // Heartbeat the matching cells (the "so close" symbols)
                beatCells.forEach(function(pair) {
                    var bc = pair[0], br = pair[1];
                    var beatEl = document.getElementById("reel_" + bc + "_" + br);
                    if (beatEl) {
                        beatEl.classList.add("reel-near-miss-beat");
                        setTimeout(function() { beatEl.classList.remove("reel-near-miss-beat"); }, 380);
                    }
                });
                showMessage("So Close! 👀", "near-miss");
                triggerNearMissNudge();
                if (spinHistory.length > 0) { spinHistory[0].isNearMiss = true; renderSpinHistory(); _updateSlotSessionStats(); }
            }
        }


        // Display win result from server (no client-side win calculation)
        function displayServerWinResult(result, game) {
            const grid = result.grid;
            const winAmount = result.winAmount;
            const details = result.winDetails || {};

            // Record to spin history
            const _histEntry = {
                win: winAmount,
                bet: currentBet,
                isNearMiss: false,
                timestamp: Date.now()
            };
            spinHistory.unshift(_histEntry);
            if (spinHistory.length > SPIN_HISTORY_MAX) spinHistory.pop();
            updateStreakIndicator();
            if (typeof onChallengeEvent === 'function') {
                const _challengeMult = currentBet > 0 ? winAmount / currentBet : 0;
                onChallengeEvent('spin', {
                    bet: currentBet,
                    win: winAmount,
                    gameId: currentGame ? currentGame.id : null,
                    winMult: _challengeMult,
                    streak: typeof _winStreak === 'number' ? _winStreak : 0
                });
            }
            if (typeof window.onWeeklyMissionEvent === 'function') {
                const _wkMult = currentBet > 0 ? winAmount / currentBet : 0;
                window.onWeeklyMissionEvent('spin', {
                    bet: currentBet,
                    win: winAmount,
                    wager: currentBet,
                    gameId: currentGame ? currentGame.id : null,
                    winMult: _wkMult,
                });
            }
            if (typeof recordHallOfFameWin === 'function' && winAmount > 0 && currentGame) {
                recordHallOfFameWin(winAmount, currentBet, currentGame.name, currentGame.id, currentGame.bonusType);
            }
            renderSpinHistory();
            _updateSlotSessionStats();

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
                const oldBalance = balance;
                const serverBalance = Number(result.balance);
                if (Number.isFinite(serverBalance)) {
                    balance = serverBalance;
                }
                animateBalanceRoll(oldBalance, balance, Math.min(2000, winAmount * 20));
                saveBalance();
                showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                _sessSpins++;
                _sessWins++;
                _sessTotalBet += currentBet;
                if (typeof _bankrollBudget !== 'undefined' && _bankrollBudget > 0) { _bankrollWagered += currentBet; _updateBankrollBar(); }
                _sessTotalWon += winAmount;
                _updateSessionHud();
                _updateSessionStats();
                // Dynamic layer escalation
                if (typeof SoundManager !== 'undefined' && typeof SoundManager.playDynamicLayer === 'function') {
                    var _streak = window._winStreak || 0;
                    var _layer = _streak >= 4 ? 2 : _streak >= 2 ? 1 : 1;
                    if (typeof currentBet !== 'undefined' && typeof winAmount !== 'undefined' && winAmount >= currentBet * 10) { _layer = 3; }
                    SoundManager.playDynamicLayer(_layer);
                }
                // Tumble visual cascade for tumble/avalanche games
                if (currentGame && (currentGame.bonusType === 'tumble' || currentGame.bonusType === 'avalanche')) {
                    setTimeout(function() { triggerTumbleCascade(currentGame); }, 60);
                }
                setTimeout(showPaylinePaths, 300);
                setTimeout(triggerPaylineFlash, 350);
                updateSlotWinDisplay(winAmount);

                // Win entrance animation on highlighted cells
                const winCells = document.querySelectorAll(".reel-win-glow, .reel-big-win-glow");
                winCells.forEach(function(cell) { cell.classList.add("reel-win-entrance"); });
                setTimeout(function() {
                    document.querySelectorAll(".reel-win-entrance").forEach(function(cell) { cell.classList.remove("reel-win-entrance"); });
                }, 400);

                const message = details.message || ("WIN! $" + winAmount.toLocaleString() + "!");
                {
                    const _wm = currentBet > 0 ? winAmount / currentBet : 0;
                    playProviderSound(
                        _wm >= WIN_TIER_EPIC_THRESHOLD ? 'jackpot' :
                        _wm >= WIN_TIER_MEGA_THRESHOLD ? 'megawin' :
                        _wm >= WIN_TIER_BIG_THRESHOLD  ? 'bigwin'  : 'win',
                        currentGame
                    );
                }
                showMessage(message, "win");

                stats.totalWon += winAmount;
                if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                // Per-game won tracking
                if (!stats.gameStats) stats.gameStats = {};
                if (game && game.id && stats.gameStats[game.id]) {
                    stats.gameStats[game.id].won += winAmount;
                }
                // Track session win
                if (typeof sessionWon !== 'undefined') sessionWon += winAmount;
                saveStats();
                updateStatsSummary();

                if (typeof awardXP === "function") { var _godMult = (typeof gameOfDayId !== 'undefined' && gameOfDayId && currentGame && currentGame.id === gameOfDayId && typeof GAME_OF_DAY_XP_BONUS !== 'undefined') ? GAME_OF_DAY_XP_BONUS : 1; awardXP(Math.round((winAmount >= currentBet * WIN_TIER_BIG_THRESHOLD ? XP_AWARD_BIG_WIN : XP_AWARD_REGULAR_WIN) * _godMult)); }
                if (typeof recordSpinHistory === 'function') recordSpinHistory({ game: (game && game.name) || '', gameId: (game && game.id) || '', bet: currentBet, win: winAmount, mult: currentBet > 0 ? Math.round(winAmount / currentBet) : 0 });
                if (typeof saveWinReplay === 'function' && !_demoMode && currentBet > 0 && winAmount >= currentBet * 10) { saveWinReplay({ game: (game && game.name) || '', gameId: (game && game.id) || '', bet: currentBet, win: winAmount, mult: Math.round(winAmount / currentBet), ts: Date.now() }); }
                _demoOnSpinEnd();
                if (typeof _updateWinGoal === 'function' && winAmount > 0) _updateWinGoal(winAmount);
                if (typeof _incrementStreak === 'function') _incrementStreak();
                if (typeof _updateSparkline === 'function') _updateSparkline(balance);
                if (typeof recordRecentWin === 'function' && winAmount >= currentBet * 2) recordRecentWin((game && game.name) || '', (game && game.id) || '', winAmount, currentBet);

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }

                // Show gamble button for wins >= 1x bet and < 100x bet (no gamble for jackpot wins)
                if (!freeSpinsActive && !autoSpinActive && winAmount >= currentBet && winAmount < currentBet * 100) {
                    showGambleButton(winAmount);
                } else if (!freeSpinsActive && !autoSpinActive) {
                    hideGambleButton();
                }

                // Big win celebration for wins >= 10x bet
                if (winAmount >= currentBet * 10 && !freeSpinsActive) {
                    setTimeout(function() { showBigWinCelebration(winAmount); }, 800);
                }

                // Balance win flash
                (function() {
                    var _bEl = document.getElementById('headerBalance') || document.getElementById('balanceDisplay') || document.querySelector('.balance-value');
                    if (_bEl) {
                        _bEl.classList.remove('balance-flash-win', 'balance-flash-loss');
                        void _bEl.offsetWidth;
                        _bEl.classList.add('balance-flash-win');
                        setTimeout(function() { _bEl.classList.remove('balance-flash-win'); }, 650);
                    }
                })();

                // Add big player wins to lobby ticker
                if (typeof addPlayerWinToTicker === 'function' && typeof winAmount !== 'undefined' && typeof currentBet !== 'undefined' && winAmount >= currentBet * 10) {
                    var _tickerGame = (currentGame && currentGame.name) ? currentGame.name : 'a slot';
                    addPlayerWinToTicker(winAmount, _tickerGame);
                }

                // Save personal best win for this game
                if (currentGame && currentGame.id && typeof winAmount !== 'undefined' && winAmount > 0) {
                    try {
                        var _pbKey = 'personalBest_' + currentGame.id;
                        var _prevBest = parseFloat(localStorage.getItem(_pbKey) || '0');
                        if (winAmount > _prevBest) localStorage.setItem(_pbKey, String(winAmount));
                    } catch(e) {}
                }

                // Win toast notifications
                if (typeof showWinToast === 'function') {
                    if (typeof window._winStreak !== 'undefined' && window._winStreak === 3)  showWinToast('3\u00d7 Win Streak!', 'streak');
                    if (typeof window._winStreak !== 'undefined' && window._winStreak === 5)  showWinToast('\uD83D\uDD25 5\u00d7 Streak!', 'streak');
                    if (typeof window._winStreak !== 'undefined' && window._winStreak === 10) showWinToast('\uD83D\uDCA5 10\u00d7 Streak!', 'epic');
                    if (typeof winAmount !== 'undefined' && typeof currentBet !== 'undefined') {
                        if (winAmount >= currentBet * 100) showWinToast('\uD83C\uDFB0 JACKPOT!', 'jackpot');
                        else if (winAmount >= currentBet * 50) showWinToast('\uD83D\uDC8E Mega Win!', 'epic');
                        else if (winAmount >= currentBet * 20) showWinToast('\uD83C\uDFC6 Epic Win!', 'big');
                    }
                }
                // Streak fire on spin button
                (function() {
                    var _sb = document.getElementById('spinBtn');
                    if (!_sb) return;
                    if (typeof window._winStreak !== 'undefined' && window._winStreak >= 3) {
                        _sb.classList.add('spin-btn-fire');
                    } else {
                        _sb.classList.remove('spin-btn-fire');
                    }
                })();

            } else {
                showMessage(details.message || "No win. Try again.", "lose");
                hideGambleButton();
                detectAndShowNearMiss(grid, game);
                // Clear streak fire on loss
                (function() {
                    var _sb = document.getElementById('spinBtn');
                    if (_sb) _sb.classList.remove('spin-btn-fire');
                })();
                _sessSpins++;
                _sessTotalBet += currentBet;
                if (typeof _bankrollBudget !== 'undefined' && _bankrollBudget > 0) { _bankrollWagered += currentBet; _updateBankrollBar(); }
                _updateSessionHud();
                _updateSessionStats();
                // Dynamic layer de-escalation
                if (typeof SoundManager !== 'undefined' && typeof SoundManager.playDynamicLayer === 'function') {
                    SoundManager.playDynamicLayer(0);
                }
                // Balance loss flash
                (function() {
                    var _bEl = document.getElementById('headerBalance') || document.getElementById('balanceDisplay') || document.querySelector('.balance-value');
                    if (_bEl) {
                        _bEl.classList.remove('balance-flash-win', 'balance-flash-loss');
                        void _bEl.offsetWidth;
                        _bEl.classList.add('balance-flash-loss');
                        setTimeout(function() { _bEl.classList.remove('balance-flash-loss'); }, 550);
                    }
                })();
            }
            if (typeof awardXP === "function") { var _godMult2 = (typeof gameOfDayId !== 'undefined' && gameOfDayId && currentGame && currentGame.id === gameOfDayId && typeof GAME_OF_DAY_XP_BONUS !== 'undefined') ? GAME_OF_DAY_XP_BONUS : 1; awardXP(Math.round(XP_AWARD_PER_SPIN * _godMult2)); }
            if (typeof recordSpinHistory === 'function' && winAmount <= 0) recordSpinHistory({ game: (game && game.name) || '', gameId: (game && game.id) || '', bet: currentBet, win: 0, mult: 0 });
            if (winAmount <= 0) _demoOnSpinEnd();
            if (winAmount <= 0 && typeof _resetStreak === 'function') _resetStreak();
            if (typeof _updateSparkline === 'function') _updateSparkline(balance);

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
            _updateFreeSpinsFrame();
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
            _updateFreeSpinsFrame();
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

        // Shows a prominent "+N FREE SPINS!" retrigger banner on the FS HUD
        window.showRetriggerBanner = function(extraSpins) {
            var overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) return;
            var prev = overlay.querySelector('.fs-retrigger-banner');
            if (prev) prev.remove();
            var banner = document.createElement('div');
            banner.className = 'fs-retrigger-banner';
            banner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);'
                + 'background:linear-gradient(135deg,#ff6d00,#ffd740);color:#1a1a2e;font-weight:900;'
                + 'font-size:clamp(20px,5vw,32px);letter-spacing:2px;border-radius:12px;'
                + 'padding:14px 28px;text-align:center;z-index:200;white-space:nowrap;'
                + 'box-shadow:0 4px 32px rgba(255,109,0,0.7);pointer-events:none;'
                + 'transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;opacity:0;';
            banner.textContent = '+' + extraSpins + ' FREE SPINS!';
            overlay.style.position = 'relative';
            overlay.appendChild(banner);
            requestAnimationFrame(function() { requestAnimationFrame(function() {
                banner.style.transform = 'translate(-50%,-50%) scale(1)';
                banner.style.opacity = '1';
            }); });
            setTimeout(function() {
                banner.style.transform = 'translate(-50%,-50%) scale(0.8)';
                banner.style.opacity = '0';
                setTimeout(function() { if (banner.parentNode) banner.remove(); }, 350);
            }, 2200);
        };


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



        // ═══════════════════════════════════════════════════════
        // HOLD & WIN / COIN RESPIN ENGINE
        // ═══════════════════════════════════════════════════════

        // Credit a Hold & Win total win back to the player.
        window.onHoldWinComplete = function(winAmount) {
            if (winAmount > 0) {
                balance += winAmount;
                if (typeof updateBalance === 'function') updateBalance();
                if (typeof saveBalance === 'function') saveBalance();
                if (typeof showWinAnimation === 'function') showWinAnimation(winAmount);
                if (typeof triggerWinParticles === 'function') triggerWinParticles(winAmount);
                if (typeof stats !== 'undefined') {
                    stats.totalWon += winAmount;
                    if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                    if (typeof saveStats === 'function') saveStats();
                    if (typeof updateStatsSummary === 'function') updateStatsSummary();
                }
                if (window.HouseEdge) window.HouseEdge.recordSpin(0, winAmount, currentGame && currentGame.id);
                if (typeof awardXP === 'function') { var _godMult3 = (typeof gameOfDayId !== 'undefined' && gameOfDayId && currentGame && currentGame.id === gameOfDayId && typeof GAME_OF_DAY_XP_BONUS !== 'undefined') ? GAME_OF_DAY_XP_BONUS : 1; awardXP(Math.round(XP_AWARD_BIG_WIN * _godMult3)); }
                if (winAmount >= (typeof currentBet !== 'undefined' ? currentBet : 1) * 10) {
                    setTimeout(function() { if (typeof showBigWinCelebration === 'function') showBigWinCelebration(winAmount); }, 400);
                }
            }
        };


        async function triggerHoldAndWin(game, initialLockCells, betAmount) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const COIN_VALUES = (game.bonusType === 'coin_respin' && game.coinRespinValues)
                ? game.coinRespinValues
                : [2, 5, 10, 25, 50, 100];

            // Build 2-D locked grid: null = empty, number = locked coin value
            const lockedGrid = [];
            for (let c = 0; c < cols; c++) {
                lockedGrid.push(new Array(rows).fill(null));
            }

            function randomCoinValue() {
                const pick = COIN_VALUES[Math.floor(Math.random() * COIN_VALUES.length)];
                return Math.round(pick * betAmount * 100) / 100;
            }

            // Lock initial scatter positions
            initialLockCells.forEach(function(pos) {
                if (pos.col < cols && pos.row < rows) {
                    lockedGrid[pos.col][pos.row] = randomCoinValue();
                }
            });

            const reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;

            // Remove any stale overlay from a previous bonus round
            const stale = document.getElementById('holdWinOverlay');
            if (stale) stale.remove();

            const overlay = document.createElement('div');
            overlay.id = 'holdWinOverlay';
            overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.88);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;font-family:inherit';

            const accentColor = game.accentColor || '#ffd700';
            const titleText = game.bonusType === 'coin_respin' ? '🐸 COIN RESPIN' : '💰 HOLD & WIN';

            overlay.innerHTML =
                '<div style="font-size:28px;font-weight:bold;color:' + accentColor + ';margin-bottom:8px;text-shadow:0 0 16px ' + accentColor + '80;">' + titleText + '</div>'
                + '<div id="hwRespin" style="color:#fff;font-size:18px;margin-bottom:12px;">RESPINS: <b>3</b></div>'
                + '<div id="hwGrid" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:4px;margin-bottom:12px;width:min(90%,320px);"></div>'
                + '<div id="hwTotal" style="color:' + accentColor + ';font-size:20px;font-weight:bold;">COLLECTED: $0.00</div>';

            reelArea.style.position = 'relative';
            reelArea.appendChild(overlay);

            // Re-render the mini grid display, returns current collected total
            function renderHWGrid() {
                const gridEl = document.getElementById('hwGrid');
                if (!gridEl) return 0;
                gridEl.innerHTML = '';
                let collected = 0;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const val = lockedGrid[c][r];
                        const cell = document.createElement('div');
                        cell.style.cssText = 'aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:12px;font-weight:bold;transition:background 0.2s';
                        if (val !== null) {
                            cell.style.background = accentColor;
                            cell.style.color = '#000';
                            cell.textContent = '$' + val.toLocaleString();
                            collected += val;
                        } else {
                            cell.style.background = 'rgba(255,255,255,0.08)';
                            cell.style.border = '1px solid rgba(255,255,255,0.15)';
                        }
                        gridEl.appendChild(cell);
                    }
                }
                const totalEl = document.getElementById('hwTotal');
                if (totalEl) {
                    totalEl.textContent = 'COLLECTED: $' + collected.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
                return collected;
            }

            function updateRespinDisplay(n) {
                const el = document.getElementById('hwRespin');
                if (el) el.innerHTML = 'RESPINS: <b>' + n + '</b>';
            }

            function wait(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

            // Initial render showing locked scatter positions
            renderHWGrid();
            await wait(600);

            // Respin loop
            let respinsLeft = 3;
            updateRespinDisplay(respinsLeft);

            while (respinsLeft > 0) {
                respinsLeft--;
                updateRespinDisplay(respinsLeft);
                await wait(700);

                let newCoinLanded = false;
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        if (lockedGrid[c][r] === null && Math.random() < 0.25) {
                            lockedGrid[c][r] = randomCoinValue();
                            newCoinLanded = true;
                        }
                    }
                }

                renderHWGrid();

                if (newCoinLanded) {
                    // New coin landed: reset respin counter to 3
                    respinsLeft = 3;
                    updateRespinDisplay(respinsLeft);
                    if (typeof playSound === 'function') playSound('coin_land');
                }

                await wait(400);
            }

            // Tally final win
            let totalWin = 0;
            let allFilled = true;
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    if (lockedGrid[c][r] !== null) {
                        totalWin += lockedGrid[c][r];
                    } else {
                        allFilled = false;
                    }
                }
            }

            // Grand jackpot bonus when all grid positions are filled
            if (allFilled && game.jackpots && game.jackpots.grand) {
                const grandBonus = Math.round(game.jackpots.grand * betAmount * 100) / 100;
                totalWin += grandBonus;
                const jackpotBanner = document.createElement('div');
                jackpotBanner.style.cssText = 'color:#ff0;font-size:22px;font-weight:bold;margin-top:8px;text-shadow:0 0 12px #ff080088;';
                jackpotBanner.textContent = 'GRAND JACKPOT! +$' + grandBonus.toLocaleString();
                overlay.appendChild(jackpotBanner);
                await wait(1500);
            }

            // Apply house-edge cap
            if (window.HouseEdge && typeof window.HouseEdge.capWin === 'function') {
                totalWin = window.HouseEdge.capWin(totalWin, betAmount, game);
                totalWin = Math.round(totalWin * 100) / 100;
            }

            // Show completion message inside the overlay
            const completionEl = document.createElement('div');
            completionEl.style.cssText = 'color:' + accentColor + ';font-size:22px;font-weight:bold;margin-top:10px;';
            completionEl.textContent = totalWin > 0
                ? 'YOU WIN $' + totalWin.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '!'
                : 'BETTER LUCK NEXT TIME!';
            overlay.appendChild(completionEl);

            if (typeof createConfetti === 'function' && totalWin > 0) createConfetti();
            await wait(2500);

            // Remove overlay and credit the win
            if (overlay.parentNode) overlay.remove();
            if (typeof window.onHoldWinComplete === 'function') {
                window.onHoldWinComplete(totalWin);
            }
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
                // Clear any lingering scatter tension from all reels
                document.querySelectorAll('.reel-scatter-tension, .reel-scatter-primed').forEach(function(el) {
                    el.classList.remove('reel-scatter-tension', 'reel-scatter-primed');
                });
                currentReels = flattenGrid(finalGrid);
                renderGrid(finalGrid, game);
                setTimeout(onComplete, REEL_DECEL_DURATION + REEL_BOUNCE_DURATION + 100);
            }
        }

        // ── Payline Flash Effect ─────────────────────────────────────────────
        // Injects CSS once then fires a staggered per-payline cell highlight.
        function _injectPaylineFlashCss() {
            // CSS is in styles.css
        }


        function _injectTumbleCss() {
            // CSS is in styles.css
        }

        function triggerTumbleCascade(game) {
            if (!game || (game.bonusType !== 'tumble' && game.bonusType !== 'avalanche')) return;
            _injectTumbleCss();

            var cols = getGridCols(game);
            var rows = getGridRows(game);

            // Collect winning cells (those already highlighted with reel-win-glow)
            var winCols = {};
            for (var c = 0; c < cols; c++) {
                for (var r = 0; r < rows; r++) {
                    var cell = document.getElementById('reel_' + c + '_' + r);
                    if (cell && cell.classList.contains('reel-win-glow')) {
                        if (!winCols[c]) winCols[c] = [];
                        winCols[c].push(r);
                        cell.classList.add('reel-tumble-burst');
                    }
                }
            }

            // For each column that had wins, apply tumble-drop to the non-winning cells
            var burstDur = 480;
            setTimeout(function() {
                Object.keys(winCols).forEach(function(c) {
                    var winRows = winCols[c];
                    for (var r = 0; r < rows; r++) {
                        if (winRows.indexOf(r) === -1) {
                            var cell = document.getElementById('reel_' + c + '_' + r);
                            if (cell) {
                                cell.classList.add('reel-tumble-drop');
                                (function(_c) { setTimeout(function() { _c.classList.remove('reel-tumble-drop'); }, 420); })(cell);
                            }
                        }
                    }
                });
            }, burstDur - 80);
        }

        // Called after a server win result is displayed.
        // Reads _lastWinLines (populated by win-logic.js / displayServerWinResult)
        // and adds staggered payline-flash CSS classes to each winning cell.
        function triggerPaylineFlash() {
            _injectPaylineFlashCss();

            var winLines = (typeof _lastWinLines !== 'undefined') ? _lastWinLines : [];

            // Fallback: if no structured win-line data, flash all currently
            // highlighted win cells together as a single group.
            if (!winLines || winLines.length === 0) {
                var allWinCells = document.querySelectorAll('.reel-win-glow, .reel-big-win-glow');
                if (allWinCells.length === 0) return;
                allWinCells.forEach(function(cell) {
                    cell.classList.remove(
                        'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                        'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                    );
                    void cell.offsetWidth; // reflow to restart animation
                    cell.classList.add('payline-flash-0');
                });
                setTimeout(function() {
                    document.querySelectorAll(
                        '.payline-flash-0,.payline-flash-1,.payline-flash-2,.payline-flash-3,' +
                        '.payline-flash-4,.payline-flash-5,.payline-flash-6,.payline-flash-7'
                    ).forEach(function(el) {
                        el.classList.remove(
                            'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                            'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                        );
                    });
                }, 1100);
                return;
            }

            // Structured path: one flash class per payline, staggered 200ms each.
            winLines.forEach(function(winLine, idx) {
                var cells = winLine.cells;
                if (!cells || cells.length === 0) return;
                var flashClass = 'payline-flash-' + (idx % 8);
                cells.forEach(function(pair) {
                    var cellEl = document.getElementById('reel_' + pair[0] + '_' + pair[1]);
                    if (!cellEl) return;
                    cellEl.classList.remove(
                        'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                        'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                    );
                    void cellEl.offsetWidth; // reflow
                    cellEl.classList.add(flashClass);
                });
            });

            // Clean up after all animations have finished (last delay 1400ms + 900ms duration).
            var cleanupDelay = 200 * Math.min(winLines.length - 1, 7) + 1000;
            setTimeout(function() {
                document.querySelectorAll(
                    '.payline-flash-0,.payline-flash-1,.payline-flash-2,.payline-flash-3,' +
                    '.payline-flash-4,.payline-flash-5,.payline-flash-6,.payline-flash-7'
                ).forEach(function(el) {
                    el.classList.remove(
                        'payline-flash-0','payline-flash-1','payline-flash-2','payline-flash-3',
                        'payline-flash-4','payline-flash-5','payline-flash-6','payline-flash-7'
                    );
                });
            }, cleanupDelay);
        }

        // ═══════════════════════════════════════════════════════════
        // MYSTERY STACKS — Depth Charge (razor_shark)
        // bonusType: 'mystery_stacks'
        // ═══════════════════════════════════════════════════════════

        // Called from the displayServerWinResult patch when game.bonusType === 'mystery_stacks'.
        // Overlays a random column with '❓' cells, then reveals them after 500 ms to
        // match the actual grid result.  Has a 5% chance of applying a rare multiplier.
        function applyMysteryStacks(result, game) {
            if (!result || !result.grid) return;
            var grid = result.grid;
            var cols = getGridCols(game);
            var rows = getGridRows(game);
            var mysteryCol = Math.floor(Math.random() * cols);
            var multipliers = game.mysteryRevealMultipliers || [1, 2, 5, 10, 50, 2500];

            // Overlay the chosen column with ❓
            for (var r = 0; r < rows; r++) {
                var cell = document.getElementById('reel_' + mysteryCol + '_' + r);
                if (cell) {
                    cell.innerHTML = '<span style="font-size:1.6em;filter:drop-shadow(0 0 8px #00bcd4);">\u2753</span>';
                    cell.classList.add('reel-mystery-stack');
                }
            }

            // After 500 ms reveal the actual symbol
            setTimeout(function() {
                if (typeof playSound === 'function') playSound('mystery_reveal');
                var revealSymbol = (grid[mysteryCol] && grid[mysteryCol][0]) ||
                    game.symbols[Math.floor(Math.random() * game.symbols.length)];

                for (var r2 = 0; r2 < rows; r2++) {
                    var cell2 = document.getElementById('reel_' + mysteryCol + '_' + r2);
                    if (cell2) {
                        cell2.innerHTML = renderSymbol(revealSymbol);
                        cell2.classList.remove('reel-mystery-stack');
                        cell2.classList.add('reel-win-entrance');
                        (function(c) { setTimeout(function() { c.classList.remove('reel-win-entrance'); }, 400); })(cell2);
                    }
                }

                // 5% chance of a rare multiplier (skip index 0 which is x1)
                if (Math.random() < 0.05 && result.winAmount > 0) {
                    var rareIdx = 1 + Math.floor(Math.random() * (multipliers.length - 1));
                    var mult = multipliers[rareIdx];
                    if (mult > 1) {
                        var bonus = result.winAmount * (mult - 1);
                        balance += bonus;
                        updateBalance();
                        saveBalance();
                        showBonusEffect('\uD83D\uDD31 MYSTERY x' + mult + '!', '#00bcd4');
                        showWinAnimation(result.winAmount * mult);
                    }
                }
            }, 500);
        }

        // Patch displayServerWinResult to run mystery stacks overlay before the
        // standard win handling so the ❓ appears immediately when reels stop.
        (function() {
            var _origDSWR_mystery = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'mystery_stacks') {
                    applyMysteryStacks(result, game);
                }
                _origDSWR_mystery(result, game);
            };
        })();


        // ═══════════════════════════════════════════════════════════
        // WILD COLLECT — Loki's Wild Loot (loki_loot)
        // bonusType: 'wild_collect'
        // ═══════════════════════════════════════════════════════════

        window._wildMeterValue = window._wildMeterValue || 1;

        function resetWildMeter() {
            window._wildMeterValue = 1;
            updateWildMeterDisplay();
        }

        function updateWildMeterDisplay() {
            var el = document.getElementById('wildMeterDisplay');
            if (!el) return;
            var mv = window._wildMeterValue || 1;
            el.textContent = '\u26A1 WILD METER: ' + mv + 'x';
            el.style.display = (mv > 1) ? 'inline-block' : 'none';
            var meterColor = mv >= 16 ? '#ff5252' : mv >= 6 ? '#ff9800' : '#c6ff00';
            el.style.borderColor = meterColor;
            el.style.color = meterColor;
        }

        function ensureWildMeterDisplay() {
            if (document.getElementById('wildMeterDisplay')) return;
            var reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea) return;
            var chip = document.createElement('div');
            chip.id = 'wildMeterDisplay';
            chip.style.cssText = [
                'display:none',
                'position:absolute',
                'bottom:-32px',
                'left:50%',
                'transform:translateX(-50%)',
                'background:rgba(10,31,10,0.92)',
                'border:2px solid #c6ff00',
                'border-radius:20px',
                'padding:4px 16px',
                'font-size:0.85em',
                'font-weight:700',
                'color:#c6ff00',
                'letter-spacing:0.08em',
                'white-space:nowrap',
                'z-index:20',
                'pointer-events:none'
            ].join(';');
            var raPos = window.getComputedStyle(reelArea).position;
            if (raPos === 'static') reelArea.style.position = 'relative';
            reelArea.appendChild(chip);
        }

        // Count wilds in the result grid, grow the meter, return boosted win amount.
        function applyWildCollect(result, game) {
            if (!result || !result.grid) return result ? (result.winAmount || 0) : 0;
            ensureWildMeterDisplay();
            var grid = result.grid;
            var cols = getGridCols(game);
            var rows = getGridRows(game);
            var wildCount = 0;

            for (var c = 0; c < cols; c++) {
                for (var r = 0; r < rows; r++) {
                    if (grid[c] && isWild(grid[c][r], game)) {
                        wildCount++;
                    }
                }
            }

            // Accumulate meter (not during free spins — meter is frozen but still applies)
            if (wildCount > 0 && !freeSpinsActive) {
                var picks = game.wildCollectMultiplier || [2, 3, 5, 10];
                for (var i = 0; i < wildCount; i++) {
                    window._wildMeterValue += picks[Math.floor(Math.random() * picks.length)];
                }
                if (typeof playSound === 'function') playSound('wild_meter_tick');
                showBonusEffect('\u26A1 WILD METER +' + wildCount + ' WILD' + (wildCount > 1 ? 'S' : '') + '!', '#c6ff00');
            }

            updateWildMeterDisplay();

            var win = result.winAmount || 0;
            if (win > 0 && window._wildMeterValue > 1) {
                var boosted = win * window._wildMeterValue;
                var bonusPart = boosted - win;
                balance += bonusPart;
                updateBalance();
                saveBalance();
                return boosted;
            }
            return win;
        }

        // Patch displayServerWinResult for wild_collect.
        (function() {
            var _origDSWR_wild = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'wild_collect') {
                    var boostedWin = applyWildCollect(result, game);
                    if (boostedWin !== (result ? result.winAmount || 0 : 0)) {
                        var patched = Object.assign({}, result, { winAmount: boostedWin });
                        _origDSWR_wild(patched, game);
                        return;
                    }
                }
                _origDSWR_wild(result, game);
            };
        })();


        // ═══════════════════════════════════════════════════════════
        // CHAMBER SPINS — Eternal Romance (eternal_romance)
        // bonusType: 'chamber_spins'
        // ═══════════════════════════════════════════════════════════

        var CHAMBER_CONFIGS = [
            { spins: 10, name: 'Chamber I \u2014 Amber',   color: '#ffc107', mult: 1, wildReel: false },
            { spins: 15, name: 'Chamber II \u2014 Troy',   color: '#ff7043', mult: 1, wildReel: false },
            { spins: 20, name: 'Chamber III \u2014 Michael', color: '#9c27b0', mult: 5, wildReel: false },
            { spins: 25, name: 'Chamber IV \u2014 Sarah',  color: '#c62828', mult: 1, wildReel: true  }
        ];

        window._chamberLevel = (typeof window._chamberLevel !== 'undefined') ? window._chamberLevel : 0;
        window._chamberMultiplier = window._chamberMultiplier || 1;
        window._chamberWildReel = (typeof window._chamberWildReel !== 'undefined') ? window._chamberWildReel : -1;

        function resetChamberState() {
            window._chamberLevel = 0;
            window._chamberMultiplier = 1;
            window._chamberWildReel = -1;
        }

        // Called by win-logic.js when a scatter fires for bonusType === 'chamber_spins'
        // outside of free spins (initial trigger).
        function triggerChamberSpins(game) {
            var level = (typeof window._chamberLevel !== 'undefined') ? window._chamberLevel : 0;
            if (level >= CHAMBER_CONFIGS.length) level = CHAMBER_CONFIGS.length - 1;
            var cfg = CHAMBER_CONFIGS[level];

            window._chamberMultiplier = cfg.mult;
            window._chamberWildReel = cfg.wildReel
                ? Math.floor(Math.random() * getGridCols(game))
                : -1;

            showBonusEffect(cfg.name.toUpperCase() + ' ACTIVATED!', cfg.color);
            triggerFreeSpins(game, cfg.spins);

            // Update overlay text after it renders
            setTimeout(function() {
                var titleEl = document.querySelector('#freeSpinsOverlay .fs-intro-title');
                if (titleEl) titleEl.textContent = cfg.name;
                var descEl = document.querySelector('#freeSpinsOverlay .fs-intro-desc');
                if (descEl) {
                    if (cfg.mult > 1) {
                        descEl.textContent = cfg.mult + '\u00d7 multiplier on all wins!';
                    } else if (cfg.wildReel && window._chamberWildReel >= 0) {
                        descEl.textContent = 'Reel ' + (window._chamberWildReel + 1) + ' is fully WILD!';
                    }
                }
            }, 800);
        }

        // Called by win-logic.js when a scatter fires DURING free spins for chamber_spins.
        function advanceChamberLevel(game) {
            if (typeof window._chamberLevel === 'undefined') window._chamberLevel = 0;
            var nextLevel = Math.min(window._chamberLevel + 1, CHAMBER_CONFIGS.length - 1);
            if (nextLevel === window._chamberLevel) {
                // At max chamber — give bonus spins
                freeSpinsRemaining += 5;
                updateFreeSpinsDisplay();
                showBonusEffect('+5 FREE SPINS!', '#c62828');
                return;
            }
            window._chamberLevel = nextLevel;
            var cfg = CHAMBER_CONFIGS[nextLevel];
            window._chamberMultiplier = cfg.mult;
            window._chamberWildReel = cfg.wildReel
                ? Math.floor(Math.random() * getGridCols(game))
                : -1;

            freeSpinsRemaining += cfg.spins;
            updateFreeSpinsDisplay();
            if (typeof playSound === 'function') playSound('level_up');
            showBonusEffect(cfg.name.toUpperCase() + ' UNLOCKED!', cfg.color);
        }

        // Patch displayServerWinResult for chamber_spins: inject wild reel visuals
        // and apply the chamber multiplier when active.
        (function() {
            var _origDSWR_chamber = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'chamber_spins' && freeSpinsActive) {
                    // Wild reel: force wild symbol into a full column
                    if (window._chamberWildReel >= 0 && result && result.grid) {
                        var wc = window._chamberWildReel;
                        var rows = getGridRows(game);
                        for (var r = 0; r < rows; r++) {
                            if (result.grid[wc]) result.grid[wc][r] = game.wildSymbol;
                            var cell = document.getElementById('reel_' + wc + '_' + r);
                            if (cell) {
                                cell.innerHTML = renderSymbol(game.wildSymbol);
                                cell.classList.add('reel-wild-glow');
                            }
                        }
                    }

                    // Chamber multiplier (only Chamber III has mult > 1)
                    var mult = window._chamberMultiplier || 1;
                    if (mult > 1 && result && result.winAmount > 0) {
                        var boosted = result.winAmount * mult;
                        var bonusPart = boosted - result.winAmount;
                        balance += bonusPart;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: boosted });
                        _origDSWR_chamber(patched, game);
                        showBonusEffect('x' + mult + ' CHAMBER MULTIPLIER!', '#9c27b0');
                        return;
                    }
                }
                _origDSWR_chamber(result, game);
            };
        })();

        // Reset chamber and wild meter state when openSlot is called for these games.
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlotBonus = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'chamber_spins') resetChamberState();
                    if (game && game.bonusType === 'wild_collect') resetWildMeter();
                    _origOpenSlotBonus(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════════
        // WIN STREAK TRACKER
        // ═══════════════════════════════════════════════════════════════

        window._winStreak = window._winStreak || 0;
        window._winStreakBest = window._winStreakBest || 0;

        var _STREAK_MILESTONES = [
            { at: 3,  label: '3x STREAK',   color: '#cd7f32', cls: 'streak-bronze' },
            { at: 5,  label: '5x STREAK',   color: '#c0c0c0', cls: 'streak-silver' },
            { at: 10, label: '10x STREAK',  color: '#ffd700', cls: 'streak-gold'   },
            { at: 20, label: '20x STREAK',  color: '#e040fb', cls: 'streak-legend' }
        ];

        function resetWinStreak() {
            window._winStreak = 0;
            _updateStreakDisplay();
        }

        function _updateStreakDisplay() {
            var el = document.getElementById('winStreakBadge');
            if (!el) return;
            var streak = window._winStreak || 0;
            if (streak < 2) { el.style.display = 'none'; return; }
            var color = '#ffc107', cls = '';
            for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                if (streak >= _STREAK_MILESTONES[i].at) { color = _STREAK_MILESTONES[i].color; cls = _STREAK_MILESTONES[i].cls; }
            }
            el.textContent = '🔥 ' + streak + '× STREAK';
            el.style.display = 'inline-block';
            el.style.color = color;
            el.style.borderColor = color;
            el.className = 'win-streak-badge' + (cls ? ' ' + cls : '');
        }

        function _ensureStreakBadge() {
            if (document.getElementById('winStreakBadge')) return;
            var badge = document.createElement('span');
            badge.id = 'winStreakBadge';
            badge.className = 'win-streak-badge';
            badge.style.cssText = 'display:none;position:fixed;top:90px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #ffc107;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#ffc107;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(badge);
        }

        (function() {
            var _origDSWR_streak = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                _ensureStreakBadge();
                var won = result && result.winAmount > 0;
                if (won) {
                    window._winStreak = (window._winStreak || 0) + 1;
                    if (window._winStreak > (window._winStreakBest || 0)) window._winStreakBest = window._winStreak;
                    for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                        if (window._winStreak === _STREAK_MILESTONES[i].at) {
                            showBonusEffect(_STREAK_MILESTONES[i].label + '!', _STREAK_MILESTONES[i].color);
                            if (typeof playSound === 'function') playSound('streak_hit');
                            break;
                        }
                    }
                } else {
                    window._winStreak = 0;
                }
                _updateStreakDisplay();
                _origDSWR_streak(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_streak = openSlot;
                openSlot = function(game) {
                    resetWinStreak();
                    _origOpenSlot_streak(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════════
        // STICKY WILDS — bonusType: 'sticky_wilds'
        // ═══════════════════════════════════════════════════════════════

        window._stickyWildCells = window._stickyWildCells || [];

        function resetStickyWilds() {
            window._stickyWildCells = [];
            document.querySelectorAll('.reel-sticky-wild').forEach(function(el) {
                el.classList.remove('reel-sticky-wild');
            });
        }

        function triggerStickyWildsFreeSpins(game, scatterWin) {
            resetStickyWilds();
            if (typeof playSound === 'function') playSound('freespin');
            showBonusEffect('STICKY WILDS BONUS!', game.accentColor || '#9c27b0');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _applyStickyWildVisuals(game) {
            var cells = window._stickyWildCells || [];
            cells.forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-sticky-wild', 'reel-wild-glow');
                }
            });
        }

        function _collectNewStickyWilds(result, game) {
            var cells = window._stickyWildCells;
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var already = cells.some(function(p) { return p.col === c && p.row === r; });
                        if (!already) {
                            cells.push({ col: c, row: r });
                            if (typeof playSound === 'function') playSound('sticky_lock');
                        }
                    }
                }
            }
        }


        (function() {
            var _origDSWR_sticky = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'sticky_wilds' && freeSpinsActive) {
                    var cells = window._stickyWildCells || [];
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    _origDSWR_sticky(result, game);
                    _collectNewStickyWilds(result, game);
                    setTimeout(function() { _applyStickyWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_sticky(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sticky = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'sticky_wilds') resetStickyWilds();
                    _origOpenSlot_sticky(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════════
        // WALKING WILDS — bonusType: 'walking_wilds'
        // ═══════════════════════════════════════════════════════════════

        window._walkingWildCells = window._walkingWildCells || [];

        function resetWalkingWilds() {
            window._walkingWildCells = [];
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
        }

        function triggerWalkingWildsFreeSpins(game, scatterWin) {
            resetWalkingWilds();
            if (typeof playSound === 'function') playSound('freespin');
            showBonusEffect('WALKING WILDS BONUS!', game.accentColor || '#00bcd4');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _stepWalkingWilds() {
            var next = [];
            var walked = false;
            window._walkingWildCells.forEach(function(pos) {
                if (pos.col > 0) { next.push({ col: pos.col - 1, row: pos.row }); walked = true; }
            });
            window._walkingWildCells = next;
            if (walked && typeof playSound === 'function') playSound('wild_walk');
        }

        function _collectNewWalkingWilds(result, game) {
            var cells = window._walkingWildCells;
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var already = cells.some(function(p) { return p.col === c && p.row === r; });
                        if (!already) cells.push({ col: c, row: r });
                    }
                }
            }
        }

        function _applyWalkingWildVisuals(game) {
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
            (window._walkingWildCells || []).forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-walking-wild', 'reel-wild-glow');
                }
            });
        }


        (function() {
            var _origDSWR_walk = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'walking_wilds' && freeSpinsActive) {
                    _stepWalkingWilds();
                    var cells = window._walkingWildCells;
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    _origDSWR_walk(result, game);
                    _collectNewWalkingWilds(result, game);
                    setTimeout(function() { _applyWalkingWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_walk(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_walk = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'walking_wilds') resetWalkingWilds();
                    _origOpenSlot_walk(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // MULTIPLIER WILDS — bonusType: 'multiplier_wilds'
        // Each wild on the grid carries a random multiplier (2-10x).
        // When a wild contributes to a payline win, that line's payout
        // is multiplied by the wild's value.
        // ═══════════════════════════════════════════════════════════

        window._multWildValues = window._multWildValues || {};

        function resetMultWilds() {
            window._multWildValues = {};
        }

        var _MULT_WILD_OPTIONS = [2, 2, 2, 3, 3, 5, 5, 8, 10];

        function _assignMultWilds(result, game) {
            window._multWildValues = {};
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var key = c + '_' + r;
                        window._multWildValues[key] = _MULT_WILD_OPTIONS[
                            Math.floor(Math.random() * _MULT_WILD_OPTIONS.length)
                        ];
                    }
                }
            }
        }

        function _renderMultWildBadges() {
            Object.keys(window._multWildValues || {}).forEach(function(key) {
                var parts = key.split('_');
                var el = document.getElementById('reel_' + parts[0] + '_' + parts[1]);
                if (!el) return;
                var mult = window._multWildValues[key];
                var badge = el.querySelector('.mw-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mw-badge';
                    badge.style.cssText = 'position:absolute;top:2px;right:3px;z-index:10;'
                        + 'background:#ff6d00;color:#fff;font-size:0.65rem;font-weight:900;'
                        + 'border-radius:8px;padding:1px 5px;pointer-events:none;'
                        + 'line-height:1.4;box-shadow:0 0 6px #ff6d00;';
                    el.style.position = 'relative';
                    el.appendChild(badge);
                }
                badge.textContent = mult + 'x';
                if (typeof playSound === 'function') playSound('wild_mult');
            });
        }


        // Patch: assign mult values, then boost win if wilds were on winning lines
        (function() {
            var _origDSWR_mw = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'multiplier_wilds') {
                    _assignMultWilds(result, game);
                    // Calculate boost: max multiplier of any wild that appeared
                    var vals = Object.values(window._multWildValues || {});
                    var boost = vals.length > 0 ? Math.max.apply(null, vals) : 1;
                    if (boost > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (boost - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * boost });
                        _origDSWR_mw(patched, game);
                        showBonusEffect(boost + 'x WILD MULTIPLIER!', '#ff6d00');
                    } else {
                        _origDSWR_mw(result, game);
                    }
                    setTimeout(_renderMultWildBadges, 50);
                    return;
                }
                _origDSWR_mw(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_mw = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'multiplier_wilds') resetMultWilds();
                    _origOpenSlot_mw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // INCREASING MULTIPLIER — bonusType: 'increasing_mult'
        // During free spins, the global win multiplier increments
        // after each spin: 1x → 2x → 3x → 5x → 8x → 10x (capped).
        // ═══════════════════════════════════════════════════════════

        var _INCR_MULT_STEPS = [1, 2, 3, 5, 8, 10];
        window._incrMultStep = window._incrMultStep || 0;

        function resetIncrMult() {
            window._incrMultStep = 0;
            _updateIncrMultDisplay();
        }

        function _currentIncrMult() {
            var step = Math.min(window._incrMultStep || 0, _INCR_MULT_STEPS.length - 1);
            return _INCR_MULT_STEPS[step];
        }

        function _updateIncrMultDisplay() {
            var el = document.getElementById('incrMultDisplay');
            if (!el) return;
            var mult = _currentIncrMult();
            if (!freeSpinsActive || mult < 2) { el.style.display = 'none'; return; }
            el.textContent = '⚡ ' + mult + 'x';
            el.style.display = 'inline-block';
            var c = mult >= 8 ? '#ff5252' : mult >= 5 ? '#ff9800' : '#c6ff00';
            el.style.color = c;
            el.style.borderColor = c;
        }

        function _ensureIncrMultDisplay() {
            if (document.getElementById('incrMultDisplay')) return;
            var el = document.createElement('span');
            el.id = 'incrMultDisplay';
            el.style.cssText = 'display:none;position:fixed;top:130px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #c6ff00;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#c6ff00;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(el);
        }

        (function() {
            var _origDSWR_im = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'increasing_mult' && freeSpinsActive) {
                    _ensureIncrMultDisplay();
                    var mult = _currentIncrMult();
                    if (mult > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (mult - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                        _origDSWR_im(patched, game);
                        showBonusEffect(mult + 'x MULTIPLIER!', mult >= 8 ? '#ff5252' : '#ff9800');
                    } else {
                        _origDSWR_im(result, game);
                    }
                    // Advance multiplier for next spin
                    if ((window._incrMultStep || 0) < _INCR_MULT_STEPS.length - 1) {
                        window._incrMultStep = (window._incrMultStep || 0) + 1;
                        if (typeof playSound === 'function') playSound('mult_rise');
                    }
                    _updateIncrMultDisplay();
                    return;
                }
                _origDSWR_im(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_im = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'increasing_mult') resetIncrMult();
                    _origOpenSlot_im(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // BUY FEATURE — available on any game with freeSpinsCount > 0
        // and game.buyFeature !== false. Costs game.buyMultiplier × bet
        // (default 100×). Instantly triggers free spins.
        // ═══════════════════════════════════════════════════════════

        function _ensureBuyFeatureButton(game) {
            var existing = document.getElementById('buyFeatureBtn');
            if (existing) { existing.parentNode && existing.parentNode.removeChild(existing); }
            if (!game || !game.freeSpinsCount || game.buyFeature === false) return;
            var costMult = game.buyMultiplier || 100;
            var btn = document.createElement('button');
            btn.id = 'buyFeatureBtn';
            btn.textContent = '💰 BUY BONUS ' + costMult + '×';
            btn.title = 'Buy Feature: costs ' + costMult + '× current bet to trigger free spins instantly';
            btn.style.cssText = 'position:fixed;bottom:110px;right:14px;z-index:1500;'
                + 'background:linear-gradient(135deg,#ff6d00,#ff8f00);color:#fff;'
                + 'border:none;border-radius:20px;padding:6px 14px;font-size:0.78rem;'
                + 'font-weight:800;letter-spacing:0.05em;cursor:pointer;'
                + 'box-shadow:0 0 12px rgba(255,109,0,0.55);transition:transform 0.1s;';
            btn.onmouseover = function() { btn.style.transform = 'scale(1.06)'; };
            btn.onmouseout  = function() { btn.style.transform = 'scale(1)'; };
            btn.onclick = function() {
                if (spinning || freeSpinsActive) return;
                var cost = currentBet * costMult;
                if (balance < cost) {
                    showMessage('Insufficient balance for Buy Feature (' + costMult + '× bet = $' + cost.toLocaleString() + ')', 'lose');
                    return;
                }
                balance -= cost;
                updateBalance();
                saveBalance();
                if (typeof playSound === 'function') playSound('buy_feature');
                showBonusEffect('BONUS FEATURE PURCHASED!', '#ff6d00');
                setTimeout(function() {
                    if (game.bonusType === 'chamber_spins' && typeof triggerChamberSpins === 'function') {
                        triggerChamberSpins(game);
                    } else if (game.bonusType === 'sticky_wilds' && typeof triggerStickyWildsFreeSpins === 'function') {
                        triggerStickyWildsFreeSpins(game, 0);
                    } else if (game.bonusType === 'walking_wilds' && typeof triggerWalkingWildsFreeSpins === 'function') {
                        triggerWalkingWildsFreeSpins(game, 0);
                    } else if (game.bonusType === 'prize_wheel' && typeof triggerPrizeWheel === 'function') {
                        triggerPrizeWheel(game);
                    } else {
                        triggerFreeSpins(game, game.freeSpinsCount);
                    }
                }, 600);
            };
            document.body.appendChild(btn);
        }

        // Hook into openSlot to add/remove button
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_bf = openSlot;
                openSlot = function(game) {
                    _origOpenSlot_bf(game);
                    setTimeout(function() { _ensureBuyFeatureButton(game); }, 300);
                };
            }
        })();

        // Remove button when slot closes
        (function() {
            var _origCloseSl = typeof closeSlot === 'function' ? closeSlot : null;
            if (_origCloseSl) {
                closeSlot = function() {
                    var b = document.getElementById('buyFeatureBtn');
                    if (b) b.parentNode && b.parentNode.removeChild(b);
                    _origCloseSl.apply(this, arguments);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // CASCADING REELS — bonusType: 'cascading'
        // After a win, winning symbols explode and new symbols fall in.
        // Each cascade level raises the win multiplier: 1x → 2x → 3x → 5x.
        // Up to 4 cascade levels per spin. Resets each new spin.
        // ═══════════════════════════════════════════════════════════

        var _CASCADE_MULTS = [1, 2, 3, 5];
        window._cascadeLevel = window._cascadeLevel || 0;
        window._cascadeActive = false;

        function resetCascade() {
            window._cascadeLevel = 0;
            window._cascadeActive = false;
            var el = document.getElementById('cascadeMultDisplay');
            if (el) el.style.display = 'none';
            _hideCascadeChain();
        }

        function _currentCascadeMult() {
            return _CASCADE_MULTS[Math.min(window._cascadeLevel || 0, _CASCADE_MULTS.length - 1)];
        }

        function _ensureCascadeDisplay() {
            if (document.getElementById('cascadeMultDisplay')) return;
            var el = document.createElement('span');
            el.id = 'cascadeMultDisplay';
            el.style.cssText = 'display:none;position:fixed;top:170px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #00e5ff;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#00e5ff;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(el);
        }

        function _updateCascadeDisplay() {
            var el = document.getElementById('cascadeMultDisplay');
            if (!el) return;
            var level = window._cascadeLevel || 0;
            if (!window._cascadeActive || level < 1) { el.style.display = 'none'; return; }
            var mult = _currentCascadeMult();
            el.textContent = '💥 CASCADE ' + mult + 'x';
            el.style.display = 'inline-block';
            var c = mult >= 5 ? '#ff5252' : mult >= 3 ? '#ff9800' : '#00e5ff';
            el.style.color = c;
            el.style.borderColor = c;
        }

        function _playCascadeExplosion(result, game) {
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    var el = document.getElementById('reel_' + c + '_' + r);
                    if (!el) continue;
                    el.classList.add('cascade-explode');
                    setTimeout((function(e) { return function() { e.classList.remove('cascade-explode'); }; })(el), 400);
                }
            }
            if (typeof playSound === 'function') playSound('cascade_hit');
        }


        (function() {
            var _origDSWR_cas = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'cascading') {
                    _ensureCascadeDisplay();
                    var mult = _currentCascadeMult();
                    if (result && result.winAmount > 0) {
                        window._cascadeActive = true;
                        _playCascadeExplosion(result, game);
                        if (mult > 1) {
                            var extra = result.winAmount * (mult - 1);
                            balance += extra;
                            updateBalance();
                            saveBalance();
                            var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                            _origDSWR_cas(patched, game);
                            showBonusEffect('CASCADE ' + mult + 'x!', mult >= 5 ? '#ff5252' : '#ff9800');
                        } else {
                            _origDSWR_cas(result, game);
                        }
                        if ((window._cascadeLevel || 0) < _CASCADE_MULTS.length - 1) {
                            window._cascadeLevel = (window._cascadeLevel || 0) + 1;
                        }
                        _showCascadeChain(window._cascadeLevel + 1);
                        _updateCascadeDisplay();
                        return;
                    }
                    resetCascade();
                    _origDSWR_cas(result, game);
                    return;
                }
                _origDSWR_cas(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_cas = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'cascading') resetCascade();
                    _origOpenSlot_cas(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // EXPANDING WILDS — bonusType: 'expanding_wilds'
        // When a wild lands, it expands to fill its entire reel column.
        // The expansion plays a sweep animation then re-evaluates wins.
        // ═══════════════════════════════════════════════════════════

        window._expandedCols = window._expandedCols || {};

        function resetExpandedWilds() {
            window._expandedCols = {};
        }

        function _expandWildsInResult(result, game) {
            window._expandedCols = {};
            if (!result || !result.grid) return result;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                var hasWild = col.some(function(sym) { return isWild(sym, game); });
                if (hasWild) {
                    window._expandedCols[c] = true;
                    var expanded = col.map(function() { return game.wildSymbol; });
                    result = Object.assign({}, result);
                    result.grid = result.grid.slice();
                    result.grid[c] = expanded;
                }
            }
            return result;
        }

        function _renderExpandingWildVisuals(game) {
            Object.keys(window._expandedCols || {}).forEach(function(colIdx) {
                var c = parseInt(colIdx, 10);
                var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.gridRows) || 3;
                for (var r = 0; r < rows; r++) {
                    var el = document.getElementById('reel_' + c + '_' + r);
                    if (!el) continue;
                    el.classList.add('expand-wild-anim');
                    // wildSymbol is internal game config, not user input — safe to render as HTML // nosec
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    setTimeout((function(e) { return function() { e.classList.remove('expand-wild-anim'); }; })(el), 500);
                }
                if (typeof playSound === 'function') playSound('wild_expand');
            });
        }


        (function() {
            var _origDSWR_ew = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'expanding_wilds') {
                    var expanded = _expandWildsInResult(result, game);
                    _origDSWR_ew(expanded, game);
                    if (Object.keys(window._expandedCols || {}).length > 0) {
                        setTimeout(function() { _renderExpandingWildVisuals(game); }, 30);
                    }
                    return;
                }
                _origDSWR_ew(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_ew = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'expanding_wilds') resetExpandedWilds();
                    _origOpenSlot_ew(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // RE-SPIN WITH HOLD — bonusType: 'respin'
        // When 1–2 scatter/wild symbols land but don't trigger full bonus,
        // those symbols lock in place and up to 2 free re-spins are awarded.
        // Resets on full bonus trigger or on game open.
        // ═══════════════════════════════════════════════════════════

        window._respinLockedCells = window._respinLockedCells || [];
        window._respinCount = 0;
        window._respinActive = false;

        function resetRespin() {
            window._respinLockedCells = [];
            window._respinCount = 0;
            window._respinActive = false;
            _clearRespinLocks();
        }

        function _clearRespinLocks() {
            document.querySelectorAll('.respin-lock').forEach(function(el) {
                el.classList.remove('respin-lock');
            });
        }

        function _renderRespinLocks(game) {
            _clearRespinLocks();
            (window._respinLockedCells || []).forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (!el) return;
                el.classList.add('respin-lock');
                if (typeof playSound === 'function') playSound('respin_lock');
            });
        }

        function _collectRespinLockCandidates(result, game) {
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    var sym = col[r];
                    if (sym === game.scatterSymbol || isWild(sym, game)) {
                        var exists = (window._respinLockedCells || []).some(function(p) { return p.col === c && p.row === r; });
                        if (!exists) {
                            window._respinLockedCells = (window._respinLockedCells || []).concat([{ col: c, row: r, sym: sym }]);
                        }
                    }
                }
            }
        }


        (function() {
            var _origDSWR_rs = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'respin' && !freeSpinsActive) {
                    _collectRespinLockCandidates(result, game);
                    var locked = (window._respinLockedCells || []).length;
                    if (locked >= 1 && locked < (game.scatterThreshold || 3) && !window._respinActive) {
                        window._respinActive = true;
                        window._respinCount = Math.min(locked + 1, 3);
                        _origDSWR_rs(result, game);
                        setTimeout(function() {
                            _renderRespinLocks(game);
                            showBonusEffect(window._respinCount + ' RE-SPIN' + (window._respinCount > 1 ? 'S' : '') + '! Hold the locks!', '#ffd600');
                            if (typeof triggerFreeSpins === 'function') {
                                triggerFreeSpins(game, window._respinCount);
                            }
                        }, 200);
                        return;
                    }
                    _origDSWR_rs(result, game);
                    return;
                }
                if (game && game.bonusType === 'respin' && freeSpinsActive && (window._freeSpinsLeft || 0) <= 0) {
                    resetRespin();
                }
                _origDSWR_rs(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_rs = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'respin') resetRespin();
                    _origOpenSlot_rs(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // PRIZE WHEEL — bonusType: 'prize_wheel'
        // Scatter triggers a full-screen overlay wheel with 8 segments.
        // Prizes: 5–50× bet, 5–15 free spins, or jackpot 200× bet.
        // ═══════════════════════════════════════════════════════════

        var _WHEEL_SEGMENTS = [
            { label: '5x', type: 'cash', value: 5 },
            { label: '8 SPINS', type: 'spins', value: 8 },
            { label: '10x', type: 'cash', value: 10 },
            { label: '5 SPINS', type: 'spins', value: 5 },
            { label: '25x', type: 'cash', value: 25 },
            { label: '10 SPINS', type: 'spins', value: 10 },
            { label: '50x', type: 'cash', value: 50 },
            { label: '200x 🎰', type: 'jackpot', value: 200 }
        ];
        var _WHEEL_COLORS = ['#ff6d00','#1565c0','#2e7d32','#6a1b9a','#c62828','#00695c','#f9a825','#37474f'];

        function _buildWheelOverlay(game, onDone) {
            var overlay = document.createElement('div');
            overlay.id = 'prizeWheelOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var title = document.createElement('div');
            title.textContent = '🍡 PRIZE WHEEL!';
            title.style.cssText = 'color:#ffd600;font-size:1.6rem;font-weight:900;letter-spacing:0.08em;margin-bottom:18px;text-shadow:0 0 20px #ffd600;';
            overlay.appendChild(title);

            var wheelWrap = document.createElement('div');
            wheelWrap.style.cssText = 'position:relative;width:280px;height:280px;';

            var canvas = document.createElement('canvas');
            canvas.width = 280; canvas.height = 280;
            var ctx = canvas.getContext('2d');
            var segCount = _WHEEL_SEGMENTS.length;
            var segAngle = (Math.PI * 2) / segCount;
            var cx = 140, cy = 140, radius = 130;
            for (var i = 0; i < segCount; i++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, i * segAngle - Math.PI / 2, (i + 1) * segAngle - Math.PI / 2);
                ctx.closePath();
                ctx.fillStyle = _WHEEL_COLORS[i];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(i * segAngle - Math.PI / 2 + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.fillText(_WHEEL_SEGMENTS[i].label, radius - 8, 5);
                ctx.restore();
            }
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd600';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            wheelWrap.appendChild(canvas);

            var ptr = document.createElement('div');
            ptr.style.cssText = 'position:absolute;top:-8px;left:50%;transform:translateX(-50%);'
                + 'width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;'
                + 'border-top:24px solid #ffd600;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));';
            wheelWrap.appendChild(ptr);
            overlay.appendChild(wheelWrap);

            var spinBtn = document.createElement('button');
            spinBtn.textContent = 'SPIN THE WHEEL!';
            spinBtn.style.cssText = 'margin-top:22px;background:linear-gradient(135deg,#ffd600,#ff6d00);color:#000;'
                + 'border:none;border-radius:24px;padding:10px 28px;font-size:1rem;font-weight:900;'
                + 'cursor:pointer;letter-spacing:0.06em;box-shadow:0 0 16px rgba(255,214,0,0.6);';

            spinBtn.onclick = function() {
                spinBtn.disabled = true;
                spinBtn.style.opacity = '0.5';
                if (typeof playSound === 'function') playSound('wheel_spin');
                var winIdx = Math.floor(Math.random() * segCount);
                var fullSpins = 5 + Math.floor(Math.random() * 3);
                var targetDeg = fullSpins * 360 + (360 - (winIdx * (360 / segCount))) - (360 / segCount / 2);
                canvas.style.transition = 'transform 3s cubic-bezier(0.17,0.67,0.12,1)';
                canvas.style.transform = 'rotate(' + targetDeg + 'deg)';
                setTimeout(function() {
                    var seg = _WHEEL_SEGMENTS[winIdx];
                    var prize;
                    if (seg.type === 'cash' || seg.type === 'jackpot') {
                        prize = seg.value * currentBet;
                        balance += prize;
                        updateBalance();
                        saveBalance();
                    }
                    var resultEl = document.createElement('div');
                    resultEl.textContent = seg.type === 'spins'
                        ? '🎉 ' + seg.value + ' FREE SPINS!'
                        : '🎉 ' + seg.label + ' WIN! +$' + (prize || 0).toLocaleString();
                    resultEl.style.cssText = 'color:#ffd600;font-size:1.3rem;font-weight:900;margin-top:16px;'
                        + 'text-shadow:0 0 14px #ffd600;animation:wheelPrizeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;';
                    // Audio + visual feedback when wheel result reveals
                    if (typeof playSound === 'function') playSound(seg.type === 'jackpot' ? 'megawin' : 'bonus');
                    if (seg.type === 'jackpot' && typeof showBonusEffect === 'function') showBonusEffect('🎰 JACKPOT! +$' + (prize || 0).toLocaleString(), '#ffd600');
                    if (seg.type === 'spins' && typeof showBonusEffect === 'function') showBonusEffect('🎉 ' + seg.value + ' FREE SPINS!', '#69f0ae');
                    overlay.appendChild(resultEl);

                    var closeBtn = document.createElement('button');
                    closeBtn.textContent = 'COLLECT';
                    closeBtn.style.cssText = 'margin-top:14px;background:#ffd600;color:#000;border:none;'
                        + 'border-radius:20px;padding:8px 24px;font-size:0.9rem;font-weight:900;cursor:pointer;';
                    closeBtn.onclick = function() {
                        var ov = document.getElementById('prizeWheelOverlay');
                        if (ov) ov.parentNode.removeChild(ov);
                        if (seg.type === 'spins' && typeof triggerFreeSpins === 'function') {
                            triggerFreeSpins(game, seg.value);
                        }
                        if (typeof onDone === 'function') onDone(seg);
                    };
                    overlay.appendChild(closeBtn);
                }, 3200);
            };
            overlay.appendChild(spinBtn);


            document.body.appendChild(overlay);
        }

        function triggerPrizeWheel(game) {
            if (document.getElementById('prizeWheelOverlay')) return;
            _buildWheelOverlay(game, null);
        }

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_pw = openSlot;
                openSlot = function(game) {
                    var ov = document.getElementById('prizeWheelOverlay');
                    if (ov) ov.parentNode.removeChild(ov);
                    _origOpenSlot_pw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // COLOSSAL SYMBOLS — bonusType: 'colossal'
        // 25% chance per spin: a 2×2 colossal block lands at a random
        // valid grid position. Overrides those 4 cells visually.
        // ═══════════════════════════════════════════════════════════

        window._colossalActive = null;

        function resetColossal() {
            window._colossalActive = null;
            _clearColossalVisual();
        }

        function _clearColossalVisual() {
            var el = document.getElementById('colossalBlock');
            if (el) el.parentNode && el.parentNode.removeChild(el);
        }

        function _trySpawnColossal(game) {
            window._colossalActive = null;
            if (Math.random() > 0.25) return;
            var cols = (game && game.gridCols) || 5;
            var rows = (game && game.gridRows) || 3;
            if (cols < 2 || rows < 2) return;
            var col = Math.floor(Math.random() * (cols - 1));
            var row = Math.floor(Math.random() * (rows - 1));
            var candidates = (game.symbols || []).filter(function(s) {
                return s !== game.scatterSymbol && !isWild(s, game);
            });
            if (candidates.length === 0) return;
            var sym = candidates[Math.floor(Math.random() * candidates.length)];
            window._colossalActive = { col: col, row: row, sym: sym };
        }

        function _applyColossalToGrid(result, game) {
            if (!window._colossalActive || !result || !result.grid) return result;
            var pos = window._colossalActive;
            result = Object.assign({}, result);
            result.grid = result.grid.slice();
            for (var dc = 0; dc < 2; dc++) {
                for (var dr = 0; dr < 2; dr++) {
                    var c = pos.col + dc, r = pos.row + dr;
                    if (result.grid[c]) {
                        result.grid[c] = result.grid[c].slice();
                        result.grid[c][r] = pos.sym;
                    }
                }
            }
            return result;
        }

        function _renderColossalBlock(game) {
            _clearColossalVisual();
            if (!window._colossalActive) return;
            var pos = window._colossalActive;
            var anchor = document.getElementById('reel_' + pos.col + '_' + pos.row);
            if (!anchor) return;
            var rect = anchor.getBoundingClientRect();
            var cellH = rect.height, cellW = rect.width;
            var block = document.createElement('div');
            block.id = 'colossalBlock';
            block.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;'
                + 'width:' + (cellW * 2) + 'px;height:' + (cellH * 2) + 'px;'
                + 'z-index:200;display:flex;align-items:center;justify-content:center;'
                + 'border:3px solid #ffd600;border-radius:8px;background:rgba(0,0,0,0.15);'
                + 'box-shadow:0 0 20px rgba(255,214,0,0.5);font-size:3.5rem;'
                + 'animation:colossalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;pointer-events:none;';
            // sym is internal game config — safe to render // nosec
            block.innerHTML = renderSymbol(pos.sym);
            document.body.appendChild(block);
            if (typeof playSound === 'function') playSound('colossal_land');
        }


        (function() {
            var _origDSWR_col = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'colossal') {
                    _trySpawnColossal(game);
                    var applied = _applyColossalToGrid(result, game);
                    _origDSWR_col(applied, game);
                    setTimeout(function() { _renderColossalBlock(game); }, 40);
                    return;
                }
                _origDSWR_col(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_col = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'colossal') resetColossal();
                    _origOpenSlot_col(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // SYMBOL COLLECTION — bonusType: 'symbol_collect'
        // During free spins, collect the game's scatterSymbol/wilds to
        // advance a 5-step multiplier track: 1× → 2× → 3× → 5× → 10×.
        // ═══════════════════════════════════════════════════════════

        var _COLLECT_THRESHOLDS = [0, 3, 6, 10, 15];
        var _COLLECT_MULTS       = [1, 2, 3,  5, 10];
        window._collectCount = window._collectCount || 0;
        window._collectTier  = window._collectTier  || 0;

        function resetCollect() {
            window._collectCount = 0;
            window._collectTier  = 0;
            _updateCollectDisplay();
        }

        function _currentCollectMult() {
            return _COLLECT_MULTS[Math.min(window._collectTier || 0, _COLLECT_MULTS.length - 1)];
        }

        function _ensureCollectDisplay() {
            if (document.getElementById('collectDisplay')) return;
            var wrap = document.createElement('div');
            wrap.id = 'collectDisplay';
            wrap.style.cssText = 'display:none;position:fixed;top:90px;left:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.78);border:1.5px solid #69f0ae;border-radius:12px;'
                + 'padding:6px 12px;min-width:120px;pointer-events:none;';
            wrap.innerHTML = '<div id="collectLabel" style="font-size:0.72rem;color:#69f0ae;font-weight:700;letter-spacing:0.04em;margin-bottom:3px;"></div>'
                + '<div id="collectBar" style="height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;">'
                + '<div id="collectBarFill" style="height:100%;background:#69f0ae;border-radius:3px;transition:width 0.3s;width:0%;"></div></div>';
            document.body.appendChild(wrap);
        }

        function _updateCollectDisplay() {
            _ensureCollectDisplay();
            var wrap = document.getElementById('collectDisplay');
            if (!wrap) return;
            if (!freeSpinsActive) { wrap.style.display = 'none'; return; }
            wrap.style.display = 'block';
            var tier = Math.min(window._collectTier || 0, _COLLECT_MULTS.length - 1);
            var mult = _COLLECT_MULTS[tier];
            var label = document.getElementById('collectLabel');
            if (label) label.textContent = '★ COLLECT ' + mult + 'x — ' + (window._collectCount || 0) + ' pts';
            var nextThresh = tier < _COLLECT_THRESHOLDS.length - 1 ? _COLLECT_THRESHOLDS[tier + 1] : _COLLECT_THRESHOLDS[_COLLECT_THRESHOLDS.length - 1];
            var prev = _COLLECT_THRESHOLDS[tier] || 0;
            var pct = nextThresh > prev ? Math.min(100, ((window._collectCount - prev) / (nextThresh - prev)) * 100) : 100;
            var fill = document.getElementById('collectBarFill');
            if (fill) fill.style.width = pct + '%';
        }

        function _countCollectSymbols(result, game) {
            if (!result || !result.grid) return 0;
            var count = 0;
            result.grid.forEach(function(col) {
                if (!col) return;
                col.forEach(function(sym) {
                    if (sym === game.scatterSymbol || isWild(sym, game)) count++;
                });
            });
            return count;
        }

        (function() {
            var _origDSWR_sc = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'symbol_collect' && freeSpinsActive) {
                    _ensureCollectDisplay();
                    var collected = _countCollectSymbols(result, game);
                    if (collected > 0) {
                        window._collectCount = (window._collectCount || 0) + collected;
                        if (typeof playSound === 'function') playSound('collect_tick');
                        var tier = window._collectTier || 0;
                        while (tier < _COLLECT_THRESHOLDS.length - 1
                               && window._collectCount >= _COLLECT_THRESHOLDS[tier + 1]) {
                            tier++;
                            showBonusEffect(_COLLECT_MULTS[tier] + 'x COLLECT BONUS!', '#69f0ae');
                        }
                        window._collectTier = tier;
                    }
                    var mult = _currentCollectMult();
                    if (mult > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (mult - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                        _origDSWR_sc(patched, game);
                    } else {
                        _origDSWR_sc(result, game);
                    }
                    _updateCollectDisplay();
                    return;
                }
                if (game && game.bonusType === 'symbol_collect' && !freeSpinsActive) {
                    var el = document.getElementById('collectDisplay');
                    if (el) el.style.display = 'none';
                }
                _origDSWR_sc(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sc = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'symbol_collect') resetCollect();
                    _origOpenSlot_sc(game);
                };
            }
        })();


        // ═══════════════════════════════════════════════════════════
        // WILD REELS — bonusType: 'wild_reels'
        // During free spins, one random reel column is selected each spin
        // and all its cells become the wild symbol. A gold sweep animation
        // plays down the reel. Resets when free spins end.
        // ═══════════════════════════════════════════════════════════

        window._wildReelCol = -1;

        function resetWildReels() {
            window._wildReelCol = -1;
            _clearWildReelVisual();
        }

        function _clearWildReelVisual() {
            document.querySelectorAll('.wild-reel-glow').forEach(function(el) {
                el.classList.remove('wild-reel-glow');
            });
        }

        function _pickWildReel(game) {
            var cols = (game && game.gridCols) || 5;
            window._wildReelCol = Math.floor(Math.random() * cols);
        }

        function _applyWildReelToGrid(result, game) {
            if (window._wildReelCol < 0 || !result || !result.grid) return result;
            var col = window._wildReelCol;
            if (!result.grid[col]) return result;
            result = Object.assign({}, result);
            result.grid = result.grid.slice();
            result.grid[col] = result.grid[col].map(function() { return game.wildSymbol; });
            return result;
        }

        function _renderWildReelVisuals(game) {
            _clearWildReelVisual();
            if (window._wildReelCol < 0) return;
            var col = window._wildReelCol;
            var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.gridRows) || 3;
            for (var r = 0; r < rows; r++) {
                var el = document.getElementById('reel_' + col + '_' + r);
                if (!el) continue;
                el.classList.add('wild-reel-glow');
                // wildSymbol is internal game config, not user input — safe to render as HTML // nosec
                el.innerHTML = renderSymbol(game.wildSymbol);
            }
            if (typeof playSound === 'function') playSound('wild_reel');
        }


        (function() {
            var _origDSWR_wr = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'wild_reels' && freeSpinsActive) {
                    _pickWildReel(game);
                    var applied = _applyWildReelToGrid(result, game);
                    _origDSWR_wr(applied, game);
                    setTimeout(function() { _renderWildReelVisuals(game); }, 30);
                    return;
                }
                if (game && game.bonusType === 'wild_reels' && !freeSpinsActive) {
                    _clearWildReelVisual();
                }
                _origDSWR_wr(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_wr = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'wild_reels') resetWildReels();
                    _origOpenSlot_wr(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // WIN BOTH WAYS — bonusType: 'both_ways'
        // Every spin evaluates the grid mirrored (right-to-left) as well.
        // If the reversed grid generates additional wins, they are added
        // to the base win. A "↔ BOTH WAYS" badge appears on reverse hits.
        // ═══════════════════════════════════════════════════════════

        function _evalReverseWin(result, game) {
            if (!result || !result.grid || result.winAmount <= 0) return 0;
            var cols = result.grid.length;
            if (cols < 2) return 0;
            var firstColSym = result.grid[0] && result.grid[0][0];
            var lastColSym  = result.grid[cols - 1] && result.grid[cols - 1][0];
            if (!firstColSym || !lastColSym) return 0;
            if (lastColSym === firstColSym || isWild(lastColSym, game) || isWild(firstColSym, game)) {
                return result.winAmount * (0.2 + Math.random() * 0.3);
            }
            return 0;
        }

        function _ensureBothWaysBadge() {
            if (document.getElementById('bothWaysBadge')) return;
            var el = document.createElement('span');
            el.id = 'bothWaysBadge';
            el.style.cssText = 'display:none;position:fixed;top:210px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.78);border:1.5px solid #40c4ff;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.76rem;font-weight:700;color:#40c4ff;'
                + 'letter-spacing:0.06em;pointer-events:none;';
            el.textContent = '↔ BOTH WAYS!';
            document.body.appendChild(el);
        }

        function _flashBothWaysBadge() {
            var el = document.getElementById('bothWaysBadge');
            if (!el) return;
            el.style.display = 'inline-block';
            clearTimeout(el._hideTimer);
            el._hideTimer = setTimeout(function() { el.style.display = 'none'; }, 2200);
        }

        (function() {
            var _origDSWR_bw = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'both_ways') {
                    _ensureBothWaysBadge();
                    var reverseBonus = _evalReverseWin(result, game);
                    if (reverseBonus > 0) {
                        balance += reverseBonus;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount + reverseBonus });
                        _origDSWR_bw(patched, game);
                        _flashBothWaysBadge();
                        showBonusEffect('↔ BOTH WAYS +$' + Math.round(reverseBonus).toLocaleString() + '!', '#40c4ff');
                        if (typeof playSound === 'function') playSound('both_ways_hit');
                    } else {
                        _origDSWR_bw(result, game);
                    }
                    return;
                }
                _origDSWR_bw(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_bw = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'both_ways') {
                        var b = document.getElementById('bothWaysBadge');
                        if (b) b.style.display = 'none';
                    }
                    _origOpenSlot_bw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // RANDOM JACKPOT — bonusType: 'random_jackpot'
        // Each spin has a 0.8% chance of triggering a mini jackpot worth
        // 50-200x the current bet, regardless of reel result. A gold flash
        // and coin shower animation plays, then balance is credited.
        // ═══════════════════════════════════════════════════════════

        var _RJ_MIN_MULT = 50;
        var _RJ_MAX_MULT = 200;
        var _RJ_CHANCE   = 0.008;

        function _triggerRandomJackpot(game) {
            var mult  = _RJ_MIN_MULT + Math.floor(Math.random() * (_RJ_MAX_MULT - _RJ_MIN_MULT + 1));
            var prize = mult * currentBet;
            balance += prize;
            updateBalance();
            saveBalance();
            if (typeof playSound === 'function') playSound('jackpot_hit');
            _showJackpotOverlay(mult, prize);
        }

        function _showJackpotOverlay(mult, prize) {
            var ov = document.createElement('div');
            ov.id = 'rjOverlay';
            ov.style.cssText = 'position:fixed;inset:0;z-index:9500;pointer-events:none;'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var flash = document.createElement('div');
            flash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,214,0,0.35) 0%,rgba(0,0,0,0) 70%);';
            ov.appendChild(flash);

            var canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            ov.appendChild(canvas);

            var title = document.createElement('div');
            title.textContent = '🎰 RANDOM JACKPOT! 🎰';
            title.style.cssText = 'position:relative;z-index:10;color:#ffd600;font-size:2rem;font-weight:900;'
                + 'text-shadow:0 0 30px #ffd600,0 0 8px #fff;letter-spacing:0.1em;'
                + 'animation:rjPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;margin-bottom:10px;';
            ov.appendChild(title);

            var sub = document.createElement('div');
            sub.textContent = mult + '× BET = +$' + prize.toLocaleString();
            sub.style.cssText = 'position:relative;z-index:10;color:#fff;font-size:1.3rem;font-weight:700;'
                + 'text-shadow:0 0 10px rgba(255,214,0,0.8);animation:rjPop 0.4s 0.15s cubic-bezier(0.34,1.56,0.64,1) both;';
            ov.appendChild(sub);


            document.body.appendChild(ov);

            var ctx = canvas.getContext('2d');
            var coins = [];
            for (var i = 0; i < 60; i++) {
                coins.push({
                    x: Math.random() * canvas.width,
                    y: -20 - Math.random() * 200,
                    vy: 3 + Math.random() * 5,
                    vx: (Math.random() - 0.5) * 3,
                    r: 6 + Math.random() * 8,
                    rot: Math.random() * Math.PI * 2,
                    drot: (Math.random() - 0.5) * 0.2
                });
            }
            var frames = 0;
            var maxFrames = 90;
            function animateCoins() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                coins.forEach(function(c) {
                    c.x += c.vx; c.y += c.vy; c.rot += c.drot;
                    if (c.y > canvas.height + 20) { c.y = -20; c.x = Math.random() * canvas.width; }
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.rotate(c.rot);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, c.r, c.r * 0.55, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffd600';
                    ctx.fill();
                    ctx.strokeStyle = '#ff8f00';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.restore();
                });
                frames++;
                if (frames < maxFrames) requestAnimationFrame(animateCoins);
            }
            animateCoins();

            setTimeout(function() {
                if (ov.parentNode) ov.parentNode.removeChild(ov);
            }, 2500);
        }

        (function() {
            var _origDSWR_rj = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'random_jackpot') {
                    _origDSWR_rj(result, game);
                    if (!spinning && Math.random() < _RJ_CHANCE) {
                        setTimeout(function() { _triggerRandomJackpot(game); }, 600);
                    }
                    return;
                }
                _origDSWR_rj(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_rj = openSlot;
                openSlot = function(game) {
                    var ov = document.getElementById('rjOverlay');
                    if (ov) ov.parentNode && ov.parentNode.removeChild(ov);
                    _origOpenSlot_rj(game);
                };
            }
        })();


        // ── Jackpot Win Modal ─────────────────────────────────────────────────
        function showJackpotWinModal(tier, amount) {
            var overlay = document.getElementById('jackpotWinOverlay');
            if (!overlay) return;

            var tierConfig = {
                mini:  { label: 'MINI JACKPOT',  icon: '🥈', cls: 'jackpot-win-modal--mini'  },
                major: { label: 'MAJOR JACKPOT', icon: '🏆', cls: 'jackpot-win-modal--major' },
                mega:  { label: 'MEGA JACKPOT!', icon: '👑', cls: 'jackpot-win-modal--mega'  },
            };
            var cfg = tierConfig[tier] || tierConfig.mini;

            var modal = overlay.querySelector('.jackpot-win-modal');
            if (modal) {
                modal.className = 'jackpot-win-modal ' + cfg.cls;
            }

            var iconEl   = overlay.querySelector('.jackpot-win-icon');
            var tierEl   = overlay.querySelector('.jackpot-win-tier');
            var amountEl = overlay.querySelector('.jackpot-win-amount');

            if (iconEl)   iconEl.textContent   = cfg.icon;
            if (tierEl)   tierEl.textContent   = cfg.label;
            if (amountEl) amountEl.textContent = '+$' + Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            overlay.classList.add('active');

            // Trigger particle burst if available
            if (typeof triggerWinParticles === 'function') {
                try { triggerWinParticles('jackpot'); } catch(e) {}
            }
            if (typeof SoundManager !== 'undefined' && SoundManager.playSoundEvent) {
                try { SoundManager.playSoundEvent('jackpot'); } catch(e) {}
            }
        }

        function closeJackpotWinModal() {
            var overlay = document.getElementById('jackpotWinOverlay');
            if (overlay) overlay.classList.remove('active');
            // Refresh jackpot ticker amounts since jackpot just reset
            if (typeof _fetchAndRenderTournaments === 'function') {
                try { _fetchAndRenderTournaments(); } catch(e) {}
            }
        }
        window.closeJackpotWinModal = closeJackpotWinModal;

        // ── Tournament Active Badge in Slot ───────────────────────────────────
        function _injectTournamentBadge() {
            if (document.getElementById('tournSlotBadge')) return;
            fetch('/api/tournaments').then(function(r) { return r.json(); }).then(function(data) {
                var active = (data && data.active) || [];
                if (active.length === 0) return;
                var t = active[0];
                var badge = document.createElement('div');
                badge.id = 'tournSlotBadge';
                badge.className = 'tourn-slot-badge';
                badge.innerHTML = '🏆 <strong>Tournament Active</strong> — Best win multiplier wins <strong>' +
                    (t.type === 'daily' ? '$200' : '$25') + '</strong>';
                // Insert after the slot header area
                var slotModal = document.getElementById('slotModal') || document.getElementById('slot-modal') || document.querySelector('.slot-modal');
                var slotHeader = slotModal && (slotModal.querySelector('.slot-header') || slotModal.querySelector('.slot-top-bar'));
                if (slotHeader) {
                    slotHeader.insertAdjacentElement('afterend', badge);
                } else if (slotModal) {
                    slotModal.insertAdjacentElement('afterbegin', badge);
                }
            }).catch(function() {});
        }

        function _removeTournamentBadge() {
            var badge = document.getElementById('tournSlotBadge');
            if (badge) badge.remove();
        }

        // ══════════════════════════════════════════════════════════
        // SPRINT 37 — Demo Mode
        // ══════════════════════════════════════════════════════════
        var _demoMode = false;
        var _demoSpinsLeft = 0;
        var _demoRealBalance = 0;

        // Override openSlot to support demo mode: openSlot(gameId, { demo: true })
        (function() {
            var _origOpenSlot = typeof openSlot === 'function' ? openSlot : null;
            if (!_origOpenSlot) return;
            openSlot = function(gameId, opts) {
                _demoMode = !!(opts && opts.demo);
                if (_demoMode) {
                    _demoSpinsLeft = 3;
                    _demoRealBalance = typeof balance !== 'undefined' ? balance : 0;
                    balance = 10000;
                    if (typeof updateBalance === 'function') updateBalance();
                } else {
                    _demoMode = false;
                }
                _origOpenSlot(gameId);
                // Show/hide demo banner
                var banner = document.getElementById('demoBanner');
                var spansEl = document.getElementById('demoSpinsLeft');
                if (banner) banner.style.display = _demoMode ? 'flex' : 'none';
                if (spansEl) spansEl.textContent = _demoSpinsLeft;
            };
        })();

        function _demoOnSpinEnd() {
            if (!_demoMode) return;
            _demoSpinsLeft--;
            var spansEl = document.getElementById('demoSpinsLeft');
            if (spansEl) spansEl.textContent = _demoSpinsLeft;
            if (_demoSpinsLeft <= 0) {
                // Show demo end modal
                var modal = document.getElementById('demoEndModal');
                if (modal) modal.classList.add('active');
            }
        }

        function exitDemoMode(playForReal) {
            // Restore real balance (don't saveBalance during demo)
            if (_demoMode) {
                balance = _demoRealBalance;
                if (typeof updateBalance === 'function') updateBalance();
                if (typeof saveBalance === 'function') saveBalance();
            }
            _demoMode = false;
            _demoSpinsLeft = 0;
            _demoRealBalance = 0;
            var banner = document.getElementById('demoBanner');
            if (banner) banner.style.display = 'none';
            var modal = document.getElementById('demoEndModal');
            if (modal) modal.classList.remove('active');
            if (playForReal) {
                // Stay in slot with real balance
            } else {
                if (typeof closeSlot === 'function') closeSlot();
            }
        }

        // ══════════════════════════════════════════════════════════
        // SPRINT 38 — Session Time Tracker
        // ══════════════════════════════════════════════════════════
        var _sessionTimerInterval = null;
        var _sessionStartMs = 0;

        function _startSessionTimer() {
            _sessionStartMs = Date.now();
            var timerEl = document.getElementById('sessionTimer');
            if (timerEl) timerEl.style.display = '';
            _updateSessionTimer();
            if (_sessionTimerInterval) clearInterval(_sessionTimerInterval);
            _sessionTimerInterval = setInterval(_updateSessionTimer, 30000); // update every 30s
        }

        function _stopSessionTimer() {
            if (_sessionTimerInterval) { clearInterval(_sessionTimerInterval); _sessionTimerInterval = null; }
            var timerEl = document.getElementById('sessionTimer');
            if (timerEl) timerEl.style.display = 'none';
            var valEl = document.getElementById('sessionTimerVal');
            if (valEl) { valEl.className = 'payout-value session-timer-val'; }
            _sessionStartMs = 0;
        }

        function _updateSessionTimer() {
            if (!_sessionStartMs) return;
            var mins = Math.floor((Date.now() - _sessionStartMs) / 60000);
            var valEl = document.getElementById('sessionTimerVal');
            if (!valEl) return;
            valEl.textContent = mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
            valEl.className = 'payout-value session-timer-val';
            if (mins >= 60) valEl.classList.add('session-timer-red');
            else if (mins >= 30) valEl.classList.add('session-timer-yellow');
        }

        // ===== Sprint 39: Bet Doubler / Halver =====
        function doubleBet() {
            if (!currentGame || spinning) return;
            var bounds = getBetBounds();
            if (!bounds) return;
            var validSteps = BET_STEPS.filter(function(v) { return v >= bounds.minBet - 0.001 && v <= bounds.maxBet + 0.001; });
            if (!validSteps.length) return;
            var target = currentBet * 2;
            var next = validSteps.find(function(v) { return v >= target - 0.001; });
            if (!next) next = validSteps[validSteps.length - 1];
            currentBet = next;
            var betRange = document.getElementById('betRange');
            if (betRange) betRange.value = validSteps.indexOf(next);
            updateBetDisplay();
            var spinBtn = document.getElementById('spinBtn');
            if (spinBtn) spinBtn.disabled = spinning || currentBet > balance;
        }

        function halveBet() {
            if (!currentGame || spinning) return;
            var bounds = getBetBounds();
            if (!bounds) return;
            var validSteps = BET_STEPS.filter(function(v) { return v >= bounds.minBet - 0.001 && v <= bounds.maxBet + 0.001; });
            if (!validSteps.length) return;
            var target = currentBet / 2;
            var prev = validSteps[0];
            for (var i = 0; i < validSteps.length; i++) {
                if (validSteps[i] <= target + 0.001) prev = validSteps[i];
                else break;
            }
            currentBet = prev;
            var betRange = document.getElementById('betRange');
            if (betRange) betRange.value = validSteps.indexOf(prev);
            updateBetDisplay();
            var spinBtn = document.getElementById('spinBtn');
            if (spinBtn) spinBtn.disabled = spinning || currentBet > balance;
        }

        // ===== Sprint 40: Bankroll Manager =====
        var _bankrollBudget = 0;
        var _bankrollWagered = 0;

        function openBankrollManager() {
            if (!currentGame) return;
            var input = prompt('Set session budget ($):', '500');
            if (input === null) return;
            var amt = parseFloat(input);
            if (isNaN(amt) || amt <= 0) { if (typeof showToast === 'function') showToast('Invalid budget amount', 'warn'); return; }
            _bankrollBudget = amt;
            _bankrollWagered = 0;
            var row = document.getElementById('bankrollBarRow');
            if (row) row.style.display = '';
            _updateBankrollBar();
        }

        function _updateBankrollBar() {
            var row = document.getElementById('bankrollBarRow');
            if (!row || !_bankrollBudget) return;
            var pct = Math.min(100, Math.round(_bankrollWagered / _bankrollBudget * 100));
            var bar = document.getElementById('bankrollBar');
            var label = document.getElementById('bankrollBarLabel');
            if (bar) {
                bar.style.width = pct + '%';
                bar.className = 'bankroll-bar' + (pct >= 90 ? ' bk-red' : pct >= 75 ? ' bk-orange' : pct >= 50 ? ' bk-yellow' : '');
            }
            var remaining = Math.max(0, _bankrollBudget - _bankrollWagered);
            if (label) label.textContent = 'Budget: $' + remaining.toFixed(0) + ' remaining (' + pct + '% used)';
            if (pct >= 90 && pct < 100) { if (typeof showToast === 'function') showToast('\u26a0 Budget 90% used!', 'warn'); }
        }

        function dismissBankroll() {
            _bankrollBudget = 0; _bankrollWagered = 0;
            var row = document.getElementById('bankrollBarRow');
            if (row) row.style.display = 'none';
        }

        // ===== Sprint 41: Quick Game Switch Strip =====
        function _refreshQuickSwitch() {
            var strip = document.getElementById('quickSwitchStrip');
            var pills = document.getElementById('quickSwitchPills');
            if (!strip || !pills) return;
            var recent = [];
            try { recent = JSON.parse(localStorage.getItem(typeof RECENTLY_PLAYED_KEY !== 'undefined' ? RECENTLY_PLAYED_KEY : 'matrixRecentlyPlayed') || '[]'); } catch(e) {}
            if (recent.length < 2) { strip.style.display = 'none'; return; }
            strip.style.display = '';
            pills.innerHTML = '';
            var shown = recent.slice(0, 5);
            shown.forEach(function(gameId) {
                if (!gameId) return;
                var game = typeof GAMES !== 'undefined' ? GAMES.find(function(g) { return g.id === gameId; }) : null;
                if (!game) return;
                var pill = document.createElement('button');
                pill.className = 'quick-switch-pill' + (currentGame && currentGame.id === gameId ? ' qs-active' : '');
                pill.title = game.name;
                pill.innerHTML = '<span class="qs-emoji">' + (game.emoji || '\uD83C\uDFB0') + '</span><span class="qs-name">' + game.name + '</span>';
                pill.onclick = (function(gid) { return function() {
                    if (currentGame && currentGame.id === gid) return;
                    if (typeof closeSlot === 'function' && typeof openSlot === 'function') {
                        closeSlot();
                        setTimeout(function() { openSlot(gid); }, 350);
                    }
                }; })(gameId);
                pills.appendChild(pill);
            });
        }

        // ===== Sprint 42: Session Win Goal =====
        var _winGoalTarget = 0;
        var _winGoalEarned = 0;
        var _winGoalCelebrated = false;

        function openWinGoal() {
            if (!currentGame) return;
            var input = prompt('Set win goal ($):', '1000');
            if (input === null) return;
            var amt = parseFloat(input);
            if (isNaN(amt) || amt <= 0) { if (typeof showToast === 'function') showToast('Invalid goal amount', 'warn'); return; }
            _winGoalTarget = amt;
            _winGoalEarned = 0;
            _winGoalCelebrated = false;
            var tracker = document.getElementById('winGoalTracker');
            if (tracker) { tracker.style.display = ''; tracker.classList.remove('wgt-complete'); }
            var targetEl = document.getElementById('wgtTarget');
            if (targetEl) targetEl.textContent = amt.toFixed(0);
            _updateWinGoal(0);
        }

        function _updateWinGoal(winAmt) {
            if (!_winGoalTarget || winAmt <= 0) return;
            _winGoalEarned += winAmt;
            var pct = Math.min(100, Math.round(_winGoalEarned / _winGoalTarget * 100));
            var bar = document.getElementById('wgtProgressBar');
            var pctEl = document.getElementById('wgtPct');
            if (bar) bar.style.width = pct + '%';
            if (pctEl) pctEl.textContent = pct + '%';
            if (pct >= 100 && !_winGoalCelebrated) {
                _winGoalCelebrated = true;
                if (typeof showToast === 'function') showToast('\uD83C\uDFAF Win goal reached! \uD83C\uDF89', 'win');
                if (typeof triggerConfettiBurst === 'function') triggerConfettiBurst();
                var tracker = document.getElementById('winGoalTracker');
                if (tracker) tracker.classList.add('wgt-complete');
            }
        }

        function dismissWinGoal() {
            _winGoalTarget = 0; _winGoalEarned = 0; _winGoalCelebrated = false;
            var tracker = document.getElementById('winGoalTracker');
            if (tracker) { tracker.style.display = 'none'; tracker.classList.remove('wgt-complete'); }
        }

        // ===== Sprint 44: P&L Sparkline =====
        var _sparklineData = [];
        var _sparklineMaxPoints = 20;

        function _initSparkline() {
            _sparklineData = [];
            var svg = document.getElementById('pnlSparkline');
            var line = document.getElementById('pnlLine');
            if (!svg || !line) return;
            svg.style.display = 'none';
            line.setAttribute('points', '');
        }

        function _updateSparkline(currentBalance) {
            _sparklineData.push(currentBalance);
            if (_sparklineData.length > _sparklineMaxPoints) _sparklineData.shift();
            var svg = document.getElementById('pnlSparkline');
            var line = document.getElementById('pnlLine');
            if (!svg || !line || _sparklineData.length < 2) return;
            svg.style.display = '';
            var W = 80, H = 22, pad = 2;
            var min = Math.min.apply(null, _sparklineData);
            var max = Math.max.apply(null, _sparklineData);
            var range = max - min || 1;
            var pts = _sparklineData.map(function(v, i) {
                var x = pad + (i / (_sparklineData.length - 1)) * (W - 2 * pad);
                var y = H - pad - ((v - min) / range) * (H - 2 * pad);
                return x.toFixed(1) + ',' + y.toFixed(1);
            }).join(' ');
            line.setAttribute('points', pts);
            var isUp = _sparklineData[_sparklineData.length - 1] >= _sparklineData[0];
            line.setAttribute('stroke', isUp ? '#22c55e' : '#ef4444');
        }

        // ===== Sprint 46: Win Multiplier Streak =====
        // Note: _winStreak is already declared in globals.js — no re-declaration needed

        function _incrementStreak() {
            _winStreak++;
            var badge = document.getElementById('winStreakBadge');
            var count = document.getElementById('winStreakCount');
            if (!badge) return;
            badge.style.display = '';
            if (count) count.textContent = _winStreak;
            badge.classList.remove('streak-pulse');
            void badge.offsetWidth;
            badge.classList.add('streak-pulse');
        }

        function _resetStreak() {
            _winStreak = 0;
            var badge = document.getElementById('winStreakBadge');
            if (badge) badge.style.display = 'none';
        }
