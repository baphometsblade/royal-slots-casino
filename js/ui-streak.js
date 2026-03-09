(function () {
    "use strict";
    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== "undefined" ? STORAGE_KEY_TOKEN : "casinoToken";
        return localStorage.getItem(key);
    }
    function _injectStyles() {
        if (document.getElementById("streakStyles")) return;
        var style = document.createElement("style"); style.id = "streakStyles";
        style.textContent = [
            "#streakOverlay,#streakModalOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center}",
            "@keyframes strPop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}",
            "@keyframes strBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}",
            "#streakCard,#streakModalCard{background:#0d0d1a;border:2px solid rgba(255,100,0,.5);border-radius:20px;padding:28px;max-width:360px;width:90%;text-align:center;animation:strPop .4s ease}",
            ".str-fire{font-size:52px;display:block;margin-bottom:8px;animation:strBounce .8s ease-in-out infinite}",
            ".str-title{font-size:26px;font-weight:900;color:#ff6400;margin-bottom:6px;letter-spacing:1px}",
            ".str-sub{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px}",
            ".str-reward-pill{background:rgba(255,100,0,.15);border:1px solid rgba(255,100,0,.4);border-radius:10px;padding:12px 16px;font-size:18px;font-weight:800;color:#ff8c40;margin-bottom:16px}",
            ".str-calendar{display:flex;justify-content:center;gap:6px;margin-bottom:14px}",
            ".str-day{width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:rgba(255,255,255,.4)}",
            ".str-day-done{background:#ff6400;border-color:#ff6400;color:#fff}",
            ".str-day-today{background:rgba(255,100,0,.3);border-color:#ff6400;color:#ff8c40;animation:strPulse 1.2s ease-in-out infinite}",
            "@keyframes strPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,100,0,.4)}50%{box-shadow:0 0 0 6px rgba(255,100,0,0)}}",
            ".str-progress{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:16px}",
            ".str-close-btn{background:linear-gradient(135deg,#ff6400,#d94f00);color:#fff;border:none;padding:13px 28px;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;width:100%}",
            "#streakBadge{position:fixed;top:8px;right:120px;z-index:10400;background:rgba(255,100,0,.2);border:1px solid rgba(255,100,0,.4);color:#ff8c40;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:800;pointer-events:none}"
        ].join(""); document.head.appendChild(style);
    }
    function _rewardDesc(reward) {
        if (!reward) return "🎁 Reward!";
        if (reward.type === "gems") return "💎 +" + reward.amount + " GEMS";
        if (reward.type === "credits") return "💰 +$" + parseFloat(reward.amount).toFixed(2) + " CREDITS";
        if (reward.type === "weekly") return "💰 +$" + parseFloat(reward.credits).toFixed(2) + " + 🎡 " + reward.wheelSpins + " WHEEL SPINS";
        if (reward.type === "biweekly") return "💰 +$" + parseFloat(reward.credits).toFixed(2) + " + 🎡 " + reward.wheelSpins + " WHEEL SPINS";
        if (reward.type === "monthly") return "💰 +$" + parseFloat(reward.credits).toFixed(2) + " CREDITS — LEGEND!";
        return "🎁 Streak Reward!";
    }
    function _buildCalendar(streakCount) {
        var calendar = document.createElement("div"); calendar.className = "str-calendar";
        var dayInCycle = ((streakCount - 1) % 7);
        for (var i = 0; i < 7; i++) {
            var circle = document.createElement("div");
            if (i < dayInCycle) { circle.className = "str-day str-day-done"; circle.textContent = "✓"; }
            else if (i === dayInCycle) { circle.className = "str-day str-day-today"; circle.textContent = String(i + 1); }
            else { circle.className = "str-day str-day-future"; circle.textContent = String(i + 1); }
            calendar.appendChild(circle);
        }
        return calendar;
    }
    function _updateStreakBadge(count) {
        if (!count || count < 1) return;
        var badge = document.getElementById("streakBadge");
        if (!badge) { badge = document.createElement("div"); badge.id = "streakBadge"; document.body.appendChild(badge); }
        badge.textContent = "🔥 " + count + " DAY STREAK";
    }
    function _showStreakCelebration(data) {
        _injectStyles();
        var existing = document.getElementById("streakOverlay"); if (existing) existing.remove();
        var streakCount = data.streakCount || 1; var reward = data.reward || null;
        var isWeekly = data.isWeeklyBonus || false;
        var daysUntilWeekly = 7 - (streakCount % 7); if (daysUntilWeekly === 7) daysUntilWeekly = 0;
        var overlay = document.createElement("div"); overlay.id = "streakOverlay";
        var card = document.createElement("div"); card.id = "streakCard";
        var fireEl = document.createElement("span"); fireEl.className = "str-fire"; fireEl.textContent = "🔥";
        var title = document.createElement("div"); title.className = "str-title";
        title.textContent = "DAY " + streakCount + " STREAK!";
        var sub = document.createElement("div"); sub.className = "str-sub";
        sub.textContent = isWeekly ? "🎉 WEEKLY BONUS UNLOCKED!" : "Keep it up! You are on fire!";
        var pill = document.createElement("div"); pill.className = "str-reward-pill"; pill.textContent = _rewardDesc(reward);
        var calendar = _buildCalendar(streakCount);
        var progress = document.createElement("div"); progress.className = "str-progress";
        progress.textContent = daysUntilWeekly > 0 ? (streakCount % 7) + " / 7 days until Weekly Bonus" : "Weekly bonus claimed! Next cycle begins.";
        var closeBtn = document.createElement("button"); closeBtn.className = "str-close-btn";
        closeBtn.textContent = "LET’S PLAY! 🎰";
        closeBtn.addEventListener("click", function() { overlay.remove(); });
        card.appendChild(fireEl); card.appendChild(title); card.appendChild(sub); card.appendChild(pill);
        card.appendChild(calendar); card.appendChild(progress); card.appendChild(closeBtn);
        overlay.appendChild(card); document.body.appendChild(overlay);
        overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });
        setTimeout(function() { if (document.getElementById("streakOverlay")) overlay.remove(); }, 8000);
    }
    function _checkStreak() {
        var token = _getToken(); if (!token) return;
        fetch("/api/streak/login", { method: "POST",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.isNewDay === true) { _showStreakCelebration(data); }
            if (data && typeof data.streakCount === "number") { _updateStreakBadge(data.streakCount); }
        }).catch(function() {});
    }
    function openStreakModal() {
        _injectStyles(); var token = _getToken();
        var existing = document.getElementById("streakModalOverlay"); if (existing) existing.remove();
        function onEsc(e) { if (e.key === "Escape") { closeStreakModal(); document.removeEventListener("keydown", onEsc); } }
        document.addEventListener("keydown", onEsc);
        var overlay = document.createElement("div"); overlay.id = "streakModalOverlay";
        var card = document.createElement("div"); card.id = "streakModalCard"; card.style.maxWidth = "420px";
        card.innerHTML = "<div class='str-title'>🔥 YOUR STREAK</div><div class='str-sub'>Loading...</div>";
        overlay.appendChild(card); document.body.appendChild(overlay);
        overlay.addEventListener("click", function(e) {
            if (e.target === overlay) { closeStreakModal(); document.removeEventListener("keydown", onEsc); }
        });
        if (!token) { card.innerHTML = "<div class='str-title'>🔥 YOUR STREAK</div><div class='str-sub'>Log in to track your streak!</div><button class='str-close-btn' onclick='closeStreakModal()'>CLOSE</button>"; return; }
        fetch("/api/streak/status", { headers: { "Authorization": "Bearer " + token } })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var streakCount = (data && data.streakCount) || 0;
            var isActiveToday = data && data.isActiveToday;
            var daysUntilWeekly = streakCount > 0 ? (7 - (streakCount % 7)) : 7;
            if (daysUntilWeekly === 7 && streakCount > 0) daysUntilWeekly = 0;
            card.innerHTML = "";
            var fe = document.createElement("span"); fe.className = "str-fire"; fe.textContent = "🔥";
            var tl = document.createElement("div"); tl.className = "str-title";
            tl.textContent = streakCount > 0 ? (streakCount + " DAY STREAK") : "START YOUR STREAK!";
            var sb = document.createElement("div"); sb.className = "str-sub";
            if (streakCount === 0) { sb.textContent = "Log in every day to earn escalating rewards!"; }
            else if (isActiveToday) { sb.textContent = "Today’s reward claimed! See you tomorrow."; }
            else { sb.textContent = "You haven’t logged in yet today — keep your streak alive!"; }
            var pr = document.createElement("div"); pr.className = "str-progress";
            pr.style.fontSize = "14px"; pr.style.marginBottom = "16px";
            if (daysUntilWeekly > 0) { pr.textContent = daysUntilWeekly + " day" + (daysUntilWeekly === 1 ? "" : "s") + " until your next Weekly Bonus (💰 +.00 + 🎡 5 Wheel Spins)"; }
            else if (streakCount > 0) { pr.textContent = "🎉 Weekly bonus unlocked today! Keep going for the next one."; }
            else { pr.textContent = "Weekly bonuses unlock every 7 consecutive days!"; }
            var cal = streakCount > 0 ? _buildCalendar(streakCount) : null;
            var cta = document.createElement("div"); cta.className = "str-sub"; cta.style.marginBottom = "16px";
            if (!isActiveToday && streakCount > 0) { cta.style.color = "#ff8c40"; cta.textContent = "Keep your streak alive — play today!"; }
            var cb = document.createElement("button"); cb.className = "str-close-btn";
            cb.textContent = isActiveToday ? "KEEP SPINNING! 🎰" : "PLAY NOW! 🎰";
            cb.addEventListener("click", function() { closeStreakModal(); document.removeEventListener("keydown", onEsc); });
            card.appendChild(fe); card.appendChild(tl); card.appendChild(sb); card.appendChild(pr);
            if (cal) card.appendChild(cal);
            card.appendChild(cta); card.appendChild(cb);
        }).catch(function() { card.innerHTML = "<div class='str-title'>🔥 YOUR STREAK</div><div class='str-sub'>Could not load streak data.</div><button class='str-close-btn' onclick='closeStreakModal()'>CLOSE</button>"; });
    }
    function closeStreakModal() {
        var overlay = document.getElementById("streakModalOverlay"); if (overlay) overlay.remove();
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() { setTimeout(_checkStreak, 2000); });
    } else { setTimeout(_checkStreak, 2000); }
    window.openStreakModal = openStreakModal;
    window.closeStreakModal = closeStreakModal;
}());
