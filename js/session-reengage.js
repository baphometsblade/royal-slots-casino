(function() {
    var api = (function() {
        return async function(path, opts) {
            opts = opts || {};
            if (typeof apiRequest === 'function') return apiRequest(path, opts);
            var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
            var token = localStorage.getItem(tokenKey);
            if (!token) return null;
            var res = await fetch(path, Object.assign({}, opts, {
                headers: Object.assign({ 'Content-Type': 'application/json' },
                    token ? { Authorization: 'Bearer ' + token } : {},
                    opts.headers || {})
            }));
            return res.json();
        };
    })();

    var config = {
        stage1Timeout: 3 * 60 * 1000,
        stage2Timeout: 5 * 60 * 1000,
        stage3Timeout: 8 * 60 * 1000,
        stage2CountdownDuration: 60 * 1000,
        stage3CountdownDuration: 120 * 1000,
        cooldownAfterClaim: 30 * 60 * 1000,
        maxReengageAttempts: 3
    };

    var state = {
        idleStartTime: null,
        currentStage: 0,
        activityTracking: false,
        reengageCount: 0,
        lastClaimTime: null,
        stage1Shown: false,
        stage2Shown: false,
        stage3Shown: false
    };

    var elements = {
        stage1Badge: null,
        stage2Panel: null,
        stage3Overlay: null,
        stage2Countdown: null,
        stage3Countdown: null
    };

    var timers = {
        idleTimer: null,
        stage2CountdownTimer: null,
        stage3CountdownTimer: null,
        stage1CheckTimer: null
    };

    function resetIdleTimer() {
        if (timers.idleTimer) clearTimeout(timers.idleTimer);
        state.idleStartTime = Date.now();

        var stage1Fire = setTimeout(function() {
            if (state.currentStage < 1 && !state.stage1Shown) {
                showStage1Badge();
            }
        }, config.stage1Timeout);

        var stage2Fire = setTimeout(function() {
            if (state.currentStage < 2 && !state.stage2Shown) {
                showStage2Panel();
            }
        }, config.stage2Timeout);

        var stage3Fire = setTimeout(function() {
            if (state.currentStage < 3 && !state.stage3Shown && state.reengageCount < config.maxReengageAttempts) {
                showStage3Overlay();
            }
        }, config.stage3Timeout);

        timers.idleTimer = { stage1: stage1Fire, stage2: stage2Fire, stage3: stage3Fire };
    }

    function clearIdleTimers() {
        if (timers.idleTimer) {
            clearTimeout(timers.idleTimer.stage1);
            clearTimeout(timers.idleTimer.stage2);
            clearTimeout(timers.idleTimer.stage3);
            timers.idleTimer = null;
        }
    }

    function markActivityAndReset() {
        clearAllStages();
        resetIdleTimer();
    }

    function attachActivityListeners() {
        if (state.activityTracking) return;
        state.activityTracking = true;

        var activityHandler = function() {
            markActivityAndReset();
        };

        document.addEventListener('click', activityHandler, true);
        document.addEventListener('mousemove', activityHandler, true);
        document.addEventListener('keydown', activityHandler, true);
        document.addEventListener('touchstart', activityHandler, true);

        if (typeof window.gameEvents !== 'undefined' && window.gameEvents) {
            if (window.gameEvents.addEventListener) {
                window.gameEvents.addEventListener('spin:complete', activityHandler);
            }
        }
    }

    function createStage1Badge() {
        var badge = document.createElement('div');
        badge.setAttribute('id', 'session-reengage-badge');
        badge.setAttribute('style',
            'position: fixed; ' +
            'bottom: 30px; ' +
            'right: 30px; ' +
            'background: rgba(10, 5, 30, 0.97); ' +
            'border: 2px solid #ffd700; ' +
            'border-radius: 50%; ' +
            'width: 70px; ' +
            'height: 70px; ' +
            'display: flex; ' +
            'align-items: center; ' +
            'justify-content: center; ' +
            'color: #ffd700; ' +
            'font-size: 32px; ' +
            'cursor: pointer; ' +
            'z-index: 9990; ' +
            'box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); ' +
            'animation: pulse-badge 1.5s ease-in-out infinite; ' +
            'font-weight: bold;'
        );
        badge.textContent = '🎁';
        badge.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dismissStage1();
            showStage2Panel();
        });

        var style = document.createElement('style');
        style.textContent = '@keyframes pulse-badge { 0% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); transform: scale(1); } 50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.9); transform: scale(1.1); } 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); transform: scale(1); } }';
        document.head.appendChild(style);

        document.body.appendChild(badge);
        elements.stage1Badge = badge;
        state.stage1Shown = true;
        state.currentStage = 1;
    }

    function showStage1Badge() {
        if (state.stage1Shown) return;
        createStage1Badge();
    }

    function dismissStage1() {
        if (elements.stage1Badge) {
            elements.stage1Badge.parentNode.removeChild(elements.stage1Badge);
            elements.stage1Badge = null;
        }
        state.stage1Shown = false;
        state.currentStage = 0;
    }

    function createStage2Panel() {
        var panelContainer = document.createElement('div');
        panelContainer.setAttribute('id', 'session-reengage-panel');
        panelContainer.setAttribute('style',
            'position: fixed; ' +
            'right: -300px; ' +
            'top: 0; ' +
            'width: 300px; ' +
            'height: 100vh; ' +
            'background: rgba(10, 5, 30, 0.98); ' +
            'border-left: 3px solid #ffd700; ' +
            'z-index: 9991; ' +
            'box-shadow: -5px 0 20px rgba(255, 215, 0, 0.3); ' +
            'animation: slide-in-panel 0.5s ease-out forwards; ' +
            'display: flex; ' +
            'flex-direction: column; ' +
            'padding: 20px; ' +
            'box-sizing: border-box;'
        );

        var style = document.createElement('style');
        style.textContent = '@keyframes slide-in-panel { from { right: -300px; } to { right: 0; } }';
        if (!document.querySelector('style[data-reengage-slide]')) {
            style.setAttribute('data-reengage-slide', 'true');
            document.head.appendChild(style);
        }

        var closeBtn = document.createElement('button');
        closeBtn.setAttribute('style',
            'align-self: flex-end; ' +
            'background: none; ' +
            'border: none; ' +
            'color: #ffd700; ' +
            'font-size: 24px; ' +
            'cursor: pointer; ' +
            'padding: 0; ' +
            'width: 30px; ' +
            'height: 30px; ' +
            'display: flex; ' +
            'align-items: center; ' +
            'justify-content: center;'
        );
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dismissStage2();
            markActivityAndReset();
        });

        var title = document.createElement('div');
        title.setAttribute('style',
            'color: #ffd700; ' +
            'font-size: 28px; ' +
            'font-weight: bold; ' +
            'margin-top: 20px; ' +
            'margin-bottom: 15px;'
        );
        title.textContent = 'Still there? 🎰';

        var message = document.createElement('div');
        message.setAttribute('style',
            'color: #ffffff; ' +
            'font-size: 16px; ' +
            'margin-bottom: 30px; ' +
            'line-height: 1.5;'
        );
        message.textContent = 'Your lucky streak is waiting! Spin now and get 2X on your next win!';

        var countdownLabel = document.createElement('div');
        countdownLabel.setAttribute('style',
            'color: #ff6b35; ' +
            'font-size: 14px; ' +
            'margin-bottom: 10px; ' +
            'font-weight: bold;'
        );
        countdownLabel.textContent = 'Offer expires in:';

        var countdown = document.createElement('div');
        countdown.setAttribute('id', 'stage2-countdown');
        countdown.setAttribute('style',
            'color: #ffd700; ' +
            'font-size: 24px; ' +
            'margin-bottom: 30px; ' +
            'font-weight: bold; ' +
            'text-align: center;'
        );
        countdown.textContent = '1:00';
        elements.stage2Countdown = countdown;

        var spinBtn = document.createElement('button');
        spinBtn.setAttribute('style',
            'background: linear-gradient(135deg, #ffd700, #ffed4e); ' +
            'color: #0a051e; ' +
            'border: none; ' +
            'border-radius: 8px; ' +
            'padding: 15px 30px; ' +
            'font-size: 16px; ' +
            'font-weight: bold; ' +
            'cursor: pointer; ' +
            'transition: all 0.3s ease; ' +
            'box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); ' +
            'margin-top: auto;'
        );
        spinBtn.textContent = 'SPIN NOW';
        spinBtn.addEventListener('mouseover', function() {
            spinBtn.setAttribute('style',
                'background: linear-gradient(135deg, #ffed4e, #ffd700); ' +
                'color: #0a051e; ' +
                'border: none; ' +
                'border-radius: 8px; ' +
                'padding: 15px 30px; ' +
                'font-size: 16px; ' +
                'font-weight: bold; ' +
                'cursor: pointer; ' +
                'transition: all 0.3s ease; ' +
                'box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6); ' +
                'margin-top: auto; ' +
                'transform: scale(1.05);'
            );
        });
        spinBtn.addEventListener('mouseout', function() {
            spinBtn.setAttribute('style',
                'background: linear-gradient(135deg, #ffd700, #ffed4e); ' +
                'color: #0a051e; ' +
                'border: none; ' +
                'border-radius: 8px; ' +
                'padding: 15px 30px; ' +
                'font-size: 16px; ' +
                'font-weight: bold; ' +
                'cursor: pointer; ' +
                'transition: all 0.3s ease; ' +
                'box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); ' +
                'margin-top: auto;'
            );
        });
        spinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dismissStage2();
            markActivityAndReset();
        });

        panelContainer.appendChild(closeBtn);
        panelContainer.appendChild(title);
        panelContainer.appendChild(message);
        panelContainer.appendChild(countdownLabel);
        panelContainer.appendChild(countdown);
        panelContainer.appendChild(spinBtn);

        document.body.appendChild(panelContainer);
        elements.stage2Panel = panelContainer;
        state.stage2Shown = true;
        state.currentStage = 2;

        startStage2Countdown();
    }

    function showStage2Panel() {
        if (state.stage2Shown) return;
        createStage2Panel();
    }

    function startStage2Countdown() {
        if (timers.stage2CountdownTimer) clearInterval(timers.stage2CountdownTimer);
        var timeLeft = config.stage2CountdownDuration / 1000;
        var countdownEl = elements.stage2Countdown;

        var updateCountdown = function() {
            var mins = Math.floor(timeLeft / 60);
            var secs = timeLeft % 60;
            var display = mins + ':' + (secs < 10 ? '0' : '') + secs;
            if (countdownEl) countdownEl.textContent = display;
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(timers.stage2CountdownTimer);
                dismissStage2();
            }
        };

        updateCountdown();
        timers.stage2CountdownTimer = setInterval(updateCountdown, 1000);
    }

    function dismissStage2() {
        if (timers.stage2CountdownTimer) clearInterval(timers.stage2CountdownTimer);
        if (elements.stage2Panel) {
            elements.stage2Panel.parentNode.removeChild(elements.stage2Panel);
            elements.stage2Panel = null;
        }
        elements.stage2Countdown = null;
        state.stage2Shown = false;
        state.currentStage = 0;
    }

    function getRandomBonus() {
        var weights = [
            { value: 5, weight: 40 },
            { value: 8, weight: 25 },
            { value: 10, weight: 20 },
            { value: 15, weight: 10 },
            { value: 25, weight: 5 }
        ];
        var totalWeight = 0;
        var i;
        for (i = 0; i < weights.length; i++) {
            totalWeight += weights[i].weight;
        }
        var random = Math.random() * totalWeight;
        var cumulative = 0;
        for (i = 0; i < weights.length; i++) {
            cumulative += weights[i].weight;
            if (random <= cumulative) return weights[i].value;
        }
        return 5;
    }

    function createStage3Overlay() {
        var overlay = document.createElement('div');
        overlay.setAttribute('id', 'session-reengage-overlay');
        overlay.setAttribute('style',
            'position: fixed; ' +
            'top: 0; ' +
            'left: 0; ' +
            'width: 100%; ' +
            'height: 100%; ' +
            'background: rgba(0, 0, 0, 0.85); ' +
            'display: flex; ' +
            'align-items: center; ' +
            'justify-content: center; ' +
            'z-index: 9992; ' +
            'animation: fade-in-overlay 0.4s ease-out;'
        );

        var overlayStyle = document.createElement('style');
        overlayStyle.textContent = '@keyframes fade-in-overlay { from { opacity: 0; } to { opacity: 1; } } ' +
            '@keyframes card-entrance { 0% { transform: scale(0.5) translateY(20px); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } } ' +
            '@keyframes spin-coins { 0% { transform: rotateY(0deg) rotateZ(0deg); } 100% { transform: rotateY(360deg) rotateZ(360deg); } } ' +
            '@keyframes pulse-glow { 0% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1); } 50% { box-shadow: 0 0 60px rgba(255, 215, 0, 0.7), inset 0 0 30px rgba(255, 215, 0, 0.2); } 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1); } }';
        if (!document.querySelector('style[data-reengage-overlay]')) {
            overlayStyle.setAttribute('data-reengage-overlay', 'true');
            document.head.appendChild(overlayStyle);
        }

        var card = document.createElement('div');
        card.setAttribute('style',
            'background: rgba(10, 5, 30, 0.99); ' +
            'border: 3px solid #ffd700; ' +
            'border-radius: 15px; ' +
            'padding: 50px 40px; ' +
            'max-width: 500px; ' +
            'text-align: center; ' +
            'animation: card-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), pulse-glow 2s ease-in-out infinite 0.2s; ' +
            'box-shadow: 0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1);'
        );

        var title = document.createElement('div');
        title.setAttribute('style',
            'color: #ff6b35; ' +
            'font-size: 36px; ' +
            'font-weight: bold; ' +
            'margin-bottom: 20px;'
        );
        title.textContent = 'WE MISS YOU! 😢';

        var subtitle = document.createElement('div');
        subtitle.setAttribute('style',
            'color: #ffd700; ' +
            'font-size: 18px; ' +
            'margin-bottom: 30px; ' +
            'line-height: 1.6;'
        );
        subtitle.textContent = 'Come back now and claim your EXCLUSIVE comeback bonus!';

        var coinsAnimation = document.createElement('div');
        coinsAnimation.setAttribute('style',
            'font-size: 60px; ' +
            'margin: 30px 0; ' +
            'animation: spin-coins 3s linear infinite; ' +
            'perspective: 1000px;'
        );
        coinsAnimation.textContent = '💰';

        var bonusValue = getRandomBonus();
        var bonusText = document.createElement('div');
        bonusText.setAttribute('style',
            'color: #ffffff; ' +
            'font-size: 16px; ' +
            'margin-bottom: 30px;'
        );
        bonusText.textContent = 'You\'ve earned: $' + bonusValue + ' FREE CREDITS';

        var countdownLabel = document.createElement('div');
        countdownLabel.setAttribute('style',
            'color: #ff6b35; ' +
            'font-size: 14px; ' +
            'margin-bottom: 10px; ' +
            'font-weight: bold;'
        );
        countdownLabel.textContent = 'CLAIM NOW - EXPIRES IN:';

        var countdown = document.createElement('div');
        countdown.setAttribute('id', 'stage3-countdown');
        countdown.setAttribute('style',
            'color: #ffd700; ' +
            'font-size: 32px; ' +
            'margin-bottom: 30px; ' +
            'font-weight: bold; ' +
            'text-align: center;'
        );
        countdown.textContent = '2:00';
        elements.stage3Countdown = countdown;

        var claimBtn = document.createElement('button');
        claimBtn.setAttribute('style',
            'background: linear-gradient(135deg, #ff6b35, #ff8555); ' +
            'color: #ffffff; ' +
            'border: none; ' +
            'border-radius: 10px; ' +
            'padding: 18px 40px; ' +
            'font-size: 18px; ' +
            'font-weight: bold; ' +
            'cursor: pointer; ' +
            'transition: all 0.3s ease; ' +
            'box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5); ' +
            'width: 100%;'
        );
        claimBtn.textContent = 'CLAIM $' + bonusValue + ' FREE CREDITS';
        claimBtn.addEventListener('mouseover', function() {
            claimBtn.setAttribute('style',
                'background: linear-gradient(135deg, #ff8555, #ff6b35); ' +
                'color: #ffffff; ' +
                'border: none; ' +
                'border-radius: 10px; ' +
                'padding: 18px 40px; ' +
                'font-size: 18px; ' +
                'font-weight: bold; ' +
                'cursor: pointer; ' +
                'transition: all 0.3s ease; ' +
                'box-shadow: 0 8px 25px rgba(255, 107, 53, 0.7); ' +
                'width: 100%; ' +
                'transform: scale(1.05);'
            );
        });
        claimBtn.addEventListener('mouseout', function() {
            claimBtn.setAttribute('style',
                'background: linear-gradient(135deg, #ff6b35, #ff8555); ' +
                'color: #ffffff; ' +
                'border: none; ' +
                'border-radius: 10px; ' +
                'padding: 18px 40px; ' +
                'font-size: 18px; ' +
                'font-weight: bold; ' +
                'cursor: pointer; ' +
                'transition: all 0.3s ease; ' +
                'box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5); ' +
                'width: 100%;'
            );
        });
        claimBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            claimBonus(bonusValue);
        });

        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(coinsAnimation);
        card.appendChild(bonusText);
        card.appendChild(countdownLabel);
        card.appendChild(countdown);
        card.appendChild(claimBtn);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        elements.stage3Overlay = overlay;
        state.stage3Shown = true;
        state.currentStage = 3;
        state.reengageCount++;

        startStage3Countdown();
    }

    function showStage3Overlay() {
        if (state.stage3Shown || state.reengageCount >= config.maxReengageAttempts) return;
        createStage3Overlay();
    }

    function startStage3Countdown() {
        if (timers.stage3CountdownTimer) clearInterval(timers.stage3CountdownTimer);
        var timeLeft = config.stage3CountdownDuration / 1000;
        var countdownEl = elements.stage3Countdown;

        var updateCountdown = function() {
            var mins = Math.floor(timeLeft / 60);
            var secs = timeLeft % 60;
            var display = mins + ':' + (secs < 10 ? '0' : '') + secs;
            if (countdownEl) {
                countdownEl.textContent = display;
                if (timeLeft < 30) {
                    countdownEl.setAttribute('style',
                        'color: #ff6b35; ' +
                        'font-size: 32px; ' +
                        'margin-bottom: 30px; ' +
                        'font-weight: bold; ' +
                        'text-align: center; ' +
                        'animation: pulse-red 0.5s ease-in-out infinite;'
                    );
                }
            }
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(timers.stage3CountdownTimer);
                dismissStage3();
                state.lastClaimTime = Date.now();
            }
        };

        var pulseStyle = document.createElement('style');
        if (!document.querySelector('style[data-reengage-pulse]')) {
            pulseStyle.textContent = '@keyframes pulse-red { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }';
            pulseStyle.setAttribute('data-reengage-pulse', 'true');
            document.head.appendChild(pulseStyle);
        }

        updateCountdown();
        timers.stage3CountdownTimer = setInterval(updateCountdown, 1000);
    }

    function claimBonus(amount) {
        if (timers.stage3CountdownTimer) clearInterval(timers.stage3CountdownTimer);

        api('/api/session-reengage/claim', {
            method: 'POST',
            body: JSON.stringify({ amount: amount })
        }).then(function(response) {
            if (response && response.success) {
                showConfetti();
                showSuccessMessage();
                if (typeof updateBalance === 'function') {
                    updateBalance();
                }
            } else {
                console.warn('SessionReengage: Bonus claim failed - API returned unsuccessful response');
            }
            dismissStage3();
            state.lastClaimTime = Date.now();
            startCooldown();
        }).catch(function(err) {
            console.warn('SessionReengage: Bonus claim error -', err);
            dismissStage3();
            state.lastClaimTime = Date.now();
            startCooldown();
        });
    }

    function showSuccessMessage() {
        var message = document.createElement('div');
        message.setAttribute('style',
            'position: fixed; ' +
            'top: 50%; ' +
            'left: 50%; ' +
            'transform: translate(-50%, -50%); ' +
            'background: rgba(10, 5, 30, 0.98); ' +
            'border: 2px solid #ffd700; ' +
            'border-radius: 10px; ' +
            'padding: 40px; ' +
            'color: #ffd700; ' +
            'font-size: 28px; ' +
            'font-weight: bold; ' +
            'text-align: center; ' +
            'z-index: 9993; ' +
            'animation: bounce-in 0.6s ease-out;'
        );
        message.textContent = '✓ Credits Added!';

        var bounceStyle = document.createElement('style');
        if (!document.querySelector('style[data-reengage-bounce]')) {
            bounceStyle.textContent = '@keyframes bounce-in { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(1.1); } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }';
            bounceStyle.setAttribute('data-reengage-bounce', 'true');
            document.head.appendChild(bounceStyle);
        }

        document.body.appendChild(message);
        setTimeout(function() {
            if (message.parentNode) message.parentNode.removeChild(message);
        }, 2000);
    }

    function showConfetti() {
        var confettiContainer = document.createElement('div');
        confettiContainer.setAttribute('id', 'session-reengage-confetti');
        confettiContainer.setAttribute('style',
            'position: fixed; ' +
            'top: 0; ' +
            'left: 0; ' +
            'width: 100%; ' +
            'height: 100%; ' +
            'pointer-events: none; ' +
            'z-index: 9992;'
        );

        var confettiCount = 50;
        var i;
        for (i = 0; i < confettiCount; i++) {
            var confetti = document.createElement('div');
            var left = Math.random() * 100;
            var delay = Math.random() * 0.5;
            var duration = 2 + Math.random() * 1;
            var rotation = Math.random() * 720;
            var colors = ['#ffd700', '#ff6b35', '#ffffff', '#ffed4e'];
            var color = colors[Math.floor(Math.random() * colors.length)];

            confetti.setAttribute('style',
                'position: fixed; ' +
                'left: ' + left + '%; ' +
                'top: -10px; ' +
                'width: 10px; ' +
                'height: 10px; ' +
                'background: ' + color + '; ' +
                'border-radius: 50%; ' +
                'animation: fall-confetti ' + duration + 's linear ' + delay + 's forwards; ' +
                'opacity: 0.8;'
            );
            confettiContainer.appendChild(confetti);
        }

        var confettiStyle = document.createElement('style');
        if (!document.querySelector('style[data-reengage-confetti]')) {
            confettiStyle.textContent = '@keyframes fall-confetti { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }';
            confettiStyle.setAttribute('data-reengage-confetti', 'true');
            document.head.appendChild(confettiStyle);
        }

        document.body.appendChild(confettiContainer);
        setTimeout(function() {
            if (confettiContainer.parentNode) confettiContainer.parentNode.removeChild(confettiContainer);
        }, 3500);
    }

    function dismissStage3() {
        if (timers.stage3CountdownTimer) clearInterval(timers.stage3CountdownTimer);
        if (elements.stage3Overlay) {
            elements.stage3Overlay.parentNode.removeChild(elements.stage3Overlay);
            elements.stage3Overlay = null;
        }
        elements.stage3Countdown = null;
        state.stage3Shown = false;
        state.currentStage = 0;
    }

    function startCooldown() {
        setTimeout(function() {
            state.lastClaimTime = null;
        }, config.cooldownAfterClaim);
    }

    function clearAllStages() {
        dismissStage1();
        dismissStage2();
        dismissStage3();
    }

    function init() {
        attachActivityListeners();
        resetIdleTimer();
    }

    window.SessionReengage = {
        init: init
    };
})();
