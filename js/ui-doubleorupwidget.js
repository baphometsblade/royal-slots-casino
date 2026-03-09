/* ui-doubleorupwidget.js — Double or Up Widget
 * Sprint 57: Compact post-win widget offering players a 50/50 double-or-nothing gamble.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_doubleOrUp';
    var ELEMENT_ID = 'doubleOrUpWidget';
    var AUTO_DISMISS_MS = 12000;
    var APPEAR_DELAY_MS = 1000;

    var _widget = null;
    var _autoDismissTimer = null;
    var _appearTimer = null;
    var _pendingWinAmount = 0;

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _formatCurrency(amount) {
        return '$' + amount.toFixed(2);
    }

    function _clearTimers() {
        if (_autoDismissTimer) {
            clearTimeout(_autoDismissTimer);
            _autoDismissTimer = null;
        }
        if (_appearTimer) {
            clearTimeout(_appearTimer);
            _appearTimer = null;
        }
    }

    function _removeWidget() {
        if (_widget && _widget.parentNode) {
            _widget.parentNode.removeChild(_widget);
        }
        _widget = null;
    }

    function _build(winAmount) {
        _removeWidget();

        var outer = document.createElement('div');
        outer.id = ELEMENT_ID;
        outer.style.cssText = [
            'position:fixed',
            'bottom:80px',
            'right:20px',
            'width:220px',
            'background:linear-gradient(135deg,#2d1654,#1a0a2e)',
            'border:1px solid #9b59b6',
            'border-radius:12px',
            'box-shadow:0 4px 24px rgba(155,89,182,0.5)',
            'padding:16px',
            'z-index:10400',
            'font-family:sans-serif',
            'color:#fff',
            'animation:doubleUpFadeIn 0.35s ease'
        ].join(';');

        var style = document.createElement('style');
        style.textContent = '@keyframes doubleUpFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(style);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:15px;font-weight:700;color:#9b59b6;margin-bottom:6px;text-align:center;';
        title.textContent = '\uD83D\uDCB0 Double It?';

        var subline = document.createElement('div');
        subline.style.cssText = 'font-size:12px;color:#ccc;text-align:center;margin-bottom:4px;';
        subline.textContent = 'Current Win: ' + _formatCurrency(winAmount);

        var note = document.createElement('div');
        note.style.cssText = 'font-size:10px;color:#999;text-align:center;margin-bottom:12px;';
        note.textContent = '50/50 chance to double or lose it';

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;';

        var btnDouble = document.createElement('button');
        btnDouble.style.cssText = [
            'flex:1',
            'background:linear-gradient(135deg,#9b59b6,#6c3483)',
            'border:none',
            'border-radius:8px',
            'color:#fff',
            'font-weight:700',
            'font-size:12px',
            'padding:8px 4px',
            'cursor:pointer'
        ].join(';');
        btnDouble.textContent = 'Double Up';

        var btnTake = document.createElement('button');
        btnTake.style.cssText = [
            'flex:1',
            'background:rgba(255,255,255,0.1)',
            'border:1px solid rgba(255,255,255,0.2)',
            'border-radius:8px',
            'color:#ccc',
            'font-size:12px',
            'padding:8px 4px',
            'cursor:pointer'
        ].join(';');
        btnTake.textContent = 'Take Win';

        var timerBar = document.createElement('div');
        timerBar.style.cssText = [
            'margin-top:10px',
            'height:3px',
            'border-radius:2px',
            'background:#9b59b6',
            'transform-origin:left',
            'transition:transform ' + AUTO_DISMISS_MS + 'ms linear'
        ].join(';');

        btnDouble.addEventListener('click', function () {
            _clearTimers();
            var won = Math.random() < 0.5;
            var result;
            if (won) {
                var doubled = winAmount * 2;
                if (typeof window.balance === 'number') {
                    window.balance = parseFloat((window.balance + doubled).toFixed(2));
                }
                if (typeof window.updateBalanceDisplay === 'function') {
                    window.updateBalanceDisplay();
                }
                result = { outcome: 'win', amount: doubled, ts: Date.now() };
                _showResult(outer, true, doubled);
            } else {
                if (typeof window.balance === 'number') {
                    window.balance = parseFloat((window.balance - winAmount).toFixed(2));
                    if (window.balance < 0) window.balance = 0;
                }
                if (typeof window.updateBalanceDisplay === 'function') {
                    window.updateBalanceDisplay();
                }
                result = { outcome: 'loss', amount: winAmount, ts: Date.now() };
                _showResult(outer, false, winAmount);
            }
            _save(result);
        });

        btnTake.addEventListener('click', function () {
            _clearTimers();
            _save({ outcome: 'taken', amount: winAmount, ts: Date.now() });
            window.dismissDoubleOrUpWidget();
        });

        btnRow.appendChild(btnDouble);
        btnRow.appendChild(btnTake);

        outer.appendChild(title);
        outer.appendChild(subline);
        outer.appendChild(note);
        outer.appendChild(btnRow);
        outer.appendChild(timerBar);

        document.body.appendChild(outer);
        _widget = outer;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                timerBar.style.transform = 'scaleX(0)';
            });
        });

        _autoDismissTimer = setTimeout(function () {
            window.dismissDoubleOrUpWidget();
        }, AUTO_DISMISS_MS);
    }

    function _showResult(container, won, amount) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        var msg = document.createElement('div');
        msg.style.cssText = 'text-align:center;padding:12px 0;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:28px;margin-bottom:8px;';
        icon.textContent = won ? '\uD83C\uDF89' : '\uD83D\uDCA8';

        var txt = document.createElement('div');
        txt.style.cssText = 'font-size:13px;font-weight:700;color:' + (won ? '#2ecc71' : '#e74c3c') + ';';
        txt.textContent = won ? ('You won ' + _formatCurrency(amount) + '!') : ('Lost ' + _formatCurrency(amount));

        msg.appendChild(icon);
        msg.appendChild(txt);
        container.appendChild(msg);

        setTimeout(function () {
            window.dismissDoubleOrUpWidget();
        }, 2500);
    }

    function _trigger(winAmount) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (!winAmount || winAmount <= 0) return;
        _clearTimers();
        _pendingWinAmount = winAmount;
        _appearTimer = setTimeout(function () {
            _build(_pendingWinAmount);
        }, APPEAR_DELAY_MS);
    }

    function _onSpinComplete(evt) {
        var detail = (evt && evt.detail) || {};
        var amount = parseFloat(detail.winAmount) || 0;
        if (amount > 0) {
            _trigger(amount);
        }
    }

    window.dismissDoubleOrUpWidget = function () {
        _clearTimers();
        _removeWidget();
    };

    document.addEventListener('spinComplete', _onSpinComplete);

})();
