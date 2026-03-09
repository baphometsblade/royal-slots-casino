/* ui-collectionalbum.js — Collection Album Widget
 * Sprint 62: Tracks unique symbols seen across spins, awards bonuses at milestones.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'collectionAlbumWidget';
    var STORAGE_KEY = 'ms_collectionAlbum';
    var Z_INDEX = 9050;
    var MILESTONE_1 = 10;
    var MILESTONE_2 = 20;
    var REWARD_1 = 5;
    var REWARD_2 = 25;

    var ALL_SYMBOLS = [
        'cherry', 'lemon', 'orange', 'plum', 'grape', 'watermelon',
        'bell', 'bar', 'seven', 'diamond', 'star', 'crown',
        'wild', 'scatter', 'bonus', 'coin', 'gem', 'horseshoe',
        'clover', 'anchor'
    ];

    var SYMBOL_EMOJIS = {
        cherry: '\uD83C\uDF52', lemon: '\uD83C\uDF4B', orange: '\uD83C\uDF4A',
        plum: '\uD83E\uDED0', grape: '\uD83C\uDF47', watermelon: '\uD83C\uDF49',
        bell: '\uD83D\uDD14', bar: '\uD83D\uDCCA', seven: '7\uFE0F\u20E3',
        diamond: '\uD83D\uDC8E', star: '\u2B50', crown: '\uD83D\uDC51',
        wild: '\uD83C\uDDFC', scatter: '\uD83D\uDCA0', bonus: '\uD83C\uDF81',
        coin: '\uD83E\uDE99', gem: '\uD83D\uDC8E', horseshoe: '\uD83E\uDEBB',
        clover: '\uD83C\uDF40', anchor: '\u2693'
    };

    var _expanded = false;
    var _styleEl = null;

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { collected: [], milestone1: false, milestone2: false };
        } catch (e) {
            return { collected: [], milestone1: false, milestone2: false };
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage full */ }
    }

    function _addSymbol(symbol) {
        var data = _load();
        var sym = String(symbol).toLowerCase().trim();
        if (ALL_SYMBOLS.indexOf(sym) === -1) return;
        if (data.collected.indexOf(sym) !== -1) return;

        data.collected.push(sym);

        // Check milestones
        if (data.collected.length >= MILESTONE_1 && !data.milestone1) {
            data.milestone1 = true;
            if (typeof window.balance === 'number') {
                window.balance += REWARD_1;
                if (typeof window.updateBalanceDisplay === 'function') {
                    window.updateBalanceDisplay();
                }
            }
            _flashReward(MILESTONE_1, REWARD_1);
        }
        if (data.collected.length >= MILESTONE_2 && !data.milestone2) {
            data.milestone2 = true;
            if (typeof window.balance === 'number') {
                window.balance += REWARD_2;
                if (typeof window.updateBalanceDisplay === 'function') {
                    window.updateBalanceDisplay();
                }
            }
            _flashReward(MILESTONE_2, REWARD_2);
        }

        _save(data);
        _updateUI();
    }

    function _flashReward(milestone, reward) {
        var flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'background:linear-gradient(135deg,#1a2332,#0d1117);border:2px solid #fbbf24;' +
            'border-radius:12px;padding:30px;text-align:center;z-index:' + (Z_INDEX + 100) + ';' +
            'font-family:Arial,sans-serif;animation:collAlbumPop 0.4s ease-out;';

        var title = document.createElement('div');
        title.style.cssText = 'font-size:24px;color:#fbbf24;font-weight:bold;margin-bottom:10px;';
        title.textContent = '\uD83C\uDF89 Milestone Reached!';
        flash.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:16px;color:#e2e8f0;margin-bottom:8px;';
        desc.textContent = milestone + ' symbols collected!';
        flash.appendChild(desc);

        var reward_el = document.createElement('div');
        reward_el.style.cssText = 'font-size:28px;color:#2ecc71;font-weight:bold;';
        reward_el.textContent = '+$' + reward;
        flash.appendChild(reward_el);

        document.body.appendChild(flash);
        setTimeout(function () {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 3000);
    }

    function _updateUI() {
        var data = _load();
        var countEl = document.getElementById(ELEMENT_ID + '_count');
        if (countEl) {
            countEl.textContent = data.collected.length + '/' + ALL_SYMBOLS.length;
        }

        var badgeEl = document.getElementById(ELEMENT_ID + '_badge');
        if (badgeEl) {
            badgeEl.textContent = String(data.collected.length);
        }

        // Update grid if expanded
        var grid = document.getElementById(ELEMENT_ID + '_grid');
        if (grid) {
            // Remove existing children
            while (grid.firstChild) {
                grid.removeChild(grid.firstChild);
            }
            _populateGrid(grid, data);
        }
    }

    function _populateGrid(grid, data) {
        for (var i = 0; i < ALL_SYMBOLS.length; i++) {
            var sym = ALL_SYMBOLS[i];
            var cell = document.createElement('div');
            var isCollected = data.collected.indexOf(sym) !== -1;
            cell.style.cssText = 'width:48px;height:48px;border-radius:8px;display:flex;' +
                'flex-direction:column;align-items:center;justify-content:center;' +
                'font-size:22px;position:relative;' +
                (isCollected
                    ? 'background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.4);'
                    : 'background:rgba(100,116,139,0.1);border:1px solid rgba(100,116,139,0.2);');

            var emojiEl = document.createElement('span');
            emojiEl.textContent = isCollected ? (SYMBOL_EMOJIS[sym] || '?') : '?';
            if (!isCollected) emojiEl.style.cssText = 'opacity:0.3;';
            cell.appendChild(emojiEl);

            if (isCollected) {
                var check = document.createElement('span');
                check.style.cssText = 'position:absolute;top:1px;right:2px;font-size:10px;color:#2ecc71;';
                check.textContent = '\u2713';
                cell.appendChild(check);
            }

            var label = document.createElement('div');
            label.style.cssText = 'font-size:7px;color:#94a3b8;margin-top:1px;text-transform:capitalize;';
            label.textContent = isCollected ? sym : '???';
            cell.appendChild(label);

            grid.appendChild(cell);
        }
    }

    function _togglePanel() {
        _expanded = !_expanded;
        var panel = document.getElementById(ELEMENT_ID + '_panel');
        if (panel) {
            panel.style.display = _expanded ? 'block' : 'none';
        }
    }

    function _build() {
        if (document.getElementById(ELEMENT_ID)) return;

        // Add keyframes
        if (!_styleEl) {
            _styleEl = document.createElement('style');
            _styleEl.textContent = '@keyframes collAlbumPop{0%{transform:translate(-50%,-50%) scale(0.5);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}';
            document.head.appendChild(_styleEl);
        }

        var container = document.createElement('div');
        container.id = ELEMENT_ID;
        container.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:' + Z_INDEX + ';font-family:Arial,sans-serif;';

        // Floating button
        var btn = document.createElement('div');
        btn.style.cssText = 'width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);' +
            'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
            'box-shadow:0 4px 20px rgba(245,158,11,0.4);font-size:24px;position:relative;' +
            'transition:transform 0.2s;';
        btn.textContent = '\uD83D\uDCD6';
        btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.1)'; });
        btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });
        btn.addEventListener('click', function () { _togglePanel(); });

        // Badge
        var badge = document.createElement('span');
        badge.id = ELEMENT_ID + '_badge';
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#e74c3c;color:#fff;' +
            'font-size:10px;font-weight:bold;border-radius:50%;width:20px;height:20px;' +
            'display:flex;align-items:center;justify-content:center;';
        badge.textContent = '0';
        btn.appendChild(badge);
        container.appendChild(btn);

        // Expanded panel
        var panel = document.createElement('div');
        panel.id = ELEMENT_ID + '_panel';
        panel.style.cssText = 'display:none;position:absolute;bottom:56px;right:0;width:280px;' +
            'background:linear-gradient(135deg,#0d1117,#1a2332);border:1px solid rgba(245,158,11,0.3);' +
            'border-radius:12px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,0.5);';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

        var titleEl = document.createElement('span');
        titleEl.style.cssText = 'font-size:14px;font-weight:bold;color:#fbbf24;';
        titleEl.textContent = '\uD83D\uDCD6 Collection';
        header.appendChild(titleEl);

        var countEl = document.createElement('span');
        countEl.id = ELEMENT_ID + '_count';
        countEl.style.cssText = 'font-size:13px;color:#94a3b8;';
        countEl.textContent = '0/' + ALL_SYMBOLS.length;
        header.appendChild(countEl);

        var closeBtn = document.createElement('span');
        closeBtn.style.cssText = 'color:#64748b;cursor:pointer;font-size:14px;line-height:1;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () { _togglePanel(); });
        header.appendChild(closeBtn);

        panel.appendChild(header);

        // Subtitle
        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:11px;color:#64748b;margin-bottom:10px;';
        subtitle.textContent = 'Collect ' + MILESTONE_1 + ' for $' + REWARD_1 + ' | Collect ' + MILESTONE_2 + ' for $' + REWARD_2;
        panel.appendChild(subtitle);

        // Symbol grid
        var grid = document.createElement('div');
        grid.id = ELEMENT_ID + '_grid';
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:4px;';
        _populateGrid(grid, _load());
        panel.appendChild(grid);

        container.appendChild(panel);
        document.body.appendChild(container);

        _updateUI();
    }

    function _handleSpin(evt) {
        var detail = evt.detail;
        if (!detail) return;

        var reels = detail.reels;
        if (reels && Array.isArray(reels)) {
            for (var i = 0; i < reels.length; i++) {
                if (typeof reels[i] === 'string') {
                    _addSymbol(reels[i]);
                }
            }
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();

        document.addEventListener('spinComplete', _handleSpin);
    }

    window.dismissCollectionAlbum = function () {
        document.removeEventListener('spinComplete', _handleSpin);
        var el = document.getElementById(ELEMENT_ID);
        if (el) {
            el.style.transition = 'opacity 0.3s, transform 0.3s';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.8)';
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
