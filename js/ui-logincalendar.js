/* ui-logincalendar.js — Daily Login Calendar
 * Sprint 36: 30-day visual calendar with escalating daily rewards.
 * Shows on page load if today not yet claimed (after 3s delay).
 * Auto-resets when the month changes.
 */
(function () {
    'use strict';

    var LC_KEY = 'ms_loginCalendarData';
    var _overlayEl = null;

    // ── Reward tiers by day number (1-indexed) ──────────────────────────────
    function _rewardForDay(day) {
        if (day <= 7)  return 1;
        if (day <= 14) return 2;
        if (day <= 21) return 5;
        if (day <= 28) return 10;
        return 25; // days 29-30
    }

    // ── Load persisted data ─────────────────────────────────────────────────
    function _loadData() {
        try {
            var raw = localStorage.getItem(LC_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return null;
    }

    function _saveData(data) {
        try { localStorage.setItem(LC_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }

    function _freshData(year, month) {
        return {
            year: year,
            month: month,
            claimed: [],      // array of day numbers already claimed
            lastClaim: null   // ISO date string of last claim
        };
    }

    function _getData() {
        var now = new Date();
        var y = now.getFullYear();
        var m = now.getMonth();
        var data = _loadData();
        if (!data || data.year !== y || data.month !== m) {
            data = _freshData(y, m);
            _saveData(data);
        }
        return data;
    }

    // ── Today's day-of-month ────────────────────────────────────────────────
    function _today() {
        return new Date().getDate();
    }

    function _todayISO() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function _daysInMonth() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }

    // ── Format currency ─────────────────────────────────────────────────────
    function _fmt(n) {
        return '$' + n.toFixed(2);
    }

    // ── Build overlay DOM ───────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;

        var overlay = document.createElement('div');
        overlay.id = 'dailyLoginCalendar';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.7);display:none;justify-content:center;align-items:center;' +
            'z-index:10500;opacity:0;transition:opacity 0.3s ease';

        var panel = document.createElement('div');
        panel.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;' +
            'padding:24px;max-width:420px;width:90%;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.5);' +
            'border:1px solid rgba(255,215,0,0.3)';

        var title = document.createElement('h3');
        title.style.cssText = 'margin:0 0 6px;text-align:center;font-size:20px;color:#ffd700';
        title.textContent = '\uD83D\uDCC5 Daily Login Calendar';

        var status = document.createElement('div');
        status.id = 'dlcStatus';
        status.style.cssText = 'text-align:center;font-size:13px;color:#aaa;margin-bottom:12px';
        status.textContent = 'Claim your daily reward!';

        var grid = document.createElement('div');
        grid.id = 'dlcGrid';
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px';

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'display:block;margin:0 auto;padding:8px 28px;border:none;' +
            'border-radius:8px;background:#555;color:#fff;font-size:14px;cursor:pointer';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', function () { _hide(); });

        panel.appendChild(title);
        panel.appendChild(status);
        panel.appendChild(grid);
        panel.appendChild(closeBtn);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        _overlayEl = overlay;
    }

    // ── Render the grid ─────────────────────────────────────────────────────
    function _renderGrid() {
        var grid = document.getElementById('dlcGrid');
        if (!grid) return;
        while (grid.firstChild) grid.removeChild(grid.firstChild);

        var data = _getData();
        var todayNum = _today();
        var totalDays = _daysInMonth();

        for (var d = 1; d <= totalDays; d++) {
            var cell = document.createElement('div');
            var isClaimed = data.claimed.indexOf(d) !== -1;
            var isToday = (d === todayNum && !isClaimed);
            var isFuture = (d > todayNum);
            var isPast = (d < todayNum && !isClaimed);

            var bg = '#2a2a3e';
            var border = '1px solid #444';
            var cursor = 'default';
            var opacity = '1';

            if (isClaimed) {
                bg = '#1a4d2e';
                border = '1px solid #2ecc71';
            } else if (isToday) {
                bg = 'linear-gradient(135deg,#b8860b,#daa520)';
                border = '2px solid #ffd700';
                cursor = 'pointer';
            } else if (isFuture || isPast) {
                opacity = '0.4';
            }

            cell.style.cssText = 'border-radius:8px;padding:6px 2px;text-align:center;font-size:11px;' +
                'cursor:' + cursor + ';opacity:' + opacity + ';border:' + border +
                (bg.indexOf('gradient') !== -1 ? ';background:' + bg : ';background:' + bg);

            if (isClaimed) cell.className = 'dlc-claimed';
            else if (isToday) cell.className = 'dlc-today';
            else cell.className = 'dlc-future';

            var dayNum = document.createElement('div');
            dayNum.style.cssText = 'font-weight:bold;font-size:13px';
            dayNum.textContent = isClaimed ? '\u2705 ' + d : String(d);

            var reward = document.createElement('div');
            reward.style.cssText = 'font-size:10px;color:#ffd700;margin-top:2px';
            reward.textContent = _fmt(_rewardForDay(d));

            cell.appendChild(dayNum);
            cell.appendChild(reward);

            if (isToday) {
                (function (dayVal) {
                    cell.addEventListener('click', function () { _claimDay(dayVal); });
                })(d);
            }

            grid.appendChild(cell);
        }

        // Update status
        var statusEl = document.getElementById('dlcStatus');
        if (statusEl) {
            var claimedToday = data.claimed.indexOf(todayNum) !== -1;
            statusEl.textContent = claimedToday
                ? '\u2B50 Today\'s reward claimed!'
                : '\uD83C\uDF81 Tap today\'s cell to claim ' + _fmt(_rewardForDay(todayNum));
        }
    }

    // ── Claim a day ─────────────────────────────────────────────────────────
    function _claimDay(day) {
        var data = _getData();
        if (data.claimed.indexOf(day) !== -1) return;

        var reward = _rewardForDay(day);
        data.claimed.push(day);
        data.lastClaim = _todayISO();
        _saveData(data);

        // Credit balance
        if (typeof balance !== 'undefined') balance += reward;
        if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();

        _renderGrid();
    }

    // ── Show / hide ─────────────────────────────────────────────────────────
    function _show() {
        if (!_overlayEl) return;
        _renderGrid();
        _overlayEl.style.display = 'flex';
        requestAnimationFrame(function () {
            _overlayEl.style.opacity = '1';
        });
    }

    function _hide() {
        if (!_overlayEl) return;
        _overlayEl.style.opacity = '0';
        setTimeout(function () {
            _overlayEl.style.display = 'none';
        }, 300);
    }

    window.dismissLoginCalendar = _hide;

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('noBonus') === '1') return;

        var data = _getData();
        var todayNum = _today();
        var alreadyClaimed = data.claimed.indexOf(todayNum) !== -1;

        _createOverlay();

        if (!alreadyClaimed) {
            // Wait for daily bonus modal to close before showing calendar
            var _tryShow = function () {
                var dbm = document.getElementById('dailyBonusModal');
                if (dbm && dbm.classList.contains('active')) {
                    setTimeout(_tryShow, 1500); // re-check after 1.5s
                    return;
                }
                _show();
            };
            setTimeout(_tryShow, 3000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 500); });
    } else {
        setTimeout(_init, 500);
    }

})();
