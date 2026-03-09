(function() {
    'use strict';

    var ELEMENT_ID = 'progressiveBonusMeter';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_progressiveBonus';
    var MIN_INCREMENT = 5;
    var MAX_INCREMENT = 15;
    var MIN_BONUS = 2;
    var MAX_BONUS = 10;
    var METER_HEIGHT = 200;
    var METER_WIDTH = 16;
    var POLL_INTERVAL = 3000;

    var meterWrap = null;
    var fillBar = null;
    var pctLabel = null;
    var currentProgress = 0;
    var lastSpinCount = 0;
    var celebrationOverlay = null;
    var pollTimer = null;

    function loadProgress() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var data = JSON.parse(saved);
                currentProgress = data.progress || 0;
                lastSpinCount = data.lastSpinCount || 0;
            }
        } catch (e) { /* ignore */ }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                progress: currentProgress,
                lastSpinCount: lastSpinCount
            }));
        } catch (e) { /* ignore */ }
    }

    function getColor(pct) {
        if (pct >= 100) return '#ffd700';
        if (pct >= 67) return '#e74c3c';
        if (pct >= 34) return '#f1c40f';
        return '#3498db';
    }

    function getGlow(pct) {
        if (pct >= 90) return '0 0 12px rgba(255,215,0,0.8),0 0 24px rgba(255,215,0,0.4)';
        if (pct >= 67) return '0 0 8px rgba(231,76,60,0.6)';
        if (pct >= 34) return '0 0 6px rgba(241,196,15,0.4)';
        return '0 0 4px rgba(52,152,219,0.3)';
    }

    function createMeter() {
        if (document.getElementById(ELEMENT_ID)) return;

        meterWrap = document.createElement('div');
        meterWrap.id = ELEMENT_ID;
        meterWrap.style.cssText = 'position:fixed;right:12px;top:50%;transform:translateY(-50%);width:' + (METER_WIDTH + 30) + 'px;height:' + (METER_HEIGHT + 20) + 'px;z-index:' + Z_INDEX + ';font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;gap:4px;pointer-events:none;';

        var track = document.createElement('div');
        track.style.cssText = 'width:' + METER_WIDTH + 'px;height:' + METER_HEIGHT + 'px;background:#111;border:2px solid #333;border-radius:' + (METER_WIDTH / 2) + 'px;position:relative;overflow:hidden;';

        fillBar = document.createElement('div');
        fillBar.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:0%;background:#3498db;border-radius:' + (METER_WIDTH / 2 - 1) + 'px;transition:height 0.6s ease,background-color 0.6s ease,box-shadow 0.6s ease;';

        track.appendChild(fillBar);

        pctLabel = document.createElement('div');
        pctLabel.style.cssText = 'color:#ffd700;font-size:11px;font-weight:bold;text-shadow:0 0 4px rgba(255,215,0,0.4);writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);';
        pctLabel.textContent = '0%';

        meterWrap.appendChild(pctLabel);
        meterWrap.appendChild(track);
        document.body.appendChild(meterWrap);

        var styleId = ELEMENT_ID + '_style';
        if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.textContent = '@keyframes progPulse{0%,100%{box-shadow:0 0 8px rgba(255,215,0,0.4)}50%{box-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.3)}}@keyframes progFlash{0%{background:#ffd700}50%{background:#fff}100%{background:#ffd700}}';
            document.head.appendChild(style);
        }

        updateDisplay();
    }

    function updateDisplay() {
        if (!fillBar || !pctLabel) return;
        var pct = Math.min(currentProgress, 100);
        fillBar.style.height = pct + '%';
        fillBar.style.background = getColor(pct);
        fillBar.style.boxShadow = getGlow(pct);
        pctLabel.textContent = Math.floor(pct) + '%';

        if (pct >= 80) {
            fillBar.style.animation = 'progPulse 1s ease-in-out infinite';
        } else {
            fillBar.style.animation = 'none';
        }
    }

    function awardBonus() {
        var bonus = MIN_BONUS + Math.random() * (MAX_BONUS - MIN_BONUS);
        bonus = Math.round(bonus * 100) / 100;

        if (typeof balance !== 'undefined') {
            balance += bonus;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }

        showCelebration(bonus);
        currentProgress = 0;
        saveProgress();

        setTimeout(function() {
            updateDisplay();
        }, 500);
    }

    function showCelebration(bonus) {
        if (celebrationOverlay && celebrationOverlay.parentNode) {
            celebrationOverlay.parentNode.removeChild(celebrationOverlay);
        }

        celebrationOverlay = document.createElement('div');
        celebrationOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:' + (Z_INDEX + 2) + ';display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Arial,Helvetica,sans-serif;opacity:0;transition:opacity 0.4s ease;';

        var card = document.createElement('div');
        card.style.cssText = 'text-align:center;padding:30px 40px;background:linear-gradient(135deg,#1a1a2e,#16213e);border:3px solid #ffd700;border-radius:16px;box-shadow:0 0 40px rgba(255,215,0,0.5);transform:scale(0.8);transition:transform 0.4s ease;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;margin-bottom:10px;';
        icon.textContent = '\uD83C\uDF89';

        var title = document.createElement('div');
        title.style.cssText = 'color:#ffd700;font-size:24px;font-weight:bold;text-shadow:0 0 12px rgba(255,215,0,0.5);margin-bottom:8px;';
        title.textContent = 'BONUS AWARDED!';

        var amount = document.createElement('div');
        amount.style.cssText = 'color:#2ecc71;font-size:30px;font-weight:bold;text-shadow:0 0 10px rgba(46,204,113,0.5);margin-bottom:16px;';
        amount.textContent = '+$' + bonus.toFixed(2);

        var desc = document.createElement('div');
        desc.style.cssText = 'color:#aaa;font-size:13px;margin-bottom:16px;';
        desc.textContent = 'Progress meter complete! Keep spinning for more bonuses.';

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:linear-gradient(135deg,#ffd700,#daa520);color:#1a1a2e;border:none;padding:10px 30px;font-size:16px;font-weight:bold;border-radius:8px;cursor:pointer;transition:transform 0.2s;';
        closeBtn.textContent = 'AWESOME!';
        closeBtn.onmouseenter = function() { closeBtn.style.transform = 'scale(1.05)'; };
        closeBtn.onmouseleave = function() { closeBtn.style.transform = 'scale(1)'; };
        closeBtn.addEventListener('click', function() {
            celebrationOverlay.style.opacity = '0';
            setTimeout(function() {
                if (celebrationOverlay && celebrationOverlay.parentNode) {
                    celebrationOverlay.parentNode.removeChild(celebrationOverlay);
                    celebrationOverlay = null;
                }
            }, 400);
        });

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(amount);
        card.appendChild(desc);
        card.appendChild(closeBtn);
        celebrationOverlay.appendChild(card);
        document.body.appendChild(celebrationOverlay);

        requestAnimationFrame(function() {
            celebrationOverlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });
    }

    function getCurrentSpinCount() {
        if (typeof stats !== 'undefined' && stats && typeof stats.totalSpins !== 'undefined') {
            return stats.totalSpins;
        }
        if (typeof window._totalSpins !== 'undefined') {
            return window._totalSpins;
        }
        return 0;
    }

    function checkForSpins() {
        var currentSpins = getCurrentSpinCount();
        if (currentSpins > lastSpinCount) {
            var newSpins = currentSpins - lastSpinCount;
            lastSpinCount = currentSpins;

            for (var i = 0; i < newSpins; i++) {
                var increment = MIN_INCREMENT + Math.random() * (MAX_INCREMENT - MIN_INCREMENT);
                currentProgress += increment;
            }

            if (currentProgress >= 100) {
                currentProgress = 100;
                updateDisplay();
                setTimeout(function() {
                    awardBonus();
                }, 800);
            } else {
                updateDisplay();
            }

            saveProgress();
        }
    }

    function init() {
        loadProgress();
        createMeter();
        lastSpinCount = getCurrentSpinCount();
        pollTimer = setInterval(checkForSpins, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 4500);
        });
    } else {
        setTimeout(init, 4500);
    }
})();
