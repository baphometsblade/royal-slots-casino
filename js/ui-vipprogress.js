(function () {
    'use strict';

    var VIP_TIERS = [
        { id: 'bronze',   label: 'Bronze',   emoji: '🥉', minSpins: 0,     color: '#cd7f32' },
        { id: 'silver',   label: 'Silver',   emoji: '🥈', minSpins: 500,   color: '#c0c0c0' },
        { id: 'gold',     label: 'Gold',     emoji: '🥇', minSpins: 2000,  color: '#ffd700' },
        { id: 'platinum', label: 'Platinum', emoji: '💎', minSpins: 5000,  color: '#e0e8ff' },
        { id: 'diamond',  label: 'Diamond',  emoji: '💠', minSpins: 10000, color: '#88eeff' }
    ];

    function _fmtNum(n) { return (n || 0).toLocaleString(); }

    function _computeTierState(totalSpins) {
        var current = VIP_TIERS[0], next = VIP_TIERS[1];
        for (var i = 0; i < VIP_TIERS.length; i++) {
            if (totalSpins >= VIP_TIERS[i].minSpins) {
                current = VIP_TIERS[i];
                next = VIP_TIERS[i + 1] || null;
            }
        }
        var pct = 100, spinsLeft = 0;
        if (next) {
            var range = next.minSpins - current.minSpins;
            var progress = totalSpins - current.minSpins;
            pct = Math.min(100, Math.floor((progress / range) * 100));
            spinsLeft = next.minSpins - totalSpins;
        }
        return { current: current, next: next, pct: pct, spinsLeft: spinsLeft, totalSpins: totalSpins };
    }

    function _injectStyles() {
        if (document.getElementById('vipProgressStyles')) return;
        var style = document.createElement('style');
        style.id = 'vipProgressStyles';
        style.textContent = [
            '#vipProgressWidget{display:flex;align-items:center;gap:12px;background:rgba(0,0,0,.3);border-bottom:1px solid rgba(255,255,255,.06);padding:8px 20px;font-size:13px;overflow:hidden}',
            '.vip-pw-tier-badge{font-size:15px;font-weight:800;white-space:nowrap;flex-shrink:0}',
            '.vip-pw-bar-wrap{flex:1;min-width:60px}',
            '.vip-pw-bar-track{height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden}',
            '.vip-pw-bar-fill{height:100%;border-radius:3px;transition:width .4s ease}',
            '.vip-pw-label{font-size:11px;color:rgba(255,255,255,.35);white-space:nowrap;flex-shrink:0}',
            '.vip-pw-cta{background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.4);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0}',
            '.vip-pw-cta:hover{border-color:rgba(255,255,255,.35);color:#fff}',
            '#vipProgressWidget.vip-pw-near .vip-pw-bar-fill{animation:vipPulse 1.2s ease-in-out infinite}',
            '@keyframes vipPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.4)}}',
            '#vipProgressWidget.vip-pw-near .vip-pw-label{color:#ffd700;font-weight:700}'
        ].join('');
        document.head.appendChild(style);
    }

    function _updateWidget() {
        var widget = document.getElementById('vipProgressWidget');
        if (!widget) return;

        var slotOpen = document.getElementById('slotModal') &&
                       document.getElementById('slotModal').classList.contains('active');
        widget.style.display = slotOpen ? 'none' : 'flex';

        var spins = (window.stats && window.stats.totalSpins) || 0;
        var state = _computeTierState(spins);

        var badge = widget.querySelector('.vip-pw-tier-badge');
        if (badge) {
            badge.textContent = state.current.emoji + ' ' + state.current.label + ' VIP';
            badge.style.color = state.current.color;
        }

        var fill = widget.querySelector('.vip-pw-bar-fill');
        if (fill) {
            fill.style.width = state.pct + '%';
            if (state.next) {
                fill.style.background = 'linear-gradient(90deg, ' + state.current.color + ', ' + state.next.color + ')';
            } else {
                fill.style.background = state.current.color;
            }
        }

        var label = widget.querySelector('.vip-pw-label');
        if (label) {
            if (state.next) {
                var labelText = _fmtNum(spins) + ' / ' + _fmtNum(state.next.minSpins) + ' spins \u2192 ' + state.next.label + ' ' + state.next.emoji;
                if (state.pct >= 85) {
                    labelText = '\uD83D\uDD25 Almost there! ' + labelText;
                }
                label.textContent = labelText;
            } else {
                label.textContent = 'MAX TIER \u2014 ' + state.current.emoji + ' ' + state.current.label;
            }
        }

        if (state.pct >= 85 && state.next) {
            widget.classList.add('vip-pw-near');
        } else {
            widget.classList.remove('vip-pw-near');
        }
    }

    function _injectWidget() {
        if (document.getElementById('vipProgressWidget')) {
            _updateWidget();
            return;
        }

        _injectStyles();

        var widget = document.createElement('div');
        widget.id = 'vipProgressWidget';

        var badge = document.createElement('span');
        badge.className = 'vip-pw-tier-badge';

        var barWrap = document.createElement('div');
        barWrap.className = 'vip-pw-bar-wrap';

        var barTrack = document.createElement('div');
        barTrack.className = 'vip-pw-bar-track';

        var barFill = document.createElement('div');
        barFill.className = 'vip-pw-bar-fill';
        barFill.style.width = '0%';

        barTrack.appendChild(barFill);
        barWrap.appendChild(barTrack);

        var label = document.createElement('span');
        label.className = 'vip-pw-label';

        var cta = document.createElement('button');
        cta.className = 'vip-pw-cta';
        cta.textContent = 'View Benefits \u2192';
        cta.addEventListener('click', function () {
            if (typeof window.openVipModal === 'function') {
                window.openVipModal();
            }
        });

        widget.appendChild(badge);
        widget.appendChild(barWrap);
        widget.appendChild(label);
        widget.appendChild(cta);

        var gameGrid = document.getElementById('gameGrid');
        if (gameGrid) {
            gameGrid.parentNode.insertBefore(widget, gameGrid);
        } else {
            document.body.appendChild(widget);
        }

        _updateWidget();
    }

    var _prevUpdateBalance = window.updateBalance;
    window.updateBalance = function (newBal) {
        if (_prevUpdateBalance) _prevUpdateBalance.apply(this, arguments);
        _updateWidget();
    };

    var _prevRenderGames = window.renderGames;
    window.renderGames = function () {
        if (_prevRenderGames) _prevRenderGames.apply(this, arguments);
        setTimeout(_injectWidget, 150);
    };

    window.refreshVipProgress = _updateWidget;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_injectWidget, 1500); });
    } else {
        setTimeout(_injectWidget, 1500);
    }

}());
