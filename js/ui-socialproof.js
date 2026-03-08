(function() {
    'use strict';

    var PLAYER_NAMES = [
        'CryptoKing', 'LuckyAce88', 'NightOwl', 'DiamondHands', 'SpinMaster',
        'GoldRush', 'StarPlayer', 'WildCard77', 'JackpotJane', 'BigSpender',
        'MoonBet', 'AceHighRoller', 'VegasVixen', 'ReelQueen', 'SilverFox'
    ];

    var GAME_NAMES = [
        'Fire Joker', 'Book of Dead', 'Starburst', 'Sweet Bonanza', 'Gates of Olympus'
    ];

    var AVATAR_EMOJIS = [
        '\uD83D\uDE0E', '\uD83E\uDD11', '\uD83D\uDC51', '\uD83C\uDFB0',
        '\u2B50', '\uD83D\uDD25', '\uD83D\uDC8E', '\uD83C\uDFAF'
    ];

    var MIN_INTERVAL = 8000;
    var MAX_INTERVAL = 15000;
    var DISMISS_TIME = 4000;
    var MAX_VISIBLE = 3;
    var INIT_DELAY = 10000;

    var _container = null;
    var _timerHandle = null;
    var _visibleCards = [];
    var _seedState = Date.now();

    function _isQA() {
        return window.location.search.indexOf('noBonus=1') !== -1;
    }

    function _pseudoRandom() {
        _seedState = (_seedState * 1103515245 + 12345) & 0x7fffffff;
        return _seedState / 0x7fffffff;
    }

    function _randomInt(min, max) {
        return Math.floor(_pseudoRandom() * (max - min + 1)) + min;
    }

    function _pickRandom(arr) {
        return arr[_randomInt(0, arr.length - 1)];
    }

    function _generateWinAmount() {
        var r = _pseudoRandom();
        if (r < 0.5) return _randomInt(5, 25);
        if (r < 0.75) return _randomInt(26, 75);
        if (r < 0.9) return _randomInt(76, 200);
        return _randomInt(201, 500);
    }

    function _ensureContainer() {
        var el = document.getElementById('socialProofContainer');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'socialProofContainer';
        el.className = 'social-proof-container';
        document.body.appendChild(el);
        return el;
    }

    function _removeCard(card) {
        card.classList.add('sp-card-exit');
        var idx = _visibleCards.indexOf(card);
        if (idx !== -1) _visibleCards.splice(idx, 1);
        setTimeout(function() {
            if (card.parentNode) card.parentNode.removeChild(card);
        }, 400);
    }

    function _showNotification() {
        if (!_container) return;

        while (_visibleCards.length >= MAX_VISIBLE) {
            _removeCard(_visibleCards[0]);
        }

        var playerName = _pickRandom(PLAYER_NAMES);
        var gameName = _pickRandom(GAME_NAMES);
        var winAmount = _generateWinAmount();
        var avatar = _pickRandom(AVATAR_EMOJIS);

        var card = document.createElement('div');
        card.className = 'sp-card';
        if (winAmount >= 50) card.classList.add('sp-big-win');

        var avatarEl = document.createElement('span');
        avatarEl.className = 'sp-avatar';
        avatarEl.textContent = avatar;
        card.appendChild(avatarEl);

        var textWrap = document.createElement('div');
        textWrap.className = 'sp-text';

        var nameLine = document.createElement('span');
        nameLine.className = 'sp-player-name';
        nameLine.textContent = playerName;
        textWrap.appendChild(nameLine);

        var actionText = document.createTextNode(' won ');
        textWrap.appendChild(actionText);

        var amountEl = document.createElement('span');
        amountEl.className = 'sp-amount';
        amountEl.textContent = '$' + winAmount.toLocaleString();
        textWrap.appendChild(amountEl);

        var onText = document.createTextNode(' on ');
        textWrap.appendChild(onText);

        var gameEl = document.createElement('span');
        gameEl.className = 'sp-game-name';
        gameEl.textContent = gameName;
        textWrap.appendChild(gameEl);

        card.appendChild(textWrap);
        _container.appendChild(card);

        void card.offsetWidth;
        card.classList.add('sp-card-enter');

        _visibleCards.push(card);

        setTimeout(function() {
            _removeCard(card);
        }, DISMISS_TIME);
    }

    function _scheduleNext() {
        var delay = _randomInt(MIN_INTERVAL, MAX_INTERVAL);
        _timerHandle = setTimeout(function() {
            _showNotification();
            _scheduleNext();
        }, delay);
    }

    function _init() {
        if (_isQA()) return;

        setTimeout(function() {
            _container = _ensureContainer();
            _showNotification();
            _scheduleNext();
        }, INIT_DELAY);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
