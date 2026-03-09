/* ui-nightowlbonus.js — Night Owl Bonus
 * Sprint 61: Awards $3 bonus to players active between 10 PM and 4 AM.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'nightOwlBonus';
    var STORAGE_KEY = 'ms_nightOwlBonus';
    var BONUS_AMOUNT = 3;
    var Z_INDEX = 99150;
    var NIGHT_START = 22; // 10 PM
    var NIGHT_END = 4;   // 4 AM
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage full */ }
    }

    function _isNightTime() {
        var h = new Date().getHours();
        return h >= NIGHT_START || h < NIGHT_END;
    }

    function _isOnCooldown() {
        var data = _load();
        if (!data || !data.lastClaimed) return false;
        return (Date.now() - data.lastClaimed) < COOLDOWN_MS;
    }

    function _build() {
        if (document.getElementById(ELEMENT_ID)) return;

        var overlay = document.createElement('div');
        overlay.id = ELEMENT_ID;
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(5,5,25,0.95);z-index:' + Z_INDEX + ';display:flex;' +
            'align-items:center;justify-content:center;font-family:Arial,sans-serif;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1a0a2e,#0d0d2b);' +
            'border:2px solid #7c3aed;border-radius:16px;padding:40px;text-align:center;' +
            'max-width:400px;width:90%;box-shadow:0 0 60px rgba(124,58,237,0.4);position:relative;overflow:hidden;';

        // Stars background
        var starsCanvas = document.createElement('div');
        starsCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
        for (var i = 0; i < 30; i++) {
            var star = document.createElement('div');
            var size = Math.random() * 3 + 1;
            star.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;' +
                'background:#fff;border-radius:50%;opacity:' + (Math.random() * 0.7 + 0.3) + ';' +
                'top:' + (Math.random() * 100) + '%;left:' + (Math.random() * 100) + '%;' +
                'animation:twinkle ' + (Math.random() * 2 + 1) + 's ease-in-out infinite alternate;';
            starsCanvas.appendChild(star);
        }
        card.appendChild(starsCanvas);

        // Add twinkle keyframes
        var style = document.createElement('style');
        style.textContent = '@keyframes twinkle{0%{opacity:0.2;transform:scale(0.8)}100%{opacity:1;transform:scale(1.2)}}' +
            '@keyframes nightOwlSlideIn{0%{opacity:0;transform:scale(0.8) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}';
        document.head.appendChild(style);

        card.style.animation = 'nightOwlSlideIn 0.5s ease-out';

        var moon = document.createElement('div');
        moon.style.cssText = 'font-size:64px;margin-bottom:16px;position:relative;z-index:10400;';
        moon.textContent = '\uD83C\uDF19';
        card.appendChild(moon);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:24px;font-weight:bold;color:#c4b5fd;margin-bottom:8px;' +
            'text-shadow:0 0 20px rgba(124,58,237,0.5);position:relative;z-index:10400;';
        title.textContent = 'NIGHT OWL BONUS!';
        card.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:15px;color:#a5b4fc;margin-bottom:24px;line-height:1.5;position:relative;z-index:10400;';
        desc.textContent = 'Playing late? Here\'s $' + BONUS_AMOUNT + ' for the grind!';
        card.appendChild(desc);

        var amount = document.createElement('div');
        amount.style.cssText = 'font-size:36px;font-weight:bold;color:#fbbf24;margin-bottom:24px;' +
            'text-shadow:0 0 20px rgba(251,191,36,0.4);position:relative;z-index:10400;';
        amount.textContent = '+$' + BONUS_AMOUNT + '.00';
        card.appendChild(amount);

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;' +
            'border:none;padding:14px 40px;border-radius:10px;font-size:18px;font-weight:bold;' +
            'cursor:pointer;transition:all 0.3s;box-shadow:0 4px 20px rgba(124,58,237,0.4);position:relative;z-index:10400;';
        claimBtn.textContent = 'Claim Bonus';
        claimBtn.addEventListener('mouseenter', function () {
            claimBtn.style.transform = 'scale(1.05)';
            claimBtn.style.boxShadow = '0 6px 30px rgba(124,58,237,0.6)';
        });
        claimBtn.addEventListener('mouseleave', function () {
            claimBtn.style.transform = 'scale(1)';
            claimBtn.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)';
        });
        claimBtn.addEventListener('click', function () {
            if (typeof window.balance === 'number') {
                window.balance += BONUS_AMOUNT;
            }
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
            _save({ lastClaimed: Date.now() });
            claimBtn.textContent = 'Claimed!';
            claimBtn.disabled = true;
            claimBtn.style.background = '#374151';
            claimBtn.style.cursor = 'default';
            setTimeout(function () {
                window.dismissNightOwlBonus();
            }, 1200);
        });
        card.appendChild(claimBtn);

        var closeBtn = document.createElement('div');
        closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;color:#9ca3af;font-size:22px;' +
            'cursor:pointer;z-index:10400;line-height:1;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            window.dismissNightOwlBonus();
        });
        card.appendChild(closeBtn);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (!_isNightTime()) return;
        if (_isOnCooldown()) return;
        setTimeout(function () {
            _build();
        }, 3000);
    }

    window.dismissNightOwlBonus = function () {
        var el = document.getElementById(ELEMENT_ID);
        if (el) {
            el.style.transition = 'opacity 0.3s';
            el.style.opacity = '0';
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
