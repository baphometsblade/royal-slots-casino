// =====================================================================
// SOCIAL GIFTING MODULE — Simulated Friend Gifts & Rewards
// =====================================================================
//
// Loaded via <script> in global scope after ui-promos.js.
// Depends on globals: balance, formatMoney(), updateBalance(), saveBalance(),
//   showWinToast() (optional, from animations.js), showToast() (from ui-modals.js),
//   displayServerWinResult (hooked for Lucky Charm multiplier)
//
// Public API:
//   window.getSocialGiftState()    — read-only snapshot of gift state
//   window.getSocialGiftMultiplier() — current Lucky Charm multiplier (1 or 1.25)
//   window._socialGiftMultiplier   — { active, mult, spinsLeft } (live state)
//
// All DOM created via document.createElement — no innerHTML.
// All CSS class names prefixed with .sgift- to avoid collisions.
// =====================================================================

(function() {
    'use strict';

    // ── QA Suppression ─────────────────────────────────────────────
    var qs = window.location.search || '';
    if (qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1) {
        return;
    }

    // ── Constants ──────────────────────────────────────────────────
    var STORAGE_KEY       = 'socialGiftState';
    var MIN_INTERVAL_MS   = 3 * 60 * 1000;   // 3 minutes
    var MAX_INTERVAL_MS   = 8 * 60 * 1000;   // 8 minutes
    var DISMISS_TIMEOUT   = 15000;            // 15 seconds auto-dismiss
    var MAX_HISTORY       = 10;
    var LUCKY_CHARM_SPINS = 5;
    var LUCKY_CHARM_MULT  = 1.25;
    var FREE_SPIN_VALUE   = 1.00;

    // Gift type definitions with weights
    var GIFT_TYPES = [
        { id: 'credits',    emoji: '\uD83C\uDF81', label: 'Bonus Credits',  weight: 45, minAmt: 0.50, maxAmt: 3.00 },
        { id: 'lucky_charm', emoji: '\uD83C\uDF40', label: 'Lucky Charm',   weight: 25 },
        { id: 'power_spin', emoji: '\u26A1',        label: 'Power Spin',    weight: 20 },
        { id: 'gem_pack',   emoji: '\uD83D\uDC8E', label: 'Gem Pack',      weight: 10, minAmt: 2.00, maxAmt: 8.00 }
    ];

    var TOTAL_WEIGHT = 0;
    for (var i = 0; i < GIFT_TYPES.length; i++) {
        TOTAL_WEIGHT += GIFT_TYPES[i].weight;
    }

    // Pool of simulated sender names
    var SENDER_NAMES = [
        'LuckyLisa', 'SpinMaster_Jake', 'VegasVicky', 'GoldenTiger88',
        'DiamondDave', 'CherryBomb99', 'NeonNightRider', 'JackpotJenny',
        'HighRollerHank', 'StardustSarah', 'AceOfSpades77', 'MysticMoon',
        'ReelQueen', 'BonusBuster', 'SilverFox_22', 'WildCardCarla',
        'ThunderSpin', 'RubyRose_X', 'PlatiNum_P', 'CosmicChris',
        'FortuneFiona', 'SlotSurfer', 'BlazeRunner', 'CrystalKing'
    ];

    // ── State ──────────────────────────────────────────────────────
    var _state = {
        totalReceived: 0,
        history: [],          // [{ sender, giftType, label, emoji, amount, timestamp }]
        lastGiftTime: 0
    };

    var _timerHandle      = null;
    var _dismissHandle    = null;
    var _notifEl          = null;
    var _fabEl            = null;
    var _panelEl          = null;
    var _panelOpen        = false;
    var _stylesInjected   = false;

    // Lucky Charm live state (exposed on window)
    window._socialGiftMultiplier = { active: false, mult: 1, spinsLeft: 0 };

    // ── Persistence ────────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                _state = {
                    totalReceived: parsed.totalReceived || 0,
                    history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : [],
                    lastGiftTime: parsed.lastGiftTime || 0
                };
                // Restore Lucky Charm if saved mid-session
                if (parsed.luckyCharm && parsed.luckyCharm.spinsLeft > 0) {
                    window._socialGiftMultiplier = {
                        active: true,
                        mult: LUCKY_CHARM_MULT,
                        spinsLeft: parsed.luckyCharm.spinsLeft
                    };
                }
            }
        } catch (e) { /* keep defaults */ }
    }

    function saveState() {
        try {
            var toSave = {
                totalReceived: _state.totalReceived,
                history: _state.history.slice(0, MAX_HISTORY),
                lastGiftTime: _state.lastGiftTime
            };
            if (window._socialGiftMultiplier.active) {
                toSave.luckyCharm = {
                    spinsLeft: window._socialGiftMultiplier.spinsLeft
                };
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) { /* silent */ }
    }

    // ── Helpers ────────────────────────────────────────────────────
    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randFloat(min, max) {
        return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function pickGiftType() {
        var roll = Math.random() * TOTAL_WEIGHT;
        var cumulative = 0;
        for (var i = 0; i < GIFT_TYPES.length; i++) {
            cumulative += GIFT_TYPES[i].weight;
            if (roll < cumulative) return GIFT_TYPES[i];
        }
        return GIFT_TYPES[0];
    }

    function fmtMoney(n) {
        if (typeof formatMoney === 'function') return formatMoney(n);
        return '$' + Number(n).toFixed(2);
    }

    function fmtTime(ts) {
        var d = new Date(ts);
        var h = d.getHours();
        var m = d.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
    }

    function nextInterval() {
        return randInt(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
    }

    // ── CSS Injection ──────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        var style = document.createElement('style');
        style.id = 'socialGiftStyles';
        style.textContent = [
            '/* ── Social Gift Notification ─────────────────── */',
            '.sgift-notif {',
            '    position: fixed;',
            '    top: 20px;',
            '    right: 20px;',
            '    z-index:10400;',
            '    width: 320px;',
            '    max-width: calc(100vw - 40px);',
            '    background: linear-gradient(135deg, #ec4899, #8b5cf6);',
            '    border-radius: 16px;',
            '    padding: 20px;',
            '    color: #fff;',
            '    font-family: inherit;',
            '    box-shadow: 0 8px 32px rgba(236, 72, 153, 0.4), 0 0 0 1px rgba(255,255,255,0.15);',
            '    transform: translateX(120%);',
            '    opacity: 0;',
            '    transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;',
            '    pointer-events: auto;',
            '}',
            '.sgift-notif.sgift-visible {',
            '    transform: translateX(0);',
            '    opacity: 1;',
            '}',
            '.sgift-notif-header {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 10px;',
            '    margin-bottom: 12px;',
            '}',
            '.sgift-notif-avatar {',
            '    width: 40px;',
            '    height: 40px;',
            '    border-radius: 50%;',
            '    background: rgba(255,255,255,0.25);',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    font-size: 20px;',
            '    flex-shrink: 0;',
            '}',
            '.sgift-notif-sender {',
            '    font-weight: 700;',
            '    font-size: 14px;',
            '    opacity: 0.95;',
            '}',
            '.sgift-notif-subtitle {',
            '    font-size: 11px;',
            '    opacity: 0.7;',
            '    margin-top: 2px;',
            '}',
            '.sgift-notif-body {',
            '    background: rgba(0,0,0,0.2);',
            '    border-radius: 10px;',
            '    padding: 12px;',
            '    margin-bottom: 14px;',
            '    text-align: center;',
            '}',
            '.sgift-notif-emoji {',
            '    font-size: 28px;',
            '    display: block;',
            '    margin-bottom: 6px;',
            '}',
            '.sgift-notif-gift-label {',
            '    font-size: 15px;',
            '    font-weight: 600;',
            '}',
            '.sgift-notif-gift-desc {',
            '    font-size: 12px;',
            '    opacity: 0.8;',
            '    margin-top: 4px;',
            '}',
            '.sgift-notif-actions {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 12px;',
            '}',
            '.sgift-btn-accept {',
            '    flex: 1;',
            '    padding: 10px 16px;',
            '    border: none;',
            '    border-radius: 10px;',
            '    background: linear-gradient(135deg, #22c55e, #16a34a);',
            '    color: #fff;',
            '    font-size: 14px;',
            '    font-weight: 700;',
            '    cursor: pointer;',
            '    transition: transform 0.15s ease, box-shadow 0.15s ease;',
            '    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);',
            '}',
            '.sgift-btn-accept:hover {',
            '    transform: scale(1.04);',
            '    box-shadow: 0 6px 18px rgba(34, 197, 94, 0.5);',
            '}',
            '.sgift-btn-decline {',
            '    background: none;',
            '    border: none;',
            '    color: rgba(255,255,255,0.55);',
            '    font-size: 12px;',
            '    cursor: pointer;',
            '    padding: 4px 8px;',
            '    transition: color 0.15s;',
            '}',
            '.sgift-btn-decline:hover {',
            '    color: rgba(255,255,255,0.85);',
            '}',
            '.sgift-btn-sendback {',
            '    width: 100%;',
            '    padding: 8px;',
            '    border: 1px solid rgba(255,255,255,0.3);',
            '    border-radius: 8px;',
            '    background: rgba(255,255,255,0.1);',
            '    color: #fff;',
            '    font-size: 12px;',
            '    font-weight: 600;',
            '    cursor: pointer;',
            '    margin-top: 8px;',
            '    transition: background 0.15s;',
            '}',
            '.sgift-btn-sendback:hover {',
            '    background: rgba(255,255,255,0.2);',
            '}',
            '',
            '/* ── Gift FAB ──────────────────────────────────── */',
            '.sgift-fab {',
            '    position: fixed;',
            '    bottom: 80px;',
            '    left: 16px;',
            '    z-index:10400;',
            '    width: 48px;',
            '    height: 48px;',
            '    border-radius: 50%;',
            '    background: linear-gradient(135deg, #ec4899, #8b5cf6);',
            '    border: none;',
            '    color: #fff;',
            '    font-size: 22px;',
            '    cursor: pointer;',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4);',
            '    transition: transform 0.2s ease, box-shadow 0.2s ease;',
            '}',
            '.sgift-fab:hover {',
            '    transform: scale(1.1);',
            '    box-shadow: 0 6px 24px rgba(236, 72, 153, 0.5);',
            '}',
            '.sgift-fab-badge {',
            '    position: absolute;',
            '    top: -4px;',
            '    right: -4px;',
            '    min-width: 18px;',
            '    height: 18px;',
            '    border-radius: 9px;',
            '    background: #ef4444;',
            '    color: #fff;',
            '    font-size: 10px;',
            '    font-weight: 700;',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    padding: 0 4px;',
            '    line-height: 1;',
            '}',
            '',
            '/* ── Gift History Panel ─────────────────────────── */',
            '.sgift-panel {',
            '    position: fixed;',
            '    bottom: 136px;',
            '    left: 16px;',
            '    z-index:10400;',
            '    width: 300px;',
            '    max-width: calc(100vw - 32px);',
            '    max-height: 360px;',
            '    background: linear-gradient(160deg, #1e1b3a, #2d1f4e);',
            '    border: 1px solid rgba(236, 72, 153, 0.3);',
            '    border-radius: 14px;',
            '    padding: 16px;',
            '    color: #fff;',
            '    overflow-y: auto;',
            '    box-shadow: 0 8px 32px rgba(0,0,0,0.5);',
            '    transform: translateY(12px);',
            '    opacity: 0;',
            '    pointer-events: none;',
            '    transition: transform 0.3s ease, opacity 0.25s ease;',
            '}',
            '.sgift-panel.sgift-panel-open {',
            '    transform: translateY(0);',
            '    opacity: 1;',
            '    pointer-events: auto;',
            '}',
            '.sgift-panel-title {',
            '    font-size: 15px;',
            '    font-weight: 700;',
            '    margin-bottom: 4px;',
            '}',
            '.sgift-panel-count {',
            '    font-size: 11px;',
            '    opacity: 0.6;',
            '    margin-bottom: 12px;',
            '}',
            '.sgift-history-item {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 10px;',
            '    padding: 8px 0;',
            '    border-bottom: 1px solid rgba(255,255,255,0.08);',
            '}',
            '.sgift-history-item:last-child {',
            '    border-bottom: none;',
            '}',
            '.sgift-history-emoji {',
            '    font-size: 20px;',
            '    flex-shrink: 0;',
            '}',
            '.sgift-history-info {',
            '    flex: 1;',
            '    min-width: 0;',
            '}',
            '.sgift-history-label {',
            '    font-size: 13px;',
            '    font-weight: 600;',
            '    white-space: nowrap;',
            '    overflow: hidden;',
            '    text-overflow: ellipsis;',
            '}',
            '.sgift-history-meta {',
            '    font-size: 11px;',
            '    opacity: 0.55;',
            '    margin-top: 1px;',
            '}',
            '.sgift-history-empty {',
            '    text-align: center;',
            '    opacity: 0.4;',
            '    font-size: 13px;',
            '    padding: 20px 0;',
            '}',
            '',
            '/* ── Lucky Charm Indicator ──────────────────────── */',
            '.sgift-charm-badge {',
            '    position: fixed;',
            '    top: 70px;',
            '    right: 20px;',
            '    z-index:10400;',
            '    background: linear-gradient(135deg, #22c55e, #15803d);',
            '    color: #fff;',
            '    padding: 6px 14px;',
            '    border-radius: 20px;',
            '    font-size: 12px;',
            '    font-weight: 700;',
            '    box-shadow: 0 4px 12px rgba(34,197,94,0.4);',
            '    transition: opacity 0.3s ease;',
            '}',
            ''
        ].join('\n');

        document.head.appendChild(style);
    }

    // ── DOM Builders ───────────────────────────────────────────────
    function createNotification(sender, gift, amount, description) {
        dismissNotification(); // clear any existing

        var el = document.createElement('div');
        el.className = 'sgift-notif';

        // Header
        var header = document.createElement('div');
        header.className = 'sgift-notif-header';

        var avatar = document.createElement('div');
        avatar.className = 'sgift-notif-avatar';
        avatar.textContent = sender.charAt(0).toUpperCase();

        var senderInfo = document.createElement('div');
        var senderName = document.createElement('div');
        senderName.className = 'sgift-notif-sender';
        senderName.textContent = sender;
        var subtitle = document.createElement('div');
        subtitle.className = 'sgift-notif-subtitle';
        subtitle.textContent = 'sent you a gift!';

        senderInfo.appendChild(senderName);
        senderInfo.appendChild(subtitle);
        header.appendChild(avatar);
        header.appendChild(senderInfo);

        // Body
        var body = document.createElement('div');
        body.className = 'sgift-notif-body';

        var emojiSpan = document.createElement('span');
        emojiSpan.className = 'sgift-notif-emoji';
        emojiSpan.textContent = gift.emoji;

        var labelDiv = document.createElement('div');
        labelDiv.className = 'sgift-notif-gift-label';
        labelDiv.textContent = gift.label;

        var descDiv = document.createElement('div');
        descDiv.className = 'sgift-notif-gift-desc';
        descDiv.textContent = description;

        body.appendChild(emojiSpan);
        body.appendChild(labelDiv);
        body.appendChild(descDiv);

        // Actions
        var actions = document.createElement('div');
        actions.className = 'sgift-notif-actions';

        var acceptBtn = document.createElement('button');
        acceptBtn.className = 'sgift-btn-accept';
        acceptBtn.textContent = 'Accept Gift';

        var declineBtn = document.createElement('button');
        declineBtn.className = 'sgift-btn-decline';
        declineBtn.textContent = 'Decline';

        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);

        el.appendChild(header);
        el.appendChild(body);
        el.appendChild(actions);

        document.body.appendChild(el);
        _notifEl = el;

        // Animate in (next frame for transition)
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                el.classList.add('sgift-visible');
            });
        });

        // Wire buttons
        acceptBtn.addEventListener('click', function() {
            acceptGift(sender, gift, amount);
        });

        declineBtn.addEventListener('click', function() {
            dismissNotification();
        });

        // Auto-dismiss after timeout
        _dismissHandle = setTimeout(function() {
            dismissNotification();
        }, DISMISS_TIMEOUT);

        return el;
    }

    function showSendBackButton(sender) {
        if (!_notifEl) return;

        // Remove action buttons
        var actions = _notifEl.querySelector('.sgift-notif-actions');
        if (actions) actions.remove();

        var sendBack = document.createElement('button');
        sendBack.className = 'sgift-btn-sendback';
        sendBack.textContent = 'Send Gift Back to ' + sender;
        sendBack.addEventListener('click', function() {
            // Cosmetic only
            if (typeof showWinToast === 'function') {
                showWinToast('Gift sent to ' + sender + '!', 'big');
            } else if (typeof showToast === 'function') {
                showToast('Gift sent to ' + sender + '!');
            }
            dismissNotification();
        });

        _notifEl.appendChild(sendBack);

        // Auto-dismiss in 5 seconds
        clearTimeout(_dismissHandle);
        _dismissHandle = setTimeout(function() {
            dismissNotification();
        }, 5000);
    }

    function dismissNotification() {
        clearTimeout(_dismissHandle);
        _dismissHandle = null;
        if (_notifEl) {
            _notifEl.classList.remove('sgift-visible');
            var ref = _notifEl;
            setTimeout(function() {
                if (ref.parentNode) ref.parentNode.removeChild(ref);
            }, 500);
            _notifEl = null;
        }
    }

    // ── FAB & Panel ────────────────────────────────────────────────
    function createFAB() {
        if (_fabEl) return;

        var fab = document.createElement('button');
        fab.className = 'sgift-fab';
        fab.setAttribute('aria-label', 'Gift History');
        fab.textContent = '\uD83C\uDF81'; // gift emoji

        var badge = document.createElement('span');
        badge.className = 'sgift-fab-badge';
        badge.textContent = String(_state.totalReceived);
        badge.style.display = _state.totalReceived > 0 ? 'flex' : 'none';
        fab.appendChild(badge);

        fab.addEventListener('click', function() {
            togglePanel();
        });

        document.body.appendChild(fab);
        _fabEl = fab;
    }

    function updateFABBadge() {
        if (!_fabEl) return;
        var badge = _fabEl.querySelector('.sgift-fab-badge');
        if (badge) {
            badge.textContent = String(_state.totalReceived);
            badge.style.display = _state.totalReceived > 0 ? 'flex' : 'none';
        }
    }

    function createPanel() {
        if (_panelEl) return;

        var panel = document.createElement('div');
        panel.className = 'sgift-panel';

        _panelEl = panel;
        document.body.appendChild(panel);
        renderPanelContent();
    }

    function renderPanelContent() {
        if (!_panelEl) return;

        // Clear existing children
        while (_panelEl.firstChild) {
            _panelEl.removeChild(_panelEl.firstChild);
        }

        var title = document.createElement('div');
        title.className = 'sgift-panel-title';
        title.textContent = 'Gift History';

        var count = document.createElement('div');
        count.className = 'sgift-panel-count';
        count.textContent = _state.totalReceived + ' total gifts received';

        _panelEl.appendChild(title);
        _panelEl.appendChild(count);

        if (_state.history.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'sgift-history-empty';
            empty.textContent = 'No gifts received yet. Keep playing!';
            _panelEl.appendChild(empty);
            return;
        }

        for (var i = 0; i < _state.history.length; i++) {
            var entry = _state.history[i];
            var item = document.createElement('div');
            item.className = 'sgift-history-item';

            var emojiEl = document.createElement('span');
            emojiEl.className = 'sgift-history-emoji';
            emojiEl.textContent = entry.emoji;

            var info = document.createElement('div');
            info.className = 'sgift-history-info';

            var label = document.createElement('div');
            label.className = 'sgift-history-label';
            label.textContent = entry.label + (entry.amount ? ' ' + fmtMoney(entry.amount) : '');

            var meta = document.createElement('div');
            meta.className = 'sgift-history-meta';
            meta.textContent = 'From ' + entry.sender + ' \u00B7 ' + fmtTime(entry.timestamp);

            info.appendChild(label);
            info.appendChild(meta);
            item.appendChild(emojiEl);
            item.appendChild(info);
            _panelEl.appendChild(item);
        }
    }

    function togglePanel() {
        if (!_panelEl) createPanel();
        _panelOpen = !_panelOpen;
        if (_panelOpen) {
            renderPanelContent();
            _panelEl.classList.add('sgift-panel-open');
        } else {
            _panelEl.classList.remove('sgift-panel-open');
        }
    }

    // ── Lucky Charm Badge ──────────────────────────────────────────
    var _charmBadgeEl = null;

    function showCharmBadge() {
        if (_charmBadgeEl) removeCharmBadge();

        var badge = document.createElement('div');
        badge.className = 'sgift-charm-badge';
        badge.textContent = '\uD83C\uDF40 Lucky Charm: ' + window._socialGiftMultiplier.spinsLeft + ' spins left';
        document.body.appendChild(badge);
        _charmBadgeEl = badge;
    }

    function updateCharmBadge() {
        if (!_charmBadgeEl) return;
        if (window._socialGiftMultiplier.spinsLeft > 0) {
            _charmBadgeEl.textContent = '\uD83C\uDF40 Lucky Charm: ' + window._socialGiftMultiplier.spinsLeft + ' spins left';
        } else {
            removeCharmBadge();
        }
    }

    function removeCharmBadge() {
        if (_charmBadgeEl && _charmBadgeEl.parentNode) {
            _charmBadgeEl.parentNode.removeChild(_charmBadgeEl);
        }
        _charmBadgeEl = null;
    }

    // ── Gift Logic ─────────────────────────────────────────────────
    function generateGift() {
        var gift = pickGiftType();
        var sender = pickRandom(SENDER_NAMES);
        var amount = 0;
        var description = '';

        switch (gift.id) {
            case 'credits':
                amount = randFloat(gift.minAmt, gift.maxAmt);
                description = fmtMoney(amount) + ' bonus credits';
                break;
            case 'lucky_charm':
                description = LUCKY_CHARM_SPINS + ' spins with ' + LUCKY_CHARM_MULT + 'x multiplier';
                break;
            case 'power_spin':
                amount = FREE_SPIN_VALUE;
                description = 'One free spin token (' + fmtMoney(FREE_SPIN_VALUE) + ')';
                break;
            case 'gem_pack':
                amount = randFloat(gift.minAmt, gift.maxAmt);
                description = fmtMoney(amount) + ' gem credits';
                break;
        }

        createNotification(sender, gift, amount, description);
    }

    function acceptGift(sender, gift, amount) {
        clearTimeout(_dismissHandle);
        _dismissHandle = null;

        // Apply gift effect
        switch (gift.id) {
            case 'credits':
            case 'gem_pack':
                if (typeof balance !== 'undefined') {
                    balance += amount;
                    if (typeof updateBalance === 'function') updateBalance();
                    if (typeof saveBalance === 'function') saveBalance();
                }
                if (typeof showWinToast === 'function') {
                    showWinToast(gift.emoji + ' ' + fmtMoney(amount) + ' from ' + sender + '!', 'big');
                }
                break;

            case 'lucky_charm':
                window._socialGiftMultiplier = {
                    active: true,
                    mult: LUCKY_CHARM_MULT,
                    spinsLeft: LUCKY_CHARM_SPINS
                };
                showCharmBadge();
                if (typeof showWinToast === 'function') {
                    showWinToast('\uD83C\uDF40 Lucky Charm active! ' + LUCKY_CHARM_SPINS + ' boosted spins', 'epic');
                }
                break;

            case 'power_spin':
                if (typeof balance !== 'undefined') {
                    balance += FREE_SPIN_VALUE;
                    if (typeof updateBalance === 'function') updateBalance();
                    if (typeof saveBalance === 'function') saveBalance();
                }
                if (typeof showWinToast === 'function') {
                    showWinToast('\u26A1 Power Spin from ' + sender + '!', 'big');
                }
                break;
        }

        // Record in history
        var record = {
            sender: sender,
            giftType: gift.id,
            label: gift.label,
            emoji: gift.emoji,
            amount: amount || null,
            timestamp: Date.now()
        };
        _state.history.unshift(record);
        if (_state.history.length > MAX_HISTORY) {
            _state.history = _state.history.slice(0, MAX_HISTORY);
        }
        _state.totalReceived++;
        _state.lastGiftTime = Date.now();
        saveState();
        updateFABBadge();

        // Show send-back button
        showSendBackButton(sender);
    }

    // ── displayServerWinResult Hook (Lucky Charm) ──────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            var charm = window._socialGiftMultiplier;
            if (charm.active && charm.spinsLeft > 0 && result && result.winAmount > 0) {
                var bonus = result.winAmount * (charm.mult - 1);
                bonus = Math.round(bonus * 100) / 100;
                result.winAmount = Math.round((result.winAmount + bonus) * 100) / 100;

                // Adjust balance in the result
                if (typeof result.balance === 'number' || typeof result.balance === 'string') {
                    var bal = Number(result.balance);
                    if (Number.isFinite(bal)) {
                        result.balance = bal + bonus;
                    }
                }
            }

            // Decrement spins counter (regardless of win/loss)
            if (charm.active && charm.spinsLeft > 0) {
                charm.spinsLeft--;
                if (charm.spinsLeft <= 0) {
                    charm.active = false;
                    charm.mult = 1;
                    charm.spinsLeft = 0;
                    removeCharmBadge();
                } else {
                    updateCharmBadge();
                }
                saveState();
            }

            _orig.call(this, result, game);
        };
    }

    // ── Timer / Scheduling ─────────────────────────────────────────
    function scheduleNextGift() {
        clearTimeout(_timerHandle);
        var delay = nextInterval();
        _timerHandle = setTimeout(function() {
            generateGift();
            scheduleNextGift();
        }, delay);
    }

    // ── Public API ─────────────────────────────────────────────────
    window.getSocialGiftState = function() {
        return {
            totalReceived: _state.totalReceived,
            historyCount: _state.history.length,
            luckyCharmActive: window._socialGiftMultiplier.active,
            luckyCharmSpinsLeft: window._socialGiftMultiplier.spinsLeft
        };
    };

    window.getSocialGiftMultiplier = function() {
        return window._socialGiftMultiplier.active ? window._socialGiftMultiplier.mult : 1;
    };

    // ── Bootstrap ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        loadState();
        createFAB();
        hookWinResult();

        // If Lucky Charm was persisted, restore badge
        if (window._socialGiftMultiplier.active && window._socialGiftMultiplier.spinsLeft > 0) {
            showCharmBadge();
        }

        scheduleNextGift();
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}());
