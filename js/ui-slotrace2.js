/* ui-slotrace2.js — Slot Race Timer Bar (Sprint 41)
 * 30-minute competitive races with spin counting and position tracking.
 * DOM element: #slotRaceBar (fixed top bar)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_slotRace2Data';
    var BAR_ID = 'slotRaceBar';
    var RACE_DURATION = 1800;
    var COOLDOWN_MS = 600000;
    var TICK_INTERVAL = 1000;
    var PRIZES = { 1: 50, 2: 25, 3: 10 };

    var _tickTimer = null;
    var _barEl = null;

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
    function _fmtTime(secs) {
        if (secs <= 0) return '00:00';
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'info'); return; }
        if (typeof showWinToast === 'function') { showWinToast(msg, 'epic'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#4ade80;color:#000;padding:10px 20px;border-radius:8px;font-weight:700;z-index:99999;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
    }

    // ── DOM creation ─────────────────────────────────────────────────────
    function _buildBar() {
        var existing = document.getElementById(BAR_ID);
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.className = 'slot-race-bar';
        bar.style.display = 'none';

        // GO badge
        var goBadge = document.createElement('span');
        goBadge.className = 's41-race-go-badge';
        goBadge.id = 'sr2GoBadge';
        goBadge.textContent = 'GO!';
        bar.appendChild(goBadge);

        // Title
        var titleEl = document.createElement('span');
        titleEl.className = 's41-race-title';
        titleEl.textContent = '\uD83C\uDFC1 SLOT RACE';
        bar.appendChild(titleEl);

        // Track
        var track = document.createElement('div');
        track.className = 's41-race-track';

        var trackFill = document.createElement('div');
        trackFill.className = 's41-race-track-fill';
        trackFill.id = 'sr2TrackFill';

        var raceIcon = document.createElement('div');
        raceIcon.className = 's41-race-icon';
        raceIcon.id = 'sr2Icon';
        raceIcon.textContent = '\uD83C\uDFCE\uFE0F';

        // Checkpoints
        var checkpoints = document.createElement('div');
        checkpoints.className = 's41-race-checkpoints';
        var cpPositions = [25, 50, 75];
        for (var c = 0; c < cpPositions.length; c++) {
            var cp = document.createElement('div');
            cp.className = 's41-race-checkpoint';
            cp.style.left = cpPositions[c] + '%';
            checkpoints.appendChild(cp);
        }

        track.appendChild(trackFill);
        track.appendChild(raceIcon);
        track.appendChild(checkpoints);
        bar.appendChild(track);

        // Stats
        var stats = document.createElement('div');
        stats.className = 's41-race-stats';

        // Position stat
        var posStat = document.createElement('div');
        posStat.className = 's41-race-stat';
        var posVal = document.createElement('span');
        posVal.className = 's41-race-stat-value s41-race-position';
        posVal.id = 'sr2Pos';
        posVal.textContent = '--';
        var posLabel = document.createElement('span');
        posLabel.className = 's41-race-stat-label';
        posLabel.textContent = 'Position';
        posStat.appendChild(posVal);
        posStat.appendChild(posLabel);
        stats.appendChild(posStat);

        // Spins stat
        var spinStat = document.createElement('div');
        spinStat.className = 's41-race-stat';
        var spinVal = document.createElement('span');
        spinVal.className = 's41-race-stat-value';
        spinVal.id = 'sr2Spins';
        spinVal.textContent = '0';
        var spinLabel = document.createElement('span');
        spinLabel.className = 's41-race-stat-label';
        spinLabel.textContent = 'Spins';
        spinStat.appendChild(spinVal);
        spinStat.appendChild(spinLabel);
        stats.appendChild(spinStat);

        bar.appendChild(stats);

        // Timer
        var timerWrap = document.createElement('div');
        timerWrap.className = 's41-race-timer';
        var timerIcon = document.createElement('span');
        timerIcon.className = 's41-race-timer-icon';
        timerIcon.textContent = '\u23F1';
        var timerVal = document.createElement('span');
        timerVal.className = 's41-race-timer-value';
        timerVal.id = 'sr2Timer';
        timerVal.textContent = '30:00';
        timerWrap.appendChild(timerIcon);
        timerWrap.appendChild(timerVal);
        bar.appendChild(timerWrap);

        // Laps
        var laps = document.createElement('div');
        laps.className = 's41-race-laps';
        laps.id = 'sr2Laps';
        var lapsLabel = document.createElement('span');
        lapsLabel.textContent = 'Lap ';
        var lapsCount = document.createElement('span');
        lapsCount.className = 's41-race-laps-count';
        lapsCount.id = 'sr2LapCount';
        lapsCount.textContent = '1';
        laps.appendChild(lapsLabel);
        laps.appendChild(lapsCount);
        bar.appendChild(laps);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:rgba(226,232,240,0.4);font-size:14px;cursor:pointer;padding:4px;margin-left:4px;';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { _dismiss(); };
        bar.appendChild(closeBtn);

        document.body.appendChild(bar);
        _barEl = bar;
    }

    // ── Start race ───────────────────────────────────────────────────────
    function _startRace() {
        var d = _load();
        d.startTime = Date.now();
        d.endTime = Date.now() + RACE_DURATION * 1000;
        d.spins = 0;
        d.position = Math.floor(Math.random() * 15) + 5;
        d.active = true;
        d.lap = (d.lap || 0) + 1;
        _save(d);
        _show();
        _startTick();
    }

    // ── Tick ──────────────────────────────────────────────────────────────
    function _startTick() {
        if (_tickTimer) clearInterval(_tickTimer);
        _tickTimer = setInterval(function () {
            var d = _load();
            if (!d.active) return;

            var remaining = Math.max(0, Math.floor((d.endTime - Date.now()) / 1000));
            var elapsed = RACE_DURATION - remaining;
            var pct = Math.min(100, (elapsed / RACE_DURATION) * 100);

            var timerEl = document.getElementById('sr2Timer');
            var fillEl = document.getElementById('sr2TrackFill');
            var iconEl = document.getElementById('sr2Icon');
            var posEl = document.getElementById('sr2Pos');
            var spinsEl = document.getElementById('sr2Spins');
            var lapEl = document.getElementById('sr2LapCount');

            if (timerEl) {
                timerEl.textContent = _fmtTime(remaining);
                if (remaining <= 60) {
                    timerEl.classList.add('s41-race-ending');
                } else {
                    timerEl.classList.remove('s41-race-ending');
                }
            }
            if (fillEl) fillEl.style.width = pct + '%';
            if (iconEl) iconEl.style.left = Math.min(95, pct) + '%';
            if (posEl) posEl.textContent = '#' + d.position;
            if (spinsEl) spinsEl.textContent = String(d.spins || 0);
            if (lapEl) lapEl.textContent = String(d.lap || 1);

            if (remaining <= 0) {
                _endRace(d);
            }
        }, TICK_INTERVAL);
    }

    // ── End race ─────────────────────────────────────────────────────────
    function _endRace(d) {
        if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
        d.active = false;
        d.cooldownUntil = Date.now() + COOLDOWN_MS;
        _save(d);

        var prize = PRIZES[d.position];
        if (prize) {
            if (typeof window.balance === 'number') {
                window.balance += prize;
                if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
            }
            _toast('\uD83C\uDFC6 Race finished #' + d.position + '! Won $' + prize + '!');
        } else {
            _toast('\uD83C\uDFC1 Race finished #' + d.position + '. Better luck next time!');
        }

        setTimeout(_dismiss, 3000);
    }

    // ── Track spin ───────────────────────────────────────────────────────
    function _trackSpin() {
        if (_isQA()) return;
        var d = _load();

        // Start new race if none active and cooldown passed
        if (!d.active) {
            if (d.cooldownUntil && Date.now() < d.cooldownUntil) return;
            _startRace();
            return;
        }

        // Increment spins and update position
        d.spins = (d.spins || 0) + 1;
        var shift = Math.floor(Math.random() * 3) - 1;
        d.position = Math.max(1, Math.min(20, (d.position || 10) + shift));
        // Bonus position improvement every 10 spins
        if (d.spins % 10 === 0 && d.position > 1) {
            d.position = Math.max(1, d.position - 2);
        }
        _save(d);
    }

    // ── Show / Dismiss ───────────────────────────────────────────────────
    function _show() {
        if (!_barEl) _buildBar();
        if (_barEl) {
            _barEl.style.display = '';
            _barEl.classList.add('active');
        }
    }

    function _dismiss() {
        if (_barEl) {
            _barEl.classList.remove('active');
            _barEl.style.display = 'none';
        }
        if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
    }

    // ── Public API ───────────────────────────────────────────────────────
    window._slotRaceTrackSpin = _trackSpin;
    window.dismissSlotRace = _dismiss;

    // ── Init ─────────────────────────────────────────────────────────────
    function _init() {
        if (_isQA()) return;
        _buildBar();

        // Resume active race
        var d = _load();
        if (d.active && d.endTime > Date.now()) {
            _show();
            _startTick();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 600); });
    } else {
        setTimeout(_init, 600);
    }

})();
