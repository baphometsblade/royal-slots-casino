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


        function loadState() {
            const savedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);
            if (savedBalance !== null) balance = parseFloat(savedBalance);

            const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
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
            if (typeof _demoMode !== 'undefined' && _demoMode) return;
            localStorage.setItem(STORAGE_KEY_BALANCE, balance.toString());
        }


        function saveStats() {
            if (typeof _demoMode !== 'undefined' && _demoMode) return;
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
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
            // Popups and engagement features only for verified (registered) users — not guests
            if (!currentUser || currentUser.isGuest) return;
            const urlParams = new URLSearchParams(window.location.search);
            const suppressBonus = urlParams.get('qaTools') === '1' || urlParams.get('qaTools') === 'true'
                || urlParams.get('noBonus') === '1' || urlParams.get('autoSpin') === '1';
            if (!dailyBonusState.claimedToday && !suppressBonus) {
                setTimeout(() => showDailyBonusModal(), 1500);
            }
            if (typeof initPromoEngine === 'function') initPromoEngine();
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
        });


        // ===== Update init to include new systems =====
        async function initAllSystems() {
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

            // Always refresh guest balance to $1,000 on page load
            if (currentUser.isGuest) {
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
                    if ((e.key === '?' || e.key === '/') && slotOpen) {
                        if (typeof _toggleHotkeySheet === 'function') _toggleHotkeySheet();
                        return;
                    }
                    break;
            }
        });
