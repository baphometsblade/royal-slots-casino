(function() {
    'use strict';

    var ELEMENT_ID = 'slotRecommendCard';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_slotRecommend';
    var ROTATION_INTERVAL = 180000;
    var DISMISS_COMEBACK = 300000;

    var GAME_LIST = [
        "Pharaoh's Fortune",
        "Dragon's Hoard",
        "Lucky Sevens",
        "Mystic Gems",
        "Golden Rush",
        "Star Burst",
        "Wild Safari",
        "Ocean's Treasure"
    ];

    var cardEl = null;
    var tooltipEl = null;
    var rotationTimer = null;
    var comebackTimer = null;
    var currentGameIndex = -1;

    function getRandomGame() {
        var idx;
        do {
            idx = Math.floor(Math.random() * GAME_LIST.length);
        } while (idx === currentGameIndex && GAME_LIST.length > 1);
        currentGameIndex = idx;
        return GAME_LIST[idx];
    }

    function isDismissed() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return false;
            var data = JSON.parse(saved);
            if (data.dismissedAt) {
                var elapsed = Date.now() - data.dismissedAt;
                return elapsed < DISMISS_COMEBACK;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function saveDismissed() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
        } catch (e) { /* silent */ }
    }

    function createCard() {
        if (cardEl && cardEl.parentNode) {
            cardEl.parentNode.removeChild(cardEl);
        }

        var gameName = getRandomGame();

        cardEl = document.createElement('div');
        cardEl.id = ELEMENT_ID;
        cardEl.style.cssText = 'position:fixed;bottom:20px;right:20px;width:200px;height:80px;' +
            'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid #daa520;' +
            'border-radius:12px;z-index:' + Z_INDEX + ';font-family:Arial,sans-serif;color:#fff;' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.5);cursor:pointer;overflow:hidden;' +
            'transform:translateY(120%);transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);' +
            'animation:recommendPulse 3s ease-in-out infinite;';

        var style = document.createElement('style');
        style.textContent = '@keyframes recommendPulse{0%{box-shadow:0 4px 20px rgba(0,0,0,0.5)}' +
            '50%{box-shadow:0 4px 24px rgba(218,165,32,0.4)}100%{box-shadow:0 4px 20px rgba(0,0,0,0.5)}}';
        cardEl.appendChild(style);

        var content = document.createElement('div');
        content.style.cssText = 'padding:10px 12px;height:100%;box-sizing:border-box;' +
            'display:flex;flex-direction:column;justify-content:center;';

        var header = document.createElement('div');
        header.style.cssText = 'font-size:11px;color:#daa520;font-weight:bold;margin-bottom:4px;';
        header.textContent = 'Try This Game! \uD83C\uDFB0';
        content.appendChild(header);

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:14px;font-weight:bold;color:#ffd700;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        nameEl.textContent = gameName;
        nameEl.className = 'recommend-game-name';
        content.appendChild(nameEl);

        var subtextEl = document.createElement('div');
        subtextEl.style.cssText = 'font-size:10px;color:#888;margin-top:2px;';
        subtextEl.textContent = 'Click for details';
        content.appendChild(subtextEl);

        cardEl.appendChild(content);

        var closeBtn = document.createElement('div');
        closeBtn.style.cssText = 'position:absolute;top:4px;right:6px;width:18px;height:18px;' +
            'display:flex;align-items:center;justify-content:center;font-size:12px;color:#666;' +
            'cursor:pointer;border-radius:50%;transition:color 0.2s,background 0.2s;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('mouseenter', function() {
            closeBtn.style.color = '#fff';
            closeBtn.style.background = 'rgba(255,255,255,0.1)';
        });
        closeBtn.addEventListener('mouseleave', function() {
            closeBtn.style.color = '#666';
            closeBtn.style.background = 'transparent';
        });
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dismissCard();
        });
        cardEl.appendChild(closeBtn);

        cardEl.addEventListener('click', function() {
            showTooltip(gameName);
        });

        cardEl.addEventListener('mouseenter', function() {
            cardEl.style.transform = 'translateY(0) scale(1.03)';
        });
        cardEl.addEventListener('mouseleave', function() {
            cardEl.style.transform = 'translateY(0) scale(1)';
            hideTooltip();
        });

        document.body.appendChild(cardEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                cardEl.style.transform = 'translateY(0)';
            });
        });

        rotationTimer = setInterval(function() {
            var newName = getRandomGame();
            var nameDiv = cardEl.querySelector('.recommend-game-name');
            if (nameDiv) {
                nameDiv.style.opacity = '0';
                setTimeout(function() {
                    nameDiv.textContent = newName;
                    nameDiv.style.opacity = '1';
                }, 200);
            }
        }, ROTATION_INTERVAL);
    }

    function showTooltip(gameName) {
        hideTooltip();
        tooltipEl = document.createElement('div');
        tooltipEl.style.cssText = 'position:fixed;bottom:108px;right:20px;width:200px;' +
            'background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:1px solid #ffd700;' +
            'border-radius:10px;padding:12px;z-index:' + (Z_INDEX + 1) + ';' +
            'font-family:Arial,sans-serif;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.6);' +
            'opacity:0;transform:translateY(8px);transition:opacity 0.3s,transform 0.3s;';

        var tipTitle = document.createElement('div');
        tipTitle.style.cssText = 'font-size:13px;font-weight:bold;color:#ffd700;margin-bottom:6px;';
        tipTitle.textContent = gameName;
        tooltipEl.appendChild(tipTitle);

        var tipText = document.createElement('div');
        tipText.style.cssText = 'font-size:11px;color:#ccc;line-height:1.4;';
        tipText.textContent = 'This game is hot right now! Jump in and try your luck for big wins.';
        tooltipEl.appendChild(tipText);

        document.body.appendChild(tooltipEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                tooltipEl.style.opacity = '1';
                tooltipEl.style.transform = 'translateY(0)';
            });
        });
    }

    function hideTooltip() {
        if (tooltipEl) {
            var el = tooltipEl;
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
            setTimeout(function() {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }, 300);
            tooltipEl = null;
        }
    }

    function dismissCard() {
        saveDismissed();
        if (rotationTimer) {
            clearInterval(rotationTimer);
            rotationTimer = null;
        }
        hideTooltip();

        if (cardEl) {
            cardEl.style.transform = 'translateY(120%)';
            var el = cardEl;
            setTimeout(function() {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }, 500);
            cardEl = null;
        }

        comebackTimer = setTimeout(function() {
            if (!isDismissed()) {
                createCard();
            }
        }, DISMISS_COMEBACK);
    }

    function init() {
        if (isDismissed()) {
            var saved;
            try {
                saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            } catch (e) { saved = null; }
            if (saved && saved.dismissedAt) {
                var remaining = DISMISS_COMEBACK - (Date.now() - saved.dismissedAt);
                if (remaining > 0) {
                    comebackTimer = setTimeout(function() {
                        createCard();
                    }, remaining);
                    return;
                }
            }
        }
        createCard();
    }

    function cleanup() {
        if (rotationTimer) { clearInterval(rotationTimer); rotationTimer = null; }
        if (comebackTimer) { clearTimeout(comebackTimer); comebackTimer = null; }
        hideTooltip();
        if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
        cardEl = null;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 8000);
        });
    } else {
        setTimeout(init, 8000);
    }

    window._slotRecommend = { cleanup: cleanup };
})();
