/* ui-sessiontime.js \u2014 Session Time Rewards
 * Sprint 32: Awards credits at time milestones during a session.
 * Self-contained IIFE; creates no external dependencies.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_sessionTimeData';
    var MILESTONES = [
        { min: 5,  reward: 2,  label: '5m' },
        { min: 15, reward: 5,  label: '15m' },
        { min: 30, reward: 15, label: '30m' },
        { min: 60, reward: 50, label: '1h' }
    ];
    var GOLD = '#fbbf24';

    var _startTime = null;
    var _claimed = {};
    var _tickInterval = null;

    // \u2500\u2500 Toast helper \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _toast(msg) {
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
            'background:linear-gradient(135deg,' + GOLD + ',#f59e0b)', 'color:#000',
            'padding:12px 22px', 'border-radius:10px', 'font-weight:800',
            'font-size:14px', 'z-index:10400', 'box-shadow:0 4px 20px rgba(0,0,0,.5)',
            'pointer-events:none', 'text-align:center', 'max-width:320px'
        ].join(';');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    }

    // \u2500\u2500 Format mm:ss \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _fmtTime(secs) {
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // \u2500\u2500 Credit reward \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _claimReward(milestone) {
        if (typeof balance !== 'undefined') balance += milestone.reward;
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
        _toast('\u23F0 Session ' + milestone.label + ' reward: +$' + milestone.reward.toFixed(2));
    }

    // \u2500\u2500 Render milestone circles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _renderMilestones(elapsedMin) {
        var container = document.getElementById('strMilestones');
        if (!container) return;
        while (container.firstChild) container.removeChild(container.firstChild);

        for (var i = 0; i < MILESTONES.length; i++) {
            var ms = MILESTONES[i];
            var circle = document.createElement('span');
            circle.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;' +
                'width:38px;height:38px;border-radius:50%;font-size:11px;font-weight:800;' +
                'margin:0 4px;transition:all .3s;';

            if (_claimed[ms.min]) {
                circle.style.background = GOLD;
                circle.style.color = '#000';
                circle.textContent = '\u2713';
            } else if (elapsedMin >= ms.min) {
                circle.style.background = GOLD;
                circle.style.color = '#000';
                circle.style.animation = 'pulse 1.2s infinite';
                circle.textContent = ms.label;
            } else {
                circle.style.background = 'rgba(255,255,255,.08)';
                circle.style.color = 'rgba(255,255,255,.35)';
                circle.textContent = ms.label;
            }
            container.appendChild(circle);
        }
    }

    // \u2500\u2500 Tick (every 1s) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _tick() {
        if (!_startTime) return;
        var elapsedSec = Math.floor((Date.now() - _startTime) / 1000);
        var elapsedMin = elapsedSec / 60;

        // Update timer display
        var timerEl = document.getElementById('strTimer');
        if (timerEl) timerEl.textContent = _fmtTime(elapsedSec);

        // Check milestones
        for (var i = 0; i < MILESTONES.length; i++) {
            var ms = MILESTONES[i];
            if (!_claimed[ms.min] && elapsedMin >= ms.min) {
                _claimed[ms.min] = true;
                _claimReward(ms);
                try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_claimed)); } catch (e) {}
            }
        }

        _renderMilestones(elapsedMin);
    }

    // \u2500\u2500 Init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _init() {
        if (window.location.search.indexOf('noBonus=1') !== -1) return;

        // Restore claimed state from sessionStorage
        try {
            var saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) _claimed = JSON.parse(saved);
        } catch (e) {}

        _startTime = Date.now();

        // Show bar
        var bar = document.getElementById('sessionTimeBar');
        if (bar) bar.style.display = 'flex';

        _renderMilestones(0);
        _tickInterval = setInterval(_tick, 1000);
    }

    // Boot on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
