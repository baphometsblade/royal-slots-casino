/* ui-luckynumber.js — Lucky Number Picker mini-game overlay (Sprint 44) */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_luckyNumberData';
    var OVERLAY_ID = 'luckyNumberOverlay';
    var SPINS_PER_TRIGGER = 150;

    var PRIZES = [1, 2, 5, 10, 25, 50];
    var TILE_COUNT = 9; // 3x3 grid

    var _revealed = false;
    var _chosenIndex = -1;
    var _tileValues = [];

    // ── QA bypass ──
    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    // ── localStorage helpers ──
    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { spinCount: 0, lastTriggered: 0 };
    }

    function _saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* ignore */ }
    }

    // ── Generate random tile values ──
    function _generateTiles() {
        _tileValues = [];
        for (var i = 0; i < TILE_COUNT; i++) {
            var idx = Math.floor(Math.random() * PRIZES.length);
            _tileValues.push(PRIZES[idx]);
        }
    }

    // ── Create a single tile element ──
    function _createTile(index) {
        var tile = document.createElement('div');
        tile.className = 's44-lucky-tile';
        tile.setAttribute('data-index', String(index));

        var front = document.createElement('div');
        front.className = 's44-lucky-tile-front';
        front.textContent = '?';
        tile.appendChild(front);

        var back = document.createElement('div');
        back.className = 's44-lucky-tile-back';
        back.textContent = '$' + _tileValues[index];
        tile.appendChild(back);

        tile.addEventListener('click', function () {
            if (_revealed) return;
            _onTilePick(index);
        });

        return tile;
    }

    // ── Handle tile selection ──
    function _onTilePick(index) {
        if (_revealed) return;
        _revealed = true;
        _chosenIndex = index;

        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;

        var tiles = overlay.querySelectorAll('.s44-lucky-tile');
        for (var i = 0; i < tiles.length; i++) {
            tiles[i].classList.add('s44-revealed');
            if (i === index) {
                tiles[i].classList.add('s44-winner');
            } else {
                tiles[i].classList.add('s44-loser');
            }
        }

        // Show result
        var winAmount = _tileValues[index];
        _showResult(overlay, winAmount);

        // Award prize
        if (typeof window.balance === 'number') {
            window.balance += winAmount;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }
    }

    // ── Show result section ──
    function _showResult(overlay, amount) {
        var resultDiv = overlay.querySelector('.s44-lucky-result');
        if (resultDiv && resultDiv.parentNode) {
            resultDiv.parentNode.removeChild(resultDiv);
        }

        resultDiv = document.createElement('div');
        resultDiv.className = 's44-lucky-result';

        var prizeText = document.createElement('div');
        prizeText.className = 's44-lucky-prize';
        prizeText.textContent = '\uD83C\uDF1F You won $' + amount + '! \uD83C\uDF1F';
        resultDiv.appendChild(prizeText);

        var claimBtn = document.createElement('button');
        claimBtn.className = 's44-lucky-claim-btn';
        claimBtn.textContent = 'Claim Prize';
        claimBtn.addEventListener('click', function () {
            _dismiss();
        });
        resultDiv.appendChild(claimBtn);

        var card = overlay.querySelector('.s44-lucky-card');
        if (card) {
            card.appendChild(resultDiv);
        }
    }

    // ── Build overlay ──
    function _buildOverlay() {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        _revealed = false;
        _chosenIndex = -1;
        _generateTiles();

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'lucky-number-overlay';

        var card = document.createElement('div');
        card.className = 's44-lucky-card';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 's44-lucky-close-btn';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            _dismiss();
        });
        card.appendChild(closeBtn);

        // Title
        var title = document.createElement('div');
        title.className = 's44-lucky-title';
        title.textContent = '\uD83C\uDFB0 Lucky Number Picker';
        card.appendChild(title);

        // Subtitle
        var subtitle = document.createElement('div');
        subtitle.className = 's44-lucky-subtitle';
        subtitle.textContent = 'Pick a tile to reveal your prize!';
        card.appendChild(subtitle);

        // Grid
        var grid = document.createElement('div');
        grid.className = 's44-lucky-grid';

        for (var i = 0; i < TILE_COUNT; i++) {
            var tile = _createTile(i);
            grid.appendChild(tile);
        }
        card.appendChild(grid);

        overlay.appendChild(card);

        // Click outside to dismiss
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                _dismiss();
            }
        });

        return overlay;
    }

    // ── Show the overlay ──
    function _showOverlay() {
        if (_isQA()) return;

        var overlay = _buildOverlay();
        document.body.appendChild(overlay);

        requestAnimationFrame(function () {
            overlay.classList.add('s44-active');
        });
    }

    // ── Dismiss overlay ──
    function _dismiss() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;

        overlay.classList.remove('s44-active');
        setTimeout(function () {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }

    // ── Track spin and trigger at threshold ──
    function _trackSpin() {
        if (_isQA()) return;

        var data = _loadData();
        data.spinCount = (data.spinCount || 0) + 1;

        if (data.spinCount >= SPINS_PER_TRIGGER) {
            data.spinCount = 0;
            data.lastTriggered = Date.now();
            _saveData(data);

            // Delay overlay to avoid interrupting spin animation
            setTimeout(function () {
                _showOverlay();
            }, 2000);
        } else {
            _saveData(data);
        }
    }

    // ── Public API ──
    window._luckyNumberTrackSpin = _trackSpin;
    window.dismissLuckyNumber = _dismiss;

    // ── Init ──
    function _init() {
        if (_isQA()) return;
        // Pre-build nothing on init; overlay is created on demand
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_init, 1000);
        });
    } else {
        setTimeout(_init, 1000);
    }
})();
