// Sprint 83: Referral Bonus System
// Encourages players to share the casino with friends by offering bonus credits.
// Generates a unique referral code per player, shows a floating panel with
// share/copy functionality, simulated referral stats, and processes incoming
// ?ref=CODE URL parameters to credit $5.00 bonus to new players.
(function() {
    'use strict';

    var REFERRAL_BONUS      = 5.00;
    var CODE_LENGTH         = 6;
    var CODE_CHARS          = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var STORAGE_CODE_KEY    = 'casinoReferral';
    var STORAGE_STATS_KEY   = 'referralStats';
    var STORAGE_CLAIMED_KEY = 'referralClaimed';
    var STORAGE_SEEN_KEY    = 'referralPanelSeen';

    var FAKE_NAMES = [
        'Alex M.', 'Jordan K.', 'Sam R.', 'Taylor W.', 'Casey B.',
        'Morgan P.', 'Riley T.', 'Avery L.', 'Quinn H.', 'Drew N.'
    ];

    var _stylesInjected = false;
    var _fabEl = null;
    var _panelEl = null;
    var _panelOpen = false;
    var _referralCode = '';
    var _referralStats = { count: 0, history: [] };

    function isSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    function generateCode() {
        var code = '';
        for (var i = 0; i < CODE_LENGTH; i++) {
            code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
        }
        return code;
    }

    function getOrCreateCode() {
        try {
            var stored = localStorage.getItem(STORAGE_CODE_KEY);
            if (stored && stored.length === CODE_LENGTH) return stored;
        } catch (e) { /* ignore */ }
        var code = generateCode();
        try { localStorage.setItem(STORAGE_CODE_KEY, code); } catch (e) { /* ignore */ }
        return code;
    }

    function loadStats() {
        try {
            var raw = localStorage.getItem(STORAGE_STATS_KEY);
            if (raw) { var p = JSON.parse(raw); if (p && typeof p.count === 'number') { _referralStats = p; return; } }
        } catch (e) { /* ignore */ }
        var count = Math.floor(Math.random() * 4);
        var history = [];
        var now = Date.now();
        for (var i = 0; i < count; i++) {
            var daysAgo = Math.floor(Math.random() * 30) + 1;
            history.push({ name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)], ts: now - (daysAgo * 86400000), bonus: REFERRAL_BONUS });
        }
        history.sort(function(a, b) { return b.ts - a.ts; });
        _referralStats = { count: count, history: history };
        try { localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(_referralStats)); } catch (e) { /* ignore */ }
    }

    function formatTimeAgo(ts) {
        var diff = Date.now() - ts;
        var days = Math.floor(diff / 86400000);
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        if (days < 30) return days + ' days ago';
        return Math.floor(days / 30) + 'mo ago';
    }

    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'referralStyles';
        s.textContent = [
            '#refFab{position:fixed;bottom:200px;right:16px;z-index:19000;width:48px;height:48px;' +
                'border-radius:50%;background:linear-gradient(135deg,#3b82f6,#7c3aed);' +
                'border:2px solid rgba(124,58,237,.5);color:#fff;font-size:22px;' +
                'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
                'box-shadow:0 4px 16px rgba(59,130,246,.4);transition:transform .2s}',
            '#refFab:hover{transform:scale(1.1)}',
            '#refFab .ref-dot{position:absolute;top:-2px;right:-2px;width:12px;height:12px;' +
                'border-radius:50%;background:#ef4444;border:2px solid #0d0d1a}',
            '#refPanel{position:fixed;bottom:260px;right:16px;z-index:19100;width:310px;max-width:90vw;' +
                'background:linear-gradient(160deg,#0d0d1a,#1a0a2e);' +
                'border:2px solid rgba(124,58,237,.4);border-radius:16px;' +
                'padding:20px;box-shadow:0 8px 40px rgba(124,58,237,.25);color:#e0e7ff;' +
                'transform:translateY(20px) scale(.95);opacity:0;pointer-events:none;' +
                'transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s ease}',
            '#refPanel.active{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}',
            '.ref-title{font-size:16px;font-weight:900;color:#a78bfa;margin-bottom:12px;text-align:center}',
            '.ref-code-box{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);' +
                'border-radius:12px;padding:12px;text-align:center;margin-bottom:12px}',
            '.ref-code-label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}',
            '.ref-code-val{font-size:24px;font-weight:900;letter-spacing:4px;color:#a78bfa}',
            '.ref-btns{display:flex;gap:8px;margin-bottom:12px}',
            '.ref-btn{flex:1;padding:9px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer}',
            '.ref-btn-copy{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff}',
            '.ref-btn-share{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff}',
            '.ref-bonus{background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.2);' +
                'border-radius:10px;padding:8px;text-align:center;margin-bottom:12px;font-size:12px;color:rgba(255,255,255,.55)}',
            '.ref-bonus-amt{color:#fbbf24;font-weight:800;font-size:15px}',
            '.ref-stats{font-size:12px;color:rgba(255,255,255,.45);margin-bottom:8px}',
            '.ref-stats-num{color:#a78bfa;font-weight:800}',
            '.ref-hist-title{font-size:10px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}',
            '.ref-hist-item{display:flex;justify-content:space-between;padding:4px 0;' +
                'border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;color:rgba(255,255,255,.5)}',
            '.ref-hist-bonus{color:#22c55e;font-weight:700}',
            '.ref-hist-empty{font-size:11px;color:rgba(255,255,255,.2);text-align:center;padding:8px 0;font-style:italic}',
            '.ref-copied{font-size:11px;color:#22c55e;text-align:center;height:16px;opacity:0;transition:opacity .2s}',
            '.ref-copied.show{opacity:1}',
            '.ref-close{display:block;margin:8px auto 0;background:none;border:none;color:rgba(255,255,255,.25);' +
                'font-size:11px;cursor:pointer;text-decoration:underline}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function buildFab() {
        if (_fabEl) return;
        injectStyles();
        _fabEl = document.createElement('div');
        _fabEl.id = 'refFab';
        _fabEl.title = 'Invite Friends';
        _fabEl.appendChild(document.createTextNode('\uD83D\uDC8C'));
        var hasSeen = false;
        try { hasSeen = localStorage.getItem(STORAGE_SEEN_KEY) === '1'; } catch (e) {}
        if (!hasSeen) {
            var dot = document.createElement('span');
            dot.className = 'ref-dot';
            dot.id = 'refDot';
            _fabEl.appendChild(dot);
        }
        _fabEl.addEventListener('click', togglePanel);
        document.body.appendChild(_fabEl);
    }

    function togglePanel() {
        if (!_panelEl) buildPanel();
        _panelOpen = !_panelOpen;
        if (_panelOpen) {
            requestAnimationFrame(function() {
                requestAnimationFrame(function() { _panelEl.classList.add('active'); });
            });
            try { localStorage.setItem(STORAGE_SEEN_KEY, '1'); } catch (e) {}
            var dot = document.getElementById('refDot');
            if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
        } else {
            _panelEl.classList.remove('active');
        }
    }

    function buildPanel() {
        if (_panelEl) return;
        _panelEl = document.createElement('div');
        _panelEl.id = 'refPanel';

        var title = document.createElement('div');
        title.className = 'ref-title';
        title.textContent = '\uD83D\uDC65 Invite Friends';

        var codeBox = document.createElement('div');
        codeBox.className = 'ref-code-box';
        var cLabel = document.createElement('div');
        cLabel.className = 'ref-code-label';
        cLabel.textContent = 'Your Referral Code';
        var cVal = document.createElement('div');
        cVal.className = 'ref-code-val';
        cVal.textContent = _referralCode;
        codeBox.appendChild(cLabel);
        codeBox.appendChild(cVal);

        var copied = document.createElement('div');
        copied.className = 'ref-copied';
        copied.id = 'refCopied';
        copied.textContent = 'Copied to clipboard!';

        var btns = document.createElement('div');
        btns.className = 'ref-btns';
        var copyBtn = document.createElement('button');
        copyBtn.className = 'ref-btn ref-btn-copy';
        copyBtn.textContent = '\uD83D\uDCCB Copy Code';
        copyBtn.addEventListener('click', function() { copyText(_referralCode); });
        var shareBtn = document.createElement('button');
        shareBtn.className = 'ref-btn ref-btn-share';
        shareBtn.textContent = '\uD83D\uDCE4 Share';
        shareBtn.addEventListener('click', function() {
            var url = window.location.origin + window.location.pathname + '?ref=' + _referralCode;
            var msg = 'Join me on Matrix Spins! Use code ' + _referralCode + ' for $5.00 FREE bonus! ' + url;
            copyText(msg);
        });
        btns.appendChild(copyBtn);
        btns.appendChild(shareBtn);

        var bonus = document.createElement('div');
        bonus.className = 'ref-bonus';
        var b1 = document.createTextNode('Earn ');
        var bAmt = document.createElement('span');
        bAmt.className = 'ref-bonus-amt';
        bAmt.textContent = '$' + REFERRAL_BONUS.toFixed(2);
        var b2 = document.createTextNode(' for each friend who joins!');
        bonus.appendChild(b1);
        bonus.appendChild(bAmt);
        bonus.appendChild(b2);

        var statsEl = document.createElement('div');
        statsEl.className = 'ref-stats';
        var sNum = document.createElement('span');
        sNum.className = 'ref-stats-num';
        sNum.textContent = String(_referralStats.count);
        statsEl.appendChild(document.createTextNode('\uD83D\uDC65 '));
        statsEl.appendChild(sNum);
        statsEl.appendChild(document.createTextNode(' friends joined'));

        var histTitle = document.createElement('div');
        histTitle.className = 'ref-hist-title';
        histTitle.textContent = 'Referral History';

        var histList = document.createElement('div');
        if (_referralStats.history.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'ref-hist-empty';
            empty.textContent = 'No referrals yet \u2014 share your code!';
            histList.appendChild(empty);
        } else {
            for (var i = 0; i < _referralStats.history.length; i++) {
                var h = _referralStats.history[i];
                var item = document.createElement('div');
                item.className = 'ref-hist-item';
                var nm = document.createElement('span');
                nm.textContent = h.name;
                var dt = document.createElement('span');
                dt.textContent = formatTimeAgo(h.ts);
                var bn = document.createElement('span');
                bn.className = 'ref-hist-bonus';
                bn.textContent = '+$' + h.bonus.toFixed(2);
                item.appendChild(nm);
                item.appendChild(dt);
                item.appendChild(bn);
                histList.appendChild(item);
            }
        }

        var closeBtn = document.createElement('button');
        closeBtn.className = 'ref-close';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', togglePanel);

        _panelEl.appendChild(title);
        _panelEl.appendChild(codeBox);
        _panelEl.appendChild(copied);
        _panelEl.appendChild(btns);
        _panelEl.appendChild(bonus);
        _panelEl.appendChild(statsEl);
        _panelEl.appendChild(histTitle);
        _panelEl.appendChild(histList);
        _panelEl.appendChild(closeBtn);
        document.body.appendChild(_panelEl);
    }

    function copyText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(showCopied).catch(function() { fallbackCopy(text); });
        } else { fallbackCopy(text); }
    }

    function fallbackCopy(text) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showCopied();
        } catch (e) {}
    }

    function showCopied() {
        var el = document.getElementById('refCopied');
        if (!el) return;
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 2000);
    }

    function processIncomingReferral() {
        var qs = window.location.search || '';
        var match = qs.match(/[?&]ref=([A-Z0-9]{6})/);
        if (!match) return;
        try { if (localStorage.getItem(STORAGE_CLAIMED_KEY) === '1') return; } catch (e) {}
        try { localStorage.setItem(STORAGE_CLAIMED_KEY, '1'); } catch (e) {}
        if (typeof balance !== 'undefined') { balance += REFERRAL_BONUS; balance = Math.round(balance * 100) / 100; }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
        if (typeof showWinToast === 'function') {
            setTimeout(function() {
                showWinToast('Welcome! You received $' + REFERRAL_BONUS.toFixed(2) + ' bonus from a referral!', 'epic');
            }, 1500);
        }
    }

    function init() {
        if (isSuppressed()) return;
        _referralCode = getOrCreateCode();
        loadStats();
        processIncomingReferral();
        setTimeout(buildFab, 2000);
    }

    window.getReferralCode = function() { return _referralCode; };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
