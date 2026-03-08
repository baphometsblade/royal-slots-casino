/* ui-sessionmilestone.js — Session Milestone Rewards
 * Sprint 38: Reward players for reaching spin milestones in a single session.
 * Creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var SM_KEY = 'ms_sessionMilestone';
    var AUTO_DISMISS_MS = 4000;

    var _sessionSpins = 0;
    var _claimedIdx   = -1;  // highest milestone index claimed
    var _barEl        = null;
    var _popupEl      = null;
    var _popupTimer   = null;

    var MILESTONES = [
        { spins: 25,  reward: 5,  name: 'Warm Up',     icon: '\u2B50'           },
        { spins: 50,  reward: 15, name: 'On Fire',      icon: '\uD83D\uDD25'    },
        { spins: 100, reward: 50, name: 'Spin Legend',   icon: '\uD83C\uDFC6'    }
    ];

    // ── Create progress bar ─────────────────────────────────────────────────
    function _createBar() {
        if (_barEl) return;

        var bar = document.createElement('div');
        bar.id = 'sessionMilestoneBar';
        bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:32px;background:rgba(10,10,30,0.92);display:flex;align-items:center;padding:0 16px;z-index:9990;font-size:12px;color:#ccc;gap:8px;border-top:1px solid rgba(255,215,0,0.2);';

        // Label
        var label = document.createElement('span');
        label.id = 'smLabel';
        label.style.cssText = 'white-space:nowrap;font-weight:600;min-width:90px;';
        label.textContent = '0 / 25 spins';
        bar.appendChild(label);

        // Track
        var track = document.createElement('div');
        track.style.cssText = 'flex:1;height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden;position:relative;';

        var fill = document.createElement('div');
        fill.id = 'smFill';
        fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#ffd700,#f0a500);border-radius:5px;transition:width 0.4s ease;';
        track.appendChild(fill);
        bar.appendChild(track);

        // Reward preview
        var reward = document.createElement('span');
        reward.id = 'smReward';
        reward.style.cssText = 'white-space:nowrap;color:#ffd700;font-weight:700;min-width:70px;text-align:right;';
        reward.textContent = '\u2192 $5';
        bar.appendChild(reward);

        document.body.appendChild(bar);
        _barEl = bar;
    }

    // ── Update bar display ──────────────────────────────────────────────────
    function _updateBar() {
        var nextIdx = _claimedIdx + 1;
        var labelEl = document.getElementById('smLabel');
        var fillEl  = document.getElementById('smFill');
        var rewEl   = document.getElementById('smReward');

        if (nextIdx >= MILESTONES.length) {
            // All milestones completed
            if (labelEl) labelEl.textContent = 'All milestones complete!';
            if (fillEl)  fillEl.style.width = '100%';
            if (rewEl)   rewEl.textContent = '\uD83C\uDFC6 Done';
            return;
        }

        var ms = MILESTONES[nextIdx];
        var prevSpins = nextIdx > 0 ? MILESTONES[nextIdx - 1].spins : 0;
        var range  = ms.spins - prevSpins;
        var progress = Math.min(_sessionSpins - prevSpins, range);
        var pct = range > 0 ? Math.min((progress / range) * 100, 100) : 0;

        if (labelEl) labelEl.textContent = _sessionSpins + ' / ' + ms.spins + ' spins';
        if (fillEl)  fillEl.style.width = pct.toFixed(1) + '%';
        if (rewEl)   rewEl.textContent = '\u2192 $' + ms.reward;
    }

    // ── Show reward popup ───────────────────────────────────────────────────
    function _showRewardPopup(milestone) {
        _removePopup();

        var popup = document.createElement('div');
        popup.id = 'smRewardPopup';
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.7);z-index:10060;background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ffd700;border-radius:16px;padding:32px 28px;text-align:center;color:#fff;box-shadow:0 8px 40px rgba(255,215,0,0.3);opacity:0;transition:transform 0.4s ease,opacity 0.4s ease;min-width:260px;';

        // Icon
        var iconEl = document.createElement('div');
        iconEl.style.cssText = 'font-size:52px;margin-bottom:8px;';
        iconEl.textContent = milestone.icon;
        popup.appendChild(iconEl);

        // Name
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:22px;font-weight:700;color:#ffd700;margin-bottom:4px;';
        nameEl.textContent = milestone.name + '!';
        popup.appendChild(nameEl);

        // Subtitle
        var subEl = document.createElement('div');
        subEl.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:12px;';
        subEl.textContent = 'Milestone reached at ' + milestone.spins + ' spins';
        popup.appendChild(subEl);

        // Reward
        var rewEl = document.createElement('div');
        rewEl.style.cssText = 'font-size:28px;font-weight:700;color:#4ecdc4;';
        rewEl.textContent = '+$' + milestone.reward;
        popup.appendChild(rewEl);

        // Backdrop
        var backdrop = document.createElement('div');
        backdrop.id = 'smRewardBackdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10055;opacity:0;transition:opacity 0.3s;';
        document.body.appendChild(backdrop);
        document.body.appendChild(popup);
        _popupEl = popup;

        // Animate in
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                popup.style.opacity = '1';
                popup.style.transform = 'translate(-50%,-50%) scale(1)';
                backdrop.style.opacity = '1';
            });
        });

        // Auto-dismiss
        _popupTimer = setTimeout(function () { _removePopup(); }, AUTO_DISMISS_MS);
    }

    function _removePopup() {
        if (_popupTimer) { clearTimeout(_popupTimer); _popupTimer = null; }
        var popup = document.getElementById('smRewardPopup');
        var backdrop = document.getElementById('smRewardBackdrop');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%,-50%) scale(0.7)';
            setTimeout(function () { if (popup.parentNode) popup.parentNode.removeChild(popup); }, 400);
        }
        if (backdrop) {
            backdrop.style.opacity = '0';
            setTimeout(function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 350);
        }
        _popupEl = null;
    }

    // ── Award milestone ─────────────────────────────────────────────────────
    function _awardMilestone(idx) {
        var ms = MILESTONES[idx];
        _claimedIdx = idx;
        if (typeof balance !== 'undefined') {
            balance += ms.reward;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }
        _showRewardPopup(ms);
        _updateBar();
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window._sessionMilestoneTrackSpin = function () {
        _sessionSpins++;
        var nextIdx = _claimedIdx + 1;
        if (nextIdx < MILESTONES.length && _sessionSpins >= MILESTONES[nextIdx].spins) {
            _awardMilestone(nextIdx);
        } else {
            _updateBar();
        }
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        if (/[?&]noBonus=1/.test(window.location.search)) return;
        _createBar();
        _updateBar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 800); });
    } else {
        setTimeout(_init, 800);
    }

})();
