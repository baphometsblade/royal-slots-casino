// VIP tier progress — updates header mini-bar, sidebar card, and lobby widget
// Uses totalWagered (matching VIP_TIERS in constants.js) instead of spin count
(function () {
    'use strict';

    // Canonical tier data (mirrors VIP_TIERS in constants.js)
    var _TIERS = (typeof VIP_TIERS !== 'undefined') ? VIP_TIERS : [
        { id: 'bronze',   name: 'Bronze',   minWagered: 0,     maxWagered: 249,      cashbackPct: 0.5, color: '#CD7F32', icon: '\uD83E\uDD49' },
        { id: 'silver',   name: 'Silver',   minWagered: 250,   maxWagered: 4999,     cashbackPct: 1.0, color: '#C0C0C0', icon: '\uD83E\uDD48' },
        { id: 'gold',     name: 'Gold',     minWagered: 5000,  maxWagered: 19999,    cashbackPct: 1.5, color: '#FFD700', icon: '\uD83E\uDD47' },
        { id: 'platinum', name: 'Platinum', minWagered: 20000, maxWagered: 49999,    cashbackPct: 2.0, color: '#E5E4E2', icon: '\uD83D\uDC8E' },
        { id: 'diamond',  name: 'Diamond',  minWagered: 50000, maxWagered: Infinity, cashbackPct: 3.0, color: '#B9F2FF', icon: '\uD83D\uDCAB' }
    ];

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _fmtAmt(n) {
        if (n >= 10000) return '$' + Math.round(n / 1000) + 'k';
        if (n >= 1000)  return '$' + (n / 1000).toFixed(1) + 'k';
        return '$' + Math.floor(n);
    }

    function _getWagered() {
        if (window.stats && typeof window.stats.totalWagered === 'number') {
            return window.stats.totalWagered;
        }
        try {
            var key = typeof STORAGE_KEY_STATS !== 'undefined' ? STORAGE_KEY_STATS : 'casinoStats';
            var raw = localStorage.getItem(key);
            if (raw) { return JSON.parse(raw).totalWagered || 0; }
        } catch (e) { /* ignore */ }
        return 0;
    }

    function _computeState(wagered) {
        var current = _TIERS[0], next = _TIERS[1];
        for (var i = 0; i < _TIERS.length; i++) {
            if (wagered >= _TIERS[i].minWagered) {
                current = _TIERS[i];
                next = _TIERS[i + 1] || null;
            }
        }
        var pct = 100;
        if (next) {
            var range = next.minWagered - current.minWagered;
            pct = Math.min(100, Math.floor(((wagered - current.minWagered) / range) * 100));
        }
        return { current: current, next: next, pct: pct, wagered: wagered };
    }

    // ── Header mini-bar ───────────────────────────────────────────────────────
    function _updateHeader(state) {
        var fill  = document.getElementById('vipMiniFill');
        var label = document.getElementById('vipMiniText');
        var tier  = document.getElementById('tierLabel');

        if (fill) {
            fill.style.width = state.pct + '%';
            fill.style.background = 'linear-gradient(90deg,' + state.current.color + ',' +
                (state.next ? state.next.color : state.current.color) + ')';
        }
        if (label) {
            label.textContent = state.next
                ? state.current.icon + '\u00A0' + state.current.name + ' \u2192 ' + state.next.name + '\u00A0' + state.pct + '%'
                : state.current.icon + ' MAX TIER';
        }
        if (tier) {
            tier.textContent = state.current.name.toUpperCase();
        }
    }

    // ── Sidebar VIP card (DOM-built, no innerHTML) ────────────────────────────
    function _buildSidebarCard(state) {
        var wrap = document.createElement('div');
        wrap.id = 'vipSidebarCard';
        wrap.style.cssText = 'padding:10px 12px 9px;background:linear-gradient(135deg,rgba(0,0,0,.45),rgba(255,255,255,.03));' +
            'border-radius:9px;margin:8px 8px 4px;border:1px solid rgba(255,255,255,.08)';

        // — heading row
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:7px';

        var tierName = document.createElement('span');
        tierName.style.cssText = 'font-size:14px;font-weight:900;letter-spacing:.5px;color:' + state.current.color;
        tierName.textContent = state.current.icon + '\u00A0' + state.current.name + ' VIP';

        var nextLabel = document.createElement('span');
        nextLabel.style.cssText = 'font-size:10px;' + (state.next ? 'color:rgba(255,255,255,.35)' : 'color:#ffd700;font-weight:700');
        nextLabel.textContent = state.next
            ? 'Next: ' + state.next.icon + '\u00A0' + state.next.name
            : '\u2B50 MAX TIER';

        hdr.appendChild(tierName);
        hdr.appendChild(nextLabel);
        wrap.appendChild(hdr);

        // — progress bar
        var track = document.createElement('div');
        track.style.cssText = 'height:7px;background:rgba(255,255,255,.1);border-radius:4px;overflow:hidden;margin-bottom:5px';
        var bar = document.createElement('div');
        bar.id = 'vipSbBarFill';
        bar.style.cssText = 'height:100%;border-radius:4px;transition:width .5s ease;width:' + state.pct + '%;' +
            'background:linear-gradient(90deg,' + state.current.color + ',' +
            (state.next ? state.next.color : state.current.color) + ')';
        track.appendChild(bar);
        wrap.appendChild(track);

        // — wager / to-next row
        var stats = document.createElement('div');
        stats.style.cssText = 'display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.35);margin-bottom:7px';
        var wageredEl = document.createElement('span');
        wageredEl.id = 'vipSbWagered';
        wageredEl.textContent = _fmtAmt(state.wagered) + ' wagered';
        stats.appendChild(wageredEl);
        if (state.next) {
            var toNext = document.createElement('span');
            toNext.id = 'vipSbToNext';
            toNext.textContent = _fmtAmt(state.next.minWagered - state.wagered) + ' to ' + state.next.name;
            stats.appendChild(toNext);
        }
        wrap.appendChild(stats);

        // — benefit line
        var benefit = document.createElement('div');
        benefit.style.cssText = 'font-size:10px;color:rgba(255,255,255,.45);border-top:1px solid rgba(255,255,255,.07);padding-top:6px';
        benefit.textContent = '\u2728 ' + state.current.cashbackPct + '% cashback on losses' +
            (state.next ? ' \u2192 ' + state.next.cashbackPct + '% at ' + state.next.name : '');
        wrap.appendChild(benefit);

        return wrap;
    }

    function _updateSidebarCard(state) {
        var body = document.querySelector('#csbDdVip .csb-dd-body');
        if (!body) return;

        var card = document.getElementById('vipSidebarCard');
        if (!card) {
            card = _buildSidebarCard(state);
            body.insertBefore(card, body.firstChild);
            return;
        }

        // Update existing card in-place
        var tierName = card.querySelector('span:first-child') || card.firstChild;
        var bar = document.getElementById('vipSbBarFill');
        var wageredEl = document.getElementById('vipSbWagered');
        var toNextEl = document.getElementById('vipSbToNext');

        if (bar) {
            bar.style.width = state.pct + '%';
            bar.style.background = 'linear-gradient(90deg,' + state.current.color + ',' +
                (state.next ? state.next.color : state.current.color) + ')';
        }
        if (wageredEl) wageredEl.textContent = _fmtAmt(state.wagered) + ' wagered';
        if (toNextEl && state.next) {
            toNextEl.textContent = _fmtAmt(state.next.minWagered - state.wagered) + ' to ' + state.next.name;
        }
    }

    // ── Lobby widget (above game grid) ────────────────────────────────────────
    function _injectLobbyStyles() {
        if (document.getElementById('vipProgressStyles')) return;
        var style = document.createElement('style');
        style.id = 'vipProgressStyles';
        style.textContent = [
            '#vipProgressWidget{display:flex;align-items:center;gap:12px;background:rgba(0,0,0,.3);' +
                'border-bottom:1px solid rgba(255,255,255,.06);padding:8px 20px;font-size:13px;overflow:hidden}',
            '.vip-pw-badge{font-size:15px;font-weight:800;white-space:nowrap;flex-shrink:0}',
            '.vip-pw-bar-wrap{flex:1;min-width:60px}',
            '.vip-pw-bar-track{height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden}',
            '.vip-pw-bar-fill{height:100%;border-radius:3px;transition:width .4s ease}',
            '.vip-pw-info{font-size:11px;color:rgba(255,255,255,.35);white-space:nowrap;flex-shrink:0}',
            '.vip-pw-cta{background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.4);' +
                'border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s}',
            '.vip-pw-cta:hover{border-color:rgba(255,255,255,.35);color:#fff}',
            '#vipProgressWidget.vip-near .vip-pw-bar-fill{animation:vipGlow 1.2s ease-in-out infinite}',
            '#vipProgressWidget.vip-near .vip-pw-info{color:#ffd700;font-weight:700}',
            '@keyframes vipGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.5)}}'
        ].join('');
        document.head.appendChild(style);
    }

    function _injectLobbyWidget() {
        if (document.getElementById('vipProgressWidget')) return;
        _injectLobbyStyles();

        var widget = document.createElement('div');
        widget.id = 'vipProgressWidget';

        var badge = document.createElement('span');
        badge.className = 'vip-pw-badge';

        var barWrap = document.createElement('div');
        barWrap.className = 'vip-pw-bar-wrap';
        var barTrack = document.createElement('div');
        barTrack.className = 'vip-pw-bar-track';
        var barFill = document.createElement('div');
        barFill.className = 'vip-pw-bar-fill';
        barTrack.appendChild(barFill);
        barWrap.appendChild(barTrack);

        var info = document.createElement('span');
        info.className = 'vip-pw-info';

        var cta = document.createElement('button');
        cta.className = 'vip-pw-cta';
        cta.textContent = 'Benefits \u2192';
        cta.addEventListener('click', function () {
            if (typeof window.openVipModal === 'function') window.openVipModal();
        });

        widget.appendChild(badge);
        widget.appendChild(barWrap);
        widget.appendChild(info);
        widget.appendChild(cta);

        var gameGrid = document.getElementById('gameGrid');
        if (gameGrid && gameGrid.parentNode) {
            gameGrid.parentNode.insertBefore(widget, gameGrid);
        } else {
            document.body.appendChild(widget);
        }
    }

    function _updateLobbyWidget(state) {
        var widget = document.getElementById('vipProgressWidget');
        if (!widget) return;

        var slotModal = document.getElementById('slotModal');
        widget.style.display = (slotModal && slotModal.classList.contains('active')) ? 'none' : 'flex';

        var badge = widget.querySelector('.vip-pw-badge');
        if (badge) {
            badge.textContent = state.current.icon + '\u00A0' + state.current.name + ' VIP';
            badge.style.color = state.current.color;
        }
        var fill = widget.querySelector('.vip-pw-bar-fill');
        if (fill) {
            fill.style.width = state.pct + '%';
            fill.style.background = 'linear-gradient(90deg,' + state.current.color + ',' +
                (state.next ? state.next.color : state.current.color) + ')';
        }
        var info = widget.querySelector('.vip-pw-info');
        if (info) {
            if (state.next) {
                var txt = _fmtAmt(state.wagered) + ' \u2192 ' + _fmtAmt(state.next.minWagered - state.wagered) +
                    ' to ' + state.next.name + '\u00A0' + state.next.icon;
                if (state.pct >= 85) txt = '\uD83D\uDD25 Almost there! ' + txt;
                info.textContent = txt;
            } else {
                info.textContent = '\u2B50 MAX TIER \u2014 ' + state.current.name;
            }
        }

        if (state.pct >= 85 && state.next) {
            widget.classList.add('vip-near');
        } else {
            widget.classList.remove('vip-near');
        }
    }

    // ── Main refresh ──────────────────────────────────────────────────────────
    function refresh() {
        var state = _computeState(_getWagered());
        _updateHeader(state);
        _updateSidebarCard(state);
        _updateLobbyWidget(state);
    }

    // ── Hooks ─────────────────────────────────────────────────────────────────
    var _origUpdateBalance = window.updateBalance;
    window.updateBalance = function (n) {
        if (_origUpdateBalance) _origUpdateBalance.apply(this, arguments);
        setTimeout(refresh, 60);
    };

    var _origRenderGames = window.renderGames;
    window.renderGames = function () {
        if (_origRenderGames) _origRenderGames.apply(this, arguments);
        setTimeout(function () { _injectLobbyWidget(); refresh(); }, 200);
    };

    window.refreshVipProgress = refresh;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(function () { _injectLobbyWidget(); refresh(); }, 1500);
        });
    } else {
        setTimeout(function () { _injectLobbyWidget(); refresh(); }, 1500);
    }
}());
