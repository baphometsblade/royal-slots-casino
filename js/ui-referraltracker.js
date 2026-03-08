(function () {
    'use strict';

    /* ── Sprint 43 \u2014 Referral Bonus Tracker ─────────────────────────── */

    var STORAGE_KEY = 'ms_referralTracker';
    var PANEL_ID    = 'referralTrackerPanel';
    var SPIN_INTERVAL = 500;

    var MILESTONES = [
        { count: 1,  bonus: 5   },
        { count: 3,  bonus: 15  },
        { count: 5,  bonus: 30  },
        { count: 10, bonus: 100 }
    ];

    var _panelEl    = null;
    var _countEl    = null;
    var _barEl      = null;
    var _nextLblEl  = null;
    var _bonusLblEl = null;
    var _toastEl    = null;
    var _spinCount  = 0;

    /* ── persistence ─────────────────────────────────────────────────── */

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
    }

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { referrals: 0, claimed: [], spinAccum: 0 };
            return JSON.parse(raw);
        } catch (e) { return { referrals: 0, claimed: [], spinAccum: 0 }; }
    }

    /* ── milestone helpers ───────────────────────────────────────────── */

    function _nextMilestone(count) {
        for (var i = 0; i < MILESTONES.length; i++) {
            if (count < MILESTONES[i].count) return MILESTONES[i];
        }
        return null;
    }

    function _prevMilestone(count) {
        var prev = 0;
        for (var i = 0; i < MILESTONES.length; i++) {
            if (count < MILESTONES[i].count) return prev;
            prev = MILESTONES[i].count;
        }
        return prev;
    }

    /* ── referral link ───────────────────────────────────────────────── */

    function _getReferralLink() {
        var base = window.location.origin + window.location.pathname;
        var user = (typeof currentUser !== 'undefined' && currentUser && currentUser.username)
            ? currentUser.username : 'player';
        return base + '?ref=' + encodeURIComponent(user);
    }

    /* ── toast ────────────────────────────────────────────────────────── */

    function _showToast(msg) {
        if (!_toastEl) {
            _toastEl = document.createElement('div');
            _toastEl.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
                'background:#1a1a2e;color:#ffd700;padding:8px 18px;border-radius:8px;font-size:13px;' +
                'font-weight:bold;z-index:10300;border:1px solid #ffd700;opacity:0;transition:opacity 0.3s;' +
                'pointer-events:none;';
            document.body.appendChild(_toastEl);
        }
        _toastEl.textContent = msg;
        _toastEl.style.opacity = '1';
        setTimeout(function () { _toastEl.style.opacity = '0'; }, 2000);
    }

    /* ── DOM ──────────────────────────────────────────────────────────── */

    function _buildPanel() {
        if (_panelEl) return;

        _panelEl = document.createElement('div');
        _panelEl.id = PANEL_ID;
        _panelEl.style.cssText = 'position:fixed;bottom:140px;right:16px;z-index:10100;' +
            'background:linear-gradient(135deg,#0a1628,#1a2a4a);border:1px solid #4a90d9;' +
            'border-radius:12px;padding:14px 18px;width:260px;display:none;' +
            'box-shadow:0 4px 20px rgba(74,144,217,0.3);font-family:inherit;';

        /* Header */
        var header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'color:#4a90d9;font-weight:bold;font-size:13px;letter-spacing:1px;';
        titleEl.textContent = '\uD83D\uDC65 REFERRAL TRACKER';
        header.appendChild(titleEl);

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:#4a90d9;font-size:16px;cursor:pointer;padding:0 4px;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () { window.dismissReferralTracker(); });
        header.appendChild(closeBtn);
        _panelEl.appendChild(header);

        /* Count */
        _countEl = document.createElement('div');
        _countEl.style.cssText = 'color:#fff;font-size:22px;font-weight:bold;text-align:center;margin-bottom:6px;';
        _panelEl.appendChild(_countEl);

        /* Progress bar */
        var barWrap = document.createElement('div');
        barWrap.style.cssText = 'width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:6px;';
        _barEl = document.createElement('div');
        _barEl.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#4a90d9,#7ec8e3);border-radius:3px;transition:width 0.4s ease;';
        barWrap.appendChild(_barEl);
        _panelEl.appendChild(barWrap);

        /* Next milestone label */
        _nextLblEl = document.createElement('div');
        _nextLblEl.style.cssText = 'color:#8899aa;font-size:11px;text-align:center;margin-bottom:4px;';
        _panelEl.appendChild(_nextLblEl);

        /* Bonus label */
        _bonusLblEl = document.createElement('div');
        _bonusLblEl.style.cssText = 'color:#ffd700;font-size:12px;font-weight:bold;text-align:center;margin-bottom:10px;';
        _panelEl.appendChild(_bonusLblEl);

        /* Copy link button */
        var copyBtn = document.createElement('button');
        copyBtn.style.cssText = 'width:100%;padding:8px;background:linear-gradient(135deg,#4a90d9,#357abd);' +
            'color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;' +
            'letter-spacing:0.5px;';
        copyBtn.textContent = '\uD83D\uDD17 Copy Referral Link';
        copyBtn.addEventListener('click', function () {
            var link = _getReferralLink();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link).then(function () {
                    _showToast('Copied!');
                }).catch(function () {
                    _showToast('Copied!');
                });
            } else {
                _showToast('Copied!');
            }
        });
        _panelEl.appendChild(copyBtn);

        document.body.appendChild(_panelEl);
    }

    /* ── update UI ───────────────────────────────────────────────────── */

    function _updateUI(data) {
        if (!_panelEl) return;
        var refs = data.referrals;
        _countEl.textContent = refs + ' Referral' + (refs !== 1 ? 's' : '');

        var next = _nextMilestone(refs);
        if (next) {
            var prev = _prevMilestone(refs);
            var range = next.count - prev;
            var progress = refs - prev;
            var pct = range > 0 ? Math.min(100, (progress / range) * 100) : 0;
            _barEl.style.width = pct + '%';
            _nextLblEl.textContent = 'Next: ' + next.count + ' referrals';
            _bonusLblEl.textContent = 'Reward: $' + next.bonus + ' bonus';
        } else {
            _barEl.style.width = '100%';
            _nextLblEl.textContent = 'All milestones reached!';
            _bonusLblEl.textContent = '\u2B50 Max tier achieved';
        }
    }

    /* ── check milestones ────────────────────────────────────────────── */

    function _checkMilestones(data) {
        var changed = false;
        for (var i = 0; i < MILESTONES.length; i++) {
            var m = MILESTONES[i];
            if (data.referrals >= m.count && data.claimed.indexOf(m.count) === -1) {
                data.claimed.push(m.count);
                changed = true;
                if (typeof balance !== 'undefined') {
                    balance += m.bonus;
                    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                }
                _showToast('\uD83C\uDF81 Referral bonus: +$' + m.bonus + '!');
            }
        }
        if (changed) _save(data);
        return data;
    }

    /* ── spin hook (demo simulation) ─────────────────────────────────── */

    function _onSpin() {
        var data = _load();
        data.spinAccum = (data.spinAccum || 0) + 1;
        if (data.spinAccum >= SPIN_INTERVAL) {
            data.spinAccum = 0;
            if (Math.random() < 0.3) {
                data.referrals = (data.referrals || 0) + 1;
                data = _checkMilestones(data);
                _updateUI(data);
                _showToast('\uD83D\uDC65 New referral joined!');
            }
        }
        _save(data);
    }

    /* ── public API ──────────────────────────────────────────────────── */

    window.dismissReferralTracker = function () {
        if (_panelEl) _panelEl.style.display = 'none';
    };

    /* ── init ─────────────────────────────────────────────────────────── */

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        _buildPanel();
        var data = _load();
        data = _checkMilestones(data);
        _updateUI(data);
        _panelEl.style.display = 'block';

        /* Hook into spin events */
        var origSpin = window._spinMultiplierCheck;
        if (typeof origSpin === 'function') {
            window._spinMultiplierCheck = function () {
                origSpin();
                _onSpin();
            };
        }

        /* Also listen for custom spin events */
        document.addEventListener('spinComplete', function () { _onSpin(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 700); });
    } else {
        setTimeout(_init, 700);
    }
})();
