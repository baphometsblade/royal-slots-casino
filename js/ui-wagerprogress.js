/* ==========================================================
   ui-wagerprogress.js — Wagering Progress Tracker
   Sprint 46 — Shows how much player needs to wager before withdrawal
   ========================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_wagerProgress';
    var PANEL_ID = 'wagerProgressPanel';
    var WAGER_REQUIREMENT = 5000;
    var RING_RADIUS = 54;
    var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    var MILESTONES = [25, 50, 75, 100];

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
                    visible: typeof parsed.visible === 'boolean' ? parsed.visible : true,
                    dismissed: typeof parsed.dismissed === 'boolean' ? parsed.dismissed : false,
                    lastWagered: typeof parsed.lastWagered === 'number' ? parsed.lastWagered : 0
                };
            }
        } catch (e) { /* ignore */ }
        return { visible: true, dismissed: false, lastWagered: 0 };
    }

    function _saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function _getTotalWagered() {
        if (typeof stats !== 'undefined' && stats && typeof stats.totalWagered === 'number') {
            return stats.totalWagered;
        }
        if (typeof window.stats !== 'undefined' && window.stats && typeof window.stats.totalWagered === 'number') {
            return window.stats.totalWagered;
        }
        return 0;
    }

    function _el(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    function _formatMoney(n) {
        if (n >= 1000) {
            return '$' + (n / 1000).toFixed(1) + 'k';
        }
        return '$' + n.toFixed(2);
    }

    /* ---- Build Panel ---- */

    function _buildPanel() {
        var existing = document.getElementById(PANEL_ID);
        if (existing) existing.remove();

        var state = _loadState();
        if (state.dismissed) return null;

        var wagered = _getTotalWagered();
        var pct = Math.min((wagered / WAGER_REQUIREMENT) * 100, 100);
        var dashOffset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;

        var panel = _el('div', 'wager-progress-panel');
        panel.id = PANEL_ID;

        if (!state.visible) {
            panel.style.display = 'none';
        }

        /* Header */
        var header = _el('div', 's46-wp-header');

        var title = _el('span', 's46-wp-title');
        /* chart emoji \uD83D\uDCC8 */
        title.textContent = '\uD83D\uDCC8 Wager Progress';
        header.appendChild(title);

        var closeBtn = _el('button', 's46-wp-close', '\u2715');
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            _dismiss();
        });
        header.appendChild(closeBtn);

        panel.appendChild(header);

        /* SVG Ring */
        var ringWrap = _el('div', 's46-wp-ring-wrap');

        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 's46-wp-ring-svg');
        svg.setAttribute('viewBox', '0 0 120 120');
        svg.setAttribute('width', '120');
        svg.setAttribute('height', '120');

        /* Background ring */
        var bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('class', 's46-wp-ring-bg');
        bgCircle.setAttribute('cx', '60');
        bgCircle.setAttribute('cy', '60');
        bgCircle.setAttribute('r', String(RING_RADIUS));
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        bgCircle.setAttribute('stroke-width', '8');
        svg.appendChild(bgCircle);

        /* Fill ring */
        var fillCircle = document.createElementNS(svgNS, 'circle');
        fillCircle.setAttribute('class', 's46-wp-ring-fill');
        fillCircle.setAttribute('cx', '60');
        fillCircle.setAttribute('cy', '60');
        fillCircle.setAttribute('r', String(RING_RADIUS));
        fillCircle.setAttribute('fill', 'none');
        fillCircle.setAttribute('stroke', pct >= 100 ? '#00ff88' : '#ffd700');
        fillCircle.setAttribute('stroke-width', '8');
        fillCircle.setAttribute('stroke-linecap', 'round');
        fillCircle.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
        fillCircle.setAttribute('stroke-dashoffset', String(dashOffset));
        fillCircle.setAttribute('transform', 'rotate(-90 60 60)');
        fillCircle.style.transition = 'stroke-dashoffset 0.8s ease';
        svg.appendChild(fillCircle);

        ringWrap.appendChild(svg);

        /* Center label */
        var ringLabel = _el('div', 's46-wp-ring-label');
        var pctText = _el('div', '', Math.floor(pct) + '%');
        pctText.style.fontSize = '22px';
        pctText.style.fontWeight = 'bold';
        pctText.style.color = pct >= 100 ? '#00ff88' : '#ffd700';
        ringLabel.appendChild(pctText);

        var subText = _el('div', '', pct >= 100 ? 'Complete!' : 'Progress');
        subText.style.fontSize = '11px';
        subText.style.color = 'rgba(255,255,255,0.6)';
        ringLabel.appendChild(subText);

        ringWrap.appendChild(ringLabel);

        panel.appendChild(ringWrap);

        /* Stats */
        var statsSection = _el('div', 's46-wp-stats');

        /* Wagered row */
        var wageredRow = _el('div', 's46-wp-stat-row');
        wageredRow.appendChild(_el('span', 's46-wp-stat-label', 'Wagered'));
        wageredRow.appendChild(_el('span', 's46-wp-stat-value', _formatMoney(wagered)));
        statsSection.appendChild(wageredRow);

        /* Remaining row */
        var remaining = Math.max(WAGER_REQUIREMENT - wagered, 0);
        var remainRow = _el('div', 's46-wp-stat-row');
        remainRow.appendChild(_el('span', 's46-wp-stat-label', 'Remaining'));
        remainRow.appendChild(_el('span', 's46-wp-stat-value', _formatMoney(remaining)));
        statsSection.appendChild(remainRow);

        /* Requirement row */
        var reqRow = _el('div', 's46-wp-stat-row');
        reqRow.appendChild(_el('span', 's46-wp-stat-label', 'Requirement'));
        reqRow.appendChild(_el('span', 's46-wp-stat-value', _formatMoney(WAGER_REQUIREMENT)));
        statsSection.appendChild(reqRow);

        panel.appendChild(statsSection);

        /* Milestones */
        var milestonesWrap = _el('div', 's46-wp-stats');
        for (var i = 0; i < MILESTONES.length; i++) {
            var m = MILESTONES[i];
            var mEl = _el('div', 's46-wp-milestone');
            if (pct >= m) {
                mEl.classList.add('s46-reached');
            }
            /* checkmark \u2713 or circle \u25CB */
            var icon = pct >= m ? '\u2713' : '\u25CB';
            mEl.textContent = icon + ' ' + m + '%';
            milestonesWrap.appendChild(mEl);
        }
        panel.appendChild(milestonesWrap);

        /* Footer */
        var footer = _el('div', 's46-wp-footer');
        if (pct >= 100) {
            /* trophy emoji \uD83C\uDFC6 */
            footer.textContent = '\uD83C\uDFC6 Wagering requirement met! Withdrawals unlocked.';
        } else {
            footer.textContent = 'Wager ' + _formatMoney(remaining) + ' more to unlock withdrawals.';
        }
        panel.appendChild(footer);

        document.body.appendChild(panel);
        return panel;
    }

    /* ---- Update Ring ---- */

    function _updateRing() {
        var panel = document.getElementById(PANEL_ID);
        if (!panel) return;

        /* Rebuild for simplicity (DOM is small) */
        var wasVisible = panel.style.display !== 'none';
        _buildPanel();
        if (!wasVisible) {
            var newPanel = document.getElementById(PANEL_ID);
            if (newPanel) newPanel.style.display = 'none';
        }
    }

    /* ---- Track Spin ---- */

    function _trackSpin(wagered) {
        if (_isQA()) return;
        if (typeof wagered !== 'number' || wagered <= 0) return;

        var state = _loadState();
        state.lastWagered = _getTotalWagered();
        _saveState(state);

        _updateRing();
    }

    /* ---- Dismiss ---- */

    function _dismiss() {
        var panel = document.getElementById(PANEL_ID);
        if (!panel) return;

        panel.classList.add('s46-wp-hiding');
        var state = _loadState();
        state.visible = false;
        _saveState(state);

        setTimeout(function () {
            if (panel.parentNode) panel.remove();
        }, 300);
    }

    /* ---- Public API ---- */

    window._wagerProgressTrackSpin = function (wagered) {
        _trackSpin(wagered);
    };

    window.dismissWagerProgress = _dismiss;

    /* ---- Init ---- */

    function _init() {
        if (_isQA()) return;
        _buildPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
