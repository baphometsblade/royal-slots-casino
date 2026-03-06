// Sprint 89: VIP Tier Perks — Enhanced Win Multipliers
// Higher VIP tiers earn bonus multipliers on every win, encouraging
// more play to maintain/upgrade status. Shows a persistent tier badge
// with progress bar and tier tooltip on click.
(function() {
    'use strict';

    // ── QA Suppression ───────────────────────────────────────────
    function isQaSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── VIP Perk Tiers ──────────────────────────────────────────
    // These are the *perk* multipliers — separate from the existing
    // VIP_TIERS cashback/reload system in constants.js/ui-vip.js.
    var PERK_TIERS = [
        { id: 'bronze',   name: 'Bronze',   minWagered: 0,     mult: 1.0,  icon: '\uD83E\uDD49', color: '#CD7F32', colorDark: '#8B5523' },
        { id: 'silver',   name: 'Silver',   minWagered: 100,   mult: 1.10, icon: '\uD83E\uDD48', color: '#C0C0C0', colorDark: '#808080' },
        { id: 'gold',     name: 'Gold',     minWagered: 500,   mult: 1.25, icon: '\uD83C\uDFC6', color: '#FFD700', colorDark: '#B8860B' },
        { id: 'platinum', name: 'Platinum', minWagered: 2000,  mult: 1.50, icon: '\u2B50',       color: '#E5E4E2', colorDark: '#A9A9A9' },
        { id: 'diamond',  name: 'Diamond',  minWagered: 10000, mult: 2.0,  icon: '\uD83D\uDC8E', color: '#B9F2FF', colorDark: '#5BC0DE' }
    ];

    var STORAGE_KEY_WAGERED = 'vipTotalWagered';

    // ── State ────────────────────────────────────────────────────
    var _totalWagered   = 0;
    var _currentTier    = PERK_TIERS[0];
    var _stylesInjected = false;
    var _badgeEl        = null;
    var _tooltipEl      = null;
    var _tooltipVisible = false;

    // ── Helpers ──────────────────────────────────────────────────
    function loadWagered() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_WAGERED);
            if (raw) {
                var v = parseFloat(raw);
                if (Number.isFinite(v) && v > 0) _totalWagered = v;
            }
        } catch (e) { /* ignore */ }

        // Also try to pull from global stats if available (server-backed)
        if (typeof stats !== 'undefined' && stats && typeof stats.totalWagered === 'number') {
            if (stats.totalWagered > _totalWagered) _totalWagered = stats.totalWagered;
        }
    }

    function saveWagered() {
        try {
            localStorage.setItem(STORAGE_KEY_WAGERED, String(_totalWagered));
        } catch (e) { /* ignore */ }
    }

    function resolveTier(wagered) {
        var tier = PERK_TIERS[0];
        for (var i = PERK_TIERS.length - 1; i >= 0; i--) {
            if (wagered >= PERK_TIERS[i].minWagered) {
                tier = PERK_TIERS[i];
                break;
            }
        }
        return tier;
    }

    function getNextTier(tier) {
        for (var i = 0; i < PERK_TIERS.length; i++) {
            if (PERK_TIERS[i].id === tier.id && i < PERK_TIERS.length - 1) {
                return PERK_TIERS[i + 1];
            }
        }
        return null; // already max tier
    }

    function getProgress(tier, wagered) {
        var next = getNextTier(tier);
        if (!next) return 1; // max tier = full bar
        var base = tier.minWagered;
        var top  = next.minWagered;
        if (top <= base) return 1;
        return Math.min(1, Math.max(0, (wagered - base) / (top - base)));
    }

    function fmtMoney(n) {
        if (typeof formatMoney === 'function') return formatMoney(n);
        return '$' + n.toFixed(2);
    }

    function multLabel(m) {
        if (m <= 1) return 'No bonus';
        return '+' + Math.round((m - 1) * 100) + '% on wins';
    }

    // ── Styles ───────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'vipPerksStyles';
        s.textContent = [
            '#vpBadge{position:fixed;top:12px;right:12px;z-index:18000;' +
                'display:flex;align-items:center;gap:6px;' +
                'padding:6px 14px 6px 10px;border-radius:20px;' +
                'cursor:pointer;user-select:none;font-family:inherit;' +
                'box-shadow:0 2px 12px rgba(0,0,0,.4);' +
                'transition:transform .2s,box-shadow .2s}',
            '#vpBadge:hover{transform:scale(1.06);box-shadow:0 4px 18px rgba(0,0,0,.5)}',
            '.vp-icon{font-size:18px}',
            '.vp-name{font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#fff}',
            '.vp-bar-wrap{width:50px;height:4px;background:rgba(0,0,0,.35);border-radius:2px;overflow:hidden}',
            '.vp-bar-fill{height:100%;border-radius:2px;transition:width .5s ease}',
            '#vpTooltip{position:fixed;top:56px;right:12px;z-index:18001;' +
                'background:linear-gradient(160deg,#0f172a,#1e1b4b);' +
                'border:1px solid rgba(255,255,255,.15);border-radius:12px;' +
                'padding:14px 18px;min-width:240px;max-width:300px;' +
                'box-shadow:0 8px 32px rgba(0,0,0,.5);color:#e0e7ff;font-family:inherit;' +
                'transform:translateY(-10px);opacity:0;pointer-events:none;' +
                'transition:transform .25s ease,opacity .25s ease}',
            '#vpTooltip.active{transform:translateY(0);opacity:1;pointer-events:auto}',
            '.vp-tt-header{font-size:13px;font-weight:800;margin-bottom:10px;letter-spacing:.5px}',
            '.vp-tt-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px}',
            '.vp-tt-row.current{background:rgba(255,255,255,.08);border-radius:6px;padding:4px 6px;margin:0 -6px}',
            '.vp-tt-icon{font-size:16px;width:22px;text-align:center}',
            '.vp-tt-tier{font-weight:700;min-width:60px}',
            '.vp-tt-mult{color:#fbbf24;font-weight:700;min-width:44px;text-align:right}',
            '.vp-tt-thresh{color:rgba(255,255,255,.4);font-size:10px;margin-left:auto}',
            '.vp-tt-progress{margin-top:10px;font-size:11px;color:rgba(255,255,255,.5)}',
            '.vp-tt-progress strong{color:#fbbf24}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Badge UI ─────────────────────────────────────────────────
    function buildBadge() {
        if (_badgeEl) return;
        injectStyles();

        _badgeEl = document.createElement('div');
        _badgeEl.id = 'vpBadge';

        var icon = document.createElement('span');
        icon.className = 'vp-icon';
        icon.id = 'vpIcon';

        var name = document.createElement('span');
        name.className = 'vp-name';
        name.id = 'vpName';

        var barWrap = document.createElement('span');
        barWrap.className = 'vp-bar-wrap';
        var barFill = document.createElement('span');
        barFill.className = 'vp-bar-fill';
        barFill.id = 'vpBarFill';
        barWrap.appendChild(barFill);

        _badgeEl.appendChild(icon);
        _badgeEl.appendChild(name);
        _badgeEl.appendChild(barWrap);
        document.body.appendChild(_badgeEl);

        // Click to toggle tooltip
        _badgeEl.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleTooltip();
        });

        // Close tooltip on outside click
        document.addEventListener('click', function() {
            if (_tooltipVisible) hideTooltip();
        });
    }

    function updateBadge() {
        if (!_badgeEl) return;
        var icon = document.getElementById('vpIcon');
        var name = document.getElementById('vpName');
        var bar  = document.getElementById('vpBarFill');
        if (icon) icon.textContent = _currentTier.icon;
        if (name) name.textContent = _currentTier.name;
        _badgeEl.style.background = 'linear-gradient(135deg, ' + _currentTier.colorDark + ', ' + _currentTier.color + '55)';
        _badgeEl.style.border = '1px solid ' + _currentTier.color + '88';
        if (bar) {
            var pct = Math.round(getProgress(_currentTier, _totalWagered) * 100);
            bar.style.width = pct + '%';
            bar.style.background = _currentTier.color;
        }
    }

    // ── Tooltip UI ───────────────────────────────────────────────
    function buildTooltip() {
        if (_tooltipEl) _tooltipEl.parentNode.removeChild(_tooltipEl);
        _tooltipEl = document.createElement('div');
        _tooltipEl.id = 'vpTooltip';

        var header = document.createElement('div');
        header.className = 'vp-tt-header';
        header.textContent = 'VIP Tier Benefits';
        _tooltipEl.appendChild(header);

        for (var i = 0; i < PERK_TIERS.length; i++) {
            var t = PERK_TIERS[i];
            var row = document.createElement('div');
            row.className = 'vp-tt-row';
            if (t.id === _currentTier.id) row.className += ' current';

            var ic = document.createElement('span');
            ic.className = 'vp-tt-icon';
            ic.textContent = t.icon;

            var nm = document.createElement('span');
            nm.className = 'vp-tt-tier';
            nm.textContent = t.name;
            nm.style.color = t.color;

            var ml = document.createElement('span');
            ml.className = 'vp-tt-mult';
            ml.textContent = multLabel(t.mult);

            var th = document.createElement('span');
            th.className = 'vp-tt-thresh';
            th.textContent = t.minWagered > 0 ? ('$' + t.minWagered.toLocaleString() + '+') : 'Default';

            row.appendChild(ic);
            row.appendChild(nm);
            row.appendChild(ml);
            row.appendChild(th);
            _tooltipEl.appendChild(row);
        }

        // Progress line — built with safe DOM methods (no innerHTML)
        var next = getNextTier(_currentTier);
        var progDiv = document.createElement('div');
        progDiv.className = 'vp-tt-progress';

        var wageredLabel = document.createTextNode('Wagered: ');
        var wageredVal = document.createElement('strong');
        wageredVal.textContent = fmtMoney(_totalWagered);
        progDiv.appendChild(wageredLabel);
        progDiv.appendChild(wageredVal);

        if (next) {
            var remaining = Math.max(0, next.minWagered - _totalWagered);
            var dash = document.createTextNode(' \u2014 ');
            var remVal = document.createElement('strong');
            remVal.textContent = fmtMoney(remaining);
            var toText = document.createTextNode(' to ' + next.icon + ' ' + next.name);
            progDiv.appendChild(dash);
            progDiv.appendChild(remVal);
            progDiv.appendChild(toText);
        } else {
            var maxText = document.createTextNode(' \u2014 Max tier reached!');
            progDiv.appendChild(maxText);
        }

        _tooltipEl.appendChild(progDiv);
        document.body.appendChild(_tooltipEl);
    }

    function toggleTooltip() {
        if (_tooltipVisible) {
            hideTooltip();
        } else {
            showTooltip();
        }
    }

    function showTooltip() {
        buildTooltip();
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_tooltipEl) _tooltipEl.classList.add('active');
            });
        });
        _tooltipVisible = true;
    }

    function hideTooltip() {
        if (_tooltipEl) _tooltipEl.classList.remove('active');
        _tooltipVisible = false;
    }

    // ── Win Bonus Toast ──────────────────────────────────────────
    function showVipBonusToast(tierName, bonus) {
        if (typeof showWinToast === 'function') {
            showWinToast('VIP ' + tierName + ' Bonus: +' + fmtMoney(bonus), 'big');
        }
    }

    // ── Wager Tracking (hook into spin) ──────────────────────────
    // Track wagers by wrapping displayServerWinResult — it fires
    // on every spin outcome (win or loss). We add the bet amount
    // to totalWagered each time.
    function trackWager() {
        var bet = (typeof currentBet !== 'undefined') ? currentBet : 1;
        if (bet > 0) {
            _totalWagered += bet;
            saveWagered();
            var newTier = resolveTier(_totalWagered);
            if (newTier.id !== _currentTier.id) {
                // Tier change!
                _currentTier = newTier;
                if (typeof showWinToast === 'function') {
                    showWinToast(_currentTier.icon + ' VIP Tier Up: ' + _currentTier.name + '!', 'epic');
                }
            }
            updateBadge();
        }
    }

    // ── Hook into displayServerWinResult ─────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Track the wager
            trackWager();

            // Apply VIP multiplier to win amount
            if (_currentTier.mult > 1 && result && result.winAmount > 0) {
                var bonus = result.winAmount * (_currentTier.mult - 1);
                bonus = Math.round(bonus * 100) / 100;
                result.winAmount = Math.round((result.winAmount + bonus) * 100) / 100;

                // Adjust balance to include bonus
                if (typeof result.balance === 'number' || typeof result.balance === 'string') {
                    var bal = Number(result.balance);
                    if (Number.isFinite(bal)) {
                        result.balance = bal + bonus;
                    }
                }

                // Show bonus toast (delayed slightly so main win toast shows first)
                var tierName = _currentTier.name;
                setTimeout(function() {
                    showVipBonusToast(tierName, bonus);
                }, 1500);
            }

            _orig.call(this, result, game);
        };
    }

    // ── Public API ───────────────────────────────────────────────
    window.getVipPerkTier = function() {
        return _currentTier;
    };

    window.getVipPerkMultiplier = function() {
        return _currentTier.mult;
    };

    window.getVipTotalWagered = function() {
        return _totalWagered;
    };

    // ── Init ─────────────────────────────────────────────────────
    function init() {
        if (isQaSuppressed()) return;

        loadWagered();
        _currentTier = resolveTier(_totalWagered);

        buildBadge();
        updateBadge();
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
