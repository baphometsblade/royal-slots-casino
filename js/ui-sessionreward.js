(function () {
    'use strict';

    /* ── Sprint 43 \u2014 Session Rewards Popup ──────────────────────────── */

    var STORAGE_KEY = 'ms_sessionReward';
    var POPUP_ID    = 'sessionRewardPopup';
    var CHECK_INTERVAL = 15000;

    var TIERS = [
        { minutes: 15,  bonus: 2,  label: '15 min' },
        { minutes: 30,  bonus: 5,  label: '30 min' },
        { minutes: 60,  bonus: 10, label: '1 hour' },
        { minutes: 120, bonus: 25, label: '2 hours' }
    ];

    var _popupEl     = null;
    var _titleEl     = null;
    var _descEl      = null;
    var _bonusEl     = null;
    var _claimBtn    = null;
    var _timerEl     = null;
    var _intervalId  = null;
    var _sessionStart = Date.now();
    var _pendingTier  = null;

    /* ── persistence ─────────────────────────────────────────────────── */

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
    }

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { claimed: [], sessionId: null };
            return JSON.parse(raw);
        } catch (e) { return { claimed: [], sessionId: null }; }
    }

    function _getSessionId() {
        return 'sess_' + _sessionStart;
    }

    /* ── DOM ──────────────────────────────────────────────────────────── */

    function _buildPopup() {
        if (_popupEl) return;

        _popupEl = document.createElement('div');
        _popupEl.id = POPUP_ID;
        _popupEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'z-index:10500;background:linear-gradient(135deg,#1a0a2e,#2d1b69);border:2px solid #ffd700;' +
            'border-radius:16px;padding:24px 30px;width:300px;display:none;text-align:center;' +
            'box-shadow:0 0 40px rgba(255,215,0,0.3);font-family:inherit;';

        /* Close button */
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;' +
            'color:#ffd700;font-size:18px;cursor:pointer;padding:2px 6px;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () { window.dismissSessionReward(); });
        _popupEl.appendChild(closeBtn);

        /* Icon */
        var iconEl = document.createElement('div');
        iconEl.style.cssText = 'font-size:36px;margin-bottom:8px;';
        iconEl.textContent = '\u23F0';
        _popupEl.appendChild(iconEl);

        /* Title */
        _titleEl = document.createElement('div');
        _titleEl.style.cssText = 'color:#ffd700;font-weight:bold;font-size:16px;margin-bottom:6px;letter-spacing:1px;';
        _titleEl.textContent = 'SESSION REWARD';
        _popupEl.appendChild(_titleEl);

        /* Description */
        _descEl = document.createElement('div');
        _descEl.style.cssText = 'color:#ccc;font-size:13px;margin-bottom:12px;line-height:1.4;';
        _popupEl.appendChild(_descEl);

        /* Bonus amount */
        _bonusEl = document.createElement('div');
        _bonusEl.style.cssText = 'color:#00ff88;font-size:28px;font-weight:bold;margin-bottom:16px;' +
            'text-shadow:0 0 12px rgba(0,255,136,0.4);';
        _popupEl.appendChild(_bonusEl);

        /* Claim button */
        _claimBtn = document.createElement('button');
        _claimBtn.style.cssText = 'width:100%;padding:12px;background:linear-gradient(135deg,#ffd700,#ffaa00);' +
            'color:#1a0a2e;border:none;border-radius:10px;font-size:14px;font-weight:bold;cursor:pointer;' +
            'letter-spacing:1px;margin-bottom:10px;';
        _claimBtn.textContent = '\uD83C\uDF81 CLAIM REWARD';
        _claimBtn.addEventListener('click', _claimReward);
        _popupEl.appendChild(_claimBtn);

        /* Session timer */
        _timerEl = document.createElement('div');
        _timerEl.style.cssText = 'color:#8899aa;font-size:11px;';
        _popupEl.appendChild(_timerEl);

        document.body.appendChild(_popupEl);
    }

    /* ── overlay ──────────────────────────────────────────────────────── */

    var _overlayEl = null;

    function _showOverlay() {
        if (!_overlayEl) {
            _overlayEl = document.createElement('div');
            _overlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                'background:rgba(0,0,0,0.5);z-index:10499;';
            _overlayEl.addEventListener('click', function () { window.dismissSessionReward(); });
        }
        document.body.appendChild(_overlayEl);
    }

    function _hideOverlay() {
        if (_overlayEl && _overlayEl.parentNode) {
            _overlayEl.parentNode.removeChild(_overlayEl);
        }
    }

    /* ── show / hide ─────────────────────────────────────────────────── */

    function _showPopup(tier) {
        _buildPopup();
        _pendingTier = tier;
        _descEl.textContent = 'You\u2019ve been playing for ' + tier.label + '! Here\u2019s a reward for your loyalty.';
        _bonusEl.textContent = '+$' + tier.bonus;
        _showOverlay();
        _popupEl.style.display = 'block';
    }

    function _hidePopup() {
        if (_popupEl) _popupEl.style.display = 'none';
        _hideOverlay();
        _pendingTier = null;
    }

    /* ── claim ────────────────────────────────────────────────────────── */

    function _claimReward() {
        if (!_pendingTier) return;
        var tier = _pendingTier;

        if (typeof balance !== 'undefined') {
            balance += tier.bonus;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }

        var data = _load();
        var sid = _getSessionId();
        if (data.sessionId !== sid) {
            data.sessionId = sid;
            data.claimed = [];
        }
        if (data.claimed.indexOf(tier.minutes) === -1) {
            data.claimed.push(tier.minutes);
        }
        _save(data);
        _hidePopup();
    }

    /* ── timer display ───────────────────────────────────────────────── */

    function _formatElapsed() {
        var elapsed = Math.floor((Date.now() - _sessionStart) / 1000);
        var h = Math.floor(elapsed / 3600);
        var m = Math.floor((elapsed % 3600) / 60);
        var s = elapsed % 60;
        var parts = [];
        if (h > 0) parts.push(h + 'h');
        parts.push(m + 'm');
        parts.push(s + 's');
        return parts.join(' ');
    }

    /* ── check loop ──────────────────────────────────────────────────── */

    function _check() {
        var elapsedMin = (Date.now() - _sessionStart) / 60000;
        var data = _load();
        var sid = _getSessionId();

        if (data.sessionId !== sid) {
            data.sessionId = sid;
            data.claimed = [];
            _save(data);
        }

        /* Update timer display */
        if (_timerEl) {
            _timerEl.textContent = 'Session: ' + _formatElapsed();
        }

        /* Don't show if popup already visible */
        if (_popupEl && _popupEl.style.display !== 'none') return;

        /* Find highest unclaimed reached tier */
        for (var i = TIERS.length - 1; i >= 0; i--) {
            var tier = TIERS[i];
            if (elapsedMin >= tier.minutes && data.claimed.indexOf(tier.minutes) === -1) {
                _showPopup(tier);
                return;
            }
        }
    }

    /* ── public API ──────────────────────────────────────────────────── */

    window.dismissSessionReward = function () {
        _hidePopup();
    };

    /* ── init ─────────────────────────────────────────────────────────── */

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        _buildPopup();
        _check();
        _intervalId = setInterval(_check, CHECK_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 800); });
    } else {
        setTimeout(_init, 800);
    }

})();
