(function() {
    'use strict';

    var LAST_SESSION_KEY = 'comeback_lastSessionTime';
    var SESSION_FLAG_KEY = 'comeback_sessionFlag';
    var OVERLAY_ID = 'comeback-offer-overlay';
    var MODAL_ID = 'comeback-offer-modal';
    var PARTICLES_ID = 'comeback-offer-particles';

    var state = {
        offerShown: false,
        currentOffer: null,
        countdownInterval: null
    };

    var offers = {
        firstSession: {
            title: 'Welcome Aboard!',
            subtitle: 'First Time Here?',
            description: 'Start your casino journey with a bonus pack',
            gems: 100,
            bonus: null,
            icon: '🎰',
            color: '#ffd700'
        },
        dayGap: {
            title: 'Welcome Back!',
            subtitle: 'We Missed You!',
            description: 'You\'ve been away for 24 hours. Claim your comeback bonus!',
            gems: 200,
            bonus: null,
            icon: '👋',
            color: '#ffd700'
        },
        threeDayGap: {
            title: 'We Missed You!',
            subtitle: 'Come Back for Big Rewards',
            description: 'It\'s been 3 days! Get bonus gems and a 50% deposit boost',
            gems: 500,
            depositBoost: 0.5,
            icon: '💎',
            color: '#ff8c00'
        },
        sevenDayGap: {
            title: 'VIP Comeback',
            subtitle: 'Royal Return Welcome',
            description: 'You\'ve been gone a week! Claim exclusive VIP rewards: 1000 gems, 100% deposit match + 10 free spins',
            gems: 1000,
            depositBoost: 1.0,
            freeSpins: 10,
            icon: '👑',
            color: '#ff00ff'
        }
    };

    // Helper: API wrapper
    async function api(path, opts) {
        opts = opts || {};
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return null;

        try {
            var response = await fetch(path, {
                method: opts.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    ...(opts.headers || {})
                },
                body: opts.body ? JSON.stringify(opts.body) : undefined
            });
            if (!response.ok) {
                console.warn('[ComebackOffers] API error:', response.status);
                return null;
            }
            return await response.json();
        } catch (err) {
            console.warn('[ComebackOffers] API call failed:', err.message);
            return null;
        }
    }

    // Helper: Get username from currentUser
    function getUsername() {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
            return currentUser.username;
        }
        var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!token) return 'Friend';
        try {
            var parts = token.split('.');
            if (parts.length === 3) {
                var payload = JSON.parse(atob(parts[1]));
                return payload.username || payload.sub || 'Friend';
            }
        } catch (e) {
            // Silently fail
        }
        return 'Friend';
    }

    // Helper: Determine offer based on gap
    function getOfferType() {
        var lastSession = localStorage.getItem(LAST_SESSION_KEY);
        var now = Date.now();

        if (!lastSession) {
            return 'firstSession';
        }

        var lastTime = parseInt(lastSession, 10);
        var gapMs = now - lastTime;
        var gapDays = gapMs / (1000 * 60 * 60 * 24);

        if (gapDays >= 7) {
            return 'sevenDayGap';
        } else if (gapDays >= 3) {
            return 'threeDayGap';
        } else if (gapDays >= 1) {
            return 'dayGap';
        }

        return null;
    }

    // Helper: Create particle animation
    function createParticles() {
        var container = document.createElement('div');
        container.id = PARTICLES_ID;
        container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9999;';

        var style = document.createElement('style');
        style.textContent = `
            #${PARTICLES_ID} {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 9999;
            }
            .comeback-particle {
                position: absolute;
                font-size: 30px;
                opacity: 0.8;
                pointer-events: none;
            }
            @keyframes comebackFall {
                0% {
                    transform: translateY(-100px) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(window.innerHeight + 100px) rotate(360deg);
                    opacity: 0;
                }
            }
            .comeback-particle {
                animation: comebackFall 3s ease-in forwards;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(container);

        // Create 15-20 falling particles
        for (var i = 0; i < 18; i++) {
            var particle = document.createElement('div');
            particle.className = 'comeback-particle';
            particle.textContent = ['💎', '🎰', '⭐', '💰', '🏆'][Math.floor(Math.random() * 5)];
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = '-50px';
            particle.style.animationDelay = (i * 0.15) + 's';
            container.appendChild(particle);
        }

        setTimeout(function() {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 5000);
    }

    // Helper: Apply bonus to state
    function applyBonus(offer) {
        if (!offer) return;

        if (offer.gems > 0) {
            if (typeof balance !== 'undefined') {
                balance += offer.gems;
                if (typeof saveBalance === 'function') {
                    saveBalance();
                }
                if (typeof updateBalance === 'function') {
                    updateBalance();
                }
            }
        }

        // Show notification
        if (typeof showWinToast === 'function') {
            showWinToast('🎉 Bonus Claimed! +' + offer.gems + ' Gems');
        } else {
            var toast = document.createElement('div');
            toast.textContent = '🎉 Bonus Claimed! +' + offer.gems + ' Gems';
            toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:15px 25px;border-radius:10px;z-index:99999;font-size:1rem;border:2px solid #ffd700;';
            document.body.appendChild(toast);
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 3000);
        }

        // Optional: POST to server if gems endpoint exists
        if (offer.gems > 0 && typeof api === 'function') {
            api('/api/gems/add', {
                method: 'POST',
                body: { amount: offer.gems }
            }).catch(function() {
                // Server endpoint may not exist; fail silently
            });
        }
    }

    // Create overlay HTML
    function createOverlay() {
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }

        var offerType = getOfferType();
        if (!offerType) {
            return;
        }

        var offer = offers[offerType];
        if (!offer) {
            return;
        }

        state.currentOffer = offer;
        var username = getUsername();

        var style = document.createElement('style');
        style.textContent = `
            #${OVERLAY_ID} {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9500;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.3s ease-in;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            #${MODAL_ID} {
                background: linear-gradient(135deg, #1a0033 0%, #2d0052 50%, #1a0033 100%);
                border: 3px solid ${offer.color};
                border-radius: 25px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                color: #fff;
                font-family: Arial, sans-serif;
                box-shadow: 0 0 60px ${offer.color}, inset 0 0 30px rgba(255, 215, 0, 0.1);
                animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
            }
            @keyframes slideUp {
                from {
                    transform: translateY(100px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            .comeback-icon {
                font-size: 80px;
                margin-bottom: 20px;
                animation: bounce 1s ease-in-out infinite;
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
            }
            .comeback-title {
                font-size: 32px;
                font-weight: bold;
                color: ${offer.color};
                margin-bottom: 8px;
                text-shadow: 0 0 10px ${offer.color};
            }
            .comeback-subtitle {
                font-size: 16px;
                color: #ccc;
                margin-bottom: 20px;
                font-style: italic;
            }
            .comeback-greeting {
                font-size: 14px;
                color: #ffd700;
                margin-bottom: 25px;
                letter-spacing: 1px;
            }
            .comeback-description {
                font-size: 14px;
                color: #e0e0e0;
                line-height: 1.6;
                margin-bottom: 30px;
            }
            .comeback-rewards {
                background: rgba(255, 215, 0, 0.1);
                border: 2px solid ${offer.color};
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 30px;
                text-align: center;
            }
            .comeback-reward-item {
                margin: 10px 0;
                font-size: 16px;
                color: #ffd700;
                font-weight: bold;
            }
            .comeback-gem-amount {
                font-size: 24px;
                color: #ffd700;
            }
            .comeback-countdown {
                font-size: 12px;
                color: #ff6b6b;
                margin: 15px 0 0 0;
                font-weight: bold;
            }
            .comeback-buttons {
                display: flex;
                gap: 12px;
                margin-top: 25px;
            }
            .comeback-btn {
                flex: 1;
                padding: 14px 20px;
                border: none;
                border-radius: 10px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .comeback-btn-claim {
                background: linear-gradient(135deg, ${offer.color}, #ff8c00);
                color: #000;
                box-shadow: 0 0 20px ${offer.color};
            }
            .comeback-btn-claim:hover {
                transform: scale(1.05);
                box-shadow: 0 0 40px ${offer.color};
            }
            .comeback-btn-claim:active {
                transform: scale(0.98);
            }
            .comeback-btn-dismiss {
                background: rgba(255, 215, 0, 0.2);
                color: ${offer.color};
                border: 2px solid ${offer.color};
            }
            .comeback-btn-dismiss:hover {
                background: rgba(255, 215, 0, 0.3);
            }
        `;
        document.head.appendChild(style);

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var modal = document.createElement('div');
        modal.id = MODAL_ID;

        var rewardsHtml = '<div class="comeback-reward-item comeback-gem-amount">💎 ' + offer.gems + ' Gems</div>';
        if (offer.depositBoost) {
            rewardsHtml += '<div class="comeback-reward-item">+ ' + Math.round(offer.depositBoost * 100) + '% Deposit Boost</div>';
        }
        if (offer.freeSpins) {
            rewardsHtml += '<div class="comeback-reward-item">+ ' + offer.freeSpins + ' Free Spins</div>';
        }

        modal.innerHTML = `
            <div class="comeback-icon">${offer.icon}</div>
            <div class="comeback-title">${offer.title}</div>
            <div class="comeback-subtitle">${offer.subtitle}</div>
            <div class="comeback-greeting">Hello, ${username}!</div>
            <div class="comeback-description">${offer.description}</div>
            <div class="comeback-rewards">
                ${rewardsHtml}
                <div class="comeback-countdown">Claim within <span id="comeback-countdown-timer">10:00</span></div>
            </div>
            <div class="comeback-buttons">
                <button class="comeback-btn comeback-btn-claim" id="comeback-claim-btn">CLAIM NOW</button>
                <button class="comeback-btn comeback-btn-dismiss" id="comeback-dismiss-btn">Maybe Later</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Wire buttons
        var claimBtn = document.getElementById('comeback-claim-btn');
        var dismissBtn = document.getElementById('comeback-dismiss-btn');

        if (claimBtn) {
            claimBtn.addEventListener('click', function() {
                claimReward();
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', function() {
                dismiss();
            });
        }

        // Start countdown
        startCountdown();
    }

    // Start countdown timer (10 minutes, expires offer)
    function startCountdown() {
        var timeLeft = 600; // 10 minutes in seconds

        function updateTimer() {
            var mins = Math.floor(timeLeft / 60);
            var secs = timeLeft % 60;
            var timerEl = document.getElementById('comeback-countdown-timer');
            if (timerEl) {
                timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
            }
            timeLeft--;

            if (timeLeft < 0) {
                if (state.countdownInterval) {
                    clearInterval(state.countdownInterval);
                }
                dismiss();
            }
        }

        updateTimer();
        state.countdownInterval = setInterval(updateTimer, 1000);
    }

    // Claim reward
    function claimReward() {
        if (!state.currentOffer) return;

        // Particle animation
        createParticles();

        // Apply bonus
        applyBonus(state.currentOffer);

        // Dismiss overlay
        dismiss();
    }

    // Dismiss overlay
    function dismiss() {
        if (state.countdownInterval) {
            clearInterval(state.countdownInterval);
        }

        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }

        state.offerShown = true;
    }

    // Public API
    var publicAPI = {
        init: function() {
            // Session guard: only show once per session
            if (state.offerShown || sessionStorage.getItem(SESSION_FLAG_KEY)) {
                return;
            }
            sessionStorage.setItem(SESSION_FLAG_KEY, '1');

            // Determine if we should show offer BEFORE updating timestamp
            var offerType = getOfferType();

            // Update last session time (after checking gap)
            localStorage.setItem(LAST_SESSION_KEY, Date.now().toString());
            if (!offerType) {
                return;
            }

            // Create and show overlay
            createOverlay();
        },

        dismiss: dismiss
    };

    window.ComebackOffers = publicAPI;

})();
