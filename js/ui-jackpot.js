// Progressive Jackpot Tracker Modal
// js/ui-jackpot.js
// Public API: window.openJackpotTracker(), window.closeJackpotTracker()

(function() {
    'use strict';

    var _modal        = null;
    var _overlay      = null;
    var _refreshTimer = null;

    var TIERS = [
        {
            id: 'grand', label: 'GRAND', emoji: '🏆',
            fontSize: '2.5rem',
            background: 'linear-gradient(135deg,rgba(251,191,36,0.20),rgba(217,119,6,0.10))',
            border: '1px solid rgba(251,191,36,0.50)',
            amountColor: '#fbbf24', labelColor: '#fde68a'
        },
        {
            id: 'major', label: 'MAJOR', emoji: '💜',
            fontSize: '2rem',
            background: 'linear-gradient(135deg,rgba(139,92,246,0.20),rgba(109,40,217,0.10))',
            border: '1px solid rgba(139,92,246,0.50)',
            amountColor: '#c4b5fd', labelColor: '#ddd6fe'
        },
        {
            id: 'minor', label: 'MINOR', emoji: '💙',
            fontSize: '1.75rem',
            background: 'linear-gradient(135deg,rgba(59,130,246,0.20),rgba(37,99,235,0.10))',
            border: '1px solid rgba(59,130,246,0.50)',
            amountColor: '#93c5fd', labelColor: '#bfdbfe'
        },
        {
            id: 'mini', label: 'MINI', emoji: '💚',
            fontSize: '1.5rem',
            background: 'linear-gradient(135deg,rgba(34,197,94,0.20),rgba(21,128,61,0.10))',
            border: '1px solid rgba(34,197,94,0.40)',
            amountColor: '#86efac', labelColor: '#bbf7d0'
        }
    ];
    // Helpers
    function _fmt(amount) {
        var n = parseFloat(amount) || 0;
        return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function _timeAgo(dateStr) {
        if (!dateStr) return 'never';
        var then = new Date(dateStr).getTime();
        if (isNaN(then)) return 'unknown';
        var diff = Math.floor((Date.now() - then) / 1000);
        if (diff < 60)    return diff + 's ago';
        if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    // Fetch jackpot data and update DOM
    function _fetchAndRender() {
        fetch('/api/jackpot/status')
            .then(function(r) { return r.ok ? r.json() : { pools: [] }; })
            .then(function(data) {
                var list = (data && Array.isArray(data.pools)) ? data.pools : [];
                var byTier = {};
                list.forEach(function(j) {
                    if (j && j.tier) byTier[j.tier.toLowerCase()] = j;
                });
                TIERS.forEach(function(tier) {
                    var amountEl = document.getElementById('jt-amount-' + tier.id);
                    var metaEl   = document.getElementById('jt-meta-'   + tier.id);
                    if (!amountEl || !metaEl) return;
                    var info = byTier[tier.id];
                    if (info) {
                        amountEl.textContent = _fmt(info.currentAmount);
                        var winner = info.lastWinner ? ' by ' + info.lastWinner.username : '';
                        metaEl.textContent = 'Last won: ' + _timeAgo(info.lastWinner ? info.lastWinner.wonAt : null) + winner;
                    } else {
                        amountEl.textContent = '—';
                        metaEl.textContent = 'No winners yet';
                    }
                });
            })
            .catch(function() {
                TIERS.forEach(function(tier) {
                    var amountEl = document.getElementById('jt-amount-' + tier.id);
                    if (amountEl && amountEl.textContent === 'Loading…') {
                        amountEl.textContent = '—';
                    }
                });
            });
    }
    // Build modal DOM
    function _buildModal() {
        _overlay = document.createElement('div');
        _overlay.id = 'jackpotTrackerOverlay';
        _overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:10000',
            'background:rgba(0,0,0,0.75)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:16px',
            'box-sizing:border-box'
        ].join(';');
        _overlay.addEventListener('click', function(e) {
            if (e.target === _overlay) closeJackpotTracker();
        });

        _modal = document.createElement('div');
        _modal.id = 'jackpotTrackerModal';
        _modal.style.cssText = [
            'background:linear-gradient(160deg,#0f0a1e,#1a0a2e)',
            'border:1px solid rgba(251,191,36,0.30)',
            'border-radius:12px',
            'width:100%',
            'max-width:480px',
            'max-height:90vh',
            'overflow-y:auto',
            'box-shadow:0 0 40px rgba(251,191,36,0.15),0 20px 60px rgba(0,0,0,0.6)',
            'font-family:inherit',
            'color:#e2e8f0',
            'position:relative'
        ].join(';');
        // Header
        var header = document.createElement('div');
        header.style.cssText = [
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'padding:18px 20px 14px',
            'border-bottom:1px solid rgba(251,191,36,0.20)'
        ].join(';');
        var title = document.createElement('div');
        title.style.cssText = 'display:flex;align-items:center;gap:8px;';
        var titleIcon = document.createElement('span');
        titleIcon.textContent = '💰';
        titleIcon.style.fontSize = '22px';
        var titleText = document.createElement('span');
        titleText.textContent = 'PROGRESSIVE JACKPOTS';
        titleText.style.cssText = 'font-size:16px;font-weight:800;letter-spacing:1.5px;color:#fbbf24;';
        title.appendChild(titleIcon);
        title.appendChild(titleText);
        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = [
            'background:rgba(255,255,255,0.08)',
            'border:1px solid rgba(255,255,255,0.15)',
            'border-radius:6px',
            'color:#94a3b8',
            'cursor:pointer',
            'font-size:14px',
            'width:28px',
            'height:28px',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'transition:background 0.15s,color 0.15s',
            'flex-shrink:0'
        ].join(';');
        closeBtn.addEventListener('mouseover', function() {
            closeBtn.style.background = 'rgba(255,255,255,0.15)';
            closeBtn.style.color = '#e2e8f0';
        });
        closeBtn.addEventListener('mouseout', function() {
            closeBtn.style.background = 'rgba(255,255,255,0.08)';
            closeBtn.style.color = '#94a3b8';
        });
        closeBtn.addEventListener('click', closeJackpotTracker);
        header.appendChild(title);
        header.appendChild(closeBtn);
        _modal.appendChild(header);
        // Jackpot tier cards
        var cardsWrap = document.createElement('div');
        cardsWrap.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:10px;';
        TIERS.forEach(function(tier) {
            var card = document.createElement('div');
            card.style.cssText = [
                'background:' + tier.background,
                'border:' + tier.border,
                'border-radius:8px',
                'padding:14px 16px',
                'display:flex',
                'align-items:center',
                'justify-content:space-between',
                'gap:12px'
            ].join(';');
            var left = document.createElement('div');
            left.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:80px;';
            var emoji = document.createElement('span');
            emoji.textContent = tier.emoji;
            emoji.style.fontSize = '20px';
            var tierLabel = document.createElement('span');
            tierLabel.textContent = tier.label;
            tierLabel.style.cssText = [
                'font-size:12px',
                'font-weight:800',
                'letter-spacing:1.5px',
                'color:' + tier.labelColor
            ].join(';');
            left.appendChild(emoji);
            left.appendChild(tierLabel);
            var center = document.createElement('div');
            center.style.cssText = 'flex:1;text-align:center;';
            var amountEl = document.createElement('div');
            amountEl.id = 'jt-amount-' + tier.id;
            amountEl.textContent = 'Loading…';
            amountEl.style.cssText = [
                'font-size:' + tier.fontSize,
                'font-weight:800',
                'font-family:monospace,monospace',
                'color:' + tier.amountColor,
                'line-height:1.1',
                'letter-spacing:1px'
            ].join(';');
            var metaEl = document.createElement('div');
            metaEl.id = 'jt-meta-' + tier.id;
            metaEl.textContent = '';
            metaEl.style.cssText = 'font-size:11px;color:#64748b;margin-top:3px;';
            center.appendChild(amountEl);
            center.appendChild(metaEl);
            card.appendChild(left);
            card.appendChild(center);
            cardsWrap.appendChild(card);
        });
        _modal.appendChild(cardsWrap);
        // Spin to Win button
        var spinBtnWrap = document.createElement('div');
        spinBtnWrap.style.cssText = 'padding:4px 20px 16px;';
        var spinBtn = document.createElement('button');
        spinBtn.textContent = '🎰  SPIN TO WIN';
        spinBtn.style.cssText = [
            'width:100%',
            'padding:13px',
            'background:linear-gradient(135deg,#f59e0b,#d97706)',
            'border:none',
            'border-radius:8px',
            'color:#1a0a00',
            'font-size:15px',
            'font-weight:800',
            'letter-spacing:1px',
            'cursor:pointer',
            'transition:opacity 0.15s,transform 0.1s',
            'box-shadow:0 4px 20px rgba(245,158,11,0.40)'
        ].join(';');
        spinBtn.addEventListener('mouseover', function() { spinBtn.style.opacity = '0.88'; });
        spinBtn.addEventListener('mouseout',  function() { spinBtn.style.opacity = '1'; });
        spinBtn.addEventListener('mousedown', function() { spinBtn.style.transform = 'scale(0.98)'; });
        spinBtn.addEventListener('mouseup',   function() { spinBtn.style.transform = 'scale(1)'; });
        spinBtn.addEventListener('click', function() {
            closeJackpotTracker();
            var lobby = document.getElementById('allGames') || document.getElementById('gameGrid');
            if (lobby) lobby.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        spinBtnWrap.appendChild(spinBtn);
        _modal.appendChild(spinBtnWrap);
        // How it works expandable section
        var howWrap = document.createElement('div');
        howWrap.style.cssText = 'padding:0 20px 20px;';
        var howToggle = document.createElement('button');
        howToggle.style.cssText = [
            'width:100%',
            'background:rgba(255,255,255,0.04)',
            'border:1px solid rgba(255,255,255,0.10)',
            'border-radius:6px',
            'color:#94a3b8',
            'font-size:12px',
            'font-weight:600',
            'letter-spacing:0.5px',
            'padding:8px 12px',
            'cursor:pointer',
            'text-align:left',
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'transition:background 0.15s'
        ].join(';');
        var howLabel = document.createElement('span');
        howLabel.textContent = 'ℹ️  How it works';
        var howArrow = document.createElement('span');
        howArrow.textContent = '▸';
        howArrow.style.cssText = 'transition:transform 0.2s;display:inline-block;';
        howToggle.appendChild(howLabel);
        howToggle.appendChild(howArrow);
        var howBody = document.createElement('div');
        howBody.style.cssText = [
            'display:none',
            'padding:10px 12px',
            'font-size:12px',
            'line-height:1.6',
            'color:#94a3b8',
            'background:rgba(255,255,255,0.03)',
            'border:1px solid rgba(255,255,255,0.07)',
            'border-top:none',
            'border-radius:0 0 6px 6px'
        ].join(';');
        howBody.innerHTML = [
            '<strong style="color:#e2e8f0;">Every spin contributes to the jackpot pool.</strong><br><br>',
            '• A small percentage of each bet is added to all four jackpot tiers simultaneously.<br>',
            '• <strong style="color:#fbbf24;">Higher bets</strong> mean a larger jackpot contribution — and a bigger chance of triggering a jackpot win.<br>',
            '• Jackpots can be won on any eligible spin during normal gameplay — no special mode required.<br>',
            '• The <span style="color:#fbbf24;">GRAND</span> jackpot resets to a seed amount after each win and begins growing again immediately.'
        ].join('');
        var _howOpen = false;
        howToggle.addEventListener('click', function() {
            _howOpen = !_howOpen;
            howBody.style.display = _howOpen ? 'block' : 'none';
            howArrow.style.transform = _howOpen ? 'rotate(90deg)' : 'rotate(0deg)';
            howToggle.style.borderRadius = _howOpen ? '6px 6px 0 0' : '6px';
        });
        howWrap.appendChild(howToggle);
        howWrap.appendChild(howBody);
        _modal.appendChild(howWrap);
        _overlay.appendChild(_modal);
        document.body.appendChild(_overlay);
    }

    // Public: open / close
    function openJackpotTracker() {
        if (document.getElementById('jackpotTrackerOverlay')) return;
        _buildModal();
        _fetchAndRender();
        _refreshTimer = setInterval(_fetchAndRender, 10000);
        document.addEventListener('keydown', _onKeyDown);
    }

    function closeJackpotTracker() {
        if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
        document.removeEventListener('keydown', _onKeyDown);
        var el = document.getElementById('jackpotTrackerOverlay');
        if (el) el.parentNode.removeChild(el);
        _modal   = null;
        _overlay = null;
    }

    function _onKeyDown(e) {
        if (e.key === 'Escape') closeJackpotTracker();
    }

    window.openJackpotTracker  = openJackpotTracker;
    window.closeJackpotTracker = closeJackpotTracker;

}());

// Live jackpot ticker — polls /api/jackpot/status and updates visible amounts
(function() {
    'use strict';

    var TICKER_POLL_MS = 12000;
    var AMOUNT_IDS = { mini: 'jpMiniAmt', minor: 'jpMinorAmt', major: 'jpMajorAmt', grand: 'jpGrandAmt' };
    var _prevAmounts = {};
    var _lastWinnerTs = {};

    function fmtTicker(n) {
        var v = parseFloat(n) || 0;
        return '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function animateCount(el, from, to, duration) {
        var start = Date.now();
        var diff = to - from;
        function tick() {
            var elapsed = Date.now() - start;
            var t = Math.min(elapsed / duration, 1);
            var ease = 1 - Math.pow(1 - t, 3);
            el.textContent = fmtTicker(from + diff * ease);
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = fmtTicker(to);
        }
        requestAnimationFrame(tick);
    }

    function updateTicker(pools) {
        pools.forEach(function(p) {
            var elId = AMOUNT_IDS[p.tier];
            if (!elId) return;
            var el = document.getElementById(elId);
            if (!el) return;
            var newVal = parseFloat(p.currentAmount) || 0;
            var prevVal = _prevAmounts[p.tier];
            _prevAmounts[p.tier] = newVal;
            if (prevVal !== undefined && newVal > prevVal) {
                animateCount(el, prevVal, newVal, 900);
            } else {
                el.textContent = fmtTicker(newVal);
            }
        });
    }

    function showWinnerToast(pool) {
        var tier = (pool.tier || '').toUpperCase();
        var user = (pool.lastWinner && pool.lastWinner.username) ? pool.lastWinner.username : 'A player';
        var emojis = { MINI: '\uD83D\uDC9A', MINOR: '\uD83D\uDC99', MAJOR: '\uD83D\uDC9C', GRAND: '\uD83C\uDFC6' };
        var emoji = emojis[tier] || '\uD83C\uDFB0';
        if (!document.getElementById('jpToastKeyframes')) {
            var ks = document.createElement('style');
            ks.id = 'jpToastKeyframes';
            ks.textContent = '@keyframes jpSlideIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}';
            document.head.appendChild(ks);
        }
        var toast = document.createElement('div');
        toast.style.cssText = [
            'position:fixed', 'bottom:80px', 'right:20px', 'z-index:99999',
            'background:linear-gradient(135deg,#1a0a2e,#0f0a1e)',
            'border:2px solid #fbbf24', 'border-radius:12px',
            'padding:14px 18px', 'max-width:300px',
            'box-shadow:0 0 30px rgba(251,191,36,0.5)',
            'color:#e2e8f0', 'font-family:inherit',
            'animation:jpSlideIn 0.4s ease', 'cursor:pointer'
        ].join(';');

        var headerEl = document.createElement('div');
        headerEl.style.cssText = 'font-size:11px;color:#fbbf24;font-weight:800;letter-spacing:1.5px;margin-bottom:6px';
        headerEl.textContent = emoji + '\u00a0' + tier + ' JACKPOT WON!';

        var bodyEl = document.createElement('div');
        bodyEl.style.cssText = 'font-size:14px;font-weight:700';
        bodyEl.textContent = user + ' just struck lucky!';

        var subEl = document.createElement('div');
        subEl.style.cssText = 'font-size:12px;color:#94a3b8;margin-top:3px';
        subEl.textContent = 'Jackpot is growing again \u2014 spin now!';

        toast.appendChild(headerEl);
        toast.appendChild(bodyEl);
        toast.appendChild(subEl);

        toast.addEventListener('click', function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
            if (typeof openJackpotTracker === 'function') openJackpotTracker();
        });
        document.body.appendChild(toast);
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 8000);
    }

    function checkWinners(pools) {
        pools.forEach(function(p) {
            if (!p.lastWinner || !p.lastWinner.wonAt) return;
            var wonAt = new Date(p.lastWinner.wonAt).getTime();
            if (isNaN(wonAt)) return;
            var prev = _lastWinnerTs[p.tier];
            _lastWinnerTs[p.tier] = wonAt;
            if (prev && wonAt > prev && Date.now() - wonAt < 90000) {
                showWinnerToast(p);
            }
        });
    }

    function fetchAndUpdate() {
        fetch('/api/jackpot/status')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (!data || !Array.isArray(data.pools)) return;
                updateTicker(data.pools);
                checkWinners(data.pools);
            })
            .catch(function() {});
    }

    function init() {
        fetchAndUpdate();
        setInterval(fetchAndUpdate, TICKER_POLL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());

// Make jackpot ticker bar clickable to open tracker
(function() {
    var bar = document.getElementById('jackpotTickerBar');
    if (bar) {
        bar.style.cursor = 'pointer';
        bar.title = 'Click to view jackpot details';
        bar.addEventListener('click', function() {
            if (typeof openJackpotTracker === 'function') openJackpotTracker();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            var b = document.getElementById('jackpotTickerBar');
            if (b && !b._jackpotClick) {
                b._jackpotClick = true;
                b.style.cursor = 'pointer';
                b.addEventListener('click', function() {
                    if (typeof openJackpotTracker === 'function') openJackpotTracker();
                });
            }
        });
    }
}());
