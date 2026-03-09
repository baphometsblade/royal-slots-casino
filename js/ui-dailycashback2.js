/* ui-dailycashback2.js — Daily Cashback Panel (Sprint 41)
 * Shows net losses from previous day and offers cashback collection.
 * DOM element: #dailyCashbackPanel (fixed bottom-right card)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_dailyCashback2';
    var PANEL_ID = 'dailyCashbackPanel';
    var CASHBACK_RATE = 0.05;
    var MIN_LOSS_FOR_CASHBACK = 20;
    var HOURS_RESET = 24;

    // ── QA bypass ────────────────────────────────────────────────────────
    function _isQA() {
        try { return new URLSearchParams(window.location.search).get('noBonus') === '1'; }
        catch (e) { return false; }
    }

    // ── Persistence ──────────────────────────────────────────────────────
    function _load() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
        catch (e) { return {}; }
    }

    function _save(d) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    function _todayStr() { return new Date().toISOString().slice(0, 10); }

    function _hoursUntilReset() {
        var d = _load();
        if (!d.resetAt) return 0;
        var ms = d.resetAt - Date.now();
        return Math.max(0, Math.ceil(ms / 3600000));
    }

    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'info'); return; }
        if (typeof showWinToast === 'function') { showWinToast(msg, 'epic'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#f59e0b;color:#000;padding:10px 20px;border-radius:8px;font-weight:700;z-index:10400;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
    }

    // ── DOM creation ─────────────────────────────────────────────────────
    function _buildPanel() {
        var existing = document.getElementById(PANEL_ID);
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'daily-cashback-panel';
        panel.style.display = 'none';

        // Header
        var header = document.createElement('div');
        header.className = 's41-cashback-header';

        var title = document.createElement('span');
        title.className = 's41-cashback-title';
        var titleIcon = document.createElement('span');
        titleIcon.className = 's41-cashback-title-icon';
        titleIcon.textContent = '\uD83D\uDCB0';
        title.appendChild(titleIcon);
        title.appendChild(document.createTextNode(' Daily Cashback'));

        var closeBtn = document.createElement('button');
        closeBtn.className = 's41-cashback-close';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { _dismiss(); };

        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Body
        var body = document.createElement('div');
        body.className = 's41-cashback-body';

        // Ring row
        var ringRow = document.createElement('div');
        ringRow.className = 's41-cashback-ring-row';

        var ringWrap = document.createElement('div');
        ringWrap.className = 's41-cashback-ring-wrap';

        // SVG ring
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 's41-cashback-ring-svg');
        svg.setAttribute('viewBox', '0 0 80 80');

        var bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('class', 's41-cashback-ring-bg');
        bgCircle.setAttribute('cx', '40');
        bgCircle.setAttribute('cy', '40');
        bgCircle.setAttribute('r', '34');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke-width', '6');

        var progCircle = document.createElementNS(svgNS, 'circle');
        progCircle.setAttribute('class', 's41-cashback-ring-progress');
        progCircle.setAttribute('id', 'dcb2RingProgress');
        progCircle.setAttribute('cx', '40');
        progCircle.setAttribute('cy', '40');
        progCircle.setAttribute('r', '34');
        progCircle.setAttribute('fill', 'none');
        progCircle.setAttribute('stroke-width', '6');
        var circumference = 2 * Math.PI * 34;
        progCircle.setAttribute('stroke-dasharray', String(circumference));
        progCircle.setAttribute('stroke-dashoffset', String(circumference));

        svg.appendChild(bgCircle);
        svg.appendChild(progCircle);
        ringWrap.appendChild(svg);

        var ringLabel = document.createElement('div');
        ringLabel.className = 's41-cashback-ring-label';
        ringLabel.id = 'dcb2RingLabel';
        var hoursSmall = document.createElement('small');
        hoursSmall.textContent = 'hrs';
        ringLabel.appendChild(document.createTextNode('--'));
        ringLabel.appendChild(hoursSmall);

        ringWrap.appendChild(ringLabel);
        ringRow.appendChild(ringWrap);

        // Info column
        var info = document.createElement('div');
        info.className = 's41-cashback-info';

        var pctEl = document.createElement('div');
        pctEl.className = 's41-cashback-percentage';
        pctEl.id = 'dcb2Pct';
        var pctSpan = document.createElement('span');
        pctSpan.textContent = (CASHBACK_RATE * 100) + '%';
        pctEl.appendChild(pctSpan);
        pctEl.appendChild(document.createTextNode(' cashback'));
        info.appendChild(pctEl);

        // Loss row
        var lossRow = document.createElement('div');
        lossRow.className = 's41-cashback-stat-row';
        var lossLabel = document.createElement('span');
        lossLabel.className = 's41-cashback-stat-label';
        lossLabel.textContent = 'Net losses:';
        var lossVal = document.createElement('span');
        lossVal.className = 's41-cashback-stat-value';
        lossVal.id = 'dcb2Losses';
        lossVal.textContent = '$0';
        lossRow.appendChild(lossLabel);
        lossRow.appendChild(lossVal);
        info.appendChild(lossRow);

        // Cashback amount row
        var amtRow = document.createElement('div');
        amtRow.className = 's41-cashback-stat-row';
        var amtLabel = document.createElement('span');
        amtLabel.className = 's41-cashback-stat-label';
        amtLabel.textContent = 'Cashback:';
        var amtVal = document.createElement('span');
        amtVal.className = 's41-cashback-stat-value';
        amtVal.id = 'dcb2Amount';
        amtVal.textContent = '$0';
        amtRow.appendChild(amtLabel);
        amtRow.appendChild(amtVal);
        info.appendChild(amtRow);

        ringRow.appendChild(info);
        body.appendChild(ringRow);

        // Collect button
        var collectBtn = document.createElement('button');
        collectBtn.className = 's41-cashback-collect-btn';
        collectBtn.id = 'dcb2Collect';
        collectBtn.textContent = 'Collect Cashback';
        collectBtn.onclick = function () { _collect(); };
        body.appendChild(collectBtn);

        // Status
        var status = document.createElement('div');
        status.className = 's41-cashback-status';
        status.id = 'dcb2Status';
        status.textContent = '';
        body.appendChild(status);

        panel.appendChild(body);
        document.body.appendChild(panel);
    }

    // ── Update UI ────────────────────────────────────────────────────────
    function _updateUI() {
        var d = _load();
        var losses = d.losses || 0;
        var cashback = Math.max(0, Math.floor(losses * CASHBACK_RATE * 100) / 100);

        var lossEl = document.getElementById('dcb2Losses');
        var amtEl = document.getElementById('dcb2Amount');
        var collectBtn = document.getElementById('dcb2Collect');
        var statusEl = document.getElementById('dcb2Status');
        var ringLabel = document.getElementById('dcb2RingLabel');
        var ringProg = document.getElementById('dcb2RingProgress');

        if (lossEl) lossEl.textContent = '$' + losses.toFixed(2);
        if (amtEl) amtEl.textContent = '$' + cashback.toFixed(2);

        var hours = _hoursUntilReset();
        if (ringLabel) {
            while (ringLabel.firstChild) ringLabel.removeChild(ringLabel.firstChild);
            ringLabel.appendChild(document.createTextNode(String(hours)));
            var sm = document.createElement('small');
            sm.textContent = 'hrs';
            ringLabel.appendChild(sm);
        }

        // Progress ring
        if (ringProg) {
            var circumference = 2 * Math.PI * 34;
            var pct = hours / HOURS_RESET;
            ringProg.setAttribute('stroke-dashoffset', String(circumference * (1 - pct)));
        }

        if (collectBtn) {
            if (d.collected || losses < MIN_LOSS_FOR_CASHBACK) {
                collectBtn.disabled = true;
                collectBtn.textContent = d.collected ? 'Collected \u2713' : 'Min $' + MIN_LOSS_FOR_CASHBACK + ' losses';
            } else {
                collectBtn.disabled = false;
                collectBtn.textContent = 'Collect $' + cashback.toFixed(2);
            }
        }

        if (statusEl) {
            if (d.collected) {
                statusEl.textContent = 'Cashback collected! Resets in ' + hours + 'h';
            } else if (losses < MIN_LOSS_FOR_CASHBACK) {
                statusEl.textContent = 'Need $' + (MIN_LOSS_FOR_CASHBACK - losses).toFixed(2) + ' more in losses';
            } else {
                statusEl.textContent = 'Cashback ready to collect!';
            }
        }
    }

    // ── Collect cashback ─────────────────────────────────────────────────
    function _collect() {
        var d = _load();
        if (d.collected) return;
        var losses = d.losses || 0;
        if (losses < MIN_LOSS_FOR_CASHBACK) return;

        var cashback = Math.floor(losses * CASHBACK_RATE * 100) / 100;
        if (typeof window.balance === 'number') {
            window.balance += cashback;
            if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
        }

        d.collected = true;
        d.resetAt = Date.now() + HOURS_RESET * 3600000;
        _save(d);
        _toast('\uD83D\uDCB0 Cashback collected! +$' + cashback.toFixed(2));
        _updateUI();
    }

    // ── Track spin result ────────────────────────────────────────────────
    function _trackSpin(wagered, won) {
        if (_isQA()) return;
        var d = _load();
        var today = _todayStr();

        // Reset if new day
        if (d.trackDate !== today) {
            d.losses = 0;
            d.collected = false;
            d.trackDate = today;
        }

        // Check reset timer
        if (d.resetAt && Date.now() >= d.resetAt) {
            d.losses = 0;
            d.collected = false;
            d.resetAt = null;
        }

        var net = (wagered || 0) - (won || 0);
        if (net > 0) {
            d.losses = (d.losses || 0) + net;
        }

        _save(d);
        _updateUI();

        // Auto-show if losses cross threshold
        if (!d.collected && (d.losses || 0) >= MIN_LOSS_FOR_CASHBACK) {
            _show();
        }
    }

    // ── Show / Dismiss ───────────────────────────────────────────────────
    function _show() {
        var p = document.getElementById(PANEL_ID);
        if (p) {
            p.style.display = '';
            p.classList.remove('s41-hiding');
            _updateUI();
        }
    }

    function _dismiss() {
        var p = document.getElementById(PANEL_ID);
        if (!p) return;
        p.classList.add('s41-hiding');
        setTimeout(function () {
            if (p) p.style.display = 'none';
        }, 400);
    }

    // ── Public API ───────────────────────────────────────────────────────
    window._dailyCashbackTrackSpin = _trackSpin;
    window.dismissDailyCashback = _dismiss;

    // ── Init ─────────────────────────────────────────────────────────────
    function _init() {
        if (_isQA()) return;
        _buildPanel();
        _updateUI();

        // Auto-show if there's uncollected cashback
        var d = _load();
        if (!d.collected && (d.losses || 0) >= MIN_LOSS_FOR_CASHBACK) {
            setTimeout(_show, 2000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 800); });
    } else {
        setTimeout(_init, 800);
    }

})();
