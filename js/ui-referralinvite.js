/* ui-referralinvite.js — Referral Invite Widget
 * Sprint 56: Bottom-left slide-in widget appearing 90s after load with referral code.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_referralInvite';
    var SHOW_DELAY_MS = 90000;
    var AUTO_HIDE_MS = 15000;
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;
    var COPIED_RESET_MS = 2000;
    var Z_INDEX = 9000;

    var _el = null;
    var _hideTimer = null;
    var _showTimer = null;
    var _referralCode = null;

    function _loadTs() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? parseInt(raw, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    function _saveTs() {
        try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch (e) {}
    }

    function _canShow() {
        var last = _loadTs();
        return (Date.now() - last) >= COOLDOWN_MS;
    }

    function _generateCode() {
        var raw = '';
        try {
            raw = btoa(String(Date.now())).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
        } catch (e) {
            raw = String(Date.now()).slice(-6);
        }
        return 'REF-' + raw;
    }

    function _copyToClipboard(text, btn) {
        function onSuccess() {
            btn.textContent = '\u2705 Copied!';
            setTimeout(function () {
                btn.textContent = 'Copy Code';
            }, COPIED_RESET_MS);
        }

        function onFail() {
            // execCommand fallback
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                onSuccess();
            } catch (err) {
                btn.textContent = 'Copy failed';
            }
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(onSuccess, onFail);
        } else {
            onFail();
        }
    }

    function _build(code) {
        var el = document.createElement('div');
        el.id = 'referralInviteWidget';
        el.style.cssText = [
            'position:fixed',
            'bottom:24px',
            'left:24px',
            'width:260px',
            'background:linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
            'border:1px solid #00bcd4',
            'border-radius:12px',
            'padding:18px 18px 16px',
            'z-index:' + Z_INDEX,
            'box-shadow:0 8px 32px rgba(0,188,212,0.25)',
            'transform:translateX(-300px)',
            'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            'font-family:inherit',
        ].join(';');

        var topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;';

        var icon = document.createElement('span');
        icon.textContent = '\ud83d\udc65';
        icon.style.cssText = 'font-size:28px;line-height:1;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'background:none',
            'border:none',
            'color:rgba(255,255,255,0.45)',
            'font-size:20px',
            'cursor:pointer',
            'line-height:1',
            'padding:0',
        ].join(';');
        closeBtn.addEventListener('click', function () {
            window.dismissReferralInvite();
        });

        topRow.appendChild(icon);
        topRow.appendChild(closeBtn);

        var heading = document.createElement('div');
        heading.textContent = 'Invite Friends!';
        heading.style.cssText = 'color:#00bcd4;font-size:15px;font-weight:700;margin-bottom:6px;';

        var body = document.createElement('p');
        body.textContent = 'Share your referral link and earn $10 for each friend who deposits!';
        body.style.cssText = 'color:#b0d8e0;font-size:12px;line-height:1.5;margin:0 0 12px;';

        var codeBox = document.createElement('div');
        codeBox.style.cssText = [
            'background:rgba(0,188,212,0.1)',
            'border:1px solid rgba(0,188,212,0.3)',
            'border-radius:6px',
            'padding:8px 10px',
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'margin-bottom:10px',
            'gap:8px',
        ].join(';');

        var codeDisplay = document.createElement('span');
        codeDisplay.textContent = code;
        codeDisplay.style.cssText = 'color:#00e5ff;font-size:14px;font-weight:700;letter-spacing:1.5px;font-family:monospace;';

        var copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy Code';
        copyBtn.style.cssText = [
            'background:#00bcd4',
            'color:#000',
            'border:none',
            'border-radius:5px',
            'padding:5px 10px',
            'font-size:11px',
            'font-weight:700',
            'cursor:pointer',
            'white-space:nowrap',
            'transition:opacity 0.2s',
            'flex-shrink:0',
        ].join(';');
        copyBtn.addEventListener('mouseover', function () { copyBtn.style.opacity = '0.8'; });
        copyBtn.addEventListener('mouseout', function () { copyBtn.style.opacity = '1'; });
        copyBtn.addEventListener('click', function () {
            _copyToClipboard(code, copyBtn);
        });

        codeBox.appendChild(codeDisplay);
        codeBox.appendChild(copyBtn);

        var terms = document.createElement('div');
        terms.textContent = 'Your friend must deposit within 30 days.';
        terms.style.cssText = 'color:rgba(255,255,255,0.3);font-size:10px;text-align:center;';

        el.appendChild(topRow);
        el.appendChild(heading);
        el.appendChild(body);
        el.appendChild(codeBox);
        el.appendChild(terms);

        document.body.appendChild(el);
        _el = el;
    }

    function _show() {
        if (!_canShow()) return;
        if (!_referralCode) _referralCode = _generateCode();
        if (!_el) _build(_referralCode);
        _saveTs();

        requestAnimationFrame(function () {
            _el.style.transform = 'translateX(0)';
        });

        if (_hideTimer) clearTimeout(_hideTimer);
        _hideTimer = setTimeout(function () {
            window.dismissReferralInvite();
        }, AUTO_HIDE_MS);
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (!_canShow()) return;
        _referralCode = _generateCode();
        _build(_referralCode);
        _showTimer = setTimeout(_show, SHOW_DELAY_MS);
    }

    window.dismissReferralInvite = function () {
        if (_el) {
            _el.style.transform = 'translateX(-300px)';
        }
        if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
        if (_showTimer) { clearTimeout(_showTimer); _showTimer = null; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
