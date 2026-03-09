/* ui-sessionmilestone.js — Session Milestone Celebration
 * Sprint 59: Full-screen overlay at spin milestones (50, 100, 200, 500) with bonus rewards.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'sessionMilestone';
    var COUNT_KEY = 'ms_sessionMilestoneCount';
    var CLAIMED_KEY = 'ms_milestoneClaimed';
    var Z_INDEX = 99350;
    var AUTO_DISMISS_MS = 15000;

    var MILESTONES = [
        { spins: 50, reward: 2 },
        { spins: 100, reward: 5 },
        { spins: 200, reward: 10 },
        { spins: 500, reward: 25 }
    ];

    var _overlay = null;
    var _autoDismissTimer = null;
    var _dismissed = false;
    var _currentMilestone = null;

    function _getCount() {
        try {
            var val = sessionStorage.getItem(COUNT_KEY);
            return val ? parseInt(val, 10) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }

    function _setCount(n) {
        try {
            sessionStorage.setItem(COUNT_KEY, String(n));
        } catch (e) { /* ignore */ }
    }

    function _getClaimed() {
        try {
            var val = sessionStorage.getItem(CLAIMED_KEY);
            return val ? JSON.parse(val) : [];
        } catch (e) {
            return [];
        }
    }

    function _setClaimed(arr) {
        try {
            sessionStorage.setItem(CLAIMED_KEY, JSON.stringify(arr));
        } catch (e) { /* ignore */ }
    }

    function _build() {
        _overlay = document.createElement('div');
        _overlay.id = ELEMENT_ID;
        _overlay.style.cssText = [
            'position:fixed;top:0;left:0;width:100%;height:100%;',
            'z-index:' + Z_INDEX + ';display:none;',
            'align-items:center;justify-content:center;',
            'background:rgba(5,5,20,0.94);',
            'font-family:inherit;transition:opacity 0.4s ease;opacity:0;'
        ].join('');
        document.body.appendChild(_overlay);
    }

    function _clearOverlay() {
        while (_overlay && _overlay.firstChild) {
            _overlay.removeChild(_overlay.firstChild);
        }
    }

    function _showMilestone(milestone) {
        if (_dismissed || !_overlay) return;
        _currentMilestone = milestone;

        _clearOverlay();

        var card = document.createElement('div');
        card.style.cssText = [
            'text-align:center;padding:40px 50px;border-radius:20px;',
            'background:linear-gradient(135deg,#1a1a3e 0%,#2d1b69 50%,#1a1a3e 100%);',
            'border:3px solid #ffd700;max-width:420px;width:90%;',
            'box-shadow:0 0 60px rgba(255,215,0,0.3);',
            'transform:scale(0);transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);'
        ].join('');

        var emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:56px;margin-bottom:10px;';
        emoji.textContent = '\uD83C\uDFAF';

        var title = document.createElement('div');
        title.style.cssText = [
            'font-size:32px;font-weight:bold;margin-bottom:8px;',
            'background:linear-gradient(90deg,#ffd700,#ff8c00);',
            '-webkit-background-clip:text;-webkit-text-fill-color:transparent;',
            'background-clip:text;'
        ].join('');
        title.textContent = 'MILESTONE!';

        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:20px;color:#e0e0ff;margin-bottom:18px;';
        subtitle.textContent = milestone.spins + ' Spins Reached!';

        var rewardLine = document.createElement('div');
        rewardLine.style.cssText = 'font-size:22px;color:#ffd700;font-weight:bold;margin-bottom:28px;';
        rewardLine.textContent = 'Here\'s $' + milestone.reward.toFixed(2) + ' on us!';

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = [
            'display:inline-block;padding:14px 36px;font-size:18px;font-weight:bold;',
            'color:#1a1a2e;background:linear-gradient(90deg,#ffd700,#ff8c00);',
            'border:none;border-radius:30px;cursor:pointer;margin:0 8px;',
            'box-shadow:0 4px 16px rgba(255,215,0,0.4);',
            'transition:transform 0.2s,box-shadow 0.2s;'
        ].join('');
        claimBtn.textContent = 'Claim Reward';
        claimBtn.addEventListener('mouseenter', function () {
            claimBtn.style.transform = 'scale(1.05)';
        });
        claimBtn.addEventListener('mouseleave', function () {
            claimBtn.style.transform = 'scale(1)';
        });
        claimBtn.addEventListener('click', function () {
            _claimReward(milestone);
        });

        var skipBtn = document.createElement('button');
        skipBtn.style.cssText = [
            'display:inline-block;padding:12px 28px;font-size:15px;',
            'color:#aaa;background:transparent;border:1px solid #555;',
            'border-radius:30px;cursor:pointer;margin:0 8px;',
            'transition:color 0.2s,border-color 0.2s;'
        ].join('');
        skipBtn.textContent = 'Continue Playing';
        skipBtn.addEventListener('mouseenter', function () {
            skipBtn.style.color = '#fff';
            skipBtn.style.borderColor = '#888';
        });
        skipBtn.addEventListener('mouseleave', function () {
            skipBtn.style.color = '#aaa';
            skipBtn.style.borderColor = '#555';
        });
        skipBtn.addEventListener('click', function () {
            _hideOverlay();
        });

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:center;flex-wrap:wrap;gap:10px;';
        btnRow.appendChild(claimBtn);
        btnRow.appendChild(skipBtn);

        card.appendChild(emoji);
        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(rewardLine);
        card.appendChild(btnRow);

        _overlay.appendChild(card);
        _overlay.style.display = 'flex';

        requestAnimationFrame(function () {
            _overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        // Auto-dismiss after 15s and still award
        _autoDismissTimer = setTimeout(function () {
            _claimReward(milestone);
        }, AUTO_DISMISS_MS);
    }

    function _claimReward(milestone) {
        if (typeof window.balance === 'number') {
            window.balance += milestone.reward;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }
        _markClaimed(milestone.spins);
        _hideOverlay();
    }

    function _markClaimed(spins) {
        var claimed = _getClaimed();
        if (claimed.indexOf(spins) === -1) {
            claimed.push(spins);
            _setClaimed(claimed);
        }
    }

    function _hideOverlay() {
        if (_autoDismissTimer) {
            clearTimeout(_autoDismissTimer);
            _autoDismissTimer = null;
        }
        _currentMilestone = null;
        if (!_overlay) return;
        _overlay.style.opacity = '0';
        setTimeout(function () {
            if (_overlay) {
                _overlay.style.display = 'none';
                _clearOverlay();
            }
        }, 400);
    }

    function _onSpinComplete() {
        if (_dismissed) return;
        var count = _getCount() + 1;
        _setCount(count);

        if (_currentMilestone) return; // already showing

        var claimed = _getClaimed();
        for (var i = 0; i < MILESTONES.length; i++) {
            var m = MILESTONES[i];
            if (count >= m.spins && claimed.indexOf(m.spins) === -1) {
                _showMilestone(m);
                return;
            }
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissSessionMilestone = function () {
        _dismissed = true;
        _hideOverlay();
        if (_overlay) {
            _overlay.style.display = 'none';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
