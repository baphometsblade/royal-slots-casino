// ═══════════════════════════════════════════════════════
// UI-LOBBY MODULE
// ═══════════════════════════════════════════════════════


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


        function renderGames() {
            // Inject animated-preview styles once into <head>
            if (!document.getElementById('lobbyAnimStyles')) {
                const s = document.createElement('style');
                s.id = 'lobbyAnimStyles';
                s.textContent = `
                    .card-anim-preview {
                        position: absolute; inset: 0;
                        background-size: cover; background-position: center;
                        opacity: 0; transition: opacity 0.4s ease;
                        pointer-events: none; z-index: 2;
                    }
                    .game-card:hover .card-anim-preview { opacity: 1; }
                    .card-anim-preview.hidden { display: none; }
                    .preview-badge {
                        position: absolute; top: 6px; right: 6px;
                        background: rgba(0,0,0,0.6); color: #00ff41;
                        font-size: 9px; font-family: monospace;
                        padding: 2px 5px; border-radius: 3px; letter-spacing: 1px;
                        pointer-events: none;
                    }
                `;
                document.head.appendChild(s);
            }

            // Inject favorites styles once into <head>
            if (!document.getElementById('favStyles')) {
                const fs = document.createElement('style');
                fs.id = 'favStyles';
                fs.textContent = `
                    .fav-btn {
                        position: absolute; top: 6px; right: 34px;
                        background: transparent; border: none;
                        font-size: 20px; cursor: pointer; z-index: 10;
                        line-height: 1; padding: 4px; border-radius: 50%;
                        transition: transform 0.15s;
                    }
                    .fav-btn:hover { transform: scale(1.3); }
                    .fav-btn.fav-active { animation: favPop 0.3s ease-out; }
                    @keyframes favPop {
                        0%   { transform: scale(1); }
                        50%  { transform: scale(1.5); }
                        100% { transform: scale(1); }
                    }
                    .filter-fav-count {
                        display: inline-block; background: #e11d48;
                        color: #fff; font-size: 10px; font-weight: 700;
                        border-radius: 8px; padding: 1px 5px; margin-left: 4px;
                        vertical-align: middle; line-height: 16px; min-width: 16px;
                        text-align: center;
                    }
                    .games-fav-empty {
                        grid-column: 1 / -1; text-align: center;
                        padding: 48px 24px; color: rgba(255,255,255,0.45);
                        font-size: 15px;
                    }
                    .games-fav-empty .fav-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }
                `;
                document.head.appendChild(fs);
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
        }


        function startJackpotTicker() {
            async function fetchAndUpdate() {
                try {
                    const res = await fetch('/api/jackpot');
                    if (!res.ok) return;
                    const data = await res.json();
                    const fmt = v => '$' + Number(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const mini  = document.getElementById('jackpot-mini-amount');
                    const major = document.getElementById('jackpot-major-amount');
                    const mega  = document.getElementById('jackpot-mega-amount');
                    if (mini)  mini.textContent  = fmt(data.mini  || 500);
                    if (major) major.textContent = fmt(data.major || 2500);
                    if (mega)  mega.textContent  = fmt(data.mega  || 10000);
                } catch (_) {}
            }
            fetchAndUpdate();
            setInterval(fetchAndUpdate, 10000);
            initLeaderboard();
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


        function createGameCard(game) {
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
            // Build hover overlay bonus pill
            const featureIconMap = {
                tumble: '⬇️', avalanche: '🪨', random_multiplier: '✨', zeus_multiplier: '⚡',
                money_collect: '💰', respin: '🔄', stacked_wilds: '🔥', hold_and_win: '🎯',
                fisherman_collect: '🎣', wheel_multiplier: '🎡', expanding_symbol: '📖',
                expanding_wild_respin: '🌟', sticky_wilds: '🍯', progressive: '🏆',
                mystery_symbols: '❓', cascading: '🌊', nudge: '👆', trail_bonus: '🗺️',
                pick_bonus: '🎁', super_meter: '📊', lightning_respin: '⚡', mega_symbols: '🔮'
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
                        <div class="game-vol-badge ${volClass}" title="Volatility: ${vol}">
                            ${dotsHtml}
                        </div>
                        <div class="game-hover-overlay">
                            <svg class="game-play-svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="23" fill="rgba(23,145,99,0.9)" stroke="rgba(86,210,160,0.6)" stroke-width="2"/><polygon points="19,14 19,34 35,24" fill="#fff"/></svg>
                            ${metaPills ? `<div class="game-hover-pills">${metaPills}</div>` : ''}
                            ${shortDesc}
                        </div>
                    </div>
                    <div class="game-info">
                        <div class="game-name">${game.name}</div>
                        <div class="game-provider">${game.provider || ''}</div>
                    </div>
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
            // Clear search input when switching filters
            const searchInput = document.getElementById('gameSearchInput');
            if (searchInput) searchInput.value = '';
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
            return list;
        }


        function setProviderFilter(provider) {
            currentProviderFilter = provider;
            document.querySelectorAll('.provider-chip').forEach(chip => {
                chip.classList.toggle('provider-chip-active', chip.dataset.provider === provider);
            });
            renderFilteredGames();
        }


        function renderFilteredGames() {
            const allGamesDiv = document.getElementById('allGames');
            const filtered = getFilteredGames(currentFilter);
            if (currentFilter === 'favorites' && filtered.length === 0) {
                allGamesDiv.innerHTML = `<div class="games-fav-empty"><span class="fav-empty-icon">\u2661</span>Heart your first game to see it here!</div>`;
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
