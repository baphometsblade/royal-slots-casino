/* ui-mysteryreward.js — Mystery Reward Box
 * Sprint 59: Floating gift box appears after 15 spins, reveals random reward on click.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'mysteryRewardBox';
    var SPINS_KEY = 'ms_mysteryRewardSpins';
    var SPINS_REQUIRED = 15;
    var POPUP_DURATION = 2500;
    var Z_INDEX = 9050;

    var _container = null;
    var _giftIcon = null;
    var _popupEl = null;
    var _styleTag = null;
    var _dismissed = false;
    var _showing = false;

    function _getSpinCount() {
        try {
            var val = sessionStorage.getItem(SPINS_KEY);
            return val ? parseInt(val, 10) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }

    function _setSpinCount(n) {
        try {
            sessionStorage.setItem(SPINS_KEY, String(n));
        } catch (e) { /* ignore */ }
    }

    function _pickReward() {
        var roll = Math.random();
        if (roll < 0.10) {
            return { type: 'bonus', amount: 25, label: '$25.00 Bonus!' };
        } else if (roll < 0.30) {
            return { type: 'bonus', amount: 5 + Math.random() * 10, label: null };
        } else if (roll < 0.60) {
            return { type: 'multiplier', amount: 0, label: '2\u00D7 Multiplier Next Spin!' };
        } else {
            return { type: 'bonus', amount: 1 + Math.random() * 4, label: null };
        }
    }

    function _injectStyles() {
        _styleTag = document.createElement('style');
        _styleTag.textContent = [
            '@keyframes mysteryRewardPulse {',
            '  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255,215,0,0.5)); }',
            '  50% { transform: scale(1.15); filter: drop-shadow(0 0 14px rgba(255,215,0,0.9)); }',
            '}',
            '@keyframes mysteryRewardPopIn {',
            '  0% { transform: scale(0) rotate(-15deg); opacity: 0; }',
            '  60% { transform: scale(1.2) rotate(3deg); opacity: 1; }',
            '  100% { transform: scale(1) rotate(0deg); opacity: 1; }',
            '}',
            '@keyframes mysteryRewardFadeOut {',
            '  0% { opacity: 1; transform: scale(1); }',
            '  100% { opacity: 0; transform: scale(0.7) translateY(20px); }',
            '}'
        ].join('\n');
        document.head.appendChild(_styleTag);
    }

    function _build() {
        _container = document.createElement('div');
        _container.id = ELEMENT_ID;
        _container.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:' + Z_INDEX + ';pointer-events:none;';

        _giftIcon = document.createElement('div');
        _giftIcon.style.cssText = [
            'width:64px;height:64px;cursor:pointer;pointer-events:auto;',
            'display:none;align-items:center;justify-content:center;',
            'font-size:42px;border-radius:14px;',
            'background:linear-gradient(135deg,#b8860b,#ffd700,#b8860b);',
            'box-shadow:0 4px 18px rgba(255,215,0,0.4);',
            'animation:mysteryRewardPulse 1.8s ease-in-out infinite;',
            'user-select:none;'
        ].join('');
        _giftIcon.textContent = '\uD83C\uDF81';
        _giftIcon.setAttribute('title', 'Mystery Reward!');
        _giftIcon.addEventListener('click', _onGiftClick);
        _container.appendChild(_giftIcon);

        _popupEl = document.createElement('div');
        _popupEl.style.cssText = [
            'position:absolute;bottom:80px;left:0;min-width:220px;padding:18px 22px;',
            'background:linear-gradient(135deg,#1a1a3e,#2d1b69);',
            'border:2px solid #ffd700;border-radius:16px;',
            'color:#fff;text-align:center;font-family:inherit;',
            'box-shadow:0 8px 30px rgba(0,0,0,0.6);',
            'display:none;pointer-events:auto;'
        ].join('');
        _container.appendChild(_popupEl);

        document.body.appendChild(_container);
    }

    function _showGift() {
        if (_dismissed || _showing) return;
        _giftIcon.style.display = 'flex';
    }

    function _hideGift() {
        _giftIcon.style.display = 'none';
    }

    function _clearPopup() {
        while (_popupEl.firstChild) {
            _popupEl.removeChild(_popupEl.firstChild);
        }
    }

    function _onGiftClick() {
        if (_showing) return;
        _showing = true;
        _hideGift();

        var reward = _pickReward();
        var rewardText = '';

        if (reward.type === 'multiplier') {
            rewardText = reward.label;
            if (typeof window !== 'undefined') {
                window._mysteryMultiplier = 2.0;
            }
        } else {
            var amt = Math.round(reward.amount * 100) / 100;
            rewardText = reward.label || ('$' + amt.toFixed(2) + ' Bonus!');
            if (typeof window.balance === 'number') {
                window.balance += amt;
            }
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
        }

        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:6px;';
        titleEl.textContent = '\uD83C\uDF81 Mystery Reward!';

        var rewardEl = document.createElement('div');
        rewardEl.style.cssText = 'font-size:18px;color:#ffd700;font-weight:bold;';
        rewardEl.textContent = rewardText;

        _clearPopup();
        _popupEl.appendChild(titleEl);
        _popupEl.appendChild(rewardEl);
        _popupEl.style.display = 'block';
        _popupEl.style.animation = 'mysteryRewardPopIn 0.4s ease-out forwards';

        _setSpinCount(0);

        setTimeout(function () {
            _popupEl.style.animation = 'mysteryRewardFadeOut 0.4s ease-in forwards';
            setTimeout(function () {
                _popupEl.style.display = 'none';
                _popupEl.style.animation = '';
                _showing = false;
            }, 400);
        }, POPUP_DURATION);
    }

    function _onSpinComplete() {
        if (_dismissed) return;
        var count = _getSpinCount() + 1;
        _setSpinCount(count);

        // Reset mystery multiplier after one spin
        if (typeof window !== 'undefined' && window._mysteryMultiplier && window._mysteryMultiplier > 1) {
            window._mysteryMultiplier = 1.0;
        }

        if (count >= SPINS_REQUIRED && !_showing) {
            _showGift();
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _injectStyles();
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);

        // Check if already at threshold on load
        if (_getSpinCount() >= SPINS_REQUIRED) {
            _showGift();
        }
    }

    window.dismissMysteryReward = function () {
        _dismissed = true;
        if (_container) {
            _container.style.display = 'none';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
