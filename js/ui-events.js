(function() {
    'use strict';

    var _barElement = null;
    var _eventTimers = {};
    var _tickInterval = null;

    // -- Auth token
    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    // -- Time formatter
    function _formatTime(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    // -- Countdown tick
    function _startTick() {
        if (_tickInterval) return;
        _tickInterval = setInterval(function() {
            var anyActive = false;
            Object.keys(_eventTimers).forEach(function(id) {
                var el = document.getElementById('evt-countdown-' + id);
                if (!el) return;
                var secs = Math.max(0, Math.floor((_eventTimers[id] - Date.now()) / 1000));
                el.textContent = 'Ends ' + _formatTime(secs);
                if (secs > 0) anyActive = true;
            });
            if (!anyActive) {
                clearInterval(_tickInterval);
                _tickInterval = null;
                setTimeout(fetchAndRender, 1000);
            }
        }, 1000);
    }

    // -- Inject styles once
    function injectStyles() {
        if (document.getElementById('eventsBarStyles')) return;
        var style = document.createElement('style');
        style.id = 'eventsBarStyles';
        style.textContent = [
            '#bonusEventsBar {',
            '    width: 100%; margin-bottom: 8px;',
            '    background: linear-gradient(135deg, #0a1a0a, #1a0a00);',
            '    border: 1px solid rgba(255,200,0,0.3);',
            '    border-radius: 10px;',
            '    overflow: hidden;',
            '    box-shadow: 0 0 16px rgba(255,200,0,0.1);',
            '    box-sizing: border-box;',
            '}',
            '.evt-row {',
            '    display: flex; align-items: center; gap: 12px;',
            '    padding: 10px 18px;',
            '    border-bottom: 1px solid rgba(255,255,255,0.05);',
            '}',
            '.evt-row:last-child { border-bottom: none; }',
            '.evt-icon { font-size: 1.3rem; flex-shrink: 0; }',
            '.evt-name { font-size: 13px; font-weight: 700; color: #fff; flex: 1; }',
            '.evt-mult {',
            '    font-size: 12px; font-weight: 800; padding: 2px 10px;',
            '    border-radius: 12px; background: rgba(255,200,0,0.2);',
            '    color: #ffd700; border: 1px solid rgba(255,200,0,0.3);',
            '    flex-shrink: 0;',
            '}',
            '.evt-game { font-size: 11px; color: rgba(255,255,255,0.5); flex-shrink: 0; }',
            '.evt-countdown { font-size: 12px; color: #f87171; font-family: monospace; flex-shrink: 0; }',
            '.evt-header-label {',
            '    font-size: 10px; letter-spacing: 2px; color: #ffd700;',
            '    text-transform: uppercase; padding: 6px 18px 0;',
            '    display: block;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // -- Build bar element
    function buildBar(events) {
        _eventTimers = {};

        var bar = document.getElementById('bonusEventsBar') || document.createElement('div');
        bar.id = 'bonusEventsBar';
        while (bar.firstChild) bar.removeChild(bar.firstChild);

        var label = document.createElement('span');
        label.className = 'evt-header-label';
        label.textContent = '⚡ ACTIVE BONUS EVENTS';
        bar.appendChild(label);

        var icons = {
            xp_boost: '⚡',
            gem_boost: '💎',
            win_boost: '🔥',
            free_spins: '🎰',
            cashback: '💵',
            double_down: '🎯'
        };

        events.forEach(function(evt) {
            var endMs = new Date(evt.endAt).getTime();
            if (isNaN(endMs)) endMs = Date.now() + evt.secondsRemaining * 1000;
            _eventTimers[evt.id] = endMs;

            var row = document.createElement('div');
            row.className = 'evt-row';

            var icon = document.createElement('span');
            icon.className = 'evt-icon';
            icon.textContent = icons[evt.eventType] || '✨';

            var name = document.createElement('span');
            name.className = 'evt-name';
            name.textContent = evt.name;

            var mult = document.createElement('span');
            mult.className = 'evt-mult';
            mult.textContent = evt.multiplier >= 2
                ? (evt.multiplier + '× BONUS')
                : ('+' + Math.round((evt.multiplier - 1) * 100) + '%');

            var cd = document.createElement('span');
            cd.className = 'evt-countdown';
            cd.id = 'evt-countdown-' + evt.id;
            var secs = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
            cd.textContent = 'Ends ' + _formatTime(secs);

            row.appendChild(icon);
            row.appendChild(name);

            if (evt.targetGames && evt.targetGames !== 'all') {
                var gameLabel = document.createElement('span');
                gameLabel.className = 'evt-game';
                var gameName = evt.targetGames;
                if (typeof GAMES !== 'undefined') {
                    var found = GAMES.find(function(g) { return g.id === evt.targetGames; });
                    if (found) gameName = found.name;
                }
                gameLabel.textContent = 'on ' + gameName;
                row.appendChild(gameLabel);
            }

            row.appendChild(mult);
            row.appendChild(cd);
            bar.appendChild(row);
        });

        _barElement = bar;
    }

    // -- Inject bar above gameGrid
    function injectBar() {
        if (!_barElement) return;
        var grid = document.getElementById('gameGrid');
        if (!grid || !grid.parentNode) return;
        var existing = document.getElementById('bonusEventsBar');
        if (existing && existing !== _barElement) existing.parentNode.removeChild(existing);
        if (!_barElement.parentNode) {
            grid.parentNode.insertBefore(_barElement, grid);
        }
    }

    // -- Remove bar
    function removeBar() {
        var bar = document.getElementById('bonusEventsBar');
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        _barElement = null;
    }

    // -- Fetch and render
    function fetchAndRender() {
        var token = _getToken();
        if (!token) return;
        fetch('/api/events/active', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
            .then(function(data) {
                var events = (data && data.events) || [];
                if (events.length > 0) {
                    buildBar(events);
                    injectBar();
                    _startTick();
                } else {
                    removeBar();
                }
            })
            .catch(function() { /* silent */ });
    }

    // -- Hook renderGames so bar re-injects after lobby re-renders
    function hookRenderGames() {
        if (typeof renderGames === 'function') {
            var _prevRG = renderGames;
            renderGames = function() {
                _prevRG.apply(this, arguments);
                setTimeout(injectBar, 200);
            };
        }
    }

    // -- Public API
    function refreshBonusEvents() {
        fetchAndRender();
    }

    // -- Init
    function init() {
        injectStyles();
        hookRenderGames();
        fetchAndRender();
        setInterval(fetchAndRender, 5 * 60 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 800);
    }

    window.refreshBonusEvents = refreshBonusEvents;

})();