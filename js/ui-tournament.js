// ===============================================================================
// UI-TOURNAMENT MODULE — Active/Upcoming tournament cards, live leaderboard, join flow
// DOM text from API always set via .textContent — no innerHTML on user data.
// ===============================================================================

(function () {
    'use strict';

    // ── Constants ─────────────────────────────────────────────────────────────
    var OVERLAY_ID         = 'tournamentOverlay';
    var MODAL_ID           = 'tournamentModal';
    var STYLE_ID           = 'tournamentStyles';
    var REFRESH_INTERVAL   = 15000;
    var COUNTDOWN_INTERVAL = 1000;

    // ── Module state ──────────────────────────────────────────────────────────
    var _leaderboardTimer = null;
    var _countdownTimer   = null;
    var _activeTab        = 'active';
    var _tournamentsData  = null;
    var _leaderboards     = {};
    var _joinedIds        = {};

    // ── Auth helpers ──────────────────────────────────────────────────────────
    function _getToken() {
        var key = (typeof STORAGE_KEY_TOKEN !== 'undefined') ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key) || null;
    }

    function _authHeaders() {
        var token = _getToken();
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    function _getCurrentUserId() {
        try {
            var token = _getToken();
            if (!token) return null;
            var parts = token.split('.');
            if (!parts[1]) return null;
            var decoded = JSON.parse(atob(parts[1]));
            return decoded.userId || decoded.id || null;
        } catch (e) { return null; }
    }

    // ── CSS injection ─────────────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            ".tournament-modal { max-width:700px; width:100%; max-height:85vh; overflow-y:auto; background:#1a1a2e; border:1px solid #2a2a4e; border-radius:16px; box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 60px rgba(255,200,0,0.08); padding:0; position:relative; scrollbar-width:thin; scrollbar-color:#444 #1a1a2e; }",
            ".tournament-modal::-webkit-scrollbar { width:6px; }",
            ".tournament-modal::-webkit-scrollbar-track { background:#1a1a2e; }",
            ".tournament-modal::-webkit-scrollbar-thumb { background:#444; border-radius:3px; }",
            ".tourney-header { background:linear-gradient(135deg,#0d0d1a 0%,#1a1a3e 100%); border-bottom:1px solid #2a2a4e; padding:20px 24px 16px; position:sticky; top:0; z-index:10; }",
            ".tourney-header-row { display:flex; align-items:center; justify-content:space-between; }",
            ".tourney-title { font-size:22px; font-weight:900; color:#ffd700; letter-spacing:2px; margin:0; text-shadow:0 0 20px rgba(255,215,0,0.4); }",
            ".tourney-close-btn { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#aaa; font-size:20px; width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; padding:0; }",
            ".tourney-close-btn:hover { background:rgba(255,100,100,0.2); color:#fff; border-color:rgba(255,100,100,0.4); }",
            ".tourney-season { font-size:12px; color:#888; margin-top:4px; letter-spacing:1px; }",
            ".tourney-tabs { display:flex; gap:8px; margin-top:14px; }",
            ".tourney-tab { padding:7px 20px; border-radius:20px; border:1px solid #333; background:transparent; color:#888; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:0.5px; transition:all 0.2s; }",
            ".tourney-tab:hover { color:#ccc; border-color:#555; }",
            ".tourney-tab.active { background:rgba(255,215,0,0.12); color:#ffd700; border-color:#ffd700; box-shadow:0 0 12px rgba(255,215,0,0.2); }",
            ".tourney-body { padding:16px 20px 24px; }",
            ".tourney-section { display:none; }",
            ".tourney-section.active { display:block; }",
            ".tourney-card { background:#0f0f22; border:1px solid #2a2a4e; border-radius:12px; margin-bottom:16px; overflow:hidden; transition:border-color 0.2s; }",
            ".tourney-card:hover { border-color:#3a3a6e; }",
            ".tourney-card-header { padding:14px 16px 12px; border-bottom:1px solid #1e1e3a; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }",
            ".tourney-card-title-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }",
            ".tourney-card-name { font-size:15px; font-weight:800; color:#e8e8ff; margin:0; }",
            ".tourney-type-badge { font-size:10px; font-weight:700; letter-spacing:1px; padding:2px 8px; border-radius:20px; text-transform:uppercase; }",
            ".tourney-type-badge.hourly { background:rgba(255,140,0,0.2); color:#ff8c00; border:1px solid rgba(255,140,0,0.4); }",
            ".tourney-type-badge.daily { background:rgba(147,51,234,0.2); color:#a855f7; border:1px solid rgba(147,51,234,0.4); }",
            ".tourney-type-badge.weekly { background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.4); }",
            ".tourney-prize-pool { font-size:20px; font-weight:900; color:#ffd700; white-space:nowrap; text-shadow:0 0 12px rgba(255,215,0,0.35); }",
            ".tourney-card-meta { padding:10px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; border-bottom:1px solid #1e1e3a; }",
            ".tourney-countdown { font-family:monospace; font-size:14px; font-weight:700; color:#00e5ff; text-shadow:0 0 8px rgba(0,229,255,0.4); }",
            ".tourney-entry-count { font-size:12px; color:#888; }",
            ".tourney-entry-count span { color:#aaa; font-weight:700; }",
            ".tourney-prizes { font-size:11px; color:#666; letter-spacing:0.3px; }",
            ".tourney-card-actions { padding:12px 16px; border-bottom:1px solid #1e1e3a; }",
            ".tourney-join-btn { width:100%; padding:10px 0; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:800; font-size:14px; letter-spacing:1px; border:none; border-radius:8px; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 16px rgba(16,185,129,0.3); }",
            ".tourney-join-btn:hover:not(:disabled) { background:linear-gradient(135deg,#34d399,#10b981); box-shadow:0 6px 20px rgba(16,185,129,0.45); transform:translateY(-1px); }",
            ".tourney-join-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }",
            ".tourney-playing-badge { width:100%; padding:10px 0; background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:14px; letter-spacing:1px; border:1px solid rgba(16,185,129,0.4); border-radius:8px; text-align:center; cursor:default; }",
            ".tourney-join-error { font-size:12px; color:#f87171; margin-top:6px; text-align:center; display:none; }",
            ".tourney-leaderboard { padding:12px 16px 14px; }",
            ".tourney-lb-title { font-size:11px; font-weight:700; color:#555; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; }",
            ".tourney-lb-row { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:6px; margin-bottom:3px; transition:background 0.15s; }",
            ".tourney-lb-row:hover { background:rgba(255,255,255,0.03); }",
            ".tourney-lb-row.my-rank { background:rgba(255,215,0,0.07); border:1px solid rgba(255,215,0,0.25); }",
            ".tourney-lb-medal { width:22px; font-size:14px; text-align:center; flex-shrink:0; }",
            ".tourney-lb-rank-num { width:22px; text-align:center; font-size:12px; color:#555; font-weight:700; flex-shrink:0; }",
            ".tourney-lb-name { flex:1; font-size:13px; color:#ccc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
            ".tourney-lb-row.my-rank .tourney-lb-name { color:#ffd700; }",
            ".tourney-lb-score { font-size:13px; color:#00e5ff; font-weight:700; font-family:monospace; }",
            ".tourney-lb-empty { font-size:13px; color:#555; text-align:center; padding:10px 0 4px; font-style:italic; }",
            ".tourney-loading { text-align:center; color:#555; padding:40px 20px; font-size:14px; }",
            ".tourney-error-msg { text-align:center; color:#f87171; padding:40px 20px; font-size:14px; }",
            ".tourney-empty-state { text-align:center; color:#555; padding:40px 20px; font-size:14px; }",
            ".tourney-starts-at { font-size:12px; color:#888; }"
        ].join(String.fromCharCode(10));
        document.head.appendChild(s);
    }

    // ── Countdown & format helpers ────────────────────────────────────────────
    function _msRemaining(endsAt) {
        return Math.max(0, new Date(endsAt).getTime() - Date.now());
    }
    function _formatCountdown(ms) {
        if (ms <= 0) return '00:00';
        var s = Math.floor(ms / 1000);
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        var sc = s % 60;
        function p(n) { return n < 10 ? ("0" + n) : String(n); }
        return (h > 0 ? p(h) + ':' + p(m) + ':' + p(sc) : p(m) + ':' + p(sc)) + ' remaining';
    }
    function _formatStartsAt(startsAt) {
        try {
            var d = new Date(startsAt);
            return 'Starts ' + d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        } catch(e) {
            return 'Starting soon';
        }
    }
    function _formatScore(score) {
        var n = parseFloat(score);
        return isNaN(n) ? '0×' : n.toFixed(1) + '×';
    }
    function _typeBadgeClass(type) {
        if (!type) return "daily";
        var t = String(type).toLowerCase();
        if (t === "hourly") return "hourly";
        if (t === "weekly") return "weekly";
        return "daily";
    }
    function _buildPrizeText(pool) {
        pool = parseFloat(pool) || 0;
        if (pool <= 0) return null;
        var a=(pool*0.40).toFixed(0), b=(pool*0.25).toFixed(0), d=(pool*0.15).toFixed(0);
        return '1st: $'+a+' · 2nd: $'+b+' · 3rd: $'+d;
    }

    // ── Leaderboard rows builder ──────────────────────────────────────────────
    function _buildLeaderboardRows(tourneyId, currentUserId) {
        var lb   = _leaderboards[tourneyId];
        var wrap = document.createElement("div");
        if (!lb || lb.length === 0) {
            var empty = document.createElement("div");
            empty.className   = "tourney-lb-empty";
            empty.textContent = "Be the first to enter!";
            wrap.appendChild(empty);
            return wrap;
        }
        var top5   = lb.slice(0, 5);
        var medals = ["🥇","🥈","🥉"];
        top5.forEach(function (entry) {
            var row = document.createElement("div");
            row.className = "tourney-lb-row";
            if (currentUserId && String(entry.userId) === String(currentUserId)) {
                row.className += " my-rank";
            }
            var medal = document.createElement("div");
            var rank  = parseInt(entry.rank, 10);
            if (rank >= 1 && rank <= 3) {
                medal.className   = "tourney-lb-medal";
                medal.textContent = medals[rank - 1];
            } else {
                medal.className   = "tourney-lb-rank-num";
                medal.textContent = String(rank);
            }
            var name = document.createElement("div");
            name.className   = "tourney-lb-name";
            name.textContent = entry.username || "Player";
            var scoreEl = document.createElement("div");
            scoreEl.className   = "tourney-lb-score";
            scoreEl.textContent = _formatScore(entry.score);
            row.appendChild(medal); row.appendChild(name); row.appendChild(scoreEl);
            wrap.appendChild(row);
        });
        return wrap;
    }

    function _refreshLeaderboardSection(tourneyId, currentUserId) {
        var attr = "[data-lb-for='" + tourneyId + "']";
        var section = document.querySelector(attr);
        if (!section) return;
        var title = section.querySelector(".tourney-lb-title");
        while (section.lastChild && section.lastChild !== title) section.removeChild(section.lastChild);
        section.appendChild(_buildLeaderboardRows(tourneyId, currentUserId));
    }

    // ── Card builder ──────────────────────────────────────────────────────────
    function _buildCard(tourney, isActive, currentUserId) {
        var card = document.createElement("div");
        card.className  = "tourney-card";
        card.dataset.id = String(tourney.id);

        // header
        var hdr = document.createElement("div");
        hdr.className = "tourney-card-header";
        var titleCol = document.createElement("div");
        titleCol.style.flex = "1";
        var titleRow = document.createElement("div");
        titleRow.className = "tourney-card-title-row";
        var nameEl = document.createElement("h3");
        nameEl.className   = "tourney-card-name";
        nameEl.textContent = tourney.name || "Tournament";
        var badge = document.createElement("span");
        badge.className   = "tourney-type-badge " + _typeBadgeClass(tourney.type);
        badge.textContent = tourney.type ? String(tourney.type).charAt(0).toUpperCase()+String(tourney.type).slice(1).toLowerCase() : "Daily";
        titleRow.appendChild(nameEl); titleRow.appendChild(badge);
        titleCol.appendChild(titleRow);
        var prizeEl = document.createElement("div");
        prizeEl.className   = "tourney-prize-pool";
        prizeEl.textContent = "💰 $" + (parseFloat(tourney.prize_pool)||0).toLocaleString();
        hdr.appendChild(titleCol); hdr.appendChild(prizeEl);
        card.appendChild(hdr);

        // meta row
        var meta = document.createElement("div");
        meta.className = "tourney-card-meta";
        if (isActive) {
            var countdown = document.createElement("div");
            countdown.className      = "tourney-countdown";
            countdown.dataset.endsAt = tourney.ends_at || "";
            countdown.textContent    = _formatCountdown(_msRemaining(tourney.ends_at));
            meta.appendChild(countdown);
        } else {
            var startsEl = document.createElement("div");
            startsEl.className   = "tourney-starts-at";
            startsEl.textContent = _formatStartsAt(tourney.starts_at);
            meta.appendChild(startsEl);
        }
        var entryWrap = document.createElement("div");
        entryWrap.className = "tourney-entry-count";
        var entrySpan = document.createElement("span");
        entrySpan.className   = "entry-count-num";
        entrySpan.textContent = String(tourney.entry_count || 0);
        entryWrap.appendChild(entrySpan);
        entryWrap.appendChild(document.createTextNode(" players entered"));
        meta.appendChild(entryWrap);
        var prizeText = _buildPrizeText(tourney.prize_pool);
        if (prizeText) {
            var prizesEl = document.createElement("div");
            prizesEl.className   = "tourney-prizes";
            prizesEl.textContent = prizeText;
            meta.appendChild(prizesEl);
        }
        card.appendChild(meta);

        // actions row
        var actions = document.createElement("div");
        actions.className = "tourney-card-actions";
        var isJoined = !!_joinedIds[tourney.id];
        var entryFee = parseFloat(tourney.entry_fee) || 0;
        if (isJoined) {
            var playingBadge = document.createElement("div");
            playingBadge.className   = "tourney-playing-badge";
            playingBadge.textContent = "✓ PLAYING";
            actions.appendChild(playingBadge);
        } else if (isActive) {
            var joinBtn = document.createElement("button");
            joinBtn.className   = "tourney-join-btn";
            joinBtn.textContent = entryFee > 0 ? "JOIN TOURNAMENT ($"+entryFee.toFixed(0)+" entry)" : "JOIN TOURNAMENT — FREE";
            joinBtn.dataset.tid = String(tourney.id);
            var errorEl = document.createElement("div");
            errorEl.className = "tourney-join-error";
            joinBtn.addEventListener("click", function () {
                _handleJoin(tourney, joinBtn, errorEl, card, currentUserId);
            });
            actions.appendChild(joinBtn);
            actions.appendChild(errorEl);
        } else {
            var comingSoon = document.createElement("div");
            comingSoon.className             = "tourney-playing-badge";
            comingSoon.style.color           = "#888";
            comingSoon.style.borderColor     = "rgba(136,136,136,0.3)";
            comingSoon.style.backgroundColor = "rgba(136,136,136,0.06)";
            comingSoon.textContent           = "Registration opens at start";
            actions.appendChild(comingSoon);
        }
        card.appendChild(actions);

        // leaderboard (active only)
        if (isActive) {
            var lbSection = document.createElement("div");
            lbSection.className     = "tourney-leaderboard";
            lbSection.dataset.lbFor = String(tourney.id);
            var lbTitle = document.createElement("div");
            lbTitle.className   = "tourney-lb-title";
            lbTitle.textContent = "LEADERBOARD";
            lbSection.appendChild(lbTitle);
            lbSection.appendChild(_buildLeaderboardRows(tourney.id, currentUserId));
            card.appendChild(lbSection);
        }
        return card;
    }

    // ── API calls ─────────────────────────────────────────────────────────────
    function _fetchTournaments() {
        return fetch("/api/tournaments", { headers: _authHeaders() })
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            });
    }

    function _fetchLeaderboard(id) {
        return fetch("/api/tournaments/" + encodeURIComponent(id) + "/leaderboard", { headers: _authHeaders() })
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (data) {
                _leaderboards[id] = (data && data.leaderboard) ? data.leaderboard : [];
            })
            .catch(function () { _leaderboards[id] = []; });
    }

    function _fetchAllLeaderboards(data) {
        var active = (data && data.active) ? data.active : [];
        return Promise.all(active.map(function (t) { return _fetchLeaderboard(t.id); }));
    }

    function _handleJoin(tourney, joinBtn, errorEl, card, currentUserId) {
        if (!_getToken()) {
            errorEl.textContent   = "Please log in to join tournaments.";
            errorEl.style.display = "block";
            return;
        }
        joinBtn.disabled      = true;
        joinBtn.textContent   = "Joining...";
        errorEl.style.display = "none";
        fetch("/api/tournaments/" + encodeURIComponent(tourney.id) + "/join", { method:"POST", headers:_authHeaders() })
            .then(function (res) {
                return res.json().then(function (d) { return { ok: res.ok, data: d }; });
            })
            .then(function (result) {
                if (result.ok && (!result.data || result.data.ok !== false)) {
                    _joinedIds[tourney.id] = true;
                    var actionsDiv = card.querySelector(".tourney-card-actions");
                    if (actionsDiv) {
                        while (actionsDiv.firstChild) actionsDiv.removeChild(actionsDiv.firstChild);
                        var b = document.createElement("div");
                        b.className   = "tourney-playing-badge";
                        b.textContent = "✓ PLAYING";
                        actionsDiv.appendChild(b);
                    }
                    var cEl = card.querySelector(".entry-count-num");
                    if (cEl) cEl.textContent = String((parseInt(cEl.textContent, 10) || 0) + 1);
                    if (typeof showToast === "function") showToast("Joined " + (tourney.name || "tournament") + "! Good luck!", "success");
                } else {
                    var msg = (result.data && result.data.error) ? result.data.error : "Failed to join. Try again.";
                    errorEl.textContent   = msg;
                    errorEl.style.display = "block";
                    joinBtn.disabled      = false;
                    joinBtn.textContent   = "JOIN TOURNAMENT";
                }
            })
            .catch(function () {
                errorEl.textContent   = "Network error. Please try again.";
                errorEl.style.display = "block";
                joinBtn.disabled      = false;
                joinBtn.textContent   = "JOIN TOURNAMENT";
            });
    }

    // ── Modal render helpers ──────────────────────────────────────────────────
    function _renderContent(data) {
        var aS = document.getElementById("tourney-active-section");
        var uS = document.getElementById("tourney-upcoming-section");
        if (!aS || !uS) return;
        while (aS.firstChild) aS.removeChild(aS.firstChild);
        while (uS.firstChild) uS.removeChild(uS.firstChild);
        var uid      = _getCurrentUserId();
        var active   = (data && data.active)   ? data.active   : [];
        var upcoming = (data && data.upcoming) ? data.upcoming : [];
        if (active.length === 0) {
            var ea = document.createElement("div");
            ea.className   = "tourney-empty-state";
            ea.textContent = "No active tournaments right now. Check back soon!";
            aS.appendChild(ea);
        } else {
            active.forEach(function (t) { aS.appendChild(_buildCard(t, true, uid)); });
        }
        if (upcoming.length === 0) {
            var eu = document.createElement("div");
            eu.className   = "tourney-empty-state";
            eu.textContent = "No upcoming tournaments scheduled yet.";
            uS.appendChild(eu);
        } else {
            upcoming.forEach(function (t) { uS.appendChild(_buildCard(t, false, uid)); });
        }
    }
    function _renderLoading() {
        var s = document.getElementById("tourney-active-section");
        if (!s) return;
        while (s.firstChild) s.removeChild(s.firstChild);
        var ld = document.createElement("div");
        ld.className   = "tourney-loading";
        ld.textContent = "Loading tournaments...";
        s.appendChild(ld);
    }
    function _renderError() {
        var s = document.getElementById("tourney-active-section");
        if (!s) return;
        while (s.firstChild) s.removeChild(s.firstChild);
        var err = document.createElement("div");
        err.className   = "tourney-error-msg";
        err.textContent = "Unable to load tournaments. Please try again later.";
        s.appendChild(err);
    }

    // ── Timer management ─────────────────────────────────────────────────────
    function _startCountdown() {
        if (_countdownTimer) clearInterval(_countdownTimer);
        _countdownTimer = setInterval(function () {
            var els = document.querySelectorAll(".tourney-countdown[data-ends-at]");
            for (var i = 0; i < els.length; i++) {
                els[i].textContent = _formatCountdown(_msRemaining(els[i].dataset.endsAt));
            }
        }, COUNTDOWN_INTERVAL);
    }
    function _startLeaderboardRefresh() {
        if (_leaderboardTimer) clearInterval(_leaderboardTimer);
        _leaderboardTimer = setInterval(function () {
            if (!_tournamentsData) return;
            var uid = _getCurrentUserId();
            (_tournamentsData.active || []).forEach(function (t) {
                _fetchLeaderboard(t.id).then(function () { _refreshLeaderboardSection(t.id, uid); });
            });
        }, REFRESH_INTERVAL);
    }
    function _clearTimers() {
        if (_countdownTimer)   { clearInterval(_countdownTimer);   _countdownTimer   = null; }
        if (_leaderboardTimer) { clearInterval(_leaderboardTimer); _leaderboardTimer = null; }
    }

    // ── Tab switching ─────────────────────────────────────────────────────────
    function _activateTab(tabName) {
        _activeTab = tabName;
        var tabs = document.querySelectorAll(".tourney-tab");
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].dataset.tab === tabName) tabs[i].classList.add("active");
            else tabs[i].classList.remove("active");
        }
        var secs = document.querySelectorAll(".tourney-section");
        for (var j = 0; j < secs.length; j++) {
            if (secs[j].dataset.section === tabName) secs[j].classList.add("active");
            else secs[j].classList.remove("active");
        }
    }
    function _weekOfYear(d) {
        var onejan = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    }

    // ── Modal creation ────────────────────────────────────────────────────────
    function _createModal() {
        _injectStyles();
        var overlay = document.createElement("div");
        overlay.id        = OVERLAY_ID;
        overlay.className = "modal-overlay";
        overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.78);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeTournamentModal();
        });

        var modal = document.createElement("div");
        modal.id        = MODAL_ID;
        modal.className = "modal tournament-modal";

        // header
        var header = document.createElement("div");
        header.className = "tourney-header";
        var headerRow = document.createElement("div");
        headerRow.className = "tourney-header-row";
        var titleEl = document.createElement("h2");
        titleEl.className   = "tourney-title";
        titleEl.textContent = "🏆 TOURNAMENTS";
        var closeBtn = document.createElement("button");
        closeBtn.className   = "tourney-close-btn";
        closeBtn.textContent = "×";
        closeBtn.setAttribute("aria-label", "Close tournaments");
        closeBtn.addEventListener("click", closeTournamentModal);
        headerRow.appendChild(titleEl);
        headerRow.appendChild(closeBtn);

        var season = document.createElement("div");
        season.className = "tourney-season";
        var now = new Date();
        season.textContent = "SEASON " + now.getFullYear() + " · WEEK " + _weekOfYear(now);

        var tabsEl = document.createElement("div");
        tabsEl.className = "tourney-tabs";
        [["active","Active"],["upcoming","Upcoming"]].forEach(function (pair) {
            var tab = document.createElement("button");
            tab.className   = "tourney-tab" + (pair[0] === _activeTab ? " active" : "");
            tab.dataset.tab = pair[0];
            tab.textContent = pair[1];
            (function (name) {
                tab.addEventListener("click", function () { _activateTab(name); });
            }(pair[0]));
            tabsEl.appendChild(tab);
        });

        header.appendChild(headerRow);
        header.appendChild(season);
        header.appendChild(tabsEl);

        // body
        var body = document.createElement("div");
        body.className = "tourney-body";
        var aSection = document.createElement("div");
        aSection.id              = "tourney-active-section";
        aSection.className       = "tourney-section active";
        aSection.dataset.section = "active";
        var uSection = document.createElement("div");
        uSection.id              = "tourney-upcoming-section";
        uSection.className       = "tourney-section";
        uSection.dataset.section = "upcoming";
        body.appendChild(aSection);
        body.appendChild(uSection);

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        return overlay;
    }

    // ── ESC key handler ───────────────────────────────────────────────────────
    function _onKeyDown(e) {
        if (e.key === "Escape" || e.keyCode === 27) closeTournamentModal();
    }

    // ── Public API ────────────────────────────────────────────────────────────
    function openTournamentModal() {
        var overlay = document.getElementById(OVERLAY_ID) || _createModal();
        overlay.style.display = "flex";
        document.addEventListener("keydown", _onKeyDown);
        _activateTab(_activeTab);
        _renderLoading();
        _fetchTournaments().then(function (data) {
            _tournamentsData = data;
            return _fetchAllLeaderboards(data).then(function () { return data; });
        }).then(function (data) {
            _renderContent(data);
            _startCountdown();
            _startLeaderboardRefresh();
        }).catch(function () {
            _renderError();
        });
    }

    function closeTournamentModal() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.style.display = "none";
        document.removeEventListener("keydown", _onKeyDown);
        _clearTimers();
    }

    // ── Export ────────────────────────────────────────────────────────────────
    window.openTournamentModal  = openTournamentModal;
    window.closeTournamentModal = closeTournamentModal;

})();
