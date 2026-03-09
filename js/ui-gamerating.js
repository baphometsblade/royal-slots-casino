// Sprint 70: Game Rating Popup — star rating system after playing a game
// After 10 spins in any single game, shows a 5-star rating popup (once per game).
(function() {
    'use strict';

    var ELEMENT_ID = 'gameRatingPopup';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_gameRatings';
    var SPINS_THRESHOLD = 10;
    var POLL_INTERVAL = 3000;

    var _popup = null;
    var _starsContainer = null;
    var _avgDisplay = null;
    var _selectedRating = 0;
    var _hoverRating = 0;
    var _currentGameForRating = null;
    var _data = {}; // { gameId: { spins: N, rated: bool, rating: N } }
    var _prevBalance = null;
    var _pollTimer = null;

    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) _data = JSON.parse(raw);
        } catch (e) { _data = {}; }
    }

    function _saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
        } catch (e) { /* ignore */ }
    }

    function _getAverageRating() {
        var total = 0;
        var count = 0;
        for (var key in _data) {
            if (_data.hasOwnProperty(key) && _data[key].rating > 0) {
                total += _data[key].rating;
                count++;
            }
        }
        return count > 0 ? (total / count).toFixed(1) : '0.0';
    }

    function _getRatedCount() {
        var count = 0;
        for (var key in _data) {
            if (_data.hasOwnProperty(key) && _data[key].rating > 0) count++;
        }
        return count;
    }

    function _buildStars(container, rating, interactive) {
        // Clear children safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        for (var i = 1; i <= 5; i++) {
            var star = document.createElement('span');
            star.style.cssText = 'font-size:32px;cursor:' + (interactive ? 'pointer' : 'default') + ';' +
                'transition:transform 0.15s,color 0.15s;display:inline-block;margin:0 3px;' +
                'color:' + (i <= rating ? '#ffd700' : '#555') + ';' +
                'text-shadow:' + (i <= rating ? '0 0 8px rgba(255,215,0,0.4)' : 'none') + ';';
            star.textContent = '\u2605';
            star.setAttribute('data-star', String(i));

            if (interactive) {
                (function(starIndex, starEl) {
                    starEl.addEventListener('mouseenter', function() {
                        _hoverRating = starIndex;
                        _renderStars();
                    });
                    starEl.addEventListener('mouseleave', function() {
                        _hoverRating = 0;
                        _renderStars();
                    });
                    starEl.addEventListener('click', function() {
                        _selectedRating = starIndex;
                        _hoverRating = 0;
                        _renderStars();
                    });
                })(i, star);
            }

            container.appendChild(star);
        }
    }

    function _renderStars() {
        if (!_starsContainer) return;
        var displayRating = _hoverRating > 0 ? _hoverRating : _selectedRating;
        var stars = _starsContainer.children;
        for (var j = 0; j < stars.length; j++) {
            var idx = j + 1;
            stars[j].style.color = idx <= displayRating ? '#ffd700' : '#555';
            stars[j].style.textShadow = idx <= displayRating ? '0 0 8px rgba(255,215,0,0.4)' : 'none';
            stars[j].style.transform = (idx <= displayRating && _hoverRating > 0) ? 'scale(1.15)' : 'scale(1)';
        }
    }

    function _showRatingPopup(gameId) {
        if (_popup && _popup.parentNode) {
            _popup.parentNode.removeChild(_popup);
        }

        _currentGameForRating = gameId;
        _selectedRating = 0;
        _hoverRating = 0;

        _popup = document.createElement('div');
        _popup.id = ELEMENT_ID;
        _popup.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;' +
            'justify-content:center;z-index:' + Z_INDEX + ';background:rgba(0,0,0,0.7);' +
            'opacity:0;transition:opacity 0.3s ease;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(160deg,#1a1a2e,#16213e);' +
            'border:1px solid rgba(255,215,0,0.3);border-radius:16px;padding:24px 20px;' +
            'max-width:300px;width:90%;text-align:center;transform:scale(0.8);' +
            'transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);' +
            'box-shadow:0 8px 32px rgba(0,0,0,0.6);';

        var emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:36px;margin-bottom:6px;';
        emoji.textContent = '\u2B50';
        card.appendChild(emoji);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:18px;font-weight:900;color:#ffd700;margin-bottom:4px;' +
            'letter-spacing:0.5px;';
        title.textContent = 'Rate this game!';
        card.appendChild(title);

        // Game name
        var gameName = _getGameName(gameId);
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;';
        nameEl.textContent = gameName;
        card.appendChild(nameEl);

        // Stars
        _starsContainer = document.createElement('div');
        _starsContainer.style.cssText = 'margin-bottom:14px;';
        _buildStars(_starsContainer, 0, true);
        card.appendChild(_starsContainer);

        // Average rating display
        _avgDisplay = document.createElement('div');
        _avgDisplay.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:16px;';
        var avg = _getAverageRating();
        var cnt = _getRatedCount();
        _avgDisplay.textContent = cnt > 0 ? 'Avg. rating: ' + avg + '/5 (' + cnt + ' games rated)' : '';
        card.appendChild(_avgDisplay);

        // Buttons row
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;';

        var skipBtn = document.createElement('button');
        skipBtn.style.cssText = 'flex:1;padding:12px;border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:8px;background:transparent;color:rgba(255,255,255,0.5);font-size:13px;' +
            'cursor:pointer;transition:opacity 0.15s;';
        skipBtn.textContent = 'Skip';
        skipBtn.addEventListener('click', function() { _dismissPopup(false); });
        btnRow.appendChild(skipBtn);

        var submitBtn = document.createElement('button');
        submitBtn.style.cssText = 'flex:1;padding:12px;border:none;border-radius:8px;' +
            'background:linear-gradient(135deg,#ffd700,#daa520);color:#1a1a2e;font-size:13px;' +
            'font-weight:900;cursor:pointer;transition:opacity 0.15s;';
        submitBtn.textContent = 'Submit';
        submitBtn.addEventListener('click', function() { _dismissPopup(true); });
        btnRow.appendChild(submitBtn);

        card.appendChild(btnRow);
        _popup.appendChild(card);
        document.body.appendChild(_popup);

        requestAnimationFrame(function() {
            _popup.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });
    }

    function _dismissPopup(saveRating) {
        if (saveRating && _selectedRating > 0 && _currentGameForRating) {
            if (!_data[_currentGameForRating]) {
                _data[_currentGameForRating] = { spins: 0, rated: false, rating: 0 };
            }
            _data[_currentGameForRating].rating = _selectedRating;
            _data[_currentGameForRating].rated = true;
            _saveData();

            _showToast('Thanks for rating! \u2605 ' + _selectedRating + '/5');
        } else if (_currentGameForRating) {
            // Mark as rated even if skipped (don't ask again)
            if (!_data[_currentGameForRating]) {
                _data[_currentGameForRating] = { spins: 0, rated: false, rating: 0 };
            }
            _data[_currentGameForRating].rated = true;
            _saveData();
        }

        if (_popup) {
            _popup.style.opacity = '0';
            var ref = _popup;
            setTimeout(function() {
                if (ref.parentNode) ref.parentNode.removeChild(ref);
            }, 300);
            _popup = null;
        }
        _starsContainer = null;
        _currentGameForRating = null;
    }

    function _showToast(msg) {
        if (typeof showToast === 'function') {
            showToast(msg, 'success', 3000);
            return;
        }
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);' +
            'background:#1a1a2e;color:#2ecc71;padding:10px 18px;border-radius:8px;font-size:13px;' +
            'z-index:' + (Z_INDEX + 10) + ';border:1px solid rgba(46,204,113,0.3);' +
            'opacity:0;transition:opacity 0.3s;';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function() { t.style.opacity = '1'; });
        setTimeout(function() {
            t.style.opacity = '0';
            setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
        }, 3000);
    }

    function _getGameName(gameId) {
        if (typeof GAMES !== 'undefined' && Array.isArray(GAMES)) {
            for (var i = 0; i < GAMES.length; i++) {
                if (GAMES[i].id === gameId) return GAMES[i].name || gameId;
            }
        }
        return gameId;
    }

    function _pollForSpins() {
        var currentBalance = typeof balance !== 'undefined' ? balance : null;
        var gameId = typeof currentGame !== 'undefined' && currentGame ? currentGame.id : null;

        if (currentBalance === null || gameId === null) {
            _prevBalance = currentBalance;
            return;
        }

        if (_prevBalance !== null && currentBalance !== _prevBalance) {
            // Balance changed while in a game — likely a spin
            if (!_data[gameId]) {
                _data[gameId] = { spins: 0, rated: false, rating: 0 };
            }
            _data[gameId].spins++;
            _saveData();

            // Check if threshold reached and not yet rated
            if (_data[gameId].spins >= SPINS_THRESHOLD && !_data[gameId].rated) {
                _data[gameId].rated = true; // prevent re-trigger
                _saveData();
                // Delay slightly so the spin result settles
                setTimeout(function() { _showRatingPopup(gameId); }, 2000);
            }
        }

        _prevBalance = currentBalance;
    }

    function _init() {
        _loadData();
        _prevBalance = typeof balance !== 'undefined' ? balance : null;
        _pollTimer = setInterval(_pollForSpins, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(_init, 6000);
        });
    } else {
        setTimeout(_init, 6000);
    }
})();
