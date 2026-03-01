// ═══════════════════════════════════════════════════════
// UI-LOBBY MODULE
// ═══════════════════════════════════════════════════════

        // Module-level search state — persists across filter tab switches
        let lobbySearchQuery = '';
        let currentMechanicFilter = 'all'; // 'all' | 'tumble' | 'hold_win' | 'free_spins' | 'wilds' | 'jackpot'
        let currentSortMode = 'default';    // 'default' | 'vol_asc' | 'vol_desc'
        let _sortOrder = 'popular';          // Sprint 37 dropdown: 'popular'|'az'|'za'|'rtp'|'volatile'|'chill'
        let searchQuery = '';                      // real-time game search (compound with other filters)
        let _lobbySearchQuery = '';                // hide/show search query (Sprint 18 search bar)

        // Slot of the Day state (Sprint 24)
        let gameOfDayId = null;
        let gameOfDayTimer = null;

        // Hot/Cold game stats cache (Sprint 25)
        let gameStatsMap = {};  // gameId -> { actualRtp, totalSpins }

        // Tournament banner state
        let _activeTournaments = [];
        let _tournamentCountdownInterval = null;
        let _tournamentRefreshInterval = null;

        // Quick-resume banner state
        var _resumeBannerTimer = null;
        var _lastPlayedGameForResume = null;

        // Live player count simulation
        var _liveCounts = {};

        function _seedCount(gameId, isHot) {
            var h = 0;
            for (var i = 0; i < gameId.length; i++) { h = (h * 31 + gameId.charCodeAt(i)) & 0xffff; }
            var base = isHot ? (18 + h % 80) : (8 + h % 45);
            _liveCounts[gameId] = base;
        }

        function _getLiveCount(gameId) {
            return _liveCounts[gameId] || 12;
        }

        function _tickLiveCounts() {
            Object.keys(_liveCounts).forEach(function(id) {
                var delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
                _liveCounts[id] = Math.max(6, _liveCounts[id] + delta);
                // Update any visible badges
                var badge = document.querySelector('.card-players-live[data-game="' + id + '"]');
                if (badge) badge.lastChild.nodeValue = ' ' + _liveCounts[id] + ' playing';
            });
        }


        // ═══════════════════════════════════════════════════════
        // LOADING SKELETONS
        // ═══════════════════════════════════════════════════════

        function createSkeletonCards(count) {
            let html = '';
            for (let i = 0; i < count; i++) {
                html += `<div class="game-card-skeleton">
                    <div class="skeleton-thumb"></div>
                    <div class="skeleton-text">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                    </div>
                </div>`;
            }
            return html;
        }


        function _getMechanicCategory(game) {
            const bt = game.bonusType || '';
            if (bt === 'tumble' || bt === 'avalanche' || bt === 'cascading') return 'tumble';
            if (bt === 'hold_and_win' || bt === 'coin_respin') return 'hold_win';
            if (bt === 'random_jackpot' || game.tag === 'JACKPOT' || game.tag === 'MEGA') return 'jackpot';
            if (bt.includes('wild')) return 'wilds';
            if ((game.freeSpinsCount && game.freeSpinsCount > 0) || bt.includes('free') || bt.includes('spin') ||
                bt === 'chamber_spins' || bt === 'sticky_wilds' || bt === 'walking_wilds' ||
                bt === 'multiplier_wilds' || bt === 'increasing_mult' || bt === 'win_streak' ||
                bt === 'prize_wheel' || bt === 'symbol_collect') return 'free_spins';
            return 'other';
        }

        function _getVolatility(game) {
            const payouts = game.payouts || {};
            const vals = Object.values(payouts).filter(v => typeof v === 'number');
            if (!vals.length) return 2;
            const maxMult = game.minBet > 0 ? Math.max(...vals) / game.minBet : 0;
            if (maxMult >= 300) return 3;
            if (maxMult >= 100) return 2;
            return 1;
        }


        function updateBalance() {
            document.getElementById('balance').textContent = formatMoney(balance);
            const slotBal = document.getElementById('slotBalance');
            if (slotBal) slotBal.textContent = formatMoney(balance);
            refreshBetControls();
            // Balance sparkline (Sprint 29)
            recordBalancePoint(balance);
        }

        // ── Wagering Progress Display ────────────────────────────────
        var _lastWageringStatus = null;

        function updateWageringDisplay(wagerStatus) {
            _lastWageringStatus = wagerStatus;
            var wrap = document.getElementById('wageringBarWrap');
            var fill = document.getElementById('wageringBarFill');
            var label = document.getElementById('wageringBarLabel');
            if (!wrap) return;
            if (!wagerStatus || !wagerStatus.active) {
                wrap.style.display = 'none';
                return;
            }
            wrap.style.display = '';
            if (fill) fill.style.width = Math.min(100, wagerStatus.pct || 0) + '%';
            if (label) label.textContent = 'Bonus: $' + (wagerStatus.bonusBalance || 0).toFixed(0) + ' (' + (wagerStatus.pct || 0) + '% wagered)';

            // Also update wallet display if visible
            var walletBonus = document.getElementById('walletBonusDisplay');
            if (walletBonus) {
                walletBonus.style.display = '';
                var bonusBal = document.getElementById('walletBonusBalance');
                if (bonusBal) bonusBal.textContent = (wagerStatus.bonusBalance || 0).toFixed(2);
                var info = document.getElementById('walletWageringInfo');
                if (info) {
                    var remaining = (wagerStatus.requirement - wagerStatus.progress).toFixed(0);
                    info.textContent = 'Wager $' + remaining + ' more to unlock (' + wagerStatus.pct + '% complete)';
                }
            }
        }

        // ── Balance History Sparkline (Sprint 29) ────────────────────────────────
        var _BALANCE_HIST_KEY = 'matrixBalanceHistory';
        var _BALANCE_HIST_MAX = 100;

        function recordBalancePoint(bal) {
            try {
                var hist = JSON.parse(localStorage.getItem(_BALANCE_HIST_KEY) || '[]');
                hist.push({ t: Date.now(), v: bal });
                if (hist.length > _BALANCE_HIST_MAX) hist = hist.slice(-_BALANCE_HIST_MAX);
                localStorage.setItem(_BALANCE_HIST_KEY, JSON.stringify(hist));
            } catch(e) {}
            renderBalanceSparkline();
        }

        function renderBalanceSparkline() {
            var svgEl = document.getElementById('balanceSparkline');
            var wrapEl = document.getElementById('balanceSparklineWrap');
            if (!svgEl || !wrapEl) return;
            var hist = [];
            try { hist = JSON.parse(localStorage.getItem(_BALANCE_HIST_KEY) || '[]'); } catch(e) {}
            var pts = hist.slice(-50);
            if (pts.length < 3) { wrapEl.style.display = 'none'; return; }
            wrapEl.style.display = '';
            var vals = pts.map(function(p) { return p.v; });
            var minV = Math.min.apply(null, vals);
            var maxV = Math.max.apply(null, vals);
            var range = maxV - minV || 1;
            var W = 120, H = 36, pad = 3;
            var points = vals.map(function(v, i) {
                var x = pad + (i / (vals.length - 1)) * (W - pad * 2);
                var y = H - pad - ((v - minV) / range) * (H - pad * 2);
                return x.toFixed(1) + ',' + y.toFixed(1);
            }).join(' ');
            var isUp = vals[vals.length - 1] >= vals[0];
            var color = isUp ? '#4ade80' : '#f87171';
            svgEl.innerHTML =
                '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
        }


        function getBetBounds() {
            if (!currentGame) return null;
            // Find the first BET_STEPS value at or above the game's minBet floor
            const gameMin = currentGame.minBet;
            const gameMax = Math.min(currentGame.maxBet, balance || gameMin);
            const validSteps = BET_STEPS.filter(v => v >= gameMin - 0.001 && v <= gameMax + 0.001);
            if (validSteps.length === 0) {
                // Edge case: balance too low for even the cheapest step — use game floor directly
                return { minBet: gameMin, maxBet: Math.max(gameMin, gameMax) };
            }
            return { minBet: validSteps[0], maxBet: validSteps[validSteps.length - 1] };
        }


        function refreshBetControls() {
            if (!currentGame) return;

            const betRange = document.getElementById('betRange');
            const bounds = getBetBounds();
            if (!betRange || !bounds) return;

            // Build valid step list for this game/balance combo
            const validSteps = BET_STEPS.filter(v => v >= bounds.minBet - 0.001 && v <= bounds.maxBet + 0.001);
            const stepCount = validSteps.length;

            // Range slider travels 0…(stepCount-1) indices — non-linear mapping
            betRange.min   = 0;
            betRange.max   = Math.max(0, stepCount - 1);
            betRange.step  = 1;

            // Snap currentBet to the nearest valid step
            if (stepCount > 0) {
                if (currentBet < bounds.minBet) currentBet = bounds.minBet;
                if (currentBet > bounds.maxBet) currentBet = bounds.maxBet;
                const nearest = validSteps.reduce((a, b) =>
                    Math.abs(b - currentBet) < Math.abs(a - currentBet) ? b : a);
                currentBet = nearest;
                betRange.value = validSteps.findIndex(v => Math.abs(v - currentBet) < 0.001);
            }

            document.getElementById('minBet').textContent = bounds.minBet.toFixed(2);
            document.getElementById('maxBet').textContent = currentGame.maxBet.toFixed(2);
            updateBetDisplay();

            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.disabled = spinning || currentBet > balance;
            }
        }


        function showResumeBanner(game) {
            if (!game) return;
            // Remove existing banner
            var old = document.getElementById('lobbyResumeBanner');
            if (old) old.remove();
            if (_resumeBannerTimer) { clearTimeout(_resumeBannerTimer); _resumeBannerTimer = null; }

            var banner = document.createElement('div');
            banner.id = 'lobbyResumeBanner';
            banner.className = 'lobby-resume-banner';
            banner.innerHTML =
                '<span class="resume-icon">&#8629;</span>' +
                '<span class="resume-label">Resume <strong>' + (game.name || 'Last Game') + '</strong></span>' +
                '<span class="resume-x" id="resumeBannerX">&#x2715;</span>';

            document.body.appendChild(banner);

            // Slide in
            requestAnimationFrame(function() {
                requestAnimationFrame(function() { banner.classList.add('visible'); });
            });

            // Click banner body to resume
            banner.addEventListener('click', function(e) {
                if (e.target.id === 'resumeBannerX') return;
                banner.classList.remove('visible');
                setTimeout(function() { if (banner.parentNode) banner.remove(); }, 400);
                if (_resumeBannerTimer) { clearTimeout(_resumeBannerTimer); _resumeBannerTimer = null; }
                if (typeof openSlot === 'function') openSlot(game);
            });

            // X to dismiss
            document.getElementById('resumeBannerX').addEventListener('click', function(e) {
                e.stopPropagation();
                banner.classList.remove('visible');
                setTimeout(function() { if (banner.parentNode) banner.remove(); }, 400);
                if (_resumeBannerTimer) { clearTimeout(_resumeBannerTimer); _resumeBannerTimer = null; }
            });

            // Auto-dismiss after 8s
            _resumeBannerTimer = setTimeout(function() {
                banner.classList.remove('visible');
                setTimeout(function() { if (banner.parentNode) banner.remove(); }, 400);
                _resumeBannerTimer = null;
            }, 8000);
        }

        // Called from closeSlot in ui-slot.js to capture last played game before returning to lobby
        function captureLastPlayedGame() {
            if (typeof currentGame !== 'undefined' && currentGame) {
                _lastPlayedGameForResume = currentGame;
            }
        }

        function renderRecommendations(container) {
            // Need recently played data
            var rpRaw = localStorage.getItem(typeof RECENTLY_PLAYED_KEY !== 'undefined' ? RECENTLY_PLAYED_KEY : 'recentlyPlayed');
            var rpIds = [];
            try { rpIds = JSON.parse(rpRaw) || []; } catch(e) {}
            if (rpIds.length < 2) return; // Not enough history

            var allGames = typeof GAMES !== 'undefined' ? GAMES : [];
            var rpGames = rpIds.slice(0, 5).map(function(id) {
                return allGames.find(function(g) { return g.id === id; });
            }).filter(Boolean);
            if (rpGames.length < 2) return;

            // Collect providers and bonusTypes from recent plays
            var likedProviders = {};
            var likedBonus = {};
            rpGames.forEach(function(g) {
                if (g.provider) likedProviders[g.provider] = (likedProviders[g.provider] || 0) + 1;
                if (g.bonusType) likedBonus[g.bonusType] = (likedBonus[g.bonusType] || 0) + 1;
            });

            // Score all games by affinity
            var rpIdSet = new Set(rpIds);
            var scored = allGames.filter(function(g) { return !rpIdSet.has(g.id); }).map(function(g) {
                var score = 0;
                if (g.provider && likedProviders[g.provider]) score += likedProviders[g.provider] * 2;
                if (g.bonusType && likedBonus[g.bonusType]) score += likedBonus[g.bonusType];
                return { game: g, score: score };
            }).filter(function(x) { return x.score > 0; });
            scored.sort(function(a, b) { return b.score - a.score; });

            var picks = scored.slice(0, 4).map(function(x) { return x.game; });
            if (picks.length === 0) return;

            var row = document.createElement('div');
            row.className = 'lobby-recommendations';
            row.innerHTML = '<div class="lobby-rec-label">Recommended for you</div>';
            var chips = document.createElement('div');
            chips.className = 'lobby-rec-games';
            picks.forEach(function(g) {
                var chip = document.createElement('div');
                chip.className = 'lobby-rec-chip';
                chip.textContent = g.name || g.id;
                chip.addEventListener('click', function() {
                    if (typeof openSlot === 'function') openSlot(g.id);
                });
                chips.appendChild(chip);
            });
            row.appendChild(chips);
            container.appendChild(row);
        }


                // ── XP Level Badge (Sprint 20) ────────────────────────────────────────
        function _renderXPBadge() {
            // Read XP data from localStorage using the canonical key
            const XP_KEY = typeof XP_STORAGE_KEY !== 'undefined' ? XP_STORAGE_KEY
                         : typeof STORAGE_KEY_XP  !== 'undefined' ? STORAGE_KEY_XP
                         : 'casinoXP';
            let xpData = null;
            try {
                const raw = localStorage.getItem(XP_KEY);
                if (raw) xpData = JSON.parse(raw);
            } catch(e) {}

            // XP data is {xp: <within-level>, level: <level>} — same structure as saveXP()
            const level      = (xpData && xpData.level   != null) ? Math.max(1, xpData.level)   : 1;
            const xpIntoLvl  = (xpData && xpData.xp      != null) ? Math.max(0, xpData.xp)      : 0;

            // XP required for THIS level: floor(100 * 1.25^(level-1))
            const baseXP   = typeof BASE_XP_PER_LEVEL     !== 'undefined' ? BASE_XP_PER_LEVEL     : 100;
            const growth   = typeof XP_LEVEL_GROWTH_RATE  !== 'undefined' ? XP_LEVEL_GROWTH_RATE  : 1.25;
            const needed   = Math.max(1, Math.floor(baseXP * Math.pow(growth, level - 1)));
            const xpToNext = Math.max(0, needed - xpIntoLvl);
            const pct      = Math.min(100, Math.round((xpIntoLvl / needed) * 100));

            // Icon scales with level tier
            const icon = level >= 50 ? '💎' : level >= 20 ? '🏆' : level >= 10 ? '⭐' : '🎮';

            // Create badge element once; update on every call
            let badge = document.getElementById('xpLevelBadge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id        = 'xpLevelBadge';
                badge.className = 'xp-level-badge';
                badge.title     = 'Your XP progress — click to open stats';
                badge.addEventListener('click', function() {
                    if (typeof openStatsModal === 'function') openStatsModal();
                    else if (typeof openXPModal === 'function') openXPModal();
                });

                // Insert before #filterTabs so it sits above the game filter row
                const filterTabs = document.getElementById('filterTabs');
                if (filterTabs && filterTabs.parentNode) {
                    filterTabs.parentNode.insertBefore(badge, filterTabs);
                } else {
                    // Fallback: prepend to main lobby container
                    const lobby = document.getElementById('lobby') ||
                                  document.getElementById('lobbyView') ||
                                  document.querySelector('.lobby-container');
                    if (lobby) lobby.insertBefore(badge, lobby.firstChild);
                }
            }

            badge.innerHTML = [
                '<span class="xp-badge-icon">' + icon + '</span>',
                '<div class="xp-badge-info">',
                  '<div class="xp-badge-level-row">',
                    '<span class="xp-badge-level">Level ' + level + '</span>',
                    '<span class="xp-badge-next">' + xpToNext.toLocaleString() + ' xp to next</span>',
                  '</div>',
                  '<div class="xp-bar-track">',
                    '<div class="xp-bar-fill" style="width:' + pct + '%"></div>',
                  '</div>',
                '</div>'
            ].join('');
        }

