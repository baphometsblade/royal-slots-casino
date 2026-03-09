/* ui-betladder.js -- Bet Progression Ladder
 * Sprint 48: Fixed right-side vertical ladder showing bet progression rungs.
 * 3 consecutive wins at a rung = advance; any loss = drop one rung.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_betLadder';
    var RUNGS = [
        { bet: 1,  mult: 1.2 },
        { bet: 5,  mult: 1.5 },
        { bet: 10, mult: 2.0 },
        { bet: 25, mult: 3.0 },
        { bet: 50, mult: 5.0 }
    ];
    var WINS_TO_ADVANCE = 3;

    var _panelEl = null;
    var _currentRung = 0;
    var _consecutiveWins = 0;

    // ── Persistence ────────────────────────────────────────────────────────
    function _load() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            _currentRung = typeof data.currentRung === 'number' ? data.currentRung : 0;
            _consecutiveWins = typeof data.consecutiveWins === 'number' ? data.consecutiveWins : 0;
            if (_currentRung < 0) _currentRung = 0;
            if (_currentRung >= RUNGS.length) _currentRung = RUNGS.length - 1;
        } catch (e) {
            _currentRung = 0;
            _consecutiveWins = 0;
        }
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                currentRung: _currentRung,
                consecutiveWins: _consecutiveWins
            }));
        } catch (e) { /* silent */ }
    }

    // ── DOM Creation ───────────────────────────────────────────────────────
    function _createPanel() {
        if (_panelEl) return;

        var panel = document.createElement('div');
        panel.id = 'betLadderPanel';
        panel.style.cssText = 'position:fixed;right:12px;top:50%;transform:translateY(-50%);' +
            'z-index:10400;display:flex;flex-direction:column-reverse;align-items:center;gap:0;' +
            'pointer-events:auto;font-family:inherit;';

        // Title badge
        var titleBadge = document.createElement('div');
        titleBadge.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);' +
            'color:#e2e8f0;font-size:10px;font-weight:700;padding:4px 10px;border-radius:4px;' +
            'margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;' +
            'border:1px solid rgba(255,215,0,0.3);text-align:center;';
        titleBadge.textContent = 'Bet Ladder';
        panel.appendChild(titleBadge);

        // Rungs (bottom-to-top visually, since flex-direction is column-reverse on items)
        for (var i = RUNGS.length - 1; i >= 0; i--) {
            var rungEl = document.createElement('div');
            rungEl.id = 'betLadderRung' + i;
            rungEl.style.cssText = 'width:64px;padding:6px 4px;text-align:center;' +
                'border:1px solid rgba(255,255,255,0.15);border-radius:6px;margin:2px 0;' +
                'transition:all 0.3s ease;cursor:default;position:relative;';

            var betLabel = document.createElement('div');
            betLabel.style.cssText = 'font-size:12px;font-weight:700;color:#e2e8f0;';
            betLabel.textContent = '$' + RUNGS[i].bet;

            var multLabel = document.createElement('div');
            multLabel.style.cssText = 'font-size:9px;color:#ffd700;font-weight:600;';
            multLabel.textContent = RUNGS[i].mult + 'x';

            rungEl.appendChild(betLabel);
            rungEl.appendChild(multLabel);
            panel.appendChild(rungEl);
        }

        // Multiplier badge
        var multBadge = document.createElement('div');
        multBadge.id = 'betLadderMultBadge';
        multBadge.style.cssText = 'background:linear-gradient(135deg,#ffd700,#ff8c00);' +
            'color:#1a1a2e;font-size:11px;font-weight:800;padding:4px 10px;border-radius:12px;' +
            'margin-top:6px;text-align:center;box-shadow:0 2px 8px rgba(255,215,0,0.4);';
        multBadge.textContent = RUNGS[0].mult + 'x';
        panel.appendChild(multBadge);

        // Win progress dots
        var dotsRow = document.createElement('div');
        dotsRow.id = 'betLadderDots';
        dotsRow.style.cssText = 'display:flex;gap:4px;margin-top:4px;';
        for (var d = 0; d < WINS_TO_ADVANCE; d++) {
            var dot = document.createElement('div');
            dot.className = 'betLadderDot';
            dot.style.cssText = 'width:8px;height:8px;border-radius:50%;' +
                'border:1px solid rgba(255,215,0,0.5);background:rgba(255,255,255,0.1);' +
                'transition:background 0.3s;';
            dotsRow.appendChild(dot);
        }
        panel.appendChild(dotsRow);

        document.body.appendChild(panel);
        _panelEl = panel;
        _render();
    }

    // ── Render ──────────────────────────────────────────────────────────────
    function _render() {
        if (!_panelEl) return;

        for (var i = 0; i < RUNGS.length; i++) {
            var rungEl = document.getElementById('betLadderRung' + i);
            if (!rungEl) continue;

            if (i === _currentRung) {
                rungEl.style.background = 'linear-gradient(135deg,#2d6a4f,#40916c)';
                rungEl.style.borderColor = '#ffd700';
                rungEl.style.boxShadow = '0 0 12px rgba(255,215,0,0.4)';
                rungEl.style.transform = 'scale(1.08)';
            } else if (i < _currentRung) {
                rungEl.style.background = 'rgba(45,106,79,0.3)';
                rungEl.style.borderColor = 'rgba(64,145,108,0.4)';
                rungEl.style.boxShadow = 'none';
                rungEl.style.transform = 'scale(1)';
            } else {
                rungEl.style.background = 'rgba(30,30,60,0.6)';
                rungEl.style.borderColor = 'rgba(255,255,255,0.1)';
                rungEl.style.boxShadow = 'none';
                rungEl.style.transform = 'scale(1)';
            }
        }

        // Update multiplier badge
        var multBadge = document.getElementById('betLadderMultBadge');
        if (multBadge) {
            multBadge.textContent = RUNGS[_currentRung].mult + 'x';
        }

        // Update win progress dots
        var dotsRow = document.getElementById('betLadderDots');
        if (dotsRow) {
            var dots = dotsRow.children;
            for (var d = 0; d < dots.length; d++) {
                if (d < _consecutiveWins) {
                    dots[d].style.background = '#ffd700';
                } else {
                    dots[d].style.background = 'rgba(255,255,255,0.1)';
                }
            }
        }
    }

    // ── Spin result handler ────────────────────────────────────────────────
    function _onSpinComplete(e) {
        var detail = e && e.detail ? e.detail : {};
        var isWin = detail.win === true || (typeof detail.winAmount === 'number' && detail.winAmount > 0);

        if (isWin) {
            _consecutiveWins++;
            if (_consecutiveWins >= WINS_TO_ADVANCE && _currentRung < RUNGS.length - 1) {
                _currentRung++;
                _consecutiveWins = 0;
                _flashAdvance();
            }
        } else {
            _consecutiveWins = 0;
            if (_currentRung > 0) {
                _currentRung--;
            }
        }

        _save();
        _render();
    }

    function _flashAdvance() {
        if (!_panelEl) return;
        var rungEl = document.getElementById('betLadderRung' + _currentRung);
        if (rungEl) {
            rungEl.style.transition = 'none';
            rungEl.style.boxShadow = '0 0 24px rgba(255,215,0,0.9)';
            setTimeout(function () {
                rungEl.style.transition = 'all 0.3s ease';
                rungEl.style.boxShadow = '0 0 12px rgba(255,215,0,0.4)';
            }, 600);
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────
    window.dismissBetLadder = function () {
        if (_panelEl) {
            _panelEl.style.opacity = '0';
            _panelEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_panelEl) {
                    _panelEl.style.display = 'none';
                    _panelEl.style.opacity = '';
                    _panelEl.style.transition = '';
                }
            }, 300);
        }
    };

    // ── Init ───────────────────────────────────────────────────────────────
    function _init() {
        try {
            if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        } catch (e) { /* old browser */ }

        _load();
        _createPanel();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 600); });
    } else {
        setTimeout(_init, 600);
    }

})();
