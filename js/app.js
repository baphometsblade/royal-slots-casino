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
            if (!suppressBonus) {
                _checkReturnStatus();
            }
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

        // ── Return-status: welcome-back overlay for lapsed players ─────────
        function _checkReturnStatus() {
            if (sessionStorage.getItem('_returnStatusChecked')) return; // once per session
            sessionStorage.setItem('_returnStatusChecked', '1');
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            const token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/user/return-status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (data && data.isReturn) {
                        setTimeout(function() { _showWelcomeBackOverlay(data); }, 3500);
                    }
                })
                .catch(function() {});
        }

        function _showWelcomeBackOverlay(data) {
            if (document.getElementById('welcomeBackOverlay')) return;
            var TIER_STYLES = {
                platinum: '#94a3b8',
                gold:     '#f59e0b',
                silver:   '#64748b',
                bronze:   '#c2733a'
            };
            var accent = TIER_STYLES[data.offerTier] || TIER_STYLES.bronze;
            var tierLabel = (data.offerTier || 'bronze').toUpperCase();

            var overlay = document.createElement('div');
            overlay.id = 'welcomeBackOverlay';
            overlay.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
                'background:rgba(0,0,0,0.78)', 'display:flex', 'align-items:center',
                'justify-content:center', 'z-index:9998', 'padding:20px'
            ].join(';');

            var card = document.createElement('div');
            card.style.cssText = [
                'background:linear-gradient(135deg,#1a1040,#0f0920)',
                'border:2px solid ' + accent,
                'border-radius:16px',
                'padding:32px',
                'max-width:440px',
                'width:100%',
                'text-align:center',
                'position:relative',
                'box-shadow:0 20px 60px rgba(0,0,0,0.6)'
            ].join(';');

            var closeBtn = document.createElement('button');
            closeBtn.textContent = '\u00D7';
            closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;color:#6b7280;font-size:1.4rem;cursor:pointer;line-height:1;';
            closeBtn.addEventListener('click', function() { overlay.remove(); });

            var tierBadge = document.createElement('div');
            tierBadge.style.cssText = 'font-size:0.72rem;font-weight:800;letter-spacing:2px;color:' + accent + ';margin-bottom:10px;text-transform:uppercase;';
            tierBadge.textContent = tierLabel + ' RETURN OFFER';

            var title = document.createElement('h2');
            title.style.cssText = 'font-size:1.75rem;font-weight:900;color:#fff;margin:0 0 6px;';
            title.textContent = '\uD83D\uDC4B Welcome Back!';

            var daysEl = document.createElement('p');
            daysEl.style.cssText = 'font-size:0.9rem;color:#9ca3af;margin:0 0 14px;';
            daysEl.textContent = "You've been away " + (data.daysAway || 0) + " day" + (data.daysAway !== 1 ? 's' : '') + " \u2014 we missed you!";

            var msgEl = document.createElement('p');
            msgEl.style.cssText = 'font-size:0.88rem;color:#d1d5db;margin:0 0 18px;line-height:1.5;';
            msgEl.textContent = data.message || 'We have a special offer waiting for you!';

            var offerBox = document.createElement('div');
            offerBox.style.cssText = [
                'background:rgba(255,255,255,0.05)',
                'border:1px solid rgba(255,255,255,0.1)',
                'border-radius:10px',
                'padding:14px 16px',
                'margin-bottom:18px'
            ].join(';');

            var line1 = document.createElement('div');
            line1.style.cssText = 'font-size:1.3rem;font-weight:900;color:' + accent + ';margin-bottom:' + (data.freeSpins > 0 ? '4px' : '0') + ';';
            line1.textContent = '+' + (data.bonusPercent || 25) + '% BONUS ON NEXT DEPOSIT';
            offerBox.appendChild(line1);

            if (data.freeSpins > 0) {
                var line2 = document.createElement('div');
                line2.style.cssText = 'font-size:0.9rem;color:#a78bfa;font-weight:700;';
                line2.textContent = '+ ' + data.freeSpins + ' FREE SPINS';
                offerBox.appendChild(line2);
            }

            var depositBtn = document.createElement('button');
            depositBtn.style.cssText = [
                'background:linear-gradient(135deg,' + accent + ',#7c3aed)',
                'color:#fff', 'border:none', 'border-radius:8px',
                'padding:13px 40px', 'font-size:0.95rem', 'font-weight:800',
                'cursor:pointer', 'width:100%', 'margin-bottom:10px',
                'letter-spacing:0.4px'
            ].join(';');
            depositBtn.textContent = '\uD83D\uDCB0 Claim Offer & Deposit';
            depositBtn.addEventListener('click', function() {
                overlay.remove();
                if (typeof showWalletModal === 'function') showWalletModal();
            });

            var skipBtn = document.createElement('button');
            skipBtn.style.cssText = 'background:none;border:none;color:#6b7280;font-size:0.78rem;cursor:pointer;padding:4px;';
            skipBtn.textContent = 'Maybe later';
            skipBtn.addEventListener('click', function() { overlay.remove(); });

            card.appendChild(closeBtn);
            card.appendChild(tierBadge);
            card.appendChild(title);
            card.appendChild(daysEl);
            card.appendChild(msgEl);
            card.appendChild(offerBox);
            card.appendChild(depositBtn);
            card.appendChild(skipBtn);
            overlay.appendChild(card);
            document.body.appendChild(overlay);
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
                    break;
            }
        });

        // ═══════════════════════════════════════════════════════
        // CLICK-OUTSIDE-TO-CLOSE — all modal overlays
        // Clicking the dark backdrop (but NOT the inner content box)
        // closes the topmost modal.  Auth and slot modals are excluded.
        // ═══════════════════════════════════════════════════════
        document.addEventListener('click', function(e) {
            var el = e.target;

            // Must be a modal/overlay element itself (not a child inside it)
            var isModalOverlay = el.classList.contains('modal') ||
                                 el.classList.contains('modal-overlay') ||
                                 el.classList.contains('autoplay-modal-overlay');
            if (!isModalOverlay) return;

            // Never auto-close the auth gate or slot game modal
            var excludedIds = ['authModal', 'slotModal'];
            if (excludedIds.indexOf(el.id) !== -1) return;

            // Only act if the modal is currently visible/active
            var isActive = el.classList.contains('active') ||
                           (el.style.display && el.style.display !== 'none');
            if (!isActive) return;

            // Try dedicated close button first, then named close functions,
            // then fall back to removing the active class / hiding the element.
            var closeBtn = el.querySelector(
                '.modal-close, .close-btn, .auth-close-btn, .modal-close-btn, ' +
                '.daily-skip-btn, .autoplay-modal-close, .back-btn[onclick*="close"]'
            );
            if (closeBtn) {
                closeBtn.click();
                return;
            }

            // Named close functions wired to specific modal IDs
            var closeFnMap = {
                'settingsModal':    function() { if (typeof closeSettingsModal === 'function') closeSettingsModal(); },
                'statsModal':       function() { if (typeof closeStatsModal === 'function') closeStatsModal(); },
                'walletModal':      function() { if (typeof hideWalletModal === 'function') hideWalletModal(); },
                'dailyBonusModal':  function() { if (typeof closeDailyBonusModal === 'function') closeDailyBonusModal(); },
                'bonusWheelModal':  function() { if (typeof closeBonusWheelModal === 'function') closeBonusWheelModal(); },
                'autoplayOverlay':  function() { if (typeof closeAutoplayModal === 'function') closeAutoplayModal(); }
            };
            if (el.id && closeFnMap[el.id]) {
                closeFnMap[el.id]();
                return;
            }

            // Generic fallback: remove active class and hide
            el.classList.remove('active');
            el.style.display = 'none';
        });