// ═══════════════════════════════════════════════════════
        // SLOT OF THE DAY (Sprint 24)
        // ═══════════════════════════════════════════════════════

        function applyGameOfDayBadge() {
            // Remove any stale badge first
            var oldBadge = document.querySelector('.game-of-day-badge');
            if (oldBadge) oldBadge.remove();
            var oldCard = document.querySelector('.game-of-day-card');
            if (oldCard) oldCard.classList.remove('game-of-day-card');
            if (!gameOfDayId) return;
            // data-game-id is stored lowercased in the DOM
            var card = document.querySelector('[data-game-id="' + gameOfDayId.toLowerCase() + '"]');
            if (card) {
                card.classList.add('game-of-day-card');
                var badge = document.createElement('div');
                badge.className = 'game-of-day-badge';
                badge.innerHTML = '&#11088; TODAY';
                card.appendChild(badge);
            }
        }

        function fetchGameOfDay() {
            fetch('/api/game-of-day')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data && data.gameId) {
                        gameOfDayId = data.gameId;
                        applyGameOfDayBadge();
                        // Set up countdown to refresh at midnight UTC
                        if (gameOfDayTimer) clearTimeout(gameOfDayTimer);
                        if (data.secondsUntilNext > 0) {
                            gameOfDayTimer = setTimeout(fetchGameOfDay, data.secondsUntilNext * 1000);
                        }
                    }
                })
                .catch(function() {
                    // Fallback: client-side deterministic selection
                    if (typeof GAMES !== 'undefined' && GAMES && GAMES.length) {
                        var dayIdx = Math.floor(Date.now() / 86400000);
                        var sortedIds = GAMES.map(function(g) { return g.id; }).sort();
                        gameOfDayId = sortedIds[dayIdx % sortedIds.length];
                    }
                });
        }

function fetchGameStats() {
            fetch('/api/game-stats')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data && Array.isArray(data.stats)) {
                        gameStatsMap = {};
                        data.stats.forEach(function(s) {
                            gameStatsMap[s.gameId] = { actualRtp: s.actualRtp, totalSpins: s.totalSpins };
                        });
                        // Re-apply badges to already-rendered cards
                        applyHotColdBadges();
                    }
                })
                .catch(function() {
                    // silently fail — hot/cold is cosmetic only
                });
        }

        function applyHotColdBadges() {
            // Remove any existing hot/cold badges
            document.querySelectorAll('.game-hot-badge, .game-cold-badge').forEach(function(el) { el.remove(); });
            document.querySelectorAll('.game-card').forEach(function(card) {
                var gameId = card.getAttribute('data-game-id');
                if (!gameId) return;
                var stats = gameStatsMap[gameId];
                if (!stats) return;
                var badge = document.createElement('div');
                if (stats.actualRtp > 92) {
                    badge.className = 'game-hot-badge';
                    badge.textContent = '🔥';
                    badge.title = 'Hot! Recent RTP: ' + stats.actualRtp.toFixed(1) + '%';
                    card.appendChild(badge);
                } else if (stats.actualRtp < 84) {
                    badge.className = 'game-cold-badge';
                    badge.textContent = '❄️';
                    badge.title = 'Cold. Recent RTP: ' + stats.actualRtp.toFixed(1) + '%';
                    card.appendChild(badge);
                }
            });
        }

