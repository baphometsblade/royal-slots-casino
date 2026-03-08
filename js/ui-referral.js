// Sprint 83: Referral Bonus System (enhanced)
// Encourages players to share the casino with friends by offering bonus credits.
// Generates a unique referral code per player, shows a floating panel with
// share/copy functionality, simulated referral stats, and processes incoming
// ?ref=CODE URL parameters to credit bonus to new players.
// Enhanced: one-click full-link copy, WhatsApp/Twitter/Telegram social share,
// $25-per-deposit offer, milestone progress bar.
(function() {
    'use strict';

    var REFERRAL_BONUS      = 25.00;   // $25 per friend who deposits
    var CODE_LENGTH         = 6;
    var CODE_CHARS          = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var STORAGE_CODE_KEY    = 'casinoReferral';
    var STORAGE_STATS_KEY   = 'referralStats';
    var STORAGE_CLAIMED_KEY = 'referralClaimed';
    var STORAGE_SEEN_KEY    = 'referralPanelSeen';

    // Milestone: refer N friends, earn milestone bonus
    var MILESTONE_GOAL  = 5;
    var MILESTONE_BONUS = 150.00; // $150 for 5 referrals

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

    function buildReferralLink(code) {
        return 'https://matrixspins.com?ref=' + (code || _referralCode);
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
        if (document.getElementById('referralStyles')) { return; }
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
            '#refPanel{position:fixed;bottom:260px;right:16px;z-index:19100;width:320px;max-width:92vw;' +
                'background:linear-gradient(160deg,#0d0d1a,#1a0a2e);' +
                'border:2px solid rgba(124,58,237,.4);border-radius:16px;' +
                'padding:20px;box-shadow:0 8px 40px rgba(124,58,237,.25);color:#e0e7ff;' +
                'transform:translateY(20px) scale(.95);opacity:0;pointer-events:none;' +
                'transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;' +
                'max-height:85vh;overflow-y:auto}',
            '#refPanel.active{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}',
            '.ref-title{font-size:16px;font-weight:900;color:#a78bfa;margin-bottom:4px;text-align:center}',
            '.ref-subtitle{font-size:11px;color:rgba(255,255,255,.4);text-align:center;margin-bottom:12px}',
            '.ref-offer-banner{background:linear-gradient(135deg,rgba(34,197,94,.12),rgba(59,130,246,.12));' +
                'border:1px solid rgba(34,197,94,.35);border-radius:12px;padding:10px 14px;' +
                'text-align:center;margin-bottom:12px}',
            '.ref-offer-main{font-size:18px;font-weight:900;color:#22c55e;letter-spacing:.5px}',
            '.ref-offer-sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:2px}',
            '.ref-link-box{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.25);' +
                'border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:6px;margin-bottom:10px}',
            '.ref-link-text{flex:1;font-size:10px;color:rgba(255,255,255,.45);overflow:hidden;' +
                'text-overflow:ellipsis;white-space:nowrap;font-family:monospace}',
            '.ref-link-copy-btn{flex-shrink:0;padding:5px 10px;border:none;border-radius:6px;' +
                'background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:11px;' +
                'font-weight:700;cursor:pointer;transition:opacity .2s}',
            '.ref-link-copy-btn:hover{opacity:.85}',
            '.ref-code-box{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);' +
                'border-radius:12px;padding:12px;text-align:center;margin-bottom:10px}',
            '.ref-code-label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}',
            '.ref-code-val{font-size:24px;font-weight:900;letter-spacing:4px;color:#a78bfa}',
            '.ref-share-label{font-size:10px;color:rgba(255,255,255,.3);text-transform:uppercase;' +
                'letter-spacing:1px;margin-bottom:6px;text-align:center}',
            '.ref-share-row{display:flex;gap:6px;margin-bottom:12px;justify-content:center}',
            '.ref-share-btn{flex:1;max-width:80px;padding:8px 4px;border:none;border-radius:8px;' +
                'font-size:11px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;' +
                'align-items:center;gap:2px;transition:transform .15s,opacity .15s}',
            '.ref-share-btn:hover{transform:translateY(-2px);opacity:.9}',
            '.ref-share-btn-wa{background:linear-gradient(135deg,#25d366,#128c7e);color:#fff}',
            '.ref-share-btn-tw{background:linear-gradient(135deg,#1da1f2,#0d8fd8);color:#fff}',
            '.ref-share-btn-tg{background:linear-gradient(135deg,#2ca5e0,#1a8abf);color:#fff}',
            '.ref-share-btn-cp{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff}',
            '.ref-share-ico{font-size:16px;line-height:1}',
            '.ref-share-lbl{font-size:9px;opacity:.85}',
            '.ref-milestone{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);' +
                'border-radius:10px;padding:10px 12px;margin-bottom:12px}',
            '.ref-milestone-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}',
            '.ref-milestone-title{font-size:11px;font-weight:700;color:#fbbf24}',
            '.ref-milestone-reward{font-size:11px;color:#22c55e;font-weight:700}',
            '.ref-milestone-bar-bg{height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}',
            '.ref-milestone-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#fbbf24,#f59e0b);' +
                'transition:width .5s ease}',
            '.ref-milestone-prog{font-size:10px;color:rgba(255,255,255,.35);margin-top:4px;text-align:right}',
            '.ref-stats-row{display:flex;gap:8px;margin-bottom:12px}',
            '.ref-stat-card{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);' +
                'border-radius:10px;padding:8px;text-align:center}',
            '.ref-stat-num{font-size:18px;font-weight:900;color:#a78bfa}',
            '.ref-stat-lbl{font-size:10px;color:rgba(255,255,255,.35);margin-top:2px}',
            '.ref-hist-title{font-size:10px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}',
            '.ref-hist-item{display:flex;justify-content:space-between;padding:4px 0;' +
                'border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;color:rgba(255,255,255,.5)}',
            '.ref-hist-bonus{color:#22c55e;font-weight:700}',
            '.ref-hist-empty{font-size:11px;color:rgba(255,255,255,.2);text-align:center;padding:8px 0;font-style:italic}',
            '.ref-copied{font-size:11px;color:#22c55e;text-align:center;height:16px;opacity:0;transition:opacity .2s;margin-bottom:4px}',
            '.ref-copied.show{opacity:1}',
            '.ref-close{display:block;margin:10px auto 0;background:none;border:none;color:rgba(255,255,255,.25);' +
                'font-size:11px;cursor:pointer;text-decoration:underline}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // Build an icon+label span safely without innerHTML
    function _makeShareBtnContent(icoChar, lblText) {
        var ico = document.createElement('span');
        ico.className = 'ref-share-ico';
        ico.textContent = icoChar;
        var lbl = document.createElement('span');
        lbl.className = 'ref-share-lbl';
        lbl.textContent = lblText;
        return [ico, lbl];
    }

    function buildFab() {
        if (_fabEl) return;
        injectStyles();
        _fabEl = document.createElement('div');
        _fabEl.id = 'refFab';
        _fabEl.title = 'Invite Friends \u2014 Earn $25 per referral!';
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
            // Load real server data (no-op if not authenticated)
            _loadServerReferralData();
        } else {
            _panelEl.classList.remove('active');
        }
    }

    // Open share URL in a new tab safely
    function openShareUrl(url) {
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function makeShareUrl(platform) {
        var link = buildReferralLink(_referralCode);
        var msg = 'I\u2019m playing at Matrix Spins casino! Join me and get a bonus using my referral link: ' + link;
        if (platform === 'wa') {
            return 'https://wa.me/?text=' + encodeURIComponent(msg);
        } else if (platform === 'tw') {
            return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(msg);
        } else if (platform === 'tg') {
            return 'https://t.me/share/url?url=' + encodeURIComponent(link) +
                '&text=' + encodeURIComponent('Join me on Matrix Spins casino and get a bonus!');
        }
        return link;
    }

    function buildPanel() {
        if (_panelEl) return;
        injectStyles();
        _panelEl = document.createElement('div');
        _panelEl.id = 'refPanel';

        // Title
        var title = document.createElement('div');
        title.className = 'ref-title';
        title.textContent = '\uD83D\uDC65 Invite Friends & Earn';

        var subtitle = document.createElement('div');
        subtitle.className = 'ref-subtitle';
        subtitle.textContent = 'Share Matrix Spins with friends';

        // Offer banner — $25 per referral
        var offerBanner = document.createElement('div');
        offerBanner.className = 'ref-offer-banner';
        var offerMain = document.createElement('div');
        offerMain.className = 'ref-offer-main';
        offerMain.textContent = 'Earn $' + REFERRAL_BONUS.toFixed(0) + ' for every friend who deposits!';
        var offerSub = document.createElement('div');
        offerSub.className = 'ref-offer-sub';
        offerSub.textContent = 'Credits added instantly when they make their first deposit';
        offerBanner.appendChild(offerMain);
        offerBanner.appendChild(offerSub);

        // Referral link box — one-click copy full link
        var linkBox = document.createElement('div');
        linkBox.className = 'ref-link-box';
        var linkText = document.createElement('span');
        linkText.className = 'ref-link-text';
        linkText.id = 'refLinkText';
        linkText.textContent = buildReferralLink(_referralCode);
        var linkCopyBtn = document.createElement('button');
        linkCopyBtn.className = 'ref-link-copy-btn';
        linkCopyBtn.id = 'refLinkCopyBtn';
        linkCopyBtn.textContent = '\uD83D\uDCCB Copy Link';
        linkCopyBtn.addEventListener('click', function() {
            copyText(buildReferralLink(_referralCode), true);
        });
        linkBox.appendChild(linkText);
        linkBox.appendChild(linkCopyBtn);

        // Code box
        var codeBox = document.createElement('div');
        codeBox.className = 'ref-code-box';
        var cLabel = document.createElement('div');
        cLabel.className = 'ref-code-label';
        cLabel.textContent = 'Your Referral Code';
        var cVal = document.createElement('div');
        cVal.className = 'ref-code-val';
        cVal.id = 'refCodeVal';
        cVal.textContent = _referralCode;
        codeBox.appendChild(cLabel);
        codeBox.appendChild(cVal);

        // Copied feedback
        var copied = document.createElement('div');
        copied.className = 'ref-copied';
        copied.id = 'refCopied';
        copied.textContent = '\u2705 Copied!';

        // Social share label
        var shareLabel = document.createElement('div');
        shareLabel.className = 'ref-share-label';
        shareLabel.textContent = 'Share via';

        // Social share buttons
        var shareRow = document.createElement('div');
        shareRow.className = 'ref-share-row';

        var waBtn = document.createElement('button');
        waBtn.className = 'ref-share-btn ref-share-btn-wa';
        waBtn.title = 'Share on WhatsApp';
        _makeShareBtnContent('\uD83D\uDCAC', 'WhatsApp').forEach(function(el) { waBtn.appendChild(el); });
        waBtn.addEventListener('click', function() { openShareUrl(makeShareUrl('wa')); });

        var twBtn = document.createElement('button');
        twBtn.className = 'ref-share-btn ref-share-btn-tw';
        twBtn.title = 'Share on Twitter / X';
        _makeShareBtnContent('\uD83D\uDC26', 'Twitter/X').forEach(function(el) { twBtn.appendChild(el); });
        twBtn.addEventListener('click', function() { openShareUrl(makeShareUrl('tw')); });

        var tgBtn = document.createElement('button');
        tgBtn.className = 'ref-share-btn ref-share-btn-tg';
        tgBtn.title = 'Share on Telegram';
        _makeShareBtnContent('\uD83D\uDCE8', 'Telegram').forEach(function(el) { tgBtn.appendChild(el); });
        tgBtn.addEventListener('click', function() { openShareUrl(makeShareUrl('tg')); });

        var cpBtn = document.createElement('button');
        cpBtn.className = 'ref-share-btn ref-share-btn-cp';
        cpBtn.title = 'Copy full share message';
        _makeShareBtnContent('\uD83D\uDCE4', 'Copy Msg').forEach(function(el) { cpBtn.appendChild(el); });
        cpBtn.addEventListener('click', function() {
            var link = buildReferralLink(_referralCode);
            var msg = 'I\u2019m playing at Matrix Spins casino and winning! Join me using my referral link to get a bonus: ' + link;
            copyText(msg, false);
        });

        shareRow.appendChild(waBtn);
        shareRow.appendChild(twBtn);
        shareRow.appendChild(tgBtn);
        shareRow.appendChild(cpBtn);

        // Milestone progress bar
        var milestone = document.createElement('div');
        milestone.className = 'ref-milestone';
        var msHdr = document.createElement('div');
        msHdr.className = 'ref-milestone-hdr';
        var msTitle = document.createElement('div');
        msTitle.className = 'ref-milestone-title';
        msTitle.textContent = '\uD83C\uDFC6 Milestone Bonus';
        var msReward = document.createElement('div');
        msReward.className = 'ref-milestone-reward';
        msReward.textContent = '$' + MILESTONE_BONUS.toFixed(0) + ' for ' + MILESTONE_GOAL + ' referrals';
        msHdr.appendChild(msTitle);
        msHdr.appendChild(msReward);
        var msBarBg = document.createElement('div');
        msBarBg.className = 'ref-milestone-bar-bg';
        var msBarFill = document.createElement('div');
        msBarFill.className = 'ref-milestone-bar-fill';
        msBarFill.id = 'refMsBarFill';
        var pct = Math.min(100, Math.round((_referralStats.count / MILESTONE_GOAL) * 100));
        msBarFill.style.width = pct + '%';
        msBarBg.appendChild(msBarFill);
        var msProg = document.createElement('div');
        msProg.className = 'ref-milestone-prog';
        msProg.id = 'refMsProg';
        msProg.textContent = _referralStats.count + ' / ' + MILESTONE_GOAL + ' friends';
        milestone.appendChild(msHdr);
        milestone.appendChild(msBarBg);
        milestone.appendChild(msProg);

        // Stats row — count + earned
        var statsRow = document.createElement('div');
        statsRow.className = 'ref-stats-row';

        var sc1 = document.createElement('div');
        sc1.className = 'ref-stat-card';
        var sc1Num = document.createElement('div');
        sc1Num.className = 'ref-stat-num';
        sc1Num.id = 'refStatCount';
        sc1Num.textContent = String(_referralStats.count);
        var sc1Lbl = document.createElement('div');
        sc1Lbl.className = 'ref-stat-lbl';
        sc1Lbl.textContent = 'Friends Referred';
        sc1.appendChild(sc1Num);
        sc1.appendChild(sc1Lbl);

        var sc2 = document.createElement('div');
        sc2.className = 'ref-stat-card';
        var sc2Num = document.createElement('div');
        sc2Num.className = 'ref-stat-num';
        sc2Num.id = 'refStatEarned';
        var totalEarned = (_referralStats.totalEarned !== undefined)
            ? _referralStats.totalEarned
            : (_referralStats.count * REFERRAL_BONUS);
        sc2Num.textContent = '$' + totalEarned.toFixed(0);
        var sc2Lbl = document.createElement('div');
        sc2Lbl.className = 'ref-stat-lbl';
        sc2Lbl.textContent = 'Total Earned';
        sc2.appendChild(sc2Num);
        sc2.appendChild(sc2Lbl);

        statsRow.appendChild(sc1);
        statsRow.appendChild(sc2);

        // History
        var histTitle = document.createElement('div');
        histTitle.className = 'ref-hist-title';
        histTitle.textContent = 'Referral History';

        var histList = document.createElement('div');
        histList.id = 'refHistList';
        _buildHistoryItems(histList, _referralStats.history);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'ref-close';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', togglePanel);

        _panelEl.appendChild(title);
        _panelEl.appendChild(subtitle);
        _panelEl.appendChild(offerBanner);
        _panelEl.appendChild(linkBox);
        _panelEl.appendChild(codeBox);
        _panelEl.appendChild(copied);
        _panelEl.appendChild(shareLabel);
        _panelEl.appendChild(shareRow);
        _panelEl.appendChild(milestone);
        _panelEl.appendChild(statsRow);
        _panelEl.appendChild(histTitle);
        _panelEl.appendChild(histList);
        _panelEl.appendChild(closeBtn);
        document.body.appendChild(_panelEl);
    }

    function _buildHistoryItems(container, history) {
        while (container.firstChild) container.removeChild(container.firstChild);
        if (!history || history.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'ref-hist-empty';
            empty.textContent = 'No referrals yet \u2014 share your code!';
            container.appendChild(empty);
            return;
        }
        for (var i = 0; i < history.length; i++) {
            var h = history[i];
            var item = document.createElement('div');
            item.className = 'ref-hist-item';
            var nm = document.createElement('span');
            nm.textContent = h.referee_username || h.name || '??***';
            var dt = document.createElement('span');
            dt.textContent = h.ts
                ? formatTimeAgo(h.ts)
                : (h.created_at ? formatTimeAgo(new Date(h.created_at).getTime()) : '');
            var bn = document.createElement('span');
            bn.className = 'ref-hist-bonus';
            var statusText = (h.status === 'completed')
                ? ('+$' + (h.bonus_paid || h.bonus || REFERRAL_BONUS).toFixed(2))
                : (h.status || '+$' + (h.bonus || REFERRAL_BONUS).toFixed(2));
            bn.textContent = statusText;
            item.appendChild(nm);
            item.appendChild(dt);
            item.appendChild(bn);
            container.appendChild(item);
        }
    }

    function copyText(text, isLink) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text)
                .then(function() { showCopied(isLink); })
                .catch(function() { fallbackCopy(text, isLink); });
        } else {
            fallbackCopy(text, isLink);
        }
    }

    function fallbackCopy(text, isLink) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showCopied(isLink);
        } catch (e) {}
    }

    function showCopied(isLink) {
        // Update link copy button text temporarily for link copies
        if (isLink) {
            var linkBtn = document.getElementById('refLinkCopyBtn');
            if (linkBtn) {
                linkBtn.textContent = '\u2705 Copied!';
                setTimeout(function() {
                    linkBtn.textContent = '\uD83D\uDCCB Copy Link';
                }, 2000);
            }
        }
        var el = document.getElementById('refCopied');
        if (!el) return;
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 2000);
    }

    // ── Server API integration ────────────────────────────────────────
    function _getAuthToken() {
        var key = (typeof STORAGE_KEY_AUTH_TOKEN !== 'undefined')
            ? STORAGE_KEY_AUTH_TOKEN
            : 'matrix_auth_token';
        try { return localStorage.getItem(key) || localStorage.getItem('matrix_auth_token'); } catch (e) { return null; }
    }

    function _updatePanelCode(code) {
        _referralCode = code;
        var codeEl = document.getElementById('refCodeVal');
        if (codeEl) codeEl.textContent = code;
        var linkEl = document.getElementById('refLinkText');
        if (linkEl) linkEl.textContent = buildReferralLink(code);
    }

    function _updatePanelStats(count, bonusEarned) {
        _referralStats.count = count;
        if (typeof bonusEarned === 'number') _referralStats.totalEarned = bonusEarned;

        var countEl = document.getElementById('refStatCount');
        if (countEl) countEl.textContent = String(count);

        var earnedEl = document.getElementById('refStatEarned');
        if (earnedEl) earnedEl.textContent = '$' + (bonusEarned || 0).toFixed(0);

        // Update milestone bar
        var barFill = document.getElementById('refMsBarFill');
        var barProg = document.getElementById('refMsProg');
        if (barFill) barFill.style.width = Math.min(100, Math.round((count / MILESTONE_GOAL) * 100)) + '%';
        if (barProg) barProg.textContent = count + ' / ' + MILESTONE_GOAL + ' friends';
    }

    function _updatePanelHistory(referrals) {
        var histList = document.getElementById('refHistList');
        if (!histList || !referrals) return;
        _buildHistoryItems(histList, referrals);
        _referralStats.history = referrals;
    }

    function _loadServerReferralData() {
        var token = _getAuthToken();
        if (!token) return; // No auth — remain on localStorage fallback

        // Fetch referral info
        fetch('/api/referral/info', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(function(res) {
            if (!res.ok) return null;
            return res.json();
        }).then(function(data) {
            if (!data || !data.code) return;
            try { localStorage.setItem(STORAGE_CODE_KEY, data.code); } catch (e) {}
            _updatePanelCode(data.code);
            _updatePanelStats(data.totalReferrals || 0, data.totalEarned || 0);
        }).catch(function() { /* silent — keep localStorage fallback */ });

        // Fetch referral history
        fetch('/api/referral/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(function(res) {
            if (!res.ok) return null;
            return res.json();
        }).then(function(data) {
            if (!data || !Array.isArray(data.referrals)) return;
            _updatePanelHistory(data.referrals);
        }).catch(function() { /* silent */ });
    }

    function processIncomingReferral() {
        var qs = window.location.search || '';
        var match = qs.match(/[?&]ref=([A-Z0-9]{6})/);
        if (!match) return;
        try { if (localStorage.getItem(STORAGE_CLAIMED_KEY) === '1') return; } catch (e) {}
        try { localStorage.setItem(STORAGE_CLAIMED_KEY, '1'); } catch (e) {}
        if (typeof balance !== 'undefined') { balance += 5.00; balance = Math.round(balance * 100) / 100; }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
        if (typeof showWinToast === 'function') {
            setTimeout(function() {
                showWinToast('Welcome! Your friend earns $' + REFERRAL_BONUS.toFixed(0) + ' when you make your first deposit!', 'epic');
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
    window.getReferralLink = function() { return buildReferralLink(_referralCode); };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
