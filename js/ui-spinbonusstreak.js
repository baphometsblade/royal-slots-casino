// Sprint 70: Spin Bonus Streak — fixed panel tracking consecutive spin streak
// Increments on each spin. Bonuses at 10/25/50/100 spins. Resets after 5min idle.
(function() {
    'use strict';

    var ELEMENT_ID = 'betStreakTracker';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_betStreak';
    var IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    var POLL_INTERVAL = 2000;

    var STREAK_BONUSES = [
        { at: 10,  reward: 0.50,  label: '+$0.50' },
        { at: 25,  reward: 2.00,  label: '+$2.00' },
        { at: 50,  reward: 5.00,  label: '+$5.00' },
        { at: 100, reward: 15.00, label: '+$15.00' }
    ];

    var _panel = null;
    var _streakEl = null;
    var _streak = 0;
    var _lastSpinTime = 0;
    var _prevBalance = null;
    var _pollTimer = null;
    var _pulseTimer = null;

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                var now = Date.now();
                // Check if idle timeout exceeded
                if (data.lastSpinTime && (now - data.lastSpinTime) > IDLE_TIMEOUT) {
                    _streak = 0;
                    _lastSpinTime = 0;
                } else {
                    _streak = data.streak || 0;
                    _lastSpinTime = data.lastSpinTime || 0;
                }
            }
        } catch (e) { /* ignore */ }
    }

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                streak: _streak,
                lastSpinTime: _lastSpinTime
            }));
        } catch (e) { /* ignore */ }
    }

    function _buildPanel() {
        if (_panel) return;

        _panel = document.createElement('div');
        _panel.id = ELEMENT_ID;
        _panel.style.cssText = 'position:fixed;left:0;top:50%;transform:translateY(-50%);' +
            'width:120px;height:50px;background:linear-gradient(135deg,#1a1a2e,#16213e);' +
            'border:1px solid rgba(255,215,0,0.2);border-left:none;border-radius:0 10px 10px 0;' +
            'display:flex;align-items:center;justify-content:center;z-index:' + Z_INDEX + ';' +
            'box-shadow:2px 2px 12px rgba(0,0,0,0.4);transition:all 0.3s ease;';

        _streakEl = document.createElement('span');
        _streakEl.style.cssText = 'font-size:14px;font-weight:800;color:#ffd700;white-space:nowrap;' +
            'letter-spacing:0.3px;';
        _streakEl.textContent = 'Streak: 0 \uD83D\uDD25';
        _panel.appendChild(_streakEl);

        document.body.appendChild(_panel);
        _updateDisplay();
    }

    function _updateDisplay() {
        if (!_streakEl) return;

        _streakEl.textContent = 'Streak: ' + _streak + ' \uD83D\uDD25';

        // Pulse effect when streak > 10
        if (_streak > 10) {
            _panel.style.borderColor = 'rgba(255,100,50,0.5)';
            if (!_pulseTimer) {
                _pulseTimer = setInterval(function() {
                    if (!_panel) { clearInterval(_pulseTimer); _pulseTimer = null; return; }
                    var colors = ['rgba(255,100,50,0.6)', 'rgba(255,165,0,0.6)', 'rgba(255,215,0,0.4)'];
                    var idx = Math.floor(Date.now() / 500) % colors.length;
                    _panel.style.boxShadow = '2px 2px 16px ' + colors[idx] + ',inset 0 0 8px rgba(255,100,50,0.1)';
                }, 500);
            }
        } else {
            _panel.style.borderColor = 'rgba(255,215,0,0.2)';
            _panel.style.boxShadow = '2px 2px 12px rgba(0,0,0,0.4)';
            if (_pulseTimer) {
                clearInterval(_pulseTimer);
                _pulseTimer = null;
            }
        }
    }

    function _awardBonus(bonus) {
        if (typeof balance !== 'undefined') {
            balance += bonus.reward;
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
        }

        _showCelebration(bonus);
    }

    function _showCelebration(bonus) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;left:130px;top:50%;transform:translateY(-50%);' +
            'background:linear-gradient(135deg,#1a1a2e,#0d2137);border:1px solid rgba(46,204,113,0.4);' +
            'border-radius:10px;padding:10px 16px;z-index:' + (Z_INDEX + 5) + ';' +
            'opacity:0;transition:all 0.4s ease;max-width:200px;';

        var title = document.createElement('div');
        title.style.cssText = 'font-size:13px;font-weight:900;color:#2ecc71;margin-bottom:3px;';
        title.textContent = '\uD83D\uDD25 ' + bonus.at + ' Spin Streak!';
        toast.appendChild(title);

        var reward = document.createElement('div');
        reward.style.cssText = 'font-size:16px;font-weight:900;color:#ffd700;';
        reward.textContent = bonus.label + ' Bonus!';
        toast.appendChild(reward);

        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(-50%) scale(1.05)';
        });

        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-50%) scale(0.9)';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 3500);

        // Pulse the main panel
        if (_panel) {
            _panel.style.transform = 'translateY(-50%) scale(1.1)';
            setTimeout(function() {
                if (_panel) _panel.style.transform = 'translateY(-50%) scale(1)';
            }, 300);
        }
    }

    function _detectSpin() {
        var currentBalance = typeof balance !== 'undefined' ? balance : null;
        if (currentBalance === null) {
            _prevBalance = currentBalance;
            return;
        }

        // Check idle timeout
        var now = Date.now();
        if (_lastSpinTime > 0 && (now - _lastSpinTime) > IDLE_TIMEOUT && _streak > 0) {
            _streak = 0;
            _saveState();
            _updateDisplay();
        }

        if (_prevBalance !== null && currentBalance !== _prevBalance) {
            // Balance changed — spin detected
            _streak++;
            _lastSpinTime = now;
            _saveState();
            _updateDisplay();

            // Check bonuses
            for (var i = 0; i < STREAK_BONUSES.length; i++) {
                if (_streak === STREAK_BONUSES[i].at) {
                    _awardBonus(STREAK_BONUSES[i]);
                    break;
                }
            }
        }

        _prevBalance = currentBalance;
    }

    function _init() {
        if (document.getElementById(ELEMENT_ID)) return;

        _loadState();
        _prevBalance = typeof balance !== 'undefined' ? balance : null;
        _buildPanel();

        _pollTimer = setInterval(_detectSpin, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(_init, 4000);
        });
    } else {
        setTimeout(_init, 4000);
    }
})();
