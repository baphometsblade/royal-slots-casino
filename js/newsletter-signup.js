(function() {
    var BANNER_ID = 'newsletter-signup-banner';
    var SUBSCRIBED_KEY = 'newsletter_subscribed';
    var DISMISSED_KEY = 'newsletter_dismissed_session';
    var SHOW_DELAY_MS = 30000;
    var SPIN_THRESHOLD = 5;
    var AUTO_HIDE_MS = 3000;
    var spinCount = 0;
    var bannerShown = false;
    var isProcessing = false;

    async function api(path, opts) {
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
    }

    function shouldShow() {
        var isSubscribed = localStorage.getItem(SUBSCRIBED_KEY) === 'true';
        var isDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
        return !isSubscribed && !isDismissed && !bannerShown;
    }

    function createBannerHTML() {
        var html = '<div id="' + BANNER_ID + '" style="' +
            'position: fixed; ' +
            'bottom: 0; ' +
            'left: 0; ' +
            'right: 0; ' +
            'height: 80px; ' +
            'background: linear-gradient(to bottom, rgba(20,10,40,0.95), rgba(10,5,20,0.98)); ' +
            'border-top: 3px solid #ffd700; ' +
            'display: flex; ' +
            'align-items: center; ' +
            'justify-content: space-between; ' +
            'padding: 0 20px; ' +
            'z-index: 9999; ' +
            'font-family: Arial, sans-serif; ' +
            'box-shadow: 0 -2px 15px rgba(255,215,0,0.2); ' +
            'animation: slideUp 0.4s ease-out; ' +
            '">' +
            '<div style="' +
            'flex: 1; ' +
            'color: #ffffff; ' +
            'font-size: 14px; ' +
            'font-weight: 500; ' +
            'margin-right: 20px; ' +
            '">' +
            '✨ Get exclusive bonuses & free spins delivered to your inbox!' +
            '</div>' +
            '<div style="' +
            'display: flex; ' +
            'align-items: center; ' +
            'gap: 10px; ' +
            'min-width: fit-content; ' +
            '">' +
            '<input id="newsletter-email" type="email" placeholder="your@email.com" style="' +
            'padding: 10px 12px; ' +
            'border: 2px solid #666; ' +
            'background: rgba(30,20,50,0.8); ' +
            'color: #ffffff; ' +
            'border-radius: 4px; ' +
            'font-size: 13px; ' +
            'outline: none; ' +
            'transition: border-color 0.3s; ' +
            'width: 180px; ' +
            '" />' +
            '<button id="newsletter-subscribe-btn" style="' +
            'padding: 10px 18px; ' +
            'background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); ' +
            'color: #000; ' +
            'border: none; ' +
            'border-radius: 4px; ' +
            'font-weight: bold; ' +
            'font-size: 13px; ' +
            'cursor: pointer; ' +
            'transition: all 0.3s; ' +
            'box-shadow: 0 0 15px rgba(255,215,0,0.4); ' +
            'white-space: nowrap; ' +
            '">' +
            'SUBSCRIBE' +
            '</button>' +
            '<button id="newsletter-dismiss-btn" style="' +
            'background: none; ' +
            'border: none; ' +
            'color: #aaa; ' +
            'font-size: 20px; ' +
            'cursor: pointer; ' +
            'padding: 4px 8px; ' +
            'transition: color 0.2s; ' +
            '">' +
            '✕' +
            '</button>' +
            '</div>' +
            '<style>' +
            '@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } } ' +
            '@keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } } ' +
            '@keyframes scaleCheckmark { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } } ' +
            '#newsletter-email:focus { border-color: #ffd700; box-shadow: 0 0 8px rgba(255,215,0,0.3); } ' +
            '#newsletter-subscribe-btn:hover { transform: translateY(-2px); box-shadow: 0 0 20px rgba(255,215,0,0.6); } ' +
            '#newsletter-subscribe-btn:active { transform: translateY(0); } ' +
            '#newsletter-subscribe-btn:disabled { opacity: 0.6; cursor: not-allowed; } ' +
            '#newsletter-dismiss-btn:hover { color: #fff; } ' +
            '</style>' +
            '</div>';
        return html;
    }

    function createSuccessCheckmark() {
        var svg = '<svg width="32" height="32" viewBox="0 0 32 32" style="' +
            'animation: scaleCheckmark 0.5s ease-out; ' +
            'margin-right: 10px; ' +
            '">' +
            '<circle cx="16" cy="16" r="14" fill="none" stroke="#4caf50" stroke-width="2" />' +
            '<polyline points="10,16 14,20 22,12" fill="none" stroke="#4caf50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>';
        return svg;
    }

    function inject() {
        if (document.getElementById(BANNER_ID)) return;
        var div = document.createElement('div');
        div.innerHTML = createBannerHTML();
        document.body.appendChild(div.firstChild);
        attachEventListeners();
    }

    function attachEventListeners() {
        var emailInput = document.getElementById('newsletter-email');
        var subscribeBtn = document.getElementById('newsletter-subscribe-btn');
        var dismissBtn = document.getElementById('newsletter-dismiss-btn');
        var banner = document.getElementById(BANNER_ID);

        if (emailInput && subscribeBtn) {
            subscribeBtn.addEventListener('click', function() {
                handleSubscribe(emailInput.value, banner);
            });
            emailInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleSubscribe(emailInput.value, banner);
                }
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', function() {
                dismissBanner(banner);
            });
        }
    }

    function validateEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async function handleSubscribe(email, banner) {
        if (isProcessing) return;

        if (!validateEmail(email)) {
            console.warn('[Newsletter] Invalid email:', email);
            return;
        }

        isProcessing = true;
        var subscribeBtn = document.getElementById('newsletter-subscribe-btn');
        if (subscribeBtn) {
            subscribeBtn.disabled = true;
            subscribeBtn.textContent = 'SUBSCRIBING...';
        }

        try {
            var response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('casinoToken') ?
                        'Bearer ' + localStorage.getItem('casinoToken') : ''
                },
                body: JSON.stringify({ email: email })
            });

            if (response.ok) {
                localStorage.setItem(SUBSCRIBED_KEY, 'true');
                showSuccessState(banner);
                setTimeout(function() {
                    hideBanner(banner);
                }, AUTO_HIDE_MS);
            } else {
                console.warn('[Newsletter] Subscribe failed:', response.status);
                if (subscribeBtn) {
                    subscribeBtn.disabled = false;
                    subscribeBtn.textContent = 'SUBSCRIBE';
                }
            }
        } catch (err) {
            console.warn('[Newsletter] Subscribe error:', err.message);
            if (subscribeBtn) {
                subscribeBtn.disabled = false;
                subscribeBtn.textContent = 'SUBSCRIBE';
            }
        } finally {
            isProcessing = false;
        }
    }

    function showSuccessState(banner) {
        var emailInput = document.getElementById('newsletter-email');
        var subscribeBtn = document.getElementById('newsletter-subscribe-btn');
        var dismissBtn = document.getElementById('newsletter-dismiss-btn');

        if (emailInput) emailInput.style.display = 'none';
        if (dismissBtn) dismissBtn.style.display = 'none';

        if (subscribeBtn) {
            var checkmark = createSuccessCheckmark();
            subscribeBtn.innerHTML = checkmark + '<span style="vertical-align: middle;">You\'re in!</span>';
            subscribeBtn.disabled = true;
            subscribeBtn.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
            subscribeBtn.style.color = '#fff';
            subscribeBtn.style.cursor = 'default';
        }

        var messageDiv = banner.querySelector('[style*="flex: 1"]');
        if (messageDiv) {
            messageDiv.textContent = '✓ You\'re in! Check your inbox for a welcome bonus.';
            messageDiv.style.color = '#4caf50';
        }
    }

    function dismissBanner(banner) {
        sessionStorage.setItem(DISMISSED_KEY, 'true');
        hideBanner(banner);
    }

    function hideBanner(banner) {
        if (!banner) banner = document.getElementById(BANNER_ID);
        if (banner) {
            banner.style.animation = 'slideDown 0.4s ease-in forwards';
            setTimeout(function() {
                if (banner && banner.parentNode) {
                    banner.parentNode.removeChild(banner);
                }
                bannerShown = false;
            }, 400);
        }
    }

    function checkTriggers() {
        if (!shouldShow()) return;

        setTimeout(function() {
            if (shouldShow()) {
                inject();
                bannerShown = true;
            }
        }, SHOW_DELAY_MS);
    }

    function trackSpinCompletion() {
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('spin:complete', function() {
                spinCount++;
                if (!bannerShown && spinCount >= SPIN_THRESHOLD && shouldShow()) {
                    inject();
                    bannerShown = true;
                }
            });
        }
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                checkTriggers();
                trackSpinCompletion();
            });
        } else {
            checkTriggers();
            trackSpinCompletion();
        }
    }

    window.NewsletterSignup = {
        init: init
    };
})();
