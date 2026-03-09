/* ui-luckycharm.js — Lucky Charm Selector
 * Sprint 62: Daily slide-in panel letting players pick a lucky charm with hidden perks.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'luckyCharmSelector';
    var STORAGE_KEY = 'ms_luckyCharm';
    var Z_INDEX = 9250;
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;
    var STAR_BONUS = 2;

    var CHARMS = [
        {
            id: 'clover',
            emoji: '\uD83C\uDF40',
            name: 'Lucky Clover',
            desc: '+5% win chance boost',
            color: '#22c55e'
        },
        {
            id: 'diamond',
            emoji: '\uD83D\uDC8E',
            name: 'Diamond',
            desc: '1.1x win multiplier',
            color: '#60a5fa'
        },
        {
            id: 'fire',
            emoji: '\uD83D\uDD25',
            name: 'Fire Streak',
            desc: 'Hot streak detection enhanced',
            color: '#f97316'
        },
        {
            id: 'star',
            emoji: '\u2B50',
            name: 'Golden Star',
            desc: '$' + STAR_BONUS + ' instant bonus',
            color: '#fbbf24'
        }
    ];

    var _styleEl = null;

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

    function _isOnCooldown() {
        var data = _load();
        if (!data || !data.chosenAt) return false;
        return (Date.now() - data.chosenAt) < COOLDOWN_MS;
    }

    function _applyCharm(charm) {
        switch (charm.id) {
            case 'diamond':
                window._luckyCharmMultiplier = 1.1;
                break;
            case 'star':
                if (typeof window.balance === 'number') {
                    window.balance += STAR_BONUS;
                    if (typeof window.updateBalanceDisplay === 'function') {
                        window.updateBalanceDisplay();
                    }
                }
                break;
            case 'clover':
            case 'fire':
                // Visual-only encouragement effects
                break;
        }
    }

    function _createSparkles(parentEl) {
        for (var i = 0; i < 12; i++) {
            var sparkle = document.createElement('div');
            var x = Math.random() * 100;
            var y = Math.random() * 100;
            var delay = Math.random() * 0.5;
            var size = Math.random() * 6 + 3;
            sparkle.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;' +
                'background:#fbbf24;border-radius:50%;left:' + x + '%;top:' + y + '%;' +
                'animation:luckySparkle 0.8s ease-out ' + delay + 's forwards;opacity:0;pointer-events:none;';
            parentEl.appendChild(sparkle);
        }
    }

    function _selectCharm(charm) {
        _save({ charmId: charm.id, chosenAt: Date.now() });
        _applyCharm(charm);

        var panel = document.getElementById(ELEMENT_ID);
        if (panel) {
            _createSparkles(panel);

            // Show confirmation
            var confirm_el = document.createElement('div');
            confirm_el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
                'background:linear-gradient(135deg,#0d1117,#1a2332);border-radius:0 12px 12px 0;' +
                'display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10400;';

            var emojiEl = document.createElement('div');
            emojiEl.style.cssText = 'font-size:48px;margin-bottom:12px;animation:luckyBounce 0.5s ease-out;';
            emojiEl.textContent = charm.emoji;
            confirm_el.appendChild(emojiEl);

            var msgEl = document.createElement('div');
            msgEl.style.cssText = 'font-size:16px;color:#fbbf24;font-weight:bold;margin-bottom:6px;';
            msgEl.textContent = charm.name + ' selected!';
            confirm_el.appendChild(msgEl);

            var descEl = document.createElement('div');
            descEl.style.cssText = 'font-size:13px;color:#94a3b8;';
            descEl.textContent = charm.desc;
            confirm_el.appendChild(descEl);

            panel.appendChild(confirm_el);
        }

        setTimeout(function () {
            window.dismissLuckyCharmSelector();
        }, 2000);
    }

    function _build() {
        if (document.getElementById(ELEMENT_ID)) return;

        // Keyframes
        if (!_styleEl) {
            _styleEl = document.createElement('style');
            _styleEl.textContent = '@keyframes luckySlideIn{0%{transform:translateX(-110%)}100%{transform:translateX(0)}}' +
                '@keyframes luckySlideOut{0%{transform:translateX(0)}100%{transform:translateX(-110%)}}' +
                '@keyframes luckySparkle{0%{transform:scale(0);opacity:1}50%{opacity:1}100%{transform:scale(2);opacity:0}}' +
                '@keyframes luckyBounce{0%{transform:scale(0.3)}50%{transform:scale(1.2)}100%{transform:scale(1)}}';
            document.head.appendChild(_styleEl);
        }

        var panel = document.createElement('div');
        panel.id = ELEMENT_ID;
        panel.style.cssText = 'position:fixed;top:50%;left:0;transform:translateY(-50%) translateX(-110%);' +
            'width:260px;background:linear-gradient(135deg,#0d1117,#1a2332);z-index:' + Z_INDEX + ';' +
            'border-radius:0 12px 12px 0;border:1px solid rgba(251,191,36,0.3);border-left:none;' +
            'padding:24px 20px;font-family:Arial,sans-serif;' +
            'box-shadow:4px 0 30px rgba(0,0,0,0.5);overflow:hidden;' +
            'animation:luckySlideIn 0.5s ease-out 0.3s forwards;';

        // Close button
        var closeBtn = document.createElement('div');
        closeBtn.style.cssText = 'position:absolute;top:10px;right:12px;color:#64748b;' +
            'font-size:16px;cursor:pointer;line-height:1;z-index:10400;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            window.dismissLuckyCharmSelector();
        });
        panel.appendChild(closeBtn);

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'text-align:center;margin-bottom:20px;';

        var titleEmoji = document.createElement('div');
        titleEmoji.style.cssText = 'font-size:32px;margin-bottom:6px;';
        titleEmoji.textContent = '\uD83C\uDF40';
        header.appendChild(titleEmoji);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:18px;font-weight:bold;color:#fbbf24;margin-bottom:4px;' +
            'text-shadow:0 0 15px rgba(251,191,36,0.3);';
        title.textContent = 'Choose Your Lucky Charm';
        header.appendChild(title);

        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:12px;color:#94a3b8;';
        subtitle.textContent = 'Pick one charm for today\'s session!';
        header.appendChild(subtitle);

        panel.appendChild(header);

        // Charm options
        for (var i = 0; i < CHARMS.length; i++) {
            (function (charm) {
                var option = document.createElement('div');
                option.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;' +
                    'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);' +
                    'border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;';

                option.addEventListener('mouseenter', function () {
                    option.style.background = 'rgba(251,191,36,0.08)';
                    option.style.borderColor = charm.color;
                    option.style.transform = 'translateX(4px)';
                });
                option.addEventListener('mouseleave', function () {
                    option.style.background = 'rgba(255,255,255,0.03)';
                    option.style.borderColor = 'rgba(255,255,255,0.06)';
                    option.style.transform = 'translateX(0)';
                });
                option.addEventListener('click', function () {
                    _selectCharm(charm);
                });

                var emoji = document.createElement('span');
                emoji.style.cssText = 'font-size:28px;flex-shrink:0;';
                emoji.textContent = charm.emoji;
                option.appendChild(emoji);

                var info = document.createElement('div');
                info.style.cssText = 'flex:1;';

                var name = document.createElement('div');
                name.style.cssText = 'font-size:14px;font-weight:bold;color:' + charm.color + ';margin-bottom:2px;';
                name.textContent = charm.name;
                info.appendChild(name);

                var desc = document.createElement('div');
                desc.style.cssText = 'font-size:11px;color:#94a3b8;';
                desc.textContent = charm.desc;
                info.appendChild(desc);

                option.appendChild(info);
                panel.appendChild(option);
            })(CHARMS[i]);
        }

        document.body.appendChild(panel);
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (_isOnCooldown()) {
            // Re-apply previously chosen charm
            var data = _load();
            if (data && data.charmId) {
                for (var i = 0; i < CHARMS.length; i++) {
                    if (CHARMS[i].id === data.charmId) {
                        // Only re-apply non-balance charms (star is one-time)
                        if (data.charmId === 'diamond') {
                            window._luckyCharmMultiplier = 1.1;
                        }
                        break;
                    }
                }
            }
            return;
        }

        setTimeout(function () {
            _build();
        }, 4000);
    }

    window.dismissLuckyCharmSelector = function () {
        var el = document.getElementById(ELEMENT_ID);
        if (el) {
            el.style.animation = 'luckySlideOut 0.4s ease-in forwards';
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 400);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
