(function() {
    'use strict';

    var STORAGE_KEY = 'ms_bonusMeterData';
    var BAR_ID = 'bonusMeterBar';
    var GOAL_AMOUNT = 100;

    var MILESTONES = [
        { pct: 25,  threshold: 25,  reward: 2,  label: '$2' },
        { pct: 50,  threshold: 50,  reward: 5,  label: '$5' },
        { pct: 75,  threshold: 75,  reward: 10, label: '$10' },
        { pct: 100, threshold: 100, reward: 25, label: '$25' }
    ];

    function _isQA() {
        return new URLSearchParams(window.location.search).get('noBonus') === '1';
    }

    function _todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var data = raw ? JSON.parse(raw) : null;
            if (!data || data.day !== _todayKey()) {
                return { day: _todayKey(), wagered: 0, claimed: [false, false, false, false] };
            }
            return data;
        } catch (e) {
            return { day: _todayKey(), wagered: 0, claimed: [false, false, false, false] };
        }
    }

    function _saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { /* quota */ }
    }

    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'success'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:10px 20px;border-radius:8px;font-weight:700;z-index:99999;font-size:15px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
    }

    function _claimReward(amount) {
        if (typeof window.balance === 'number') {
            window.balance += amount;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }
    }

    function _injectStyles() {
        var style = document.createElement('style');
        style.textContent = '@keyframes bonusMeterGlow{0%{box-shadow:0 0 4px rgba(16,185,129,0.4)}50%{box-shadow:0 0 12px rgba(16,185,129,0.8)}100%{box-shadow:0 0 4px rgba(16,185,129,0.4)}}@keyframes bonusMeterPulse{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}';
        document.head.appendChild(style);
    }

    function _renderBar() {
        var existing = document.getElementById(BAR_ID);
        if (existing) existing.parentNode.removeChild(existing);
        var data = _loadData();

        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.style.cssText = 'position:fixed;top:60px;left:0;width:100%;background:linear-gradient(90deg,#064e3b,#065f46);padding:8px 16px;z-index:9997;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;gap:12px;';

        var label = document.createElement('span');
        label.textContent = '\uD83D\uDD25 Bonus Meter';
        label.style.cssText = 'color:#34d399;font-weight:800;font-size:13px;white-space:nowrap;';

        var trackWrap = document.createElement('div');
        trackWrap.style.cssText = 'flex:1;position:relative;height:22px;background:rgba(0,0,0,0.4);border-radius:11px;overflow:visible;';

        var fillPct = Math.min(100, (data.wagered / GOAL_AMOUNT) * 100);

        var fill = document.createElement('div');
        fill.id = 'bonusMeterFill';
        fill.style.cssText = 'height:100%;width:' + fillPct + '%;background:linear-gradient(90deg,#10b981,#34d399,#6ee7b7);border-radius:11px;transition:width 0.5s ease;position:relative;';

        var amountLabel = document.createElement('span');
        amountLabel.id = 'bonusMeterAmount';
        amountLabel.textContent = '$' + Math.floor(data.wagered) + ' / $' + GOAL_AMOUNT;
        amountLabel.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:700;color:#fff;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.5);';

        trackWrap.appendChild(fill);
        trackWrap.appendChild(amountLabel);

        for (var i = 0; i < MILESTONES.length; i++) {
            var ms = MILESTONES[i];
            var marker = document.createElement('div');
            marker.className = 'bonus-meter-marker';
            marker.style.cssText = 'position:absolute;top:-2px;left:' + ms.pct + '%;transform:translateX(-50%);width:20px;height:26px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;z-index:2;cursor:default;transition:background 0.3s,box-shadow 0.3s;';

            if (data.claimed[i]) {
                marker.style.background = '#10b981';
                marker.style.color = '#fff';
                marker.textContent = '\u2713';
                marker.style.animation = 'bonusMeterGlow 2s infinite';
            } else if (data.wagered >= ms.threshold) {
                marker.style.background = '#fbbf24';
                marker.style.color = '#000';
                marker.textContent = '\u2605';
                marker.style.animation = 'bonusMeterPulse 1s infinite';
            } else {
                marker.style.background = 'rgba(255,255,255,0.15)';
                marker.style.color = '#94a3b8';
                marker.textContent = ms.label;
            }
            trackWrap.appendChild(marker);
        }

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = 'background:none;border:none;color:#6ee7b7;font-size:16px;cursor:pointer;padding:2px 6px;';
        closeBtn.addEventListener('click', function() {
            var el = document.getElementById(BAR_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });

        bar.appendChild(label);
        bar.appendChild(trackWrap);
        bar.appendChild(closeBtn);
        document.body.appendChild(bar);
    }

    function _checkAndClaimMilestones(data) {
        var anyClaimed = false;
        for (var i = 0; i < MILESTONES.length; i++) {
            if (!data.claimed[i] && data.wagered >= MILESTONES[i].threshold) {
                data.claimed[i] = true;
                var reward = MILESTONES[i].reward;
                _claimReward(reward);
                _toast('\uD83C\uDFC6 Milestone ' + MILESTONES[i].pct + '% reached! +$' + reward + ' bonus!');
                anyClaimed = true;
            }
        }
        return anyClaimed;
    }

    function _trackWager(amount) {
        if (_isQA()) return;
        if (typeof amount !== 'number' || amount <= 0) return;

        var data = _loadData();
        data.wagered += amount;
        _checkAndClaimMilestones(data);
        _saveData(data);

        var fillEl = document.getElementById('bonusMeterFill');
        if (fillEl) {
            var pct = Math.min(100, (data.wagered / GOAL_AMOUNT) * 100);
            fillEl.style.width = pct + '%';
        }
        var amountEl = document.getElementById('bonusMeterAmount');
        if (amountEl) {
            amountEl.textContent = '$' + Math.floor(data.wagered) + ' / $' + GOAL_AMOUNT;
        }

        _renderBar();
    }

    function _init() {
        if (_isQA()) return;
        _injectStyles();
        _renderBar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    window._bonusMeterTrackWager = _trackWager;

})();