function renderGames() {
            renderLobbyChallengeWidget();

            // Show resume banner if returning from a slot
            if (typeof _lastPlayedGameForResume !== 'undefined' && _lastPlayedGameForResume) {
                showResumeBanner(_lastPlayedGameForResume);
                _lastPlayedGameForResume = null;
            }

            // Inject search bar once — positioned before filter tabs
            if (!document.getElementById('lobbySearchBar')) {
                const filterTabs = document.getElementById('filterTabs');
                if (filterTabs) {
                    const searchBarEl = document.createElement('div');
                    searchBarEl.id = 'lobbySearchBar';
                    searchBarEl.innerHTML = `
                        <div style="position:relative; flex:1;">
                            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.4);font-size:16px;">🔍</span>
                            <input id="lobbySearchInput" type="text" placeholder="Search games or providers..."
                                style="width:100%;padding:9px 36px 9px 34px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                                       border-radius:20px;color:#fff;font-size:13px;outline:none;box-sizing:border-box;"
                                oninput="lobbyOnSearch(this.value)">
                            <button id="lobbySearchClear" onclick="lobbyOnSearch('')"
                                style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);
                                       background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
                        </div>
                    `;
                    filterTabs.parentNode.insertBefore(searchBarEl, filterTabs);
                }
            }

            // Inject provider quick-link strip once — after search bar, before filter tabs
            if (!document.getElementById('lobbyProviderStrip')) {
                const filterTabs = document.getElementById('filterTabs');
                if (filterTabs) {
                    const providers = [...new Set(games.map(g => g.provider))].sort();
                    const stripEl = document.createElement('div');
                    stripEl.id = 'lobbyProviderStrip';
                    stripEl.style.cssText = 'display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px;scrollbar-width:none;';
                    stripEl.innerHTML = providers.map(p => `
                        <button class="lobby-provider-pill" onclick="lobbySetProvider('${p.replace(/'/g, "\\'")}')"
                            data-provider="${p}"
                            style="flex-shrink:0;padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);
                                   background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);font-size:11px;
                                   cursor:pointer;white-space:nowrap;transition:all 0.15s;">
                            ${p}
                        </button>`).join('');
                    filterTabs.parentNode.insertBefore(stripEl, filterTabs);
                }
            }

            // Inject Favourites filter tab once
            if (!document.getElementById('favFilterTab')) {
                const filterTabs = document.getElementById('filterTabs');
                if (filterTabs) {
                    const favTab = document.createElement('button');
                    favTab.id = 'favFilterTab';
                    favTab.className = 'filter-tab';
                    favTab.dataset.filter = 'favorites';
                    favTab.setAttribute('onclick', "setFilter('favorites')");
                    favTab.innerHTML = '\u2764\uFE0F Favourites';
                    filterTabs.appendChild(favTab);
                }
            }

            const hotGamesDiv = document.getElementById('hotGames');
            const allGamesDiv = document.getElementById('allGames');

            // Show loading skeletons first for a polished loading feel
            hotGamesDiv.innerHTML = createSkeletonCards(6);
            allGamesDiv.innerHTML = createSkeletonCards(12);

            // Small delay to ensure CSS animations render, then swap in real cards
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const hotGames = games.filter(g => g.hot);
                    hotGamesDiv.innerHTML = hotGames.map(g => createGameCard(g)).join('');
                    renderFilteredGames();
                    _injectLobbySearch();
                    renderRecentlyPlayed();
                    renderYouMightLike();
                    renderRecommendations(allGamesDiv.parentNode || document.getElementById('lobby') || allGamesDiv);
                    renderBestWins();
                    if (typeof _injectFilterCounts === 'function') _injectFilterCounts();
                    if (typeof _renderFeaturedSpotlight === 'function') _renderFeaturedSpotlight();
                    if (typeof _initLazyThumbnails === 'function') _initLazyThumbnails();
                    // Slot of the Day — fetch once on first render, timer handles subsequent days
                    if (!gameOfDayId) fetchGameOfDay();
                    else applyGameOfDayBadge();
                    // Hot/Cold badges — fire-and-forget, cosmetic only
                    fetchGameStats();
                    // Start live-count tick once, persists across re-renders
                    if (!window._liveCountsInterval) {
                        window._liveCountsInterval = setInterval(_tickLiveCounts, 15000 + Math.random() * 6000);
                    }
                    // Initial tab count badges after games load (Sprint 19)
                    setTimeout(function() { if (typeof _updateTabCounts === 'function') _updateTabCounts(); }, 0);
                    // XP level badge update (Sprint 20)
                    setTimeout(function() { if (typeof _renderXPBadge === 'function') _renderXPBadge(); }, 50);
                    // Balance sparkline (Sprint 29)
                    renderBalanceSparkline();
                }, 200);
            });
        }


        function addRecentlyPlayed(gameId) {
            let recent = [];
            try { recent = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; } catch(e) {}
            recent = recent.filter(id => id !== gameId);
            recent.unshift(gameId);
            if (recent.length > MAX_RECENTLY_PLAYED) recent = recent.slice(0, MAX_RECENTLY_PLAYED);
            localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(recent));
            renderRecentlyPlayed();
        }


        function renderRecentlyPlayed() {
            let recent = [];
            try { recent = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; } catch(e) {}
            const section = document.getElementById('recentlyPlayedSection');
            const container = document.getElementById('recentlyPlayedGames');
            if (!section || !container) return;
            if (recent.length === 0) { section.style.display = 'none'; return; }
            const recentGames = recent.map(id => games.find(g => g.id === id)).filter(Boolean);
            section.style.display = '';
            container.innerHTML = recentGames.map(g => createGameCard(g)).join('');
            renderYouMightLike();
            renderBestWins();
        }

        function renderYouMightLike() {
            // Clean up stale section if games list not ready
            if (!games || games.length === 0) return;

            // Get recently played IDs
            let recentIds = [];
            try { recentIds = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; } catch(e) {}
            if (recentIds.length < 2) {
                // Not enough play history — hide the section
                const old = document.getElementById('youMightLikeSection');
                if (old) old.style.display = 'none';
                return;
            }

            // Determine dominant mechanic category from recent games
            const recentGames = recentIds.map(id => games.find(g => g.id === id)).filter(Boolean);
            const categoryCounts = {};
            recentGames.forEach(g => {
                const cat = _getMechanicCategory(g);
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            // Pick the most-played category (excluding 'other')
            let topCat = 'other';
            let topCount = 0;
            Object.entries(categoryCounts).forEach(([cat, count]) => {
                if (cat !== 'other' && count > topCount) { topCat = cat; topCount = count; }
            });
            // If all are 'other', pick any
            if (topCat === 'other') {
                topCat = Object.keys(categoryCounts)[0] || 'other';
            }

            // Find candidate games: same mechanic, not recently played
            const recentSet = new Set(recentIds);
            const candidates = games.filter(g => !recentSet.has(g.id) && _getMechanicCategory(g) === topCat);

            if (candidates.length === 0) {
                const old = document.getElementById('youMightLikeSection');
                if (old) old.style.display = 'none';
                return;
            }

            // Shuffle and take up to 6
            const shuffled = candidates.slice().sort(() => Math.random() - 0.5).slice(0, 6);

            const catLabels = {
                tumble: '🌊 Tumble Games', hold_win: '🎯 Hold & Win', free_spins: '🎁 Free Spins',
                wilds: '🌟 Wild Games', jackpot: '🏆 Jackpot Games', other: '🎰 Similar Games'
            };
            const label = catLabels[topCat] || 'Similar Games';
            const becauseGame = recentGames[0] ? recentGames[0].name : 'similar games';

            // Inject or update section
            let section = document.getElementById('youMightLikeSection');
            if (!section) {
                section = document.createElement('div');
                section.id = 'youMightLikeSection';
                // Insert after recentlyPlayedSection, or before allGames header
                const recentSec = document.getElementById('recentlyPlayedSection');
                if (recentSec && recentSec.parentNode) {
                    recentSec.parentNode.insertBefore(section, recentSec.nextSibling);
                } else {
                    const allGames = document.getElementById('allGames');
                    if (allGames && allGames.parentNode) allGames.parentNode.insertBefore(section, allGames);
                }
            }

            section.style.display = '';
            section.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title" style="font-size:14px">${label}<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.35);margin-left:8px;font-style:italic;">because you play ${becauseGame}</span></h3>
                </div>
                <div class="recently-played-scroll" id="youMightLikeGames">
                    ${shuffled.map(g => createGameCard(g)).join('')}
                </div>`;
        }

        function renderBestWins() {
            const HOF_KEY = typeof STORAGE_KEY_HALL_OF_FAME !== 'undefined'
                ? STORAGE_KEY_HALL_OF_FAME : 'matrixHallOfFame';
            let entries = [];
            try { entries = JSON.parse(localStorage.getItem(HOF_KEY)) || []; } catch(e) {}

            // Remove stale section if no data
            const existing = document.getElementById('bestWinsSection');
            if (entries.length === 0) {
                if (existing) existing.style.display = 'none';
                return;
            }

            // Take top 5 by amount
            const top = entries.slice().sort((a, b) => b.amount - a.amount).slice(0, 5);

            let section = existing;
            if (!section) {
                section = document.createElement('div');
                section.id = 'bestWinsSection';
                // Inject at end of lobby container (after youMightLikeSection or allGames)
                const yml = document.getElementById('youMightLikeSection');
                const allGames = document.getElementById('allGames');
                const anchor = yml || allGames;
                if (anchor && anchor.parentNode) {
                    anchor.parentNode.appendChild(section);
                } else {
                    const container = document.querySelector('.lobby-content') || document.querySelector('main');
                    if (container) container.appendChild(section);
                }
            }

            section.style.display = '';
            section.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title" style="font-size:14px">🏆 Your Best Wins</h3>
                </div>
                <div class="best-wins-list">
                    ${top.map((e, idx) => `
                    <div class="best-win-row">
                        <span class="bw-rank">#${idx + 1}</span>
                        <span class="bw-game">${e.gameName || e.game || 'Unknown'}</span>
                        <span class="bw-mult">${e.mult ? e.mult.toFixed(1) + '×' : ''}</span>
                        <span class="bw-amount">$${(e.amount || 0).toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                        <span class="bw-date">${e.date ? e.date.slice(0,10) : ''}</span>
                    </div>
                    `).join('')}
                </div>`;
        }


        function startJackpotTicker() {
            const fmt = v => '$' + Number(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            // Live display values — ticked up between fetches
            const _live = { mini: 500, major: 2500, mega: 10000 };

            async function fetchAndUpdate() {
                try {
                    const res = await fetch('/api/jackpot');
                    if (!res.ok) return;
                    const data = await res.json();
                    // Snap live values to server truth
                    _live.mini  = Number(data.mini)  || 500;
                    _live.major = Number(data.major) || 2500;
                    _live.mega  = Number(data.mega)  || 10000;
                } catch (_) {}
            }

            // Inflate displayed values by a tiny random amount every 200ms
            setInterval(function() {
                _live.mini  += 0.01 + Math.random() * 0.02;
                _live.major += 0.03 + Math.random() * 0.05;
                _live.mega  += 0.10 + Math.random() * 0.15;
                const mini  = document.getElementById('jackpot-mini-amount');
                const major = document.getElementById('jackpot-major-amount');
                const mega  = document.getElementById('jackpot-mega-amount');
                if (mini)  mini.textContent  = fmt(_live.mini);
                if (major) major.textContent = fmt(_live.major);
                if (mega)  mega.textContent  = fmt(_live.mega);
            }, 200);

            // Sync with server every 10s
            fetchAndUpdate();
            setInterval(fetchAndUpdate, 10000);
            startCardSpotlight();
            initLeaderboard();
            initTournamentBanner();
            initLiveFeed();
        }

        // Random game-card spotlight — briefly highlights a random card every 3-5s
        // to make the lobby feel alive. Idempotent: only one loop runs at a time.
        let _spotlightRunning = false;
        function startCardSpotlight() {
            if (_spotlightRunning) return;
            _spotlightRunning = true;
            function _doSpotlight() {
                const cards = document.querySelectorAll('.game-card');
                if (cards.length > 0) {
                    const card = cards[Math.floor(Math.random() * cards.length)];
                    card.classList.add('game-card-spotlight');
                    setTimeout(function() { card.classList.remove('game-card-spotlight'); }, 1400);
                }
                setTimeout(_doSpotlight, 3000 + Math.floor(Math.random() * 2000));
            }
            setTimeout(_doSpotlight, 5000); // First spotlight 5s after init
        }


        // ── Leaderboard ──
        function initLeaderboard() {
            let currentCat    = 'net';
            let currentPeriod = 'today';
            let collapsed     = false;

            const section = document.getElementById('leaderboard-section');
            const list    = document.getElementById('leaderboard-list');
            const toggle  = document.getElementById('leaderboard-toggle');
            if (!section || !list || !toggle) return;

            async function loadLeaderboard() {
                list.innerHTML = '<div class="lb-loading">Loading\u2026</div>';
                try {
                    const res = await fetch(`/api/leaderboard?period=${currentPeriod}&category=${currentCat}`);
                    if (!res.ok) throw new Error('fetch failed');
                    const { players } = await res.json();

                    if (!players || players.length === 0) {
                        list.innerHTML = '<div class="lb-empty">No entries yet \u2014 be the first!</div>';
                        return;
                    }

                    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
                    list.innerHTML = players.map(p => `
                        <div class="lb-row">
                          <span class="lb-rank">${medals[p.rank - 1] || p.rank}</span>
                          <span class="lb-name">${p.username}</span>
                          <span class="lb-spins">${p.spins} spins</span>
                          <span class="lb-amount">$${Number(p.amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>`).join('');
                } catch (_) {
                    list.innerHTML = '<div class="lb-empty">Could not load leaderboard.</div>';
                }
            }

            // Category tabs
            section.querySelectorAll('.lb-tab').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    section.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentCat = btn.dataset.cat;
                    loadLeaderboard();
                });
            });

            // Period tabs
            section.querySelectorAll('.lb-period').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    section.querySelectorAll('.lb-period').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentPeriod = btn.dataset.period;
                    loadLeaderboard();
                });
            });

            // Collapse toggle
            toggle.addEventListener('click', () => {
                collapsed = !collapsed;
                section.classList.toggle('collapsed', collapsed);
            });
            toggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggle.click(); });

            loadLeaderboard();
            setInterval(loadLeaderboard, 30000); // refresh every 30s
        }


        function _giVolatility(game) {
            const maxMult = game.payouts && game.minBet > 0
                ? (game.payouts.triple || game.payouts.payline5 || 0) / game.minBet
                : 100;
            if (maxMult >= 300) return { cls: 'gi-vol--high', dots: '●●●', label: 'High' };
            if (maxMult >= 100) return { cls: 'gi-vol--med',  dots: '●●○', label: 'Med'  };
            return                     { cls: 'gi-vol--low',  dots: '●○○', label: 'Low'  };
        }

        function _giBonusLabel(game) {
            const map = {
                // Legacy/original types
                tumble: 'Tumble', avalanche: 'Tumble', random_multiplier: 'Random ×',
                zeus_multiplier: 'Zeus ×', money_collect: 'Collect', stacked_wilds: 'Stacked Wilds',
                expanding_wild_respin: 'Expand+Respin', expanding_symbol: 'Expanding',
                fisherman_collect: 'Fish Collect', wheel_multiplier: 'Wheel ×',
                hold_and_win: 'Hold & Win', coin_respin: 'Coin Respin',
                // Sprint 1-2
                wild_collect: 'Wild Meter', mystery_stacks: 'Mystery Stacks',
                chamber_spins: 'Chamber Spins', sticky_wilds: 'Sticky Wilds',
                walking_wilds: 'Walking Wilds', win_streak: 'Win Streak',
                multiplier_wilds: 'Mult Wilds', increasing_mult: 'Rising ×',
                // Sprint 3
                cascading: 'Cascade', expanding_wilds: 'Expand Wild', respin: 'Re-Spin',
                // Sprint 4
                prize_wheel: 'Prize Wheel', colossal: 'Colossal', symbol_collect: 'Symbol Collect',
                // Sprint 5
                wild_reels: 'Wild Reels', both_ways: 'Both Ways', random_jackpot: 'Random JP',
            };
            return map[game.bonusType] || 'Bonus';
        }

        function _getDailyHotGames() {
            var g = (typeof games !== 'undefined' && games) || window.GAMES;
            if (!g || !g.length) return new Set();
            // Simple deterministic daily seed from date string
            var seed = new Date().toDateString().split('').reduce(function(h, c) {
                return (Math.imul(31, h) + c.charCodeAt(0)) | 0;
            }, 0);
            var indices = new Set();
            var len = g.length;
            var s = Math.abs(seed);
            while (indices.size < 8) {
                s = (Math.imul(s, 1664525) + 1013904223) | 0;
                indices.add(Math.abs(s) % len);
            }
            return new Set(Array.from(indices).map(function(i) { return g[i].id; }));
        }

        function _getNewGameIds() {
            var g = (typeof games !== 'undefined' && games) || window.GAMES;
            if (!g || g.length < 6) return new Set();
            return new Set(g.slice(-6).map(function(x) { return x.id; }));
        }

        // Cache hot/new sets — recomputed only once per day
        var _cachedHotIds = null, _cachedNewIds = null, _cachedHotDate = '';
        function _getHotNewCached() {
            var today = new Date().toDateString();
            if (!_cachedHotIds || _cachedHotDate !== today) {
                _cachedHotIds  = _getDailyHotGames();
                _cachedNewIds  = _getNewGameIds();
                _cachedHotDate = today;
            }
            return { hotIds: _cachedHotIds, newIds: _cachedNewIds };
        }

        function createGameCard(game) {
            const { hotIds: _hotIds, newIds: _newIds } = _getHotNewCached();
            // Thumbnails are lazy-loaded via IntersectionObserver (_initLazyThumbnails).
            // data-bg stores the URL; the observer applies it only when the card is visible.
            const hasThumbnail = !!game.thumbnail;
            const thumbStyle = hasThumbnail
                ? `background: #1a2332;`
                : `background: ${game.bgGradient};`;
            const thumbDataBg = hasThumbnail ? ` data-bg="${game.thumbnail}"` : '';
            const isJackpot = game.tag === 'JACKPOT' || game.tagClass === 'tag-jackpot';
            const isHot  = game.tag === 'HOT'  || game.tagClass === 'tag-hot';
            const isNew  = game.tag === 'NEW'  || game.tagClass === 'tag-new';
            // Non-jackpot tags go top-right; jackpot gets its own bottom badge
            const topTag = (!isJackpot && game.tag)
                ? `<div class="game-tag ${game.tagClass}${isHot ? ' tag-hot-flame' : ''}${isNew ? ' tag-new-glow' : ''}">${game.tag}</div>`
                : '';
            const jackpotBadge = isJackpot
                ? `<div class="game-jackpot-badge"><svg viewBox="0 0 12 12" fill="currentColor" width="9" height="9" style="margin-right:3px"><path d="M6 1l1 2.5h2.5l-2 1.5.8 2.5L6 6.2l-2.3 1.3.8-2.5-2-1.5H5z"/></svg>JACKPOT</div>`
                : '';
            const vol = deriveGameVolatility(game);
            const volClass = vol === 'Very High' ? 'vol-very-high' : vol === 'High' ? 'vol-high' : vol === 'Medium' ? 'vol-medium' : 'vol-low';
            const volDots = vol === 'Very High' ? 4 : vol === 'High' ? 3 : vol === 'Medium' ? 2 : 1;
            const dotsHtml = Array.from({length: 4}, (_, i) =>
                `<span class="vol-dot${i < volDots ? ' vol-dot-filled' : ''}"></span>`
            ).join('');
            const featureIconMap = {
                // Legacy/original types
                tumble: '⬇️', avalanche: '🪨', random_multiplier: '✨', zeus_multiplier: '⚡',
                money_collect: '💰', stacked_wilds: '🔥', hold_and_win: '🎯',
                fisherman_collect: '🎣', wheel_multiplier: '🎡', expanding_symbol: '📖',
                expanding_wild_respin: '🌟', progressive: '🏆', mystery_symbols: '❓',
                nudge: '👆', trail_bonus: '🗺️', pick_bonus: '🎁', super_meter: '📊',
                lightning_respin: '⚡', mega_symbols: '🔮', coin_respin: '🪙',
                // Sprint 1-2
                wild_collect: '⚡', mystery_stacks: '❓', chamber_spins: '🔫',
                sticky_wilds: '🍯', walking_wilds: '🚶', win_streak: '🔥',
                multiplier_wilds: '✖️', increasing_mult: '📈',
                // Sprint 3
                respin: '🔄', cascading: '🌊', expanding_wilds: '🌟',
                // Sprint 4
                prize_wheel: '🎡', colossal: '🔮', symbol_collect: '💎',
                // Sprint 5
                wild_reels: '🎰', both_ways: '↔️', random_jackpot: '💰',
            };
            const bonusIcon = (game.bonusType && featureIconMap[game.bonusType]) || '🎰';
            const gridLabel = (game.gridCols && game.gridRows) ? `${game.gridCols}×${game.gridRows}` : '';
            const fsLabel  = game.freeSpinsCount ? `${game.freeSpinsCount} FS` : '';
            const metaPills = [gridLabel, fsLabel].filter(Boolean)
                .map(t => `<span class="game-hover-pill">${t}</span>`).join('');
            const shortDesc = game.bonusDesc
                ? `<div class="game-hover-desc">${bonusIcon} ${game.bonusDesc.split(':').pop().trim().slice(0,60)}${game.bonusDesc.length > 70 ? '…' : ''}</div>`
                : '';
            const favored = isFavorite(game.id);
            const favIcon = favored ? '\u2764\uFE0F' : '\u2661';
            // Slot of the Day badge (Sprint 24)
            const isGameOfDay = gameOfDayId && game.id.toLowerCase() === gameOfDayId.toLowerCase();
            const gameDayBadgeHtml = isGameOfDay
                ? '<div class="game-of-day-badge">&#11088; TODAY</div>'
                : '';
            const gameDayCardClass = isGameOfDay ? ' game-of-day-card' : '';
            // Hot/Cold badge (Sprint 25)
            var stats = gameStatsMap[game.id] || gameStatsMap[(game.id || '').toLowerCase()];
            var hotColdHtml = '';
            if (stats) {
                if (stats.actualRtp > 92) {
                    hotColdHtml = '<div class="game-hot-badge" title="Hot! RTP ' + stats.actualRtp.toFixed(1) + '%">🔥</div>';
                } else if (stats.actualRtp < 84) {
                    hotColdHtml = '<div class="game-cold-badge" title="Cold. RTP ' + stats.actualRtp.toFixed(1) + '%">❄️</div>';
                }
            }
            _seedCount(game.id, isHot || _hotIds.has(game.id));
            return `
                <div class="game-card${isHot ? ' game-card-hot' : ''}${isJackpot ? ' game-card-jackpot' : ''}${gameDayCardClass}" onclick="if(typeof _compareMode!=='undefined'&&_compareMode){_addToCompare('${game.id}');this.classList.toggle('compare-selected',typeof _compareGames!=='undefined'&&_compareGames.indexOf('${game.id}')>=0);}else{openSlot('${game.id}');}" style="position:relative" data-game-name="${(game.name || game.id || '').toLowerCase()}" data-game-id="${(game.id || '').toLowerCase()}">
                    <button class="fav-btn${favored ? ' fav-active' : ''}" data-game-id="${game.id}" title="${favored ? 'Remove from favourites' : 'Add to favourites'}" onclick="event.stopPropagation(); (function(btn){var nowFav=toggleFavorite('${game.id}'); btn.textContent=nowFav?'\u2764\uFE0F':'\u2661'; btn.title=nowFav?'Remove from favourites':'Add to favourites'; btn.classList.add('fav-active'); setTimeout(function(){btn.classList.remove('fav-active');},350); updateFavTabBadge();})(this)">${favIcon}</button>
                    <div class="game-thumbnail" style="${thumbStyle}"${thumbDataBg}>
                        ${!game.thumbnail && game.asset ? (assetTemplates[game.asset] || '') : ''}
                        <div class="card-anim-preview" style="background-image:url('assets/backgrounds/slots/${game.id}_bg.webp')" onerror="this.classList.add('hidden')">
                            <span class="preview-badge">&#9654; PREVIEW</span>
                        </div>
                        ${topTag}
                        ${jackpotBadge}
                        <div class="card-players-live" data-game="${game.id}"> ${_getLiveCount(game.id)} playing</div>
                        ${(function() { try { var _v = parseFloat(localStorage.getItem('personalBest_' + game.id) || '0'); if (_v > 0) { var _disp = _v >= 1000 ? ('$' + (_v/1000).toFixed(1) + 'K') : ('$' + Math.round(_v)); return '<div class="card-personal-best">\u{1F3C6} PB ' + _disp + '</div>'; } } catch(e) {} return ''; })()}
                        <div class="game-vol-badge ${volClass}" title="Volatility: ${vol}">
                            ${dotsHtml}
                        </div>
                        <div class="game-hover-overlay">
                            <svg class="game-play-svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="23" fill="rgba(23,145,99,0.9)" stroke="rgba(86,210,160,0.6)" stroke-width="2"/><polygon points="19,14 19,34 35,24" fill="#fff"/></svg>
                            ${metaPills ? `<div class="game-hover-pills">${metaPills}</div>` : ''}
                            ${shortDesc}
                        </div>
                        <div class="gi-strip">
                            <span class="gi-grid">${game.gridCols}×${game.gridRows}</span>
                            <span class="gi-bonus">${_giBonusLabel(game)}</span>
                            <span class="gi-vol ${_giVolatility(game).cls}" title="Volatility: ${_giVolatility(game).label}">${_giVolatility(game).dots}</span>
                        </div>
                    </div>
                    <div class="game-info">
                        <div class="game-name">${game.name}</div>
                        <div class="game-provider">${game.provider || ''}</div>
                    </div>
                    ${_hotIds.has(game.id) ? '<span class="lobby-badge lobby-badge-hot">🔥 HOT</span>' : ''}
                    ${_newIds.has(game.id) ? '<span class="lobby-badge lobby-badge-new">✨ NEW</span>' : ''}
                    ${gameDayBadgeHtml}
                    ${hotColdHtml}
                </div>
            `;
        }


        function playRandomHotGame() {
            const hotGames = games.filter(g => g.hot);
            const pick = hotGames[Math.floor(Math.random() * hotGames.length)];
            openSlot(pick.id);
        }



        // ===== Favorites =====
        var _favKey = 'casinoFavorites';
        var _favsSet = (function() {
            try { return new Set(JSON.parse(localStorage.getItem(_favKey) || '[]')); }
            catch(e) { return new Set(); }
        })();

        function loadFavorites() {
            return [..._favsSet];
        }

        function isFavorite(gameId) {
            return _favsSet.has(gameId);
        }

        function toggleFavorite(gameId) {
            if (_favsSet.has(gameId)) {
                _favsSet.delete(gameId);
            } else {
                _favsSet.add(gameId);
            }
            try { localStorage.setItem(_favKey, JSON.stringify([..._favsSet])); } catch(e) {}
            return _favsSet.has(gameId);
        }
        // ===== Filter Tabs =====
        function setFilter(filter) {
            currentFilter = filter;
            // Clear inline search bar when switching filter tabs
            const searchInput = document.getElementById('gameSearchInput');
            if (searchInput) searchInput.value = '';
            searchQuery = '';
            const _clrBtn = document.getElementById('gameSearchClear');
            if (_clrBtn) _clrBtn.style.display = 'none';
            const tabs = document.querySelectorAll('.filter-tab');
            tabs.forEach(tab => {
                tab.classList.toggle('filter-tab-active', tab.dataset.filter === filter);
            });
            renderFilteredGames();
        }


        function getFilteredGames(filter) {
            let list;
            switch (filter) {
                case 'hot':       list = games.filter(g => g.hot); break;
                case 'new':       list = games.filter(g => g.tag === 'NEW'); break;
                case 'jackpot':   list = games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA'); break;
                case 'favorites': list = games.filter(g => isFavorite(g.id)); break;
                default:          list = games;
            }
            if (currentProviderFilter !== 'all') {
                list = list.filter(g => g.provider === currentProviderFilter);
            }
            // Apply lobby search query (set by lobbyOnSearch / lobbySetProvider)
            if (lobbySearchQuery) {
                if (lobbySearchQuery.startsWith('__provider__')) {
                    const prov = lobbySearchQuery.slice('__provider__'.length);
                    list = list.filter(g => g.provider.toLowerCase() === prov);
                } else {
                    list = list.filter(g =>
                        g.name.toLowerCase().includes(lobbySearchQuery) ||
                        g.provider.toLowerCase().includes(lobbySearchQuery)
                    );
                }
            }
            // Apply mechanic filter
            if (currentMechanicFilter !== 'all') {
                list = list.filter(g => _getMechanicCategory(g) === currentMechanicFilter);
            }
            // Apply inline search bar query (compound with all other filters)
            if (searchQuery) {
                var _sq = searchQuery.toLowerCase();
                list = list.filter(function(g) { return g.name.toLowerCase().includes(_sq); });
            }
            // Apply sort (existing vol sort)
            if (currentSortMode === 'vol_asc') {
                list = [...list].sort((a, b) => _getVolatility(a) - _getVolatility(b));
            } else if (currentSortMode === 'vol_desc') {
                list = [...list].sort((a, b) => _getVolatility(b) - _getVolatility(a));
            }
            // Sprint 37 — additional sort order from dropdown
            if (typeof _sortOrder !== 'undefined' && _sortOrder !== 'popular') {
                switch (_sortOrder) {
                    case 'az':       list = [...list].sort((a,b) => a.name.localeCompare(b.name)); break;
                    case 'za':       list = [...list].sort((a,b) => b.name.localeCompare(a.name)); break;
                    case 'rtp':      list = [...list].sort((a,b) => ((b.payouts && b.payouts.triple) || 0) - ((a.payouts && a.payouts.triple) || 0)); break;
                    case 'volatile': list = [...list].sort((a,b) => _getVolatility(b) - _getVolatility(a)); break;
                    case 'chill':    list = [...list].sort((a,b) => _getVolatility(a) - _getVolatility(b)); break;
                }
            }
            return list;
        }


        function setProviderFilter(provider) {
            currentProviderFilter = provider;
            document.querySelectorAll('.provider-chip').forEach(chip => {
                chip.classList.toggle('provider-chip-active', chip.dataset.provider === provider);
            });
            renderFilteredGames();
        }


        function setMechanicFilter(mech) {
            currentMechanicFilter = mech;
            document.querySelectorAll('.mechanic-chip').forEach(c => {
                c.classList.toggle('mechanic-chip-active', c.dataset.mech === mech);
            });
            renderFilteredGames();
        }

        function setSortMode(mode) {
            currentSortMode = mode;
            document.querySelectorAll('.sort-btn').forEach(b => {
                b.classList.toggle('sort-btn-active', b.dataset.sort === mode);
            });
            renderFilteredGames();
        }

        // Sprint 37 — Game Sort Dropdown
        function setSortOrder(val) {
            _sortOrder = val || 'popular';
            renderFilteredGames();
        }


        function renderFilteredGames() {
            // ── Mechanic filter bar (injected once) ──
            if (!document.getElementById('mechanicFilterBar')) {
                const _mechBar = document.createElement('div');
                _mechBar.id = 'mechanicFilterBar';
                _mechBar.className = 'mechanic-filter-bar';
                const _mechs = [
                    { id: 'all',        label: 'All Mechanics' },
                    { id: 'tumble',     label: '\uD83C\uDF0A Tumble' },
                    { id: 'hold_win',   label: '\uD83C\uDFAF Hold & Win' },
                    { id: 'free_spins', label: '\uD83C\uDF81 Free Spins' },
                    { id: 'wilds',      label: '\uD83C\uDF1F Wilds' },
                    { id: 'jackpot',    label: '\uD83C\uDFC6 Jackpot' },
                ];
                _mechBar.innerHTML = `
                    <div class="mechanic-chips">
                        ${_mechs.map(m => `<button class="mechanic-chip${m.id==='all'?' mechanic-chip-active':''}" data-mech="${m.id}" onclick="setMechanicFilter('${m.id}')">${m.label}</button>`).join('')}
                    </div>
                    <div class="sort-controls">
                        <span style="font-size:11px;color:rgba(255,255,255,0.4)">Sort:</span>
                        <button class="sort-btn sort-btn-active" data-sort="default" onclick="setSortMode('default')">Default</button>
                        <button class="sort-btn" data-sort="vol_asc" onclick="setSortMode('vol_asc')">Vol \u2191</button>
                        <button class="sort-btn" data-sort="vol_desc" onclick="setSortMode('vol_desc')">Vol \u2193</button>
                    </div>`;
                const _allGames = document.getElementById('allGames');
                if (_allGames && _allGames.parentNode) _allGames.parentNode.insertBefore(_mechBar, _allGames);
            }
            // ── Game search bar (injected once, after mechanic filter bar) ──
            if (!document.getElementById('gameSearchWrap')) {
                var _searchWrap = document.createElement('div');
                _searchWrap.id = 'gameSearchWrap';
                _searchWrap.className = 'game-search-wrap';
                _searchWrap.innerHTML = '<input type="text" id="gameSearchInput" class="game-search-input" placeholder="🔍  Search games..." autocomplete="off" />' +
                    '<button id="gameSearchClear" class="game-search-clear" style="display:none">✕</button>';
                var _mechBar2 = document.getElementById('mechanicFilterBar');
                if (_mechBar2 && _mechBar2.parentNode) {
                    _mechBar2.parentNode.insertBefore(_searchWrap, _mechBar2.nextSibling);
                }
                document.getElementById('gameSearchInput').addEventListener('input', function() {
                    searchQuery = this.value.trim();
                    document.getElementById('gameSearchClear').style.display = searchQuery ? '' : 'none';
                    renderFilteredGames();
                });
                document.getElementById('gameSearchClear').addEventListener('click', function() {
                    searchQuery = '';
                    document.getElementById('gameSearchInput').value = '';
                    this.style.display = 'none';
                    renderFilteredGames();
                });
            }
            const allGamesDiv = document.getElementById('allGames');
            const filtered = getFilteredGames(currentFilter);
            if (currentFilter === 'favorites' && filtered.length === 0) {
                allGamesDiv.innerHTML = `<div class="games-fav-empty"><span class="fav-empty-icon">♡</span>Heart your first game to see it here!</div>`;
            } else if (filtered.length === 0 && searchQuery) {
                allGamesDiv.innerHTML = '<div class="search-no-results">No games found for "<strong>' + searchQuery.replace(/[<>]/g, '') + '</strong>"</div>';
            } else {
                allGamesDiv.innerHTML = filtered.map(g => createGameCard(g)).join('');
            }
            updateFilterCounts();
            // Update the "All Slots" count label
            const countEl = document.getElementById('allGamesCount');
            if (countEl) countEl.textContent = `${filtered.length} game${filtered.length !== 1 ? 's' : ''}`;
            // Re-apply hide/show search filter after every render
            if (typeof _applyLobbySearch === 'function') _applyLobbySearch();
            // Lazy-load thumbnails for newly rendered cards
            if (typeof _initLazyThumbnails === 'function') _initLazyThumbnails();
        }


        function updateFilterCounts() {
            const favCount = loadFavorites().length;
            const counts = {
                all:       games.length,
                hot:       games.filter(g => g.hot).length,
                new:       games.filter(g => g.tag === 'NEW').length,
                jackpot:   games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA').length,
                favorites: favCount
            };
            document.querySelectorAll('.filter-tab').forEach(tab => {
                const f = tab.dataset.filter;
                if (f === 'favorites') {
                    // Use a distinct red badge for favorites count
                    let badge = tab.querySelector('.filter-fav-count');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'filter-fav-count';
                        tab.appendChild(badge);
                    }
                    badge.textContent = favCount > 0 ? favCount : '';
                    badge.style.display = favCount > 0 ? '' : 'none';
                } else {
                    let countEl = tab.querySelector('.filter-count');
                    if (!countEl) {
                        countEl = document.createElement('span');
                        countEl.className = 'filter-count';
                        tab.appendChild(countEl);
                    }
                    countEl.textContent = counts[f] ?? '';
                }
            });
            // Sync .filter-tab-count badges (Sprint 19)
            if (typeof _updateTabCounts === 'function') _updateTabCounts();
        }


        function _updateTabCounts() {
            try {
                var allGames = (typeof games !== 'undefined' ? games : []);
                if (!allGames || !allGames.length) return;

                // Build counts per filter key — mirrors getFilteredGames() switch cases
                var favCount = (typeof _favsSet !== 'undefined'
                    ? _favsSet.size
                    : (typeof loadFavorites === 'function' ? loadFavorites().length : 0));
                var counts = {
                    'all':       allGames.length,
                    'hot':       allGames.filter(function(g) { return g.hot; }).length,
                    'new':       allGames.filter(function(g) { return g.tag === 'NEW'; }).length,
                    'jackpot':   allGames.filter(function(g) { return g.tag === 'JACKPOT' || g.tag === 'MEGA'; }).length,
                    'favorites': favCount
                };

                // Update .filter-tab-count badge inside each tab button
                document.querySelectorAll('.filter-tab[data-filter]').forEach(function(btn) {
                    var key = btn.dataset.filter;
                    if (!(key in counts)) return;
                    var badge = btn.querySelector('.filter-tab-count');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'filter-tab-count';
                        btn.appendChild(badge);
                    }
                    badge.textContent = counts[key];
                });
            } catch (e) {
                // Defensive — never block render on count error
            }
        }

        function updateFavTabBadge() {
            const favTab = document.getElementById('favFilterTab');
            if (!favTab) return;
            let badge = favTab.querySelector('.filter-fav-count');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'filter-fav-count';
                favTab.appendChild(badge);
            }
            const favCount = loadFavorites().length;
            badge.textContent = favCount > 0 ? favCount : '';
            badge.style.display = favCount > 0 ? '' : 'none';
            // If currently viewing favorites, re-render the list to reflect removals
            if (currentFilter === 'favorites') {
                renderFilteredGames();
            }
        }


        // ===== Game Search =====
        function searchGames(query) {
            const countEl = document.getElementById('searchResultCount');
            query = query.trim().toLowerCase();
            if (!query) {
                renderFilteredGames();
                if (countEl) { countEl.classList.remove('active'); countEl.textContent = ''; }
                return;
            }
            const allGamesDiv = document.getElementById('allGames');
            const results = games.filter(g =>
                g.name.toLowerCase().includes(query) ||
                (g.provider && g.provider.toLowerCase().includes(query)) ||
                (g.tag && g.tag.toLowerCase().includes(query))
            );
            // Update result count badge
            if (countEl) {
                countEl.textContent = results.length + ' found';
                countEl.classList.toggle('active', results.length > 0 || query.length > 0);
            }
            allGamesDiv.innerHTML = results.length
                ? results.map(g => createGameCard(g)).join('')
                : `<div class="games-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <p>No games found for "<strong>${query}</strong>"</p>
                    <p style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:8px;">Try searching by game name, provider, or tag</p>
                   </div>`;
        }


        // Track recently used names so the same player doesn't appear back-to-back
        let _tickerRecentNames = [];

        function generateTickerMessage() {
            // Pick a name that wasn't used in the last 5 messages
            let name;
            const avoidSet = new Set(_tickerRecentNames.slice(-5));
            const available = TICKER_NAMES.filter(n => !avoidSet.has(n));
            name = (available.length ? available : TICKER_NAMES)[Math.floor(Math.random() * (available.length || TICKER_NAMES.length))];
            _tickerRecentNames.push(name);
            if (_tickerRecentNames.length > 10) _tickerRecentNames.shift();

            const tickerPool = games.filter(g => g.payouts && g.payouts.triple && g.payouts.double);
            const game = tickerPool[Math.floor(Math.random() * tickerPool.length)];
            const multiplier = Math.floor(Math.random() * game.payouts.triple) + game.payouts.double;
            const bet = game.minBet + Math.floor(Math.random() * (game.maxBet - game.minBet) / game.minBet) * game.minBet;
            const win = bet * multiplier;
            return `${name} won $${win.toLocaleString()} on ${game.name}!`;
        }


        function startWinTicker() {
            const content = document.getElementById('tickerContent');
            if (!content) return;

            // Clear any existing ticker interval to prevent leaks on re-init
            if (tickerInterval) clearInterval(tickerInterval);

            // Build initial messages
            let messages = [];
            for (let i = 0; i < TICKER_INITIAL_MESSAGE_COUNT; i++) {
                messages.push(generateTickerMessage());
            }

            // Render two identical copies side-by-side for seamless loop
            renderTickerContent(messages);

            // Periodically swap in new messages (update both copies in sync)
            tickerInterval = setInterval(() => {
                messages.push(generateTickerMessage());
                if (messages.length > TICKER_MAX_MESSAGES) messages.shift();
                renderTickerContent(messages);
            }, WIN_TICKER_INTERVAL);
        }


        function renderTickerContent(messages) {
            const content = document.getElementById('tickerContent');
            if (!content) return;

            const sep = '<span class="ticker-sep">\u00B7</span>';
            const itemsHtml = messages.map(m =>
                `<span class="ticker-item">${m}</span>`
            ).join(sep);

            // Duplicate the block so the CSS translate loop is seamless:
            // when the first copy scrolls fully left, the second copy is
            // in exactly the same position the first started.
            content.innerHTML =
                `<span class="ticker-half">${itemsHtml}${sep}</span>` +
                `<span class="ticker-half">${itemsHtml}${sep}</span>`;

            // Restart the animation cleanly so there's no mid-scroll jump
            content.style.animation = 'none';
            // Force reflow then re-apply
            void content.offsetWidth;
            content.style.animation = '';
        }


        /**
         * Called from ui-slot.js when a real player win >= 10x bet occurs.
         * Prepends the win to the live ticker with amber colour so it stands out.
         */
        function addPlayerWinToTicker(amount, gameName) {
            var ticker = document.querySelector('.win-ticker-inner') || document.getElementById('tickerContent');
            if (!ticker) return;
            var username = (typeof currentUser !== 'undefined' && currentUser && currentUser.username)
                ? currentUser.username : 'You';
            var formatted = typeof amount === 'number'
                ? '$' + amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
                : '$' + amount;
            var span = document.createElement('span');
            span.className = 'ticker-item ticker-player-win';
            span.textContent = '🏆 ' + username + ' won ' + formatted + ' on ' + gameName + '!';
            // Prepend so it appears first; separate with bullet
            var sep = document.createElement('span');
            sep.className = 'ticker-sep';
            sep.textContent = ' · ';
            ticker.insertBefore(sep, ticker.firstChild);
            ticker.insertBefore(span, ticker.firstChild);
            // Auto-remove after 60 seconds so ticker stays fresh
            setTimeout(function() {
                if (span.parentNode) span.parentNode.removeChild(span);
                if (sep.parentNode) sep.parentNode.removeChild(sep);
            }, 60000);
        }


        // ═══════════════════════════════════════════════════════════
        // GAME SEARCH
        // ═══════════════════════════════════════════════════════════

        function filterGamesBySearch(value) {
            const clearBtn = document.getElementById('searchClearBtn');
            if (clearBtn) clearBtn.style.display = value ? 'flex' : 'none';
            searchGames(value);
        }


        function clearGameSearch() {
            const input = document.getElementById('gameSearchInput');
            if (input) { input.value = ''; input.focus(); }
            const clearBtn = document.getElementById('searchClearBtn');
            if (clearBtn) clearBtn.style.display = 'none';
            searchGames('');
        }


        // ═══════════════════════════════════════════════════════════
        // LOBBY SEARCH BAR + PROVIDER QUICK-LINKS
        // ═══════════════════════════════════════════════════════════

        // ═══════════════════════════════════════════════════════════
        // SPRINT 18 SEARCH BAR — hide/show filter (complements re-render search)
        // ═══════════════════════════════════════════════════════════

        function _injectLobbySearch() {
          if (document.getElementById('lobbySearchWrap')) return;
          var filtersEl = document.querySelector('.lobby-filters') ||
                          document.querySelector('.filter-tabs') ||
                          document.querySelector('.game-filters') ||
                          document.getElementById('filterTabs');
          if (!filtersEl) return;

          var wrap = document.createElement('div');
          wrap.id = 'lobbySearchWrap';
          wrap.className = 'lobby-search-wrap';

          var input = document.createElement('input');
          input.type = 'search';
          input.id = 'lobbySearchInput2';
          input.className = 'lobby-search-input';
          input.placeholder = 'Search games…';
          input.autocomplete = 'off';
          input.spellcheck = false;

          var clearBtn = document.createElement('button');
          clearBtn.id = 'lobbySearchClear2';
          clearBtn.className = 'lobby-search-clear';
          clearBtn.innerHTML = '✕';
          clearBtn.title = 'Clear search';
          clearBtn.type = 'button';

          wrap.appendChild(input);
          wrap.appendChild(clearBtn);

          // Insert above filter tabs (guard against double-injection)
          if (filtersEl.parentNode && !document.getElementById('lobbySearchWrap')) {
            filtersEl.parentNode.insertBefore(wrap, filtersEl);
          }

          // No-results message (appended after game grid)
          var noRes = document.getElementById('lobbySearchNoResults');
          if (!noRes) {
            noRes = document.createElement('div');
            noRes.id = 'lobbySearchNoResults';
            noRes.className = 'lobby-search-no-results';
            noRes.textContent = 'No games match your search.';
            if (filtersEl.parentNode) filtersEl.parentNode.appendChild(noRes);
          }

          var _searchDebounce = null;
          input.addEventListener('input', function() {
            clearTimeout(_searchDebounce);
            _searchDebounce = setTimeout(function() {
              _lobbySearchQuery = input.value.trim().toLowerCase();
              wrap.classList.toggle('active', _lobbySearchQuery.length > 0);
              input.classList.toggle('has-value', _lobbySearchQuery.length > 0);
              _applyLobbySearch();
            }, 150);
          });

          clearBtn.addEventListener('click', function() {
            input.value = '';
            _lobbySearchQuery = '';
            wrap.classList.remove('active');
            input.classList.remove('has-value');
            _applyLobbySearch();
            input.focus();
          });
        }

        function _applyLobbySearch() {
          var q = _lobbySearchQuery;
          var noRes = document.getElementById('lobbySearchNoResults');
          var cards = document.querySelectorAll('.game-card');
          var visible = 0;
          cards.forEach(function(card) {
            if (!q) { card.style.display = ''; visible++; return; }
            var nameEl = card.querySelector('.game-name, .card-title, h3, h4');
            var name = (card.dataset.gameName || (nameEl ? nameEl.textContent : '') || '').toLowerCase();
            var id   = (card.dataset.gameId   || '').toLowerCase();
            var matches = name.includes(q) || id.includes(q);
            card.style.display = matches ? '' : 'none';
            if (matches) visible++;
          });
          if (noRes) noRes.classList.toggle('visible', q.length > 0 && visible === 0);
          // Update tab count badges after search filter (Sprint 19)
          if (typeof _updateTabCounts === 'function') _updateTabCounts();
        }

        function lobbyOnSearch(query) {
            lobbySearchQuery = query.trim().toLowerCase();
            const clearBtn = document.getElementById('lobbySearchClear');
            const input = document.getElementById('lobbySearchInput');
            if (clearBtn) clearBtn.style.display = lobbySearchQuery ? 'block' : 'none';
            if (input && input.value !== query) input.value = query;
            // Clear any active provider pill highlight when typing a free-text query
            if (!lobbySearchQuery.startsWith('__provider__')) {
                document.querySelectorAll('.lobby-provider-pill').forEach(pill => {
                    pill.style.background = 'rgba(255,255,255,0.06)';
                    pill.style.borderColor = 'rgba(255,255,255,0.15)';
                    pill.style.color = 'rgba(255,255,255,0.7)';
                });
            }
            renderFilteredGames();
        }


        function lobbySetProvider(providerName) {
            // Clear free-text search
            lobbySearchQuery = '';
            const input = document.getElementById('lobbySearchInput');
            if (input) input.value = '';
            const clearBtn = document.getElementById('lobbySearchClear');
            if (clearBtn) clearBtn.style.display = 'none';
            // Highlight the active provider pill
            document.querySelectorAll('.lobby-provider-pill').forEach(pill => {
                const active = pill.dataset.provider === providerName;
                pill.style.background   = active ? 'rgba(123,97,255,0.3)'    : 'rgba(255,255,255,0.06)';
                pill.style.borderColor  = active ? 'rgba(123,97,255,0.6)'    : 'rgba(255,255,255,0.15)';
                pill.style.color        = active ? '#b39ddb'                  : 'rgba(255,255,255,0.7)';
            });
            // Use the sentinel prefix so getFilteredGames does an exact provider match
            lobbySearchQuery = '__provider__' + providerName.toLowerCase();
            renderFilteredGames();
        }

        // ================================================================
        // TOURNAMENT BANNER
        // ================================================================

        function initTournamentBanner() {
            // Inject banner HTML once (id guard)
            if (document.getElementById('tournamentBanner')) return;

            var banner = document.createElement('div');
            banner.id = 'tournamentBanner';
            banner.className = 'tournament-banner';
            banner.innerHTML = '<div class="tourn-loading">Loading tournaments...</div>';

            // Insert before game grid
            var gamesSection = document.getElementById('games-section') || document.getElementById('gamesContainer') || document.querySelector('.games-grid') || document.querySelector('.game-grid');
            if (gamesSection && gamesSection.parentNode) {
                gamesSection.parentNode.insertBefore(banner, gamesSection);
            } else {
                var main = document.getElementById('main-content') || document.getElementById('lobby') || document.querySelector('.lobby-content');
                if (main) main.appendChild(banner);
            }

            _fetchAndRenderTournaments();
            _tournamentRefreshInterval = setInterval(_fetchAndRenderTournaments, 30000);
        }
        async function _fetchAndRenderTournaments() {
            var banner = document.getElementById('tournamentBanner');
            if (!banner) return;
            try {
                var res = await fetch('/api/tournaments');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                var data = await res.json();
                _activeTournaments = data.active || [];
                _renderTournamentBanner(data.active || [], data.upcoming || []);
            } catch (e) {
                // Server may not be reachable in offline mode
                banner.style.display = 'none';
            }
        }
        function _renderTournamentBanner(active, upcoming) {
            var banner = document.getElementById('tournamentBanner');
            if (!banner) return;

            if (active.length === 0 && upcoming.length === 0) {
                banner.style.display = 'none';
                return;
            }

            banner.style.display = '';
            var t = active[0] || upcoming[0];
            var isActive = active.length > 0;

            // Prize display based on type
            var prizes = t.type === 'daily'
                ? '🥇 $200 &nbsp; 🥈 $100 &nbsp; 🥉 $75'
                : '🥇 $25 &nbsp; 🥈 $15 &nbsp; 🥉 $10';
            banner.innerHTML =
                '<div class="tourn-header">' +
                    '<span class="tourn-live-dot' + (isActive ? ' tourn-live-dot--active' : '') + '"></span>' +
                    '<span class="tourn-title">' + t.name + '</span>' +
                    '<span class="tourn-status-badge">' + (isActive ? 'LIVE' : 'UPCOMING') + '</span>' +
                    '<span class="tourn-timer" id="tournTimer" data-ends="' + (isActive ? t.ends_at : t.starts_at) + '" data-mode="' + (isActive ? 'ends' : 'starts') + '">--:--:--</span>' +
                '</div>' +
                '<div class="tourn-meta">' +
                    '<span class="tourn-prizes">' + prizes + '</span>' +
                    '<span class="tourn-entry-count" id="tournEntryCount">' + (t.entry_count || 0) + ' players</span>' +
                '</div>' +
                '<div class="tourn-leaderboard-wrap" id="tournLeaderboardWrap">' +
                    '<div class="tourn-lb-loading">Loading leaderboard...</div>' +
                '</div>' +
                '<div class="tourn-actions">' +
                    '<button class="tourn-join-btn" id="tournJoinBtn" onclick="joinTournament(' + t.id + ')">' + (isActive ? 'JOIN FREE' : 'NOTIFY ME') + '</button>' +
                    '<button class="tourn-expand-btn" onclick="_toggleTournLeaderboard(' + t.id + ')">View Leaderboard ▾</button>' +
                '</div>';

            // Start countdown
            if (_tournamentCountdownInterval) clearInterval(_tournamentCountdownInterval);
            _tournamentCountdownInterval = setInterval(function() { _updateTournTimer(); }, 1000);
            _updateTournTimer();

            // Load leaderboard for active tournament
            if (isActive) _loadTournLeaderboard(t.id);
        }
        function _updateTournTimer() {
            var el = document.getElementById('tournTimer');
            if (!el) { clearInterval(_tournamentCountdownInterval); return; }
            var endsAt = el.dataset.ends;
            var mode = el.dataset.mode;
            if (!endsAt) return;
            var diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
            var h = Math.floor(diff / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            var label = mode === 'ends' ? '' : 'Starts in ';
            el.textContent = label + (h > 0 ? h + ':' : '') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
            if (diff === 0) _fetchAndRenderTournaments();
        }
        async function _loadTournLeaderboard(tournamentId) {
            var wrap = document.getElementById('tournLeaderboardWrap');
            if (!wrap) return;
            try {
                var res = await fetch('/api/tournaments/' + tournamentId + '/leaderboard');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                var data = await res.json();
                var board = data.leaderboard || [];
                if (board.length === 0) {
                    wrap.innerHTML = '<div class="tourn-lb-empty">Be the first to compete!</div>';
                    return;
                }
                var medals = ['🥇','🥈','🥉'];
                wrap.innerHTML = '<div class="tourn-lb-rows">' +
                    board.slice(0, 5).map(function(p, i) {
                        return '<div class="tourn-lb-row">' +
                            '<span class="tourn-lb-rank">' + (medals[i] || '#' + p.rank) + '</span>' +
                            '<span class="tourn-lb-name">' + escapeHtml(p.username) + '</span>' +
                            '<span class="tourn-lb-mult">' + p.best_mult.toFixed(2) + 'x</span>' +
                            '</div>';
                    }).join('') +
                    '</div>';
                wrap.style.display = 'none'; // collapsed by default
            } catch (e) {
                wrap.innerHTML = '';
            }
        }
        function _toggleTournLeaderboard(tournamentId) {
            var wrap = document.getElementById('tournLeaderboardWrap');
            var btn = document.querySelector('.tourn-expand-btn');
            if (!wrap) return;
            var hidden = wrap.style.display === 'none' || wrap.style.display === '';
            wrap.style.display = hidden ? '' : 'none';
            if (btn) btn.textContent = hidden ? 'Hide Leaderboard ▴' : 'View Leaderboard ▾';
            if (hidden && _activeTournaments.length > 0) _loadTournLeaderboard(_activeTournaments[0].id);
        }
        async function joinTournament(tournamentId) {
            var btn = document.getElementById('tournJoinBtn');
            if (!btn) return;
            if (!currentUser) {
                if (typeof openAuthModal === 'function') openAuthModal();
                return;
            }
            btn.disabled = true;
            btn.textContent = 'Joining...';
            try {
                var res = await fetch('/api/tournaments/' + tournamentId + '/join', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + (authToken || ''), 'Content-Type': 'application/json' }
                });
                var data = await res.json();
                if (data.ok || data.alreadyJoined) {
                    btn.textContent = '✓ Joined!';
                    btn.style.background = '#22c55e';
                } else {
                    btn.textContent = 'JOIN FREE';
                    btn.disabled = false;
                }
            } catch (e) {
                btn.textContent = 'JOIN FREE';
                btn.disabled = false;
            }
        }

        // ── Live Activity Feed ────────────────────────────────────────────────
        let _feedRefreshInterval = null;

        function initLiveFeed() {
            if (document.getElementById('liveFeedWidget')) return;

            const widget = document.createElement('div');
            widget.id = 'liveFeedWidget';
            widget.className = 'live-feed-widget';
            widget.innerHTML = `
                <div class="live-feed-header">
                    <span class="live-feed-dot"></span>
                    <span class="live-feed-title">Live Big Wins</span>
                </div>
                <div class="live-feed-list" id="liveFeedList">
                    <div class="live-feed-loading">Loading…</div>
                </div>`;

            // Insert after tournament banner (or before game grid if banner missing)
            const banner = document.getElementById('tournamentBanner');
            if (banner && banner.parentNode) {
                banner.parentNode.insertBefore(widget, banner.nextSibling);
            } else {
                const grid = document.getElementById('games-section')
                    || document.getElementById('gamesContainer')
                    || document.querySelector('.games-grid')
                    || document.querySelector('.game-grid');
                if (grid && grid.parentNode) grid.parentNode.insertBefore(widget, grid);
            }

            _fetchLiveFeed();
            _feedRefreshInterval = setInterval(_fetchLiveFeed, 15000);
        }

        async function _fetchLiveFeed() {
            const listEl = document.getElementById('liveFeedList');
            if (!listEl) return;
            try {
                const res = await fetch('/api/feed');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                const feed = data.feed || [];
                _renderLiveFeed(feed);
            } catch (e) {
                // Hide feed widget if server unreachable
                const widget = document.getElementById('liveFeedWidget');
                if (widget) widget.style.display = 'none';
            }
        }

        function _renderLiveFeed(feed) {
            const listEl = document.getElementById('liveFeedList');
            if (!listEl) return;
            if (!feed || feed.length === 0) {
                listEl.innerHTML = '<div class="live-feed-empty">No big wins yet — be the first!</div>';
                return;
            }

            // Find game name from GAMES array if available
            function _gameName(gameId) {
                if (typeof GAMES !== 'undefined') {
                    const g = GAMES.find(function(x) { return x.id === gameId; });
                    if (g) return g.name;
                }
                return gameId;
            }

            function _fmtMoney(n) {
                return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            function _timeAgo(isoStr) {
                const diff = Date.now() - new Date(isoStr).getTime();
                const m = Math.floor(diff / 60000);
                if (m < 1)  return 'just now';
                if (m < 60) return m + 'm ago';
                const h = Math.floor(m / 60);
                if (h < 24) return h + 'h ago';
                return Math.floor(h / 24) + 'd ago';
            }

            listEl.innerHTML = feed.slice(0, 8).map(function(entry) {
                return '<div class="live-feed-entry">' +
                    '<span class="lfe-user">' + entry.username + '</span>' +
                    ' won ' +
                    '<span class="lfe-win">' + _fmtMoney(entry.win) + '</span>' +
                    ' <span class="lfe-mult">(' + entry.mult + '×)</span>' +
                    ' on <span class="lfe-game">' + _gameName(entry.gameId) + '</span>' +
                    '<span class="lfe-time">' + _timeAgo(entry.ts) + '</span>' +
                    '</div>';
            }).join('');
        }

        // ── Lobby Challenge Widget ────────────────────────────────
        function _getDailyChallengeState() {
            try {
                var raw = localStorage.getItem('matrixChallenges');
                var state = raw ? JSON.parse(raw) : null;
                var today = new Date().toISOString().slice(0, 10);
                if (!state || state.date !== today) return { date: today, progress: {}, completed: [] };
                return state;
            } catch(e) { return { date: new Date().toISOString().slice(0, 10), progress: {}, completed: [] }; }
        }

        function renderLobbyChallengeWidget() {
            var container = document.getElementById('lobbyChallengeWidget');
            if (!container) return;

            var challenges = (typeof DAILY_CHALLENGES !== 'undefined' && DAILY_CHALLENGES) || [
                { id: 'spins_20',   label: 'Spin It Up',   target: 20,  reward: 100, icon: '🎰' },
                { id: 'games_3',    label: 'Game Hopper',  target: 3,   reward: 100, icon: '🎮' },
                { id: 'win_once',   label: 'Lucky Break',  target: 1,   reward: 75,  icon: '🍀' },
                { id: 'big_win_50', label: 'High Roller',  target: 50,  reward: 500, icon: '💥' },
                { id: 'bonus_1',    label: 'Bonus Hunter', target: 1,   reward: 300, icon: '🎁' },
                { id: 'wager_500',  label: 'Whale Watch',  target: 500, reward: 200, icon: '🐋' },
                { id: 'streak_3',   label: 'Hot Streak',   target: 3,   reward: 250, icon: '🔥' },
                { id: 'spins_50',   label: 'Spin Machine', target: 50,  reward: 150, icon: '⚡' },
            ];

            var state = _getDailyChallengeState();
            var doneCount = state.completed.length;
            var total = challenges.length;

            // Show first 3 challenges
            var shown = challenges.slice(0, 3);

            var html = '<div class="lc-header">'
                + '<span class="lc-title">Today\'s Challenges</span>'
                + '<span class="lc-progress">' + doneCount + '/' + total + ' complete</span>'
                + '<button class="lc-view-all" onclick="openStatsModal && openStatsModal()">View All</button>'
                + '</div>'
                + '<div class="lc-items">';

            shown.forEach(function(ch) {
                var prog = Math.min(state.progress[ch.id] || 0, ch.target);
                var done = state.completed.indexOf(ch.id) >= 0;
                var pct = Math.round((prog / ch.target) * 100);
                html += '<div class="lc-item' + (done ? ' lc-done' : '') + '">'
                    + '<span class="lc-icon">' + ch.icon + '</span>'
                    + '<div class="lc-info">'
                    +   '<div class="lc-label">' + ch.label + '</div>'
                    +   '<div class="lc-bar"><div class="lc-bar-fill" style="width:' + pct + '%"></div></div>'
                    + '</div>'
                    + '<span class="lc-reward">' + (done ? '✓' : '+$' + (ch.reward || 0)) + '</span>'
                    + '</div>';
            });

            html += '</div>';
            container.innerHTML = html;
            container.style.display = 'block';
        }

        window.refreshLobbyChallengeWidget = renderLobbyChallengeWidget;

// ══════════════════════════════════════════════════════════
// SPRINT 34 — Hourly Free Bonus
// ══════════════════════════════════════════════════════════
var _HB_KEY = 'matrixHourlyBonus';
var _HB_COOLDOWN = 60 * 60 * 1000; // 1 hour

function _hbGetState() {
    try { return JSON.parse(localStorage.getItem(_HB_KEY) || '{}'); } catch(e) { return {}; }
}

function initHourlyBonus() {
    var fab = document.getElementById('hourlyBonusFab');
    if (!fab) return;
    _hbRefresh();
    setInterval(_hbRefresh, 30000); // refresh every 30s
}

function _hbRefresh() {
    var fab = document.getElementById('hourlyBonusFab');
    var sub = document.getElementById('hourlyBonusSub');
    if (!fab) return;
    var state = _hbGetState();
    var now = Date.now();
    var last = state.lastClaim || 0;
    var elapsed = now - last;
    if (elapsed >= _HB_COOLDOWN) {
        fab.style.display = 'flex';
        fab.classList.add('hbf-ready');
        if (sub) sub.textContent = 'Tap to claim!';
    } else {
        fab.style.display = 'flex';
        fab.classList.remove('hbf-ready');
        var remaining = Math.ceil((_HB_COOLDOWN - elapsed) / 60000);
        if (sub) sub.textContent = remaining + 'm remaining';
    }
}

function claimHourlyBonus() {
    var state = _hbGetState();
    var now = Date.now();
    var last = state.lastClaim || 0;
    if (now - last < _HB_COOLDOWN) return; // on cooldown
    var award = 25 + Math.floor(Math.random() * 76); // $25-$100
    if (typeof balance !== 'undefined') balance += award;
    if (typeof updateBalance === 'function') updateBalance();
    if (typeof saveStats === 'function') saveStats();
    state.lastClaim = now;
    localStorage.setItem(_HB_KEY, JSON.stringify(state));
    _hbRefresh();
    if (typeof showToast === 'function') showToast('🎁 Free Bonus: $' + award + ' added!', 'success');
    else if (typeof showMessage === 'function') showMessage('🎁 Free Bonus: $' + award + '!', 'win');
    // coin burst
    if (typeof createConfetti === 'function') createConfetti();
}

// ══════════════════════════════════════════════════════════
// SPRINT 34 — Challenge Streak Multiplier
// ══════════════════════════════════════════════════════════
var _CS_KEY = 'matrixChallengeStreak';

function getChallengeStreakMultiplier() {
    try {
        var s = JSON.parse(localStorage.getItem(_CS_KEY) || '{}');
        var today = new Date().toISOString().slice(0, 10);
        if (s.lastDay !== today) return 1; // streak not registered today yet
        if (s.streak >= 3) return 2;
        if (s.streak === 2) return 1.5;
        return 1;
    } catch(e) { return 1; }
}

function updateChallengeStreak(completed) {
    // Call when all daily challenges are completed
    try {
        var s = JSON.parse(localStorage.getItem(_CS_KEY) || '{}');
        var today = new Date().toISOString().slice(0, 10);
        var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (completed) {
            if (s.lastDay === yesterday) {
                s.streak = (s.streak || 0) + 1;
            } else if (s.lastDay !== today) {
                s.streak = 1; // reset if gap
            }
            s.lastDay = today;
        } else {
            if (s.lastDay !== today && s.lastDay !== yesterday) s.streak = 0;
        }
        localStorage.setItem(_CS_KEY, JSON.stringify(s));
    } catch(e) {}
}

// ══════════════════════════════════════════════════════════
// SPRINT 35 — Favorites Quick Bar
// ══════════════════════════════════════════════════════════
function renderFavQuickBar() {
    var bar = document.getElementById('favQuickBar');
    var scroll = document.getElementById('favQuickScroll');
    if (!bar || !scroll) return;
    var favs = [];
    try {
        var raw = localStorage.getItem(typeof STORAGE_KEY_FAVORITES !== 'undefined' ? STORAGE_KEY_FAVORITES : 'casinoFavorites');
        favs = JSON.parse(raw || '[]');
    } catch(e) {}
    if (favs.length === 0) { bar.style.display = 'none'; return; }
    var allGames = typeof GAMES !== 'undefined' ? GAMES : [];
    var tiles = favs.slice(0, 8).map(function(id) {
        var g = allGames.find(function(x) { return x.id === id; });
        if (!g) return '';
        var color = (g.color || '#333').replace('#', '');
        return '<div class="fqb-tile" onclick="if(typeof openSlot===\'function\')openSlot(\'' + g.id + '\')" title="' + g.name + '">'
            + '<div class="fqb-icon" style="background:#' + color + '">' + (g.name || g.id).charAt(0).toUpperCase() + '</div>'
            + '<div class="fqb-name">' + (g.name || g.id) + '</div>'
            + '</div>';
    }).join('');
    scroll.innerHTML = tiles || '<div class="fqb-empty">Heart games to add them here</div>';
    bar.style.display = 'flex';
}

// Hook renderFavQuickBar into renderGames
(function() {
    var _origRG = typeof renderGames === 'function' ? renderGames : null;
    if (_origRG) {
        renderGames = function() {
            _origRG.apply(this, arguments);
            renderFavQuickBar();
            buildProviderStatsPanel();
        };
    }
})();

// ===== Sprint 39: Provider Stats Panel =====
function buildProviderStatsPanel() {
    var panel = document.getElementById('providerStatsPanel');
    var body = document.getElementById('providerStatsBody');
    if (!panel || !body) return;
    if (!Array.isArray(typeof GAMES !== 'undefined' ? GAMES : null)) return;
    var stats = {};
    GAMES.forEach(function(g) {
        var p = g.provider || 'Unknown';
        if (!stats[p]) stats[p] = { count: 0, rtpTotal: 0, rtpCount: 0 };
        stats[p].count++;
        var rtp = (g.payouts && g.payouts.triple) ? g.payouts.triple : 0;
        if (rtp > 0) { stats[p].rtpTotal += rtp; stats[p].rtpCount++; }
    });
    var providers = Object.keys(stats).sort(function(a, b) { return stats[b].count - stats[a].count; });
    body.innerHTML = providers.map(function(p) {
        var s = stats[p];
        var avgRtp = s.rtpCount > 0 ? (s.rtpTotal / s.rtpCount).toFixed(0) + 'x' : '—';
        return '<button class="provider-stat-row" onclick="setProviderFilter(\'' + p.replace(/'/g, "\\'") + '\')" title="Filter by ' + p + '">'
            + '<span class="psr-name">' + p + '</span>'
            + '<span class="psr-count">' + s.count + ' games</span>'
            + '<span class="psr-rtp">Avg max: ' + avgRtp + '</span>'
            + '</button>';
    }).join('');
    panel.style.display = '';
}

// Toggle provider stats panel visibility
function toggleProviderStats() {
    var panel = document.getElementById('providerStatsPanel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

// ===== Sprint 40: Game Comparison Tool =====
var _compareMode = false;
var _compareGames = [];

function toggleCompareMode() {
    _compareMode = !_compareMode;
    var btn = document.getElementById('compareToggleBtn');
    if (btn) btn.classList.toggle('compare-active', _compareMode);
    if (!_compareMode) { clearCompareSelection(); }
    if (typeof showToast === 'function') showToast(_compareMode ? '\u2696 Click games to compare (max 3)' : 'Compare mode off', 'info');
}

function _addToCompare(gameId) {
    if (!_compareMode) return false;
    if (_compareGames.indexOf(gameId) >= 0) {
        _compareGames = _compareGames.filter(function(id) { return id !== gameId; });
    } else {
        if (_compareGames.length >= 3) { if (typeof showToast === 'function') showToast('Max 3 games to compare', 'warn'); return true; }
        _compareGames.push(gameId);
    }
    _renderCompareBar();
    return true;
}

function _renderCompareBar() {
    var bar = document.getElementById('compareBar');
    var slotsEl = document.getElementById('compareBarSlots');
    var nowBtn = document.getElementById('compareNowBtn');
    if (!bar) return;
    bar.style.display = _compareGames.length > 0 ? '' : 'none';
    if (!slotsEl) return;
    slotsEl.innerHTML = _compareGames.map(function(id) {
        var g = typeof GAMES !== 'undefined' ? GAMES.find(function(x) { return x.id === id; }) : null;
        if (!g) return '';
        return '<span class="compare-pill">' + (g.emoji || '\uD83C\uDFB0') + ' ' + g.name
            + ' <button onclick="_addToCompare(\'' + id + '\')" title="Remove">\u00d7</button></span>';
    }).join('');
    if (nowBtn) nowBtn.disabled = _compareGames.length < 2;
}

function clearCompareSelection() {
    _compareGames = [];
    _renderCompareBar();
    document.querySelectorAll('.game-card.compare-selected').forEach(function(c) { c.classList.remove('compare-selected'); });
}

function openCompareModal() {
    if (_compareGames.length < 2) { if (typeof showToast === 'function') showToast('Select at least 2 games', 'warn'); return; }
    var modal = document.getElementById('gameCompareModal');
    var wrap = document.getElementById('compareTableWrap');
    if (!modal || !wrap) return;
    var games = _compareGames.map(function(id) { return typeof GAMES !== 'undefined' ? GAMES.find(function(g) { return g.id === id; }) : null; }).filter(Boolean);
    var fields = [
        { label: 'Name', fn: function(g) { return g.name; } },
        { label: 'Provider', fn: function(g) { return g.provider || '—'; } },
        { label: 'Grid', fn: function(g) { return (g.reels || 5) + '\u00d7' + (g.rows || 3); } },
        { label: 'Max Win', fn: function(g) { return (g.payouts && g.payouts.triple ? g.payouts.triple + 'x' : '—'); } },
        { label: 'Mechanics', fn: function(g) { return (g.mechanics || []).join(', ') || '—'; } }
    ];
    var best = {};
    fields.forEach(function(f) {
        var vals = games.map(function(g) { return parseFloat(f.fn(g)); });
        if (!isNaN(vals[0])) {
            var max = Math.max.apply(null, vals);
            best[f.label] = max;
        }
    });
    var html = '<table class="compare-table"><thead><tr><th>Stat</th>' + games.map(function(g) { return '<th>' + (g.emoji || '') + ' ' + g.name + '</th>'; }).join('') + '</tr></thead><tbody>';
    fields.forEach(function(f) {
        html += '<tr><td class="compare-stat-label">' + f.label + '</td>';
        games.forEach(function(g) {
            var val = f.fn(g);
            var isTop = best[f.label] !== undefined && parseFloat(val) === best[f.label];
            html += '<td class="compare-val' + (isTop ? ' compare-best' : '') + '">' + val + '</td>';
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
    modal.classList.add('active');
    modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('active'); };
}

// ===== Sprint 43: Game Recommendations =====
var _recommendedHidden = false;

function buildRecommendations() {
    var section = document.getElementById('recommendedSection');
    var grid = document.getElementById('recommendedGames');
    if (!section || !grid) return;
    var recent = [];
    try { recent = JSON.parse(localStorage.getItem(typeof RECENTLY_PLAYED_KEY !== 'undefined' ? RECENTLY_PLAYED_KEY : 'matrixRecentlyPlayed') || '[]'); } catch(e) {}
    if (recent.length < 3) { section.style.display = 'none'; return; }
    var playedSet = new Set(recent);
    // Gather providers and mechanics from recently played
    var providerFreq = {}, mechFreq = {};
    recent.forEach(function(id) {
        var g = typeof GAMES !== 'undefined' ? GAMES.find(function(x) { return x.id === id; }) : null;
        if (!g) return;
        if (g.provider) providerFreq[g.provider] = (providerFreq[g.provider] || 0) + 1;
        (g.mechanics || []).forEach(function(m) { mechFreq[m] = (mechFreq[m] || 0) + 1; });
    });
    // Score unplayed games
    var scored = (typeof GAMES !== 'undefined' ? GAMES : []).filter(function(g) { return !playedSet.has(g.id); }).map(function(g) {
        var score = 0;
        if (g.provider && providerFreq[g.provider]) score += providerFreq[g.provider] * 2;
        (g.mechanics || []).forEach(function(m) { if (mechFreq[m]) score += mechFreq[m]; });
        return { game: g, score: score };
    }).filter(function(x) { return x.score > 0; });
    scored.sort(function(a, b) { return b.score - a.score; });
    var top = scored.slice(0, 6).map(function(x) { return x.game; });
    if (top.length < 2) { section.style.display = 'none'; return; }
    grid.innerHTML = top.map(function(g) { return typeof createGameCard === 'function' ? createGameCard(g) : ''; }).join('');
    section.style.display = _recommendedHidden ? 'none' : '';
}

function toggleRecommended() {
    _recommendedHidden = !_recommendedHidden;
    var section = document.getElementById('recommendedSection');
    var btn = section && section.querySelector('.section-see-all');
    if (section) section.style.display = _recommendedHidden ? 'none' : '';
    if (btn) btn.textContent = _recommendedHidden ? 'Show ▼' : 'Hide ▲';
}

// ===== Sprint 44: Game Collections =====
var _activeCollection = 'all';

var _COLLECTIONS = {
    all: null,
    highroller: function(g) { return (g.payouts && g.payouts.triple && g.payouts.triple >= 200) || (g.maxBet && g.maxBet >= 500); },
    quick: function(g) { return (g.reels || 5) <= 3 || (g.rows || 3) <= 3; },
    jackpot: function(g) { return g.jackpot || (g.tags && g.tags.indexOf('jackpot') >= 0) || (g.mechanics && g.mechanics.indexOf('jackpot') >= 0); },
    newbie: function(g) { return (g.payouts && g.payouts.triple && g.payouts.triple <= 100) && !(g.mechanics && g.mechanics.length > 2); }
};

function setCollection(name) {
    _activeCollection = name || 'all';
    document.querySelectorAll('.collection-tab').forEach(function(btn) {
        btn.classList.toggle('collection-tab-active', btn.dataset.collection === _activeCollection);
    });
    if (typeof renderFilteredGames === 'function') renderFilteredGames();
}

// ===== Sprint 46: Tag Filters =====
var _activeTags = new Set();

function toggleTagFilter(tag) {
    if (_activeTags.has(tag)) _activeTags.delete(tag);
    else _activeTags.add(tag);
    document.querySelectorAll('.tag-pill').forEach(function(btn) {
        btn.classList.toggle('tag-pill-active', _activeTags.has(btn.dataset.tag));
    });
    if (typeof renderFilteredGames === 'function') renderFilteredGames();
}

// ===== Sprint 45: Lobby Layout Toggle =====
var _lobbyLayout = (function() { try { return localStorage.getItem('matrixLobbyLayout') || 'grid'; } catch(e) { return 'grid'; } })();

function setLobbyLayout(layout) {
    _lobbyLayout = layout;
    try { localStorage.setItem('matrixLobbyLayout', layout); } catch(e) {}
    document.getElementById('layoutGridBtn') && document.getElementById('layoutGridBtn').classList.toggle('layout-btn-active', layout === 'grid');
    document.getElementById('layoutListBtn') && document.getElementById('layoutListBtn').classList.toggle('layout-btn-active', layout === 'list');
    var allGamesDiv = document.getElementById('allGames');
    if (allGamesDiv) {
        allGamesDiv.classList.toggle('games-list-view', layout === 'list');
        if (layout === 'list') _renderListView(allGamesDiv);
        else if (typeof renderFilteredGames === 'function') renderFilteredGames();
    }
}

function _renderListView(container) {
    var games = typeof getFilteredGames === 'function' ? getFilteredGames() : [];
    container.innerHTML = games.map(function(g) {
        var rtp = (g.payouts && g.payouts.triple) ? g.payouts.triple + 'x' : '—';
        return '<div class="game-list-row" onclick="if(typeof _compareMode!==\'undefined\'&&_compareMode){_addToCompare(\'' + g.id + '\');}else{openSlot(\'' + g.id + '\');}">'
            + '<span class="glr-emoji">' + (g.emoji || '🎰') + '</span>'
            + '<span class="glr-name">' + g.name + '</span>'
            + '<span class="glr-provider">' + (g.provider || '') + '</span>'
            + '<span class="glr-rtp">Max: ' + rtp + '</span>'
            + '<button class="glr-play btn">Play</button>'
            + '</div>';
    }).join('');
}

// Patch getFilteredGames to apply collection + tag filters
(function() {
    var _origGFG = typeof getFilteredGames === 'function' ? getFilteredGames : null;
    if (!_origGFG) return;
    getFilteredGames = function() {
        var list = _origGFG.apply(this, arguments);
        // Sprint 44: collection filter
        if (_activeCollection && _activeCollection !== 'all' && _COLLECTIONS[_activeCollection]) {
            list = list.filter(_COLLECTIONS[_activeCollection]);
        }
        // Sprint 46: tag filter
        if (typeof _activeTags !== 'undefined' && _activeTags.size > 0) {
            list = list.filter(function(g) {
                return Array.from(_activeTags).every(function(tag) {
                    if (tag === 'hot') return g.hot || (g.tags && g.tags.indexOf('hot') >= 0);
                    if (tag === 'new') return g.new || (g.tags && g.tags.indexOf('new') >= 0);
                    if (tag === 'jackpot') return g.jackpot || (g.mechanics && g.mechanics.indexOf('jackpot') >= 0);
                    if (tag === 'megaways') return g.mechanics && g.mechanics.indexOf('megaways') >= 0;
                    if (tag === 'popular') return g.popular || (g.tags && g.tags.indexOf('popular') >= 0);
                    return true;
                });
            });
        }
        return list;
    };
})();

// ===== Sprint 45: Recent Wins Feed =====
var _recentWinsSession = [];

function recordRecentWin(gameName, gameId, winAmount, betAmount) {
    if (winAmount < betAmount * 2) return;
    _recentWinsSession.unshift({ gameName: gameName, gameId: gameId, winAmount: winAmount, ts: Date.now() });
    if (_recentWinsSession.length > 10) _recentWinsSession.length = 10;
    renderRecentWinsFeed();
}

function renderRecentWinsFeed() {
    var strip = document.getElementById('recentWinsStrip');
    var scroll = document.getElementById('recentWinsScroll');
    if (!strip || !scroll) return;
    if (_recentWinsSession.length === 0) { strip.style.display = 'none'; return; }
    strip.style.display = '';
    scroll.innerHTML = _recentWinsSession.map(function(w) {
        var mins = Math.floor((Date.now() - w.ts) / 60000);
        var ago = mins < 1 ? 'just now' : mins + 'm ago';
        return '<div class="rws-card" onclick="if(typeof openSlot!==\'undefined\')openSlot(\'' + w.gameId + '\')" title="Play ' + w.gameName + '">'
            + '<div class="rws-game">' + w.gameName + '</div>'
            + '<div class="rws-win">$' + w.winAmount.toFixed(0) + '</div>'
            + '<div class="rws-time">' + ago + '</div>'
            + '</div>';
    }).join('');
}

// Hook into renderGames to also update recommendations and recent wins
(function() {
    var _orig = typeof renderGames === 'function' ? renderGames : null;
    if (!_orig) return;
    renderGames = function() {
        _orig.apply(this, arguments);
        buildRecommendations();
        renderRecentWinsFeed();
        buildProviderLeaderboard(); // Sprint 48
        updateSessionPnlBar();     // Sprint 49
        updateGamesExploredBadge(); // Sprint 50
        // Apply saved layout
        if (_lobbyLayout === 'list') {
            var c = document.getElementById('allGames');
            if (c) { c.classList.add('games-list-view'); _renderListView(c); }
            document.getElementById('layoutListBtn') && document.getElementById('layoutListBtn').classList.add('layout-btn-active');
            document.getElementById('layoutGridBtn') && document.getElementById('layoutGridBtn').classList.remove('layout-btn-active');
        }
    };
})();

// ===== Sprint 48: Provider Leaderboard =====
function buildProviderLeaderboard() {
    var wrap = document.getElementById('providerLeaderboard');
    var list = document.getElementById('plbList');
    if (!wrap || !list) return;
    try {
        var raw = localStorage.getItem('casinoRecentlyPlayed');
        var played = raw ? JSON.parse(raw) : [];
        if (!played.length) { wrap.style.display = 'none'; return; }
        // Aggregate by provider
        var counts = {};
        played.forEach(function(g) {
            var prov = g.provider || 'Unknown';
            counts[prov] = (counts[prov] || 0) + 1;
        });
        var sorted = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; }).slice(0, 3);
        if (!sorted.length) { wrap.style.display = 'none'; return; }
        list.innerHTML = sorted.map(function(p, i) {
            var medal = ['🥇','🥈','🥉'][i] || '';
            return '<div class="plb-row"><span class="plb-medal">' + medal + '</span>'
                + '<span class="plb-name">' + p + '</span>'
                + '<span class="plb-count">' + counts[p] + ' plays</span></div>';
        }).join('');
        wrap.style.display = '';
    } catch(e) { wrap.style.display = 'none'; }
}

// ===== Sprint 49: Random Game Picker =====
function pickRandomGame() {
    var btn = document.getElementById('randomGameBtn');
    if (btn) { btn.classList.add('spinning-dice'); setTimeout(function() { btn.classList.remove('spinning-dice'); }, 600); }
    var pool = (typeof GAMES !== 'undefined') ? GAMES.slice() : [];
    // Apply current filter if active
    var cf = (typeof currentFilter !== 'undefined') ? currentFilter : 'all';
    var pf = (typeof currentProviderFilter !== 'undefined') ? currentProviderFilter : 'all';
    if (cf && cf !== 'all') pool = pool.filter(function(g) { return g.category === cf || (g.categories && g.categories.indexOf(cf) !== -1); });
    if (pf && pf !== 'all') pool = pool.filter(function(g) { return (g.provider || '').toLowerCase() === pf.toLowerCase(); });
    if (!pool.length) pool = (typeof GAMES !== 'undefined') ? GAMES.slice() : [];
    if (!pool.length) return;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick && typeof openSlot === 'function') openSlot(pick.id);
}

// ===== Sprint 49: Session P&L Bar =====
var _sessionOpenBalance = null;

function updateSessionPnlBar() {
    var bar = document.getElementById('sessionPnlBar');
    var val = document.getElementById('sessionPnlVal');
    if (!bar || !val) return;
    if (_sessionOpenBalance === null) {
        _sessionOpenBalance = (typeof balance !== 'undefined') ? balance : null;
    }
    if (_sessionOpenBalance === null) { bar.style.display = 'none'; return; }
    var current = (typeof balance !== 'undefined') ? balance : _sessionOpenBalance;
    var pnl = current - _sessionOpenBalance;
    val.textContent = (pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toFixed(2);
    val.className = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
    bar.style.display = '';
}

// ===== Sprint 50: Games Explored Badge =====
function updateGamesExploredBadge() {
    var badge = document.getElementById('gamesExploredBadge');
    if (!badge) return;
    try {
        var raw = localStorage.getItem('casinoGamesExplored');
        var explored = raw ? JSON.parse(raw) : [];
        var total = (typeof GAMES !== 'undefined') ? GAMES.length : 80;
        if (!explored.length) { badge.style.display = 'none'; return; }
        badge.textContent = '🗺 ' + explored.length + '/' + total + ' explored';
        badge.style.display = '';
    } catch(e) { badge.style.display = 'none'; }
}


// ===== Sprint 51/54/56: Lobby Card Extra Badges =====
(function() {
    function _addLobbyCardBadges() {
        if (typeof GAMES === 'undefined') return;
        var playedMap = {};
        try {
            var raw = localStorage.getItem('casinoSpinHistory');
            if (raw) JSON.parse(raw).forEach(function(h) {
                if (h.gameId) playedMap[h.gameId] = (playedMap[h.gameId] || 0) + 1;
            });
        } catch(e) {}

        document.querySelectorAll('.game-card[data-game-id]').forEach(function(card) {
            var gameId = card.dataset.gameId;
            var game = GAMES.find(function(g) { return (g.id || '').toLowerCase() === gameId; });
            if (!game) return;

            // Remove stale badges from previous renders
            card.querySelectorAll('.lb51-badge,.lb54-badge,.lb56-badge').forEach(function(b) { b.remove(); });

            // Sprint 51: Popularity badge (10+ plays)
            var plays = playedMap[game.id] || 0;
            if (plays >= 10) {
                var pb = document.createElement('span');
                var popCls = plays >= 100 ? 'lb51-mega' : plays >= 50 ? 'lb51-fan' : 'lb51-regular';
                pb.className = 'lobby-badge lb51-badge ' + popCls;
                pb.textContent = plays >= 100 ? '\u2B50 Fave' : plays >= 50 ? '\u2665 Fan' : '\u25B6 ' + plays + 'x';
                card.appendChild(pb);
            }

            // Sprint 54: Difficulty badge
            var volMap = { low: ['Easy','lb54-easy'], medium: ['Med','lb54-med'], 'medium-high': ['Med+','lb54-medhard'], high: ['Hard','lb54-hard'], 'very-high': ['Expert','lb54-expert'] };
            var vd = volMap[game.volatility || 'medium'] || ['Med','lb54-med'];
            var db = document.createElement('span');
            db.className = 'lobby-badge lb54-badge ' + vd[1];
            db.textContent = vd[0];
            card.appendChild(db);

            // Sprint 56: Category badge
            var cat = game.category || game.gameType || '';
            if (cat) {
                var cb = document.createElement('span');
                cb.className = 'lobby-badge lb56-badge';
                cb.textContent = String(cat).charAt(0).toUpperCase() + String(cat).slice(1).replace(/-/g,' ');
                card.appendChild(cb);
            }
        });
    }

    // Hook into renderGames chain (append-only, safe for multiple hooks)
    (function() {
        var _prevRG56 = typeof renderGames === 'function' ? renderGames : null;
        if (!_prevRG56) return;
        renderGames = function() {
            _prevRG56.apply(this, arguments);
            setTimeout(_addLobbyCardBadges, 50);
        };
    })();
})();


/* ═══════════════════════════════════════════════════════════════
   LOBBY VISUAL OVERHAUL — 2026-02-27
   ═══════════════════════════════════════════════════════════════ */

/** Inject game-count badges into filter tabs and provider chips */
function _injectFilterCounts() {
  if (typeof games === 'undefined') return;

  var _favKey = (typeof STORAGE_KEY_FAVORITES !== 'undefined') ? STORAGE_KEY_FAVORITES : 'favorites';
  var _counts = { all: games.length, hot: 0, new: 0, jackpot: 0, popular: 0, megaways: 0, favorites: 0 };
  var _favs = (function() {
    try { return JSON.parse(localStorage.getItem(_favKey) || '[]'); } catch(e) { return []; }
  })();
  games.forEach(function(g) {
    var tag = (g.tag || '').toLowerCase();
    if (tag === 'hot')     _counts.hot++;
    if (tag === 'new')     _counts.new++;
    if (tag === 'jackpot') _counts.jackpot++;
    if (tag === 'popular') _counts.popular++;
    if (g.mechanic === 'megaways') _counts.megaways++;
    if (_favs.indexOf(g.id) >= 0) _counts.favorites++;
  });

  document.querySelectorAll('.tab-count').forEach(function(el){el.remove();});
  document.querySelectorAll('.chip-count').forEach(function(el){el.remove();});
  document.querySelectorAll('.filter-tab').forEach(function(btn) {
    var filter = btn.dataset.filter;
    if (!filter || !(_counts.hasOwnProperty(filter))) return;
    var badge = btn.querySelector('.tab-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-count';
      btn.appendChild(badge);
    }
    badge.textContent = _counts[filter];
  });

  var _provCounts = {};
  games.forEach(function(g) {
    var p = g.provider || 'Unknown';
    _provCounts[p] = (_provCounts[p] || 0) + 1;
  });
  document.querySelectorAll('.provider-chip').forEach(function(chip) {
    var provider = chip.dataset.provider;
    if (!provider) return;
    var n = (provider === 'all') ? games.length : (_provCounts[provider] || 0);
    if (n === 0) return;
    var badge = chip.querySelector('.chip-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'chip-count';
      chip.appendChild(badge);
    }
    badge.textContent = n;
  });
}

/** Render the featured spotlight strip above Top Picks */
function _renderFeaturedSpotlight() {
  var container = document.getElementById('featuredSpotlight');
  if (!container || typeof games === 'undefined') return;
  container.innerHTML = '';

  // Pick: 2 jackpot, 3 hot, 2 new, 2 popular
  function pickRandom(arr, n) {
    return arr.slice().sort(function() { return Math.random() - 0.5; }).slice(0, n);
  }
  var jackpots = games.filter(function(g) { return (g.tag||'').toLowerCase() === 'jackpot'; });
  var hots     = games.filter(function(g) { return (g.tag||'').toLowerCase() === 'hot'; });
  var news     = games.filter(function(g) { return (g.tag||'').toLowerCase() === 'new'; });
  var pops     = games.filter(function(g) { return (g.tag||'').toLowerCase() === 'popular'; });

  var featured = pickRandom(jackpots, 2)
    .concat(pickRandom(hots, 3))
    .concat(pickRandom(news, 2))
    .concat(pickRandom(pops, 2))
    .slice(0, 9);

  if (!featured.length) return;

  featured.forEach(function(game) {
    var tag = (game.tag || '').toLowerCase();
    var badgeClass = tag === 'jackpot' ? 'featured-badge-jackpot'
                   : tag === 'hot'     ? 'featured-badge-hot'
                   : tag === 'new'     ? 'featured-badge-new'
                                       : 'featured-badge-popular';
    var badgeLabel = tag === 'jackpot' ? '💰 JACKPOT'
                   : tag === 'hot'     ? '🔥 HOT'
                   : tag === 'new'     ? '✨ NEW'
                                       : '🤝 POPULAR';

    var card = document.createElement('div');
    card.className = 'featured-card';
    card.style.backgroundImage = 'url(\'assets/thumbnails/' + game.id + '.png\')';
    card.setAttribute('data-game-id', game.id);
    card.title = game.name;

    var overlay = document.createElement('div');
    overlay.className = 'featured-card-overlay';

    var badge = document.createElement('div');
    badge.className = 'featured-card-badge ' + badgeClass;
    badge.textContent = badgeLabel;

    var playDiv = document.createElement('div');
    playDiv.className = 'featured-card-play';
    var circle = document.createElement('div');
    circle.className = 'featured-play-circle';
    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    var poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points','5,3 19,12 5,21');
    svg.appendChild(poly);
    circle.appendChild(svg);
    playDiv.appendChild(circle);

    var nameEl = document.createElement('div');
    nameEl.className = 'featured-card-name';
    nameEl.textContent = game.name;

    var provEl = document.createElement('div');
    provEl.className = 'featured-card-provider';
    provEl.textContent = game.provider || '';

    card.appendChild(overlay);
    card.appendChild(badge);
    card.appendChild(playDiv);
    card.appendChild(nameEl);
    card.appendChild(provEl);
    card.onclick = function() {
      if (typeof openSlot === 'function') openSlot(game.id);
    };
    container.appendChild(card);
  });
}

/* ─ END LOBBY VISUAL OVERHAUL ─ */

/* ═══════════════════════════════════════════════════════════════
   LAZY THUMBNAIL LOADER — 2026-02-27
   Uses IntersectionObserver to defer loading game thumbnails until
   they are about to scroll into view, preventing all ~120 HD images
   (~20 MB WebP / ~150 MB PNG) from being fetched simultaneously.
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var _thumbObserver = null;

  function _initLazyThumbnails() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: apply all immediately for browsers without IO support.
      document.querySelectorAll('.game-thumbnail[data-bg]').forEach(function(el) {
        _applyBg(el);
      });
      return;
    }
    if (!_thumbObserver) {
      _thumbObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            _applyBg(entry.target);
            _thumbObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px 0px', threshold: 0 });
    }
    document.querySelectorAll('.game-thumbnail[data-bg]').forEach(function(el) {
      _thumbObserver.observe(el);
    });
  }

  /** Apply background image, preferring WebP over PNG for smaller file sizes. */
  function _applyBg(el) {
    var src = el.getAttribute('data-bg');
    if (!src) return;
    el.removeAttribute('data-bg');
    el.style.backgroundSize     = 'cover';
    el.style.backgroundPosition = 'center';
    var webpSrc = src.replace(/\.png$/, '.webp');
    if (webpSrc !== src) {
      var probe = new Image();
      probe.onload  = function() { el.style.backgroundImage = 'url(\'' + webpSrc + '\')'; };
      probe.onerror = function() { el.style.backgroundImage = 'url(\'' + src + '\')'; };
      probe.src = webpSrc;
    } else {
      el.style.backgroundImage = 'url(\'' + src + '\')';
    }
  }

  window._initLazyThumbnails = _initLazyThumbnails;
})();

/* ── Sprint 82: Daily Win Goal bar ── */
(function() {
    var _DG_KEY = typeof STORAGE_KEY_DAILY_GOAL !== 'undefined' ? STORAGE_KEY_DAILY_GOAL : 'matrixDailyGoal';
    var _DG_DEFAULT = 100;

    function _today() { return new Date().toISOString().slice(0, 10); }

    function _loadDG() {
        try {
            var raw = localStorage.getItem(_DG_KEY);
            var s = raw ? JSON.parse(raw) : null;
            if (!s || s.date !== _today()) return { date: _today(), goal: _DG_DEFAULT, won: 0 };
            return s;
        } catch(e) { return { date: _today(), goal: _DG_DEFAULT, won: 0 }; }
    }

    function _saveDG(s) {
        try { localStorage.setItem(_DG_KEY, JSON.stringify(s)); } catch(e) {}
    }

    function renderDailyGoalBar() {
        var bar = document.getElementById('dailyGoalBar');
        var fill = document.getElementById('dgbFill');
        var prog = document.getElementById('dgbProgress');
        if (!bar || !fill || !prog) return;
        var s = _loadDG();
        if (!s.goal) { bar.style.display = 'none'; return; }
        bar.style.display = 'flex';
        var pct = Math.min(100, (s.won / s.goal) * 100);
        fill.style.width = pct + '%';
        var reached = s.won >= s.goal;
        fill.classList.toggle('dgb-done', reached);
        if (reached) {
            prog.textContent = '🎉 Goal!';
            prog.className = 'dgb-progress dgb-reached';
        } else {
            prog.textContent = '$' + Math.round(s.won) + ' / $' + Math.round(s.goal);
            prog.className = 'dgb-progress';
        }
    }

    function openDailyGoalEdit() {
        var s = _loadDG();
        var input = prompt('Set your daily win goal ($):', s.goal);
        if (input === null) return;
        var val = parseFloat(input);
        if (!isNaN(val) && val > 0) {
            s.goal = Math.round(val);
            _saveDG(s);
            renderDailyGoalBar();
        }
    }

    function recordGoalWin(amount) {
        if (!amount || amount <= 0) return;
        var s = _loadDG();
        s.won += amount;
        _saveDG(s);
        renderDailyGoalBar();
    }

    window.renderDailyGoalBar = renderDailyGoalBar;
    window.openDailyGoalEdit  = openDailyGoalEdit;
    window.recordGoalWin      = recordGoalWin;

    // Hook into renderGames chain
    (function() {
        var _prevRG82 = typeof renderGames === 'function' ? renderGames : null;
        if (!_prevRG82) return;
        renderGames = function() {
            _prevRG82.apply(this, arguments);
            if (typeof renderDailyGoalBar === 'function') renderDailyGoalBar();
        };
    })();

    // Initial render
    renderDailyGoalBar();
})();
