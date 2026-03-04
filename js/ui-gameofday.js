(function() {
    'use strict';

    var currentGameId = null;
    var currentGameName = null;
    var secondsLeft = 0;
    var tickInterval = null;

    function formatCountdown(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) {
            return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function injectStyles() {
        if (document.getElementById('godBannerStyles')) return;
        var style = document.createElement('style');
        style.id = 'godBannerStyles';
        style.textContent = [
            '.god-banner {',
            '    grid-column: 1 / -1;',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 20px;',
            '    padding: 16px 24px;',
            '    background: linear-gradient(135deg, #1a0a00, #2d1600, #1a0a00);',
            '    border: 1px solid #ff6b00;',
            '    border-radius: 12px;',
            '    margin-bottom: 16px;',
            '    box-shadow: 0 0 20px rgba(255, 107, 0, 0.2), inset 0 1px 0 rgba(255, 200, 0, 0.1);',
            '    cursor: default;',
            '    width: 100%;',
            '    box-sizing: border-box;',
            '}',
            '.god-banner-flame {',
            '    font-size: 2.5rem;',
            '    flex-shrink: 0;',
            '    animation: godFlame 1.5s ease-in-out infinite;',
            '}',
            '@keyframes godFlame {',
            '    0%, 100% { transform: scale(1) rotate(-3deg); }',
            '    50% { transform: scale(1.1) rotate(3deg); }',
            '}',
            '.god-banner-left { flex: 0 0 auto; }',
            '.god-banner-title {',
            '    font-size: 11px;',
            '    letter-spacing: 2px;',
            '    color: #ff9500;',
            '    text-transform: uppercase;',
            '    margin-bottom: 4px;',
            '}',
            '.god-banner-game {',
            '    font-size: 20px;',
            '    font-weight: 800;',
            '    color: #fff;',
            '    text-shadow: 0 0 10px rgba(255, 200, 0, 0.5);',
            '}',
            '.god-banner-mid {',
            '    flex: 1;',
            '    display: flex;',
            '    flex-direction: column;',
            '    align-items: center;',
            '    gap: 6px;',
            '}',
            '.god-xp-badge {',
            '    background: linear-gradient(135deg, #ff6b00, #ffd700);',
            '    color: #000;',
            '    font-weight: 800;',
            '    font-size: 13px;',
            '    padding: 4px 14px;',
            '    border-radius: 20px;',
            '    letter-spacing: 0.5px;',
            '}',
            '.god-countdown {',
            '    font-family: monospace;',
            '    font-size: 13px;',
            '    color: rgba(255,255,255,0.6);',
            '}',
            '.god-play-btn {',
            '    background: linear-gradient(135deg, #ff6b00, #ff9500);',
            '    color: #fff;',
            '    border: none;',
            '    padding: 12px 24px;',
            '    border-radius: 8px;',
            '    font-size: 16px;',
            '    font-weight: 800;',
            '    cursor: pointer;',
            '    letter-spacing: 1px;',
            '    transition: transform 0.1s, box-shadow 0.1s;',
            '    flex-shrink: 0;',
            '}',
            '.god-play-btn:hover {',
            '    transform: scale(1.05);',
            '    box-shadow: 0 4px 16px rgba(255, 107, 0, 0.5);',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function buildBanner() {
        var banner = document.createElement('div');
        banner.id = 'godBanner';
        banner.className = 'god-banner';

        // Left section
        var leftSection = document.createElement('div');
        leftSection.className = 'god-banner-left';

        var flame = document.createElement('div');
        flame.className = 'god-banner-flame';
        flame.textContent = '\uD83D\uDD25';

        var title = document.createElement('div');
        title.className = 'god-banner-title';
        title.textContent = 'GAME OF THE DAY';

        var gameName = document.createElement('div');
        gameName.className = 'god-banner-game';
        gameName.id = 'godBannerGameName';
        gameName.textContent = currentGameName || '';

        leftSection.appendChild(flame);
        leftSection.appendChild(title);
        leftSection.appendChild(gameName);

        // Middle section
        var midSection = document.createElement('div');
        midSection.className = 'god-banner-mid';

        var xpBadge = document.createElement('div');
        xpBadge.className = 'god-xp-badge';
        xpBadge.textContent = '2\xD7 XP TODAY ONLY!';

        var countdown = document.createElement('div');
        countdown.className = 'god-countdown';
        countdown.id = 'godBannerCountdown';
        countdown.textContent = 'Changes in ' + formatCountdown(secondsLeft);

        midSection.appendChild(xpBadge);
        midSection.appendChild(countdown);

        // Right section
        var rightSection = document.createElement('div');

        var playBtn = document.createElement('button');
        playBtn.className = 'god-play-btn';
        playBtn.textContent = 'PLAY NOW \u2192';
        playBtn.addEventListener('click', function() {
            if (typeof openSlot === 'function' && currentGameId) {
                openSlot(currentGameId);
            }
        });

        rightSection.appendChild(playBtn);

        banner.appendChild(leftSection);
        banner.appendChild(midSection);
        banner.appendChild(rightSection);

        return banner;
    }

    function injectBanner() {
        var grid = document.getElementById('gameGrid');
        if (!grid) return;

        var existing = document.getElementById('godBanner');
        if (existing) {
            var countdownEl = document.getElementById('godBannerCountdown');
            if (countdownEl) {
                countdownEl.textContent = 'Changes in ' + formatCountdown(Math.max(0, secondsLeft));
            }
            return;
        }

        if (!currentGameId) return;

        var banner = buildBanner();
        grid.insertBefore(banner, grid.firstChild);
    }

    function startCountdown() {
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }

        tickInterval = setInterval(function() {
            secondsLeft -= 1;

            var countdownEl = document.getElementById('godBannerCountdown');
            if (countdownEl) {
                countdownEl.textContent = 'Changes in ' + formatCountdown(Math.max(0, secondsLeft));
            }

            if (secondsLeft <= 0) {
                clearInterval(tickInterval);
                tickInterval = null;
                fetchAndBuild();
            }
        }, 1000);
    }

    function fetchAndBuild() {
        try {
            fetch('/api/game-of-day')
                .then(function(response) {
                    if (!response.ok) return null;
                    return response.json();
                })
                .then(function(data) {
                    if (!data || !data.gameId) return;

                    currentGameId = data.gameId;
                    currentGameName = data.gameName || data.gameId;
                    secondsLeft = typeof data.secondsUntilNext === 'number' ? data.secondsUntilNext : 43200;

                    var old = document.getElementById('godBanner');
                    if (old) old.parentNode.removeChild(old);

                    injectBanner();
                    startCountdown();
                })
                .catch(function() {
                    // Silently skip on error
                });
        } catch (e) {
            // Silently skip on error
        }
    }

    function refreshGameOfDay() {
        fetchAndBuild();
    }

    function hookRenderGames() {
        if (typeof renderGames === 'function') {
            var _prevRG = renderGames;
            renderGames = function() {
                _prevRG.apply(this, arguments);
                setTimeout(injectBanner, 100);
            };
        }
    }

    function init() {
        injectStyles();
        hookRenderGames();
        fetchAndBuild();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    window.refreshGameOfDay = refreshGameOfDay;
})();
