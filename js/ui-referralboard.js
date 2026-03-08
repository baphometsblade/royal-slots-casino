/* ui-referralboard.js -- Referral Leaderboard (Sprint 37)
 * Floating bottom-left panel showing top referrers with fake data.
 * Encourages social sharing via "Share & Earn" CTA.
 * Self-contained IIFE, no ES modules, createElement only.
 */
(function () {
    'use strict';

    // ── Config ───────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_referralBoard';
    var DISMISS_DURATION = 4 * 60 * 60 * 1000; // 4 hours
    var SHOW_DELAY = 5 * 60 * 1000;            // 5 minutes
    var FAKE_NAMES = [
        'CryptoKing', 'SlotQueen', 'LuckyDave', 'SpinMaster', 'VegasJoe',
        'GoldRush99', 'DiamondLady', 'AceHigh', 'JackpotJen', 'RoyalFlush'
    ];
    var REWARD_PER_REFERRAL = 5; // $5 per referral
    var TOP_COUNT = 5;

    // ── State ────────────────────────────────────────────────────
    var _panelEl = null;
    var _stylesInjected = false;
    var _showTimer = null;

    // ── Fake data generation ─────────────────────────────────────
    function _generateLeaderboard() {
        var shuffled = FAKE_NAMES.slice().sort(function () { return Math.random() - 0.5; });
        var entries = [];
        for (var i = 0; i < TOP_COUNT; i++) {
            var count = Math.floor(Math.random() * 46) + 5; // 5-50
            entries.push({
                name: shuffled[i],
                referrals: count,
                reward: count * REWARD_PER_REFERRAL
            });
        }
        entries.sort(function (a, b) { return b.referrals - a.referrals; });
        return entries;
    }

    // ── Styles ───────────────────────────────────────────────────
    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'referralBoardStyles';
        s.textContent = [
            '#referralLeaderboard{position:fixed;bottom:16px;left:16px;z-index:15000;',
            '  width:260px;background:linear-gradient(145deg,#1a1a2e,#16213e);',
            '  border:1px solid rgba(255,215,0,.3);border-radius:12px;',
            '  box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:inherit;',
            '  transform:translateY(120%);transition:transform .5s cubic-bezier(.34,1.56,.64,1);',
            '  overflow:hidden;color:#e0e0e0}',
            '#referralLeaderboard.rl-visible{transform:translateY(0)}',
            '.rl-header{display:flex;align-items:center;justify-content:space-between;',
            '  padding:10px 14px;background:linear-gradient(90deg,rgba(255,215,0,.15),rgba(255,215,0,.05));',
            '  border-bottom:1px solid rgba(255,215,0,.15)}',
            '.rl-title{font-size:13px;font-weight:800;color:#ffd700;letter-spacing:.8px}',
            '.rl-close{background:none;border:none;color:#888;font-size:16px;cursor:pointer;padding:2px 6px}',
            '.rl-close:hover{color:#fff}',
            '.rl-list{padding:6px 0;margin:0;list-style:none}',
            '.rl-entry{display:flex;align-items:center;padding:5px 14px;gap:8px;font-size:12px}',
            '.rl-rank{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;',
            '  justify-content:center;font-size:11px;font-weight:900;flex-shrink:0}',
            '.rl-rank-1{background:linear-gradient(135deg,#ffd700,#ffaa00);color:#1a1a2e}',
            '.rl-rank-2{background:linear-gradient(135deg,#c0c0c0,#a0a0a0);color:#1a1a2e}',
            '.rl-rank-3{background:linear-gradient(135deg,#cd7f32,#a0622e);color:#1a1a2e}',
            '.rl-rank-n{background:rgba(255,255,255,.1);color:#aaa}',
            '.rl-name{flex:1;font-weight:600;color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.rl-refs{font-size:11px;color:#aaa;min-width:40px;text-align:right}',
            '.rl-reward{font-size:11px;color:#22c55e;font-weight:700;min-width:45px;text-align:right}',
            '.rl-cta{display:block;margin:8px 14px 12px;padding:9px 0;text-align:center;',
            '  background:linear-gradient(135deg,#ffd700,#ff8c00);color:#1a1a2e;',
            '  font-size:13px;font-weight:800;border:none;border-radius:8px;cursor:pointer;',
            '  letter-spacing:.5px;transition:filter .2s}',
            '.rl-cta:hover{filter:brightness(1.15)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── DOM creation ─────────────────────────────────────────────
    function _buildPanel() {
        if (_panelEl) return;
        _injectStyles();

        var panel = document.createElement('div');
        panel.id = 'referralLeaderboard';

        // Header
        var header = document.createElement('div');
        header.className = 'rl-header';

        var title = document.createElement('span');
        title.className = 'rl-title';
        title.textContent = '\uD83C\uDFC6 TOP REFERRERS';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'rl-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () { window.dismissReferralBoard(); });

        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Leaderboard list
        var list = document.createElement('ul');
        list.className = 'rl-list';

        var entries = _generateLeaderboard();
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var li = document.createElement('li');
            li.className = 'rl-entry';

            var rank = document.createElement('span');
            var rankNum = i + 1;
            rank.className = 'rl-rank' + (rankNum <= 3 ? ' rl-rank-' + rankNum : ' rl-rank-n');
            rank.textContent = String(rankNum);

            var name = document.createElement('span');
            name.className = 'rl-name';
            name.textContent = entry.name;

            var refs = document.createElement('span');
            refs.className = 'rl-refs';
            refs.textContent = entry.referrals + ' refs';

            var reward = document.createElement('span');
            reward.className = 'rl-reward';
            reward.textContent = '$' + entry.reward;

            li.appendChild(rank);
            li.appendChild(name);
            li.appendChild(refs);
            li.appendChild(reward);
            list.appendChild(li);
        }
        panel.appendChild(list);

        // CTA button
        var cta = document.createElement('button');
        cta.className = 'rl-cta';
        cta.textContent = '\uD83D\uDD17 Share & Earn $5/Referral';
        cta.addEventListener('click', function () {
            if (typeof window.openReferralModal === 'function') {
                window.openReferralModal();
            } else {
                alert('Share your referral link with friends and earn $5 for every signup!');
            }
        });
        panel.appendChild(cta);

        document.body.appendChild(panel);
        _panelEl = panel;
    }

    // ── Dismiss persistence ──────────────────────────────────────
    function _isDismissed() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            var data = JSON.parse(raw);
            if (data.dismissedAt && Date.now() - data.dismissedAt < DISMISS_DURATION) return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function _saveDismissed() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
        } catch (e) { /* ignore */ }
    }

    // ── Public API ───────────────────────────────────────────────
    window.dismissReferralBoard = function () {
        if (_panelEl) _panelEl.classList.remove('rl-visible');
        _saveDismissed();
    };

    window.showReferralBoard = function () {
        _buildPanel();
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (_panelEl) _panelEl.classList.add('rl-visible');
            });
        });
    };

    // ── Init ─────────────────────────────────────────────────────
    function _init() {
        try {
            if (new URLSearchParams(location.search).get('noBonus') === '1') return;
        } catch (e) { /* ignore */ }

        if (_isDismissed()) return;

        _showTimer = setTimeout(function () {
            window.showReferralBoard();
        }, SHOW_DELAY);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 500); });
    } else {
        setTimeout(_init, 500);
    }
})();
