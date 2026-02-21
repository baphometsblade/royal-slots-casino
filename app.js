        // Game data loaded from shared/game-definitions.js
        // (60 game definitions moved to separate module)


        // ═══════════════════════════════════════════════════════
        // ═══ LOCAL AUTH SYSTEM (localStorage-based, no server) ═══
        // ═══════════════════════════════════════════════════════
        let authToken = localStorage.getItem('casinoToken');
        let currentUser = null;
        const LOCAL_TOKEN_PREFIX = 'local-';

        // Restore user from localStorage on load
        (function restoreUser() {
            const savedUser = localStorage.getItem('casinoUser');
            if (savedUser) {
                try { currentUser = JSON.parse(savedUser); } catch (e) {}
            }
        })();

        function isServerAuthToken(token = authToken) {
            return typeof token === 'string' && token.length > 0 && !token.startsWith(LOCAL_TOKEN_PREFIX);
        }

        function shouldFallbackToLocalAuth(error) {
            if (!error) return true;
            if (error.isNetworkError) return true;
            if (error.status === 404 || error.status === 405) return true;
            return false;
        }

        function clearAuthSession() {
            authToken = null;
            localStorage.removeItem('casinoToken');
            currentUser = null;
            localStorage.removeItem('casinoUser');
        }

        function applyAuthSession(token, user) {
            authToken = token;
            localStorage.setItem('casinoToken', token);
            currentUser = user ? {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin),
            } : null;
            localStorage.setItem('casinoUser', JSON.stringify(currentUser));

            const userBalance = Number(user?.balance);
            if (Number.isFinite(userBalance)) {
                balance = userBalance;
                updateBalance();
                saveBalance();
            }
        }

        async function apiRequest(path, options = {}) {
            const method = options.method || 'GET';
            const body = options.body;
            const requireAuth = Boolean(options.requireAuth);
            const headers = { Accept: 'application/json' };
            if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
            }
            if (requireAuth && authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }

            let response;
            try {
                response = await fetch(path, {
                    method,
                    headers,
                    body: body !== undefined ? JSON.stringify(body) : undefined
                });
            } catch (error) {
                const networkError = new Error('Could not reach the casino server.');
                networkError.isNetworkError = true;
                networkError.cause = error;
                throw networkError;
            }

            let payload = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }
            } else {
                const text = await response.text();
                if (text) payload = { error: text };
            }

            if (!response.ok) {
                const message = payload?.error || payload?.message || `Request failed (${response.status})`;
                const requestError = new Error(message);
                requestError.status = response.status;
                requestError.payload = payload;
                throw requestError;
            }

            return payload || {};
        }

        async function syncServerSession() {
            if (!isServerAuthToken()) return;

            try {
                const me = await apiRequest('/api/auth/me', { requireAuth: true });
                if (me && me.user) {
                    currentUser = {
                        id: me.user.id,
                        username: me.user.username,
                        email: me.user.email,
                        is_admin: Boolean(me.user.is_admin),
                    };
                    localStorage.setItem('casinoUser', JSON.stringify(currentUser));
                }

                const balanceRes = await apiRequest('/api/balance', { requireAuth: true });
                const serverBalance = Number(balanceRes.balance);
                if (Number.isFinite(serverBalance)) {
                    balance = serverBalance;
                    updateBalance();
                    saveBalance();
                }
            } catch (error) {
                if (error.status === 401 || error.status === 403) {
                    clearAuthSession();
                    updateAuthButton();
                    showToast('Session expired. Please log in again.', 'info');
                } else {
                    console.warn('Unable to sync server session:', error);
                }
            }
        }

        function loginWithLocalFallback(username, password) {
            const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
            const user = users[username.toLowerCase()];
            if (!user) throw new Error('User not found. Please register first.');
            if (user.password !== password) throw new Error('Incorrect password.');

            applyAuthSession(`${LOCAL_TOKEN_PREFIX}${Date.now()}`, {
                username: user.username,
                email: user.email,
                balance,
            });
            return user;
        }

        function registerWithLocalFallback(username, email, password) {
            const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
            const key = username.toLowerCase();
            if (users[key]) throw new Error('Username already taken.');
            if (username.length < 3 || username.length > 20) throw new Error('Username must be 3-20 characters.');
            if (password.length < 6) throw new Error('Password must be at least 6 characters.');

            users[key] = { username, email, password };
            localStorage.setItem('casinoUsers', JSON.stringify(users));
            applyAuthSession(`${LOCAL_TOKEN_PREFIX}${Date.now()}`, {
                username,
                email,
                balance,
            });
        }

        async function login(username, password) {
            let serverError = null;
            try {
                const response = await apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: { username, password },
                    requireAuth: false
                });
                if (!response.token || !response.user) {
                    throw new Error('Invalid login response from server.');
                }
                applyAuthSession(response.token, response.user);
                updateAuthButton();
                hideAuthModal();
                showToast(`Welcome back, ${response.user.username}!`, 'success');
                return;
            } catch (error) {
                serverError = error;
            }

            if (!shouldFallbackToLocalAuth(serverError)) {
                throw serverError;
            }

            const user = loginWithLocalFallback(username, password);
            updateAuthButton();
            hideAuthModal();
            showToast(`Welcome back, ${user.username}!`, 'success');
        }

        async function register(username, email, password) {
            let serverError = null;
            try {
                const response = await apiRequest('/api/auth/register', {
                    method: 'POST',
                    body: { username, email, password },
                    requireAuth: false
                });
                if (!response.token || !response.user) {
                    throw new Error('Invalid registration response from server.');
                }
                applyAuthSession(response.token, response.user);
                updateAuthButton();
                hideAuthModal();
                showToast(`Welcome, ${response.user.username}! Your account has been created.`, 'success');
                return;
            } catch (error) {
                serverError = error;
            }

            if (!shouldFallbackToLocalAuth(serverError)) {
                throw serverError;
            }

            registerWithLocalFallback(username, email, password);
            updateAuthButton();
            hideAuthModal();
            showToast(`Welcome, ${username}! Your account has been created.`, 'success');
        }

        function logout() {
            clearAuthSession();
            updateAuthButton();
            showToast('Logged out successfully.', 'info');
        }

        function updateAuthButton() {
            const btn = document.getElementById('authBtn');
            if (!btn) return;
            if (currentUser) {
                btn.textContent = currentUser.username.toUpperCase();
                btn.title = 'Click to logout';
            } else {
                btn.textContent = 'LOGIN';
                btn.title = 'Click to login';
            }
        }

        function showAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.add('active');
            // Reset to login tab when opening
            if (typeof switchAuthTab === 'function') switchAuthTab('login');
        }

        function hideAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.remove('active');
            // Clear form fields and errors on close
            const errEl = document.getElementById('authError');
            if (errEl) errEl.textContent = '';
            ['loginUsername', 'loginPassword', 'regUsername', 'regEmail', 'regPassword', 'regConfirm'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        }

        // ═══ END LOCAL AUTH SYSTEM ═══

        // Build symbol image HTML for any game symbol
        function getSymbolHtml(symbolName, gameId) {
            return `<img class="reel-symbol-img" src="assets/game_symbols/${gameId}/${symbolName}.png" alt="${symbolName}" draggable="false" onerror="this.style.display='none'">`;
        }

        // Legacy shared asset templates (used only as fallback for old CSS symbols)
        const assetTemplates = {
            diamond: `<img class="reel-symbol-img" src="assets/ui/sym_diamond.png" alt="Diamond" draggable="false">`,
            cherry: `<img class="reel-symbol-img" src="assets/ui/sym_cherry.png" alt="Cherry" draggable="false">`,
            seven: `<img class="reel-symbol-img" src="assets/ui/sym_seven.png" alt="Seven" draggable="false">`,
            crown: `<img class="reel-symbol-img" src="assets/ui/sym_seven.png" alt="Crown" draggable="false">`,
            star: `<img class="reel-symbol-img" src="assets/ui/sym_star.png" alt="Star" draggable="false">`,
            bell: `<img class="reel-symbol-img" src="assets/ui/sym_bell.png" alt="Bell" draggable="false">`,
            coin: `<img class="reel-symbol-img" src="assets/ui/sym_diamond.png" alt="Coin" draggable="false">`,
            bar: `<img class="reel-symbol-img" src="assets/ui/sym_bar.png" alt="BAR" draggable="false">`,
            clover: `<img class="reel-symbol-img" src="assets/ui/sym_star.png" alt="Clover" draggable="false">`,
            watermelon: `<img class="reel-symbol-img" src="assets/ui/sym_watermelon.png" alt="Watermelon" draggable="false">`,
            lemon: `<img class="reel-symbol-img" src="assets/ui/sym_lemon.png" alt="Lemon" draggable="false">`
        };
        // State
        const STORAGE_KEYS = {
            balance: 'casinoBalance',
            stats: 'casinoStats'
        };

        const DEFAULT_BALANCE = 5000;
        const DEFAULT_STATS = {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            gamesPlayed: {},
            achievements: []
        };
        // Legacy global symbols (for QA/forced-spin compatibility)
        const SLOT_SYMBOLS = ['diamond', 'cherry', 'seven', 'crown', 'star', 'bell', 'coin', 'bar', 'clover', 'watermelon'];

        // Get the current game's symbol list
        function getGameSymbols(game) {
            return (game && game.symbols) ? game.symbols : SLOT_SYMBOLS;
        }

        // ═══ Grid Helpers ═══
        function getGridCols(game) { return (game && game.gridCols) || 3; }
        function getGridRows(game) { return (game && game.gridRows) || 1; }
        function getWinType(game) { return (game && game.winType) || 'classic'; }
        function isMultiRow(game) { return getGridRows(game) > 1; }

        // Create empty 2D grid [cols][rows]
        function createEmptyGrid(cols, rows) {
            return Array.from({ length: cols }, () => Array(rows).fill(null));
        }

        // Generate random grid for a game
        function generateRandomGrid(game) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const syms = getGameSymbols(game);
            const grid = createEmptyGrid(cols, rows);
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    grid[c][r] = syms[Math.floor(getRandomNumber() * syms.length)];
                }
            }
            return grid;
        }

        // Flatten grid to 1D array (for backwards compatibility with classic 3-reel)
        function flattenGrid(grid) {
            if (!grid) return [];
            // For classic: just first row across all cols
            return grid.map(col => col[0]);
        }

        // Build grid from 1D symbol array (classic 3-reel compat)
        function gridFrom1D(symbols, game) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            if (rows === 1 || !isMultiRow(game)) {
                // Classic: each symbol = one column, one row
                return symbols.map(s => [s]);
            }
            // Already a grid scenario — shouldn't reach here from 1D
            return symbols.map(s => [s]);
        }

        // Generate spin result as 2D grid
        function generateSpinResult(game, isFreeSpins) {
            if (forcedSpinQueue.length > 0) {
                const forced = [...forcedSpinQueue.shift()];
                const cols = getGridCols(game);
                const rows = getGridRows(game);

                // If forced array matches cols (1D) — fill grid with those symbols
                if (rows > 1) {
                    const grid = createEmptyGrid(cols, rows);
                    for (let c = 0; c < cols; c++) {
                        const sym = forced[c % forced.length];
                        for (let r = 0; r < rows; r++) {
                            grid[c][r] = sym;
                        }
                    }
                    return grid;
                }
                return gridFrom1D(forced, game);
            }
            // Use House Edge engine for weighted grid generation with profit protection
            if (window.HouseEdge) {
                return window.HouseEdge.generateGrid(game, isFreeSpins || false);
            }
            return generateRandomGrid(game);
        }

        // ═══ Reel Strip Constants (inline since constants.js not loaded yet) ═══
        const REEL_STRIP_BUFFER = 12;
        const REEL_SPIN_PX_PER_SEC = 3000;
        const REEL_SPIN_PX_PER_SEC_TURBO = 5000;
        const REEL_DECEL_DURATION = 650;
        const REEL_BOUNCE_OVERSHOOT = 12;
        const REEL_BOUNCE_DURATION = 220;
        const REEL_CELL_DIMS = {
            '3x3': { h: 140, gap: 4 }, '5x3': { h: 100, gap: 3 },
            '5x4': { h: 85, gap: 3 }, '5x5': { h: 80, gap: 2 },
            '6x5': { h: 72, gap: 2 }, '7x7': { h: 58, gap: 2 }
        };
        const SLOT_TEMPLATES = ['classic', 'standard', 'extended', 'scatter', 'grid'];

        // ═══ Reel Strip State ═══
        let reelStripData = []; // Per-column: { stripEl, animFrameId, currentY, cellH, totalH, visibleH }

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

        // Count all symbols in grid (for scatter detection on multi-row)
        function countSymbolInGrid(grid, symbol) {
            let count = 0;
            for (const col of grid) {
                for (const s of col) {
                    if (s === symbol) count++;
                }
            }
            return count;
        }

        // Count wilds in grid
        function countWildsInGrid(grid, game) {
            if (!game || !game.wildSymbol) return 0;
            return countSymbolInGrid(grid, game.wildSymbol);
        }

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

                if (matchCount >= 3) {
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

        function createDefaultStats() {
            return {
                totalSpins: DEFAULT_STATS.totalSpins,
                totalWagered: DEFAULT_STATS.totalWagered,
                totalWon: DEFAULT_STATS.totalWon,
                biggestWin: DEFAULT_STATS.biggestWin,
                gamesPlayed: {},
                achievements: []
            };
        }

        const ACHIEVEMENTS = [
            { id: 'first_spin', name: 'First Spin', desc: 'Make your first spin', icon: '\u{1F3B0}', requirement: (stats) => stats.totalSpins >= 1 },
            { id: 'big_spender', name: 'Big Spender', desc: 'Wager $10,000 total', icon: '\u{1F4B0}', requirement: (stats) => stats.totalWagered >= 10000 },
            { id: 'lucky_7', name: 'Lucky 7', desc: 'Win 7 times', icon: '\u{1F340}', requirement: (stats) => stats.totalWon > stats.totalWagered && Object.values(stats.gamesPlayed).reduce((a,b) => a+b, 0) >= 7 },
            { id: 'high_roller', name: 'High Roller', desc: 'Win $5,000 in one spin', icon: '\u{1F451}', requirement: (stats) => stats.biggestWin >= 5000 },
            { id: 'slot_master', name: 'Slot Master', desc: 'Play 100 spins', icon: '\u2B50', requirement: (stats) => stats.totalSpins >= 100 },
            { id: 'millionaire', name: 'Millionaire', desc: 'Win $50,000 total', icon: '\u{1F48E}', requirement: (stats) => stats.totalWon >= 50000 },
            { id: 'game_explorer', name: 'Game Explorer', desc: 'Play 10 different games', icon: '\u{1F5FA}\uFE0F', requirement: (stats) => Object.keys(stats.gamesPlayed || {}).length >= 10 },
            { id: 'jackpot_hunter', name: 'Jackpot Hunter', desc: 'Win $25,000 in one spin', icon: '\u{1F3AF}', requirement: (stats) => stats.biggestWin >= 25000 }
        ];

        let currentFilter = 'all';
        let balance = DEFAULT_BALANCE;
        let currentGame = null;
        let spinning = false;
        let currentBet = 50;
        let currentReels = ['diamond', 'diamond', 'diamond'];
        // 2D grid: currentGrid[col][row] — outer array = columns (reels), inner = rows
        let currentGrid = null;
        let lastMessage = { type: 'info', text: '' };
        let stats = createDefaultStats();
        // soundEnabled state now managed by sound-manager.js (SoundManager.soundEnabled)
        let deterministicSeed = null;
        let deterministicRng = null;
        let forcedSpinQueue = [];
        let qaToolsOpen = false;

        // ═══ Free Spins / Bonus State ═══
        let freeSpinsActive = false;
        let freeSpinsRemaining = 0;
        let freeSpinsTotalWin = 0;
        let freeSpinsMultiplier = 1;
        let freeSpinsCascadeLevel = 0;
        let freeSpinsExpandedSymbol = null; // For Book of Dead expanding symbol
        let expandingWildRespinsLeft = 0;   // For Starburst expanding wild respin
        let respinCount = 0;                // For Hot Chillies respin feature
        // ── Shared Reel Animation Helpers ──────────────────────────
        const REEL_CELL_ANIMATION_CLASSES = [
            'reel-landing', 'reel-win-glow', 'reel-wild-glow',
            'reel-scatter-glow', 'reel-celebrating', 'reel-mega-win',
            'reel-wild-expand', 'reel-big-win-glow'
        ];

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

        function startReelScrolling(turbo) {
            const speed = turbo ? REEL_SPIN_PX_PER_SEC_TURBO : REEL_SPIN_PX_PER_SEC;
            const game = currentGame;

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

        function formatMoney(amount) {
            return Number(amount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function parseStoredNumber(value, fallback) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        function hashSeed(seedValue) {
            const seedText = String(seedValue ?? '').trim();
            let hash = 2166136261;
            for (let i = 0; i < seedText.length; i++) {
                hash ^= seedText.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return hash >>> 0;
        }

        function createSeededRandom(seedValue) {
            let state = hashSeed(seedValue) || 0x9e3779b9;
            return () => {
                state = (state + 0x6d2b79f5) >>> 0;
                let t = state;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        function setDeterministicSeed(seedValue) {
            if (seedValue === null || seedValue === undefined || String(seedValue).trim() === '') {
                deterministicSeed = null;
                deterministicRng = null;
                return false;
            }

            deterministicSeed = String(seedValue);
            deterministicRng = createSeededRandom(deterministicSeed);
            return true;
        }

        function getRandomNumber() {
            return deterministicRng ? deterministicRng() : Math.random();
        }

        function normalizeSymbol(symbol) {
            const normalized = String(symbol ?? '').trim().toLowerCase();
            // Check game-specific symbols first
            const gameSyms = getGameSymbols(currentGame);
            if (gameSyms.includes(normalized)) return normalized;
            // Fallback to legacy global symbols
            if (SLOT_SYMBOLS.includes(normalized)) return normalized;
            return null;
        }

        function normalizeOutcomeSymbols(input) {
            const parts = Array.isArray(input)
                ? input
                : String(input ?? '')
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean);

            if (parts.length !== 3) return null;
            const normalized = parts.map(normalizeSymbol);
            return normalized.every(Boolean) ? normalized : null;
        }

        function pickDifferentSymbol(excludedSymbols) {
            const excludedSet = new Set((excludedSymbols || []).filter(Boolean));
            const syms = getGameSymbols(currentGame);
            const available = syms.filter((symbol) => !excludedSet.has(symbol));
            if (available.length === 0) return syms[0];
            return available[Math.floor(getRandomNumber() * available.length)];
        }

        function buildForcedOutcome(type, preferredSymbol) {
            const mode = String(type ?? '').trim().toLowerCase();
            const gameSyms = getGameSymbols(currentGame);
            const anchor = normalizeSymbol(preferredSymbol) || gameSyms[0] || getRandomSymbol();

            if (mode === 'triple' || mode === 'jackpot' || mode === 'win3') {
                return [anchor, anchor, anchor];
            }
            if (mode === 'double' || mode === 'win2') {
                return [anchor, anchor, pickDifferentSymbol([anchor])];
            }
            if (mode === 'lose' || mode === 'loss' || mode === 'miss') {
                const second = pickDifferentSymbol([anchor]);
                const third = pickDifferentSymbol([anchor, second]);
                return [anchor, second, third];
            }
            return null;
        }

        function queueForcedSpin(symbolsInput) {
            const outcome = normalizeOutcomeSymbols(symbolsInput);
            if (!outcome) return null;
            forcedSpinQueue.push(outcome);
            return outcome;
        }

        function queueForcedOutcome(type, preferredSymbol) {
            const outcome = buildForcedOutcome(type, preferredSymbol);
            if (!outcome) return null;
            forcedSpinQueue.push(outcome);
            return outcome;
        }

        function consumeSpinResult(isFreeSpins) {
            // Use grid-aware generation with house edge
            return generateSpinResult(currentGame, isFreeSpins || false);
        }

        function applyUrlDebugConfig() {
            const params = new URLSearchParams(window.location.search);

            const seedParam = params.get('spinSeed');
            if (seedParam) {
                setDeterministicSeed(seedParam);
            }

            const forceSpinParam = params.get('forceSpin');
            if (forceSpinParam) {
                queueForcedSpin(forceSpinParam);
            }

            const forceOutcomeParam = params.get('forceOutcome');
            if (forceOutcomeParam) {
                queueForcedOutcome(forceOutcomeParam, params.get('forceSymbol'));
            }

            const qaToolsParam = params.get('qaTools');
            if (qaToolsParam === '1' || qaToolsParam === 'true') {
                setQaToolsExpanded(true);
            }

            const qaResetClearSeedParam = params.get('qaResetClearSeed');
            if (qaResetClearSeedParam === '1' || qaResetClearSeedParam === 'true') {
                const clearSeedToggle = getQaNode('qaResetClearSeed');
                if (clearSeedToggle) {
                    clearSeedToggle.checked = true;
                }
            }

            const openSlotId = params.get('openSlot');
            const openTarget = games.find((game) => game.id === openSlotId);
            if (openTarget) {
                openSlot(openTarget.id);
            }

            const autoSpinValue = params.get('autoSpin');
            if ((autoSpinValue === '1' || autoSpinValue === 'true') && openTarget) {
                const delayParam = Number.parseInt(params.get('autoSpinDelay') || '700', 10);
                const delay = Number.isFinite(delayParam) ? Math.max(0, delayParam) : 700;
                setTimeout(() => {
                    if (currentGame && !spinning) {
                        spin();
                    }
                }, delay);
            }

            refreshQaStateDisplay();
        }

        function getDebugState() {
            return {
                deterministicMode: Boolean(deterministicRng),
                deterministicSeed,
                queuedForcedSpins: forcedSpinQueue.map((symbols) => [...symbols]),
                availableSymbols: [...SLOT_SYMBOLS]
            };
        }

        function getQaNode(id) {
            return document.getElementById(id);
        }

        function setQaStatus(text, type = 'info') {
            const statusEl = getQaNode('qaStatusLine');
            if (!statusEl) return;

            statusEl.textContent = text || '';
            statusEl.className = 'qa-status';

            if (type === 'good') {
                statusEl.classList.add('qa-status-good');
            } else if (type === 'warn') {
                statusEl.classList.add('qa-status-warn');
            } else if (type === 'error') {
                statusEl.classList.add('qa-status-error');
            }
        }

        function setQaToolsExpanded(expanded) {
            qaToolsOpen = Boolean(expanded);
            const bodyEl = getQaNode('qaToolsBody');
            const toggleBtn = getQaNode('qaToggleBtn');

            if (bodyEl) {
                bodyEl.classList.toggle('active', qaToolsOpen);
            }
            if (toggleBtn) {
                toggleBtn.textContent = qaToolsOpen ? 'Hide' : 'Show';
            }
        }

        function refreshQaStateDisplay() {
            const lineEl = getQaNode('qaStateLine');
            if (!lineEl) return;
            const state = getDebugState();
            const seedLabel = state.deterministicMode ? `seed=${state.deterministicSeed}` : 'seed=off';
            lineEl.textContent = `${seedLabel} | queued=${state.queuedForcedSpins.length}`;
        }

        function resetSessionState(options = {}) {
            if (spinning) return false;

            const config = {
                clearDeterministic: false,
                clearQueue: true,
                ...options
            };

            balance = DEFAULT_BALANCE;
            stats = createDefaultStats();
            lastMessage = { type: 'info', text: '' };

            // Clear free spins state
            freeSpinsActive = false;
            freeSpinsRemaining = 0;
            freeSpinsTotalWin = 0;
            freeSpinsMultiplier = 1;
            freeSpinsCascadeLevel = 0;
            freeSpinsExpandedSymbol = null;
            expandingWildRespinsLeft = 0;
            respinCount = 0;
            hideFreeSpinsDisplay();

            if (config.clearQueue) {
                forcedSpinQueue = [];
            }
            if (config.clearDeterministic) {
                setDeterministicSeed(null);
            }

            saveBalance();
            saveStats();
            updateBalance();
            updateStatsSummary();
            renderGames();

            if (currentGame) {
                currentBet = currentGame.minBet;
                // Rebuild grid with initial symbols
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
                refreshBetControls();
            }

            const msgDiv = document.getElementById('messageDisplay');
            if (msgDiv) {
                msgDiv.innerHTML = '';
            }

            const winDiv = document.getElementById('winAnimation');
            if (winDiv) {
                winDiv.innerHTML = '';
            }

            refreshQaStateDisplay();
            return true;
        }

        function refreshQaSymbolList() {
            const symbolSelect = getQaNode('qaOutcomeSymbol');
            if (!symbolSelect) return;
            // Keep first option (placeholder), remove the rest
            while (symbolSelect.options.length > 1) symbolSelect.remove(1);
            const syms = getGameSymbols(currentGame);
            syms.forEach((symbol) => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol;
                symbolSelect.appendChild(option);
            });
        }

        function initQaTools() {
            refreshQaSymbolList();

            const seedInput = getQaNode('qaSeedInput');
            if (seedInput && deterministicSeed) {
                seedInput.value = deterministicSeed;
            }

            setQaToolsExpanded(false);
            refreshQaStateDisplay();
            setQaStatus('');
        }

        function toggleQaTools() {
            setQaToolsExpanded(!qaToolsOpen);
        }

        function applyQaSeed() {
            const seedInput = getQaNode('qaSeedInput');
            if (!seedInput) return;

            const seed = seedInput.value.trim();
            if (!setDeterministicSeed(seed)) {
                setQaStatus('Enter a seed before applying.', 'warn');
                return;
            }

            refreshQaStateDisplay();
            setQaStatus(`Seed applied: ${seed}`, 'good');
        }

        function clearQaSeed() {
            const seedInput = getQaNode('qaSeedInput');
            if (seedInput) {
                seedInput.value = '';
            }
            setDeterministicSeed(null);
            refreshQaStateDisplay();
            setQaStatus('Deterministic seed cleared.', 'good');
        }

        function queueQaOutcome(autoplay) {
            const outcomeSelect = getQaNode('qaOutcomeType');
            const symbolSelect = getQaNode('qaOutcomeSymbol');
            if (!outcomeSelect || !symbolSelect) return;

            const queued = autoplay
                ? queueAndSpin(outcomeSelect.value, symbolSelect.value || undefined)
                : queueForcedOutcome(outcomeSelect.value, symbolSelect.value || undefined);

            if (!queued) {
                setQaStatus('Failed to queue outcome.', 'error');
                return;
            }

            refreshQaStateDisplay();
            setQaStatus(`Queued outcome: ${queued.join(', ')}`, 'good');
        }

        function queueQaExactReels(autoplay) {
            const reelsInput = getQaNode('qaExactReels');
            if (!reelsInput) return;

            const raw = reelsInput.value.trim();
            const queued = autoplay
                ? queueAndSpin(raw)
                : queueForcedSpin(raw);

            if (!queued) {
                setQaStatus('Use exactly three valid symbols, comma-separated.', 'warn');
                return;
            }

            refreshQaStateDisplay();
            setQaStatus(`Queued reels: ${queued.join(', ')}`, 'good');
        }

        function clearQaQueue() {
            forcedSpinQueue = [];
            refreshQaStateDisplay();
            setQaStatus('Forced reel queue cleared.', 'good');
        }

        function resetQaSession() {
            const clearSeedToggle = getQaNode('qaResetClearSeed');
            const clearDeterministic = Boolean(clearSeedToggle?.checked);
            const didReset = resetSessionState({ clearDeterministic, clearQueue: true });
            if (!didReset) {
                setQaStatus('Wait for spin to finish before reset.', 'warn');
                return;
            }
            setQaStatus(
                clearDeterministic
                    ? 'Balance/stats reset. Deterministic seed cleared.'
                    : 'Balance and stats reset to defaults.',
                'good'
            );
        }

        function queueAndSpin(symbolsOrMode, preferredSymbol) {
            if (Array.isArray(symbolsOrMode) || String(symbolsOrMode ?? '').includes(',')) {
                const queued = queueForcedSpin(symbolsOrMode);
                if (!queued) return null;
                if (!spinning && currentGame) spin();
                return queued;
            }

            const queued = queueForcedOutcome(symbolsOrMode, preferredSymbol);
            if (!queued) return null;
            if (!spinning && currentGame) spin();
            return queued;
        }

        // Initialize (base — called by initAllSystems)
        function initBase() {
            loadState();
            renderGames();
            updateBalance();
            updateStatsSummary();
            wireGameHooks();
            updateSoundButton();
            initQaTools();
            applyUrlDebugConfig();
            startJackpotTicker();
        }

        function loadState() {
            const savedBalance = localStorage.getItem('casinoBalance');
            if (savedBalance !== null) balance = parseFloat(savedBalance);

            const savedStats = localStorage.getItem('casinoStats');
            if (savedStats) {
                try {
                    const parsed = JSON.parse(savedStats);
                    stats = { ...createDefaultStats(), ...parsed };
                } catch (e) {
                    stats = createDefaultStats();
                }
            } else {
                stats = createDefaultStats();
            }

        }

        function saveBalance() {
            localStorage.setItem('casinoBalance', balance.toString());
        }

        function saveStats() {
            localStorage.setItem('casinoStats', JSON.stringify(stats));
        }

        function updateStatsSummary() {
            const biggestWinEl = document.getElementById('biggestWin');
            if (biggestWinEl) {
                biggestWinEl.textContent = Math.round(stats.biggestWin).toLocaleString();
            }
            updateStatsModal();
        }

        function updateStatsModal() {
            const totalSpinsEl = document.getElementById('statsTotalSpins');
            if (!totalSpinsEl) return;

            const totalWageredEl = document.getElementById('statsTotalWagered');
            const totalWonEl = document.getElementById('statsTotalWon');
            const biggestWinEl = document.getElementById('statsBiggestWin');
            const netEl = document.getElementById('statsNet');
            const gamesListEl = document.getElementById('statsGamesList');
            const net = stats.totalWon - stats.totalWagered;

            totalSpinsEl.textContent = Math.round(stats.totalSpins).toLocaleString();
            totalWageredEl.textContent = `$${formatMoney(stats.totalWagered)}`;
            totalWonEl.textContent = `$${formatMoney(stats.totalWon)}`;
            biggestWinEl.textContent = `$${formatMoney(stats.biggestWin)}`;
            netEl.textContent = `${net >= 0 ? '+' : '-'}$${formatMoney(Math.abs(net))}`;
            netEl.style.color = net >= 0 ? '#34d399' : '#fca5a5';

            const playedGames = Object.entries(stats.gamesPlayed || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            if (playedGames.length === 0) {
                gamesListEl.innerHTML = '<li class="stats-empty">No games played yet.</li>';
            } else {
                gamesListEl.innerHTML = playedGames
                    .map(([gameId, plays]) => {
                        const game = games.find((item) => item.id === gameId);
                        const gameName = game ? game.name : gameId;
                        return `<li><span>${gameName}</span><strong>${plays} ${plays === 1 ? 'play' : 'plays'}</strong></li>`;
                    })
                    .join('');
            }

            // Update achievements
            updateAchievements();
        }

        function updateAchievements() {
            const achievementsListEl = document.getElementById('achievementsList');
            if (!achievementsListEl) return;

            if (!stats.achievements) {
                stats.achievements = [];
            }

            const html = ACHIEVEMENTS.map(achievement => {
                const isUnlocked = stats.achievements.includes(achievement.id);
                const canUnlock = !isUnlocked && achievement.requirement(stats);

                if (canUnlock) {
                    stats.achievements.push(achievement.id);
                    saveStats();
                    showAchievementNotification(achievement);
                }

                const unlocked = stats.achievements.includes(achievement.id);

                return `
                    <div style="
                        background: ${unlocked ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))' : 'rgba(15, 23, 42, 0.8)'};
                        border: 2px solid ${unlocked ? '#fbbf24' : '#475569'};
                        border-radius: 12px;
                        padding: 12px;
                        text-align: center;
                        opacity: ${unlocked ? '1' : '0.5'};
                        transition: all 0.3s;
                    ">
                        <div style="font-size: 32px; margin-bottom: 6px;">${achievement.icon}</div>
                        <div style="font-size: 11px; font-weight: 700; color: ${unlocked ? '#fbbf24' : '#94a3b8'}; margin-bottom: 4px;">${achievement.name}</div>
                        <div style="font-size: 9px; color: #64748b;">${achievement.desc}</div>
                        ${unlocked ? '<div style="font-size: 10px; color: #10b981; margin-top: 4px; font-weight: 700;">\u2705 UNLOCKED</div>' : ''}
                    </div>
                `;
            }).join('');

            achievementsListEl.innerHTML = html;
        }

        function showAchievementNotification(achievement) {
            playSound('bigwin');

            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #000;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(251,191,36,0.6);
                z-index: 10001;
                font-weight: 900;
                animation: slideInRight 0.5s ease-out;
                max-width: 300px;
            `;
            notification.innerHTML = `
                <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">${achievement.icon}</div>
                <div style="font-size: 14px; margin-bottom: 4px;">\u{1F3C6} ACHIEVEMENT UNLOCKED!</div>
                <div style="font-size: 18px; margin-bottom: 4px;">${achievement.name}</div>
                <div style="font-size: 12px; opacity: 0.8;">${achievement.desc}</div>
            `;

            document.body.appendChild(notification);

            createConfetti();

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-out';
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }

        function openStatsModal() {
            updateStatsModal();
            refreshQaStateDisplay();
            document.getElementById('statsModal').classList.add('active');
        }

        function closeStatsModal() {
            document.getElementById('statsModal').classList.remove('active');
        }

        // ═══════════════════════════════════════════════════════
        // SETTINGS PANEL
        // ═══════════════════════════════════════════════════════
        const settingsDefaults = {
            soundEnabled: true,
            volume: 50,
            particles: true,
            animations: true,
            confetti: true,
            turboDefault: false,
            autoSpinSpeed: 1500
        };

        function loadSettings() {
            const saved = localStorage.getItem('casinoSettings');
            if (saved) {
                try { return Object.assign({}, settingsDefaults, JSON.parse(saved)); }
                catch (e) { return { ...settingsDefaults }; }
            }
            return { ...settingsDefaults };
        }

        let appSettings = loadSettings();
        window.appSettings = appSettings;  // Expose for animations.js

        function saveSettings() {
            localStorage.setItem('casinoSettings', JSON.stringify(appSettings));
        }

        function openSettingsModal() {
            // Sync UI with current settings
            const modal = document.getElementById('settingsModal');
            document.getElementById('settingSoundEnabled').checked = typeof SoundManager !== 'undefined' ? SoundManager.soundEnabled : appSettings.soundEnabled;
            document.getElementById('settingVolume').value = typeof SoundManager !== 'undefined' ? Math.round(SoundManager.soundVolume * 100) : appSettings.volume;
            document.getElementById('settingVolumeLabel').textContent = (typeof SoundManager !== 'undefined' ? Math.round(SoundManager.soundVolume * 100) : appSettings.volume) + '%';
            document.getElementById('settingParticles').checked = appSettings.particles;
            document.getElementById('settingAnimations').checked = appSettings.animations;
            document.getElementById('settingConfetti').checked = appSettings.confetti;
            document.getElementById('settingTurbo').checked = appSettings.turboDefault;
            document.getElementById('settingAutoSpeed').value = appSettings.autoSpinSpeed;
            document.getElementById('settingAutoSpeedLabel').textContent = (appSettings.autoSpinSpeed / 1000).toFixed(1) + 's';
            modal.classList.add('active');
            playSound('click');
        }

        function closeSettingsModal() {
            document.getElementById('settingsModal').classList.remove('active');
        }

        function settingsToggleSound(enabled) {
            appSettings.soundEnabled = enabled;
            if (typeof SoundManager !== 'undefined') {
                SoundManager.setSoundEnabled(enabled);
            }
            saveSettings();
        }

        function settingsSetVolume(val) {
            const v = parseInt(val, 10);
            appSettings.volume = v;
            document.getElementById('settingVolumeLabel').textContent = v + '%';
            if (typeof setSoundVolume === 'function') {
                setSoundVolume(v / 100);
            }
            saveSettings();
        }

        function settingsToggleParticles(enabled) {
            appSettings.particles = enabled;
            saveSettings();
        }

        function settingsToggleAnimations(enabled) {
            appSettings.animations = enabled;
            saveSettings();
        }

        function settingsToggleConfetti(enabled) {
            appSettings.confetti = enabled;
            saveSettings();
        }

        function settingsToggleTurbo(enabled) {
            appSettings.turboDefault = enabled;
            saveSettings();
        }

        function settingsSetAutoSpeed(val) {
            const v = parseInt(val, 10);
            appSettings.autoSpinSpeed = v;
            document.getElementById('settingAutoSpeedLabel').textContent = (v / 1000).toFixed(1) + 's';
            saveSettings();
        }

        function settingsResetAll() {
            appSettings = { ...settingsDefaults };
            window.appSettings = appSettings;
            saveSettings();
            if (typeof SoundManager !== 'undefined') {
                SoundManager.setSoundEnabled(true);
                setSoundVolume(0.5);
            }
            // Refresh the panel UI
            openSettingsModal();
            if (typeof showToast === 'function') showToast('Settings reset to defaults', 'info');
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

        // ═══════════════════════════════════════════════════════
        // KEYBOARD SHORTCUTS
        // ═══════════════════════════════════════════════════════

        document.addEventListener('keydown', function (e) {
            // Don't trigger if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const slotModal = document.getElementById('slotModal');
            const slotOpen = slotModal && slotModal.classList.contains('active');

            switch (e.code) {
                case 'Space':
                case 'Enter':
                    if (slotOpen && !spinning) {
                        e.preventDefault();
                        spin();
                    }
                    break;
                case 'Escape':
                    // Close topmost modal
                    const paytable = document.getElementById('paytablePanel');
                    if (paytable && paytable.classList.contains('active')) {
                        togglePaytable();
                    } else if (document.getElementById('settingsModal').classList.contains('active')) {
                        closeSettingsModal();
                    } else if (document.getElementById('statsModal').classList.contains('active')) {
                        closeStatsModal();
                    } else if (slotOpen) {
                        closeSlot();
                    }
                    break;
                case 'KeyT':
                    if (slotOpen) {
                        e.preventDefault();
                        toggleTurbo();
                    }
                    break;
                case 'KeyA':
                    if (slotOpen) {
                        e.preventDefault();
                        toggleAutoSpin(10);
                    }
                    break;
                case 'KeyI':
                    if (slotOpen) {
                        e.preventDefault();
                        togglePaytable();
                    }
                    break;
            }
        });

        // ═══════════════════════════════════════════════════════
        // SCREEN SHAKE ON BIG WINS
        // ═══════════════════════════════════════════════════════

        function triggerScreenShake(intensity) {
            const reelArea = document.querySelector('.slot-reel-area');
            if (!reelArea || !_animSettingEnabled('animations')) return;

            if (intensity === 'mega') {
                reelArea.classList.add('big-win-pulse');
                document.querySelector('.slot-modal-fullscreen').classList.add('screen-shake');
                setTimeout(() => {
                    reelArea.classList.remove('big-win-pulse');
                    document.querySelector('.slot-modal-fullscreen').classList.remove('screen-shake');
                }, 1200);
            } else if (intensity === 'big') {
                reelArea.classList.add('big-win-pulse');
                setTimeout(() => reelArea.classList.remove('big-win-pulse'), 600);
            }
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

        function updateBalance() {
            document.getElementById('balance').textContent = formatMoney(balance);
            const slotBal = document.getElementById('slotBalance');
            if (slotBal) slotBal.textContent = formatMoney(balance);
            refreshBetControls();
        }

        function getBetBounds() {
            if (!currentGame) return null;
            const minBet = currentGame.minBet;
            const cappedMax = Math.min(currentGame.maxBet, balance);
            const snappedMax = Math.floor(cappedMax / minBet) * minBet;
            const maxBet = Math.max(minBet, snappedMax || 0);
            return { minBet, maxBet };
        }

        function refreshBetControls() {
            if (!currentGame) return;

            const betRange = document.getElementById('betRange');
            const bounds = getBetBounds();
            if (!betRange || !bounds) return;

            betRange.min = bounds.minBet;
            betRange.max = bounds.maxBet;
            betRange.step = currentGame.minBet;

            if (currentBet < bounds.minBet) currentBet = bounds.minBet;
            if (currentBet > bounds.maxBet) currentBet = bounds.maxBet;

            betRange.value = currentBet;
            document.getElementById('minBet').textContent = currentGame.minBet;
            document.getElementById('maxBet').textContent = currentGame.maxBet;
            updateBetDisplay();

            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.disabled = spinning || currentBet > balance;
            }
        }

        function addFunds() {
            document.getElementById('depositModal').classList.add('active');
        }

        async function confirmDeposit(amount) {
            balance += amount;
            updateBalance();
            saveBalance();
            closeDepositModal();
            showToast(`$${amount.toLocaleString()} deposited!`, 'success');
            playSound('win');
        }

        function closeDepositModal() {
            document.getElementById('depositModal').classList.remove('active');
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

        // ===== Recently Played =====
        const RECENTLY_PLAYED_KEY = 'casinoRecentlyPlayed';
        const MAX_RECENTLY_PLAYED = 10;

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

        // ===== Jackpot Ticker =====
        let jackpotValue = 1247836 + Math.floor(Math.random() * 50000);

        function startJackpotTicker() {
            const el = document.getElementById('jackpotAmount');
            if (!el) return;
            setInterval(() => {
                jackpotValue += Math.floor(Math.random() * 47 + 3);
                el.textContent = jackpotValue.toLocaleString();
            }, 800);
        }

        function createGameCard(game) {
            const thumbStyle = game.thumbnail
                ? `background-image: url('${game.thumbnail}'); background-size: cover; background-position: center;`
                : `background: ${game.bgGradient};`;
            const isJackpot = game.tag === 'JACKPOT' || game.tagClass === 'tag-jackpot';
            // Non-jackpot tags go top-right; jackpot gets its own bottom badge
            const topTag = (!isJackpot && game.tag)
                ? `<div class="game-tag ${game.tagClass}">${game.tag}</div>`
                : '';
            const jackpotBadge = isJackpot
                ? `<div class="game-jackpot-badge"><svg viewBox="0 0 12 12" fill="currentColor" width="9" height="9" style="margin-right:3px"><path d="M6 1l1 2.5h2.5l-2 1.5.8 2.5L6 6.2l-2.3 1.3.8-2.5-2-1.5H5z"/></svg>JACKPOT</div>`
                : '';
            return `
                <div class="game-card" onclick="openSlot('${game.id}')">
                    <div class="game-thumbnail" style="${thumbStyle}">
                        ${!game.thumbnail && game.asset ? (assetTemplates[game.asset] || '') : ''}
                        ${topTag}
                        ${jackpotBadge}
                        <div class="game-hover-overlay">
                            <svg class="game-play-svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="23" fill="rgba(23,145,99,0.9)" stroke="rgba(86,210,160,0.6)" stroke-width="2"/><polygon points="19,14 19,34 35,24" fill="#fff"/></svg>
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

        // ═══════════════════════════════════════════════════════
        // ═══ Feature Popup System (Game Intro Screen) ═════════
        // ═══════════════════════════════════════════════════════

        // Feature info descriptions keyed by bonusType
        const featureInfo = {
            tumble: { icon: '💎', title: 'Tumbling Reels', desc: 'Winning symbols cascade away for consecutive wins!' },
            avalanche: { icon: '🪨', title: 'Avalanche Reels', desc: 'Winning symbols shatter and new ones fall into place!' },
            random_multiplier: { icon: '✨', title: 'Random Multipliers', desc: 'Multiplier symbols appear randomly to boost your wins!' },
            zeus_multiplier: { icon: '⚡', title: 'Divine Multipliers', desc: 'God-like multipliers rain down for legendary payouts!' },
            money_collect: { icon: '💰', title: 'Money Collect', desc: 'Wild symbol collects all coin values on the reels!' },
            respin: { icon: '🔄', title: 'Respin Feature', desc: 'Matching pairs lock and remaining reels respin!' },
            stacked_wilds: { icon: '🔥', title: 'Stacked Wilds', desc: 'Wild symbols stack to fill entire reels!' },
            hold_and_win: { icon: '🎯', title: 'Hold & Win', desc: 'Lock coins in place and respin for jackpot prizes!' },
            fisherman_collect: { icon: '🎣', title: 'Fisherman Collect', desc: 'Wild fisherman collects all cash fish values!' },
            wheel_multiplier: { icon: '🎡', title: 'Wheel of Fortune', desc: 'Trigger the bonus wheel for massive multipliers!' },
            expanding_symbol: { icon: '📖', title: 'Expanding Symbol', desc: 'A chosen symbol expands to fill entire reels in free spins!' },
            expanding_wild_respin: { icon: '🌟', title: 'Expanding Wilds', desc: 'Wild symbols expand across the entire reel and trigger respins!' },
            sticky_wilds: { icon: '🍯', title: 'Sticky Wilds', desc: 'Wilds stick in place for multiple spins!' },
            progressive: { icon: '🏆', title: 'Progressive Jackpot', desc: 'Every spin feeds the growing jackpot prize pool!' },
            mystery_symbols: { icon: '❓', title: 'Mystery Symbols', desc: 'Mystery symbols reveal matching icons for big combos!' },
            cascading: { icon: '🌊', title: 'Cascading Wins', desc: 'Wins cascade into more wins with increasing multipliers!' },
            nudge: { icon: '👆', title: 'Nudge Feature', desc: 'Reels nudge into winning positions for extra chances!' },
            trail_bonus: { icon: '🗺️', title: 'Trail Bonus', desc: 'Advance along the trail to collect bigger prizes!' },
            pick_bonus: { icon: '🎁', title: 'Pick Bonus', desc: 'Pick hidden prizes for instant rewards!' },
            super_meter: { icon: '📊', title: 'Super Meter Mode', desc: 'Activate super mode for enhanced payouts!' },
            lightning_respin: { icon: '⚡', title: 'Lightning Respins', desc: 'Lightning strikes lock high-value symbols in place!' },
            mega_symbols: { icon: '🔮', title: 'Mega Symbols', desc: 'Giant symbols cover multiple positions for colossal wins!' }
        };

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
            document.getElementById('featurePopupProvider').textContent = game.provider || 'Royal Games';

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

        function openSlot(gameId) {
            currentGame = games.find(g => g.id === gameId);
            if (!currentGame) return;

            addRecentlyPlayed(gameId);

            // Set game-specific CSS theme
            document.getElementById('slotModal').setAttribute('data-game-id', currentGame.id);

            // Apply slot UI template
            const modal = document.getElementById('slotModal');
            SLOT_TEMPLATES.forEach(t => modal.classList.remove(`slot-template-${t}`));
            const tmpl = getGameTemplate(currentGame);
            modal.classList.add(`slot-template-${tmpl}`);

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
            // Set game background on reel area (prefer SDXL image, fallback to gradient)
            const reelArea = document.querySelector('.slot-reel-area');
            if (reelArea) {
                const bgImagePath = `assets/backgrounds/slots/${currentGame.id}_bg.png`;
                // Try loading the SDXL background image
                const testImg = new Image();
                testImg.onload = () => {
                    reelArea.style.background = `url('${bgImagePath}') center/cover no-repeat`;
                    reelArea.classList.add('has-bg-image');
                };
                testImg.onerror = () => {
                    // Fallback to CSS gradient
                    if (currentGame.bgGradient) {
                        reelArea.style.background = currentGame.bgGradient;
                    }
                    reelArea.classList.remove('has-bg-image');
                };
                testImg.src = bgImagePath;
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
                document.getElementById('messageDisplay').innerHTML = '';
                document.getElementById('winAnimation').innerHTML = '';
                updateSlotWinDisplay(0);
                refreshQaSymbolList();
                lastMessage = { type: 'info', text: '' };

                // Show feature popup (once per game per session)
                if (currentGame) {
                    showFeaturePopup(currentGame);
                }
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
            // Close paytable if open
            const paytable = document.getElementById('paytablePanel');
            if (paytable) paytable.classList.remove('active');
            // Immediately hide feature popup if still visible
            const featurePopup = document.getElementById('slotFeaturePopup');
            if (featurePopup) { featurePopup.style.display = 'none'; featurePopup.classList.remove('dismissing'); }
            document.getElementById('slotModal').classList.remove('active');
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
        }

        function updateBetDisplay() {
            document.getElementById('betAmount').textContent = currentBet;
        }

        document.getElementById('betRange').addEventListener('input', (e) => {
            currentBet = parseInt(e.target.value, 10);
            updateBetDisplay();
        });

        function setPresetBet(index) {
            if (!currentGame) return;
            const bounds = getBetBounds();
            if (!bounds) return;

            const midpoint = bounds.minBet + Math.floor((bounds.maxBet - bounds.minBet) / (2 * currentGame.minBet)) * currentGame.minBet;
            const presets = [bounds.minBet, Math.max(bounds.minBet, midpoint), bounds.maxBet];
            currentBet = presets[index] ?? bounds.minBet;
            document.getElementById('betRange').value = currentBet;
            updateBetDisplay();
        }

        // ═══ Pragmatic Play-style bet adjustment (+/- buttons) ═══
        function adjustBet(direction) {
            if (!currentGame || spinning) return;
            const bounds = getBetBounds();
            if (!bounds) return;
            const step = currentGame.minBet;
            const newBet = currentBet + direction * step;
            if (newBet >= bounds.minBet && newBet <= bounds.maxBet) {
                currentBet = newBet;
                document.getElementById('betRange').value = currentBet;
                updateBetDisplay();
            }
        }

        // ═══ Turbo spin mode ═══
        let turboMode = false;
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
            if (amount > 0) {
                el.textContent = '$' + formatMoney(amount);
                el.style.color = '#10b981';
                el.style.textShadow = '0 0 12px rgba(16,185,129,0.6)';
            } else {
                el.textContent = '$0.00';
                el.style.color = '#64748b';
                el.style.textShadow = 'none';
            }
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

            // Reset per-spin bonus state
            respinCount = 0;
            expandingWildRespinsLeft = 0;

            playSound('spin');
            spinning = true;
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
                    animateReelStop(colIdx, finalGrid[colIdx], null, cols, finalGrid, spinGame, () => {
                        if (serverResult) {
                            displayServerWinResult(serverResult, spinGame);
                        } else {
                            checkWin(flattenGrid(finalGrid), spinGame);
                        }
                        spinning = false;
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
        function displayServerWinResult(result, game) {
            const grid = result.grid;
            const winAmount = result.winAmount;
            const details = result.winDetails || {};

            // Clear highlights
            getAllCells().forEach(cell => {
                cell.classList.remove('reel-win-glow', 'reel-wild-glow', 'reel-scatter-glow', 'reel-wild-expand');
            });

            // Highlight wilds and scatters
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

            if (winAmount > 0) {
                const serverBalance = Number(result.balance);
                if (Number.isFinite(serverBalance)) {
                    balance = serverBalance;
                }
                updateBalance();
                saveBalance();
                showWinAnimation(winAmount); upgradeWinGlow(winAmount);
                updateSlotWinDisplay(winAmount);

                const message = details.message || `WIN! $${winAmount.toLocaleString()}!`;
                if (winAmount >= currentBet * 20) {
                    playSound('bigwin');
                } else {
                    playSound('win');
                }
                showMessage(message, 'win');

                stats.totalWon += winAmount;
                if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                saveStats();
                updateStatsSummary();

                if (typeof awardXP === 'function') awardXP(winAmount >= currentBet * 10 ? 25 : 10);

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }
            } else {
                showMessage(details.message || 'No win. Try again.', 'lose');
            }
            if (typeof awardXP === 'function') awardXP(5);
        }

        function getRandomSymbol() {
            const syms = getGameSymbols(currentGame);
            return syms[Math.floor(getRandomNumber() * syms.length)];
        }

        // ═══ Wild Symbol Helpers ═══
        function isWild(symbol, game) {
            return game && game.wildSymbol && symbol === game.wildSymbol;
        }

        function isScatter(symbol, game) {
            return game && game.scatterSymbol && symbol === game.scatterSymbol;
        }

        function countScatters(symbols, game) {
            if (!game || !game.scatterSymbol) return 0;
            return symbols.filter(s => s === game.scatterSymbol).length;
        }

        function countWilds(symbols, game) {
            if (!game || !game.wildSymbol) return 0;
            return symbols.filter(s => s === game.wildSymbol).length;
        }

        // Check if symbols match accounting for wild substitution
        function symbolsMatchWithWild(a, b, game) {
            if (a === b) return true;
            if (isWild(a, game) || isWild(b, game)) return true;
            return false;
        }

        // Get the "effective" matching symbol from a set (ignoring wilds)
        function getEffectiveSymbol(symbols, game) {
            for (const s of symbols) {
                if (!isWild(s, game)) return s;
            }
            return symbols[0]; // all wilds
        }

        // Check for triple match with wild support
        function isTripleMatch(symbols, game) {
            return symbolsMatchWithWild(symbols[0], symbols[1], game) &&
                   symbolsMatchWithWild(symbols[1], symbols[2], game) &&
                   symbolsMatchWithWild(symbols[0], symbols[2], game);
        }

        // Check for double match with wild support, returns matching pair indices
        function getDoubleMatch(symbols, game) {
            if (symbolsMatchWithWild(symbols[0], symbols[1], game)) return [0, 1];
            if (symbolsMatchWithWild(symbols[1], symbols[2], game)) return [1, 2];
            if (symbolsMatchWithWild(symbols[0], symbols[2], game)) return [0, 2];
            return null;
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

            return { amount: Math.round(baseWin * multiplier), multiplier, bonusText };
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
                            if (cell) cell.classList.add('reel-win-glow');
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
                        if (cell) cell.classList.add('reel-win-glow');
                    });

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
                    getAllCells().forEach(cell => cell.classList.add('reel-win-glow'));

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
                            if (cell) cell.classList.add('reel-win-glow');
                        });
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
            const scatterThreshold = isMultiRow(game) ? 3 : 2; // Multi-row needs 3+ scatters
            const fullScatterThreshold = isMultiRow(game) ? 4 : 3;

            if (scatterCount >= scatterThreshold && !freeSpinsActive && game.freeSpinsCount > 0) {
                // Realistic scatter pay: 0.5x per scatter (real slots: 0.5x-1x)
                const scatterPayMult = window.HouseEdge ? window.HouseEdge.getScatterPay(scatterCount) : scatterCount * 0.5;
                const scatterWin = currentBet * scatterPayMult;
                winAmount += scatterWin;

                if (scatterCount >= fullScatterThreshold) {
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
            const MAX_FREE_SPINS = 50;
            if (scatterCount >= scatterThreshold && freeSpinsActive && game.freeSpinsRetrigger && freeSpinsRemaining < MAX_FREE_SPINS) {
                const extraSpins = scatterCount >= fullScatterThreshold ? game.freeSpinsCount : Math.max(2, Math.floor(game.freeSpinsCount / 3));
                const capped = Math.min(extraSpins, MAX_FREE_SPINS - freeSpinsRemaining);
                if (capped > 0) {
                    freeSpinsRemaining += capped;
                    message += ` +${capped} EXTRA FREE SPINS!`;
                    updateFreeSpinsDisplay();
                    showBonusEffect(`+${capped} FREE SPINS!`, '#fbbf24');
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
                const xpBonus = isBigWin ? 25 : 10;
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
            } else {
                // Still record the loss for tracking
                if (window.HouseEdge && winAmount === 0) {
                    // Already recorded above
                }
                showMessage(message, 'lose');
            }
            if (typeof awardXP === 'function') awardXP(5);

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
            if (multiplier >= 50) {
                winTier = 'EPIC WIN';
                tierClass = 'win-tier-epic';
            } else if (multiplier >= 20) {
                winTier = 'MEGA WIN';
                tierClass = 'win-tier-mega';
            } else if (multiplier >= 10) {
                winTier = 'BIG WIN';
                tierClass = 'win-tier-big';
            } else if (multiplier >= 5) {
                winTier = 'GREAT WIN';
                tierClass = 'win-tier-great';
            }

            if (winTier) {
                // Pragmatic Play style full-screen big win overlay
                winDiv.innerHTML = `
                    <div class="pp-win-overlay ${tierClass}">
                        <div class="pp-win-burst"></div>
                        <div class="pp-win-content">
                            <div class="pp-win-tier">${winTier}</div>
                            <div class="pp-win-amount">$${amount.toLocaleString()}</div>
                            <div class="pp-win-multiplier">${multiplier.toFixed(1)}x</div>
                        </div>
                    </div>`;
                createConfetti();
                // Trigger screen shake + particle cascade for big wins
                if (multiplier >= 5) {
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
                        const ra2 = document.querySelector('.slot-reel-area');
                        if (ra2) ra2.classList.remove('spinning-active');
                        spinBtn.disabled = false;
                        spinBtn.textContent = freeSpinsActive ? `FREE SPIN (${freeSpinsRemaining})` : 'SPIN NOW!';
                        refreshQaStateDisplay();
                    });
                }, delay);
            });

            playSound('spin');
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
            let overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'freeSpinsOverlay';
                overlay.className = 'free-spins-overlay';
                document.querySelector('.slot-body')?.appendChild(overlay);
            }

            const bonusName = game.bonusDesc ? game.bonusDesc.split(':')[0] : 'FREE SPINS';
            overlay.innerHTML = `
                <div class="free-spins-intro" style="border-color: ${game.accentColor}">
                    <div class="fs-intro-title" style="color: ${game.accentColor}">${bonusName}</div>
                    <div class="fs-intro-count">${count} FREE SPINS</div>
                    <div class="fs-intro-desc">${game.bonusDesc || ''}</div>
                </div>
            `;
            overlay.classList.add('active');

            // Auto-dismiss after 2.5s and start first free spin
            setTimeout(() => {
                overlay.classList.remove('active');
                showFreeSpinsHUD(game);
                // Start first free spin
                setTimeout(() => {
                    if (freeSpinsActive && currentGame && !spinning) {
                        freeSpinSpin(game);
                    }
                }, 500);
            }, 2500);
        }

        function showFreeSpinsHUD(game) {
            let hud = document.getElementById('freeSpinsHUD');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'freeSpinsHUD';
                hud.className = 'free-spins-hud';
                document.querySelector('.slot-body')?.prepend(hud);
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
                document.querySelector('.slot-body')?.appendChild(overlay);
            }

            overlay.innerHTML = `
                <div class="free-spins-intro fs-summary" style="border-color: ${game.accentColor}">
                    <div class="fs-intro-title" style="color: ${game.accentColor}">FREE SPINS COMPLETE!</div>
                    <div class="fs-summary-total">$${totalWin.toLocaleString()}</div>
                    <div class="fs-intro-desc">Total bonus winnings added to your balance</div>
                </div>
            `;
            overlay.classList.add('active');

            if (totalWin > 0) {
                createConfetti();
                playSound('bigwin');
            }

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 3500);
        }

        // showBonusEffect() and showPageTransition() moved to animations.js

        // Sound system (toggleSound, getAudioContext, playSound, updateSoundButton)
        // moved to sound-manager.js

        function renderGameToText() {
            const slotModalOpen = document.getElementById('slotModal').classList.contains('active');
            const statsModalOpen = document.getElementById('statsModal').classList.contains('active');

            const payload = {
                coordinateSystem: 'DOM viewport pixels; origin is top-left; +x right, +y down.',
                mode: slotModalOpen ? 'slot' : (statsModalOpen ? 'stats' : 'lobby'),
                balance: Number(balance.toFixed(2)),
                spinning,
                currentBet,
                currentGame: currentGame
                    ? {
                        id: currentGame.id,
                        name: currentGame.name,
                        minBet: currentGame.minBet,
                        maxBet: currentGame.maxBet,
                        gridCols: getGridCols(currentGame),
                        gridRows: getGridRows(currentGame),
                        winType: getWinType(currentGame),
                        payoutTriple: currentGame.payouts.triple,
                        payoutDouble: currentGame.payouts.double
                    }
                    : null,
                reels: [...currentReels],
                grid: currentGrid,
                message: lastMessage,
                freeSpins: {
                    active: freeSpinsActive,
                    remaining: freeSpinsRemaining,
                    totalWin: freeSpinsTotalWin,
                    multiplier: freeSpinsMultiplier,
                    cascadeLevel: freeSpinsCascadeLevel,
                    expandedSymbol: freeSpinsExpandedSymbol
                },
                xp: { level: playerLevel, xp: playerXP, tier: getTier(playerLevel).name },
                debug: getDebugState(),
                stats: {
                    totalSpins: stats.totalSpins,
                    totalWagered: Number(stats.totalWagered.toFixed(2)),
                    totalWon: Number(stats.totalWon.toFixed(2)),
                    biggestWin: Number(stats.biggestWin.toFixed(2)),
                    gamesPlayed: stats.gamesPlayed
                }
            };

            return JSON.stringify(payload);
        }

        function wireGameHooks() {
            window.render_game_to_text = renderGameToText;
            window.advanceTime = (ms) => new Promise((resolve) => {
                setTimeout(resolve, Math.max(0, ms));
            });
            window.casinoDebug = {
                setSpinSeed: (seedValue) => {
                    const applied = setDeterministicSeed(seedValue);
                    refreshQaStateDisplay();
                    return applied;
                },
                clearSpinSeed: () => {
                    const cleared = setDeterministicSeed(null);
                    refreshQaStateDisplay();
                    return cleared;
                },
                queueForcedSpin: (symbolsInput) => {
                    const queued = queueForcedSpin(symbolsInput);
                    refreshQaStateDisplay();
                    return queued;
                },
                queueOutcome: (type, preferredSymbol) => {
                    const queued = queueForcedOutcome(type, preferredSymbol);
                    refreshQaStateDisplay();
                    return queued;
                },
                forceNextSpinAndPlay: (symbolsOrMode, preferredSymbol) => {
                    const queued = queueAndSpin(symbolsOrMode, preferredSymbol);
                    refreshQaStateDisplay();
                    return queued;
                },
                clearForcedSpins: () => {
                    forcedSpinQueue = [];
                    refreshQaStateDisplay();
                },
                resetSessionState: (clearDeterministic = false) => resetSessionState({ clearDeterministic: Boolean(clearDeterministic), clearQueue: true }),
                getState: () => getDebugState()
            };
        }

        async function toggleFullscreen() {
            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                } else {
                    await document.documentElement.requestFullscreen();
                }
            } catch (error) {
                console.warn('Fullscreen toggle failed.', error);
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't intercept keys when typing in inputs/textareas/selects
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const key = e.key.toLowerCase();
            if (key === 'f') {
                e.preventDefault();
                toggleFullscreen();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('authModal').classList.contains('active')) {
                hideAuthModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('statsModal').classList.contains('active')) {
                closeStatsModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('slotModal').classList.contains('active')) {
                closeSlot();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('depositModal').classList.contains('active')) {
                closeDepositModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('dailyBonusModal').classList.contains('active')) {
                closeDailyBonusModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('bonusWheelModal').classList.contains('active')) {
                closeBonusWheelModal();
            }
        });

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
            switch (filter) {
                case 'hot':      return games.filter(g => g.hot);
                case 'new':      return games.filter(g => g.tag === 'NEW');
                case 'jackpot':  return games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA');
                default:         return games;
            }
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

        // ===== XP / Level System =====
        const XP_TIERS = [
            { name: 'BRONZE', color: '#cd7f32', minLevel: 1 },
            { name: 'SILVER', color: '#c0c0c0', minLevel: 5 },
            { name: 'GOLD', color: '#ffd700', minLevel: 10 },
            { name: 'PLATINUM', color: '#e5e4e2', minLevel: 20 },
            { name: 'DIAMOND', color: '#b9f2ff', minLevel: 35 },
            { name: 'LEGEND', color: '#ff4500', minLevel: 50 }
        ];

        const XP_STORAGE_KEY = 'casinoXP';

        let playerXP = 0;
        let playerLevel = 1;

        function getXPForLevel(level) {
            return Math.floor(100 * Math.pow(1.25, level - 1));
        }

        function getTier(level) {
            let tier = XP_TIERS[0];
            for (const t of XP_TIERS) {
                if (level >= t.minLevel) tier = t;
            }
            return tier;
        }

        function loadXP() {
            const saved = localStorage.getItem(XP_STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    playerXP = parseStoredNumber(data.xp, 0);
                    playerLevel = parseStoredNumber(data.level, 1);
                    if (playerLevel < 1) playerLevel = 1;
                } catch { playerXP = 0; playerLevel = 1; }
            }
        }

        function saveXP() {
            localStorage.setItem(XP_STORAGE_KEY, JSON.stringify({ xp: playerXP, level: playerLevel }));
        }

        function awardXP(amount) {
            playerXP += amount;
            let levelledUp = false;
            let needed = getXPForLevel(playerLevel);
            while (playerXP >= needed) {
                playerXP -= needed;
                playerLevel++;
                levelledUp = true;
                needed = getXPForLevel(playerLevel);
            }
            saveXP();
            updateXPDisplay();
            if (levelledUp) {
                showToast(`Level Up! You are now Level ${playerLevel}!`, 'levelup');
            }
        }

        function updateXPDisplay() {
            const tier = getTier(playerLevel);
            const needed = getXPForLevel(playerLevel);
            const pct = Math.min(100, (playerXP / needed) * 100);

            const badge = document.getElementById('levelBadge');
            const tierLabel = document.getElementById('tierLabel');
            const fill = document.getElementById('xpBarFill');
            const text = document.getElementById('xpBarText');

            if (badge) {
                badge.textContent = playerLevel;
                badge.style.borderColor = tier.color;
            }
            if (tierLabel) {
                tierLabel.textContent = tier.name;
                tierLabel.style.color = tier.color;
            }
            if (fill) fill.style.width = pct + '%';
            if (text) text.textContent = `${playerXP} / ${needed} XP`;
        }

        // ===== Toast System =====
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 400);
            }, 3500);
        }

        // ===== Daily Bonus System =====
        const DAILY_BONUS_KEY = 'casinoDailyBonus';
        const DAILY_REWARDS = [
            { amount: 500, xp: 25 },
            { amount: 750, xp: 35 },
            { amount: 1000, xp: 50 },
            { amount: 1500, xp: 75 },
            { amount: 2000, xp: 100 },
            { amount: 3000, xp: 150 },
            { amount: 5000, xp: 250 }
        ];

        let dailyBonusState = { streak: 0, lastClaim: null, claimedToday: false };

        function loadDailyBonus() {
            const saved = localStorage.getItem(DAILY_BONUS_KEY);
            if (saved) {
                try {
                    dailyBonusState = JSON.parse(saved);
                } catch { dailyBonusState = { streak: 0, lastClaim: null, claimedToday: false }; }
            }
            checkDailyBonusReset();
        }

        function saveDailyBonus() {
            localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify(dailyBonusState));
        }

        function getTodayStr() {
            return new Date().toISOString().slice(0, 10);
        }

        function checkDailyBonusReset() {
            const today = getTodayStr();
            if (dailyBonusState.lastClaim === today) {
                dailyBonusState.claimedToday = true;
                return;
            }

            dailyBonusState.claimedToday = false;

            if (dailyBonusState.lastClaim) {
                const last = new Date(dailyBonusState.lastClaim);
                const now = new Date(today);
                const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diffDays > 1) {
                    dailyBonusState.streak = 0;
                }
            }
        }

        function showDailyBonusModal() {
            checkDailyBonusReset();
            renderDailyCalendar();
            document.getElementById('dailyBonusModal').classList.add('active');
        }

        function closeDailyBonusModal() {
            document.getElementById('dailyBonusModal').classList.remove('active');
        }

        function renderDailyCalendar() {
            const cal = document.getElementById('dailyCalendar');
            const streakEl = document.getElementById('streakCount');
            const claimBtn = document.getElementById('dailyClaimBtn');
            if (!cal) return;

            streakEl.textContent = dailyBonusState.streak;
            claimBtn.disabled = dailyBonusState.claimedToday;
            claimBtn.textContent = dailyBonusState.claimedToday ? 'CLAIMED TODAY' : 'CLAIM BONUS';

            let html = '';
            for (let i = 0; i < 7; i++) {
                const reward = DAILY_REWARDS[i];
                const isClaimed = i < dailyBonusState.streak;
                const isToday = i === dailyBonusState.streak && !dailyBonusState.claimedToday;
                const isLocked = i > dailyBonusState.streak;
                const isTodayClaimed = i === dailyBonusState.streak - 1 && dailyBonusState.claimedToday;

                let cls = 'daily-day';
                if (isClaimed || isTodayClaimed) cls += ' day-claimed';
                else if (isToday) cls += ' day-today';
                else if (isLocked) cls += ' day-locked';

                html += `
                    <div class="${cls}">
                        <div class="day-number">DAY ${i + 1}</div>
                        <div class="day-reward">$${reward.amount.toLocaleString()}</div>
                        <div class="day-xp">+${reward.xp} XP</div>
                    </div>
                `;
            }
            cal.innerHTML = html;
        }

        function claimDailyBonus() {
            if (dailyBonusState.claimedToday) return;

            const dayIndex = Math.min(dailyBonusState.streak, DAILY_REWARDS.length - 1);
            const reward = DAILY_REWARDS[dayIndex];

            balance += reward.amount;
            updateBalance();
            awardXP(reward.xp);

            dailyBonusState.streak++;
            if (dailyBonusState.streak > 7) dailyBonusState.streak = 7;
            dailyBonusState.lastClaim = getTodayStr();
            dailyBonusState.claimedToday = true;
            saveDailyBonus();

            playSound('bigwin');
            showToast(`Daily Bonus: +$${reward.amount.toLocaleString()} and +${reward.xp} XP!`, 'win');
            createConfetti();

            renderDailyCalendar();

            setTimeout(() => closeDailyBonusModal(), 2000);
        }

        // ===== Bonus Wheel =====
        const WHEEL_SEGMENTS = [
            { label: '$100', value: 100, color: '#ef4444', xp: 10 },
            { label: '$250', value: 250, color: '#3b82f6', xp: 20 },
            { label: '$500', value: 500, color: '#10b981', xp: 30 },
            { label: '$1000', value: 1000, color: '#f59e0b', xp: 50 },
            { label: '$2500', value: 2500, color: '#8b5cf6', xp: 75 },
            { label: '$100', value: 100, color: '#ec4899', xp: 10 },
            { label: '$250', value: 250, color: '#06b6d4', xp: 20 },
            { label: '$5000', value: 5000, color: '#ffd700', xp: 150 }
        ];

        const WHEEL_STORAGE_KEY = 'casinoBonusWheel';
        let wheelSpinning = false;
        let wheelAngle = 0;
        let wheelState = { lastSpin: null };

        function loadWheelState() {
            const saved = localStorage.getItem(WHEEL_STORAGE_KEY);
            if (saved) {
                try { wheelState = JSON.parse(saved); } catch { wheelState = { lastSpin: null }; }
            }
        }

        function saveWheelState() {
            localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(wheelState));
        }

        function canSpinWheel() {
            if (!wheelState.lastSpin) return true;
            const last = new Date(wheelState.lastSpin);
            const now = new Date();
            const diffHours = (now - last) / (1000 * 60 * 60);
            return diffHours >= 4;
        }

        function drawWheel(highlightIndex = -1) {
            const canvas = document.getElementById('wheelCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = cx - 4;
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            WHEEL_SEGMENTS.forEach((seg, i) => {
                const startAngle = wheelAngle + i * segAngle;
                const endAngle = startAngle + segAngle;

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = i === highlightIndex ? '#fff' : seg.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = i === highlightIndex ? '#000' : '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText(seg.label, r - 12, 5);
                ctx.restore();
            });

            // Center circle
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        function showBonusWheelModal() {
            loadWheelState();
            const spinBtn = document.getElementById('wheelSpinBtn');
            if (!canSpinWheel()) {
                spinBtn.disabled = true;
                spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';
            } else {
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN THE WHEEL';
            }
            drawWheel();
            document.getElementById('bonusWheelModal').classList.add('active');
        }

        function closeBonusWheelModal() {
            document.getElementById('bonusWheelModal').classList.remove('active');
        }

        function spinBonusWheel() {
            if (wheelSpinning || !canSpinWheel()) return;
            wheelSpinning = true;

            const spinBtn = document.getElementById('wheelSpinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = 'SPINNING...';

            playSound('spin');

            const winIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
            // We want the winning segment at the top (270deg / -PI/2)
            // The pointer is at top, reading from angle -PI/2
            const targetAngle = -(winIndex * segAngle + segAngle / 2) - Math.PI / 2;
            const totalRotation = targetAngle + Math.PI * 2 * (5 + Math.random() * 3);

            const startAngle = wheelAngle;
            const duration = 4000;
            const startTime = performance.now();

            function animateWheel(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - t, 3);
                wheelAngle = startAngle + (totalRotation - startAngle) * ease;

                drawWheel();

                if (t < 1) {
                    requestAnimationFrame(animateWheel);
                } else {
                    // Landed
                    wheelAngle = totalRotation % (2 * Math.PI);
                    const seg = WHEEL_SEGMENTS[winIndex];

                    balance += seg.value;
                    updateBalance();
                    awardXP(seg.xp);

                    wheelState.lastSpin = new Date().toISOString();
                    saveWheelState();

                    playSound('bigwin');
                    showToast(`Bonus Wheel: +$${seg.value.toLocaleString()} and +${seg.xp} XP!`, 'win');
                    createConfetti();

                    drawWheel(winIndex);

                    wheelSpinning = false;
                    spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';

                    setTimeout(() => closeBonusWheelModal(), 3000);
                }
            }

            requestAnimationFrame(animateWheel);
        }

        // ===== Win Ticker =====
        const TICKER_NAMES = [
            'LuckyAce', 'JackpotKing', 'SlotMaster', 'BigWinner',
            'CasinoQueen', 'DiamondDan', 'GoldenStar', 'RoyalFlush',
            'MegaSpinner', 'FortuneHunter', 'VelvetRoller', 'NeonNight',
            'CherryBomb77', 'WildCard', 'HighStakes'
        ];

        let tickerInterval = null;

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
            for (let i = 0; i < 5; i++) {
                messages.push(generateTickerMessage());
            }
            renderTickerContent(messages);

            tickerInterval = setInterval(() => {
                messages.push(generateTickerMessage());
                if (messages.length > 8) messages.shift();
                renderTickerContent(messages);
            }, 4000);
        }

        function renderTickerContent(messages) {
            const content = document.getElementById('tickerContent');
            if (!content) return;
            content.innerHTML = messages.map(m =>
                `<span class="ticker-item">${m}</span>`
            ).join('');
        }

        // ===== Auto-Spin =====
        let autoSpinActive = false;
        let autoSpinCount = 0;
        let autoSpinMax = 0;

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
            // Small pause between spins for readability
            setTimeout(runAutoSpin, turboMode ? 400 : 800);
        }

        // ═══════════════════════════════════════════════════════════
        // MOBILE TOUCH OPTIMIZATIONS
        // ═══════════════════════════════════════════════════════════

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        function handleSwipe() {
            const xDiff = touchEndX - touchStartX;
            const yDiff = touchEndY - touchStartY;
            const minSwipeDistance = 50;

            // Check if it's a horizontal swipe (game navigation)
            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (Math.abs(xDiff) > minSwipeDistance) {
                    // Left swipe - could trigger "next games"
                    // Right swipe - could trigger "previous games"
                }
            }
            // Vertical swipe (scroll through sections)
            else if (Math.abs(yDiff) > minSwipeDistance) {
                // Can be used for smooth scrolling between sections
            }
        }

        // Touch event handlers for better mobile responsiveness
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });

        // Prevent double-tap zoom on buttons (but allow on content)
        document.addEventListener('touchmove', (e) => {
            const target = e.target;
            if (target.classList.contains('btn') ||
                target.classList.contains('slot-spin-btn') ||
                target.id === 'spinBtn' ||
                target.closest('.slot-bar-section')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Handle device orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculate reel sizes after orientation change
                if (currentGame) {
                    renderGrid(currentGrid, currentGame);
                }
            }, 100);
        }, false);

        // Optimize animations for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--animation-duration', '0.01s');
            // Disable particle effects on low-motion devices
            const style = document.createElement('style');
            style.textContent = `
                .particle { animation: none !important; }
                .symbol-cascade { animation: none !important; }
                .reel-scrolling { animation: none !important; }
            `;
            document.head.appendChild(style);
        }

        // Handle viewport meta tag for better mobile scaling
        if (!document.querySelector('meta[name="viewport"]')) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
            document.head.appendChild(viewport);
        }

        // ===== Update init to include new systems =====
        async function initAllSystems() {
            loadXP();
            loadDailyBonus();
            loadWheelState();
            initBase();

            // New systems
            updateXPDisplay();
            startWinTicker();
            updateAuthButton();
            await syncServerSession();

            // Show daily bonus if not claimed today
            checkDailyBonusReset();
            const urlParams = new URLSearchParams(window.location.search);
            const suppressBonus = urlParams.get('qaTools') === '1' || urlParams.get('qaTools') === 'true'
                || urlParams.get('noBonus') === '1' || urlParams.get('autoSpin') === '1';
            if (!dailyBonusState.claimedToday && !suppressBonus) {
                setTimeout(() => showDailyBonusModal(), 1500);
            }
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

        // Ctrl+Shift+P to toggle profit monitor
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
                e.preventDefault();
                toggleProfitMonitor();
            }
        });

        // Initialize on load
        window.addEventListener('DOMContentLoaded', initAllSystems);
