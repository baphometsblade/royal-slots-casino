(function() {
    'use strict';

    var ELEMENT_ID = 'cashbackTimerOffer';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_cashbackTimer';
    var OFFER_INTERVAL = 7200000;
    var COUNTDOWN_SECONDS = 900;
    var MAX_SPINS = 10;

    var overlayEl = null;
    var badgeEl = null;
    var countdownTimer = null;
    var spinWatcher = null;
    var cashbackActive = false;
    var cashbackSpins = 0;
    var cashbackExpiry = 0;

    function getLastShown() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return 0;
            var data = JSON.parse(saved);
            return data.lastShown || 0;
        } catch (e) {
            return 0;
        }
    }

    function saveLastShown() {
        try {
            var data = { lastShown: Date.now() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* silent */ }
    }

    function shouldShow() {
        var elapsed = Date.now() - getLastShown();
        return elapsed >= OFFER_INTERVAL;
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function showOffer() {
        if (document.getElementById(ELEMENT_ID)) return;

        overlayEl = document.createElement('div');
        overlayEl.id = ELEMENT_ID;
        overlayEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
            'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;' +
            'z-index:' + Z_INDEX + ';font-family:Arial,sans-serif;opacity:0;transition:opacity 0.4s ease;';

        var style = document.createElement('style');
        style.textContent = '@keyframes cashbackSlideIn{0%{transform:scale(0.5) translateY(30px);opacity:0}' +
            '100%{transform:scale(1) translateY(0);opacity:1}}' +
            '@keyframes cashbackCountPulse{0%{color:#2ecc71}50%{color:#ffd700}100%{color:#2ecc71}}';
        overlayEl.appendChild(style);

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#0a1628 0%,#16213e 50%,#0d2137 100%);' +
            'border:2px solid #2ecc71;border-radius:20px;padding:32px;text-align:center;color:#fff;' +
            'max-width:380px;width:92%;box-shadow:0 8px 40px rgba(46,204,113,0.3);' +
            'animation:cashbackSlideIn 0.5s ease forwards;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;margin-bottom:12px;';
        icon.textContent = '\uD83D\uDCB0';
        card.appendChild(icon);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:22px;font-weight:bold;color:#2ecc71;margin-bottom:8px;';
        title.textContent = 'Limited Time Cashback!';
        card.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:14px;color:#ccc;margin-bottom:20px;line-height:1.5;';
        desc.textContent = 'Get 10% back on your next 10 spins. Activate now before time runs out!';
        card.appendChild(desc);

        var timerEl = document.createElement('div');
        timerEl.style.cssText = 'font-size:32px;font-weight:bold;color:#2ecc71;margin-bottom:24px;' +
            'font-variant-numeric:tabular-nums;animation:cashbackCountPulse 3s ease-in-out infinite;';
        timerEl.textContent = 'Offer expires in: ' + formatTime(COUNTDOWN_SECONDS);
        card.appendChild(timerEl);

        var remaining = COUNTDOWN_SECONDS;
        var offerCountdown = setInterval(function() {
            remaining--;
            if (remaining <= 0) {
                clearInterval(offerCountdown);
                dismissOffer();
                return;
            }
            timerEl.textContent = 'Offer expires in: ' + formatTime(remaining);
            if (remaining <= 60) {
                timerEl.style.color = '#e74c3c';
            }
        }, 1000);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

        var activateBtn = document.createElement('button');
        activateBtn.style.cssText = 'background:linear-gradient(135deg,#2ecc71 0%,#27ae60 100%);color:#fff;' +
            'border:none;border-radius:10px;padding:14px 28px;font-size:16px;font-weight:bold;cursor:pointer;' +
            'transition:transform 0.2s,box-shadow 0.2s;flex:1;max-width:180px;';
        activateBtn.textContent = 'Activate Cashback';
        activateBtn.addEventListener('mouseenter', function() {
            activateBtn.style.transform = 'scale(1.05)';
            activateBtn.style.boxShadow = '0 4px 16px rgba(46,204,113,0.5)';
        });
        activateBtn.addEventListener('mouseleave', function() {
            activateBtn.style.transform = 'scale(1)';
            activateBtn.style.boxShadow = 'none';
        });
        activateBtn.addEventListener('click', function() {
            clearInterval(offerCountdown);
            activateCashback();
            dismissOffer();
        });
        btnRow.appendChild(activateBtn);

        var skipBtn = document.createElement('button');
        skipBtn.style.cssText = 'background:transparent;color:#888;border:1px solid #444;' +
            'border-radius:10px;padding:14px 20px;font-size:14px;cursor:pointer;' +
            'transition:color 0.2s,border-color 0.2s;flex:0.7;max-width:120px;';
        skipBtn.textContent = 'Not Now';
        skipBtn.addEventListener('mouseenter', function() {
            skipBtn.style.color = '#ccc';
            skipBtn.style.borderColor = '#888';
        });
        skipBtn.addEventListener('mouseleave', function() {
            skipBtn.style.color = '#888';
            skipBtn.style.borderColor = '#444';
        });
        skipBtn.addEventListener('click', function() {
            clearInterval(offerCountdown);
            dismissOffer();
        });
        btnRow.appendChild(skipBtn);

        card.appendChild(btnRow);
        overlayEl.appendChild(card);
        document.body.appendChild(overlayEl);

        saveLastShown();

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                overlayEl.style.opacity = '1';
            });
        });
    }

    function dismissOffer() {
        if (!overlayEl) return;
        overlayEl.style.opacity = '0';
        var el = overlayEl;
        setTimeout(function() {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 500);
        overlayEl = null;
    }

    function activateCashback() {
        cashbackActive = true;
        cashbackSpins = 0;
        cashbackExpiry = Date.now() + (COUNTDOWN_SECONDS * 1000);
        showBadge();
        startSpinWatcher();
    }

    function showBadge() {
        if (badgeEl && badgeEl.parentNode) {
            badgeEl.parentNode.removeChild(badgeEl);
        }
        badgeEl = document.createElement('div');
        badgeEl.style.cssText = 'position:fixed;top:50px;right:8px;' +
            'background:linear-gradient(135deg,#2ecc71 0%,#27ae60 100%);color:#fff;' +
            'font-family:Arial,sans-serif;font-size:11px;font-weight:bold;' +
            'padding:4px 10px;border-radius:6px;z-index:' + Z_INDEX + ';' +
            'box-shadow:0 2px 8px rgba(46,204,113,0.4);user-select:none;';
        badgeEl.textContent = 'CB ACTIVE';
        document.body.appendChild(badgeEl);
    }

    function hideBadge() {
        if (badgeEl && badgeEl.parentNode) {
            badgeEl.parentNode.removeChild(badgeEl);
            badgeEl = null;
        }
    }

    function startSpinWatcher() {
        if (spinWatcher) clearInterval(spinWatcher);
        spinWatcher = setInterval(function() {
            if (!cashbackActive) {
                clearInterval(spinWatcher);
                spinWatcher = null;
                return;
            }
            if (Date.now() >= cashbackExpiry || cashbackSpins >= MAX_SPINS) {
                endCashback();
            }
        }, 1000);
    }

    function endCashback() {
        cashbackActive = false;
        if (spinWatcher) {
            clearInterval(spinWatcher);
            spinWatcher = null;
        }
        hideBadge();
        showResultToast();
    }

    function showResultToast() {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:80px;right:20px;' +
            'background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:1px solid #2ecc71;' +
            'border-radius:10px;padding:14px 18px;z-index:' + Z_INDEX + ';' +
            'font-family:Arial,sans-serif;color:#fff;max-width:260px;' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.5);transform:translateX(120%);' +
            'transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);';

        var toastTitle = document.createElement('div');
        toastTitle.style.cssText = 'font-size:14px;font-weight:bold;color:#2ecc71;margin-bottom:4px;';
        toastTitle.textContent = 'Cashback Complete!';
        toast.appendChild(toastTitle);

        var spinsUsed = Math.min(cashbackSpins, MAX_SPINS);
        var toastText = document.createElement('div');
        toastText.style.cssText = 'font-size:12px;color:#ccc;';
        toastText.textContent = 'Used ' + spinsUsed + '/' + MAX_SPINS + ' cashback spins. Thanks for playing!';
        toast.appendChild(toastText);

        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.style.transform = 'translateX(0)';
            });
        });

        setTimeout(function() {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 500);
        }, 5000);
    }

    function scheduleNextOffer() {
        var elapsed = Date.now() - getLastShown();
        var wait = Math.max(0, OFFER_INTERVAL - elapsed);
        setTimeout(function() {
            if (shouldShow()) {
                showOffer();
            }
            setInterval(function() {
                if (shouldShow() && !cashbackActive) {
                    showOffer();
                }
            }, OFFER_INTERVAL);
        }, wait);
    }

    function init() {
        scheduleNextOffer();
    }

    function cleanup() {
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
        if (spinWatcher) { clearInterval(spinWatcher); spinWatcher = null; }
        dismissOffer();
        hideBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 9000);
        });
    } else {
        setTimeout(init, 9000);
    }

    window._cashbackTimer = { cleanup: cleanup, show: showOffer, trackSpin: function() {
        if (cashbackActive) { cashbackSpins++; }
    }};
})();
