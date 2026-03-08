/* ui-growth.js — Welcome Offer · Weekly Tournament · Cashback Ribbon · Hot Streak
 * Revenue-driving conversion and retention features.
 */
(function () {
    'use strict';

    var WELCOME_KEY   = 'ms_welcomeOfferDismissed';
    var CASHBACK_KEY  = 'ms_cashbackData';
    var TOURNAMENT_KEY = 'ms_tournamentData';

    // ═══════════════════════════════════════════════════════════════════════
    // 1. WELCOME BONUS POPUP
    // ═══════════════════════════════════════════════════════════════════════
    var _woTimer = null;

    function _startWelcomeOffer() {
        // Only show to logged-out users who haven't dismissed
        if (typeof currentUser !== 'undefined' && currentUser) return;
        if (sessionStorage.getItem(WELCOME_KEY)) return;
        try { if (localStorage.getItem(WELCOME_KEY)) return; } catch(e) {}

        // Show after 6 seconds
        setTimeout(function () {
            if (typeof currentUser !== 'undefined' && currentUser) return;
            var el = document.getElementById('welcomeOfferOverlay');
            if (!el) return;
            el.style.display = 'flex';
            _runWelcomeTimer();
        }, 6000);
    }

    function _runWelcomeTimer() {
        var timerEl = document.getElementById('welcomeOfferTimer');
        if (!timerEl) return;
        // Seeded expiry: 12-23 hours based on today's date
        var seed = new Date().toDateString();
        var hash = 0;
        for (var i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
        var hoursLeft = 12 + Math.abs(hash % 12);
        var totalSec = hoursLeft * 3600 + Math.abs(hash % 3600);

        _woTimer = setInterval(function () {
            totalSec--;
            if (totalSec <= 0) { clearInterval(_woTimer); return; }
            var h = Math.floor(totalSec / 3600);
            var m = Math.floor((totalSec % 3600) / 60);
            var s = totalSec % 60;
            timerEl.textContent = _pad(h) + ':' + _pad(m) + ':' + _pad(s);
        }, 1000);
    }

    window.claimWelcomeOffer = function () {
        var el = document.getElementById('welcomeOfferOverlay');
        if (el) el.style.display = 'none';
        if (_woTimer) clearInterval(_woTimer);
        // Open deposit/auth modal
        if (typeof currentUser !== 'undefined' && currentUser) {
            if (typeof showWalletModal === 'function') showWalletModal();
        } else {
            if (typeof showAuthModal === 'function') showAuthModal();
        }
        try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch(e) {}
    };

    window.dismissWelcomeOffer = function () {
        var el = document.getElementById('welcomeOfferOverlay');
        if (el) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.25s';
            setTimeout(function () { el.style.display = 'none'; el.style.opacity = ''; }, 250);
        }
        if (_woTimer) clearInterval(_woTimer);
        try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch(e) {}
        try { localStorage.setItem(WELCOME_KEY, '1'); } catch(e) {}
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 2. WEEKLY TOURNAMENT LEADERBOARD
    // ═══════════════════════════════════════════════════════════════════════
    var TOURNAMENT_PLAYERS = [
        'CryptoKing', 'LuckyAce88', 'NightOwl', 'DiamondHands', 'SpinMaster',
        'GoldRush', 'StarPlayer', 'WildCard77', 'JackpotJane', 'BigSpender',
        'RollTheDice', 'HighRoller', 'SilverFox', 'ReelQueen', 'VegasVibe'
    ];

    var PRIZE_TIERS = ['$500', '$250', '$100', '$50', '$25', '$10', '$10', '$5', '$5', '$5'];

    function _weekSeed() {
        var d = new Date();
        var week = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / (7 * 864e5));
        return d.getFullYear() * 100 + week;
    }

    function _seededRand(seed) {
        var s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    function _buildLeaderboard() {
        var rng = _seededRand(_weekSeed());
        var players = TOURNAMENT_PLAYERS.slice().sort(function () { return rng() - 0.5; });
        var rows = [];
        for (var i = 0; i < 10; i++) {
            var baseScore = Math.round(50000 - i * (3000 + rng() * 2000));
            rows.push({
                rank: i + 1,
                name: players[i],
                score: Math.max(baseScore, 1000),
                prize: PRIZE_TIERS[i] || ''
            });
        }
        return rows;
    }

    function _getMyRank() {
        var rng = _seededRand(_weekSeed() + 99);
        return Math.floor(rng() * 40) + 11; // rank 11-50
    }

    function _getWeeklyPrizePool() {
        // Grows slightly each hour based on current hour
        var h = new Date().getHours();
        var base = 2500;
        return (base + h * 18 + Math.floor(_seededRand(_weekSeed())() * 200)).toFixed(0);
    }

    function _getTimeToReset() {
        var now = new Date();
        var nextMonday = new Date(now);
        var day = now.getDay();
        var daysUntilMonday = day === 0 ? 1 : 8 - day;
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);
        var diff = Math.floor((nextMonday - now) / 1000);
        var d = Math.floor(diff / 86400);
        var h = Math.floor((diff % 86400) / 3600);
        var m = Math.floor((diff % 3600) / 60);
        return d + 'd ' + _pad(h) + 'h ' + _pad(m) + 'm';
    }

    function _renderTournament() {
        var widget = document.getElementById('weeklyTournamentWidget');
        if (!widget) return;

        var rows = _buildLeaderboard();
        var myRank = _getMyRank();
        var prizePool = _getWeeklyPrizePool();
        var timeLeft = _getTimeToReset();
        var userName = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.username || 'You') : null;

        var rankIcons = ['🥇', '🥈', '🥉'];

        var html = '<div class="tw-header">' +
            '<span class="tw-icon">🏆</span>' +
            '<span class="tw-title">Weekly Tournament</span>' +
            '<span class="tw-prize">$' + prizePool + ' Prize Pool</span>' +
            '<span class="tw-countdown">' + timeLeft + ' left</span>' +
            '</div>' +
            '<div class="tw-rows">';

        rows.forEach(function (r) {
            var rankDisp = r.rank <= 3 ? rankIcons[r.rank - 1] : r.rank;
            var rankClass = r.rank === 1 ? 'gold' : r.rank === 2 ? 'silver' : r.rank === 3 ? 'bronze' : '';
            var isMe = userName && r.name === userName;
            html += '<div class="tw-row' + (isMe ? ' tw-me' : '') + '">' +
                '<span class="tw-rank ' + rankClass + '">' + rankDisp + '</span>' +
                '<span class="tw-name">' + _esc(r.name) + (isMe ? ' (You)' : '') + '</span>' +
                '<span class="tw-score">' + r.score.toLocaleString() + ' pts</span>' +
                '<span class="tw-prize-col">' + r.prize + '</span>' +
                '</div>';
        });

        // Show user's rank if not in top 10
        if (!userName || myRank > 10) {
            html += '<div class="tw-row tw-me">' +
                '<span class="tw-rank">' + (userName ? myRank : '?') + '</span>' +
                '<span class="tw-name">' + (userName ? _esc(userName) + ' (You)' : 'Log in to compete') + '</span>' +
                '<span class="tw-score">' + (userName ? '—' : '') + '</span>' +
                '<span class="tw-prize-col"></span>' +
                '</div>';
        }

        html += '</div>' +
            '<div class="tw-cta-row">' +
            '<button class="tw-play-btn" onclick="if(typeof playRandomHotGame===\'function\')playRandomHotGame()">▶ Play to Earn Points</button>' +
            '<span class="tw-info">Top 10 win cash prizes every Monday</span>' +
            '</div>';

        widget.innerHTML = html;
        widget.style.display = 'block';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CASHBACK RIBBON
    // ═══════════════════════════════════════════════════════════════════════
    var CASHBACK_RATE = 0.05; // 5% of net losses
    var CASHBACK_MIN  = 1.00;

    function _loadCashback() {
        try {
            var raw = localStorage.getItem(CASHBACK_KEY);
            return raw ? JSON.parse(raw) : { netLoss: 0, claimed: 0, lastClaim: 0 };
        } catch(e) { return { netLoss: 0, claimed: 0, lastClaim: 0 }; }
    }

    function _saveCashback(data) {
        try { localStorage.setItem(CASHBACK_KEY, JSON.stringify(data)); } catch(e) {}
    }

    function _updateCashbackRibbon() {
        var ribbon = document.getElementById('cashbackRibbon');
        var amtEl  = document.getElementById('cashbackAmount');
        var timerEl = document.getElementById('cashbackTimer');
        var btn    = document.getElementById('cashbackClaimBtn');
        if (!ribbon) return;

        var data = _loadCashback();
        var available = Math.max(0, data.netLoss * CASHBACK_RATE - data.claimed);
        available = Math.floor(available * 100) / 100;

        if (available < CASHBACK_MIN) { ribbon.style.display = 'none'; return; }

        ribbon.style.display = 'flex';
        if (amtEl) amtEl.textContent = '$' + available.toFixed(2);

        // Cooldown: 24h between claims
        var hoursSinceClaim = (Date.now() - data.lastClaim) / 3600000;
        if (data.lastClaim && hoursSinceClaim < 24) {
            var secsLeft = Math.ceil((24 - hoursSinceClaim) * 3600);
            var h = Math.floor(secsLeft / 3600);
            var m = Math.floor((secsLeft % 3600) / 60);
            if (timerEl) timerEl.textContent = 'Available in ' + h + 'h ' + _pad(m) + 'm';
            if (btn) { btn.disabled = true; btn.textContent = 'Cooling down'; }
        } else {
            if (timerEl) timerEl.textContent = 'Ready to claim!';
            if (btn) { btn.disabled = false; btn.textContent = 'Claim'; }
        }
    }

    window.claimCashback = function () {
        var data = _loadCashback();
        var available = Math.max(0, data.netLoss * CASHBACK_RATE - data.claimed);
        available = Math.floor(available * 100) / 100;
        if (available < CASHBACK_MIN) return;

        data.claimed += available;
        data.lastClaim = Date.now();
        _saveCashback(data);

        // Credit balance
        if (typeof balance !== 'undefined') {
            balance = (parseFloat(balance) || 0) + available;
            var balEl = document.getElementById('balance');
            if (balEl) balEl.textContent = balance.toFixed(2);
        }

        _updateCashbackRibbon();
        _showGrowthToast('💚', 'Cashback Claimed!', '$' + available.toFixed(2) + ' added to your balance');
    };

    // Called after each spin result to accumulate cashback
    window._growthTrackSpin = function (betAmt, winAmt) {
        if (!betAmt) return;
        var netLoss = Math.max(0, betAmt - winAmt);
        if (netLoss <= 0) return;
        var data = _loadCashback();
        data.netLoss = (data.netLoss || 0) + netLoss;
        _saveCashback(data);
        _updateCashbackRibbon();
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 4. HOT STREAK NOTIFICATION
    // ═══════════════════════════════════════════════════════════════════════
    var _streakCount = 0;
    var _streakTimeout = null;

    window._growthTrackWin = function (isWin) {
        if (isWin) {
            _streakCount++;
            if (_streakCount >= 3) _showHotStreak(_streakCount);
        } else {
            _streakCount = 0;
        }
    };

    function _showHotStreak(count) {
        if (_streakTimeout) clearTimeout(_streakTimeout);
        var existing = document.querySelector('.hot-streak-notif');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var el = document.createElement('div');
        el.className = 'hot-streak-notif';
        var icon = document.createElement('span');
        icon.className = 'hs-icon';
        icon.textContent = count >= 5 ? '🔥🔥' : '🔥';
        var txt = document.createElement('span');
        txt.textContent = count + '-Win Streak! Keep it going!';
        el.appendChild(icon);
        el.appendChild(txt);
        document.body.appendChild(el);

        _streakTimeout = setTimeout(function () {
            el.style.transition = 'opacity 0.4s';
            el.style.opacity = '0';
            setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 400);
        }, 3500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    function _pad(n) { return n < 10 ? '0' + n : '' + n; }

    function _esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function _showGrowthToast(icon, title, sub) {
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed','bottom:90px','left:50%',
            'transform:translateX(-50%) translateY(20px)',
            'background:linear-gradient(135deg,#1a0a2e,#0d0d1a)',
            'border:1px solid rgba(16,185,129,0.5)',
            'border-radius:12px','padding:12px 20px',
            'color:#fff','font-size:13px','font-weight:600',
            'z-index:99999','opacity:0','transition:all 0.3s ease',
            'text-align:center','box-shadow:0 8px 32px rgba(0,0,0,0.6)',
            'pointer-events:none','min-width:220px'
        ].join(';');
        t.textContent = icon + ' ' + title + ' — ' + sub;
        document.body.appendChild(t);
        requestAnimationFrame(function () {
            t.style.opacity = '1';
            t.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(function () {
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 400);
        }, 3500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════════
    function _init() {
        _startWelcomeOffer();
        _renderTournament();
        _updateCashbackRibbon();
        // Refresh tournament countdown every minute
        setInterval(function () {
            var tw = document.getElementById('weeklyTournamentWidget');
            if (tw && tw.style.display !== 'none') _renderTournament();
        }, 60000);
        // Refresh cashback ribbon every 5 minutes
        setInterval(_updateCashbackRibbon, 300000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        setTimeout(_init, 1000);
    }

})();
