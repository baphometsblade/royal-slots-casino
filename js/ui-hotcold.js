(function () {
    "use strict";

    var rtpMap = {};
    var hotSet = new Set();
    var coldSet = new Set();
    var activeHCFilter = null;
    var stylesInjected = false;

    var HOT_THRESHOLD  = 92;
    var COLD_THRESHOLD = 84;
    var REFRESH_MS     = 5 * 60 * 1000;

    function injectStyles() {
        if (stylesInjected) return;
        stylesInjected = true;
        var style = document.createElement("style");
        style.id = "hc-styles";
        style.textContent = [
            ".hc-badge {",
            "    position: absolute;",
            "    top: 6px;",
            "    right: 6px;",
            "    font-size: 10px;",
            "    font-weight: bold;",
            "    padding: 2px 6px;",
            "    border-radius: 10px;",
            "    pointer-events: none;",
            "    z-index: 5;",
            "    letter-spacing: 0.5px;",
            "}",
            ".hot-badge {",
            "    background: linear-gradient(135deg, #ff6b00, #ff9500);",
            "    color: #fff;",
            "    box-shadow: 0 0 8px rgba(255, 107, 0, 0.6);",
            "    animation: hotPulse 2s ease-in-out infinite;",
            "}",
            ".cold-badge {",
            "    background: linear-gradient(135deg, #0099ff, #00ccff);",
            "    color: #fff;",
            "    box-shadow: 0 0 8px rgba(0, 153, 255, 0.5);",
            "}",
            "@keyframes hotPulse {",
            "    0%, 100% { box-shadow: 0 0 6px rgba(255, 107, 0, 0.5); }",
            "    50%       { box-shadow: 0 0 14px rgba(255, 107, 0, 0.9); }",
            "}",
            ".hc-filter-pill {",
            "    cursor: pointer;",
            "    padding: 4px 14px;",
            "    border-radius: 20px;",
            "    border: 1px solid rgba(255,255,255,0.2);",
            "    background: rgba(255,255,255,0.05);",
            "    color: #ccc;",
            "    font-size: 13px;",
            "    transition: all 0.2s;",
            "}",
            ".hc-filter-pill.active {",
            "    background: rgba(255, 200, 0, 0.15);",
            "    border-color: #ffc800;",
            "    color: #ffc800;",
            "}",
            ".game-card { position: relative; }"
        ].join("\n");
        document.head.appendChild(style);
    }

    function fetchAndApply() {
        try {
            fetch("/api/game-stats")
                .then(function (res) {
                    if (!res.ok) return null;
                    return res.json();
                })
                .then(function (data) {
                    if (!data || !Array.isArray(data.stats)) return;
                    rtpMap = {};
                    hotSet  = new Set();
                    coldSet = new Set();
                    data.stats.forEach(function (entry) {
                        if (!entry || typeof entry.gameId !== "string") return;
                        var id  = entry.gameId.toLowerCase();
                        var rtp = parseFloat(entry.actualRtp);
                        if (isNaN(rtp)) return;
                        rtpMap[id] = rtp;
                        if (rtp >= HOT_THRESHOLD) {
                            hotSet.add(id);
                        } else if (rtp <= COLD_THRESHOLD) {
                            coldSet.add(id);
                        }
                    });
                    applyBadges();
                    injectFilterPills();
                })
                .catch(function () {});
        } catch (e) {}
    }

    function resolveGameId(el) {
        var id = el.getAttribute("data-game-id") ||
                 el.getAttribute("data-id")       ||
                 (el.dataset && el.dataset.gameId) ||
                 (el.dataset && el.dataset.id);
        if (id && id.length) return id.toLowerCase();
        var onclick = el.getAttribute("onclick") || "";
        var match = onclick.match(/openSlot\(['"][^'"]+['"]\)/);
        if (match && match[1]) return match[1].toLowerCase();
        return null;
    }

    function applyBadges() {
        try {
            var cards = document.querySelectorAll("#gameGrid .game-card");
            if (!cards || cards.length === 0) return;
            cards.forEach(function (card) {
                var old = card.querySelectorAll(".hot-badge, .cold-badge");
                old.forEach(function (b) { b.parentNode.removeChild(b); });
                var id = resolveGameId(card);
                if (!id) return;
                var badge;
                if (hotSet.has(id)) {
                    badge = document.createElement("span");
                    badge.className = "hc-badge hot-badge";
                    badge.textContent = "🔥 HOT";
                    card.appendChild(badge);
                } else if (coldSet.has(id)) {
                    badge = document.createElement("span");
                    badge.className = "hc-badge cold-badge";
                    badge.textContent = "❄️ COLD";
                    card.appendChild(badge);
                }
            });
        } catch (e) {}
    }

    function applyHCFilter(type) {
        activeHCFilter = type;
        var hotPill  = document.getElementById("hcHotPill");
        var coldPill = document.getElementById("hcColdPill");
        if (hotPill)  hotPill.classList.toggle("active",  type === "hot");
        if (coldPill) coldPill.classList.toggle("active", type === "cold");
        var cards = document.querySelectorAll("#gameGrid .game-card");
        if (!cards || cards.length === 0) return;
        if (type === null) {
            cards.forEach(function (card) { card.style.display = ""; });
            return;
        }
        var targetSet = (type === "hot") ? hotSet : coldSet;
        cards.forEach(function (card) {
            var id = resolveGameId(card);
            if (!id) { card.style.display = ""; return; }
            card.style.display = targetSet.has(id) ? "" : "none";
        });
    }

    function onHotPillClick()  { applyHCFilter(activeHCFilter === "hot"  ? null : "hot");  }
    function onColdPillClick() { applyHCFilter(activeHCFilter === "cold" ? null : "cold"); }

    function injectFilterPills() {
        if (document.getElementById("hcHotPill") && document.getElementById("hcColdPill")) return;
        var container = document.querySelector(".filter-pills, .game-filters");
        if (!container) container = document.getElementById("filterTabs");
        if (!container) return;
        if (!document.getElementById("hcHotPill")) {
            var hotPill = document.createElement("button");
            hotPill.id        = "hcHotPill";
            hotPill.className = "hc-filter-pill";
            hotPill.textContent = "🔥 Hot Games";
            hotPill.addEventListener("click", onHotPillClick);
            container.appendChild(hotPill);
        }
        if (!document.getElementById("hcColdPill")) {
            var coldPill = document.createElement("button");
            coldPill.id        = "hcColdPill";
            coldPill.className = "hc-filter-pill";
            coldPill.textContent = "❄️ Cold Games";
            coldPill.addEventListener("click", onColdPillClick);
            container.appendChild(coldPill);
        }
    }

    function refreshHotColdBadges() { applyBadges(); }

    function hookRenderGames() {
        if (typeof renderGames === "function") {
            var _prevRG = renderGames;
            renderGames = function () {
                _prevRG.apply(this, arguments);
                setTimeout(applyBadges, 150);
            };
        }
    }

    function init() {
        injectStyles();
        hookRenderGames();
        fetchAndApply();
        setInterval(fetchAndApply, REFRESH_MS);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 1000);
    }

    window.refreshHotColdBadges = refreshHotColdBadges;

}());
