// Sprint 69: Daily Jackpot Pool — simulated shared jackpot with live counter
// Horizontal bar showing growing jackpot. Resets at midnight. Random "won" flashes.
(function() {
    'use strict';

    var ELEMENT_ID = 'dailyJackpotPool';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_dailyJackpot';
    var STARTING_AMOUNT = 1000;
    var RESET_AMOUNT = 500;
    var GROW_INTERVAL = 15000;
    var GROW_MIN = 5;
    var GROW_MAX = 25;
    var WIN_CHECK_INTERVAL = 60000;
    var WIN_CHANCE = 0.015; // ~1.5% per minute check

    var _bar = null;
    var _amountEl = null;
    var _flashEl = null;
    var _jackpot = STARTING_AMOUNT;
    var _growTimer = null;
    var _winCheckTimer = null;
    var _animFrame = null;
    var _displayedAmount = STARTING_AMOUNT;

    var PLAYER_NAMES = [
        'LuckyAce', 'SpinKing', 'GoldRush', 'JackpotJoe', 'NeonNinja',
        'StarPlayer', 'DiamondDan', 'RoyalFlush', 'MegaSpin', 'WildCard',
        'CoinMaster', 'SlotHero', 'BetBoss', 'FortuneX', 'VegasViper'
    ];

    function _todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                if (data.date === _todayKey()) {
                    _jackpot = data.amount || STARTING_AMOUNT;
                    _displayedAmount = _jackpot;
                } else {
                    // New day — reset
                    _jackpot = STARTING_AMOUNT;
                    _displayedAmount = STARTING_AMOUNT;
                }
            }
        } catch (e) { /* ignore */ }
    }

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                date: _todayKey(),
                amount: _jackpot
            }));
        } catch (e) { /* ignore */ }
    }

    function _formatAmount(val) {
        return '$' + Math.floor(val).toLocaleString('en-US');
    }

    function _buildBar() {
        if (_bar) return;

        _bar = document.createElement('div');
        _bar.id = ELEMENT_ID;
        _bar.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);' +
            'height:32px;background:linear-gradient(90deg,#1a1a2e,#16213e,#1a1a2e);' +
            'border-bottom:1px solid rgba(255,215,0,0.3);display:flex;align-items:center;' +
            'justify-content:center;gap:8px;z-index:' + Z_INDEX + ';padding:0 20px;' +
            'font-size:13px;min-width:280px;max-width:400px;border-radius:0 0 8px 8px;' +
            'box-shadow:0 2px 12px rgba(0,0,0,0.4);';

        var icon = document.createElement('span');
        icon.style.cssText = 'font-size:16px;';
        icon.textContent = '\uD83C\uDFC6';
        _bar.appendChild(icon);

        var label = document.createElement('span');
        label.style.cssText = 'color:rgba(255,255,255,0.6);font-size:11px;font-weight:600;' +
            'text-transform:uppercase;letter-spacing:0.5px;';
        label.textContent = 'Daily Jackpot:';
        _bar.appendChild(label);

        _amountEl = document.createElement('span');
        _amountEl.style.cssText = 'color:#ffd700;font-weight:900;font-size:15px;' +
            'font-variant-numeric:tabular-nums;text-shadow:0 0 8px rgba(255,215,0,0.3);' +
            'min-width:80px;';
        _amountEl.textContent = _formatAmount(_jackpot);
        _bar.appendChild(_amountEl);

        _flashEl = document.createElement('div');
        _flashEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;' +
            'justify-content:center;background:linear-gradient(135deg,rgba(255,215,0,0.95),rgba(218,165,32,0.95));' +
            'color:#1a1a2e;font-weight:900;font-size:12px;border-radius:0 0 8px 8px;' +
            'opacity:0;transition:opacity 0.3s;pointer-events:none;letter-spacing:0.5px;';
        _bar.appendChild(_flashEl);

        document.body.appendChild(_bar);
    }

    function _animateCount() {
        if (Math.abs(_displayedAmount - _jackpot) < 1) {
            _displayedAmount = _jackpot;
            if (_amountEl) _amountEl.textContent = _formatAmount(_jackpot);
            return;
        }

        var diff = _jackpot - _displayedAmount;
        var step = diff * 0.08;
        if (Math.abs(step) < 1) step = diff > 0 ? 1 : -1;
        _displayedAmount += step;

        if (_amountEl) _amountEl.textContent = _formatAmount(_displayedAmount);

        _animFrame = requestAnimationFrame(_animateCount);
    }

    function _grow() {
        var increment = GROW_MIN + Math.random() * (GROW_MAX - GROW_MIN);
        _jackpot += increment;
        _saveState();

        // Start counting animation
        if (_animFrame) cancelAnimationFrame(_animFrame);
        _animateCount();
    }

    function _checkWin() {
        if (Math.random() < WIN_CHANCE) {
            var winner = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
            var wonAmount = _jackpot;
            var suffix = Math.floor(Math.random() * 900) + 100;

            // Flash the win message
            if (_flashEl) {
                _flashEl.textContent = '\uD83C\uDF89 JACKPOT WON! ' + _formatAmount(wonAmount) + ' by ' + winner + '_' + suffix + '!';
                _flashEl.style.opacity = '1';

                setTimeout(function() {
                    if (_flashEl) _flashEl.style.opacity = '0';
                }, 4000);
            }

            // Reset jackpot
            _jackpot = RESET_AMOUNT;
            _displayedAmount = wonAmount;
            _saveState();

            // Animate the reset after flash
            setTimeout(function() {
                if (_animFrame) cancelAnimationFrame(_animFrame);
                _animateCount();
            }, 4500);
        }
    }

    function _init() {
        if (document.getElementById(ELEMENT_ID)) return;

        _loadState();
        _buildBar();

        _growTimer = setInterval(_grow, GROW_INTERVAL);
        _winCheckTimer = setInterval(_checkWin, WIN_CHECK_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(_init, 3000);
        });
    } else {
        setTimeout(_init, 3000);
    }
})();
