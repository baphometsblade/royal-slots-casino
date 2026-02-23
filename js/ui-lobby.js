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
            const el = document.getElementById('jackpotAmount');
            if (!el) return;
            setInterval(() => {
                jackpotValue += Math.floor(Math.random() * (JACKPOT_TICKER_INCREMENT_MAX - JACKPOT_TICKER_INCREMENT_MIN + 1) + JACKPOT_TICKER_INCREMENT_MIN);
                el.textContent = jackpotValue.toLocaleString();
            }, JACKPOT_TICKER_INTERVAL);
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
            return `
                <div class="game-card${isHot ? ' game-card-hot' : ''}${isJackpot ? ' game-card-jackpot' : ''}" onclick="openSlot('${game.id}')">
                    <div class="game-thumbnail" style="${thumbStyle}">
                        ${!game.thumbnail && game.asset ? (assetTemplates[game.asset] || '') : ''}
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
                case 'hot':      list = games.filter(g => g.hot); break;
                case 'new':      list = games.filter(g => g.tag === 'NEW'); break;
                case 'jackpot':  list = games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA'); break;
                default:         list = games;
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
            allGamesDiv.innerHTML = filtered.map(g => createGameCard(g)).join('');
            updateFilterCounts();
            // Update the "All Slots" count label
            const countEl = document.getElementById('allGamesCount');
            if (countEl) countEl.textContent = `${filtered.length} game${filtered.length !== 1 ? 's' : ''}`;
        }


        function updateFilterCounts() {
            const counts = {
                all:     games.length,
                hot:     games.filter(g => g.hot).length,
                new:     games.filter(g => g.tag === 'NEW').length,
                jackpot: games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA').length
            };
            document.querySelectorAll('.filter-tab').forEach(tab => {
                const f = tab.dataset.filter;
                let countEl = tab.querySelector('.filter-count');
                if (!countEl) {
                    countEl = document.createElement('span');
                    countEl.className = 'filter-count';
                    tab.appendChild(countEl);
                }
                countEl.textContent = counts[f] ?? '';
            });
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


        function generateTickerMessage() {
            const name = TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)];
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

            // Initial messages
            let messages = [];
            for (let i = 0; i < TICKER_INITIAL_MESSAGE_COUNT; i++) {
                messages.push(generateTickerMessage());
            }
            renderTickerContent(messages);

            tickerInterval = setInterval(() => {
                messages.push(generateTickerMessage());
                if (messages.length > TICKER_MAX_MESSAGES) messages.shift();
                renderTickerContent(messages);
            }, WIN_TICKER_INTERVAL);
        }


        function renderTickerContent(messages) {
            const content = document.getElementById('tickerContent');
            if (!content) return;
            content.innerHTML = messages.map(m =>
                `<span class="ticker-item">${m}</span>`
            ).join('');
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
