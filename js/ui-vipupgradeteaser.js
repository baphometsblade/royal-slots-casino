/* ui-vipupgradeteaser.js — VIP Upgrade Teaser
 * Sprint 54: Slide-in panel after every 20 spins (max 3x/session) promoting VIP membership
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // constants
    var PANEL_ID = 'vipUpgradeTeaser';
    var SESSION_STORAGE_KEY = 'ms_vipTeaserSpins';
    var TRIGGER_EVERY = 20;
    var MAX_SHOWS = 3;
    var AUTO_HIDE_MS = 12000;
    var BRONZE_VIP_SPINS = 100;

    var _panel = null;
    var _spinsNeededEl = null;
    var _hideTimer = null;
    var _spinCount = 0;
    var _showCount = 0;
    var _dismissed = false;

    // persistence helpers
    function _loadSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                return {
                    spins: parseInt(data.spins, 10) || 0,
                    shows: parseInt(data.shows, 10) || 0
                };
            }
        } catch (e) {}
        return { spins: 0, shows: 0 };
    }

    function _saveSession() {
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                spins: _spinCount,
                shows: _showCount
            }));
        } catch (e) {}
    }

    // DOM build
    function _build() {
        if (document.getElementById(PANEL_ID)) return;

        var el = document.createElement('div');
        el.id = PANEL_ID;
        el.style.cssText = [
            'position: fixed',
            'top: 50%',
            'right: -320px',
            'transform: translateY(-50%)',
            'width: 280px',
            'background: linear-gradient(135deg, #1a0a2e, #2d1654)',
            'border: 1px solid #9b59b6',
            'border-right: none',
            'border-radius: 12px 0 0 12px',
            'padding: 24px 20px',
            'z-index:10400',
            'box-shadow: -4px 0 32px rgba(155,89,182,0.3)',
            'font-family: "Segoe UI", Arial, sans-serif',
            'transition: right 0.5s cubic-bezier(0.16,1,0.3,1)'
        ].join(';');

        var star = document.createElement('div');
        star.style.cssText = 'font-size: 32px; margin-bottom: 10px; text-align: center;';
        star.textContent = '\u2B50';

        var heading = document.createElement('div');
        heading.style.cssText = [
            'font-size: 16px',
            'font-weight: 800',
            'color: #d89cf7',
            'text-align: center',
            'margin-bottom: 6px',
            'letter-spacing: 0.5px'
        ].join(';');
        heading.textContent = "You're Close to VIP!";

        _spinsNeededEl = document.createElement('div');
        _spinsNeededEl.style.cssText = [
            'font-size: 13px',
            'color: #c8a0e0',
            'text-align: center',
            'margin-bottom: 14px',
            'line-height: 1.5'
        ].join(';');
        _spinsNeededEl.textContent = BRONZE_VIP_SPINS + ' more spins to Bronze VIP';

        var perks = document.createElement('div');
        perks.style.cssText = [
            'background: rgba(155,89,182,0.15)',
            'border: 1px solid rgba(155,89,182,0.3)',
            'border-radius: 8px',
            'padding: 10px 12px',
            'margin-bottom: 16px',
            'font-size: 12px',
            'color: #b89ccf',
            'line-height: 1.8'
        ].join(';');

        var perksLabel = document.createElement('strong');
        perksLabel.style.color = '#d89cf7';
        perksLabel.textContent = 'Unlock:';
        perks.appendChild(perksLabel);

        var perkLines = ['\u2714 10% Cashback', '\u2714 Priority Support', '\u2714 Exclusive Bonuses'];
        perkLines.forEach(function (line) {
            var br = document.createElement('br');
            perks.appendChild(br);
            var txt = document.createTextNode(line);
            perks.appendChild(txt);
        });

        var ctaBtn = document.createElement('button');
        ctaBtn.textContent = 'View VIP Benefits';
        ctaBtn.style.cssText = [
            'width: 100%',
            'padding: 10px 0',
            'background: linear-gradient(90deg, #9b59b6, #6c2fa0)',
            'border: none',
            'border-radius: 8px',
            'color: #fff',
            'font-weight: 700',
            'font-size: 13px',
            'cursor: pointer',
            'margin-bottom: 8px',
            'letter-spacing: 0.5px'
        ].join(';');
        ctaBtn.addEventListener('click', function () {
            if (typeof window.openVipModal === 'function') {
                window.openVipModal();
            }
            _hide();
        });

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Maybe Later';
        closeBtn.style.cssText = [
            'width: 100%',
            'padding: 7px 0',
            'background: none',
            'border: 1px solid rgba(155,89,182,0.4)',
            'border-radius: 8px',
            'color: #9b59b6',
            'font-size: 12px',
            'cursor: pointer'
        ].join(';');
        closeBtn.addEventListener('click', _hide);

        el.appendChild(star);
        el.appendChild(heading);
        el.appendChild(_spinsNeededEl);
        el.appendChild(perks);
        el.appendChild(ctaBtn);
        el.appendChild(closeBtn);

        document.body.appendChild(el);
        _panel = el;
    }

    function _show() {
        if (!_panel || _dismissed) return;

        if (_spinsNeededEl) {
            var remaining = Math.max(1, BRONZE_VIP_SPINS - _spinCount);
            _spinsNeededEl.textContent = remaining + ' more spins to Bronze VIP';
        }

        _panel.style.right = '0px';
        _showCount += 1;
        _saveSession();

        if (_hideTimer) clearTimeout(_hideTimer);
        _hideTimer = setTimeout(_hide, AUTO_HIDE_MS);
    }

    function _hide() {
        if (_hideTimer) {
            clearTimeout(_hideTimer);
            _hideTimer = null;
        }
        if (_panel) _panel.style.right = '-320px';
    }

    // event listeners
    function _onSpinComplete() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _spinCount += 1;
        _saveSession();

        if (_showCount < MAX_SHOWS && _spinCount > 0 && _spinCount % TRIGGER_EVERY === 0) {
            setTimeout(_show, 800);
        }
    }

    // public API
    window.dismissVipUpgradeTeaser = function () {
        _dismissed = true;
        _hide();
    };

    // init
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        var saved = _loadSession();
        _spinCount = saved.spins;
        _showCount = saved.shows;

        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
