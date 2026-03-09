(function () {
    'use strict';

    /* ---- State ---- */
    var _session = null;
    var _dismissTimer = null;
    var _stylesInjected = false;

    function _resetSession(gameId) {
        var stats = window.stats || {};
        _session = {
            gameId:      gameId || '',
            spinsStart:  (stats.totalSpins   || 0),
            wageredStart:(stats.totalWagered || 0),
            wonStart:    (stats.totalWon     || 0)
        };
    }

    function _takeSnapshot() {
        var stats   = window.stats || {};
        var sess    = _session || {};
        var spins   = Math.max(0, (stats.totalSpins   || 0) - (sess.spinsStart   || 0));
        var wagered = Math.max(0, (stats.totalWagered || 0) - (sess.wageredStart || 0));
        var won     = Math.max(0, (stats.totalWon     || 0) - (sess.wonStart     || 0));
        var net     = won - wagered;
        return {
            gameId:  sess.gameId || '',
            spins:   spins,
            wagered: wagered,
            won:     won,
            net:     net
        };
    }

    var _prevOpenSlot = window.openSlot;
    window.openSlot = function (gameId) {
        _resetSession(gameId);
        if (_prevOpenSlot) _prevOpenSlot.apply(this, arguments);
    };

    var _prevCloseSlot = window.closeSlot;
    window.closeSlot = function () {
        var snap = _takeSnapshot();
        if (_prevCloseSlot) _prevCloseSlot.apply(this, arguments);
        if (snap.spins >= 3) {
            setTimeout(function () { _showSummary(snap); }, 400);
        }
    };

    function _fmt(n) {
        return '$' + parseFloat(n || 0).toFixed(2);
    }

    function _fmtGame(id) {
        if (!id) return 'Slot Game';
        return id.replace(/_/g, ' ').replace(/-/g, ' ')
            .replace(/w/g, function (c) { return c.toUpperCase(); });
    }

    function _injectStyles() {
        if (_stylesInjected || document.getElementById('sessStyles')) {
            _stylesInjected = true;
            return;
        }
        var style = document.createElement('style');
        style.id = 'sessStyles';
        var css = [
            '#sessOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;padding-bottom:0;animation:sessFadeIn .3s ease}',
            '@keyframes sessFadeIn{from{opacity:0}to{opacity:1}}',
            '#sessCard{background:#0d0d1a;border:1px solid rgba(255,255,255,.1);border-radius:20px 20px 0 0;padding:24px;width:100%;max-width:420px;animation:sessSlideUp .35s ease}',
            '@keyframes sessSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
            '.sess-header{display:flex;align-items:center;gap:14px;margin-bottom:18px}',
            '.sess-icon{font-size:36px}',
            '.sess-title{font-size:18px;font-weight:800;color:#ffd700}',
            '.sess-gamename{font-size:12px;color:rgba(255,255,255,.4);margin-top:2px}',
            '.sess-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}',
            '.sess-stat{background:rgba(255,255,255,.05);border-radius:8px;padding:10px 6px;text-align:center}',
            '.sess-stat-label{font-size:10px;color:rgba(255,255,255,.4);margin-bottom:4px}',
            '.sess-stat-value{font-size:15px;font-weight:700;color:#fff}',
            '.sess-net-result{font-size:36px;font-weight:900;text-align:center;margin-bottom:4px}',
            '.sess-net-positive{color:#4ade80}',
            '.sess-net-negative{color:#fbbf24}',
            '.sess-net-label{font-size:11px;color:rgba(255,255,255,.3);text-align:center;margin-bottom:16px}',
            '.sess-offer-header{font-size:13px;color:rgba(255,255,255,.5);text-align:center;margin-bottom:10px}',
            '.sess-bundle-card{background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.2);border-radius:10px;padding:12px 14px;margin-bottom:12px;text-align:center}',
            '.sess-bundle-name{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:3px}',
            '.sess-bundle-credits{font-size:17px;font-weight:800;color:#fff;margin-bottom:2px}',
            '.sess-bundle-price{font-size:22px;font-weight:900;color:#ffd700}',
            '.sess-win-msg{text-align:center;font-size:18px;font-weight:700;color:#4ade80;margin-bottom:16px;padding:12px}',
            '.sess-buy-btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;padding:12px;border-radius:8px;font-size:15px;font-weight:800;cursor:pointer;width:100%;margin-bottom:10px}',
            '.sess-actions{display:flex;gap:10px;margin-bottom:12px}',
            '.sess-play-again{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:8px;padding:11px;font-size:14px;font-weight:700;cursor:pointer}',
            '.sess-lobby{flex:1;background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);border-radius:8px;padding:11px;font-size:14px;cursor:pointer}',
            '.sess-progress-bar{height:2px;background:rgba(255,255,255,.1);border-radius:1px;overflow:hidden}',
            '.sess-progress-fill{height:100%;background:#ffd700;width:100%;transition:width 20s linear}'
        ].join('');
        style.textContent = css;
        document.head.appendChild(style);
        _stylesInjected = true;
    }

    function closeSummary() {
        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            _dismissTimer = null;
        }
        var overlay = document.getElementById('sessOverlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    function _makeStat(label, value) {
        var pill = document.createElement('div');
        pill.className = 'sess-stat';
        var lbl = document.createElement('div');
        lbl.className = 'sess-stat-label';
        lbl.textContent = label;
        var val = document.createElement('div');
        val.className = 'sess-stat-value';
        val.textContent = value;
        pill.appendChild(lbl);
        pill.appendChild(val);
        return pill;
    }

    function _buildCard(snap) {
        var card = document.createElement('div');
        card.id = 'sessCard';

        var header = document.createElement('div');
        header.className = 'sess-header';
        var icon = document.createElement('div');
        icon.className = 'sess-icon';
        icon.textContent = '🎰';
        var headText = document.createElement('div');
        var titleEl = document.createElement('div');
        titleEl.className = 'sess-title';
        titleEl.textContent = 'Session Recap';
        var gameNameEl = document.createElement('div');
        gameNameEl.className = 'sess-gamename';
        gameNameEl.textContent = _fmtGame(snap.gameId);
        headText.appendChild(titleEl);
        headText.appendChild(gameNameEl);
        header.appendChild(icon);
        header.appendChild(headText);
        card.appendChild(header);

        var statsRow = document.createElement('div');
        statsRow.className = 'sess-stats-row';
        statsRow.appendChild(_makeStat('Spins', String(snap.spins)));
        statsRow.appendChild(_makeStat('Wagered', _fmt(snap.wagered)));
        statsRow.appendChild(_makeStat('Won', _fmt(snap.won)));
        var bestMult = window.stats &&
            (window.stats.biggestWinMult || window.stats.maxMultiplier);
        if (bestMult && bestMult > 0) {
            statsRow.appendChild(_makeStat('Best', parseFloat(bestMult).toFixed(1) + 'x'));
        } else {
            var rtp = snap.wagered > 0
                ? ((snap.won / snap.wagered) * 100).toFixed(0) + '%'
                : '—';
            statsRow.appendChild(_makeStat('RTP', rtp));
        }
        card.appendChild(statsRow);

        var netEl = document.createElement('div');
        netEl.className = 'sess-net-result ' +
            (snap.net >= 0 ? 'sess-net-positive' : 'sess-net-negative');
        netEl.textContent = (snap.net >= 0 ? '+' : '') + _fmt(snap.net);
        card.appendChild(netEl);
        var netLabelEl = document.createElement('div');
        netLabelEl.className = 'sess-net-label';
        netLabelEl.textContent = 'Net result';
        card.appendChild(netLabelEl);

        if (snap.net < 0) {
            var offerHeader = document.createElement('div');
            offerHeader.className = 'sess-offer-header';
            offerHeader.textContent = 'Want to turn it around?';
            card.appendChild(offerHeader);
            var bundleSlot = document.createElement('div');
            bundleSlot.id = 'sessBundleSlot';
            card.appendChild(bundleSlot);
            var buyBtn = document.createElement('button');
            buyBtn.className = 'sess-buy-btn';
            buyBtn.textContent = '💎 Top Up & Try Again';
            buyBtn.addEventListener('click', function () {
                closeSummary();
                if (typeof window.openBundleStore === 'function') {
                    window.openBundleStore();
                } else if (typeof window.openWalletModal === 'function') {
                    window.openWalletModal();
                }
            });
            card.appendChild(buyBtn);
        } else {
            var winMsg = document.createElement('div');
            winMsg.className = 'sess-win-msg';
            winMsg.textContent = 'Great session! 🎉';
            card.appendChild(winMsg);
        }

        var actions = document.createElement('div');
        actions.className = 'sess-actions';
        var playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'sess-play-again';
        playAgainBtn.textContent = '▶ Play Again';
        playAgainBtn.addEventListener('click', function () {
            var gid = snap.gameId;
            closeSummary();
            if (gid && typeof window.openSlot === 'function') {
                window.openSlot(gid);
            }
        });
        var lobbyBtn = document.createElement('button');
        lobbyBtn.className = 'sess-lobby';
        lobbyBtn.textContent = '🏠 Lobby';
        lobbyBtn.addEventListener('click', function () {
            closeSummary();
        });
        actions.appendChild(playAgainBtn);
        actions.appendChild(lobbyBtn);
        card.appendChild(actions);

        var progressBar = document.createElement('div');
        progressBar.className = 'sess-progress-bar';
        var progressFill = document.createElement('div');
        progressFill.className = 'sess-progress-fill';
        progressBar.appendChild(progressFill);
        card.appendChild(progressBar);
        return { card: card, progressFill: progressFill };
    }

    function _fillBundleSlot(bundle) {
        var slot = document.getElementById('sessBundleSlot');
        if (!slot) return;
        var bc = document.createElement('div');
        bc.className = 'sess-bundle-card';
        var bName = document.createElement('div');
        bName.className = 'sess-bundle-name';
        bName.textContent = bundle.name || 'Gold Bundle';
        var bCredits = document.createElement('div');
        bCredits.className = 'sess-bundle-credits';
        bCredits.textContent = (bundle.totalCredits || bundle.credits || '') + ' total credits';
        var bPrice = document.createElement('div');
        bPrice.className = 'sess-bundle-price';
        bPrice.textContent = '$' + parseFloat(bundle.price || 0).toFixed(2);
        bc.appendChild(bName);
        bc.appendChild(bCredits);
        bc.appendChild(bPrice);
        slot.appendChild(bc);
    }

    function _showSummary(snap) {
        if (document.getElementById('sessOverlay')) return;
        _injectStyles();
        var overlay = document.createElement('div');
        overlay.id = 'sessOverlay';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeSummary();
        });
        var built = _buildCard(snap);
        overlay.appendChild(built.card);
        document.body.appendChild(overlay);
        setTimeout(function () {
            built.progressFill.style.width = '0%';
        }, 50);
        _dismissTimer = setTimeout(function () {
            closeSummary();
        }, 20000);
        if (snap.net < 0) {
            fetch('/api/bundles')
                .then(function (res) {
                    if (!res.ok) throw new Error('not ok');
                    return res.json();
                })
                .then(function (data) {
                    var bundles = Array.isArray(data) ? data : (data.bundles || []);
                    if (!bundles.length) return;
                    var chosen = null;
                    for (var i = 0; i < bundles.length; i++) {
                        if (bundles[i].id === 'gold') { chosen = bundles[i]; break; }
                        if (!chosen ||
                            (bundles[i].totalCredits || 0) > (chosen.totalCredits || 0)) {
                            chosen = bundles[i];
                        }
                    }
                    if (chosen) _fillBundleSlot(chosen);
                })
                .catch(function () {});
        }
    }

    window.closeSummary = closeSummary;

}());
