
(function () {
    'use strict';

    function getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    function showToast(msg, duration) {
        duration = duration || 5000;
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
            'background:linear-gradient(135deg,#22c55e,#16a34a)', 'color:#fff',
            'padding:12px 20px', 'border-radius:10px', 'font-weight:800',
            'font-size:14px', 'z-index:10400', 'box-shadow:0 4px 20px rgba(0,0,0,.5)',
            'pointer-events:none', 'text-align:center', 'max-width:300px'
        ].join(';');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, duration);
    }

    function updateBadge(pending) {
        var navBtns = document.querySelectorAll("button, a, [role=\"button\"]");
        var rakeBtn = null;
        for (var i = 0; i < navBtns.length; i++) {
            if (navBtns[i].textContent && navBtns[i].textContent.indexOf('Rakeback') !== -1) {
                rakeBtn = navBtns[i];
                break;
            }
        }
        if (!rakeBtn) return;
        var existing = rakeBtn.querySelector('.rakeback-badge');
        if (pending >= 0.50) {
            if (!existing) {
                existing = document.createElement('span');
                existing.className = 'rakeback-badge';
                rakeBtn.appendChild(existing);
            }
            existing.textContent = "$" + pending.toFixed(0);
        } else {
            if (existing) existing.parentNode.removeChild(existing);
        }
    }

    function checkRakebackBadge() {
        var token = getToken();
        if (!token) return;
        fetch('/api/rakeback/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data || typeof data.pendingRakeback === 'undefined') return;
            var pending = parseFloat(data.pendingRakeback) || 0;
            updateBadge(pending);
            if (pending >= 0.50) {
                showToast("\uD83D\uDCB0 $" + pending.toFixed(2) + " rakeback waiting for you!", 5000);
            }
        })
        .catch(function () {});
    }

    function injectStyles() {
        if (document.getElementById('rakebackStyles')) return;
        var s = document.createElement('style');
        s.id = 'rakebackStyles';
        s.textContent = [
            '#rakebackOverlay{display:none;position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);align-items:center;justify-content:center}',
            '#rakebackOverlay.active{display:flex}',
            '#rakebackModal{width:90%;max-width:480px;max-height:85vh;overflow-y:auto;background:#0d0d1a;border-radius:16px;border:1px solid rgba(255,215,0,.2);box-shadow:0 20px 60px rgba(0,0,0,.8);padding:24px}',
            '.rb-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}',
            '.rb-title{font-size:22px;font-weight:900;color:#ffd700}',
            '.rb-sub{font-size:12px;color:rgba(255,255,255,.45);margin-top:4px}',
            '.rb-close{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}',
            '.rb-stats{background:linear-gradient(135deg,#0f1a0f,#1a1a2e);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;margin-bottom:16px}',
            '.rb-stat-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
            '.rb-stat-label{font-size:13px;color:rgba(255,255,255,.5)}',
            '.rb-stat-value{font-size:15px;font-weight:700;color:#fff}',
            '.rb-pending{font-size:32px;font-weight:900;color:#4ade80;text-align:center;padding:16px 0}',
            '.rb-pending-label{font-size:12px;color:rgba(255,255,255,.4);text-align:center;margin-top:-10px;margin-bottom:16px}',
            '.rb-claim-btn{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;padding:14px;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;width:100%;margin-bottom:16px}',
            '.rb-claim-btn:disabled{opacity:.4;cursor:not-allowed}',
            '.rb-payout{font-size:12px;color:rgba(255,255,255,.35);text-align:center;margin-bottom:20px}',
            '.rb-history h3{font-size:14px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:10px}',
            '.rb-history-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}',
            '.rb-history-date{color:rgba(255,255,255,.4)}',
            '.rb-history-amount{color:#4ade80;font-weight:700}',
            '.rb-empty{text-align:center;padding:30px;color:rgba(255,255,255,.3);font-size:13px}',
            '.rakeback-badge{background:#22c55e;color:#000;border-radius:10px;font-size:10px;padding:1px 5px;margin-left:4px;font-weight:800}'
        ].join('');
        document.head.appendChild(s);
    }

    var overlay      = null;
    var modal        = null;
    var statsEl      = null;
    var pendingEl    = null;
    var claimBtn     = null;
    var payoutEl     = null;
    var historyEl    = null;
    var countdownInt = null;
    var nextPayoutTs = null;
    var escHandler   = null;

    function buildModal() {
        injectStyles();
        overlay = document.createElement('div');
        overlay.id = 'rakebackOverlay';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeRakebackModal();
        });
        modal = document.createElement('div');
        modal.id = 'rakebackModal';
        var header = document.createElement('div');
        header.className = 'rb-header';
        var titleWrap = document.createElement('div');
        var title = document.createElement('div');
        title.className = 'rb-title';
        title.textContent = "\uD83D\uDCB0 WEEKLY RAKEBACK";
        var sub = document.createElement('div');
        sub.className = 'rb-sub';
        sub.textContent = 'Earn 1% back on your weekly losses';
        titleWrap.appendChild(title);
        titleWrap.appendChild(sub);
        var closeBtn = document.createElement('button');
        closeBtn.className = 'rb-close';
        closeBtn.textContent = "×";
        closeBtn.addEventListener('click', closeRakebackModal);
        header.appendChild(titleWrap);
        header.appendChild(closeBtn);
        statsEl = document.createElement('div');
        statsEl.className = 'rb-stats';
        statsEl.innerHTML = '<div style="color:rgba(255,255,255,.4);text-align:center;padding:20px">Loading…</div>';
        pendingEl = document.createElement('div');
        pendingEl.className = 'rb-pending';
        pendingEl.textContent = "$0.00";
        var pendingLabel = document.createElement('div');
        pendingLabel.className = 'rb-pending-label';
        pendingLabel.textContent = 'available to claim';
        claimBtn = document.createElement('button');
        claimBtn.className = 'rb-claim-btn';
        claimBtn.textContent = "CLAIM $0.00 CASHBACK";
        claimBtn.disabled = true;
        claimBtn.addEventListener('click', handleClaim);
        payoutEl = document.createElement('div');
        payoutEl.className = 'rb-payout';
        payoutEl.textContent = "Next auto-payout: calculating…";
        historyEl = document.createElement('div');
        historyEl.className = 'rb-history';
        var histTitle = document.createElement('h3');
        histTitle.textContent = 'Recent Payouts';
        historyEl.appendChild(histTitle);
        modal.appendChild(header);
        modal.appendChild(statsEl);
        modal.appendChild(pendingEl);
        modal.appendChild(pendingLabel);
        modal.appendChild(claimBtn);
        modal.appendChild(payoutEl);
        modal.appendChild(historyEl);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function renderStatus(data) {
        var wagered = parseFloat(data.weeklyWagered) || 0;
        var won     = parseFloat(data.weeklyWon)     || 0;
        var netLoss = parseFloat(data.weeklyNetLoss) || 0;
        var pending = parseFloat(data.pendingRakeback) || 0;
        statsEl.innerHTML = '';
        var rows = [
            ["This Week's Wagers", "$" + wagered.toFixed(2)],
            ["Total Won",          "$" + won.toFixed(2)],
            ["Net Loss",           "$" + netLoss.toFixed(2)],
            ["Rakeback Rate",      "1%"]
        ];
        rows.forEach(function (pair) {
            var row = document.createElement('div');
            row.className = 'rb-stat-row';
            var lbl = document.createElement('span');
            lbl.className = 'rb-stat-label';
            lbl.textContent = pair[0];
            var val = document.createElement('span');
            val.className = 'rb-stat-value';
            val.textContent = pair[1];
            row.appendChild(lbl);
            row.appendChild(val);
            statsEl.appendChild(row);
        });
        pendingEl.textContent = "$" + pending.toFixed(2);
        claimBtn.textContent = "CLAIM $" + pending.toFixed(2) + " CASHBACK";
        claimBtn.disabled = pending < 0.01;
        updateBadge(pending);
        if (data.nextPayoutAt) {
            nextPayoutTs = new Date(data.nextPayoutAt);
            startCountdown(nextPayoutTs);
        }
        var h3 = historyEl.querySelector('h3');
        historyEl.innerHTML = '';
        historyEl.appendChild(h3);
        var hist = data.history || [];
        if (hist.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'rb-empty';
            empty.textContent = 'No rakeback payouts yet this season.';
            historyEl.appendChild(empty);
        } else {
            hist.forEach(function (row) {
                var r = document.createElement('div');
                r.className = 'rb-history-row';
                var d = document.createElement('span');
                d.className = 'rb-history-date';
                d.textContent = row.created_at ? row.created_at.slice(0, 10) : "—";
                var a = document.createElement('span');
                a.className = 'rb-history-amount';
                a.textContent = "+$" + (parseFloat(row.amount) || 0).toFixed(2);
                r.appendChild(d);
                r.appendChild(a);
                historyEl.appendChild(r);
            });
        }
    }

    function startCountdown(target) {
        if (countdownInt) clearInterval(countdownInt);
        function formatDate(d) {
            var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return days[d.getUTCDay()] + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ' at midnight UTC';
        }
        function tick() {
            var now  = Date.now();
            var diff = target.getTime() - now;
            if (diff <= 0) {
                payoutEl.textContent = "Payout processing…";
                clearInterval(countdownInt);
                return;
            }
            var h  = Math.floor(diff / 3600000);
            var m  = Math.floor((diff % 3600000) / 60000);
            var s  = Math.floor((diff % 60000) / 1000);
            var hh = h < 10 ? '0' + h : '' + h;
            var mm = m < 10 ? '0' + m : '' + m;
            var ss = s < 10 ? '0' + s : '' + s;
            payoutEl.textContent = "Next payout: " + formatDate(target) + " — " + hh + ":" + mm + ":" + ss + " remaining";
        }
        tick();
        countdownInt = setInterval(tick, 1000);
    }

    function fetchStatus() {
        var token = getToken();
        if (!token) {
            statsEl.innerHTML = '<div style="color:rgba(255,255,255,.4);text-align:center;padding:20px">Please log in to view rakeback.</div>';
            return;
        }
        statsEl.innerHTML = '<div style="color:rgba(255,255,255,.4);text-align:center;padding:20px">Loading…</div>';
        fetch('/api/rakeback/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && typeof data.pendingRakeback !== 'undefined') {
                renderStatus(data);
            } else {
                statsEl.innerHTML = '<div style="color:rgba(255,255,255,.4);text-align:center;padding:20px">Could not load data.</div>';
            }
        })
        .catch(function () {
            statsEl.innerHTML = '<div style="color:rgba(255,255,255,.4);text-align:center;padding:20px">Could not load data.</div>';
        });
    }

    function handleClaim() {
        var token = getToken();
        if (!token || claimBtn.disabled) return;
        claimBtn.disabled = true;
        claimBtn.textContent = "Claiming…";
        fetch('/api/rakeback/claim', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.success) {
                if (typeof updateBalance === 'function') updateBalance(data.newBalance);
                showToast("\uD83D\uDCB0 $" + (parseFloat(data.credited) || 0).toFixed(2) + " rakeback claimed!", 5000);
                fetchStatus();
            } else {
                claimBtn.textContent = "Error — try again";
                setTimeout(function () {
                    claimBtn.textContent = "CLAIM CASHBACK";
                    claimBtn.disabled = false;
                }, 3000);
            }
        })
        .catch(function () {
            claimBtn.textContent = "Error — try again";
            setTimeout(function () {
                claimBtn.textContent = "CLAIM CASHBACK";
                claimBtn.disabled = false;
            }, 3000);
        });
    }

    function openRakebackModal() {
        if (!overlay) buildModal();
        overlay.classList.add('active');
        fetchStatus();
        escHandler = function (e) {
            if (e.key === 'Escape') closeRakebackModal();
        };
        document.addEventListener('keydown', escHandler);
    }

    function closeRakebackModal() {
        if (overlay) overlay.classList.remove('active');
        if (countdownInt) { clearInterval(countdownInt); countdownInt = null; }
        if (escHandler)   { document.removeEventListener('keydown', escHandler); escHandler = null; }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(checkRakebackBadge, 4000); });
    } else {
        setTimeout(checkRakebackBadge, 4000);
    }

    window.openRakebackModal  = openRakebackModal;
    window.closeRakebackModal = closeRakebackModal;
    window.checkRakebackBadge = checkRakebackBadge;

}());
