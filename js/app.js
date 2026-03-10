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
                _checkBirthday();
                _checkLossStreakOffer();
            }
            _checkAchievements();
            _checkLevelUpBonus();
            _checkMilestones();
            _checkStreakBonuses();
            _checkSubscriptionDailyGems();
            _checkGiftsInbox();
            _initNotificationBell();
            startSessionDurationWatch();
            // Periodic loss-streak check — fires every 3 minutes during active play
            if (!window._lossStreakCheckTimer) {
                window._lossStreakCheckTimer = setInterval(function() {
                    _checkLossStreakOffer();
                }, 180000);
            }

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

        // ── Birthday bonus ─────────────────────────────────────────────────────
        function _checkBirthday() {
            if (sessionStorage.getItem('_birthdayChecked')) return;
            sessionStorage.setItem('_birthdayChecked', '1');
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/birthday/status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (data && data.isBirthday && !data.alreadyClaimed) {
                        setTimeout(function() { _showBirthdayModal(data); }, 5500);
                    }
                })
                .catch(function() {});
        }

        function _showBirthdayModal(data) {
            if (document.getElementById('birthdayModal')) return;
            var overlay = document.createElement('div');
            overlay.id = 'birthdayModal';
            overlay.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
                'background:rgba(0,0,0,0.85)', 'display:flex', 'align-items:center',
                'justify-content:center', 'z-index:9998', 'padding:16px'
            ].join(';');
            var card = document.createElement('div');
            card.style.cssText = [
                'background:linear-gradient(135deg,#1e1b4b,#312e81)',
                'border:2px solid #f59e0b', 'border-radius:20px',
                'padding:36px 32px', 'max-width:380px', 'width:100%',
                'text-align:center', 'position:relative'
            ].join(';');
            var closeBtn = document.createElement('button');
            closeBtn.style.cssText = 'position:absolute;top:12px;right:14px;background:none;border:none;color:#9ca3af;font-size:1.4rem;cursor:pointer;line-height:1;';
            closeBtn.textContent = '\u00D7';
            closeBtn.addEventListener('click', function() { overlay.remove(); });
            var emoji = document.createElement('div');
            emoji.style.cssText = 'font-size:3.5rem;margin-bottom:12px;';
            emoji.textContent = '\uD83C\uDF82';
            var title = document.createElement('div');
            title.style.cssText = 'font-size:1.6rem;font-weight:900;color:#fbbf24;margin-bottom:8px;';
            title.textContent = 'Happy Birthday!';
            var sub = document.createElement('div');
            sub.style.cssText = 'color:#c4b5fd;font-size:0.95rem;margin-bottom:20px;line-height:1.5;';
            sub.textContent = 'A special gift awaits you on your special day!';
            var rewardBox = document.createElement('div');
            rewardBox.style.cssText = [
                'background:rgba(251,191,36,0.1)', 'border:1px solid rgba(251,191,36,0.3)',
                'border-radius:12px', 'padding:16px', 'margin-bottom:22px'
            ].join(';');
            if (data.bonusCredits > 0) {
                var credLine = document.createElement('div');
                credLine.style.cssText = 'font-size:1.2rem;font-weight:800;color:#fbbf24;';
                credLine.textContent = '$' + data.bonusCredits.toFixed(2) + ' Birthday Bonus';
                rewardBox.appendChild(credLine);
            }
            if (data.bonusGems > 0) {
                var gemsLine = document.createElement('div');
                gemsLine.style.cssText = 'font-size:0.9rem;color:#a78bfa;font-weight:700;margin-top:4px;';
                gemsLine.textContent = '+ ' + data.bonusGems + ' Gems';
                rewardBox.appendChild(gemsLine);
            }
            if (data.bonusFreeSpins > 0) {
                var spinsLine = document.createElement('div');
                spinsLine.style.cssText = 'font-size:0.9rem;color:#34d399;font-weight:700;margin-top:4px;';
                spinsLine.textContent = '+ ' + data.bonusFreeSpins + ' Free Spins';
                rewardBox.appendChild(spinsLine);
            }
            var claimBtn = document.createElement('button');
            claimBtn.style.cssText = [
                'background:linear-gradient(135deg,#f59e0b,#d97706)',
                'color:#fff', 'border:none', 'border-radius:10px',
                'padding:13px 40px', 'font-size:1rem', 'font-weight:800',
                'cursor:pointer', 'width:100%', 'margin-bottom:10px'
            ].join(';');
            claimBtn.textContent = '\uD83C\uDF81 Claim Birthday Gift';
            claimBtn.addEventListener('click', function() {
                claimBtn.disabled = true;
                claimBtn.textContent = 'Claiming...';
                var tok = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
                fetch('/api/birthday/claim', {
                    method: 'POST',
                    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }
                })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res.success) {
                            if (res.newBalance !== undefined) {
                                balance = res.newBalance;
                                if (typeof updateBalance === 'function') updateBalance();
                                if (typeof saveBalance === 'function') saveBalance();
                            }
                            if (typeof showMessage === 'function') {
                                showMessage('\uD83C\uDF82 Birthday gift claimed! Enjoy your bonus!', 'big-win');
                            }
                            overlay.remove();
                        } else {
                            claimBtn.disabled = false;
                            claimBtn.textContent = '\uD83C\uDF81 Claim Birthday Gift';
                        }
                    })
                    .catch(function() {
                        claimBtn.disabled = false;
                        claimBtn.textContent = '\uD83C\uDF81 Claim Birthday Gift';
                    });
            });
            var skipLink = document.createElement('button');
            skipLink.style.cssText = 'background:none;border:none;color:#6b7280;font-size:0.78rem;cursor:pointer;';
            skipLink.textContent = 'Maybe later';
            skipLink.addEventListener('click', function() { overlay.remove(); });
            card.appendChild(closeBtn);
            card.appendChild(emoji);
            card.appendChild(title);
            card.appendChild(sub);
            card.appendChild(rewardBox);
            card.appendChild(claimBtn);
            card.appendChild(skipLink);
            overlay.appendChild(card);
            document.body.appendChild(overlay);
        }

        // ── Loss Streak Offer ──────────────────────────────────────────────────
        function _checkLossStreakOffer() {
            if (sessionStorage.getItem('_lossStreakOfferShown')) return;
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/user/loss-streak-offer', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (data && data.eligible && data.offer) {
                        sessionStorage.setItem('_lossStreakOfferShown', '1');
                        setTimeout(function() { _showLossStreakModal(data.offer); }, 1500);
                    }
                })
                .catch(function() {});
        }

        function _showLossStreakModal(offer) {
            if (document.getElementById('lossStreakModal')) return;
            var overlay = document.createElement('div');
            overlay.id = 'lossStreakModal';
            overlay.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
                'background:rgba(0,0,0,0.85)', 'display:flex', 'align-items:center',
                'justify-content:center', 'z-index:9998', 'padding:16px'
            ].join(';');

            var card = document.createElement('div');
            card.style.cssText = [
                'background:linear-gradient(135deg,#1a0a00,#2d0f00)',
                'border:2px solid #ef4444',
                'border-radius:20px',
                'padding:36px 32px',
                'max-width:400px',
                'width:100%',
                'text-align:center',
                'position:relative',
                'box-shadow:0 20px 60px rgba(239,68,68,0.3)'
            ].join(';');

            var closeBtn = document.createElement('button');
            closeBtn.textContent = '\u00D7';
            closeBtn.style.cssText = 'position:absolute;top:12px;right:14px;background:none;border:none;color:#9ca3af;font-size:1.4rem;cursor:pointer;line-height:1;';
            closeBtn.addEventListener('click', function() { overlay.remove(); });

            var title = document.createElement('h2');
            title.style.cssText = 'font-size:1.55rem;font-weight:900;color:#fff;margin:0 0 8px;';
            title.textContent = '\u26A1 Bad Luck Protection Activated';

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'font-size:0.9rem;color:#fca5a5;margin:0 0 20px;line-height:1.5;';
            subtitle.textContent = "We see you've had a rough streak \u2014 here's a boost!";

            var offerBox = document.createElement('div');
            offerBox.style.cssText = [
                'background:rgba(239,68,68,0.1)',
                'border:1px solid rgba(239,68,68,0.35)',
                'border-radius:12px',
                'padding:18px 16px',
                'margin-bottom:20px'
            ].join(';');

            var matchLine = document.createElement('div');
            matchLine.style.cssText = 'font-size:1.4rem;font-weight:900;color:#f97316;margin-bottom:6px;';
            var matchPct = document.createElement('span');
            matchPct.textContent = String(offer.matchPct || 50);
            matchLine.textContent = '';
            matchLine.appendChild(matchPct);
            var matchSuffix = document.createElement('span');
            matchSuffix.textContent = '% MATCH ON YOUR NEXT DEPOSIT';
            matchLine.appendChild(matchSuffix);

            var maxLine = document.createElement('div');
            maxLine.style.cssText = 'font-size:1rem;font-weight:700;color:#fdba74;margin-bottom:4px;';
            var upTo = document.createElement('span');
            upTo.textContent = 'Up to $';
            var maxAmt = document.createElement('span');
            maxAmt.textContent = String(offer.maxMatch || 25);
            maxLine.appendChild(upTo);
            maxLine.appendChild(maxAmt);

            var minNote = document.createElement('div');
            minNote.style.cssText = 'font-size:0.8rem;color:#9ca3af;margin-top:6px;';
            var minLabel = document.createElement('span');
            minLabel.textContent = 'Min deposit $';
            var minAmt = document.createElement('span');
            minAmt.textContent = String(offer.minDeposit || 10);
            minNote.appendChild(minLabel);
            minNote.appendChild(minAmt);

            offerBox.appendChild(matchLine);
            offerBox.appendChild(maxLine);
            offerBox.appendChild(minNote);

            var depositBtn = document.createElement('button');
            depositBtn.style.cssText = [
                'background:linear-gradient(135deg,#ef4444,#f97316)',
                'color:#fff', 'border:none', 'border-radius:10px',
                'padding:13px 40px', 'font-size:0.95rem', 'font-weight:800',
                'cursor:pointer', 'width:100%', 'margin-bottom:10px',
                'letter-spacing:0.4px'
            ].join(';');
            depositBtn.textContent = '\uD83D\uDCB0 Deposit & Claim';
            depositBtn.addEventListener('click', function() {
                overlay.remove();
                if (typeof showWalletModal === 'function') showWalletModal();
            });

            var skipBtn = document.createElement('button');
            skipBtn.style.cssText = 'background:none;border:none;color:#6b7280;font-size:0.78rem;cursor:pointer;padding:4px;';
            skipBtn.textContent = 'Maybe later';
            skipBtn.addEventListener('click', function() { overlay.remove(); });

            card.appendChild(closeBtn);
            card.appendChild(title);
            card.appendChild(subtitle);
            card.appendChild(offerBox);
            card.appendChild(depositBtn);
            card.appendChild(skipBtn);
            overlay.appendChild(card);
            document.body.appendChild(overlay);
        }

        // ── Level-Up Bonus ─────────────────────────────────────────────────────
        function _checkLevelUpBonus() {
            if (sessionStorage.getItem('_levelUpChecked')) return;
            sessionStorage.setItem('_levelUpChecked', '1');
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/levelupbonus/status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data || !data.claimable) return;
                    var currentLevel = data.currentLevel;
                    return fetch('/api/levelupbonus/claim', {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
                    })
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .then(function(res) {
                            if (!res || !res.success) return;
                            if (res.newBalance !== undefined) {
                                balance = res.newBalance;
                                if (typeof updateBalance === 'function') updateBalance();
                                if (typeof saveBalance === 'function') saveBalance();
                            }
                            if (typeof showMessage === 'function') {
                                var amt = res.bonusAmount ? res.bonusAmount.toFixed(2) : '0.00';
                                showMessage('\uD83C\uDD99 Level up bonus claimed! +$' + amt + ' for reaching Level ' + currentLevel, 'big-win');
                            }
                        });
                })
                .catch(function() {});
        }

        // ── Milestone auto-claim ───────────────────────────────────────────────
        function _checkMilestones(isRecurse) {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/milestones/status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data || !data.pendingClaim) return;
                    return fetch('/api/milestones/claim', {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
                    })
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .then(function(res) {
                            if (!res || !res.success) return;
                            if (res.newBalance !== undefined) {
                                balance = res.newBalance;
                                if (typeof updateBalance === 'function') updateBalance();
                                if (typeof saveBalance === 'function') saveBalance();
                            }
                            var label = res.milestoneName || 'Milestone';
                            var cashAmt = res.cashReward ? '$' + parseFloat(res.cashReward).toFixed(2) : '';
                            var gemsAmt = res.gemReward ? res.gemReward + ' gems' : '';
                            var parts = [];
                            if (cashAmt) parts.push(cashAmt);
                            if (gemsAmt) parts.push(gemsAmt);
                            var rewardStr = parts.length ? ' +' + parts.join(' + ') + ' claimed!' : ' claimed!';
                            var msg = '\uD83C\uDFC6 Milestone: ' + label + '!' + rewardStr;
                            if (typeof showWinToast === 'function') {
                                showWinToast(msg);
                            } else {
                                var t = document.createElement('div');
                                t.textContent = msg;
                                t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:99999;pointer-events:none;';
                                document.body.appendChild(t);
                                setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
                            }
                            // Recurse once in case multiple milestones are pending
                            if (!isRecurse) {
                                setTimeout(function() { _checkMilestones(true); }, 500);
                            }
                        });
                })
                .catch(function() {});
        }

        // ── Streak bonus status ────────────────────────────────────────────────
        function _checkStreakBonuses() {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/spinstreak/status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    window._spinStreakStatus = data || null;
                    if (data && data.multiplier && parseFloat(data.multiplier) > 1.0) {
                        // Multiplier is active — store for use by spin engine if needed
                        window._spinStreakMultiplier = parseFloat(data.multiplier);
                    }
                })
                .catch(function() {});
            fetch('/api/winstreak/status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    window._winStreakStatus = data || null;
                })
                .catch(function() {});
        }

        // ── Subscription daily gem auto-claim ─────────────────────────────────
        function _checkSubscriptionDailyGems() {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/subscription/status', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data || !data.active || data.dailyClaimedToday) return;
                    return fetch('/api/subscription/claim-daily', {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
                    })
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .then(function(claim) {
                            if (!claim || !claim.success) return;
                            var msg = '\uD83C\uDF81 Casino Pass: +' + claim.gemsAwarded + ' gems collected!';
                            if (typeof showWinToast === 'function') {
                                showWinToast(msg);
                            } else {
                                var toast = document.createElement('div');
                                toast.textContent = msg;
                                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 20px;border-radius:10px;z-index:99999;font-size:1rem;pointer-events:none;';
                                document.body.appendChild(toast);
                                setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
                            }
                        });
                })
                .catch(function() {});
        }

        // ── Gifts inbox auto-check ─────────────────────────────────────────────
        function _checkGiftsInbox() {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            if (sessionStorage.getItem('_giftsInboxChecked')) return;
            fetch('/api/gifts/inbox', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data || !data.gifts || !data.gifts.length) return;
                    sessionStorage.setItem('_giftsInboxChecked', '1');
                    var msg = '\uD83C\uDF81 You have ' + data.gifts.length + ' pending gift(s)! Check your notifications.';
                    if (typeof showWinToast === 'function') {
                        showWinToast(msg);
                    } else {
                        var toast = document.createElement('div');
                        toast.textContent = msg;
                        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 20px;border-radius:10px;z-index:99999;font-size:1rem;pointer-events:none;';
                        document.body.appendChild(toast);
                        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
                    }
                })
                .catch(function() {});
        }

        // ── Achievements check ─────────────────────────────────────────────────
        function _checkAchievements() {
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!token) return;
            fetch('/api/achievements/check', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
            })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data || !data.newlyUnlocked || !data.newlyUnlocked.length) return;
                    data.newlyUnlocked.forEach(function(ach, i) {
                        setTimeout(function() {
                            if (typeof showMessage === 'function') {
                                showMessage((ach.icon || '\uD83C\uDFC6') + ' Achievement Unlocked: ' + ach.name, 'big-win');
                            }
                        }, i * 2500);
                    });
                })
                .catch(function() {});
        }

        // ── Notification bell ──────────────────────────────────────────────────
        function _initNotificationBell() {
            if (document.getElementById('notifBellBtn')) return;
            if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
            var headerActions = document.querySelector('.header-actions');
            if (!headerActions) return;
            var settingsBtn = headerActions.querySelector('.btn-settings');
            var bellBtn = document.createElement('button');
            bellBtn.id = 'notifBellBtn';
            bellBtn.className = 'btn-icon btn-notif';
            bellBtn.title = 'Notifications';
            bellBtn.style.cssText = 'position:relative;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 10px;cursor:pointer;color:#e2e8f0;font-size:1rem;line-height:1;';
            bellBtn.textContent = '\uD83D\uDD14';
            bellBtn.addEventListener('click', _toggleNotifPanel);
            var badge = document.createElement('span');
            badge.id = 'notifBadge';
            badge.style.cssText = [
                'position:absolute', 'top:-5px', 'right:-5px',
                'background:#ef4444', 'color:#fff', 'border-radius:999px',
                'font-size:0.65rem', 'font-weight:800', 'min-width:16px',
                'height:16px', 'line-height:16px', 'text-align:center',
                'padding:0 3px', 'display:none'
            ].join(';');
            bellBtn.appendChild(badge);
            if (settingsBtn) {
                headerActions.insertBefore(bellBtn, settingsBtn);
            } else {
                headerActions.appendChild(bellBtn);
            }
            var tok = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            _refreshNotifications(tok);
            setInterval(function() {
                var t = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
                _refreshNotifications(t);
            }, 60000);
        }

        function _refreshNotifications(token) {
            if (!token) return;
            fetch('/api/notifications', { headers: { Authorization: 'Bearer ' + token } })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data) return;
                    window._notifCache = data.notifications || [];
                    var badge = document.getElementById('notifBadge');
                    if (badge) {
                        var cnt = data.unreadCount || 0;
                        badge.textContent = cnt > 9 ? '9+' : String(cnt);
                        badge.style.display = cnt > 0 ? 'block' : 'none';
                    }
                })
                .catch(function() {});
        }

        function _toggleNotifPanel() {
            var existing = document.getElementById('notifPanel');
            if (existing) { existing.remove(); return; }
            var panel = document.createElement('div');
            panel.id = 'notifPanel';
            panel.style.cssText = [
                'position:fixed', 'top:72px', 'right:16px', 'width:320px',
                'max-height:420px', 'overflow-y:auto',
                'background:#1e1b4b', 'border:1px solid rgba(139,92,246,0.3)',
                'border-radius:12px', 'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
                'z-index:8000', 'padding:12px 0'
            ].join(';');
            var header = document.createElement('div');
            header.style.cssText = 'padding:8px 16px 12px;font-weight:800;font-size:0.9rem;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;';
            var headerTitle = document.createElement('span');
            headerTitle.textContent = '\uD83D\uDD14 Notifications';
            var readAllBtn = document.createElement('button');
            readAllBtn.style.cssText = 'background:none;border:none;color:#8b5cf6;font-size:0.75rem;cursor:pointer;font-weight:700;';
            readAllBtn.textContent = 'Mark all read';
            readAllBtn.addEventListener('click', function() {
                var tok = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
                fetch('/api/notifications/read-all', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } })
                    .then(function() { _refreshNotifications(tok); panel.remove(); })
                    .catch(function() {});
            });
            header.appendChild(headerTitle);
            header.appendChild(readAllBtn);
            panel.appendChild(header);
            var notifs = window._notifCache || [];
            if (notifs.length === 0) {
                var empty = document.createElement('div');
                empty.style.cssText = 'padding:24px 16px;text-align:center;color:#6b7280;font-size:0.85rem;';
                empty.textContent = 'No notifications yet';
                panel.appendChild(empty);
            } else {
                notifs.forEach(function(n) {
                    var item = document.createElement('div');
                    item.style.cssText = 'padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;' + (n.read_at ? 'opacity:0.6;' : 'background:rgba(139,92,246,0.05);');
                    var nTitle = document.createElement('div');
                    nTitle.style.cssText = 'font-weight:700;font-size:0.85rem;color:#e2e8f0;margin-bottom:3px;';
                    nTitle.textContent = n.title || '';
                    var nBody = document.createElement('div');
                    nBody.style.cssText = 'font-size:0.78rem;color:#9ca3af;line-height:1.4;';
                    nBody.textContent = n.body || n.message || '';
                    item.appendChild(nTitle);
                    item.appendChild(nBody);
                    item.addEventListener('click', function() {
                        var tok = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
                        fetch('/api/notifications/read/' + n.id, { method: 'POST', headers: { Authorization: 'Bearer ' + tok } })
                            .then(function() { _refreshNotifications(tok); })
                            .catch(function() {});
                        if (n.link_action === 'wallet') {
                            panel.remove();
                            if (typeof showWalletModal === 'function') showWalletModal();
                        } else if (n.link_action === 'vip') {
                            panel.remove();
                            if (typeof openVipModal === 'function') openVipModal();
                        } else {
                            panel.remove();
                        }
                    });
                    panel.appendChild(item);
                });
            }
            document.body.appendChild(panel);
            setTimeout(function() {
                document.addEventListener('click', function _closeNotif(ev) {
                    if (!panel.contains(ev.target) && ev.target.id !== 'notifBellBtn') {
                        panel.remove();
                        document.removeEventListener('click', _closeNotif);
                    }
                });
            }, 0);
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
