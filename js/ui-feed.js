/**
 * ui-feed.js -- Live Big Wins Social Feed
 * Slide-in side panel showing real-time big wins (>=15x multiplier) to drive FOMO.
 * Polls GET /api/feed every 15 seconds while open.
 */
(function () {
    "use strict";

    var panelEl = null;
    var overlayEl = null;
    var feedListEl = null;
    var pollTimer = null;
    var isOpen = false;
    var lastOpenedAt = 0;
    var unseenCount = 0;
    var navBtnEl = null;
    var stylesInjected = false;
    var lastTopTs = null;

    function formatMoney(amount) {
        var n = parseFloat(amount) || 0;
        return "$" + n.toFixed(2).replace(/B(?=(d{3})+(?!d))/g, ",");
    }

    function multColor(mult) {
        var m = parseFloat(mult) || 0;
        if (m >= 100) return "#c084fc";
        if (m >= 30)  return "#f87171";
        return "#fb923c";
    }

    function gameIdToHue(gameId) {
        var h = 0;
        for (var i = 0; i < gameId.length; i++) {
            h = (h * 31 + gameId.charCodeAt(i)) & 0xffff;
        }
        return h % 360;
    }

    function gameName(gameId) {
        if (typeof GAMES !== "undefined" && Array.isArray(GAMES)) {
            var found = GAMES.find(function (g) { return g.id === gameId; });
            if (found && found.name) return found.name;
        }
        return gameId;
    }

    function injectStyles() {
        if (stylesInjected) return;
        stylesInjected = true;
        var style = document.createElement("style");
        style.id = "feed-panel-styles";
        style.textContent = ".feed-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index:10400; }\n#feedPanel { position: fixed; right: 0; top: 0; bottom: 0; width: 360px; background: #0d0d1a; border-left: 2px solid #00ff88; z-index:10400; overflow-y: auto; transform: translateX(100%); transition: transform 0.3s ease; display: flex; flex-direction: column; font-family: inherit; }\n#feedPanel.open { transform: translateX(0); }\n#feedPanel .feed-header { position: sticky; top: 0; background: #0d0d1a; border-bottom: 1px solid rgba(0,255,136,0.2); padding: 16px 16px 12px; z-index:10400; }\n#feedPanel .feed-header-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }\n#feedPanel .feed-title { color: #00ff88; font-size: 16px; font-weight: 700; letter-spacing: 0.03em; flex: 1; }\n#feedPanel .feed-live-dot { width: 8px; height: 8px; background: #00ff88; border-radius: 50%; flex-shrink: 0; animation: feedDotPulse 1.4s ease-in-out infinite; }\n@keyframes feedDotPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }\n#feedPanel .feed-close-btn { background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer; line-height: 1; padding: 0 4px; flex-shrink: 0; }\n#feedPanel .feed-close-btn:hover { color: #fff; }\n#feedPanel .feed-subtext { color: #555; font-size: 11px; }\n#feedPanel .feed-list { flex: 1; padding-bottom: 16px; }\n.feed-entry { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: default; transition: background 0.15s; }\n.feed-entry:hover { background: rgba(255,255,255,0.03); }\n.feed-entry.new-flash { animation: feedEntryFlash 1.2s ease forwards; }\n@keyframes feedEntryFlash { 0% { background: rgba(0,255,136,0.20); } 60% { background: rgba(0,255,136,0.08); } 100% { background: transparent; } }\n.feed-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #fff; text-transform: uppercase; }\n.feed-info { flex: 1; min-width: 0; }\n.feed-win-line { font-size: 13px; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.feed-win-line .feed-username { font-weight: 600; color: #f1f5f9; }\n.feed-win-line .feed-amount { font-weight: 700; color: #00ff88; }\n.feed-game-line { font-size: 11px; color: #555; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.feed-play-btn { background: none; border: none; color: #00ff88; font-size: 11px; cursor: pointer; padding: 0; margin-top: 4px; }\n.feed-play-btn:hover { text-decoration: underline; }\n.feed-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }\n.feed-mult-badge { font-family: monospace; font-weight: 700; font-size: 12px; padding: 2px 7px; border-radius: 10px; background: rgba(255,255,255,0.07); }\n.feed-empty { padding: 40px 20px; text-align: center; color: #444; font-size: 13px; }\n.feed-badge { display: inline-block; background: #00ff88; color: #000; border-radius: 10px; font-size: 10px; font-weight: 700; padding: 1px 5px; margin-left: 4px; vertical-align: middle; line-height: 1.4; }";
        document.head.appendChild(style);
    }

    function findNavBtn() {
        if (navBtnEl) return navBtnEl;
        var btns = document.querySelectorAll("button, a");
        for (var i = 0; i < btns.length; i++) {
            var oc = btns[i].getAttribute("onclick") || "";
            if (oc.indexOf("openFeedPanel") !== -1 || oc.indexOf("toggleFeedPanel") !== -1) {
                navBtnEl = btns[i];
                return navBtnEl;
            }
        }
        navBtnEl = document.getElementById("feedNavBtn");
        return navBtnEl;
    }

    function updateNavBadge() {
        var btn = findNavBtn();
        if (!btn) return;
        var existing = btn.querySelector(".feed-badge");
        if (existing) existing.parentNode.removeChild(existing);
        if (unseenCount > 0) {
            var badge = document.createElement("span");
            badge.className = "feed-badge";
            badge.textContent = unseenCount > 99 ? "99+" : String(unseenCount);
            btn.appendChild(badge);
        }
    }

    function buildPanel() {
        if (panelEl) return;
        injectStyles();
        overlayEl = document.createElement("div");
        overlayEl.className = "feed-panel-overlay";
        overlayEl.addEventListener("click", closeFeedPanel);
        overlayEl.style.display = "none";
        panelEl = document.createElement("div");
        panelEl.id = "feedPanel";
        var header = document.createElement("div");
        header.className = "feed-header";
        var headerRow = document.createElement("div");
        headerRow.className = "feed-header-row";
        var dot = document.createElement("span");
        dot.className = "feed-live-dot";
        var title = document.createElement("span");
        title.className = "feed-title";
        title.textContent = "🎉 LIVE BIG WINS";
        var closeBtn = document.createElement("button");
        closeBtn.className = "feed-close-btn";
        closeBtn.setAttribute("aria-label", "Close feed");
        closeBtn.textContent = "×";
        closeBtn.addEventListener("click", closeFeedPanel);
        headerRow.appendChild(dot);
        headerRow.appendChild(title);
        headerRow.appendChild(closeBtn);
        var subtext = document.createElement("div");
        subtext.className = "feed-subtext";
        subtext.textContent = "Real wins from the last 24 hours";
        header.appendChild(headerRow);
        header.appendChild(subtext);
        feedListEl = document.createElement("div");
        feedListEl.className = "feed-list";
        panelEl.appendChild(header);
        panelEl.appendChild(feedListEl);
        document.body.appendChild(overlayEl);
        document.body.appendChild(panelEl);
    }

    function buildEntry(entry, flash) {
        var gameId = entry.gameId || "";
        var hue = gameIdToHue(gameId);
        var initial = (entry.username || "?").charAt(0).toUpperCase();
        var mColor = multColor(entry.mult);
        var multText = (parseFloat(entry.mult) || 0).toFixed(1) + "×";
        var name = gameName(gameId);
        var row = document.createElement("div");
        row.className = "feed-entry" + (flash ? " new-flash" : "");
        var avatar = document.createElement("div");
        avatar.className = "feed-avatar";
        avatar.style.background = "hsl(" + hue + ",55%,35%)";
        avatar.textContent = initial;
        var info = document.createElement("div");
        info.className = "feed-info";
        var winLine = document.createElement("div");
        winLine.className = "feed-win-line";
        var userSpan = document.createElement("span");
        userSpan.className = "feed-username";
        userSpan.textContent = entry.username || "anon";
        var wonSpan = document.createElement("span");
        wonSpan.textContent = " won ";
        var amtSpan = document.createElement("span");
        amtSpan.className = "feed-amount";
        amtSpan.textContent = formatMoney(entry.win);
        winLine.appendChild(userSpan);
        winLine.appendChild(wonSpan);
        winLine.appendChild(amtSpan);
        var gameLine = document.createElement("div");
        gameLine.className = "feed-game-line";
        gameLine.textContent = name;
        var playBtn = document.createElement("button");
        playBtn.className = "feed-play-btn";
        playBtn.textContent = "▶ Play";
        (function (gid) {
            playBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                if (typeof openSlot === "function") { openSlot(gid); }
                closeFeedPanel();
            });
        }(gameId));
        info.appendChild(winLine);
        info.appendChild(gameLine);
        info.appendChild(playBtn);
        var right = document.createElement("div");
        right.className = "feed-right";
        var badge = document.createElement("span");
        badge.className = "feed-mult-badge";
        badge.style.color = mColor;
        badge.textContent = multText;
        right.appendChild(badge);
        row.appendChild(avatar);
        row.appendChild(info);
        row.appendChild(right);
        return row;
    }

    function renderFeed(entries) {
        if (!feedListEl) return;
        feedListEl.innerHTML = "";
        if (!entries || entries.length === 0) {
            var empty = document.createElement("div");
            empty.className = "feed-empty";
            empty.textContent = "No big wins yet — be the first!";
            feedListEl.appendChild(empty);
            return;
        }
        var display = entries.slice(0, 20);
        for (var i = 0; i < display.length; i++) {
            feedListEl.appendChild(buildEntry(display[i], false));
        }
    }

    function prependNewEntries(newEntries) {
        if (!feedListEl) return;
        var empty = feedListEl.querySelector(".feed-empty");
        if (empty) feedListEl.removeChild(empty);
        for (var i = newEntries.length - 1; i >= 0; i--) {
            var el = buildEntry(newEntries[i], true);
            feedListEl.insertBefore(el, feedListEl.firstChild);
        }
        var all = feedListEl.querySelectorAll(".feed-entry");
        for (var j = 20; j < all.length; j++) {
            all[j].parentNode.removeChild(all[j]);
        }
    }

    function fetchFeed(isFirst) {
        fetch("/api/feed")
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (data) {
                var entries = (data && Array.isArray(data.feed)) ? data.feed : [];
                if (isFirst) {
                    lastTopTs = entries.length > 0 ? entries[0].ts : null;
                    renderFeed(entries);
                    return;
                }
                if (entries.length > 0 && entries[0].ts !== lastTopTs) {
                    var newEntries = [];
                    for (var i = 0; i < entries.length; i++) {
                        if (entries[i].ts === lastTopTs) break;
                        newEntries.push(entries[i]);
                    }
                    lastTopTs = entries[0].ts;
                    if (newEntries.length > 0) {
                        prependNewEntries(newEntries);
                        if (!isOpen) {
                            unseenCount += newEntries.length;
                            updateNavBadge();
                        }
                    }
                }
            })
            .catch(function () {
                if (isFirst && feedListEl) {
                    feedListEl.innerHTML = "";
                    var errEl = document.createElement("div");
                    errEl.className = "feed-empty";
                    errEl.textContent = "Unable to load wins. Retrying…";
                    feedListEl.appendChild(errEl);
                }
            });
    }

    function startPolling() {
        stopPolling();
        fetchFeed(true);
        pollTimer = setInterval(function () { fetchFeed(false); }, 15000);
    }

    function stopPolling() {
        if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null; }
    }

    function onKeyDown(e) {
        if ((e.key === "Escape" || e.keyCode === 27) && isOpen) { closeFeedPanel(); }
    }

    function openFeedPanel() {
        buildPanel();
        isOpen = true;
        lastOpenedAt = Date.now();
        unseenCount = 0;
        updateNavBadge();
        overlayEl.style.display = "block";
        requestAnimationFrame(function () {
            panelEl.classList.add("open");
        });
        startPolling();
        document.addEventListener("keydown", onKeyDown);
    }

    function closeFeedPanel() {
        if (!panelEl) return;
        isOpen = false;
        panelEl.classList.remove("open");
        if (overlayEl) overlayEl.style.display = "none";
        stopPolling();
        document.removeEventListener("keydown", onKeyDown);
    }

    function toggleFeedPanel() {
        if (isOpen) { closeFeedPanel(); } else { openFeedPanel(); }
    }

    function startBackgroundTracking() {
        setInterval(function () {
            if (isOpen) return;
            fetch("/api/feed")
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) {
                    if (!data || !Array.isArray(data.feed) || data.feed.length === 0) return;
                    var topTs = data.feed[0].ts;
                    if (lastTopTs === null) { lastTopTs = topTs; return; }
                    if (topTs !== lastTopTs) {
                        var count = 0;
                        for (var i = 0; i < data.feed.length; i++) {
                            if (data.feed[i].ts === lastTopTs) break;
                            count++;
                        }
                        lastTopTs = topTs;
                        unseenCount += count;
                        updateNavBadge();
                    }
                })
                .catch(function () {});
        }, 15000);
    }

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        injectStyles();
        fetch("/api/feed")
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (data && Array.isArray(data.feed) && data.feed.length > 0) {
                    lastTopTs = data.feed[0].ts;
                }
                startBackgroundTracking();
            })
            .catch(function () { startBackgroundTracking(); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.openFeedPanel   = openFeedPanel;
    window.closeFeedPanel  = closeFeedPanel;
    window.toggleFeedPanel = toggleFeedPanel;

}());
