(function() {
    'use strict';

    var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    var heroContainer = null;
    var countdownInterval = null;

    function isLoggedIn() {
        var token = localStorage.getItem(tokenKey);
        return !!token;
    }

    function shouldShowHero() {
        var pathname = window.location.pathname;
        var isHomepage = pathname === '/' || pathname === '/index.html' || pathname === '';
        return isHomepage && !isLoggedIn();
    }

    function getRandomStats() {
        var playersOnline = Math.floor(Math.random() * 350) + 150;
        var wonToday = Math.floor(Math.random() * 150000) + 50000;
        var jackpotsHit = Math.floor(Math.random() * 12) + 3;
        return {
            players: playersOnline,
            won: wonToday,
            jackpots: jackpotsHit
        };
    }

    function getRandomCountdownHours() {
        return Math.floor(Math.random() * 4) + 2;
    }

    function formatCurrency(num) {
        if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
        return '$' + num;
    }

    function createHeroSection() {
        var stats = getRandomStats();
        var countdownHours = getRandomCountdownHours();
        var countdownSeconds = countdownHours * 3600;

        var heroDiv = document.createElement('div');
        heroDiv.id = 'hero-enhance-section';
        heroDiv.style.cssText = 'position: relative; width: 100%; background: linear-gradient(135deg, #0a0015 0%, #1a0a3e 50%, #0d001a 100%); overflow: hidden; z-index: 100;';

        var particlesHTML = '';
        for (var i = 0; i < 18; i++) {
            var left = Math.random() * 100;
            var delay = Math.random() * 3;
            var duration = Math.random() * 8 + 12;
            particlesHTML += '<div style="position: absolute; width: 4px; height: 4px; background: rgba(255, 215, 0, ' + (Math.random() * 0.6 + 0.3) + '); border-radius: 50%; left: ' + left + '%; bottom: -10px; animation: float-up ' + duration + 's linear ' + delay + 's infinite;"></div>';
        }

        var statsText = stats.players + ' Players Online • ' + formatCurrency(stats.won) + ' Won Today • ' + stats.jackpots + ' Jackpots Hit';

        heroDiv.innerHTML = '<style>' +
            '@keyframes float-up { 0% { bottom: -10px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { bottom: 100vh; opacity: 0; } }' +
            '@keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); } 50% { box-shadow: 0 0 40px rgba(255, 215, 0, 1); } }' +
            '</style>' +
            '<div style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; opacity: 0.3;">' + particlesHTML + '</div>' +
            '<div style="position: relative; z-index: 2; padding: 80px 40px; text-align: center; max-width: 800px; margin: 0 auto;">' +
            '<h1 style="font-size: 2.5rem; font-weight: 800; margin: 0 0 20px 0; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Welcome to Matrix Spins</h1>' +
            '<h2 style="font-size: 1.2rem; color: rgba(255, 255, 255, 0.85); margin: 0 0 40px 0; font-weight: 300;">The #1 Online Slot Casino</h2>' +
            '<div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 40px; flex-wrap: wrap;">' +
            '<div style="color: #ffd700; font-size: 1rem;">🎰 50+ Premium Slots</div>' +
            '<div style="color: #ffd700; font-size: 1rem;">💰 $5,000 Free Credits</div>' +
            '<div style="color: #ffd700; font-size: 1rem;">🏆 Daily Jackpots</div>' +
            '</div>' +
            '<div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; padding: 15px 20px; margin-bottom: 40px; font-size: 0.95rem; color: #fff;">' +
            statsText +
            '</div>' +
            '<div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 40px; flex-wrap: wrap;">' +
            '<button id="hero-play-btn" style="padding: 16px 32px; font-size: 1rem; font-weight: 700; color: #0a0015; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border: none; border-radius: 8px; cursor: pointer; animation: pulse-glow 2s ease-in-out infinite; transition: transform 0.2s;">PLAY NOW — GET $5,000 FREE</button>' +
            '<button id="hero-login-btn" style="padding: 14px 28px; font-size: 0.95rem; font-weight: 600; color: #fff; background: transparent; border: 2px solid #fff; border-radius: 8px; cursor: pointer; transition: all 0.2s;">Login</button>' +
            '</div>' +
            '<div style="display: flex; justify-content: center; gap: 25px; flex-wrap: wrap; font-size: 0.9rem; color: rgba(255, 255, 255, 0.8); border-top: 1px solid rgba(255, 215, 0, 0.2); padding-top: 25px;">' +
            '<div>🔒 Provably Fair</div>' +
            '<div>🏦 Secure Payments</div>' +
            '<div>📱 Mobile Ready</div>' +
            '<div>⚡ Instant Play</div>' +
            '</div>' +
            '</div>' +
            '</div>';

        return { element: heroDiv, countdownSeconds: countdownSeconds };
    }

    function createCountdownBar(initialSeconds) {
        var countdownDiv = document.createElement('div');
        countdownDiv.id = 'hero-countdown-bar';
        var remaining = initialSeconds;

        function updateCountdown() {
            var hours = Math.floor(remaining / 3600);
            var minutes = Math.floor((remaining % 3600) / 60);
            var seconds = remaining % 60;
            var timeStr = (hours > 0 ? hours + 'h ' : '') + (minutes > 0 ? minutes + 'm ' : '') + seconds + 's';
            countdownDiv.querySelector('[data-countdown-time]').textContent = timeStr;
            remaining--;
            if (remaining < 0) {
                remaining = initialSeconds;
            }
        }

        countdownDiv.style.cssText = 'width: 100%; background: linear-gradient(90deg, #ff4500 0%, #ff8c00 100%); padding: 12px 20px; text-align: center; font-size: 0.95rem; color: #fff; font-weight: 600; z-index: 99;';
        countdownDiv.innerHTML = '🔥 Limited Time: 200% First Deposit Bonus — <span data-countdown-time>' + initialSeconds + 's</span> remaining';

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);

        return countdownDiv;
    }

    function setupEventListeners() {
        var playBtn = document.getElementById('hero-play-btn');
        var loginBtn = document.getElementById('hero-login-btn');

        if (playBtn) {
            playBtn.addEventListener('click', function() {
                var signupSection = document.querySelector('#signup, #register, .auth-form');
                if (signupSection) {
                    signupSection.scrollIntoView({ behavior: 'smooth' });
                } else if (typeof window.showRegisterModal === 'function') {
                    window.showRegisterModal();
                } else {
                    window.location.hash = 'register';
                }
            });

            playBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
            });
            playBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        }

        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                if (typeof window.showLoginModal === 'function') {
                    window.showLoginModal();
                } else {
                    window.location.hash = 'login';
                }
            });

            loginBtn.addEventListener('mouseenter', function() {
                this.style.color = '#ffd700';
                this.style.borderColor = '#ffd700';
            });
            loginBtn.addEventListener('mouseleave', function() {
                this.style.color = '#fff';
                this.style.borderColor = '#fff';
            });
        }
    }

    function hideHero() {
        if (heroContainer) {
            heroContainer.style.display = 'none';
        }
        var countdownBar = document.getElementById('hero-countdown-bar');
        if (countdownBar) {
            countdownBar.style.display = 'none';
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    }

    function listenForLogin() {
        window.addEventListener('storage', function(e) {
            if (e.key === tokenKey && e.newValue) {
                hideHero();
            }
        });
    }

    function init() {
        if (!shouldShowHero()) {
            console.warn('HeroEnhance: Skipping hero section (logged in or not homepage)');
            return;
        }

        var heroData = createHeroSection();
        heroContainer = heroData.element;

        var insertPoint = document.body.firstChild;
        if (document.body.firstChild === document.querySelector('script')) {
            insertPoint = document.body.firstChild.nextSibling || document.body;
        }

        if (insertPoint && insertPoint !== document.body) {
            document.body.insertBefore(heroContainer, insertPoint);
        } else {
            document.body.prepend(heroContainer);
        }

        var countdownBar = createCountdownBar(heroData.countdownSeconds);
        if (heroContainer.nextSibling) {
            document.body.insertBefore(countdownBar, heroContainer.nextSibling);
        } else {
            document.body.appendChild(countdownBar);
        }

        setupEventListeners();
        listenForLogin();

        console.warn('HeroEnhance: Hero section initialized successfully');
    }

    window.HeroEnhance = {
        init: init
    };

})();
