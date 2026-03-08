/* ui-luckywheel.js — Daily Lucky Wheel
 * Sprint 33: Free daily spin wheel with credit/freespin/multiplier prizes.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // ── Constants ────────────────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_luckyWheelData';
    var PRIZES = [
        { label: '$1',     type: 'credits',    value: 1 },
        { label: '$2',     type: 'credits',    value: 2 },
        { label: '5 FS',   type: 'freespins',  value: 5 },
        { label: '$5',     type: 'credits',    value: 5 },
        { label: 'Nothing', type: 'none',      value: 0 },
        { label: '$10',    type: 'credits',    value: 10 },
        { label: '$3',     type: 'credits',    value: 3 },
        { label: '2x Next', type: 'multiplier', value: 2 }
    ];
    var SEGMENT_COUNT = PRIZES.length;
    var SEGMENT_DEG   = 360 / SEGMENT_COUNT; // 45 degrees each
    var COLORS = ['#fbbf24', '#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#3b82f6', '#ec4899'];
    var SPIN_DURATION  = 4000; // ms
    var AUTO_SHOW_MS   = 10000; // 10s auto-open on lobby
    var FAB_SIZE       = 56;

    var _overlayEl  = null;
    var _wheelEl    = null;
    var _resultEl   = null;
    var _spinBtn    = null;
    var _fabEl      = null;
    var _spinning   = false;

    // ── Persistence helpers ─────────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function _todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function _canSpin() {
        var data = _load();
        return data.lastSpinDate !== _todayStr();
    }

    // ── DOM creation ────────────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;

        var el = document.createElement('div');
        el.id = 'luckyWheelOverlay';
        el.style.cssText = 'display:none;position:fixed;inset:0;z-index:20700;' +
            'background:rgba(0,0,0,0.85);align-items:center;justify-content:center;flex-direction:column;';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'position:absolute;top:16px;right:20px;background:none;border:none;' +
            'color:#aaa;font-size:28px;cursor:pointer;z-index:2;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            if (typeof window.closeLuckyWheel === 'function') window.closeLuckyWheel();
        });
        el.appendChild(closeBtn);

        // Title
        var title = document.createElement('div');
        title.style.cssText = 'font-size:28px;font-weight:900;color:#fbbf24;margin-bottom:16px;' +
            'text-shadow:0 0 20px rgba(251,191,36,0.4);text-align:center;';
        title.textContent = '\uD83C\uDFC6 Daily Lucky Wheel';
        el.appendChild(title);

        // Wheel container
        var wheelContainer = document.createElement('div');
        wheelContainer.style.cssText = 'position:relative;width:300px;height:300px;margin:0 auto;';

        // Pointer (top center triangle)
        var pointer = document.createElement('div');
        pointer.style.cssText = 'position:absolute;top:-18px;left:50%;transform:translateX(-50%);' +
            'width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;' +
            'border-top:24px solid #fbbf24;z-index:3;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));';
        wheelContainer.appendChild(pointer);

        // Wheel
        var wheel = document.createElement('div');
        wheel.id = 'lwWheel';
        wheel.style.cssText = 'width:300px;height:300px;border-radius:50%;position:relative;' +
            'overflow:hidden;border:4px solid #fbbf24;box-shadow:0 0 40px rgba(251,191,36,0.3);' +
            'transition:transform ' + (SPIN_DURATION / 1000) + 's cubic-bezier(0.17,0.67,0.12,0.99);';

        // Build segments using clip-path conic slices
        for (var i = 0; i < SEGMENT_COUNT; i++) {
            var seg = document.createElement('div');
            var startDeg = i * SEGMENT_DEG;
            var endDeg = (i + 1) * SEGMENT_DEG;
            seg.style.cssText = 'position:absolute;width:100%;height:100%;' +
                'background:' + COLORS[i % COLORS.length] + ';' +
                'clip-path:polygon(50% 50%,' +
                _circlePoint(startDeg, 50) + ',' +
                _circlePoint(startDeg + SEGMENT_DEG * 0.5, 50) + ',' +
                _circlePoint(endDeg, 50) + ');';

            // Label
            var label = document.createElement('span');
            var labelAngle = startDeg + SEGMENT_DEG / 2;
            label.style.cssText = 'position:absolute;left:50%;top:50%;font-size:13px;font-weight:800;' +
                'color:#000;transform-origin:0 0;white-space:nowrap;' +
                'transform:rotate(' + labelAngle + 'deg) translateX(55px);';
            label.textContent = PRIZES[i].label;
            seg.appendChild(label);

            wheel.appendChild(seg);
        }

        // Center circle
        var center = document.createElement('div');
        center.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'width:50px;height:50px;border-radius:50%;background:#1a1a2e;border:3px solid #fbbf24;' +
            'display:flex;align-items:center;justify-content:center;font-size:20px;z-index:2;';
        center.textContent = '\uD83C\uDFB0';
        wheel.appendChild(center);

        wheelContainer.appendChild(wheel);
        el.appendChild(wheelContainer);
        _wheelEl = wheel;

        // Result text
        var result = document.createElement('div');
        result.id = 'lwResult';
        result.style.cssText = 'font-size:22px;font-weight:900;color:#fbbf24;margin-top:20px;' +
            'min-height:30px;text-align:center;text-shadow:0 0 12px rgba(251,191,36,0.4);';
        el.appendChild(result);
        _resultEl = result;

        // Spin button
        var spinBtnEl = document.createElement('button');
        spinBtnEl.id = 'lwSpinBtn';
        spinBtnEl.style.cssText = 'margin-top:16px;background:linear-gradient(135deg,#fbbf24,#f59e0b);' +
            'color:#000;font-size:20px;font-weight:900;padding:14px 52px;border:none;border-radius:14px;' +
            'cursor:pointer;letter-spacing:1px;box-shadow:0 4px 24px rgba(251,191,36,0.35);' +
            'transition:transform 0.15s,opacity 0.2s;';
        spinBtnEl.textContent = 'SPIN!';
        spinBtnEl.addEventListener('click', function () {
            if (typeof window.spinLuckyWheel === 'function') window.spinLuckyWheel();
        });
        el.appendChild(spinBtnEl);
        _spinBtn = spinBtnEl;

        document.body.appendChild(el);
        _overlayEl = el;
    }

    // ── Circle point helper for clip-path ────────────────────────────────────
    function _circlePoint(deg, r) {
        var rad = (deg - 90) * Math.PI / 180;
        var x = 50 + r * Math.cos(rad);
        var y = 50 + r * Math.sin(rad);
        return x.toFixed(2) + '% ' + y.toFixed(2) + '%';
    }

    // ── FAB (floating action button) ────────────────────────────────────────
    function _createFAB() {
        if (_fabEl) return;
        var fab = document.createElement('button');
        fab.id = 'luckyWheelFAB';
        fab.style.cssText = 'position:fixed;bottom:90px;right:20px;width:' + FAB_SIZE + 'px;height:' + FAB_SIZE + 'px;' +
            'border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);border:none;' +
            'font-size:26px;cursor:pointer;box-shadow:0 4px 20px rgba(251,191,36,0.4);z-index:10000;' +
            'display:flex;align-items:center;justify-content:center;transition:transform 0.2s;';
        fab.textContent = '\uD83C\uDFC6';
        fab.title = 'Daily Lucky Wheel';
        fab.addEventListener('click', function () {
            if (typeof window.openLuckyWheel === 'function') window.openLuckyWheel();
        });
        document.body.appendChild(fab);
        _fabEl = fab;
    }

    // ── Award prize ─────────────────────────────────────────────────────────
    function _awardPrize(prize) {
        if (prize.type === 'credits' && prize.value > 0) {
            if (typeof balance !== 'undefined') {
                balance += prize.value;
                if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
            }
            _resultEl.textContent = '\uD83C\uDF89 You won ' + prize.label + '!';
        } else if (prize.type === 'freespins' && prize.value > 0) {
            // Store free spins flag for next game
            try { localStorage.setItem('ms_pendingFreeSpins', String(prize.value)); } catch (e) {}
            _resultEl.textContent = '\uD83C\uDF89 You won ' + prize.value + ' Free Spins!';
        } else if (prize.type === 'multiplier' && prize.value > 0) {
            try { localStorage.setItem('ms_nextSpinMultiplier', String(prize.value)); } catch (e) {}
            _resultEl.textContent = '\uD83C\uDF89 ' + prize.value + 'x Multiplier on next spin!';
        } else {
            _resultEl.textContent = 'Better luck tomorrow!';
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window.spinLuckyWheel = function () {
        if (_spinning) return;
        if (!_canSpin()) {
            if (_resultEl) _resultEl.textContent = 'Come back tomorrow for another spin!';
            return;
        }
        _spinning = true;
        if (_spinBtn) { _spinBtn.disabled = true; _spinBtn.style.opacity = '0.5'; }
        if (_resultEl) _resultEl.textContent = '';

        // Pick random prize index
        var winIdx = Math.floor(Math.random() * SEGMENT_COUNT);
        // Calculate rotation: 3-5 full turns + offset to land on winning segment
        var fullTurns = 3 + Math.floor(Math.random() * 3); // 3-5 turns
        // The pointer is at top (0 deg). We need the winning segment's center at top.
        var segCenter = winIdx * SEGMENT_DEG + SEGMENT_DEG / 2;
        var targetDeg = fullTurns * 360 + (360 - segCenter);

        if (_wheelEl) {
            _wheelEl.style.transition = 'none';
            _wheelEl.style.transform = 'rotate(0deg)';
            // Force reflow
            void _wheelEl.offsetHeight;
            _wheelEl.style.transition = 'transform ' + (SPIN_DURATION / 1000) + 's cubic-bezier(0.17,0.67,0.12,0.99)';
            _wheelEl.style.transform = 'rotate(' + targetDeg + 'deg)';
        }

        setTimeout(function () {
            _spinning = false;
            // Record spin
            var data = _load();
            data.lastSpinDate = _todayStr();
            _save(data);

            _awardPrize(PRIZES[winIdx]);

            if (_spinBtn) {
                _spinBtn.textContent = 'Spun Today \u2713';
                _spinBtn.disabled = true;
            }
            // Hide FAB after spin
            if (_fabEl) _fabEl.style.display = 'none';
        }, SPIN_DURATION + 300);
    };

    window.closeLuckyWheel = function () {
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.25s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; }
            }, 250);
        }
    };

    window.openLuckyWheel = function () {
        _createOverlay();
        if (!_canSpin()) {
            if (_spinBtn) { _spinBtn.textContent = 'Spun Today \u2713'; _spinBtn.disabled = true; }
        } else {
            if (_spinBtn) { _spinBtn.textContent = 'SPIN!'; _spinBtn.disabled = false; _spinBtn.style.opacity = '1'; }
        }
        if (_resultEl) _resultEl.textContent = '';
        _overlayEl.style.display = 'flex';
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        // QA suppression
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}

        // Show FAB if daily spin is available
        if (_canSpin()) {
            _createFAB();
            // Auto-open after 10s on lobby
            setTimeout(function () {
                // Only auto-open if still on lobby (no game open)
                if (typeof currentGame !== 'undefined' && currentGame) return;
                if (_canSpin()) {
                    if (typeof window.openLuckyWheel === 'function') window.openLuckyWheel();
                }
            }, AUTO_SHOW_MS);
        }
    }

    // ── Bootstrap ───────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
