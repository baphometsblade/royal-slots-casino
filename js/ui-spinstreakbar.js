/* ui-spinstreakbar.js — Spin Streak Bar (v2)
 * Sprint 58: Fixed top bar tracking consecutive spins and changing colour with streak length.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var SESSION_KEY = 'ms_spinStreakV2';
    var ELEMENT_ID = 'spinStreakBarV2';
    var SHOW_AFTER_SPINS = 5;
    var BAR_HEIGHT = '44px';

    var _bar = null;
    var _hidden = false;

    function _loadSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : { streak: 0, best: 0, hidden: false };
        } catch (e) {
            return { streak: 0, best: 0, hidden: false };
        }
    }

    function _saveSession(data) {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _bgForStreak(streak) {
        if (streak >= 25) {
            return 'linear-gradient(90deg,#7f0000,#cc2200,#ff6600,#cc2200,#7f0000)';
        }
        if (streak >= 10) {
            return 'linear-gradient(90deg,#3d1a00,#cc5500,#ff8c00,#cc5500,#3d1a00)';
        }
        return 'linear-gradient(90deg,#0a1a3d,#1a4080,#2060c0,#1a4080,#0a1a3d)';
    }

    function _accentForStreak(streak) {
        if (streak >= 25) return '#ff6600';
        if (streak >= 10) return '#ff8c00';
        return '#4a90d9';
    }

    function _labelForStreak(streak) {
        if (streak >= 25) return '\u26A1 Keep going!';
        if (streak >= 10) return '\u26A1 On fire!';
        return '\u26A1 Keep going!';
    }

    function _build(streak, best) {
        if (document.getElementById(ELEMENT_ID)) {
            _update(streak, best);
            return;
        }

        var bar = document.createElement('div');
        bar.id = ELEMENT_ID;
        bar.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:' + BAR_HEIGHT,
            'z-index:10400',
            'font-family:sans-serif',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'gap:16px',
            'transition:background 0.6s ease',
            'box-shadow:0 2px 12px rgba(0,0,0,0.5)'
        ].join(';');

        bar.style.background = _bgForStreak(streak);

        var streakEl = document.createElement('span');
        streakEl.id = ELEMENT_ID + '_streak';
        streakEl.style.cssText = 'font-size:14px;font-weight:700;color:#fff;';
        streakEl.textContent = '\uD83D\uDD25 Spin Streak: ' + streak;

        var sep1 = document.createElement('span');
        sep1.style.cssText = 'color:rgba(255,255,255,0.4);font-size:14px;';
        sep1.textContent = '|';

        var bestEl = document.createElement('span');
        bestEl.id = ELEMENT_ID + '_best';
        bestEl.style.cssText = 'font-size:14px;font-weight:600;color:rgba(255,255,255,0.85);';
        bestEl.textContent = '\uD83C\uDFC6 Best Today: ' + best;

        var sep2 = document.createElement('span');
        sep2.style.cssText = 'color:rgba(255,255,255,0.4);font-size:14px;';
        sep2.textContent = '|';

        var tagEl = document.createElement('span');
        tagEl.id = ELEMENT_ID + '_tag';
        tagEl.style.cssText = 'font-size:13px;font-weight:600;color:' + _accentForStreak(streak) + ';';
        tagEl.textContent = _labelForStreak(streak);

        bar.appendChild(streakEl);
        bar.appendChild(sep1);
        bar.appendChild(bestEl);
        bar.appendChild(sep2);
        bar.appendChild(tagEl);

        document.body.appendChild(bar);
        _bar = bar;
    }

    function _update(streak, best) {
        if (!_bar) return;
        _bar.style.background = _bgForStreak(streak);

        var streakEl = document.getElementById(ELEMENT_ID + '_streak');
        var bestEl = document.getElementById(ELEMENT_ID + '_best');
        var tagEl = document.getElementById(ELEMENT_ID + '_tag');

        if (streakEl) streakEl.textContent = '\uD83D\uDD25 Spin Streak: ' + streak;
        if (bestEl) bestEl.textContent = '\uD83C\uDFC6 Best Today: ' + best;
        if (tagEl) {
            tagEl.textContent = _labelForStreak(streak);
            tagEl.style.color = _accentForStreak(streak);
        }
    }

    function _hide() {
        if (_bar) {
            _bar.style.display = 'none';
        }
    }

    function _onSpinComplete() {
        if (_hidden) return;

        var sess = _loadSession();
        sess.streak = (sess.streak || 0) + 1;
        if (sess.streak > (sess.best || 0)) {
            sess.best = sess.streak;
        }
        _saveSession(sess);

        if (sess.streak >= SHOW_AFTER_SPINS) {
            if (!_bar) {
                _build(sess.streak, sess.best);
            } else {
                _update(sess.streak, sess.best);
                if (_bar.style.display === 'none') {
                    _bar.style.display = 'flex';
                }
            }
        }
    }

    function _init() {
        var sess = _loadSession();
        _hidden = sess.hidden || false;
        if (sess.streak >= SHOW_AFTER_SPINS && !_hidden) {
            _build(sess.streak, sess.best || 0);
        }
    }

    window.dismissSpinStreakBar = function () {
        _hidden = true;
        var sess = _loadSession();
        sess.hidden = true;
        _saveSession(sess);
        _hide();
    };

    document.addEventListener('spinComplete', _onSpinComplete);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
