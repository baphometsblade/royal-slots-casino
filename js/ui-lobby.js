// ═══════════════════════════════════════════════════════
// UI-LOBBY MODULE
// ═══════════════════════════════════════════════════════

        // Module-level search state — persists across filter tab switches
        let lobbySearchQuery = '';
        let currentMechanicFilter = 'all'; // 'all' | 'tumble' | 'hold_win' | 'free_spins' | 'wilds' | 'jackpot'
        let currentSortMode = 'default';    // 'default' | 'vol_asc' | 'vol_desc'
        let searchQuery = '';                      // real-time game search (compound with other filters)

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


        function renderGames() {

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
                    renderRecentlyPlayed();
                    renderYouMightLike();
                    renderRecommendations(allGamesDiv.parentNode || document.getElementById('lobby') || allGamesDiv);
                    renderBestWins();
                    // Start live-count tick once, persists across re-renders
                    if (!window._liveCountsInterval) {
                        window._liveCountsInterval = setInterval(_tickLiveCounts, 15000 + Math.random() * 6000);
                    }
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
            const thumbStyle = game.thumbnail
                ? `background-image: url('${game.thumbnail}'); background-size: cover; background-position: center;`
                : `background: ${game.bgGradient};`;
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
            _seedCount(game.id, isHot || _hotIds.has(game.id));
            return `
                <div class="game-card${isHot ? ' game-card-hot' : ''}${isJackpot ? ' game-card-jackpot' : ''}" onclick="openSlot('${game.id}')" style="position:relative">
                    <button class="fav-btn${favored ? ' fav-active' : ''}" data-game-id="${game.id}" title="${favored ? 'Remove from favourites' : 'Add to favourites'}" onclick="event.stopPropagation(); (function(btn){var nowFav=toggleFavorite('${game.id}'); btn.textContent=nowFav?'\u2764\uFE0F':'\u2661'; btn.title=nowFav?'Remove from favourites':'Add to favourites'; btn.classList.add('fav-active'); setTimeout(function(){btn.classList.remove('fav-active');},350); updateFavTabBadge();})(this)">${favIcon}</button>
                    <div class="game-thumbnail" style="${thumbStyle}">
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
                </div>
            `;
        }


        function playRandomHotGame() {
            const hotGames = games.filter(g => g.hot);
            const pick = hotGames[Math.floor(Math.random() * hotGames.length)];
            openSlot(pick.id);
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
            // Apply sort
            if (currentSortMode === 'vol_asc') {
                list = [...list].sort((a, b) => _getVolatility(a) - _getVolatility(b));
            } else if (currentSortMode === 'vol_desc') {
                list = [...list].sort((a, b) => _getVolatility(b) - _getVolatility(a));
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

            const game = games[Math.floor(Math.random() * games.length)];
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
