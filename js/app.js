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
            localStorage.setItem(STORAGE_KEY_BALANCE, balance.toString());
        }


        function saveStats() {
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


        function handleSwipe() {
            const xDiff = touchEndX - touchStartX;
            const yDiff = touchEndY - touchStartY;

            // Check if it's a horizontal swipe (game navigation)
            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (Math.abs(xDiff) > MIN_SWIPE_DISTANCE) {
                    // Left swipe - could trigger "next games"
                    // Right swipe - could trigger "previous games"
                }
            }
            // Vertical swipe (scroll through sections)
            else if (Math.abs(yDiff) > MIN_SWIPE_DISTANCE) {
                // Can be used for smooth scrolling between sections
            }
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
            }
        });
