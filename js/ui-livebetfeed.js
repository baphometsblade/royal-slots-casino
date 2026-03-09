(function(){
    'use strict';

    var ELEMENT_ID = 'liveBetFeed';
    var Z_INDEX = 10400;
    var MAX_ENTRIES = 5;
    var GAME_NAMES = ['Lucky 7s', 'Dragon Fire', 'Gold Rush', 'Star Burst', 'Wild Safari'];
    var ENTRY_HEIGHT = 40;

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randAmount(min, max) {
        return (Math.random() * (max - min) + min).toFixed(2);
    }

    function generatePlayerName() {
        return 'Player_' + String(randInt(100, 999));
    }

    function generateBet() {
        var game = GAME_NAMES[randInt(0, GAME_NAMES.length - 1)];
        var betAmount = parseFloat(randAmount(0.50, 100));
        var isWin = Math.random() > 0.45;
        var resultAmount = isWin ? parseFloat(randAmount(betAmount * 0.5, betAmount * 5)) : betAmount;
        return {
            player: generatePlayerName(),
            game: game,
            bet: betAmount,
            isWin: isWin,
            result: resultAmount.toFixed(2)
        };
    }

    function createEntryEl(bet) {
        var el = document.createElement('div');
        el.style.cssText = 'padding:4px 8px;font-size:10px;border-bottom:1px solid rgba(255,255,255,0.08);' +
            'transition:all 0.5s ease;opacity:0;transform:translateY(10px);white-space:nowrap;overflow:hidden;' +
            'text-overflow:ellipsis;min-height:' + ENTRY_HEIGHT + 'px;box-sizing:border-box;';

        var nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'color:#aab;font-weight:600;display:block;font-size:9px;';
        nameSpan.textContent = bet.player;

        var gameSpan = document.createElement('span');
        gameSpan.style.cssText = 'color:#889;font-size:9px;display:block;';
        gameSpan.textContent = bet.game + ' — $' + bet.bet;

        var resultSpan = document.createElement('span');
        resultSpan.style.cssText = 'font-weight:700;font-size:10px;display:block;color:' +
            (bet.isWin ? '#2ecc71' : '#e74c3c') + ';';
        resultSpan.textContent = bet.isWin ? 'Won $' + bet.result : 'Lost $' + bet.result;

        el.appendChild(nameSpan);
        el.appendChild(gameSpan);
        el.appendChild(resultSpan);

        return el;
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;

        var container = document.createElement('div');
        container.id = ELEMENT_ID;
        container.style.cssText = 'position:fixed;left:4px;top:50%;transform:translateY(-50%);' +
            'width:180px;height:220px;background:rgba(26,26,46,0.88);border:1px solid rgba(255,215,0,0.15);' +
            'border-radius:8px;z-index:' + Z_INDEX + ';overflow:hidden;font-family:inherit;' +
            'backdrop-filter:blur(4px);box-shadow:0 2px 12px rgba(0,0,0,0.4);';

        var header = document.createElement('div');
        header.style.cssText = 'padding:6px 8px;font-size:10px;font-weight:700;color:#ffd700;' +
            'text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(255,215,0,0.2);' +
            'background:rgba(22,33,62,0.7);text-align:center;';
        header.textContent = '🎰 Live Bets';

        var feedArea = document.createElement('div');
        feedArea.style.cssText = 'overflow:hidden;height:' + (220 - 30) + 'px;position:relative;';

        container.appendChild(header);
        container.appendChild(feedArea);
        document.body.appendChild(container);

        var entries = [];

        function addEntry() {
            var bet = generateBet();
            var entryEl = createEntryEl(bet);
            feedArea.appendChild(entryEl);
            entries.push(entryEl);

            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    entryEl.style.opacity = '1';
                    entryEl.style.transform = 'translateY(0)';
                });
            });

            if (entries.length > MAX_ENTRIES) {
                var old = entries.shift();
                old.style.opacity = '0';
                old.style.transform = 'translateY(-10px)';
                setTimeout(function() {
                    if (old.parentNode) old.parentNode.removeChild(old);
                }, 500);
            }

            var nextDelay = randInt(4000, 8000);
            setTimeout(addEntry, nextDelay);
        }

        addEntry();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 5000);
        });
    } else {
        setTimeout(init, 5000);
    }
})();
