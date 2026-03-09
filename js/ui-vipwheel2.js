/* ui-vipwheel2.js — VIP Reward Wheel (Sprint 42)
 * Special prize wheel that triggers every 200 spins.
 * DOM element: #vipWheelOverlay (full-screen overlay)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_vipWheel2Data';
    var OVERLAY_ID = 'vipWheelOverlay';
    var SPINS_PER_TRIGGER = 200;
    var SPIN_DURATION = 4000;
    var PRIZES = [5, 10, 25, 50, 100, 5, 10, 25];
    var PRIZE_LABELS = ['$5', '$10', '$25', '$50', '$100', '$5', '$10', '$25'];

    var _overlayEl = null;
    var _spinning = false;
    var _wonPrize = 0;

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

    // ── Toast ────────────────────────────────────────────────────────────
    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'info'); return; }
        if (typeof showWinToast === 'function') { showWinToast(msg, 'epic'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#000;padding:10px 20px;border-radius:8px;font-weight:700;z-index:10400;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    }

    // ── DOM creation ─────────────────────────────────────────────────────
    function _buildOverlay() {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'vip-wheel-overlay';

        // Backdrop
        var backdrop = document.createElement('div');
        backdrop.className = 's42-wheel-backdrop';
        backdrop.onclick = function () { if (!_spinning) _dismiss(); };
        overlay.appendChild(backdrop);

        // Card
        var card = document.createElement('div');
        card.className = 's42-wheel-card';

        // Title
        var title = document.createElement('div');
        title.className = 's42-wheel-title';
        title.textContent = '\uD83C\uDFC6 VIP Reward Wheel';
        card.appendChild(title);

        var subtitle = document.createElement('div');
        subtitle.className = 's42-wheel-subtitle';
        subtitle.textContent = 'Spin to win exclusive prizes!';
        card.appendChild(subtitle);

        // Wheel container
        var container = document.createElement('div');
        container.className = 's42-wheel-container';

        // Pointer
        var pointer = document.createElement('div');
        pointer.className = 's42-wheel-pointer';
        pointer.textContent = '\u25BC';
        container.appendChild(pointer);

        // Disc
        var disc = document.createElement('div');
        disc.className = 's42-wheel-disc';
        disc.id = 'vw2Disc';

        for (var i = 0; i < 8; i++) {
            var segment = document.createElement('div');
            segment.className = 's42-wheel-segment';
            var label = document.createElement('span');
            label.className = 's42-wheel-segment-label';
            label.textContent = PRIZE_LABELS[i];
            segment.appendChild(label);
            disc.appendChild(segment);
        }

        // Center hub
        var center = document.createElement('div');
        center.className = 's42-wheel-center';
        center.textContent = 'SPIN';
        center.onclick = function () { _spinWheel(); };
        disc.appendChild(center);

        container.appendChild(disc);
        card.appendChild(container);

        // Result
        var result = document.createElement('div');
        result.className = 's42-wheel-result';
        result.id = 'vw2Result';
        result.textContent = '';
        card.appendChild(result);

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 's42-wheel-claim-btn';
        claimBtn.id = 'vw2ClaimBtn';
        claimBtn.textContent = 'Spin the Wheel!';
        claimBtn.onclick = function () { _spinWheel(); };
        card.appendChild(claimBtn);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 's42-wheel-close-btn';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { if (!_spinning) _dismiss(); };
        card.appendChild(closeBtn);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        _overlayEl = overlay;
    }

    // ── Spin wheel ───────────────────────────────────────────────────────
    function _spinWheel() {
        if (_spinning) return;
        _spinning = true;

        var disc = document.getElementById('vw2Disc');
        var resultEl = document.getElementById('vw2Result');
        var claimBtn = document.getElementById('vw2ClaimBtn');

        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.textContent = 'Spinning...';
        }

        // Pick random prize
        var idx = Math.floor(Math.random() * PRIZES.length);
        _wonPrize = PRIZES[idx];

        // Calculate rotation: multiple full turns + landing on segment
        var segAngle = 360 / 8;
        var targetAngle = 360 * 5 + (idx * segAngle) + (segAngle / 2);

        if (disc) {
            disc.style.transition = 'transform ' + (SPIN_DURATION / 1000) + 's cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            disc.style.transform = 'rotate(' + targetAngle + 'deg)';
        }

        setTimeout(function () {
            _spinning = false;

            if (resultEl) {
                resultEl.textContent = '\uD83C\uDF89 You won $' + _wonPrize + '!';
                resultEl.classList.add('visible');
            }

            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim $' + _wonPrize;
                claimBtn.onclick = function () { _claim(); };
            }
        }, SPIN_DURATION + 500);
    }

    // ── Claim prize ──────────────────────────────────────────────────────
    function _claim() {
        if (_wonPrize <= 0) return;

        if (typeof window.balance === 'number') {
            window.balance += _wonPrize;
            if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
        }

        _toast('\uD83C\uDFC6 VIP Wheel Prize: +$' + _wonPrize + '!');

        var d = _load();
        d.lastSpinTime = Date.now();
        d.spinCount = 0;
        _save(d);

        _wonPrize = 0;
        _dismiss();
    }

    // ── Show / Dismiss ───────────────────────────────────────────────────
    function _show() {
        if (!_overlayEl) _buildOverlay();
        if (_overlayEl) {
            _overlayEl.classList.add('active');
            _wonPrize = 0;
            _spinning = false;

            // Reset disc rotation
            var disc = document.getElementById('vw2Disc');
            if (disc) {
                disc.style.transition = 'none';
                disc.style.transform = 'rotate(0deg)';
            }

            var resultEl = document.getElementById('vw2Result');
            if (resultEl) {
                resultEl.textContent = '';
                resultEl.classList.remove('visible');
            }

            var claimBtn = document.getElementById('vw2ClaimBtn');
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Spin the Wheel!';
                claimBtn.onclick = function () { _spinWheel(); };
            }
        }
    }

    function _dismiss() {
        if (_overlayEl) {
            _overlayEl.classList.remove('active');
        }
    }

    // ── Track spin ───────────────────────────────────────────────────────
    function _trackSpin() {
        if (_isQA()) return;
        var d = _load();
        d.spinCount = (d.spinCount || 0) + 1;

        if (d.spinCount >= SPINS_PER_TRIGGER) {
            _save(d);
            setTimeout(_show, 1000);
            return;
        }

        _save(d);
    }

    // ── Public API ───────────────────────────────────────────────────────
    window._vipWheel2TrackSpin = _trackSpin;
    window.dismissVipWheel2 = _dismiss;
    // Override old API
    window.dismissVipWheel = _dismiss;

    // ── Init ─────────────────────────────────────────────────────────────
    function _init() {
        if (_isQA()) return;
        _buildOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1000); });
    } else {
        setTimeout(_init, 1000);
    }

})();
