// Sprint 82: Live Win Ticker — Simulated Player Wins
// Scrolling "other player" win notifications that create FOMO.
// Shows fake wins from "other players" at random intervals, making
// the casino feel busy and encouraging continued play.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var INTERVAL_MIN_MS    = 8000;   // 8s min between notifications
    var INTERVAL_MAX_MS    = 25000;  // 25s max
    var DISPLAY_DURATION   = 5000;   // visible for 5 seconds
    var INITIAL_DELAY_MS   = 12000;  // 12s before first notification
    var _stylesInjected    = false;
    var _timer             = null;
    var _toastEl           = null;

    // ── Fake player name pools ───────────────────────────────
    var FIRST_NAMES = [
        'Alex', 'Jordan', 'Sam', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Avery',
        'Jamie', 'Drew', 'Quinn', 'Blake', 'Skyler', 'Dakota', 'Reese', 'Parker',
        'Charlie', 'Hayden', 'Peyton', 'Sage', 'River', 'Phoenix', 'Eden', 'Kai',
        'Lucky', 'Ace', 'Max', 'Leo', 'Nova', 'Luna', 'Jade', 'Rex',
        'Milo', 'Zoe', 'Finn', 'Aria', 'Atlas', 'Ruby', 'Oscar', 'Ivy'
    ];

    var LAST_INITS = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
        'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'
    ];

    // Win tiers with weights, amount ranges, and templates
    var WIN_TIERS = [
        {
            tier: 'normal', weight: 0.55, minAmt: 2, maxAmt: 30,
            templates: [
                '{name} won ${amt} on {game}!',
                '{name} scored ${amt} playing {game}!',
                '{name} landed ${amt} on {game}!'
            ],
            emoji: '\uD83D\uDCB0',
            color: '#22c55e', bg: 'rgba(34,197,94,.10)', border: 'rgba(34,197,94,.30)'
        },
        {
            tier: 'big', weight: 0.28, minAmt: 30, maxAmt: 250,
            templates: [
                '{name} hit a BIG WIN of ${amt} on {game}!',
                '{name} crushed it \u2014 ${amt} on {game}!'
            ],
            emoji: '\uD83D\uDD25',
            color: '#3b82f6', bg: 'rgba(59,130,246,.10)', border: 'rgba(59,130,246,.30)'
        },
        {
            tier: 'mega', weight: 0.13, minAmt: 250, maxAmt: 1500,
            templates: [
                'MEGA WIN! {name} won ${amt} on {game}!',
                '{name} just hit ${amt} on {game}!'
            ],
            emoji: '\uD83C\uDF89',
            color: '#a855f7', bg: 'rgba(168,85,247,.10)', border: 'rgba(168,85,247,.30)'
        },
        {
            tier: 'jackpot', weight: 0.04, minAmt: 1500, maxAmt: 8000,
            templates: [
                'JACKPOT! {name} won ${amt} on {game}!'
            ],
            emoji: '\uD83D\uDC8E',
            color: '#f59e0b', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.45)'
        }
    ];

    // ── Utility ──────────────────────────────────────────────
    function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function pickWeighted() {
        var r = Math.random();
        var cum = 0;
        for (var i = 0; i < WIN_TIERS.length; i++) {
            cum += WIN_TIERS[i].weight;
            if (r < cum) return WIN_TIERS[i];
        }
        return WIN_TIERS[0];
    }

    function generateName() {
        return randomFrom(FIRST_NAMES) + ' ' + randomFrom(LAST_INITS) + '.';
    }

    function generateGameName() {
        if (typeof GAMES !== 'undefined' && GAMES && GAMES.length > 0) {
            return randomFrom(GAMES).name;
        }
        return 'Slot Machine';
    }

    function generateAmount(tier) {
        var amt = tier.minAmt + Math.random() * (tier.maxAmt - tier.minAmt);
        return amt.toFixed(2);
    }

    // ── Styles ───────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'winTickerStyles';
        s.textContent = [
            '#wtToast{position:fixed;top:48px;left:50%;transform:translateX(-50%) translateY(-120%);' +
                'z-index:18500;border-radius:10px;padding:8px 18px;' +
                'max-width:440px;width:92%;display:flex;align-items:center;gap:8px;' +
                'font-family:inherit;box-shadow:0 4px 16px rgba(0,0,0,.35);' +
                'transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;opacity:0}',
            '#wtToast.active{transform:translateX(-50%) translateY(0);opacity:1}',
            '.wt-emoji{font-size:18px;flex-shrink:0}',
            '.wt-text{font-size:12px;font-weight:700;letter-spacing:.2px;line-height:1.4}',
            '@keyframes wt-jackpot-shine{0%{background-position:-200% center}100%{background-position:200% center}}',
            '#wtToast.wt-jackpot{animation:wt-jackpot-shine 2s linear infinite;' +
                'background-size:200% auto}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Toast ────────────────────────────────────────────────
    function showNotification() {
        // Don't show if slot modal is open (avoid clutter during gameplay)
        var slotModal = document.getElementById('slotModal');
        if (slotModal && slotModal.classList.contains('active')) {
            scheduleNext();
            return;
        }

        injectStyles();
        var tier = pickWeighted();
        var name = generateName();
        var game = generateGameName();
        var amt = generateAmount(tier);
        var template = randomFrom(tier.templates);
        var msg = template.replace('{name}', name).replace('{amt}', amt).replace('{game}', game);

        // Remove old toast
        var old = document.getElementById('wtToast');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        _toastEl = document.createElement('div');
        _toastEl.id = 'wtToast';
        _toastEl.style.background = tier.bg;
        _toastEl.style.border = '1px solid ' + tier.border;
        _toastEl.style.color = tier.color;
        if (tier.tier === 'jackpot') {
            _toastEl.classList.add('wt-jackpot');
            _toastEl.style.backgroundImage = 'linear-gradient(90deg,' +
                tier.bg + ' 0%,rgba(245,158,11,.25) 50%,' + tier.bg + ' 100%)';
        }

        var emojiEl = document.createElement('span');
        emojiEl.className = 'wt-emoji';
        emojiEl.textContent = tier.emoji;

        var textEl = document.createElement('span');
        textEl.className = 'wt-text';
        textEl.textContent = msg;

        _toastEl.appendChild(emojiEl);
        _toastEl.appendChild(textEl);
        document.body.appendChild(_toastEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_toastEl) _toastEl.classList.add('active');
            });
        });

        // For big/mega/jackpot wins, also show the dismissible corner toast
        if (tier.tier === 'big' || tier.tier === 'mega' || tier.tier === 'jackpot') {
            if (typeof window.showBigWinCornerToast === 'function') {
                setTimeout(function() {
                    window.showBigWinCornerToast(name, amt, game);
                }, 600);
            }
        }

        // Auto-hide
        setTimeout(function() {
            if (_toastEl) {
                _toastEl.classList.remove('active');
                var el = _toastEl;
                setTimeout(function() {
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                }, 500);
                _toastEl = null;
            }
        }, DISPLAY_DURATION);

        scheduleNext();
    }

    function scheduleNext() {
        if (_timer) clearTimeout(_timer);
        var delay = INTERVAL_MIN_MS + Math.floor(Math.random() * (INTERVAL_MAX_MS - INTERVAL_MIN_MS));
        _timer = setTimeout(showNotification, delay);
    }

    // ── Init ─────────────────────────────────────────────────
    function init() {
        // QA suppression
        if (window.location.search.indexOf('noBonus=1') !== -1) return;
        if (window.location.search.indexOf('qaTools=1') !== -1) return;

        // Start after initial delay
        _timer = setTimeout(showNotification, INITIAL_DELAY_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
