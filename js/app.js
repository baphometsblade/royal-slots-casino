// ═══════════════════════════════════════════════════════
// APP MODULE
// ═══════════════════════════════════════════════════════


        // Initialize (base — called by initAllSystems)
        function initBase() {
            appSettings = loadSettings();
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


        function _statsStorageKey() {
            const uid = currentUser ? (currentUser.id || currentUser.username) : null;
            return uid ? STORAGE_KEY_STATS + '_' + uid : STORAGE_KEY_STATS;
        }

        function loadState() {
            const savedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);
            if (savedBalance !== null) balance = parseFloat(savedBalance);

            // Per-user stats key — try user-specific first, then legacy global
            const perUserKey = _statsStorageKey();
            let savedStats = localStorage.getItem(perUserKey);

            if (!savedStats && perUserKey !== STORAGE_KEY_STATS) {
                // Migrate from legacy global key on first per-user load
                savedStats = localStorage.getItem(STORAGE_KEY_STATS);
                if (savedStats) {
                    localStorage.setItem(perUserKey, savedStats);
                }
            }

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
            localStorage.setItem(STORAGE_KEY_BALANCE, balance.toString());
        }


        function saveStats() {
            localStorage.setItem(_statsStorageKey(), JSON.stringify(stats));
            // Debounced server sync for server-authenticated users
            if (typeof isServerAuthToken === 'function' && isServerAuthToken()) {
                _debouncedStatsSync();
            }
        }

        // ── Server Stats Sync ──────────────────────────────
        let _statsSyncTimer = null;
        function _debouncedStatsSync() {
            if (_statsSyncTimer) clearTimeout(_statsSyncTimer);
            _statsSyncTimer = setTimeout(function () {
                _statsSyncTimer = null;
                _pushStatsToServer();
            }, 10000); // batch at most once per 10 seconds
        }

        async function _pushStatsToServer() {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            try {
                await apiRequest('/api/user/stats', {
                    method: 'PUT',
                    body: { stats: stats },
                    requireAuth: true
                });
            } catch (err) {
                // Silently fail — localStorage is the fallback
                console.warn('Stats server sync failed:', err.message);
            }
        }

        async function _loadServerStats() {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            try {
                const res = await apiRequest('/api/user/stats', { requireAuth: true });
                if (res && res.stats) {
                    // Server stats take precedence — merge with defaults for any new fields
                    stats = { ...createDefaultStats(), ...res.stats };
                    localStorage.setItem(_statsStorageKey(), JSON.stringify(stats));
                    if (typeof updateStatsSummary === 'function') updateStatsSummary();
                } else {
                    // No server stats yet — push current local stats to server
                    _pushStatsToServer();
                }
            } catch (err) {
                console.warn('Unable to load server stats:', err.message);
            }
        }


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


        // ── Notification Badge ─────────────────────────────────
        async function updateNotifBadge() {
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            const headers = token ? { Authorization: 'Bearer ' + token } : {};

            const safeFetch = async (url) => {
                try {
                    const res = await fetch(url, { headers });
                    if (!res.ok) return null;
                    return await res.json();
                } catch (_) {
                    return null;
                }
            };

            const [cashback, depositMatch, firstDeposit] = await Promise.all([
                safeFetch('/api/dailycashback/status'),
                safeFetch('/api/depositmatch/status'),
                safeFetch('/api/firstdeposit/status'),
            ]);

            let count = 0;
            if (cashback && cashback.eligible && !cashback.claimed) count++;
            if (depositMatch && depositMatch.eligible && !depositMatch.claimed) count++;
            if (firstDeposit && firstDeposit.eligible && !firstDeposit.claimed) count++;

            const badge = document.getElementById('notifBadge');
            if (!badge) return;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        function initNotifBadge() {
            if (!currentUser || currentUser.isGuest) return;
            // Clear any existing poll to prevent duplication on re-login
            if (window._notifPollInterval) {
                clearInterval(window._notifPollInterval);
                window._notifPollInterval = null;
            }
            updateNotifBadge();
            window._notifPollInterval = setInterval(updateNotifBadge, 60000);
        }

        // Post-auth initialization — runs after login or on page load if already authenticated
        function onPostAuthInit() {
            checkDailyBonusReset();
            // Load stats from server (overrides localStorage if server has data)
            _loadServerStats();
            // Popups and engagement features only for verified (registered) users — not guests
            if (!currentUser || currentUser.isGuest) return;
            const urlParams = new URLSearchParams(window.location.search);
            const suppressBonus = urlParams.get('qaTools') === '1' || urlParams.get('qaTools') === 'true'
                || urlParams.get('noBonus') === '1' || urlParams.get('autoSpin') === '1';
            if (!dailyBonusState.claimedToday && !suppressBonus) {
                setTimeout(() => showDailyBonusModal(), 1500);
            }
            if (typeof initPromoEngine === 'function') initPromoEngine();
            if (typeof initHourlyBonus === 'function') initHourlyBonus();
            if (typeof renderFavQuickBar === 'function') renderFavQuickBar();
            initNotifBadge();
            // Load lobby enhancements
            if (typeof startJackpotPolling === 'function') startJackpotPolling();
            if (typeof loadBigWinFeed === 'function') loadBigWinFeed();
            if (typeof loadPersonalizedOffers === 'function') setTimeout(loadPersonalizedOffers, 2000);
            if (typeof loadCampaignBanners === 'function') setTimeout(loadCampaignBanners, 3000);
            if (typeof loadActiveEvents === 'function') setTimeout(loadActiveEvents, 3500);
            startSessionDurationWatch();
        }

        // Responsible gambling: remind player every 60 minutes of continuous play
        function startSessionDurationWatch() {
            if (window._sessionDurationTimer) return; // already running
            window._sessionStartTime = window._sessionStartTime || Date.now();
            window._sessionDurationTimer = setInterval(function () {
                const mins = Math.round((Date.now() - window._sessionStartTime) / 60000);
                if (mins > 0 && mins % 60 === 0) {
                    const hrs = mins / 60;
                    if (typeof showMessage === 'function') {
                        showMessage(
                            '⏱ You\'ve been playing for ' + hrs + ' hour' + (hrs > 1 ? 's' : '') +
                            '. Remember to take breaks and play responsibly.',
                            'near-miss'
                        );
                    }
                }
            }, 60000);
        }

        window.addEventListener('beforeunload', function () {
            if (window._sessionDurationTimer) {
                clearInterval(window._sessionDurationTimer);
                window._sessionDurationTimer = null;
            }
            // Flush any pending debounced stats sync immediately
            if (_statsSyncTimer) {
                clearTimeout(_statsSyncTimer);
                _statsSyncTimer = null;
                _pushStatsToServer(); // fire-and-forget on unload
            }
        });


        // ===== Update init to include new systems =====
        async function initAllSystems() {
            // Check for password reset token in URL before anything else
            if (typeof checkResetTokenOnLoad === 'function' && checkResetTokenOnLoad()) {
                // Reset flow is active — show auth modal with reset form
                document.body.classList.add('auth-gate');
                loadXP();
                loadDailyBonus();
                loadWheelState();
                initBase();
                updateAuthButton();
                return;
            }

            // Pre-fill referral code from ?ref= URL parameter
            var _refParam = new URLSearchParams(window.location.search).get('ref');
            if (_refParam) {
                var refInput = document.getElementById('regReferral');
                if (refInput) refInput.value = _refParam.toUpperCase();
            }

            // Fast-path: if no session exists, show auth immediately.
            // currentUser is already restored from localStorage by globals.js.
            if (!currentUser) {
                document.body.classList.add('auth-gate');
                // Still run essential non-lobby inits so modals work correctly
                loadXP();
                loadDailyBonus();
                loadWheelState();
                initBase();
                updateAuthButton();
                showAuthModal();
                // If a referral code is in the URL, auto-switch to register tab
                if (_refParam) switchAuthTab('register');
                return;
            }

            loadXP();
            loadDailyBonus();
            loadWheelState();
            initBase();

            // New systems
            updateXPDisplay();
            renderVipBadge();
            startWinTicker();
            updateAuthButton();
            await syncServerSession();

            if (!currentUser) {
                // Token was invalidated by server (e.g. 401) — re-gate
                document.body.classList.add('auth-gate');
                showAuthModal();
                return;
            }

            // Guest balance: only grant $1,000 if they have zero or no saved balance
            // (prevents infinite-reload exploit while still giving new guests starter funds)
            if (currentUser.isGuest && (!balance || balance <= 0)) {
                balance = 1000;
                updateBalance();
                saveBalance();
            }

            onPostAuthInit();
        }


        // ═══════════════════════════════════════════════════════
        // KEYBOARD SHORTCUTS
        // ═══════════════════════════════════════════════════════

        window.addEventListener('DOMContentLoaded', initAllSystems);

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
                default:
                    if (e.key === '?' || e.key === '/') {
                        if (typeof _toggleHotkeySheet === 'function') _toggleHotkeySheet();
                        return;
                    }
                    break;
            }
        });
