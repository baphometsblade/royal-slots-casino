// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION QUEUE MANAGER
// Prevents popup fatigue by intelligently scheduling and prioritizing overlays/modals
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────────
    // CONFIGURATION & CONSTANTS
    // ─────────────────────────────────────────────────────────────────────────────

    var PRIORITY = {
        CRITICAL: 10,
        HIGH: 7,
        MEDIUM: 5,
        LOW: 2
    };

    var CONFIG = {
        minGapMs: 3000,              // Minimum 3-second gap between dismissals
        dripIntervalMs: 30000,       // 30-45 second drip-feed after initial 30s
        maxPerMinute: 3,             // Max 3 notifications per minute
        sessionLimit: 15,            // Max 15 popups per session
        loginInitialGapMs: 30000,    // 30-second initial window on login
        idleThresholdMs: 300000,     // 5 minutes of inactivity
        dismissalCooldownMs: 600000, // 10-minute cooldown for same type
        suppressDuringSpinMs: 2000   // Auto-resume 2s after spin completes
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL STATE
    // ─────────────────────────────────────────────────────────────────────────────

    var state = {
        queue: [],                           // Pending notifications
        currentlyShowing: null,              // Current notification ID
        isSupressed: false,                  // Suppressed during spins
        lastDismissalTime: 0,                // Timestamp of last dismissal
        sessionPopupCount: 0,                // Total popups shown this session
        sessionStartTime: Date.now(),
        dismissedNotificationTypes: {},     // Track dismissed types and their times
        lastUserInteractionTime: Date.now(),
        isLoggedIn: false,
        hasShownInitialPopups: false,
        popupCountThisMinute: 0,
        lastMinuteResetTime: Date.now()
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // PRIORITY ASSIGNMENTS (from requirements)
    // ─────────────────────────────────────────────────────────────────────────────

    var NOTIFICATION_PRIORITIES = {
        // CRITICAL (10) - Jackpot win, deposit bonus first-time, welcome offer
        'jackpot-win': PRIORITY.CRITICAL,
        'deposit-bonus-first-time': PRIORITY.CRITICAL,
        'welcome-offer': PRIORITY.CRITICAL,

        // HIGH (7) - Daily login calendar, comeback offer, battle pass level-up
        'daily-login': PRIORITY.HIGH,
        'comeback-offers': PRIORITY.HIGH,
        'battle-pass-level-up': PRIORITY.HIGH,

        // MEDIUM (5) - Flash bonus, whale VIP invite, slot race start, tournament reminder
        'flash-bonus': PRIORITY.MEDIUM,
        'whale-vip-invite': PRIORITY.MEDIUM,
        'slot-race-start': PRIORITY.MEDIUM,
        'tournament-reminder': PRIORITY.MEDIUM,

        // LOW (2) - Social proof big win, achievement popup, deposit nudge, referral reminder
        'social-proof-win': PRIORITY.LOW,
        'achievement-popup': PRIORITY.LOW,
        'deposit-nudge': PRIORITY.LOW,
        'referral-reminder': PRIORITY.LOW
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // TIMERS & INTERVALS
    // ─────────────────────────────────────────────────────────────────────────────

    var timers = {
        processQueue: null,
        idleCheck: null,
        minuteReset: null
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // UTILITY: Sorted Queue (by priority)
    // ─────────────────────────────────────────────────────────────────────────────

    function enqueueSorted(notification) {
        state.queue.push(notification);
        state.queue.sort(function(a, b) {
            return b.priority - a.priority;
        });
    }

    function dequeueSorted() {
        return state.queue.shift();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UTILITY: Dismiss Cooldown Check
    // ─────────────────────────────────────────────────────────────────────────────

    function isInDismissalCooldown(notificationId) {
        var lastDismissalTime = state.dismissedNotificationTypes[notificationId];
        if (!lastDismissalTime) return false;
        var now = Date.now();
        return (now - lastDismissalTime) < CONFIG.dismissalCooldownMs;
    }

    function recordDismissal(notificationId) {
        state.dismissedNotificationTypes[notificationId] = Date.now();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UTILITY: Rate Limiting (max per minute)
    // ─────────────────────────────────────────────────────────────────────────────

    function resetMinuteCountIfNeeded() {
        var now = Date.now();
        if (now - state.lastMinuteResetTime >= 60000) {
            state.popupCountThisMinute = 0;
            state.lastMinuteResetTime = now;
        }
    }

    function canShowNotificationThisMinute() {
        resetMinuteCountIfNeeded();
        return state.popupCountThisMinute < CONFIG.maxPerMinute;
    }

    function incrementPopupCount() {
        state.popupCountThisMinute++;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UTILITY: User Activity Tracking
    // ─────────────────────────────────────────────────────────────────────────────

    function updateUserInteraction() {
        state.lastUserInteractionTime = Date.now();
    }

    function isUserIdle() {
        var now = Date.now();
        return (now - state.lastUserInteractionTime) >= CONFIG.idleThresholdMs;
    }

    function attachActivityListeners() {
        var events = ['click', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        var listener = function() {
            updateUserInteraction();
        };

        events.forEach(function(eventName) {
            try {
                document.addEventListener(eventName, listener, true);
            } catch (e) {
                console.warn('[NotificationManager] Failed to attach listener:', eventName);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CORE: Process Queue
    // ─────────────────────────────────────────────────────────────────────────────

    function processQueue() {
        // Skip if QA mode enabled
        if (window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1) {
            return;
        }

        // Already showing or suppressed?
        if (state.currentlyShowing || state.isSupressed) {
            return;
        }

        // Check minimum gap since last dismissal
        var now = Date.now();
        var timeSinceLastDismissal = now - state.lastDismissalTime;
        if (timeSinceLastDismissal < CONFIG.minGapMs) {
            scheduleProcessQueue(CONFIG.minGapMs - timeSinceLastDismissal);
            return;
        }

        // Check session limit
        if (state.sessionPopupCount >= CONFIG.sessionLimit) {
            console.warn('[NotificationManager] Session limit (' + CONFIG.sessionLimit + ') reached');
            return;
        }

        // Check rate limit
        if (!canShowNotificationThisMinute()) {
            scheduleProcessQueue(5000);
            return;
        }

        // Get next notification from queue
        var notification = dequeueSorted();
        if (!notification) {
            return;
        }

        // Skip if in dismissal cooldown
        if (isInDismissalCooldown(notification.id)) {
            enqueueSorted(notification);
            scheduleProcessQueue(5000);
            return;
        }

        // Show the notification
        showNotification(notification);
    }

    function scheduleProcessQueue(delayMs) {
        if (timers.processQueue) {
            clearTimeout(timers.processQueue);
        }
        timers.processQueue = setTimeout(function() {
            processQueue();
        }, delayMs || 1000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CORE: Show Notification
    // ─────────────────────────────────────────────────────────────────────────────

    function showNotification(notification) {
        state.currentlyShowing = notification.id;
        state.sessionPopupCount++;
        incrementPopupCount();

        console.warn('[NotificationManager] Showing notification: ' + notification.id +
            ' (priority: ' + notification.priority + ', session: ' +
            state.sessionPopupCount + '/' + CONFIG.sessionLimit + ')');

        // Call the show function
        try {
            notification.showFn();
        } catch (e) {
            console.warn('[NotificationManager] Error showing notification:', e.message);
            completeNotification(notification);
            return;
        }

        // Auto-dismiss after 30s if no manual dismissal (optional safety)
        if (notification.autoTimeoutMs) {
            setTimeout(function() {
                if (state.currentlyShowing === notification.id) {
                    completeNotification(notification);
                }
            }, notification.autoTimeoutMs);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CORE: Complete Notification (Dismiss)
    // ─────────────────────────────────────────────────────────────────────────────

    function completeNotification(notification) {
        if (state.currentlyShowing !== notification.id) {
            return;
        }

        console.warn('[NotificationManager] Dismissing notification: ' + notification.id);

        state.currentlyShowing = null;
        state.lastDismissalTime = Date.now();

        // Call the dismiss function
        try {
            if (notification.dismissFn) {
                notification.dismissFn();
            }
        } catch (e) {
            console.warn('[NotificationManager] Error dismissing notification:', e.message);
        }

        // Record dismissal cooldown
        recordDismissal(notification.id);

        // Process next in queue
        scheduleProcessQueue(CONFIG.minGapMs);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SMART SCHEDULING: Login (first 30s max 2 popups)
    // ─────────────────────────────────────────────────────────────────────────────

    function handleLoginScheduling() {
        if (state.hasShownInitialPopups) {
            return;
        }

        state.isLoggedIn = true;
        state.sessionStartTime = Date.now();
        state.lastUserInteractionTime = Date.now();

        // Allow max 2 highest-priority popups in first 30 seconds
        setTimeout(function() {
            state.hasShownInitialPopups = true;
            console.warn('[NotificationManager] Initial 30s window closed, switching to drip-feed');
            processQueue();
        }, CONFIG.loginInitialGapMs);

        processQueue();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // IDLE MONITORING
    // ─────────────────────────────────────────────────────────────────────────────

    function startIdleMonitoring() {
        if (timers.idleCheck) {
            clearInterval(timers.idleCheck);
        }

        timers.idleCheck = setInterval(function() {
            if (state.isLoggedIn && isUserIdle() && !state.currentlyShowing && state.queue.length > 0) {
                console.warn('[NotificationManager] User idle for 5+ minutes, showing next notification');
                processQueue();
            }
        }, 30000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MINUTE RESET TIMER
    // ─────────────────────────────────────────────────────────────────────────────

    function startMinuteResetTimer() {
        if (timers.minuteReset) {
            clearInterval(timers.minuteReset);
        }

        timers.minuteReset = setInterval(function() {
            resetMinuteCountIfNeeded();
        }, 10000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────────

    var NotificationManager = {
        /**
         * Enqueue a notification
         * @param {string} id - Unique notification ID
         * @param {number} priority - Priority level (use PRIORITY constants or custom number)
         * @param {function} showFn - Function that shows the notification
         * @param {function} dismissFn - Function that dismisses the notification (optional)
         * @param {object} options - Additional options: { autoTimeoutMs: 30000 }
         */
        enqueue: function(id, priority, showFn, dismissFn, options) {
            // Skip if QA mode
            if (window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1) {
                console.warn('[NotificationManager] QA mode active, skipping enqueue: ' + id);
                return;
            }

            options = options || {};

            // Use preset priority if available
            if (typeof priority === 'string' && NOTIFICATION_PRIORITIES[priority]) {
                priority = NOTIFICATION_PRIORITIES[priority];
            }

            var notification = {
                id: id,
                priority: priority || PRIORITY.MEDIUM,
                showFn: showFn,
                dismissFn: dismissFn,
                autoTimeoutMs: options.autoTimeoutMs || null,
                enqueuedAt: Date.now()
            };

            enqueueSorted(notification);
            console.warn('[NotificationManager] Enqueued: ' + id +
                ' (priority: ' + notification.priority +
                ', queue size: ' + state.queue.length + ')');

            // Trigger processing
            scheduleProcessQueue(100);
        },

        /**
         * Manually dismiss the currently showing notification
         * @param {string} id - Notification ID to dismiss (must match current)
         */
        dismiss: function(id) {
            if (state.currentlyShowing && state.currentlyShowing === id) {
                var notification = {
                    id: id,
                    dismissFn: null
                };
                completeNotification(notification);
            }
        },

        /**
         * Suppress all notifications (e.g., during spins)
         */
        suppress: function() {
            if (!state.isSupressed) {
                state.isSupressed = true;
                console.warn('[NotificationManager] Notifications suppressed');
            }
        },

        /**
         * Resume showing notifications
         * @param {number} delayMs - Optional delay before resuming (default: 0)
         */
        resume: function(delayMs) {
            var delay = delayMs || 0;
            setTimeout(function() {
                if (state.isSupressed) {
                    state.isSupressed = false;
                    console.warn('[NotificationManager] Notifications resumed');
                    scheduleProcessQueue(1000);
                }
            }, delay);
        },

        /**
         * Check if a notification is currently showing
         * @returns {boolean}
         */
        isShowing: function() {
            return state.currentlyShowing !== null;
        },

        /**
         * Get currently showing notification ID
         * @returns {string|null}
         */
        getCurrent: function() {
            return state.currentlyShowing;
        },

        /**
         * Get queue length
         * @returns {number}
         */
        getQueueLength: function() {
            return state.queue.length;
        },

        /**
         * Get session stats
         * @returns {object}
         */
        getStats: function() {
            return {
                sessionPopupCount: state.sessionPopupCount,
                sessionLimit: CONFIG.sessionLimit,
                queueLength: state.queue.length,
                currentlyShowing: state.currentlyShowing,
                isSuppressed: state.isSupressed,
                popupCountThisMinute: state.popupCountThisMinute,
                maxPerMinute: CONFIG.maxPerMinute
            };
        },

        /**
         * Notify manager of user login (triggers initial 30s window)
         */
        onLogin: function() {
            handleLoginScheduling();
        },

        /**
         * Initialize the notification manager
         */
        init: function() {
            attachActivityListeners();
            startIdleMonitoring();
            startMinuteResetTimer();
            console.warn('[NotificationManager] Initialized');
        },

        /**
         * Destroy the notification manager
         */
        destroy: function() {
            Object.keys(timers).forEach(function(key) {
                if (timers[key]) {
                    clearTimeout(timers[key]);
                    clearInterval(timers[key]);
                    timers[key] = null;
                }
            });
            console.warn('[NotificationManager] Destroyed');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // EXPORT TO WINDOW
    // ─────────────────────────────────────────────────────────────────────────────

    window.NotificationManager = NotificationManager;
    console.warn('[NotificationManager] Module loaded');

})();
