/* ==========================================================
   ui-freespinmeter.js — Free Spin Bonus Meter
   Sprint 46 — Earn free spins by spinning
   ========================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_freeSpinMeter';
    var BAR_ID = 'freeSpinMeterBar';
    var SPINS_TO_FILL = 200;
    var FREE_SPIN_REWARD = 5;

    /* ---- Helpers ---- */

    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                return {
                    currentSpins: typeof parsed.currentSpins === 'number' ? parsed.currentSpins : 0,
                    totalClaimed: typeof parsed.totalClaimed === 'number' ? parsed.totalClaimed : 0,
                    visible: typeof parsed.visible === 'boolean' ? parsed.visible : true
                };
            }
        } catch (e) { /* ignore */ }
        return { currentSpins: 0, totalClaimed: 0, visible: true };
    }

    function _saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function _el(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    /* ---- Show Toast ---- */

    function _showToast(msg) {
        if (typeof showToast === 'function') {
            showToast(msg);
            return;
        }
        if (typeof showWinToast === 'function') {
            showWinToast(msg);
            return;
        }
        /* Fallback toast */
        var toast = _el('div', 's46-fsm-toast', msg);
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
            'background:linear-gradient(135deg,#1a1a2e,#16213e);color:#ffd700;padding:12px 24px;' +
            'border-radius:8px;z-index:100000;font-weight:bold;border:1px solid rgba(255,215,0,0.3);' +
            'animation:fadeInDown 0.3s ease;';
        document.body.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 3000);
    }

    /* ---- Build Bar ---- */

    function _buildBar() {
        var existing = document.getElementById(BAR_ID);
        if (existing) existing.remove();

        var state = _loadState();

        var bar = _el('div', 'freespin-meter-bar');
        bar.id = BAR_ID;

        if (!state.visible) {
            bar.style.display = 'none';
        }

        var pct = Math.min((state.currentSpins / SPINS_TO_FILL) * 100, 100);
        var isFull = state.currentSpins >= SPINS_TO_FILL;

        /* Icon — slot machine emoji \uD83C\uDFB0 */
        var icon = _el('span', 's46-fsm-icon', '\uD83C\uDFB0');
        bar.appendChild(icon);

        /* Label */
        var label = _el('span', 's46-fsm-label', 'Free Spins');
        bar.appendChild(label);

        /* Meter wrapper */
        var meterWrap = _el('div', 's46-fsm-meter');

        var meterFill = _el('div', 's46-fsm-meter-fill');
        meterFill.style.width = pct + '%';
        if (isFull) {
            meterFill.classList.add('s46-fsm-full');
        }
        meterWrap.appendChild(meterFill);

        bar.appendChild(meterWrap);

        /* Spin count */
        var count = _el('span', 's46-fsm-count');
        count.id = 'fsmSpinCount';
        count.textContent = Math.min(state.currentSpins, SPINS_TO_FILL) + '/' + SPINS_TO_FILL;
        bar.appendChild(count);

        /* Badge showing total claimed */
        if (state.totalClaimed > 0) {
            var badge = _el('span', 's46-fsm-badge');
            badge.textContent = state.totalClaimed + ' claimed';
            bar.appendChild(badge);
        }

        /* Claim button (shown when meter is full) */
        if (isFull) {
            var claimBtn = _el('button', 's46-fsm-claim-btn');
            /* gift emoji \uD83C\uDF81 */
            claimBtn.textContent = '\uD83C\uDF81 Claim ' + FREE_SPIN_REWARD + ' Free Spins!';
            claimBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _claimReward();
            });
            bar.appendChild(claimBtn);
        }

        /* Close button */
        var closeBtn = _el('button', 's46-fsm-close', '\u2715');
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            _dismiss();
        });
        bar.appendChild(closeBtn);

        document.body.appendChild(bar);
        return bar;
    }

    /* ---- Track Spin ---- */

    function _trackSpin() {
        if (_isQA()) return;

        var state = _loadState();
        if (state.currentSpins < SPINS_TO_FILL) {
            state.currentSpins++;
            _saveState(state);
        }

        _updateDisplay(state);
    }

    /* ---- Update Display ---- */

    function _updateDisplay(state) {
        if (!state) state = _loadState();

        var bar = document.getElementById(BAR_ID);
        if (!bar) return;

        var pct = Math.min((state.currentSpins / SPINS_TO_FILL) * 100, 100);
        var isFull = state.currentSpins >= SPINS_TO_FILL;

        /* Update fill */
        var fill = bar.querySelector('.s46-fsm-meter-fill');
        if (fill) {
            fill.style.width = pct + '%';
            if (isFull) {
                fill.classList.add('s46-fsm-full');
            } else {
                fill.classList.remove('s46-fsm-full');
            }
        }

        /* Update count */
        var countEl = document.getElementById('fsmSpinCount');
        if (countEl) {
            countEl.textContent = Math.min(state.currentSpins, SPINS_TO_FILL) + '/' + SPINS_TO_FILL;
        }

        /* Add claim button if full and not already present */
        if (isFull && !bar.querySelector('.s46-fsm-claim-btn')) {
            var claimBtn = _el('button', 's46-fsm-claim-btn');
            claimBtn.textContent = '\uD83C\uDF81 Claim ' + FREE_SPIN_REWARD + ' Free Spins!';
            claimBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _claimReward();
            });
            /* Insert before close button */
            var closeBtn = bar.querySelector('.s46-fsm-close');
            if (closeBtn) {
                bar.insertBefore(claimBtn, closeBtn);
            } else {
                bar.appendChild(claimBtn);
            }
        }
    }

    /* ---- Claim Reward ---- */

    function _claimReward() {
        var state = _loadState();
        if (state.currentSpins < SPINS_TO_FILL) return;

        /* Reset meter */
        state.currentSpins = 0;
        state.totalClaimed += FREE_SPIN_REWARD;
        _saveState(state);

        /* Add free spins to balance as credit bonus */
        var bonusAmount = FREE_SPIN_REWARD * 0.50; /* $0.50 per free spin value */
        if (typeof balance !== 'undefined') {
            balance += bonusAmount;
        }
        if (typeof updateBalanceDisplay === 'function') {
            updateBalanceDisplay();
        }

        /* Show toast */
        /* party emoji \uD83C\uDF89 */
        _showToast('\uD83C\uDF89 ' + FREE_SPIN_REWARD + ' Free Spins claimed! +$' + bonusAmount.toFixed(2));

        /* Rebuild bar */
        _buildBar();
    }

    /* ---- Dismiss ---- */

    function _dismiss() {
        var bar = document.getElementById(BAR_ID);
        if (!bar) return;

        bar.classList.add('s46-fsm-hiding');
        var state = _loadState();
        state.visible = false;
        _saveState(state);

        setTimeout(function () {
            if (bar.parentNode) bar.remove();
        }, 300);
    }

    /* ---- Public API ---- */

    window._freeSpinMeterTrackSpin = _trackSpin;
    window.dismissFreeSpinMeter = _dismiss;

    /* ---- Init ---- */

    function _init() {
        if (_isQA()) return;
        _buildBar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
