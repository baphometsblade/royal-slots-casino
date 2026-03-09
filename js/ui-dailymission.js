/* ui-dailymission.js — Daily Mission Bar
 * Sprint 56: Slim fixed bottom bar showing active daily mission progress.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_dailyMission';
    var REWARD_AMOUNT = 5;
    var Z_INDEX = 8700;
    var SHOW_DELAY_MS = 2000;

    var MISSIONS = [
        { id: 'spin50',    label: 'Spin 50 times today',         target: 50,  unit: 'spins' },
        { id: 'win10',     label: 'Win 10 times today',          target: 10,  unit: 'wins'  },
        { id: 'bet100',    label: 'Bet a total of $100 today',   target: 100, unit: 'bet'   },
        { id: 'streak3',   label: 'Score 3 wins in a row',       target: 3,   unit: 'streak'},
        { id: 'play15min', label: 'Play for 15 minutes',         target: 900, unit: 'secs'  },
    ];

    var _el = null;
    var _progressEl = null;
    var _barFillEl = null;
    var _ctaEl = null;
    var _labelEl = null;
    var _sessionConsecWins = 0;
    var _sessionStartTs = Date.now();
    var _timeInterval = null;

    function _todayKey() {
        return new Date().toDateString();
    }

    function _getMission() {
        return MISSIONS[new Date().getDate() % MISSIONS.length];
    }

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var obj = JSON.parse(raw);
            if (obj.dateKey !== _todayKey()) return null;
            return obj;
        } catch (e) {
            return null;
        }
    }

    function _saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {}
    }

    function _defaultState(mission) {
        return {
            dateKey:   _todayKey(),
            missionId: mission.id,
            progress:  0,
            claimed:   false,
        };
    }

    function _progressBar(progress, target) {
        var pct = Math.min(progress / target, 1);
        var filled = Math.round(pct * 10);
        var empty = 10 - filled;
        var bar = '';
        for (var i = 0; i < filled; i++) bar += '\u2588';
        for (var j = 0; j < empty; j++) bar += '\u2591';
        return bar;
    }

    function _render(state, mission) {
        if (!_el) return;
        var pct = Math.min(state.progress / mission.target, 1);
        var pctDisplay = state.progress > mission.target ? mission.target : state.progress;

        if (_labelEl) {
            _labelEl.textContent = '\ud83d\udccb Daily Mission: ' + mission.label + ' \u2014 ' +
                pctDisplay + '/' + mission.target + ' ' + _progressBar(state.progress, mission.target);
        }

        if (_barFillEl) {
            _barFillEl.style.width = (pct * 100) + '%';
        }

        if (_ctaEl) {
            if (state.claimed) {
                _ctaEl.textContent = '\u2705 Claimed';
                _ctaEl.style.background = 'rgba(255,255,255,0.1)';
                _ctaEl.style.cursor = 'default';
                _ctaEl.disabled = true;
            } else if (state.progress >= mission.target) {
                _ctaEl.textContent = 'Complete! +$' + REWARD_AMOUNT;
                _ctaEl.style.background = 'linear-gradient(135deg,#00c851,#007e33)';
                _ctaEl.style.boxShadow = '0 0 14px rgba(0,200,81,0.6)';
                _ctaEl.style.cursor = 'pointer';
                _ctaEl.disabled = false;
            } else {
                _ctaEl.textContent = 'In Progress';
                _ctaEl.style.background = 'rgba(52,152,219,0.2)';
                _ctaEl.style.boxShadow = 'none';
                _ctaEl.style.cursor = 'default';
                _ctaEl.disabled = true;
            }
        }
    }

    function _build() {
        var el = document.createElement('div');
        el.id = 'dailyMissionBar';
        el.style.cssText = [
            'position:fixed',
            'bottom:0',
            'left:0',
            'right:0',
            'height:48px',
            'background:linear-gradient(90deg,#0a1628,#162840)',
            'border-top:1px solid rgba(52,152,219,0.35)',
            'z-index:' + Z_INDEX,
            'display:flex',
            'align-items:center',
            'padding:0 16px',
            'gap:12px',
            'font-family:inherit',
            'transform:translateY(100%)',
            'transition:transform 0.4s ease',
        ].join(';');

        var labelWrap = document.createElement('div');
        labelWrap.style.cssText = 'flex:1;position:relative;overflow:hidden;';

        var label = document.createElement('span');
        label.style.cssText = 'color:#a8d0f0;font-size:13px;font-weight:500;white-space:nowrap;';

        var barTrack = document.createElement('div');
        barTrack.style.cssText = [
            'position:absolute',
            'bottom:0',
            'left:0',
            'right:0',
            'height:2px',
            'background:rgba(52,152,219,0.2)',
            'border-radius:1px',
        ].join(';');

        var barFill = document.createElement('div');
        barFill.style.cssText = [
            'height:100%',
            'background:linear-gradient(90deg,#3498db,#2ecc71)',
            'border-radius:1px',
            'width:0',
            'transition:width 0.5s ease',
        ].join(';');

        barTrack.appendChild(barFill);
        labelWrap.appendChild(label);
        labelWrap.appendChild(barTrack);

        var ctaBtn = document.createElement('button');
        ctaBtn.style.cssText = [
            'background:rgba(52,152,219,0.2)',
            'color:#fff',
            'border:1px solid rgba(52,152,219,0.4)',
            'border-radius:6px',
            'padding:6px 14px',
            'font-size:12px',
            'font-weight:600',
            'cursor:default',
            'white-space:nowrap',
            'transition:background 0.2s,box-shadow 0.2s',
            'flex-shrink:0',
        ].join(';');
        ctaBtn.disabled = true;
        ctaBtn.addEventListener('click', function () {
            var mission = _getMission();
            var state = _loadState() || _defaultState(mission);
            if (state.claimed || state.progress < mission.target) return;
            state.claimed = true;
            _saveState(state);
            if (typeof window.balance === 'number' && typeof window.updateBalanceDisplay === 'function') {
                window.balance += REWARD_AMOUNT;
                window.updateBalanceDisplay();
            }
            _render(state, mission);
        });

        el.appendChild(labelWrap);
        el.appendChild(ctaBtn);
        document.body.appendChild(el);

        _el = el;
        _labelEl = label;
        _barFillEl = barFill;
        _ctaEl = ctaBtn;
        _progressEl = barTrack;
    }

    function _updateProgress(delta, field) {
        var mission = _getMission();
        if (mission.unit !== field) return;
        var state = _loadState() || _defaultState(mission);
        if (state.claimed) return;
        if (state.missionId !== mission.id) state = _defaultState(mission);
        state.progress += delta;
        _saveState(state);
        _render(state, mission);
    }

    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) ? e.detail : {};
        var winAmount = detail.winAmount || 0;
        var betAmount = detail.betAmount || 0;

        _updateProgress(1, 'spins');
        _updateProgress(betAmount, 'bet');

        if (winAmount > 0) {
            _sessionConsecWins++;
            _updateProgress(1, 'wins');
            _updateProgress(_sessionConsecWins >= 1 ? 1 : 0, 'streak');
        } else {
            _sessionConsecWins = 0;
        }

        var mission = _getMission();
        var state = _loadState() || _defaultState(mission);
        _render(state, mission);
    }

    function _trackTime() {
        var elapsed = Math.floor((Date.now() - _sessionStartTs) / 1000);
        var mission = _getMission();
        if (mission.unit !== 'secs') return;
        var state = _loadState() || _defaultState(mission);
        if (state.claimed) return;
        state.progress = elapsed;
        _saveState(state);
        _render(state, mission);
    }

    function _init() {
        _build();

        var mission = _getMission();
        var state = _loadState() || _defaultState(mission);
        _render(state, mission);

        setTimeout(function () {
            if (_el) _el.style.transform = 'translateY(0)';
        }, SHOW_DELAY_MS);

        document.addEventListener('spinComplete', _onSpinComplete);

        _timeInterval = setInterval(_trackTime, 5000);
    }

    window.dismissDailyMission = function () {
        if (_el) _el.style.transform = 'translateY(100%)';
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
