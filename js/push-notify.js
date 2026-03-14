(function() {
    'use strict';

    var STORAGE_PREFIX = 'pushNotify_';
    var PERMISSION_KEY = STORAGE_PREFIX + 'permission';
    var DISMISSALS_KEY = STORAGE_PREFIX + 'dismissals';
    var LAST_BANNER_KEY = STORAGE_PREFIX + 'lastBannerTime';
    var LAST_IDLE_CHECK_KEY = STORAGE_PREFIX + 'lastIdleCheck';
    var IDLE_TIMEOUTS = [1800000, 3600000, 7200000];
    var IDLE_MESSAGES = [
        'Your daily wheel is ready! Come spin!',
        '🔥 Happy Hour is starting soon!',
        'We miss you! Come back for a $5 bonus'
    ];

    var state = {
        initialized: false,
        playStartTime: 0,
        lastActivityTime: 0,
        idleTimerIds: [],
        bannerShown: false,
        notificationSupported: false
    };

    function getDismissalCount() {
        var stored = localStorage.getItem(DISMISSALS_KEY);
        if (!stored) return 0;
        var data = JSON.parse(stored);
        var weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        var recentDismissals = (data.dismissals || []).filter(function(ts) {
            return ts > weekAgo;
        });
        return recentDismissals.length;
    }

    function recordDismissal() {
        var stored = localStorage.getItem(DISMISSALS_KEY);
        var data = stored ? JSON.parse(stored) : { dismissals: [] };
        data.dismissals = data.dismissals || [];
        data.dismissals.push(Date.now());
        var weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        data.dismissals = data.dismissals.filter(function(ts) {
            return ts > weekAgo;
        });
        localStorage.setItem(DISMISSALS_KEY, JSON.stringify(data));
    }

    function getPermissionState() {
        if (!state.notificationSupported) return null;
        var stored = localStorage.getItem(PERMISSION_KEY);
        if (stored) return stored;
        return Notification.permission;
    }

    function shouldShowOptIn() {
        if (!state.notificationSupported) return false;
        var permState = getPermissionState();
        if (permState === 'granted' || permState === 'denied') return false;
        if (getDismissalCount() >= 3) return false;
        return true;
    }

    function showBanner() {
        if (state.bannerShown || !shouldShowOptIn()) return;

        var bannerId = 'pushNotify_banner';
        if (document.getElementById(bannerId)) return;

        state.bannerShown = true;
        localStorage.setItem(LAST_BANNER_KEY, Date.now().toString());

        var banner = document.createElement('div');
        banner.id = bannerId;
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
            'background:linear-gradient(135deg,rgba(31,31,46,0.95),rgba(45,25,70,0.95));' +
            'backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,215,0,0.3);' +
            'padding:16px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.5);' +
            'animation:pushNotifySlide 0.4s ease-out;';

        var content = document.createElement('div');
        content.style.cssText = 'max-width:1200px;margin:0 auto;display:flex;' +
            'align-items:center;justify-content:space-between;gap:20px;' +
            'color:#f0f0f0;font-family:Arial,sans-serif;';

        var textBlock = document.createElement('div');
        textBlock.style.cssText = 'flex:1;';

        var heading = document.createElement('div');
        heading.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:8px;' +
            'color:#ffd700;';
        heading.textContent = '🔔 Never miss a bonus! Enable notifications for:';
        textBlock.appendChild(heading);

        var bulletList = document.createElement('div');
        bulletList.style.cssText = 'font-size:13px;line-height:1.6;';
        var bullets = [
            '✓ Happy Hour alerts (2x payouts!)',
            '✓ Free spin bonuses & daily rewards',
            '✓ Exclusive VIP offers just for you'
        ];
        bullets.forEach(function(bullet) {
            var li = document.createElement('div');
            li.style.cssText = 'color:#d0d0d0;';
            li.textContent = bullet;
            bulletList.appendChild(li);
        });
        textBlock.appendChild(bulletList);

        content.appendChild(textBlock);

        var buttonBlock = document.createElement('div');
        buttonBlock.style.cssText = 'display:flex;gap:12px;align-items:center;' +
            'flex-shrink:0;';

        var enableBtn = document.createElement('button');
        enableBtn.textContent = 'ENABLE NOTIFICATIONS';
        enableBtn.style.cssText = 'background:#ffd700;color:#1f1f2e;border:none;' +
            'padding:10px 20px;border-radius:4px;font-weight:bold;font-size:14px;' +
            'cursor:pointer;transition:all 0.2s;';
        enableBtn.onmouseenter = function() {
            enableBtn.style.background = '#ffed4e';
            enableBtn.style.transform = 'scale(1.05)';
        };
        enableBtn.onmouseleave = function() {
            enableBtn.style.background = '#ffd700';
            enableBtn.style.transform = 'scale(1)';
        };
        enableBtn.onclick = function() {
            handleEnableClick();
        };
        buttonBlock.appendChild(enableBtn);

        var dismissLink = document.createElement('a');
        dismissLink.textContent = 'Not now';
        dismissLink.style.cssText = 'color:#a0a0a0;text-decoration:none;cursor:pointer;' +
            'font-size:13px;transition:color 0.2s;';
        dismissLink.onmouseenter = function() {
            dismissLink.style.color = '#ffd700';
        };
        dismissLink.onmouseleave = function() {
            dismissLink.style.color = '#a0a0a0';
        };
        dismissLink.onclick = function(e) {
            e.preventDefault();
            closeBanner();
        };
        buttonBlock.appendChild(dismissLink);

        content.appendChild(buttonBlock);
        banner.appendChild(content);

        document.body.insertBefore(banner, document.body.firstChild);

        var style = document.createElement('style');
        style.textContent = '@keyframes pushNotifySlide {' +
            'from { transform: translateY(-100%); opacity: 0; }' +
            'to { transform: translateY(0); opacity: 1; }' +
            '}' +
            '@keyframes pushNotifyToastSlide {' +
            'from { transform: translateY(-20px); opacity: 0; }' +
            'to { transform: translateY(0); opacity: 1; }' +
            '}' +
            '@keyframes pushNotifyRing {' +
            '0%, 100% { transform: scale(1); }' +
            '50% { transform: scale(1.15); }' +
            '}';
        if (!document.querySelector('style[data-push-notify]')) {
            style.setAttribute('data-push-notify', '');
            document.head.appendChild(style);
        }
    }

    function closeBanner() {
        var bannerId = 'pushNotify_banner';
        var banner = document.getElementById(bannerId);
        if (banner) {
            banner.style.animation = 'pushNotifySlide 0.3s ease-in reverse';
            setTimeout(function() {
                banner.remove();
                state.bannerShown = false;
            }, 300);
        }
        recordDismissal();
    }

    function showToast(message) {
        var toastId = 'pushNotify_toast';
        var existing = document.getElementById(toastId);
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.id = toastId;
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9998;' +
            'background:rgba(31,31,46,0.95);color:#ffd700;padding:14px 20px;' +
            'border-radius:4px;border:1px solid rgba(255,215,0,0.5);' +
            'font-family:Arial,sans-serif;font-size:14px;' +
            'box-shadow:0 4px 12px rgba(0,0,0,0.4);' +
            'animation:pushNotifyToastSlide 0.3s ease-out;';
        document.body.appendChild(toast);

        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 3000);
    }

    function handleEnableClick() {
        if (!state.notificationSupported) {
            showToast('Notifications not supported in your browser');
            return;
        }

        Notification.requestPermission().then(function(permission) {
            localStorage.setItem(PERMISSION_KEY, permission);
            var banner = document.getElementById('pushNotify_banner');
            if (banner) banner.remove();
            state.bannerShown = false;

            if (permission === 'granted') {
                showToast('You\'re all set! 🎉');
                scheduleIdleNotifications();
                updateBellIcon();
            } else if (permission === 'denied') {
                showToast('No worries! You can enable later in settings');
            }
        });
    }

    function scheduleIdleNotifications() {
        if (!state.notificationSupported || getPermissionState() !== 'granted') return;

        state.idleTimerIds.forEach(function(id) {
            clearTimeout(id);
        });
        state.idleTimerIds = [];

        IDLE_TIMEOUTS.forEach(function(timeout, index) {
            var timerId = setTimeout(function() {
                if (Notification.permission === 'granted') {
                    var opts = {
                        icon: '/images/icon-casino.png',
                        badge: '/images/badge-casino.png',
                        tag: 'idle-notification-' + index,
                        requireInteraction: false
                    };
                    new Notification(IDLE_MESSAGES[index], opts);
                }
            }, timeout);
            state.idleTimerIds.push(timerId);
        });
    }

    function createBellIcon() {
        var bellContainerId = 'pushNotify_bell_container';
        if (document.getElementById(bellContainerId)) return;

        var container = document.createElement('div');
        container.id = bellContainerId;
        container.style.cssText = 'position:fixed;top:12px;right:60px;z-index:9900;' +
            'cursor:pointer;font-size:24px;user-select:none;' +
            'transition:transform 0.2s;';
        container.onmouseenter = function() {
            container.style.transform = 'scale(1.1)';
        };
        container.onmouseleave = function() {
            container.style.transform = 'scale(1)';
        };

        var bell = document.createElement('span');
        bell.id = 'pushNotify_bell';
        bell.textContent = '🔔';
        container.appendChild(bell);

        var dot = document.createElement('span');
        dot.id = 'pushNotify_dot';
        dot.style.cssText = 'position:absolute;top:-2px;right:-2px;width:8px;height:8px;' +
            'background:#ff4444;border-radius:50%;display:none;';
        container.appendChild(dot);

        container.onclick = function() {
            toggleNotificationSettings();
        };

        document.body.appendChild(container);
    }

    function updateBellIcon() {
        var dot = document.getElementById('pushNotify_dot');
        if (!dot) return;
        var permState = getPermissionState();
        dot.style.display = permState === 'granted' ? 'none' : 'block';
    }

    function toggleNotificationSettings() {
        var permState = getPermissionState();
        var message = permState === 'granted' ?
            'Notifications are enabled. Manage settings in your browser preferences.' :
            'Click ENABLE NOTIFICATIONS on the banner to turn them on.';
        showToast(message);
    }

    function onActivityDetected() {
        state.lastActivityTime = Date.now();
    }

    function checkPlayTriggers() {
        var playDuration = Date.now() - state.playStartTime;
        if (playDuration >= 120000 && shouldShowOptIn()) {
            showBanner();
        }
    }

    function init(opts) {
        if (state.initialized) return;
        state.initialized = true;
        opts = opts || {};

        state.notificationSupported = typeof Notification !== 'undefined' &&
            'requestPermission' in Notification;

        if (!state.notificationSupported) {
            return;
        }

        state.playStartTime = Date.now();
        state.lastActivityTime = Date.now();

        createBellIcon();
        updateBellIcon();

        document.addEventListener('click', onActivityDetected, true);
        document.addEventListener('keydown', onActivityDetected, true);
        document.addEventListener('mousemove', onActivityDetected, true);

        var playCheckInterval = setInterval(function() {
            checkPlayTriggers();
        }, 1000);

        if (getPermissionState() === 'granted') {
            scheduleIdleNotifications();
        }

        window.addEventListener('beforeunload', function() {
            clearInterval(playCheckInterval);
            state.idleTimerIds.forEach(function(id) {
                clearTimeout(id);
            });
        });
    }

    function recordBigWin() {
        if (shouldShowOptIn()) {
            showBanner();
        }
    }

    window.PushNotify = {
        init: init,
        recordBigWin: recordBigWin,
        requestPermission: handleEnableClick,
        getPermissionState: getPermissionState
    };

})();
