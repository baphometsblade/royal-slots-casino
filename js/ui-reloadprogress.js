/* ui-reloadprogress.js — Reload Bonus Progress Bar
 * Sprint 36: Tracks cumulative deposits toward tiered bonus thresholds.
 * Shows a progress bar when progress > 0; hides after claim.
 */
(function () {
    'use strict';

    var RLB_KEY = 'ms_reloadBonusData';
    var _barEl = null;

    // ── Tier definitions ────────────────────────────────────────────────────
    var TIERS = [
        { threshold: 50,  percent: 10 },
        { threshold: 100, percent: 15 },
        { threshold: 200, percent: 25 }
    ];

    // ── Load / save ─────────────────────────────────────────────────────────
    function _loadData() {
        try {
            var raw = localStorage.getItem(RLB_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return null;
    }

    function _saveData(data) {
        try { localStorage.setItem(RLB_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }

    function _freshData() {
        return {
            totalDeposited: 0,
            tierIndex: 0,
            claimed: false
        };
    }

    function _getData() {
        var data = _loadData();
        if (!data || typeof data.totalDeposited !== 'number') {
            data = _freshData();
            _saveData(data);
        }
        return data;
    }

    // ── Current tier helpers ────────────────────────────────────────────────
    function _currentTier(data) {
        var idx = Math.min(data.tierIndex || 0, TIERS.length - 1);
        return TIERS[idx];
    }

    function _progressPct(data) {
        var tier = _currentTier(data);
        return Math.min(100, (data.totalDeposited / tier.threshold) * 100);
    }

    // ── Build DOM ───────────────────────────────────────────────────────────
    function _createBar() {
        if (_barEl) return;

        var bar = document.createElement('div');
        bar.id = 'reloadBonusBar';
        bar.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);' +
            'background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;padding:12px 18px;' +
            'z-index:9990;display:none;min-width:320px;max-width:420px;color:#fff;' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.5);border:1px solid rgba(255,215,0,0.25)';

        var label = document.createElement('div');
        label.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px';

        var leftText = document.createElement('span');
        leftText.textContent = '\uD83D\uDCB0 Reload Bonus';
        leftText.style.fontWeight = 'bold';

        var rightText = document.createElement('span');
        rightText.id = 'rlbPercent';
        rightText.style.color = '#ffd700';

        var remaining = document.createElement('div');
        remaining.id = 'rlbRemaining';
        remaining.style.cssText = 'font-size:11px;color:#aaa;margin-bottom:6px';

        var track = document.createElement('div');
        track.style.cssText = 'width:100%;height:10px;background:#333;border-radius:5px;overflow:hidden';

        var fill = document.createElement('div');
        fill.id = 'rlbFill';
        fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#ffd700,#ff8c00);' +
            'border-radius:5px;transition:width 0.5s ease';

        var claimBtn = document.createElement('button');
        claimBtn.id = 'rlbClaimBtn';
        claimBtn.style.cssText = 'display:none;margin-top:8px;width:100%;padding:8px;border:none;' +
            'border-radius:8px;background:linear-gradient(135deg,#ffd700,#ff8c00);color:#000;' +
            'font-weight:bold;font-size:13px;cursor:pointer';
        claimBtn.textContent = 'Claim Bonus!';
        claimBtn.addEventListener('click', function () { window.claimReloadBonus(); });

        label.appendChild(leftText);
        label.appendChild(rightText);
        track.appendChild(fill);
        bar.appendChild(label);
        bar.appendChild(remaining);
        bar.appendChild(track);
        bar.appendChild(claimBtn);
        document.body.appendChild(bar);
        _barEl = bar;
    }

    // ── Render ───────────────────────────────────────────────────────────────
    function _render() {
        if (!_barEl) return;
        var data = _getData();
        var tier = _currentTier(data);
        var pct = _progressPct(data);

        if (data.totalDeposited <= 0 || data.claimed) {
            _barEl.style.display = 'none';
            return;
        }

        _barEl.style.display = 'block';
        var fill = document.getElementById('rlbFill');
        if (fill) fill.style.width = pct.toFixed(1) + '%';

        var percentEl = document.getElementById('rlbPercent');
        if (percentEl) percentEl.textContent = tier.percent + '% match';

        var remEl = document.getElementById('rlbRemaining');
        if (remEl) {
            var left = Math.max(0, tier.threshold - data.totalDeposited);
            remEl.textContent = '$' + left.toFixed(2) + ' remaining to unlock';
        }

        var claimBtn = document.getElementById('rlbClaimBtn');
        if (claimBtn) {
            claimBtn.style.display = (pct >= 100) ? 'block' : 'none';
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window.claimReloadBonus = function () {
        var data = _getData();
        var tier = _currentTier(data);
        if (data.totalDeposited < tier.threshold) return;

        var bonus = Math.round(tier.threshold * (tier.percent / 100) * 100) / 100;
        if (typeof balance !== 'undefined') balance += bonus;
        if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();

        // Advance to next tier or reset
        data.totalDeposited = 0;
        data.claimed = true;
        if (data.tierIndex < TIERS.length - 1) {
            data.tierIndex++;
        } else {
            data.tierIndex = 0;
        }
        _saveData(data);
        _render();
    };

    window._reloadBonusTrackDeposit = function (amount) {
        if (typeof amount !== 'number' || amount <= 0) return;
        var data = _getData();
        data.totalDeposited += amount;
        data.claimed = false;
        _saveData(data);
        _render();
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('noBonus') === '1') return;

        _createBar();
        _render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 500); });
    } else {
        setTimeout(_init, 500);
    }

})();
