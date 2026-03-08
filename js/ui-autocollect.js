/* ==========================================================
   ui-autocollect.js — Auto-Collect Rewards Bar
   Sprint 45 — Automatically collects small rewards (<$10)
   ========================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_autoCollect';
    var BAR_ID = 'autoCollectBar';
    var MAX_THRESHOLD = 10;
    var MAX_HISTORY = 10;

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
                    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
                    total: typeof parsed.total === 'number' ? parsed.total : 0,
                    history: Array.isArray(parsed.history) ? parsed.history : [],
                    sessionTotal: typeof parsed.sessionTotal === 'number' ? parsed.sessionTotal : 0
                };
            }
        } catch (e) { /* ignore */ }
        return { enabled: false, total: 0, history: [], sessionTotal: 0 };
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

    /* ---- Build Bar ---- */

    function _buildBar() {
        var existing = document.getElementById(BAR_ID);
        if (existing) existing.remove();

        var state = _loadState();

        var bar = _el('div', 'auto-collect-bar');
        bar.id = BAR_ID;

        /* Icon */
        var icon = _el('span', 's45-ac-icon', '\uD83E\uDDF2');
        bar.appendChild(icon);

        /* Label */
        var label = _el('span', 's45-ac-label', 'Auto-Collect');
        bar.appendChild(label);

        /* Running total */
        var total = _el('span', 's45-ac-total');
        total.id = 'acTotalDisplay';
        total.textContent = '$' + state.total.toFixed(2);
        bar.appendChild(total);

        /* Increment indicator (hidden by default) */
        var increment = _el('span', 's45-ac-increment');
        increment.id = 'acIncrement';
        bar.appendChild(increment);

        /* Toggle */
        var toggle = _el('label', 's45-ac-toggle');
        if (state.enabled) toggle.classList.add('s45-ac-enabled');

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = state.enabled;
        checkbox.style.display = 'none';
        checkbox.addEventListener('change', function () {
            var s = _loadState();
            s.enabled = checkbox.checked;
            _saveState(s);
            if (checkbox.checked) {
                toggle.classList.add('s45-ac-enabled');
            } else {
                toggle.classList.remove('s45-ac-enabled');
            }
        });
        toggle.appendChild(checkbox);

        var slider = _el('span', 's45-ac-slider');
        toggle.appendChild(slider);

        bar.appendChild(toggle);

        /* History section (collapsed by default) */
        var historySection = _el('div', 's45-ac-history');
        historySection.id = 'acHistorySection';

        if (state.history.length > 0) {
            state.history.forEach(function (entry) {
                var item = _el('div', 's45-ac-history-item');
                var sourceSpan = _el('span', '', entry.source || 'Reward');
                item.appendChild(sourceSpan);
                var amtSpan = _el('span', '', '+$' + (entry.amount || 0).toFixed(2));
                item.appendChild(amtSpan);
                historySection.appendChild(item);
            });
        } else {
            var emptyMsg = _el('div', 's45-ac-history-item', 'No collections yet');
            historySection.appendChild(emptyMsg);
        }

        bar.appendChild(historySection);

        /* Toggle history visibility on bar click */
        var barClickable = _el('span', '', '');
        barClickable.style.cursor = 'pointer';
        barClickable.style.position = 'absolute';
        barClickable.style.inset = '0';
        barClickable.style.zIndex = '0';
        bar.style.position = 'relative';
        bar.insertBefore(barClickable, bar.firstChild);

        /* Make all visible children above the click layer */
        Array.prototype.forEach.call(bar.children, function (child) {
            if (child !== barClickable && child !== historySection) {
                child.style.position = 'relative';
                child.style.zIndex = '1';
            }
        });
        toggle.style.zIndex = '2';

        barClickable.addEventListener('click', function (e) {
            historySection.classList.toggle('s45-ac-expanded');
        });

        /* Close button for history */
        var closeBtn = _el('button', 's45-ac-close', '\u2715');
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            historySection.classList.remove('s45-ac-expanded');
        });
        historySection.insertBefore(closeBtn, historySection.firstChild);

        document.body.appendChild(bar);

        return bar;
    }

    /* ---- Add Collection ---- */

    function _addCollection(amount, source) {
        if (_isQA()) return false;
        if (typeof amount !== 'number' || amount <= 0) return false;
        if (amount > MAX_THRESHOLD) return false;

        var state = _loadState();
        if (!state.enabled) return false;

        state.total += amount;
        state.sessionTotal += amount;

        var entry = {
            amount: amount,
            source: source || 'Reward',
            timestamp: Date.now()
        };
        state.history.unshift(entry);
        if (state.history.length > MAX_HISTORY) {
            state.history = state.history.slice(0, MAX_HISTORY);
        }

        _saveState(state);

        /* Apply to balance */
        if (typeof balance !== 'undefined') {
            balance += amount;
        }
        if (typeof updateBalanceDisplay === 'function') {
            updateBalanceDisplay();
        }

        /* Update display */
        var totalEl = document.getElementById('acTotalDisplay');
        if (totalEl) {
            totalEl.textContent = '$' + state.total.toFixed(2);
        }

        /* Show increment animation */
        var incEl = document.getElementById('acIncrement');
        if (incEl) {
            incEl.textContent = '+$' + amount.toFixed(2);
            incEl.classList.remove('s45-ac-flash');
            void incEl.offsetWidth; /* force reflow */
            incEl.classList.add('s45-ac-flash');
            setTimeout(function () {
                incEl.classList.remove('s45-ac-flash');
            }, 1500);
        }

        return true;
    }

    /* ---- Enabled Check ---- */

    function _isEnabled() {
        var state = _loadState();
        return state.enabled;
    }

    /* ---- Dismiss ---- */

    function _dismiss() {
        var bar = document.getElementById(BAR_ID);
        if (!bar) return;
        bar.classList.add('s45-ac-hiding');
        setTimeout(function () {
            if (bar.parentNode) bar.remove();
        }, 300);
    }

    /* ---- Public API ---- */

    window._autoCollectAdd = function (amount, source) {
        return _addCollection(amount, source);
    };

    window._autoCollectEnabled = function () {
        return _isEnabled();
    };

    window.dismissAutoCollect = _dismiss;

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
