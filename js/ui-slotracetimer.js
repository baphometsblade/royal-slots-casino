(function() {
    'use strict';

    var STORAGE_KEY = 'ms_slotRaceTimer';
    var RACE_DURATION = 300;
    var SPIN_TRIGGER = 800;
    var BONUS_1ST = 50;
    var BONUS_2ND = 25;
    var BONUS_3RD = 10;
    var RING_RADIUS = 22;
    var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    var totalSpins = 0;
    var raceActive = false;
    var raceStartTime = 0;
    var raceSpins = 0;
    var botSpins = [0, 0, 0];
    var botNames = ['SpinBot', 'LuckyAI', 'ReelKing'];
    var countdownInterval = null;
    var containerEl = null;

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var s = JSON.parse(raw);
                totalSpins = s.totalSpins || 0;
                raceActive = s.raceActive || false;
                raceStartTime = s.raceStartTime || 0;
                raceSpins = s.raceSpins || 0;
                botSpins = s.botSpins || [0, 0, 0];
            }
        } catch (e) { /* ignore */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                totalSpins: totalSpins,
                raceActive: raceActive,
                raceStartTime: raceStartTime,
                raceSpins: raceSpins,
                botSpins: botSpins
            }));
        } catch (e) { /* ignore */ }
    }

    function getTimeRemaining() {
        if (!raceActive) return 0;
        var elapsed = Math.floor((Date.now() - raceStartTime) / 1000);
        return Math.max(0, RACE_DURATION - elapsed);
    }

    function formatTime(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getPlacement() {
        var all = [
            { name: 'You', spins: raceSpins },
            { name: botNames[0], spins: botSpins[0] },
            { name: botNames[1], spins: botSpins[1] },
            { name: botNames[2], spins: botSpins[2] }
        ];
        all.sort(function(a, b) { return b.spins - a.spins; });
        var place = 1;
        for (var i = 0; i < all.length; i++) {
            if (all[i].name === 'You') {
                place = i + 1;
                break;
            }
        }
        return { place: place, standings: all };
    }

    function buildContainer() {
        if (containerEl) return;
        containerEl = document.createElement('div');
        containerEl.id = 'slotRaceTimer';
        containerEl.style.cssText = 'position:fixed;top:80px;right:16px;z-index:10400;' +
            'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #e94560;' +
            'border-radius:14px;padding:12px 16px;color:#fff;font-family:inherit;' +
            'box-shadow:0 4px 20px rgba(233,69,96,0.3);min-width:180px;display:none;' +
            'transition:opacity 0.4s,transform 0.4s;';
        document.body.appendChild(containerEl);
    }

    function renderRace() {
        if (!containerEl) return;
        while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

        var remaining = getTimeRemaining();
        var progress = remaining / RACE_DURATION;

        // Title row
        var titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';

        var titleText = document.createElement('span');
        titleText.style.cssText = 'font-weight:700;font-size:13px;color:#e94560;';
        titleText.textContent = '\uD83C\uDFC1 Slot Race';
        titleRow.appendChild(titleText);

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:0 4px;';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', function() { dismiss(); });
        titleRow.appendChild(closeBtn);

        containerEl.appendChild(titleRow);

        // SVG ring + time
        var ringWrap = document.createElement('div');
        ringWrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';

        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '54');
        svg.setAttribute('height', '54');
        svg.setAttribute('viewBox', '0 0 54 54');

        var bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('cx', '27');
        bgCircle.setAttribute('cy', '27');
        bgCircle.setAttribute('r', String(RING_RADIUS));
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', '#333');
        bgCircle.setAttribute('stroke-width', '4');
        svg.appendChild(bgCircle);

        var fgCircle = document.createElementNS(svgNS, 'circle');
        fgCircle.setAttribute('cx', '27');
        fgCircle.setAttribute('cy', '27');
        fgCircle.setAttribute('r', String(RING_RADIUS));
        fgCircle.setAttribute('fill', 'none');
        fgCircle.setAttribute('stroke', '#e94560');
        fgCircle.setAttribute('stroke-width', '4');
        fgCircle.setAttribute('stroke-linecap', 'round');
        fgCircle.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
        var offset = RING_CIRCUMFERENCE * (1 - progress);
        fgCircle.setAttribute('stroke-dashoffset', String(offset));
        fgCircle.setAttribute('transform', 'rotate(-90 27 27)');
        svg.appendChild(fgCircle);

        ringWrap.appendChild(svg);

        var timeCol = document.createElement('div');
        var timeLbl = document.createElement('div');
        timeLbl.style.cssText = 'font-size:20px;font-weight:700;color:#fff;';
        timeLbl.textContent = formatTime(remaining);
        timeCol.appendChild(timeLbl);
        var spinLbl = document.createElement('div');
        spinLbl.style.cssText = 'font-size:11px;color:#aaa;';
        spinLbl.textContent = 'Your spins: ' + raceSpins;
        timeCol.appendChild(spinLbl);
        ringWrap.appendChild(timeCol);

        containerEl.appendChild(ringWrap);

        // Standings
        var info = getPlacement();
        var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49', '4th'];
        for (var i = 0; i < info.standings.length; i++) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;padding:2px 0;' +
                (info.standings[i].name === 'You' ? 'color:#ffd700;font-weight:700;' : 'color:#ccc;');
            var nameSpan = document.createElement('span');
            nameSpan.textContent = medals[i] + ' ' + info.standings[i].name;
            row.appendChild(nameSpan);
            var spinSpan = document.createElement('span');
            spinSpan.textContent = info.standings[i].spins + ' spins';
            row.appendChild(spinSpan);
            containerEl.appendChild(row);
        }
    }

    function showResults() {
        if (!containerEl) return;
        raceActive = false;
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        var info = getPlacement();
        var bonus = 0;
        if (info.place === 1) bonus = BONUS_1ST;
        else if (info.place === 2) bonus = BONUS_2ND;
        else if (info.place === 3) bonus = BONUS_3RD;

        if (bonus > 0 && typeof window.balance === 'number') {
            window.balance += bonus;
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
        }

        while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

        var title = document.createElement('div');
        title.style.cssText = 'font-weight:700;font-size:14px;color:#ffd700;text-align:center;margin-bottom:8px;';
        title.textContent = '\uD83C\uDFC6 Race Complete!';
        containerEl.appendChild(title);

        var placeTxt = document.createElement('div');
        placeTxt.style.cssText = 'text-align:center;font-size:18px;font-weight:700;color:#fff;margin-bottom:4px;';
        var medals = ['1st', '2nd', '3rd', '4th'];
        placeTxt.textContent = 'You placed ' + medals[info.place - 1] + '!';
        containerEl.appendChild(placeTxt);

        if (bonus > 0) {
            var bonusTxt = document.createElement('div');
            bonusTxt.style.cssText = 'text-align:center;font-size:13px;color:#4ade80;margin-bottom:8px;';
            bonusTxt.textContent = '+$' + bonus.toFixed(2) + ' bonus!';
            containerEl.appendChild(bonusTxt);
        }

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'display:block;margin:6px auto 0;background:#e94560;color:#fff;' +
            'border:none;border-radius:8px;padding:6px 18px;cursor:pointer;font-size:12px;';
        closeBtn.textContent = 'OK';
        closeBtn.addEventListener('click', function() { dismiss(); });
        containerEl.appendChild(closeBtn);

        raceSpins = 0;
        totalSpins = 0;
        saveState();
    }

    function startRace() {
        raceActive = true;
        raceStartTime = Date.now();
        raceSpins = 0;
        botSpins = [
            Math.floor(Math.random() * 5),
            Math.floor(Math.random() * 5),
            Math.floor(Math.random() * 5)
        ];
        saveState();

        containerEl.style.display = 'block';
        renderRace();

        countdownInterval = setInterval(function() {
            var rem = getTimeRemaining();
            if (rem <= 0) {
                showResults();
            } else {
                renderRace();
            }
        }, 1000);
    }

    function onSpin() {
        totalSpins++;

        if (raceActive) {
            raceSpins++;
            for (var i = 0; i < 3; i++) {
                botSpins[i] += Math.floor(Math.random() * 3);
            }
            saveState();
            renderRace();

            if (getTimeRemaining() <= 0) {
                showResults();
            }
            return;
        }

        if (totalSpins >= SPIN_TRIGGER) {
            totalSpins = 0;
            startRace();
        }
        saveState();
    }

    function dismiss() {
        if (containerEl) {
            containerEl.style.display = 'none';
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        raceActive = false;
        raceSpins = 0;
        saveState();
    }

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        loadState();
        buildContainer();

        if (raceActive && getTimeRemaining() > 0) {
            containerEl.style.display = 'block';
            renderRace();
            countdownInterval = setInterval(function() {
                var rem = getTimeRemaining();
                if (rem <= 0) {
                    showResults();
                } else {
                    renderRace();
                }
            }, 1000);
        }

        document.addEventListener('spinComplete', onSpin);
    }

    window.dismissSlotRaceTimer = dismiss;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
