/**
 * Sprint 63 — Spin Insurance Toggle
 * Small floating badge in bottom-left showing spin insurance status.
 */
(function() {
    'use strict';

    var ELEMENT_ID = 'spinInsurance2';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_spinInsurance';
    var BADGE_SIZE = 40;

    function showToast(msg, isOn) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);'
            + 'background:' + (isOn ? 'linear-gradient(135deg,#2ecc71,#27ae60)' : 'linear-gradient(135deg,#555,#333)') + ';'
            + 'color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;'
            + 'z-index:' + (Z_INDEX + 10) + ';opacity:0;transition:opacity 0.3s,transform 0.3s;'
            + 'box-shadow:0 4px 16px rgba(0,0,0,0.4);font-family:system-ui,-apple-system,sans-serif;'
            + 'pointer-events:none;';
        toast.textContent = msg;
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            });
        });

        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 350);
        }, 2200);
    }

    function buildTooltip() {
        var tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:absolute;bottom:' + (BADGE_SIZE + 8) + 'px;left:0;'
            + 'background:rgba(26,26,46,0.95);color:#e0e0e0;padding:10px 14px;border-radius:8px;'
            + 'font-size:11px;line-height:1.5;width:200px;pointer-events:none;opacity:0;'
            + 'transition:opacity 0.25s;border:1px solid rgba(255,215,0,0.3);'
            + 'box-shadow:0 4px 16px rgba(0,0,0,0.5);';

        var ttTitle = document.createElement('div');
        ttTitle.style.cssText = 'font-weight:700;color:#ffd700;margin-bottom:4px;';
        ttTitle.textContent = 'Spin Insurance';
        tooltip.appendChild(ttTitle);

        var ttDesc = document.createElement('div');
        ttDesc.textContent = 'Pay 10% extra per spin. Get 50% back on losses!';
        tooltip.appendChild(ttDesc);

        var ttHint = document.createElement('div');
        ttHint.style.cssText = 'color:#888;margin-top:4px;font-size:10px;';
        ttHint.textContent = 'Click badge to toggle';
        tooltip.appendChild(ttHint);

        return tooltip;
    }

    function createBadge() {
        if (document.getElementById(ELEMENT_ID)) return;

        var isActive = localStorage.getItem(STORAGE_KEY) === 'true';
        var tooltip = buildTooltip();

        var badge = document.createElement('div');
        badge.id = ELEMENT_ID;
        badge.style.cssText = 'position:fixed;bottom:16px;left:16px;width:' + BADGE_SIZE + 'px;'
            + 'height:' + BADGE_SIZE + 'px;border-radius:50%;cursor:pointer;z-index:' + Z_INDEX + ';'
            + 'display:flex;align-items:center;justify-content:center;flex-direction:column;'
            + 'transition:transform 0.2s,box-shadow 0.2s;font-family:system-ui,-apple-system,sans-serif;'
            + 'user-select:none;';

        function applyState() {
            // Remove existing children except tooltip
            while (badge.firstChild) {
                badge.removeChild(badge.firstChild);
            }

            var shield = document.createElement('div');
            shield.style.cssText = 'font-size:16px;line-height:1;' + (isActive ? '' : 'opacity:0.5;');
            shield.textContent = '\uD83D\uDEE1\uFE0F';

            var label = document.createElement('div');
            label.style.cssText = 'font-size:7px;font-weight:700;letter-spacing:0.5px;margin-top:1px;'
                + 'color:' + (isActive ? '#fff' : '#888') + ';';
            label.textContent = 'INS';

            badge.appendChild(shield);
            badge.appendChild(label);
            badge.appendChild(tooltip);

            if (isActive) {
                badge.style.background = 'linear-gradient(135deg,#2ecc71,#1a9c5a)';
                badge.style.border = '2px solid #2ecc71';
                badge.style.boxShadow = '0 0 12px rgba(46,204,113,0.4),0 2px 8px rgba(0,0,0,0.3)';
            } else {
                badge.style.background = 'linear-gradient(135deg,#555,#3a3a3a)';
                badge.style.border = '2px solid #666';
                badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            }
        }

        applyState();

        badge.onmouseenter = function() {
            badge.style.transform = 'scale(1.15)';
            tooltip.style.opacity = '1';
        };
        badge.onmouseleave = function() {
            badge.style.transform = 'scale(1)';
            tooltip.style.opacity = '0';
        };

        badge.onclick = function() {
            isActive = !isActive;
            localStorage.setItem(STORAGE_KEY, String(isActive));
            applyState();
            if (isActive) {
                showToast('\uD83D\uDEE1\uFE0F Spin Insurance ON \u2014 10% premium, 50% loss refund', true);
            } else {
                showToast('Spin Insurance OFF', false);
            }
        };

        document.body.appendChild(badge);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createBadge, 4000);
        });
    } else {
        setTimeout(createBadge, 4000);
    }
})();
