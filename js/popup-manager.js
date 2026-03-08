(function () {
    'use strict';

    /* ══════════════════════════════════════════════════════════════════════
     * Popup Manager — Centralized overlay/panel throttle system
     *
     * Problem: 50+ independent features all show popups/overlays/panels
     * simultaneously, overwhelming players with too many UI elements.
     *
     * Solution: MutationObserver-based manager that:
     *   1. Detects when overlays/panels become visible
     *   2. Enforces max 1 modal overlay at a time
     *   3. Enforces max 2 side panels/bars at a time
     *   4. 2-minute cooldown between modal popups
     *   5. Auto-hides excess panels after 8 seconds
     *   6. Queues blocked popups for later display
     *
     * This file must load AFTER all feature scripts so the MutationObserver
     * can watch their DOM elements.
     * ══════════════════════════════════════════════════════════════════════ */

    var MODAL_COOLDOWN_MS = 120000;   // 2 minutes between full-screen modals
    var MAX_PANELS = 2;               // max side panels/bars visible at once
    var PANEL_AUTO_HIDE_MS = 8000;    // auto-hide excess panels after 8s
    var QUEUE_CHECK_INTERVAL = 5000;  // check queue every 5 seconds

    /* ── Overlay/Panel registry ─────────────────────────────────────────── */

    // Full-screen modals/overlays (block the screen)
    var MODAL_IDS = [
        'slotFeaturePopup', 'welcomeOfferOverlay', 'exitIntentOverlay',
        'flashSaleOverlay', 'lossRecoveryOverlay', 'firstDepositOverlay',
        'piggyBankModal', 'loyaltyShopModal', 'depositMatchOverlay',
        'luckyWheelOverlay', 'lossComfortOverlay', 'comebackOverlay',
        'lossRecovery2Overlay', 'loyaltyShop2Modal', 'winWheelOverlay',
        'mysteryBoxOverlay', 'vipWheelOverlay', 'luckyNumberOverlay',
        'winCelebrationOverlay', 'mysteryGiftOverlay', 'lossStreakComfort',
        'sessionRewardPopup', 'vipLoungeInvite', 'dailyLoginCalendar',
        'socialSharePanel'
    ];

    // Side panels, bars, banners (don't block, but clutter the screen)
    var PANEL_IDS = [
        'happyHourBanner', 'referralPanel', 'spinStreakBar',
        'sessionTimeBar', 'winMultiplierBanner', 'dailyChallengePanel',
        'dcFab', 'flashDealBanner', 'vipProgressMeter',
        'socialProofContainer', 'reloadBonusBar', 'jackpotTicker',
        'referralLeaderboard', 'spinInsuranceBar', 'happyHourBar',
        'sessionMilestoneBar', 'betSuggestChip', 'loyaltyShop2Fab',
        'autoCashoutPanel', 'tournamentBar', 'bonusMeterBar',
        'dailyCashbackPanel', 'slotRaceBar', 'depositStreakPanel',
        'lossLimitBar', 'quickBetStrip', 'spinMultiplierBanner',
        'referralTrackerPanel', 'achievementBadgePanel', 'betInsuranceBar',
        'loyaltyPointsShop', 'autoCollectBar', 'favQuickPlayBar',
        'wagerProgressPanel', 'freeSpinMeterBar', 'dailyDepositGoal',
        'cashbackStreakBar', 'betLadderPanel', 'tournamentLeaderboard',
        'slotRaceTimer', 'jackpotContribMeter', 'megaJackpotTicker',
        'playerDashWidget', 'piggyBankWidget'
    ];

    var _lastModalTime = 0;
    var _activeModalId = null;
    var _activePanelIds = [];
    var _modalQueue = [];
    var _observer = null;

    /* ── Helpers ─────────────────────────────────────────────────────────── */

    function _isVisible(el) {
        if (!el) return false;
        var style = el.style;
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (el.classList.contains('active') || style.display === 'block' || style.display === 'flex') {
            return true;
        }
        // Check computed style as fallback
        var computed = window.getComputedStyle(el);
        return computed.display !== 'none' && computed.visibility !== 'hidden';
    }

    function _hideElement(el) {
        if (!el) return;
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.classList.remove('active');
    }

    function _isModal(id) {
        return MODAL_IDS.indexOf(id) !== -1;
    }

    function _isPanel(id) {
        return PANEL_IDS.indexOf(id) !== -1;
    }

    /* ── Modal throttle ─────────────────────────────────────────────────── */

    function _canShowModal() {
        // Must wait for cooldown since last modal
        var elapsed = Date.now() - _lastModalTime;
        if (elapsed < MODAL_COOLDOWN_MS && _lastModalTime > 0) return false;
        // No other modal should be active
        if (_activeModalId) {
            var activeEl = document.getElementById(_activeModalId);
            if (activeEl && _isVisible(activeEl)) return false;
            _activeModalId = null; // was dismissed
        }
        return true;
    }

    function _handleModalShow(id) {
        if (!_canShowModal()) {
            // Hide this modal and queue it
            var el = document.getElementById(id);
            _hideElement(el);
            // Add to queue if not already there
            if (_modalQueue.indexOf(id) === -1) {
                _modalQueue.push(id);
            }
            return;
        }
        _activeModalId = id;
        _lastModalTime = Date.now();
    }

    function _handleModalHide(id) {
        if (_activeModalId === id) {
            _activeModalId = null;
        }
    }

    /* ── Panel throttle ─────────────────────────────────────────────────── */

    function _countVisiblePanels() {
        var count = 0;
        _activePanelIds = [];
        for (var i = 0; i < PANEL_IDS.length; i++) {
            var el = document.getElementById(PANEL_IDS[i]);
            if (el && _isVisible(el)) {
                count++;
                _activePanelIds.push(PANEL_IDS[i]);
            }
        }
        return count;
    }

    function _handlePanelShow(id) {
        var visibleCount = _countVisiblePanels();
        if (visibleCount > MAX_PANELS) {
            // Hide the oldest panels to stay under limit
            // Keep the newest ones (including the one just shown)
            var toHide = _activePanelIds.slice(0, visibleCount - MAX_PANELS);
            for (var i = 0; i < toHide.length; i++) {
                if (toHide[i] !== id) {
                    var el = document.getElementById(toHide[i]);
                    _hideElement(el);
                }
            }
        }

        // Auto-hide panels after timeout to reduce clutter
        setTimeout(function () {
            var el = document.getElementById(id);
            if (el && _isVisible(el) && _countVisiblePanels() > 2) {
                _hideElement(el);
            }
        }, PANEL_AUTO_HIDE_MS);
    }

    /* ── Queue processor ─────────────────────────────────────────────────── */

    function _processQueue() {
        if (_modalQueue.length === 0) return;
        if (!_canShowModal()) return;

        var nextId = _modalQueue.shift();
        var el = document.getElementById(nextId);
        if (!el) return;

        // Try to show the queued modal using its dismiss API in reverse
        // Most features use display:block or classList.add('active')
        el.style.display = '';
        el.style.visibility = '';
        el.style.pointerEvents = '';
        el.classList.add('active');

        _activeModalId = nextId;
        _lastModalTime = Date.now();
    }

    /* ── MutationObserver ────────────────────────────────────────────────── */

    function _setupObserver() {
        if (_observer) return;
        if (typeof MutationObserver === 'undefined') return;

        _observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                var target = mutation.target;
                if (!target || !target.id) continue;

                var id = target.id;

                if (_isModal(id)) {
                    if (_isVisible(target)) {
                        _handleModalShow(id);
                    } else {
                        _handleModalHide(id);
                    }
                } else if (_isPanel(id)) {
                    if (_isVisible(target)) {
                        _handlePanelShow(id);
                    }
                }
            }
        });

        // Observe body for child additions and attribute changes
        _observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true,
            childList: true
        });
    }

    /* ── Initial cleanup ─────────────────────────────────────────────────── */

    function _initialCleanup() {
        // On load, hide excess panels if too many spawned simultaneously
        var visiblePanels = [];
        for (var i = 0; i < PANEL_IDS.length; i++) {
            var el = document.getElementById(PANEL_IDS[i]);
            if (el && _isVisible(el)) {
                visiblePanels.push(PANEL_IDS[i]);
            }
        }

        // Keep only the first MAX_PANELS, hide the rest
        if (visiblePanels.length > MAX_PANELS) {
            for (var j = MAX_PANELS; j < visiblePanels.length; j++) {
                var panelEl = document.getElementById(visiblePanels[j]);
                _hideElement(panelEl);
            }
        }

        // If multiple modals are visible, keep only the first and queue the rest
        var visibleModals = [];
        for (var k = 0; k < MODAL_IDS.length; k++) {
            var modalEl = document.getElementById(MODAL_IDS[k]);
            if (modalEl && _isVisible(modalEl)) {
                visibleModals.push(MODAL_IDS[k]);
            }
        }

        if (visibleModals.length > 1) {
            _activeModalId = visibleModals[0];
            _lastModalTime = Date.now();
            for (var m = 1; m < visibleModals.length; m++) {
                _hideElement(document.getElementById(visibleModals[m]));
                _modalQueue.push(visibleModals[m]);
            }
        } else if (visibleModals.length === 1) {
            _activeModalId = visibleModals[0];
            _lastModalTime = Date.now();
        }
    }

    /* ── Public API ──────────────────────────────────────────────────────── */

    window._popupManager = {
        getActiveModal: function () { return _activeModalId; },
        getVisiblePanelCount: function () { return _countVisiblePanels(); },
        getQueueLength: function () { return _modalQueue.length; },
        clearQueue: function () { _modalQueue = []; },
        forceHideAll: function () {
            MODAL_IDS.concat(PANEL_IDS).forEach(function (id) {
                var el = document.getElementById(id);
                if (el) _hideElement(el);
            });
            _activeModalId = null;
            _activePanelIds = [];
            _modalQueue = [];
        }
    };

    /* ── Init ─────────────────────────────────────────────────────────────── */

    function _init() {
        // Skip in QA mode
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        _setupObserver();

        // Initial cleanup after all features have initialized (they use 500-1200ms delays)
        setTimeout(_initialCleanup, 2500);

        // Periodic queue processor
        setInterval(_processQueue, QUEUE_CHECK_INTERVAL);

        // Second cleanup pass for late-loading features
        setTimeout(_initialCleanup, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1500); });
    } else {
        setTimeout(_init, 1500);
    }

})();
