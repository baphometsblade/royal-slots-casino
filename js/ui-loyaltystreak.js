/**
 * Sprint 64 — Loyalty Streak Counter
 * Small fixed badge in top-right showing consecutive login day streak.
 */
(function() {
    'use strict';

    var ELEMENT_ID = 'loyaltyStreakCounter';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_loyaltyStreak';
    var BADGE_SIZE = 44;
    var MAX_BONUS_PCT = 10;
    var PULSE_INTERVAL_MS = 5000;

    function getTodayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
            + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getYesterdayStr() {
        var d = new Date();
        d.setDate(d.getDate() - 1);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
            + '-' + String(d.getDate()).padStart(2, '0');
    }

    function loadStreak() {
        try {
            var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            var today = getTodayStr();
            var yesterday = getYesterdayStr();

            if (stored.lastDate === today) {
                // Already counted today
                return stored;
            } else if (stored.lastDate === yesterday) {
                // Consecutive day — increment
                stored.count = (stored.count || 0) + 1;
                stored.lastDate = today;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
                return stored;
            } else {
                // Streak broken — reset to 1
                var fresh = { count: 1, lastDate: today };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
                return fresh;
            }
        } catch (e) {
            var reset = { count: 1, lastDate: getTodayStr() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
            return reset;
        }
    }

    function createBadge() {
        if (document.getElementById(ELEMENT_ID)) return;

        var streak = loadStreak();
        var bonusPct = Math.min(streak.count, MAX_BONUS_PCT);

        var badge = document.createElement('div');
        badge.id = ELEMENT_ID;
        badge.style.cssText = 'position:fixed;top:16px;right:16px;width:' + BADGE_SIZE + 'px;'
            + 'height:' + BADGE_SIZE + 'px;border-radius:50%;cursor:pointer;z-index:' + Z_INDEX + ';'
            + 'background:linear-gradient(135deg,#1a1a2e,#16213e);'
            + 'border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;'
            + 'box-shadow:0 0 12px rgba(255,215,0,0.3),0 2px 8px rgba(0,0,0,0.3);'
            + 'transition:transform 0.2s;font-family:system-ui,-apple-system,sans-serif;'
            + 'user-select:none;';

        var content = document.createElement('div');
        content.style.cssText = 'text-align:center;line-height:1;';

        var flame = document.createElement('div');
        flame.style.cssText = 'font-size:14px;';
        flame.textContent = '\uD83D\uDD25';

        var count = document.createElement('div');
        count.style.cssText = 'font-size:11px;font-weight:800;color:#ffd700;margin-top:1px;';
        count.textContent = String(streak.count);

        content.appendChild(flame);
        content.appendChild(count);
        badge.appendChild(content);

        // Tooltip
        var tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:absolute;top:' + (BADGE_SIZE + 8) + 'px;right:0;'
            + 'background:rgba(26,26,46,0.95);color:#e0e0e0;padding:12px 16px;border-radius:10px;'
            + 'font-size:12px;line-height:1.6;width:220px;pointer-events:none;opacity:0;'
            + 'transition:opacity 0.25s;border:1px solid rgba(255,215,0,0.3);'
            + 'box-shadow:0 4px 20px rgba(0,0,0,0.5);text-align:center;';

        var ttTitle = document.createElement('div');
        ttTitle.style.cssText = 'font-weight:700;color:#ffd700;font-size:14px;margin-bottom:6px;';
        ttTitle.textContent = '\uD83D\uDD25 Login Streak: ' + streak.count + ' days';

        var ttBonus = document.createElement('div');
        ttBonus.style.cssText = 'font-size:12px;color:#2ecc71;';
        ttBonus.textContent = bonusPct + '% bonus on next win!';

        var ttMax = document.createElement('div');
        ttMax.style.cssText = 'font-size:10px;color:#888;margin-top:4px;';
        ttMax.textContent = streak.count >= MAX_BONUS_PCT
            ? 'Maximum streak bonus reached!'
            : '1% per day, up to ' + MAX_BONUS_PCT + '% max';

        tooltip.appendChild(ttTitle);
        tooltip.appendChild(ttBonus);
        tooltip.appendChild(ttMax);
        badge.appendChild(tooltip);

        badge.onmouseenter = function() {
            badge.style.transform = 'scale(1.15)';
            tooltip.style.opacity = '1';
        };
        badge.onmouseleave = function() {
            badge.style.transform = 'scale(1)';
            tooltip.style.opacity = '0';
        };

        badge.onclick = function() {
            // Toggle tooltip on click for mobile
            var isVisible = tooltip.style.opacity === '1';
            tooltip.style.opacity = isVisible ? '0' : '1';
        };

        document.body.appendChild(badge);

        // Gold glow pulse animation
        var pulseOn = false;
        setInterval(function() {
            pulseOn = !pulseOn;
            if (pulseOn) {
                badge.style.boxShadow = '0 0 20px rgba(255,215,0,0.6),0 0 40px rgba(255,215,0,0.2),0 2px 8px rgba(0,0,0,0.3)';
            } else {
                badge.style.boxShadow = '0 0 12px rgba(255,215,0,0.3),0 2px 8px rgba(0,0,0,0.3)';
            }
        }, PULSE_INTERVAL_MS / 2);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createBadge, 3500);
        });
    } else {
        setTimeout(createBadge, 3500);
    }
})();
