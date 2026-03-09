/**
 * ui-jackpot-live.js
 * Live jackpot display seeder for Matrix Spins Casino lobby.
 * Seeds the jackpot-ticker-bar-v2 with realistic amounts that grow over time.
 * Falls back gracefully if server jackpot data is unavailable.
 */
(function () {
    'use strict';

    // ── Seed values based on time-of-day for consistency ──────────────────────
    var _now      = Date.now();
    var _hourSeed = Math.floor(_now / 3600000);   // changes each hour
    var _minSeed  = Math.floor(_now / 60000);     // changes each minute

    // Deterministic pseudo-random in [min, max] based on a seed
    function _seededRand(seed, min, max) {
        var x = Math.sin(seed + 9301) * 49297;
        var r = x - Math.floor(x);
        return min + r * (max - min);
    }

    // Starting jackpot pool amounts (seeded so they're consistent per-hour)
    var _pools = {
        mini:  _seededRand(_hourSeed * 4 + 1,   85,    160),
        minor: _seededRand(_hourSeed * 4 + 2,   440,   920),
        major: _seededRand(_hourSeed * 4 + 3,  2600,  4800),
        grand: _seededRand(_hourSeed * 4 + 4, 14500, 23500)
    };

    // Add minute-level drift so values feel "live"
    _pools.mini  += _seededRand(_minSeed, 0, 8);
    _pools.minor += _seededRand(_minSeed + 7, 0, 40);
    _pools.major += _seededRand(_minSeed + 13, 0, 200);
    _pools.grand += _seededRand(_minSeed + 19, 0, 800);

    // ── Format helper ──────────────────────────────────────────────────────────
    function _fmt(n) {
        return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // ── Update the ticker bar DOM elements ────────────────────────────────────
    function _updateTickerBar() {
        var miniEl  = document.getElementById('jpMiniAmt');
        var minorEl = document.getElementById('jpMinorAmt');
        var majorEl = document.getElementById('jpMajorAmt');
        var grandEl = document.getElementById('jpGrandAmt');

        if (miniEl)  miniEl.textContent  = _fmt(_pools.mini);
        if (minorEl) minorEl.textContent = _fmt(_pools.minor);
        if (majorEl) majorEl.textContent = _fmt(_pools.major);
        if (grandEl) grandEl.textContent = _fmt(_pools.grand);
    }

    // ── Grow pools by small random increments ────────────────────────────────
    function _tick() {
        // Mini grows ~$0.01–$0.08 per tick (every 4s)
        _pools.mini  += 0.01 + Math.random() * 0.07;
        // Minor grows ~$0.05–$0.30
        _pools.minor += 0.05 + Math.random() * 0.25;
        // Major grows ~$0.20–$1.20
        _pools.major += 0.20 + Math.random() * 1.00;
        // Grand grows ~$0.50–$3.50
        _pools.grand += 0.50 + Math.random() * 3.00;

        // Cap so they never go unrealistically high in one session
        if (_pools.mini  > 250)   _pools.mini  = 85  + Math.random() * 30;
        if (_pools.minor > 1200)  _pools.minor = 440 + Math.random() * 100;
        if (_pools.major > 6000)  _pools.major = 2600 + Math.random() * 400;
        if (_pools.grand > 25000) _pools.grand = 20000 + Math.random() * 1000;

        _updateTickerBar();
        _flashGrand();
    }

    // ── Flash the grand amount briefly on each tick ───────────────────────────
    var _flashTimeout = null;
    function _flashGrand() {
        var grandEl = document.getElementById('jpGrandAmt');
        if (!grandEl) return;
        grandEl.style.transform = 'scale(1.04)';
        clearTimeout(_flashTimeout);
        _flashTimeout = setTimeout(function () {
            grandEl.style.transform = '';
        }, 300);
    }

    // ── Simulate an occasional jackpot "near win" notification ────────────────
    function _scheduleJackpotWinner() {
        // Every 3-8 minutes, flash a "recent jackpot winner" notice
        var delay = (180 + Math.random() * 300) * 1000;
        setTimeout(function () {
            _showJackpotWinnerToast();
            _scheduleJackpotWinner();
        }, delay);
    }

    var _WINNER_NAMES = [
        'LuckyAce', 'GoldenSpin', 'MegaWinner', 'StarPlayer', 'DiamondDiva',
        'RoyalFlush', 'JackpotKing', 'NightOwl', 'FortuneHunter', 'SpinMaster',
        'CryptoKing', 'VegasVibe', 'BlazeRunner', 'CosmicWin', 'PixelBet'
    ];
    var _WINNER_TIERS = ['MINI', 'MINOR', 'MAJOR'];
    var _WINNER_GAMES = [
        'Mega Moolah Safari', 'Golden Dragon', 'Fortune Frog', 'Viking Voyage',
        'Lucky Stars', 'Crystal Cave', 'Wild West Riches', 'Mystic Fortune'
    ];

    function _showJackpotWinnerToast() {
        var name  = _WINNER_NAMES[Math.floor(Math.random() * _WINNER_NAMES.length)];
        var tier  = _WINNER_TIERS[Math.floor(Math.random() * _WINNER_TIERS.length)];
        var game  = _WINNER_GAMES[Math.floor(Math.random() * _WINNER_GAMES.length)];
        var amt;
        if (tier === 'MINI')  amt = _fmt(60 + Math.random() * 40);
        if (tier === 'MINOR') amt = _fmt(350 + Math.random() * 200);
        if (tier === 'MAJOR') amt = _fmt(1800 + Math.random() * 1000);

        var toast = document.createElement('div');
        toast.style.cssText = [
            'position:fixed', 'bottom:90px', 'left:50%',
            'transform:translateX(-50%) translateY(20px)',
            'background:linear-gradient(135deg,#1a0a2e,#0d0d1a)',
            'border:1px solid rgba(251,191,36,0.5)',
            'border-radius:12px',
            'padding:12px 20px',
            'display:flex', 'align-items:center', 'gap:12px',
            'z-index:10400',
            'opacity:0',
            'transition:all 0.4s cubic-bezier(0.22,1,0.36,1)',
            'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
            'pointer-events:none',
            'white-space:nowrap'
        ].join(';');

        // Build toast content using safe DOM methods (no innerHTML)
        var iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '24px';
        iconSpan.textContent = '\uD83C\uDFC6';

        var textDiv = document.createElement('div');

        var titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size:13px;font-weight:800;color:#fbbf24';
        titleDiv.textContent = name + ' won the ' + tier + ' jackpot!';

        var subDiv = document.createElement('div');
        subDiv.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.6)';
        subDiv.textContent = amt + ' on ' + game;

        textDiv.appendChild(titleDiv);
        textDiv.appendChild(subDiv);
        toast.appendChild(iconSpan);
        toast.appendChild(textDiv);

        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            });
        });
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function () { toast.remove(); }, 400);
        }, 5000);
    }

    // ── Expose global getters ─────────────────────────────────────────────────
    window._jackpotLiveValues = _pools;
    window.getJackpotLiveValues = function () { return Object.assign({}, _pools); };

    // ── Try to merge with server data if available ───────────────────────────
    function _tryMergeServerData() {
        fetch('/api/jackpot/status')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data || !data.tiers) return;
                // Only use server value if it's higher than our seeded value
                data.tiers.forEach(function (t) {
                    if (!t || !t.tier || !t.currentAmount) return;
                    var key = t.tier.toLowerCase();
                    var serverAmt = parseFloat(t.currentAmount) || 0;
                    if (serverAmt > (_pools[key] || 0)) {
                        _pools[key] = serverAmt;
                    }
                });
                _updateTickerBar();
            })
            .catch(function () { /* server unavailable — use seeded values */ });
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        _updateTickerBar();                    // immediate seed
        setTimeout(_tryMergeServerData, 800);  // merge server data if available
        setInterval(_tick, 4000);              // grow every 4 seconds
        setTimeout(_scheduleJackpotWinner, 60000); // first winner toast after 1 min
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
