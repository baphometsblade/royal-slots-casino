/* ui-timedchallenge.js — Timed Challenge
 * Sprint 62: Full-screen overlay presenting a 3-minute spin challenge every 2 hours.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'timedChallenge';
    var STORAGE_KEY = 'ms_timedChallenge';
    var Z_INDEX = 99450;
    var COOLDOWN_MS = 2 * 60 * 60 * 1000;
    var CHALLENGE_DURATION = 3 * 60 * 1000; // 3 minutes
    var REQUIRED_SPINS = 10;
    var REWARD_AMOUNT = 10;

    var _challengeActive = false;
    var _spinCount = 0;
    var _timerId = null;
    var _endTime = 0;
    var _tickId = null;
    var _styleEl = null;

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage full */ }
    }

    function _isOnCooldown() {
        var data = _load();
        if (!data || !data.lastShown) return false;
        return (Date.now() - data.lastShown) < COOLDOWN_MS;
    }

    function _formatTime(ms) {
        if (ms <= 0) return '0:00';
        var totalSec = Math.ceil(ms / 1000);
        var min = Math.floor(totalSec / 60);
        var sec = totalSec % 60;
        return min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function _updateTimer() {
        var remaining = _endTime - Date.now();
        var timerEl = document.getElementById(ELEMENT_ID + '_timer');
        if (timerEl) {
            timerEl.textContent = _formatTime(remaining);
        }

        // Update progress ring visual
        var progressEl = document.getElementById(ELEMENT_ID + '_timeProgress');
        if (progressEl) {
            var pct = Math.max(0, remaining / CHALLENGE_DURATION) * 100;
            progressEl.style.width = pct + '%';
        }

        if (remaining <= 0) {
            _challengeFailed();
        }
    }

    function _updateSpinCounter() {
        var counterEl = document.getElementById(ELEMENT_ID + '_spins');
        if (counterEl) {
            counterEl.textContent = _spinCount + '/' + REQUIRED_SPINS;
        }

        // Update spin progress bar
        var spinProgress = document.getElementById(ELEMENT_ID + '_spinProgress');
        if (spinProgress) {
            spinProgress.style.width = ((_spinCount / REQUIRED_SPINS) * 100) + '%';
        }
    }

    function _handleSpin() {
        if (!_challengeActive) return;
        _spinCount++;
        _updateSpinCounter();

        if (_spinCount >= REQUIRED_SPINS) {
            _challengeWon();
        }
    }

    function _challengeWon() {
        _challengeActive = false;
        if (_tickId) { clearInterval(_tickId); _tickId = null; }
        if (_timerId) { clearTimeout(_timerId); _timerId = null; }
        document.removeEventListener('spinComplete', _handleSpin);

        if (typeof window.balance === 'number') {
            window.balance += REWARD_AMOUNT;
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
        }

        var contentEl = document.getElementById(ELEMENT_ID + '_content');
        if (contentEl) {
            // Remove all children
            while (contentEl.firstChild) {
                contentEl.removeChild(contentEl.firstChild);
            }

            var trophy = document.createElement('div');
            trophy.style.cssText = 'font-size:72px;margin-bottom:16px;animation:tcBounce 0.6s ease-out;';
            trophy.textContent = '\uD83C\uDFC6';
            contentEl.appendChild(trophy);

            var winTitle = document.createElement('div');
            winTitle.style.cssText = 'font-size:28px;font-weight:bold;color:#fbbf24;margin-bottom:8px;' +
                'text-shadow:0 0 20px rgba(251,191,36,0.4);';
            winTitle.textContent = 'CHALLENGE COMPLETE!';
            contentEl.appendChild(winTitle);

            var winDesc = document.createElement('div');
            winDesc.style.cssText = 'font-size:16px;color:#94a3b8;margin-bottom:16px;';
            winDesc.textContent = 'You crushed it! ' + REQUIRED_SPINS + ' spins in time!';
            contentEl.appendChild(winDesc);

            var rewardEl = document.createElement('div');
            rewardEl.style.cssText = 'font-size:36px;font-weight:bold;color:#2ecc71;margin-bottom:24px;' +
                'text-shadow:0 0 20px rgba(46,204,113,0.4);';
            rewardEl.textContent = '+$' + REWARD_AMOUNT;
            contentEl.appendChild(rewardEl);

            var doneBtn = document.createElement('button');
            doneBtn.style.cssText = 'background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff;' +
                'border:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:bold;' +
                'cursor:pointer;';
            doneBtn.textContent = 'Awesome!';
            doneBtn.addEventListener('click', function () {
                window.dismissTimedChallenge();
            });
            contentEl.appendChild(doneBtn);
        }
    }

    function _challengeFailed() {
        _challengeActive = false;
        if (_tickId) { clearInterval(_tickId); _tickId = null; }
        if (_timerId) { clearTimeout(_timerId); _timerId = null; }
        document.removeEventListener('spinComplete', _handleSpin);

        var contentEl = document.getElementById(ELEMENT_ID + '_content');
        if (contentEl) {
            while (contentEl.firstChild) {
                contentEl.removeChild(contentEl.firstChild);
            }

            var failIcon = document.createElement('div');
            failIcon.style.cssText = 'font-size:64px;margin-bottom:16px;';
            failIcon.textContent = '\u23F0';
            contentEl.appendChild(failIcon);

            var failTitle = document.createElement('div');
            failTitle.style.cssText = 'font-size:24px;font-weight:bold;color:#e74c3c;margin-bottom:8px;';
            failTitle.textContent = 'Time\'s Up!';
            contentEl.appendChild(failTitle);

            var failDesc = document.createElement('div');
            failDesc.style.cssText = 'font-size:15px;color:#94a3b8;margin-bottom:8px;';
            failDesc.textContent = 'You got ' + _spinCount + '/' + REQUIRED_SPINS + ' spins. Try again later!';
            contentEl.appendChild(failDesc);

            var dismissBtn = document.createElement('button');
            dismissBtn.style.cssText = 'background:#374151;color:#fff;border:none;padding:12px 36px;' +
                'border-radius:10px;font-size:15px;cursor:pointer;margin-top:16px;';
            dismissBtn.textContent = 'OK';
            dismissBtn.addEventListener('click', function () {
                window.dismissTimedChallenge();
            });
            contentEl.appendChild(dismissBtn);
        }
    }

    function _startChallenge() {
        _challengeActive = true;
        _spinCount = 0;
        _endTime = Date.now() + CHALLENGE_DURATION;

        document.addEventListener('spinComplete', _handleSpin);

        // Show active challenge UI
        var preEl = document.getElementById(ELEMENT_ID + '_pre');
        var activeEl = document.getElementById(ELEMENT_ID + '_active');
        if (preEl) preEl.style.display = 'none';
        if (activeEl) activeEl.style.display = 'flex';

        _updateTimer();
        _updateSpinCounter();

        _tickId = setInterval(function () {
            _updateTimer();
        }, 200);

        _timerId = setTimeout(function () {
            if (_challengeActive) _challengeFailed();
        }, CHALLENGE_DURATION);
    }

    function _build() {
        if (document.getElementById(ELEMENT_ID)) return;

        // Keyframes
        if (!_styleEl) {
            _styleEl = document.createElement('style');
            _styleEl.textContent = '@keyframes tcSlideIn{0%{opacity:0;transform:scale(0.85)}100%{opacity:1;transform:scale(1)}}' +
                '@keyframes tcPulse{0%{box-shadow:0 0 0 0 rgba(231,76,60,0.4)}70%{box-shadow:0 0 0 15px rgba(231,76,60,0)}100%{box-shadow:0 0 0 0 rgba(231,76,60,0)}}' +
                '@keyframes tcBounce{0%{transform:scale(0.3)}50%{transform:scale(1.15)}100%{transform:scale(1)}}';
            document.head.appendChild(_styleEl);
        }

        _save({ lastShown: Date.now() });

        var overlay = document.createElement('div');
        overlay.id = ELEMENT_ID;
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(5,5,20,0.96);z-index:' + Z_INDEX + ';display:flex;' +
            'align-items:center;justify-content:center;font-family:Arial,sans-serif;';

        var card = document.createElement('div');
        card.id = ELEMENT_ID + '_content';
        card.style.cssText = 'max-width:420px;width:90%;text-align:center;' +
            'animation:tcSlideIn 0.5s ease-out;';

        // Pre-challenge screen
        var pre = document.createElement('div');
        pre.id = ELEMENT_ID + '_pre';
        pre.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:64px;margin-bottom:16px;';
        icon.textContent = '\u23F1\uFE0F';
        pre.appendChild(icon);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:28px;font-weight:bold;color:transparent;' +
            'background:linear-gradient(135deg,#e74c3c,#f39c12);-webkit-background-clip:text;' +
            'background-clip:text;margin-bottom:8px;';
        title.textContent = 'SPEED CHALLENGE!';
        pre.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:16px;color:#cbd5e1;margin-bottom:6px;line-height:1.5;';
        desc.textContent = 'Spin ' + REQUIRED_SPINS + ' times in 3 minutes for a $' + REWARD_AMOUNT + ' bonus!';
        pre.appendChild(desc);

        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:13px;color:#64748b;margin-bottom:24px;';
        hint.textContent = 'Close this overlay and spin fast to win!';
        pre.appendChild(hint);

        var startBtn = document.createElement('button');
        startBtn.style.cssText = 'background:linear-gradient(135deg,#e74c3c,#f39c12);color:#fff;' +
            'border:none;padding:16px 48px;border-radius:12px;font-size:18px;font-weight:bold;' +
            'cursor:pointer;margin-bottom:12px;transition:transform 0.2s;' +
            'box-shadow:0 4px 20px rgba(231,76,60,0.4);animation:tcPulse 2s infinite;';
        startBtn.textContent = 'Start Challenge';
        startBtn.addEventListener('mouseenter', function () { startBtn.style.transform = 'scale(1.05)'; });
        startBtn.addEventListener('mouseleave', function () { startBtn.style.transform = 'scale(1)'; });
        startBtn.addEventListener('click', function () {
            _startChallenge();
            // Minimize overlay so user can spin
            _minimizeOverlay();
        });
        pre.appendChild(startBtn);

        var skipBtn = document.createElement('button');
        skipBtn.style.cssText = 'background:none;border:1px solid #374151;color:#64748b;' +
            'padding:10px 30px;border-radius:8px;font-size:14px;cursor:pointer;';
        skipBtn.textContent = 'Skip';
        skipBtn.addEventListener('click', function () {
            window.dismissTimedChallenge();
        });
        pre.appendChild(skipBtn);

        card.appendChild(pre);

        // Active challenge UI (hidden initially)
        var active = document.createElement('div');
        active.id = ELEMENT_ID + '_active';
        active.style.cssText = 'display:none;flex-direction:column;align-items:center;';

        var timerLabel = document.createElement('div');
        timerLabel.style.cssText = 'font-size:13px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;';
        timerLabel.textContent = 'Time Remaining';
        active.appendChild(timerLabel);

        var timerVal = document.createElement('div');
        timerVal.id = ELEMENT_ID + '_timer';
        timerVal.style.cssText = 'font-size:48px;font-weight:bold;color:#e74c3c;margin-bottom:12px;' +
            'font-variant-numeric:tabular-nums;';
        timerVal.textContent = '3:00';
        active.appendChild(timerVal);

        // Time progress bar
        var timeBarBg = document.createElement('div');
        timeBarBg.style.cssText = 'width:100%;height:6px;background:#1e293b;border-radius:3px;margin-bottom:20px;overflow:hidden;';
        var timeBarFill = document.createElement('div');
        timeBarFill.id = ELEMENT_ID + '_timeProgress';
        timeBarFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#e74c3c,#f39c12);' +
            'border-radius:3px;transition:width 0.3s linear;';
        timeBarBg.appendChild(timeBarFill);
        active.appendChild(timeBarBg);

        var spinLabel = document.createElement('div');
        spinLabel.style.cssText = 'font-size:13px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;';
        spinLabel.textContent = 'Spins Completed';
        active.appendChild(spinLabel);

        var spinVal = document.createElement('div');
        spinVal.id = ELEMENT_ID + '_spins';
        spinVal.style.cssText = 'font-size:36px;font-weight:bold;color:#fbbf24;margin-bottom:12px;';
        spinVal.textContent = '0/' + REQUIRED_SPINS;
        active.appendChild(spinVal);

        // Spin progress bar
        var spinBarBg = document.createElement('div');
        spinBarBg.style.cssText = 'width:100%;height:10px;background:#1e293b;border-radius:5px;margin-bottom:20px;overflow:hidden;';
        var spinBarFill = document.createElement('div');
        spinBarFill.id = ELEMENT_ID + '_spinProgress';
        spinBarFill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#f39c12,#2ecc71);' +
            'border-radius:5px;transition:width 0.3s ease;';
        spinBarBg.appendChild(spinBarFill);
        active.appendChild(spinBarBg);

        var goSpin = document.createElement('div');
        goSpin.style.cssText = 'font-size:14px;color:#64748b;';
        goSpin.textContent = 'Go spin now! This tracker stays visible.';
        active.appendChild(goSpin);

        var minimizeBtn = document.createElement('button');
        minimizeBtn.style.cssText = 'background:#1e293b;color:#cbd5e1;border:1px solid #374151;' +
            'padding:8px 24px;border-radius:8px;font-size:13px;cursor:pointer;margin-top:12px;';
        minimizeBtn.textContent = 'Minimize';
        minimizeBtn.addEventListener('click', function () {
            _minimizeOverlay();
        });
        active.appendChild(minimizeBtn);

        card.appendChild(active);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    function _minimizeOverlay() {
        var el = document.getElementById(ELEMENT_ID);
        if (!el) return;

        // Convert to a small floating tracker
        el.style.cssText = 'position:fixed;top:12px;right:12px;width:auto;height:auto;' +
            'background:rgba(5,5,20,0.92);z-index:' + Z_INDEX + ';' +
            'border-radius:12px;padding:10px 16px;font-family:Arial,sans-serif;' +
            'border:1px solid rgba(231,76,60,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.5);' +
            'cursor:pointer;display:flex;align-items:center;gap:12px;';

        var content = document.getElementById(ELEMENT_ID + '_content');
        if (content) {
            while (content.firstChild) {
                content.removeChild(content.firstChild);
            }

            var timerSmall = document.createElement('span');
            timerSmall.id = ELEMENT_ID + '_timer';
            timerSmall.style.cssText = 'font-size:18px;font-weight:bold;color:#e74c3c;font-variant-numeric:tabular-nums;';
            timerSmall.textContent = _formatTime(_endTime - Date.now());
            content.appendChild(timerSmall);

            var divider = document.createElement('span');
            divider.style.cssText = 'color:#374151;';
            divider.textContent = '|';
            content.appendChild(divider);

            var spinsSmall = document.createElement('span');
            spinsSmall.id = ELEMENT_ID + '_spins';
            spinsSmall.style.cssText = 'font-size:16px;font-weight:bold;color:#fbbf24;';
            spinsSmall.textContent = _spinCount + '/' + REQUIRED_SPINS;
            content.appendChild(spinsSmall);

            var label = document.createElement('span');
            label.style.cssText = 'font-size:11px;color:#94a3b8;';
            label.textContent = 'spins';
            content.appendChild(label);
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (_isOnCooldown()) return;

        setTimeout(function () {
            _build();
        }, 5000);
    }

    window.dismissTimedChallenge = function () {
        _challengeActive = false;
        if (_tickId) { clearInterval(_tickId); _tickId = null; }
        if (_timerId) { clearTimeout(_timerId); _timerId = null; }
        document.removeEventListener('spinComplete', _handleSpin);

        var el = document.getElementById(ELEMENT_ID);
        if (el) {
            el.style.transition = 'opacity 0.3s, transform 0.3s';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9)';
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
