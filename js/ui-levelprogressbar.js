/* ui-levelprogressbar.js — Level Progress Bar
 * Sprint 51: Slim fixed bottom bar showing XP progress toward next level.
 * Reads from localStorage 'casinoXP'. Flashes gold on 'xpAwarded' events.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY  = 'ms_levelProgress';
    var XP_KEY       = 'casinoXP';
    var BAR_ID       = 'levelProgressBar';
    var POLL_MS      = 5000;

    // XP thresholds per level (index = level - 1)
    var THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 3000, 4000, 5500];

    var _barEl    = null;
    var _fillEl   = null;
    var _badgeEl  = null;
    var _xpLblEl  = null;
    var _lastXP   = -1;
    var _pollId   = null;

    // ── XP helpers ───────────────────────────────────────────────────────────
    function _readXP() {
        try {
            var raw = localStorage.getItem(XP_KEY);
            return raw ? parseInt(raw, 10) || 0 : 0;
        } catch (e) { return 0; }
    }

    function _getLevel(xp) {
        for (var i = THRESHOLDS.length - 1; i >= 0; i--) {
            if (xp >= THRESHOLDS[i]) return i + 1;
        }
        return 1;
    }

    function _getProgress(xp) {
        var level = _getLevel(xp);
        if (level >= THRESHOLDS.length) return 1; // maxed
        var start = THRESHOLDS[level - 1];
        var end   = THRESHOLDS[level];
        return Math.min((xp - start) / (end - start), 1);
    }

    function _getXPDisplay(xp) {
        var level = _getLevel(xp);
        if (level >= THRESHOLDS.length) return 'MAX';
        var start = THRESHOLDS[level - 1];
        var end   = THRESHOLDS[level];
        return (xp - start) + ' / ' + (end - start) + ' XP';
    }

    // ── DOM build ────────────────────────────────────────────────────────────
    function _build() {
        // Keyframes
        if (!document.getElementById('lpbKeyframes')) {
            var style = document.createElement('style');
            style.id = 'lpbKeyframes';
            style.textContent = [
                '@keyframes lpbFlash{0%,100%{background:linear-gradient(90deg,#7b2ff7,#f107a3)}',
                '50%{background:linear-gradient(90deg,#ffd700,#ffaa00)}}',
                '@keyframes lpbSlideUp{from{transform:translateY(100%);opacity:0}',
                'to{transform:translateY(0);opacity:1}}'
            ].join('');
            document.head.appendChild(style);
        }

        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.style.cssText = [
            'position:fixed', 'bottom:0', 'left:0', 'right:0',
            'z-index:10400',
            'height:38px',
            'background:#0d0d1a',
            'border-top:1px solid rgba(123,47,247,0.35)',
            'display:flex', 'align-items:center', 'gap:10px',
            'padding:0 14px',
            'animation:lpbSlideUp 0.5s ease both'
        ].join(';');

        // Level badge
        var badge = document.createElement('div');
        badge.style.cssText = [
            'background:linear-gradient(135deg,#7b2ff7,#f107a3)',
            'color:#fff', 'border-radius:50%',
            'width:26px', 'height:26px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-size:12px', 'font-weight:700',
            'flex-shrink:0',
            'box-shadow:0 0 8px rgba(123,47,247,0.6)'
        ].join(';');

        // Track
        var track = document.createElement('div');
        track.style.cssText = [
            'flex:1', 'height:10px',
            'background:rgba(255,255,255,0.08)',
            'border-radius:5px', 'overflow:hidden',
            'position:relative'
        ].join(';');

        var fill = document.createElement('div');
        fill.style.cssText = [
            'position:absolute', 'top:0', 'left:0', 'bottom:0',
            'width:0%',
            'background:linear-gradient(90deg,#7b2ff7,#f107a3)',
            'border-radius:5px',
            'transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1)'
        ].join(';');
        track.appendChild(fill);

        // XP label
        var xpLbl = document.createElement('div');
        xpLbl.style.cssText = [
            'color:rgba(255,255,255,0.6)',
            'font-size:11px', 'white-space:nowrap'
        ].join(';');

        // Dismiss button
        var dismiss = document.createElement('button');
        dismiss.textContent = '\u00D7';
        dismiss.setAttribute('aria-label', 'Dismiss level progress bar');
        dismiss.style.cssText = [
            'background:transparent', 'border:none',
            'color:rgba(255,255,255,0.4)', 'font-size:16px',
            'cursor:pointer', 'padding:0 2px', 'line-height:1'
        ].join(';');
        dismiss.addEventListener('click', function () {
            window.dismissLevelProgressBar();
        });

        bar.appendChild(badge);
        bar.appendChild(track);
        bar.appendChild(xpLbl);
        bar.appendChild(dismiss);

        _fillEl  = fill;
        _badgeEl = badge;
        _xpLblEl = xpLbl;

        return bar;
    }

    // ── Update display ───────────────────────────────────────────────────────
    function _update(xp, flash) {
        if (!_barEl) return;
        var level    = _getLevel(xp);
        var progress = _getProgress(xp);

        _badgeEl.textContent = 'L' + level;
        _fillEl.style.width  = (progress * 100).toFixed(1) + '%';
        _xpLblEl.textContent = _getXPDisplay(xp);

        if (flash) {
            _fillEl.style.animation = 'lpbFlash 0.6s ease 2';
            var el = _fillEl;
            setTimeout(function () { el.style.animation = ''; }, 1300);
        }
    }

    // ── Poll loop ────────────────────────────────────────────────────────────
    function _poll() {
        var xp = _readXP();
        if (xp !== _lastXP) {
            var flash = _lastXP >= 0; // don't flash on first read
            _lastXP = xp;
            _update(xp, flash);
        }
    }

    // ── Public API ───────────────────────────────────────────────────────────
    window.dismissLevelProgressBar = function () {
        if (_pollId) { clearInterval(_pollId); _pollId = null; }
        if (_barEl && _barEl.parentNode) {
            _barEl.style.transform = 'translateY(100%)';
            _barEl.style.opacity   = '0';
            _barEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            var el = _barEl;
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 350);
            _barEl = null;
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true })); } catch (e) {}
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var saved = raw ? JSON.parse(raw) : {};
            if (saved.dismissed) return;
        } catch (e) {}

        _barEl = _build();
        document.body.appendChild(_barEl);

        var xp = _readXP();
        _lastXP = xp;
        _update(xp, false);

        // Listen for xpAwarded events
        document.addEventListener('xpAwarded', function () {
            var newXP = _readXP();
            var flash = newXP !== _lastXP;
            _lastXP = newXP;
            _update(newXP, flash);
        });

        // Fallback polling
        _pollId = setInterval(_poll, POLL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
