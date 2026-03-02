// ═══════════════════════════════════════════════════════
// UI-CHALLENGES MODULE
// Daily Challenges modal + Wager Race leaderboard
// All DOM nodes built via createElement/textContent (no innerHTML)
// to avoid XSS vectors. API data set only via .textContent.
// ═══════════════════════════════════════════════════════

(function() {
    'use strict';

    // ── Auth token helper ─────────────────────────────────────
    function _getAuthToken() {
        var key = (typeof STORAGE_KEY_TOKEN !== 'undefined') ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key) || null;
    }

    function _authHeaders() {
        var token = _getAuthToken();
        if (!token) return {};
        return { 'Authorization': 'Bearer ' + token };
    }

    // ── Toast helper ──────────────────────────────────────────
    function showChallengeToast(msg, type) {
        if (typeof showToast === 'function') {
            showToast(msg, type || 'success');
            return;
        }
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
            'background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;' +
            'font-weight:700;z-index:9999;font-size:15px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
    }

    // ── Modal overlay ─────────────────────────────────────────
    var MODAL_ID = 'challengesModalOverlay';

    function _getOrCreateOverlay() {
        var existing = document.getElementById(MODAL_ID);
        if (existing) return existing;

        var overlay = document.createElement('div');
        overlay.id                   = MODAL_ID;
        overlay.style.position       = 'fixed';
        overlay.style.top            = '0';
        overlay.style.left           = '0';
        overlay.style.right          = '0';
        overlay.style.bottom         = '0';
        overlay.style.background     = 'rgba(0,0,0,0.75)';
        overlay.style.zIndex         = '10000';
        overlay.style.display        = 'flex';
        overlay.style.alignItems     = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding        = '16px';
        overlay.style.boxSizing      = 'border-box';
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeChallengesModal();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeChallengesModal() {
        var overlay = document.getElementById(MODAL_ID);
        if (!overlay) return;
        overlay.style.opacity    = '0';
        overlay.style.transition = 'opacity 0.2s';
        setTimeout(function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
    }

    // ── Countdown formatter ───────────────────────────────────
    function _formatCountdown(endsAt) {
        if (!endsAt) return 'unknown';
        var diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) return 'ended';
        var d = Math.floor(diff / 86400000);
        var h = Math.floor((diff % 86400000) / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        if (d > 0) return d + 'd ' + h + 'h';
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm';
    }

    // ── Progress bar DOM builder ──────────────────────────────
    function _makeProgressBar(progress, target) {
        var pct   = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
        var color = pct >= 100 ? '#10b981' : '#fbbf24';

        var wrap = document.createElement('div');
        wrap.style.margin = '6px 0 4px';

        var track = document.createElement('div');
        track.style.background   = '#1e293b';
        track.style.borderRadius = '4px';
        track.style.height       = '6px';
        track.style.overflow     = 'hidden';

        var fill = document.createElement('div');
        fill.style.width        = pct + '%';
        fill.style.height       = '100%';
        fill.style.background   = color;
        fill.style.borderRadius = '4px';
        fill.style.transition   = 'width 0.4s';
        track.appendChild(fill);

        var label = document.createElement('div');
        label.style.fontSize  = '11px';
        label.style.color     = '#94a3b8';
        label.style.marginTop = '3px';
        label.textContent = progress + ' / ' + target;

        wrap.appendChild(track);
        wrap.appendChild(label);
        return wrap;
    }

    // ── Challenge type icon ───────────────────────────────────
    function _challengeIcon(ch) {
        var type = (ch.type || '').toLowerCase();
        var icons = {
            spins:   '\uD83C\uDFB0',
            wins:    '\uD83C\uDFC6',
            games:   '\uD83C\uDFAE',
            wager:   '\uD83D\uDCB0',
            bonus:   '\uD83C\uDF81',
            streak:  '\uD83D\uDD25',
            winmult: '\uD83D\uDCA5',
            bigwin:  '\uD83D\uDCA5'
        };
        return icons[type] || '\uD83C\uDFAF';
    }

    // ── Challenge card DOM node ───────────────────────────────
    function _makeChallengeCard(ch) {
        var progress  = ch.progress  || 0;
        var target    = ch.target    || 1;
        var completed = ch.completed || false;

        var card = document.createElement('div');
        card.style.display      = 'flex';
        card.style.alignItems   = 'flex-start';
        card.style.gap          = '12px';
        card.style.padding      = '12px';
        card.style.borderRadius = '8px';
        card.style.marginBottom = '8px';
        card.style.background   = completed ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)';
        card.style.border       = '1px solid ' + (completed ? '#10b981' : '#334155');

        var iconEl = document.createElement('div');
        iconEl.style.fontSize   = '24px';
        iconEl.style.lineHeight = '1';
        iconEl.style.flexShrink = '0';
        iconEl.style.marginTop  = '2px';
        iconEl.textContent      = _challengeIcon(ch);

        var info = document.createElement('div');
        info.style.flex     = '1';
        info.style.minWidth = '0';

        var titleEl = document.createElement('div');
        titleEl.style.fontSize   = '13px';
        titleEl.style.fontWeight = '700';
        titleEl.style.color      = '#e2e8f0';
        titleEl.textContent      = ch.title || 'Challenge';

        var descEl = document.createElement('div');
        descEl.style.fontSize  = '11px';
        descEl.style.color     = '#94a3b8';
        descEl.style.margin    = '2px 0 4px';
        descEl.textContent     = ch.description || '';

        info.appendChild(titleEl);
        info.appendChild(descEl);
        info.appendChild(_makeProgressBar(progress, target));

        var rewardParts = [];
        if (ch.reward_xp)   rewardParts.push('+' + ch.reward_xp + ' XP');
        if (ch.reward_gems) rewardParts.push('+' + ch.reward_gems + ' \uD83D\uDC8E');
        if (rewardParts.length) {
            var rewardEl = document.createElement('div');
            rewardEl.style.fontSize  = '11px';
            rewardEl.style.color     = '#fbbf24';
            rewardEl.style.marginTop = '4px';
            rewardEl.textContent     = rewardParts.join(' ');
            info.appendChild(rewardEl);
        }

        card.appendChild(iconEl);
        card.appendChild(info);

        if (completed) {
            var aside = document.createElement('div');
            aside.style.display       = 'flex';
            aside.style.flexDirection = 'column';
            aside.style.alignItems    = 'flex-end';
            aside.style.flexShrink    = '0';
            aside.style.gap           = '6px';

            var checkEl = document.createElement('span');
            checkEl.style.fontSize = '20px';
            checkEl.textContent    = '\u2705';

            var claimBtn = document.createElement('button');
            claimBtn.style.background   = '#10b981';
            claimBtn.style.color        = '#fff';
            claimBtn.style.border       = 'none';
            claimBtn.style.borderRadius = '6px';
            claimBtn.style.padding      = '5px 12px';
            claimBtn.style.fontSize     = '12px';
            claimBtn.style.fontWeight   = '700';
            claimBtn.style.cursor       = 'pointer';
            claimBtn.style.whiteSpace   = 'nowrap';
            claimBtn.textContent        = 'Claim';
            (function(chId) {
                claimBtn.addEventListener('click', function() { window.claimChallenge(chId); });
            })(ch.id);

            aside.appendChild(checkEl);
            aside.appendChild(claimBtn);
            card.appendChild(aside);
        }

        return card;
    }

    // ── Leaderboard row ───────────────────────────────────────
    var MEDAL      = ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    var RANK_COLOR = ['', '#fbbf24',     '#94a3b8',      '#cd7f32'];

    function _makeLeaderboardRow(entry, index) {
        var rank   = entry.rank || (index + 1);
        var isTop3 = rank <= 3;
        var rowBg  = rank === 1 ? 'rgba(251,191,36,0.10)'
                   : rank === 2 ? 'rgba(148,163,184,0.08)'
                   : rank === 3 ? 'rgba(205,127,50,0.08)' : 'transparent';

        var tr = document.createElement('tr');
        tr.style.background = rowBg;
        if (isTop3) tr.style.fontWeight = '700';

        var tdRank = document.createElement('td');
        tdRank.style.padding   = '8px 10px';
        tdRank.style.textAlign = 'center';
        tdRank.style.fontSize  = '14px';
        if (MEDAL[rank]) {
            tdRank.textContent = MEDAL[rank];
        } else {
            tdRank.style.color = '#64748b';
            tdRank.textContent = String(rank);
        }

        var tdUser = document.createElement('td');
        tdUser.style.padding  = '8px 10px';
        tdUser.style.color    = '#e2e8f0';
        tdUser.style.fontSize = '13px';
        tdUser.textContent    = entry.username || 'Player';

        var tdWager = document.createElement('td');
        tdWager.style.padding   = '8px 10px';
        tdWager.style.textAlign = 'right';
        tdWager.style.color     = '#94a3b8';
        tdWager.style.fontSize  = '13px';
        tdWager.textContent = '$' + Number(entry.wagered || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

        var tdPrize = document.createElement('td');
        tdPrize.style.padding    = '8px 10px';
        tdPrize.style.textAlign  = 'right';
        tdPrize.style.color      = '#10b981';
        tdPrize.style.fontSize   = '13px';
        tdPrize.style.fontWeight = '700';
        tdPrize.textContent = entry.prize
            ? '$' + Number(entry.prize).toLocaleString('en-US', { maximumFractionDigits: 0 })
            : '\u2014';

        tr.appendChild(tdRank);
        tr.appendChild(tdUser);
        tr.appendChild(tdWager);
        tr.appendChild(tdPrize);
        return tr;
    }

    // ── Leaderboard table ─────────────────────────────────────
    function _makeLeaderboardTable(entries) {
        if (!entries || entries.length === 0) {
            var empty = document.createElement('div');
            empty.style.color    = '#64748b';
            empty.style.fontSize = '13px';
            empty.style.padding  = '8px 0';
            empty.textContent    = 'No entries yet. Be the first!';
            return empty;
        }

        var wrap = document.createElement('div');
        wrap.style.overflowX = 'auto';

        var table = document.createElement('table');
        table.style.width          = '100%';
        table.style.borderCollapse = 'collapse';

        var thead = document.createElement('thead');
        var hRow  = document.createElement('tr');
        hRow.style.borderBottom = '1px solid #334155';

        var cols = [['#', 'center'], ['Player', 'left'], ['Wagered', 'right'], ['Prize', 'right']];
        cols.forEach(function(col) {
            var th = document.createElement('th');
            th.style.padding       = '6px 10px';
            th.style.textAlign     = col[1];
            th.style.color         = '#64748b';
            th.style.fontSize      = '11px';
            th.style.fontWeight    = '600';
            th.style.textTransform = 'uppercase';
            th.style.letterSpacing = '0.5px';
            th.textContent         = col[0];
            hRow.appendChild(th);
        });
        thead.appendChild(hRow);

        var tbody = document.createElement('tbody');
        entries.forEach(function(e, i) { tbody.appendChild(_makeLeaderboardRow(e, i)); });

        table.appendChild(thead);
        table.appendChild(tbody);
        wrap.appendChild(table);
        return wrap;
    }

    // ── Section heading ───────────────────────────────────────
    function _makeSectionHeading(title, sub) {
        var wrap = document.createElement('div');
        wrap.style.marginBottom = '12px';
        wrap.style.marginTop    = '4px';

        var h = document.createElement('div');
        h.style.fontSize      = '13px';
        h.style.fontWeight    = '700';
        h.style.color         = '#fbbf24';
        h.style.textTransform = 'uppercase';
        h.style.letterSpacing = '0.8px';
        h.textContent         = title;
        wrap.appendChild(h);

        if (sub) {
            var s = document.createElement('div');
            s.style.fontSize  = '11px';
            s.style.color     = '#64748b';
            s.style.marginTop = '2px';
            s.textContent     = sub;
            wrap.appendChild(s);
        }
        return wrap;
    }

    // ── Render modal body ─────────────────────────────────────
    function _renderModalBody(body, challenges, race, leaderboard) {
        while (body.firstChild) body.removeChild(body.firstChild);

        // Active Challenges
        body.appendChild(_makeSectionHeading('Active Challenges', 'Complete challenges to earn XP and gems'));

        if (!challenges || challenges.length === 0) {
            var noChall = document.createElement('div');
            noChall.style.color    = '#64748b';
            noChall.style.fontSize = '13px';
            noChall.style.padding  = '12px 0';
            noChall.textContent    = 'Check back tomorrow for new challenges!';
            body.appendChild(noChall);
        } else {
            challenges.forEach(function(ch) { body.appendChild(_makeChallengeCard(ch)); });
        }

        // Divider
        var divider = document.createElement('div');
        divider.style.height     = '1px';
        divider.style.background = '#1e293b';
        divider.style.margin     = '20px 0';
        body.appendChild(divider);

        // Wager Race
        body.appendChild(_makeSectionHeading('Wager Race', 'Compete to climb the leaderboard'));

        if (!race) {
            var noRace = document.createElement('div');
            noRace.style.background   = 'rgba(255,255,255,0.03)';
            noRace.style.border       = '1px solid #1e293b';
            noRace.style.borderRadius = '8px';
            noRace.style.padding      = '20px';
            noRace.style.textAlign    = 'center';
            noRace.style.color        = '#64748b';
            noRace.style.fontSize     = '13px';
            noRace.textContent        = 'No active race right now \u2014 check back soon!';
            body.appendChild(noRace);
        } else {
            // Race info banner
            var raceBanner = document.createElement('div');
            raceBanner.style.background   = 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.04))';
            raceBanner.style.border       = '1px solid rgba(251,191,36,0.3)';
            raceBanner.style.borderRadius = '8px';
            raceBanner.style.padding      = '14px 16px';
            raceBanner.style.marginBottom = '12px';

            var raceTitle = document.createElement('div');
            raceTitle.style.fontSize     = '15px';
            raceTitle.style.fontWeight   = '700';
            raceTitle.style.color        = '#fbbf24';
            raceTitle.style.marginBottom = '6px';
            raceTitle.textContent        = '\uD83C\uDFC6 ' + (race.title || 'Wager Race');

            var raceMeta = document.createElement('div');
            raceMeta.style.display  = 'flex';
            raceMeta.style.gap      = '20px';
            raceMeta.style.flexWrap = 'wrap';

            if (race.prizePool) {
                var prizeEl    = document.createElement('div');
                prizeEl.style.fontSize = '12px';
                prizeEl.style.color    = '#94a3b8';
                var prizeLabel = document.createElement('span');
                prizeLabel.textContent = 'Prize Pool: ';
                var prizeVal   = document.createElement('span');
                prizeVal.style.color      = '#10b981';
                prizeVal.style.fontWeight = '700';
                prizeVal.textContent = '$' + Number(race.prizePool).toLocaleString('en-US', { maximumFractionDigits: 0 });
                prizeEl.appendChild(prizeLabel);
                prizeEl.appendChild(prizeVal);
                raceMeta.appendChild(prizeEl);
            }

            var endsEl    = document.createElement('div');
            endsEl.style.fontSize = '12px';
            endsEl.style.color    = '#94a3b8';
            var endsLabel = document.createElement('span');
            endsLabel.textContent = 'Ends in: ';
            var endsVal   = document.createElement('span');
            endsVal.style.color      = '#e2e8f0';
            endsVal.style.fontWeight = '700';
            endsVal.textContent = _formatCountdown(race.endsAt);
            endsEl.appendChild(endsLabel);
            endsEl.appendChild(endsVal);
            raceMeta.appendChild(endsEl);

            raceBanner.appendChild(raceTitle);
            raceBanner.appendChild(raceMeta);
            body.appendChild(raceBanner);
            body.appendChild(_makeLeaderboardTable(leaderboard));
        }

        // Bottom padding
        var pad = document.createElement('div');
        pad.style.height = '12px';
        body.appendChild(pad);
    }

    // ── Data fetch helpers ────────────────────────────────────
    function _fetchChallenges() {
        return fetch('/api/challenges', { headers: _authHeaders() })
            .then(function(r) { return r.ok ? r.json() : { challenges: [] }; })
            .then(function(d) { return d.challenges || []; })
            .catch(function() { return []; });
    }

    function _fetchWagerRace() {
        var h = _authHeaders();
        return Promise.all([
            fetch('/api/wagerace/active', { headers: h })
                .then(function(r) { return r.ok ? r.json() : { race: null }; })
                .then(function(d) { return d.race || null; })
                .catch(function() { return null; }),
            fetch('/api/wagerace/leaderboard', { headers: h })
                .then(function(r) { return r.ok ? r.json() : { leaderboard: [] }; })
                .then(function(d) { return d.leaderboard || []; })
                .catch(function() { return []; })
        ]);
    }

    // ── Build modal panel DOM ─────────────────────────────────
    function _buildPanel() {
        var panel = document.createElement('div');
        panel.id                  = 'challengesModalPanel';
        panel.style.background    = '#0f0f1a';
        panel.style.border        = '1px solid #334155';
        panel.style.borderRadius  = '12px';
        panel.style.width         = '100%';
        panel.style.maxWidth      = '560px';
        panel.style.maxHeight     = '85vh';
        panel.style.display       = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.overflow      = 'hidden';
        panel.style.boxShadow     = '0 24px 48px rgba(0,0,0,0.7)';

        // Header
        var header = document.createElement('div');
        header.style.display        = 'flex';
        header.style.alignItems     = 'center';
        header.style.justifyContent = 'space-between';
        header.style.padding        = '16px 20px';
        header.style.borderBottom   = '1px solid #1e293b';
        header.style.flexShrink     = '0';

        var htitle = document.createElement('div');
        htitle.style.fontSize      = '18px';
        htitle.style.fontWeight    = '800';
        htitle.style.color         = '#e2e8f0';
        htitle.style.letterSpacing = '0.3px';
        htitle.textContent         = '\uD83C\uDFAF Daily Challenges';

        var closeBtn = document.createElement('button');
        closeBtn.style.background = 'none';
        closeBtn.style.border     = 'none';
        closeBtn.style.color      = '#94a3b8';
        closeBtn.style.fontSize   = '22px';
        closeBtn.style.cursor     = 'pointer';
        closeBtn.style.lineHeight = '1';
        closeBtn.style.padding    = '0 4px';
        closeBtn.style.transition = 'color 0.2s';
        closeBtn.textContent      = '\u00D7';
        closeBtn.addEventListener('click', closeChallengesModal);
        closeBtn.addEventListener('mouseover', function() { this.style.color = '#e2e8f0'; });
        closeBtn.addEventListener('mouseout',  function() { this.style.color = '#94a3b8'; });

        header.appendChild(htitle);
        header.appendChild(closeBtn);

        // Scrollable body
        var body = document.createElement('div');
        body.id              = 'challengesModalBody';
        body.style.flex      = '1';
        body.style.overflowY = 'auto';
        body.style.padding   = '16px 20px';

        var loading = document.createElement('div');
        loading.style.textAlign = 'center';
        loading.style.padding   = '32px';
        loading.style.color     = '#64748b';
        loading.textContent     = 'Loading...';
        body.appendChild(loading);

        panel.appendChild(header);
        panel.appendChild(body);
        return panel;
    }

    // ── Public: open challenges modal ─────────────────────────
    window.openChallengesModal = function openChallengesModal() {
        var overlay = _getOrCreateOverlay();
        while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
        overlay.style.opacity    = '0';
        overlay.style.transition = 'opacity 0.2s';

        var panel = _buildPanel();
        overlay.appendChild(panel);

        // Fade in (double-RAF for layout settle)
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { overlay.style.opacity = '1'; });
        });

        var body = document.getElementById('challengesModalBody');
        Promise.all([_fetchChallenges(), _fetchWagerRace()])
            .then(function(results) {
                if (body) _renderModalBody(body, results[0], results[1][0], results[1][1]);
            })
            .catch(function() {
                if (body) {
                    while (body.firstChild) body.removeChild(body.firstChild);
                    var errEl = document.createElement('div');
                    errEl.style.textAlign = 'center';
                    errEl.style.padding   = '32px';
                    errEl.style.color     = '#ef4444';
                    errEl.textContent     = 'Failed to load challenges. Please try again.';
                    body.appendChild(errEl);
                }
            });
    };

    // ── Public: close modal ───────────────────────────────────
    window.closeChallengesModal = closeChallengesModal;

    // ── Public: claim a challenge ─────────────────────────────
    window.claimChallenge = function claimChallenge(id) {
        if (!_getAuthToken()) {
            showChallengeToast('Please log in to claim rewards.', 'error');
            return;
        }

        fetch('/api/challenges/' + encodeURIComponent(id) + '/claim', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeaders())
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                var parts = ['\uD83C\uDF89'];
                if (data.xpAwarded)   parts.push('+' + data.xpAwarded + ' XP');
                if (data.gemsAwarded) parts.push('+' + data.gemsAwarded + ' \uD83D\uDC8E');
                showChallengeToast(parts.join(' '), 'success');

                // Credit XP client-side if available
                if (data.xpAwarded && typeof gainXP === 'function') gainXP(data.xpAwarded);

                // Refresh modal body
                var body = document.getElementById('challengesModalBody');
                if (body) {
                    while (body.firstChild) body.removeChild(body.firstChild);
                    var refreshing = document.createElement('div');
                    refreshing.style.textAlign = 'center';
                    refreshing.style.padding   = '32px';
                    refreshing.style.color     = '#64748b';
                    refreshing.textContent     = 'Refreshing...';
                    body.appendChild(refreshing);

                    Promise.all([_fetchChallenges(), _fetchWagerRace()])
                        .then(function(results) {
                            _renderModalBody(body, results[0], results[1][0], results[1][1]);
                            if (typeof window.refreshChallengesWidget === 'function') {
                                window.refreshChallengesWidget();
                            }
                        });
                }
            } else {
                showChallengeToast(data.error || 'Already claimed or not yet complete.', 'info');
            }
        })
        .catch(function() {
            showChallengeToast('Network error. Please try again.', 'error');
        });
    };

    // ── Public: refresh lobby challenges bar ──────────────────
    window.refreshChallengesWidget = function refreshChallengesWidget() {
        var bar = document.getElementById('challengesBar');
        if (!bar) return;

        _fetchChallenges().then(function(challenges) {
            var total    = challenges.length;
            var complete = challenges.filter(function(c) { return c.completed; }).length;

            var countEl = document.getElementById('challengesBarCount');
            if (countEl) countEl.textContent = complete + '/' + total + ' complete';

            // Dot badge: visible when completed challenges exist (to prompt claiming)
            var dot = document.getElementById('challengesBarDot');
            if (dot) dot.style.display = complete > 0 ? 'inline-block' : 'none';
        }).catch(function() {});
    };

    // ── Escape key: close modal ───────────────────────────────
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById(MODAL_ID)) {
            closeChallengesModal();
        }
    });

})();
