/* ui-jackpotticker.js — Progressive Jackpot Ticker
 * Sprint 36: Animated counter that grows over time as visual social proof.
 * Resets weekly based on ISO week number. Shows in lobby.
 */
(function () {
    'use strict';

    var JP_KEY = 'ms_jackpotData';
    var _tickerEl = null;
    var _tickInterval = null;
    var _currentAmount = 0;

    // ── Seed helpers ────────────────────────────────────────────────────────
    function _isoWeek() {
        var d = new Date();
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function _seedHash(week, year) {
        // Simple deterministic hash from week + year
        var s = (week * 2654435761 + year * 40503) >>> 0;
        s = ((s ^ (s >> 16)) * 0x45d9f3b) >>> 0;
        s = ((s ^ (s >> 16)) * 0x45d9f3b) >>> 0;
        s = (s ^ (s >> 16)) >>> 0;
        return s;
    }

    function _baseAmount() {
        var now = new Date();
        var week = _isoWeek();
        var year = now.getUTCFullYear();
        var hash = _seedHash(week, year);
        // Range: $50,000 - $150,000
        var frac = (hash % 10000) / 10000;
        return 50000 + frac * 100000;
    }

    // ── Elapsed growth ──────────────────────────────────────────────────────
    function _weekStartMs() {
        var now = new Date();
        var day = now.getUTCDay() || 7; // Monday=1
        var monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - day + 1);
        monday.setUTCHours(0, 0, 0, 0);
        return monday.getTime();
    }

    function _elapsedGrowth() {
        var elapsed = Date.now() - _weekStartMs();
        var seconds = Math.floor(elapsed / 1000);
        // Average $0.25 per 2.5s = $0.10/s base growth
        var base = seconds * 0.10;
        // Add periodic jumps: every ~60s a $10-$50 jump
        var jumps = Math.floor(seconds / 60);
        var jumpTotal = 0;
        for (var i = 0; i < jumps; i++) {
            var h = _seedHash(i + 1, _isoWeek());
            jumpTotal += 10 + (h % 4000) / 100; // $10 - $50
        }
        return base + jumpTotal;
    }

    // ── Data persistence ────────────────────────────────────────────────────
    function _loadData() {
        try {
            var raw = localStorage.getItem(JP_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return null;
    }

    function _saveData(data) {
        try { localStorage.setItem(JP_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }

    function _getData() {
        var data = _loadData();
        var week = _isoWeek();
        var year = new Date().getUTCFullYear();
        if (!data || data.week !== week || data.year !== year) {
            data = { week: week, year: year, extra: 0 };
            _saveData(data);
        }
        return data;
    }

    // ── Format currency ─────────────────────────────────────────────────────
    function _fmt(n) {
        var parts = n.toFixed(2).split('.');
        var intPart = parts[0];
        var decPart = parts[1];
        var formatted = '';
        for (var i = intPart.length - 1, c = 0; i >= 0; i--, c++) {
            if (c > 0 && c % 3 === 0) formatted = ',' + formatted;
            formatted = intPart[i] + formatted;
        }
        return '$' + formatted + '.' + decPart;
    }

    // ── Build DOM ───────────────────────────────────────────────────────────
    function _createTicker() {
        if (_tickerEl) return;

        var ticker = document.createElement('div');
        ticker.id = 'jackpotTicker';
        ticker.style.cssText = 'text-align:center;padding:10px 16px;margin:8px auto 12px;' +
            'max-width:400px;background:linear-gradient(135deg,#1a0a2e,#2d1b4e);' +
            'border-radius:12px;border:1px solid rgba(255,215,0,0.4);' +
            'box-shadow:0 0 20px rgba(255,215,0,0.15)';

        var label = document.createElement('div');
        label.style.cssText = 'font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px';
        label.textContent = '\uD83C\uDFAF Progressive Jackpot';

        var amount = document.createElement('div');
        amount.id = 'jptAmount';
        amount.style.cssText = 'font-size:28px;font-weight:900;color:#ffd700;' +
            'text-shadow:0 0 12px rgba(255,215,0,0.5);font-family:monospace;' +
            'transition:transform 0.15s ease';

        ticker.appendChild(label);
        ticker.appendChild(amount);
        _tickerEl = ticker;

        // Insert into lobby if container exists
        var lobby = document.getElementById('gameLobby') || document.getElementById('lobby');
        if (lobby) {
            lobby.insertBefore(ticker, lobby.firstChild);
        } else {
            document.body.appendChild(ticker);
        }
    }

    // ── Update display ──────────────────────────────────────────────────────
    function _updateDisplay() {
        var el = document.getElementById('jptAmount');
        if (!el) return;
        el.textContent = _fmt(_currentAmount);
    }

    function _tick() {
        // Random increment $0.01 - $0.50
        var inc = 0.01 + Math.random() * 0.49;
        _currentAmount += inc;
        _updateDisplay();

        // Occasional big jump (1% chance per tick)
        if (Math.random() < 0.01) {
            var jump = 10 + Math.random() * 40;
            _currentAmount += jump;
            var el = document.getElementById('jptAmount');
            if (el) {
                el.style.transform = 'scale(1.08)';
                setTimeout(function () { el.style.transform = 'scale(1)'; }, 200);
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window._jackpotTrackSpin = function (betAmount) {
        if (typeof betAmount !== 'number' || betAmount <= 0) return;
        // Add a small fraction of each bet to the jackpot
        var contribution = betAmount * 0.02; // 2% of bet
        var data = _getData();
        data.extra = (data.extra || 0) + contribution;
        _saveData(data);
        _currentAmount += contribution;
        _updateDisplay();
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('noBonus') === '1') return;

        var data = _getData();
        _currentAmount = _baseAmount() + _elapsedGrowth() + (data.extra || 0);

        _createTicker();
        _updateDisplay();

        // Tick every 2-3 seconds (randomized interval via fixed 2.5s)
        _tickInterval = setInterval(_tick, 2500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 500); });
    } else {
        setTimeout(_init, 500);
    }

})();
