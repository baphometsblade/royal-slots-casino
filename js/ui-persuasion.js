/**
 * ui-persuasion.js
 * Social proof & conversion urgency elements for Matrix Spins Casino.
 * Adds "X players online", "Last won X min ago" badges, limited-time urgency.
 * All seeded deterministically so values feel real and consistent.
 */
(function () {
    'use strict';

    var _now       = Date.now();
    var _hourSeed  = Math.floor(_now / 3600000);
    var _minSeed   = Math.floor(_now / 60000);
    var _hour      = new Date().getHours();

    // Deterministic pseudo-random
    function _rng(seed, min, max) {
        var x = Math.sin(seed * 9301 + 49297) * 49297;
        var r = x - Math.floor(x);
        return Math.floor(min + r * (max - min + 1));
    }

    // ── Live player count (changes per minute) ────────────────────────────────
    // Peak hours 7pm-2am: 800-2400 players; off-peak: 200-600
    var _isPeak = (_hour >= 19 || _hour <= 2);
    var _basePlayers = _isPeak
        ? _rng(_minSeed, 840, 2380)
        : _rng(_minSeed, 180, 640);

    function _getPlayerCount() {
        // ±5% random drift per minute
        return _basePlayers + _rng(_minSeed * 3, -40, 40);
    }

    // ── Update the live-stats bar (if it exists) ──────────────────────────────
    function _updateLiveStatsBar() {
        var bar = document.querySelector('.live-stats-bar, #liveStatsBar');
        if (!bar) return;

        var playersEl = bar.querySelector('[data-stat="players"], .lsb-players');
        var spinsEl   = bar.querySelector('[data-stat="spins"],   .lsb-spins');

        if (playersEl) {
            playersEl.textContent = _getPlayerCount().toLocaleString() + ' playing now';
        }
        if (spinsEl) {
            var spinsToday = _rng(_hourSeed + 5, 3200, 9800);
            spinsEl.textContent = spinsToday.toLocaleString() + ' spins today';
        }
    }

    // ── Inject CSS for new persuasion elements ────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('_persuasionStyles')) return;
        var s = document.createElement('style');
        s.id = '_persuasionStyles';
        s.textContent = [
            '/* ── Game card: "N playing" badge ── */',
            '.game-card-players-badge {',
            '    position: absolute;',
            '    bottom: 6px;',
            '    right: 6px;',
            '    background: rgba(0,0,0,0.72);',
            '    border: 1px solid rgba(74,222,128,0.3);',
            '    border-radius: 10px;',
            '    padding: 2px 6px;',
            '    font-size: 9px;',
            '    font-weight: 700;',
            '    color: #4ade80;',
            '    backdrop-filter: blur(4px);',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 3px;',
            '    z-index:10400;',
            '    pointer-events: none;',
            '}',
            '.game-card-players-badge::before {',
            "    content: '';",
            '    width: 5px;',
            '    height: 5px;',
            '    border-radius: 50%;',
            '    background: #4ade80;',
            '    box-shadow: 0 0 4px #4ade80;',
            '    flex-shrink: 0;',
            '}',
            '/* ── Urgency Banner ── */',
            '.urgency-banner {',
            '    background: linear-gradient(90deg, rgba(239,68,68,0.15), rgba(251,191,36,0.08), rgba(239,68,68,0.15));',
            '    border: 1px solid rgba(239,68,68,0.25);',
            '    border-radius: 10px;',
            '    padding: 10px 16px;',
            '    margin-bottom: 14px;',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    gap: 10px;',
            '    font-size: 13px;',
            '    font-weight: 700;',
            '    color: rgba(255,255,255,0.9);',
            '    animation: urgencyPulse 3s ease-in-out infinite;',
            '}',
            '@keyframes urgencyPulse {',
            '    0%,100%{ border-color: rgba(239,68,68,0.25); }',
            '    50%    { border-color: rgba(239,68,68,0.5); }',
            '}',
            '.urgency-banner .ub-timer {',
            '    color: #fbbf24;',
            "    font-family: 'JetBrains Mono', monospace;",
            '    font-size: 15px;',
            '}',
            '.urgency-banner .ub-icon { font-size: 18px; }',
            '/* ── Lucky Hour badge on lobby ── */',
            '.lucky-hour-active-badge {',
            '    background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,146,60,0.15));',
            '    border: 1px solid rgba(251,191,36,0.4);',
            '    border-radius: 20px;',
            '    padding: 6px 14px;',
            '    font-size: 12px;',
            '    font-weight: 800;',
            '    color: #fbbf24;',
            '    display: inline-flex;',
            '    align-items: center;',
            '    gap: 6px;',
            '    animation: lhBadgePulse 2s ease-in-out infinite;',
            '}',
            '@keyframes lhBadgePulse {',
            '    0%,100%{ box-shadow: 0 0 0 0 rgba(251,191,36,0.3); }',
            '    50%    { box-shadow: 0 0 0 6px rgba(251,191,36,0); }',
            '}',
            '/* ── Social Win Notification (bottom-right corner) ── */',
            '.social-win-notif {',
            '    position: fixed;',
            '    bottom: 80px;',
            '    right: 20px;',
            '    background: linear-gradient(135deg, rgba(10,15,30,0.97), rgba(15,23,42,0.97));',
            '    border: 1px solid rgba(251,191,36,0.3);',
            '    border-radius: 12px;',
            '    padding: 12px 16px;',
            '    min-width: 240px;',
            '    max-width: 300px;',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 12px;',
            '    z-index:10400;',
            '    box-shadow: 0 8px 32px rgba(0,0,0,0.5);',
            '    transform: translateX(120%);',
            '    transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);',
            '    pointer-events: none;',
            '}',
            '.social-win-notif.swn-show { transform: translateX(0); }',
            '.social-win-notif-icon { font-size: 28px; flex-shrink: 0; }',
            '.social-win-notif-body { flex: 1; min-width: 0; }',
            '.social-win-notif-title {',
            '    font-size: 12px;',
            '    font-weight: 800;',
            '    color: #fbbf24;',
            '    margin-bottom: 2px;',
            '    white-space: nowrap;',
            '    overflow: hidden;',
            '    text-overflow: ellipsis;',
            '}',
            '.social-win-notif-sub {',
            '    font-size: 11px;',
            '    color: rgba(255,255,255,0.55);',
            '}',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Add "N playing" badges to game cards ─────────────────────────────────
    var _GAME_PLAYER_SEED = _rng(_hourSeed, 1, 99);
    function _addPlayerBadgesToCards() {
        var cards = document.querySelectorAll('.game-card');
        cards.forEach(function (card, i) {
            if (card.querySelector('.game-card-players-badge')) return;
            var thumbnail = card.querySelector('.game-thumbnail');
            if (!thumbnail) return;
            var count = _rng(_GAME_PLAYER_SEED + i * 7, 2, 48);
            var badge = document.createElement('div');
            badge.className = 'game-card-players-badge';
            badge.textContent = count + ' playing';
            thumbnail.appendChild(badge);
        });
    }

    // ── Urgency countdown banner (shows near filter tabs) ────────────────────
    var _urgencyBanner = null;
    function _createUrgencyBanner() {
        // Only show during peak hours or randomly 30% of the time
        if (!_isPeak && Math.random() > 0.30) return;
        var filterArea = document.querySelector('.filter-tabs, #filterTabs');
        if (!filterArea || document.querySelector('.urgency-banner')) return;

        // Countdown: random 8-45 minutes remaining on an "offer"
        var minsLeft = _rng(_minSeed + 99, 8, 45);
        _urgencyBanner = document.createElement('div');
        _urgencyBanner.className = 'urgency-banner';

        var iconSpan = document.createElement('span');
        iconSpan.className = 'ub-icon';
        iconSpan.textContent = '\u26a1';

        var textSpan = document.createElement('span');
        var textNode = document.createTextNode('Limited offer: ');
        var strong = document.createElement('strong');
        strong.textContent = '2x XP on all spins';
        var afterText = document.createTextNode(' \u2014 ends in ');
        textSpan.appendChild(textNode);
        textSpan.appendChild(strong);
        textSpan.appendChild(afterText);

        var timerSpan = document.createElement('span');
        timerSpan.className = 'ub-timer';
        timerSpan.id = 'urgencyTimer';
        timerSpan.textContent = minsLeft + ':00';

        _urgencyBanner.appendChild(iconSpan);
        _urgencyBanner.appendChild(textSpan);
        _urgencyBanner.appendChild(timerSpan);

        filterArea.parentNode.insertBefore(_urgencyBanner, filterArea);
        _startUrgencyCountdown(minsLeft * 60);
    }

    function _startUrgencyCountdown(secs) {
        var timerEl = document.getElementById('urgencyTimer');
        if (!timerEl) return;
        var remaining = secs;
        var iv = setInterval(function () {
            remaining--;
            if (remaining <= 0) {
                clearInterval(iv);
                if (_urgencyBanner) { _urgencyBanner.remove(); _urgencyBanner = null; }
                return;
            }
            var m = Math.floor(remaining / 60);
            var s = remaining % 60;
            timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        }, 1000);
    }

    // ── Social win notifications (bottom-right slide-in) ─────────────────────
    var _WIN_PLAYERS = [
        'LuckyAce47','VegasVibe','SpinMaster','GoldenDragon','MegaWinner',
        'StarPlayer','DiamondDiva','RoyalFlush','NightOwl','CryptoKing',
        'BlazeRunner','PixelBet','FortuneHunter','CosmicWin','SilverSpin'
    ];
    var _WIN_GAMES = [
        'Book of Ra','Golden Dragon','Lucky Stars','Fortune Frog',
        'Viking Voyage','Wild West Riches','Crystal Cave','Mega Moolah Safari',
        'Mystic Fortune','Wolf Run','Thunder Storm','Diamond Strike'
    ];
    var _notifEl = null;
    var _notifTimer = null;

    function _showSocialWin() {
        if (!_notifEl) {
            _notifEl = document.createElement('div');
            _notifEl.className = 'social-win-notif';

            var iconDiv = document.createElement('div');
            iconDiv.className = 'social-win-notif-icon';
            iconDiv.textContent = '\uD83C\uDFB0';

            var bodyDiv = document.createElement('div');
            bodyDiv.className = 'social-win-notif-body';

            var titleDiv = document.createElement('div');
            titleDiv.className = 'social-win-notif-title';
            titleDiv.id = 'swnTitle';

            var subDiv = document.createElement('div');
            subDiv.className = 'social-win-notif-sub';
            subDiv.id = 'swnSub';

            bodyDiv.appendChild(titleDiv);
            bodyDiv.appendChild(subDiv);
            _notifEl.appendChild(iconDiv);
            _notifEl.appendChild(bodyDiv);
            document.body.appendChild(_notifEl);
        }
        var player = _WIN_PLAYERS[Math.floor(Math.random() * _WIN_PLAYERS.length)];
        var game   = _WIN_GAMES[Math.floor(Math.random() * _WIN_GAMES.length)];
        var mult   = (2 + Math.random() * 48).toFixed(1);
        var bet    = [0.20, 0.50, 1.00, 2.00, 5.00][Math.floor(Math.random() * 5)];
        var winAmt = (bet * parseFloat(mult)).toFixed(2);

        var titleEl = document.getElementById('swnTitle');
        var subEl   = document.getElementById('swnSub');
        if (titleEl) titleEl.textContent = player + ' just won $' + winAmt + '!';
        if (subEl)   subEl.textContent   = mult + 'x on ' + game;

        _notifEl.classList.add('swn-show');
        clearTimeout(_notifTimer);
        _notifTimer = setTimeout(function () {
            _notifEl.classList.remove('swn-show');
        }, 4500);
    }

    function _scheduleSocialWins() {
        // Show a win notification every 18-40 seconds
        var delay = (18 + Math.random() * 22) * 1000;
        setTimeout(function () {
            _showSocialWin();
            _scheduleSocialWins();
        }, delay);
    }

    // ── Observe card grid for new cards added ────────────────────────────────
    function _observeGrid() {
        var grid = document.querySelector('.game-grid, #gameGrid');
        if (!grid) {
            setTimeout(_observeGrid, 500);
            return;
        }
        // Initial pass
        _addPlayerBadgesToCards();
        // Watch for new cards
        var obs = new MutationObserver(function () {
            setTimeout(_addPlayerBadgesToCards, 100);
        });
        obs.observe(grid, { childList: true });
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        _injectStyles();
        _observeGrid();
        _updateLiveStatsBar();
        setInterval(_updateLiveStatsBar, 30000);

        // Stagger init of conversion elements
        setTimeout(_createUrgencyBanner, 2000);
        setTimeout(_scheduleSocialWins, 8000);  // first win after 8s
    }

    // Expose for external use
    window.getOnlinePlayerCount = _getPlayerCount;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
