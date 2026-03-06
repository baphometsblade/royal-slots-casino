// Hot/Cold Streak Indicator — visual thermometer for recent win/loss patterns
// Self-contained IIFE. Hooks window.displayServerWinResult to track outcomes.
// State is in-memory only (resets on reload — intentional).
(function() {
    'use strict';

    // ── QA suppression ──────────────────────────────────────────
    var search = window.location.search || '';
    if (search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1) return;

    // ── Constants ────────────────────────────────────────────────
    var STREAK_HISTORY_MAX = 20;
    var FADE_DURATION_MS   = 400;
    var MESSAGE_ROTATE_MS  = 4000;
    var Z_INDEX            = 18600;

    // Streak tier definitions
    var TIERS = {
        DIAMOND:  { min: 5,  dir: 'win',  emoji: '\uD83D\uDC8E', label: 'DIAMOND',  cssClass: 'hc-diamond'  },
        ON_FIRE:  { min: 3,  dir: 'win',  emoji: '\uD83D\uDD25\uD83D\uDD25', label: 'ON FIRE', cssClass: 'hc-onfire'   },
        HOT:      { min: 2,  dir: 'win',  emoji: '\uD83D\uDD25', label: 'HOT',      cssClass: 'hc-hot'      },
        NEUTRAL:  { min: 0,  dir: null,   emoji: '\u2696\uFE0F', label: 'NEUTRAL',  cssClass: 'hc-neutral'  },
        COLD:     { min: 2,  dir: 'loss', emoji: '\uD83E\uDDCA', label: 'COLD',     cssClass: 'hc-cold'     },
        ICE_COLD: { min: 3,  dir: 'loss', emoji: '\u2744\uFE0F', label: 'ICE COLD', cssClass: 'hc-icecold'  }
    };

    // Motivational messages
    var HOT_MESSAGES = [
        '{n} wins in a row!',
        "You're on fire!",
        'Keep it going!',
        'Unstoppable!',
        'What a streak!'
    ];
    var COLD_MESSAGES = [
        'Your luck is about to turn!',
        'Big win incoming!',
        'Stay in the game!',
        'The reels are warming up!',
        'Keep spinning!'
    ];
    var DIAMOND_MESSAGES = [
        'Legendary streak!',
        'Diamond hands!',
        '{n} wins straight \u2014 incredible!',
        "Can't be stopped!"
    ];

    // ── State ────────────────────────────────────────────────────
    var _history       = [];   // Array of { win: boolean, gameId: string, gameName: string }
    var _consecutive   = 0;    // Positive = wins, negative = losses
    var _currentGameId = null;
    var _currentTier   = TIERS.NEUTRAL;
    var _containerEl   = null;
    var _emojiEl       = null;
    var _labelEl       = null;
    var _messageEl     = null;
    var _gaugeEl       = null;
    var _msgIndex      = 0;
    var _msgTimer      = null;
    var _stylesInjected = false;

    // ── Styles ───────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'hotColdStyles';
        s.textContent = [
            '.hc-container {',
            '    position: fixed;',
            '    top: 60px;',
            '    right: 16px;',
            '    z-index: ' + Z_INDEX + ';',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 6px;',
            '    padding: 6px 12px;',
            '    border-radius: 20px;',
            '    background: rgba(20, 20, 30, 0.85);',
            '    backdrop-filter: blur(8px);',
            '    border: 1px solid rgba(255, 255, 255, 0.08);',
            '    font-family: inherit;',
            '    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);',
            '    pointer-events: none;',
            '    opacity: 0;',
            '    transform: translateX(20px);',
            '    max-width: 260px;',
            '    overflow: hidden;',
            '}',
            '.hc-container.hc-visible {',
            '    opacity: 1;',
            '    transform: translateX(0);',
            '}',
            '.hc-container.hc-compact {',
            '    padding: 4px 10px;',
            '    max-width: 120px;',
            '}',
            '.hc-emoji {',
            '    font-size: 18px;',
            '    line-height: 1;',
            '    flex-shrink: 0;',
            '    transition: transform 0.3s ease;',
            '}',
            '.hc-body {',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 2px;',
            '    min-width: 0;',
            '}',
            '.hc-label {',
            '    font-size: 11px;',
            '    font-weight: 700;',
            '    letter-spacing: 1px;',
            '    text-transform: uppercase;',
            '    white-space: nowrap;',
            '    transition: color 0.5s ease;',
            '}',
            '.hc-message {',
            '    font-size: 10px;',
            '    color: rgba(255, 255, 255, 0.6);',
            '    white-space: nowrap;',
            '    overflow: hidden;',
            '    text-overflow: ellipsis;',
            '    transition: opacity ' + FADE_DURATION_MS + 'ms ease;',
            '}',
            '.hc-gauge {',
            '    position: absolute;',
            '    bottom: 0;',
            '    left: 0;',
            '    height: 2px;',
            '    border-radius: 0 0 20px 20px;',
            '    transition: width 0.6s ease, background 0.5s ease;',
            '}',
            '',
            '/* Tier: Neutral */',
            '.hc-neutral { border-color: rgba(255,255,255,0.06); }',
            '.hc-neutral .hc-label { color: #888; }',
            '.hc-neutral .hc-gauge { background: #555; width: 50%; }',
            '',
            '/* Tier: Hot */',
            '.hc-hot {',
            '    border-color: rgba(255, 160, 50, 0.3);',
            '    box-shadow: 0 0 12px rgba(255, 140, 0, 0.15);',
            '}',
            '.hc-hot .hc-label { color: #ffa032; }',
            '.hc-hot .hc-gauge { background: linear-gradient(90deg, #ff8c00, #ffa032); width: 65%; }',
            '.hc-hot .hc-emoji { animation: hcPulse 2s ease-in-out infinite; }',
            '',
            '/* Tier: On Fire */',
            '.hc-onfire {',
            '    border-color: rgba(255, 60, 30, 0.4);',
            '    box-shadow: 0 0 18px rgba(255, 50, 20, 0.25);',
            '    animation: hcFireGlow 1.5s ease-in-out infinite;',
            '}',
            '.hc-onfire .hc-label { color: #ff4422; }',
            '.hc-onfire .hc-gauge { background: linear-gradient(90deg, #ff4422, #ff6633); width: 80%; }',
            '.hc-onfire .hc-emoji { animation: hcPulse 1.2s ease-in-out infinite; }',
            '',
            '/* Tier: Diamond */',
            '.hc-diamond {',
            '    border-color: rgba(168, 85, 247, 0.5);',
            '    box-shadow: 0 0 22px rgba(168, 85, 247, 0.3);',
            '    animation: hcDiamondShimmer 2s ease-in-out infinite;',
            '}',
            '.hc-diamond .hc-label { color: #c084fc; }',
            '.hc-diamond .hc-gauge { background: linear-gradient(90deg, #a855f7, #c084fc, #a855f7); width: 100%; }',
            '.hc-diamond .hc-emoji { animation: hcPulse 1s ease-in-out infinite; }',
            '',
            '/* Tier: Cold */',
            '.hc-cold {',
            '    border-color: rgba(100, 180, 255, 0.25);',
            '    box-shadow: 0 0 10px rgba(100, 180, 255, 0.1);',
            '}',
            '.hc-cold .hc-label { color: #7bc8ff; }',
            '.hc-cold .hc-gauge { background: linear-gradient(90deg, #7bc8ff, #5ab0f0); width: 35%; }',
            '',
            '/* Tier: Ice Cold */',
            '.hc-icecold {',
            '    border-color: rgba(80, 160, 255, 0.35);',
            '    box-shadow: 0 0 16px rgba(80, 160, 255, 0.2);',
            '    animation: hcSnowGlow 2.5s ease-in-out infinite;',
            '}',
            '.hc-icecold .hc-label { color: #60b0ff; }',
            '.hc-icecold .hc-gauge { background: linear-gradient(90deg, #3b82f6, #60b0ff); width: 15%; }',
            '.hc-icecold .hc-emoji { animation: hcSnowShake 3s ease-in-out infinite; }',
            '',
            '/* Keyframes */',
            '@keyframes hcPulse {',
            '    0%, 100% { transform: scale(1); }',
            '    50% { transform: scale(1.15); }',
            '}',
            '@keyframes hcFireGlow {',
            '    0%, 100% { box-shadow: 0 0 14px rgba(255, 50, 20, 0.2); }',
            '    50% { box-shadow: 0 0 24px rgba(255, 50, 20, 0.4); }',
            '}',
            '@keyframes hcDiamondShimmer {',
            '    0%, 100% { box-shadow: 0 0 18px rgba(168, 85, 247, 0.25); border-color: rgba(168, 85, 247, 0.4); }',
            '    50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); border-color: rgba(192, 132, 252, 0.6); }',
            '}',
            '@keyframes hcSnowGlow {',
            '    0%, 100% { box-shadow: 0 0 12px rgba(80, 160, 255, 0.15); }',
            '    50% { box-shadow: 0 0 20px rgba(80, 160, 255, 0.3); }',
            '}',
            '@keyframes hcSnowShake {',
            '    0%, 100% { transform: rotate(0deg); }',
            '    25% { transform: rotate(-5deg); }',
            '    75% { transform: rotate(5deg); }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── DOM construction ─────────────────────────────────────────
    function buildContainer() {
        if (_containerEl) return;

        var container = document.createElement('div');
        container.className = 'hc-container hc-neutral hc-compact';

        var emoji = document.createElement('span');
        emoji.className = 'hc-emoji';
        emoji.textContent = TIERS.NEUTRAL.emoji;

        var body = document.createElement('div');
        body.className = 'hc-body';

        var label = document.createElement('div');
        label.className = 'hc-label';
        label.textContent = 'NEUTRAL';

        var message = document.createElement('div');
        message.className = 'hc-message';
        message.textContent = '';

        var gauge = document.createElement('div');
        gauge.className = 'hc-gauge';

        body.appendChild(label);
        body.appendChild(message);
        container.appendChild(emoji);
        container.appendChild(body);
        container.appendChild(gauge);
        document.body.appendChild(container);

        _containerEl = container;
        _emojiEl     = emoji;
        _labelEl     = label;
        _messageEl   = message;
        _gaugeEl     = gauge;
    }

    // ── Tier resolution ──────────────────────────────────────────
    function resolveTier() {
        if (_consecutive >= 5)  return TIERS.DIAMOND;
        if (_consecutive >= 3)  return TIERS.ON_FIRE;
        if (_consecutive >= 2)  return TIERS.HOT;
        if (_consecutive <= -3) return TIERS.ICE_COLD;
        if (_consecutive <= -2) return TIERS.COLD;
        return TIERS.NEUTRAL;
    }

    // ── Game name helper ─────────────────────────────────────────
    function resolveGameName(gameObj) {
        if (gameObj && gameObj.name) return gameObj.name;
        if (typeof currentGame !== 'undefined' && currentGame && currentGame.name) {
            return currentGame.name;
        }
        return null;
    }

    function resolveGameId(gameObj) {
        if (gameObj && gameObj.id) return gameObj.id;
        if (typeof currentGame !== 'undefined' && currentGame && currentGame.id) {
            return currentGame.id;
        }
        return null;
    }

    // ── Streak context text ──────────────────────────────────────
    function isStreakSameGame() {
        if (_history.length < 2) return false;
        var lastId = _history[_history.length - 1].gameId;
        if (!lastId) return false;
        var streakLen = Math.abs(_consecutive);
        for (var i = _history.length - 1; i >= Math.max(0, _history.length - streakLen); i--) {
            if (_history[i].gameId !== lastId) return false;
        }
        return true;
    }

    function getStreakGameName() {
        if (_history.length === 0) return null;
        return _history[_history.length - 1].gameName || null;
    }

    // ── Message cycling ──────────────────────────────────────────
    function pickMessage(tier) {
        var pool;
        if (tier === TIERS.DIAMOND)  pool = DIAMOND_MESSAGES;
        else if (tier === TIERS.ON_FIRE || tier === TIERS.HOT) pool = HOT_MESSAGES;
        else if (tier === TIERS.COLD || tier === TIERS.ICE_COLD) pool = COLD_MESSAGES;
        else return '';

        var n = Math.abs(_consecutive);
        var msg = pool[_msgIndex % pool.length];
        msg = msg.replace('{n}', String(n));

        // Append game context if streak is within one game
        if (isStreakSameGame()) {
            var gn = getStreakGameName();
            if (gn) {
                if (tier.dir === 'win') {
                    msg = 'Hot on ' + gn + '!';
                } else {
                    msg = gn + ' is due for a win!';
                }
            }
        }
        return msg;
    }

    function startMessageRotation() {
        stopMessageRotation();
        if (_currentTier === TIERS.NEUTRAL) return;
        _msgIndex = 0;
        updateMessage();
        _msgTimer = setInterval(function() {
            _msgIndex++;
            fadeMessage(function() {
                updateMessage();
            });
        }, MESSAGE_ROTATE_MS);
    }

    function stopMessageRotation() {
        if (_msgTimer) {
            clearInterval(_msgTimer);
            _msgTimer = null;
        }
    }

    function updateMessage() {
        if (!_messageEl) return;
        _messageEl.textContent = pickMessage(_currentTier);
        _messageEl.style.opacity = '1';
    }

    function fadeMessage(cb) {
        if (!_messageEl) { if (cb) cb(); return; }
        _messageEl.style.opacity = '0';
        setTimeout(function() {
            if (cb) cb();
        }, FADE_DURATION_MS);
    }

    // ── UI update ────────────────────────────────────────────────
    function updateIndicator() {
        if (!_containerEl) return;

        var prev = _currentTier;
        _currentTier = resolveTier();

        // Update emoji
        _emojiEl.textContent = _currentTier.emoji;

        // Update label
        var streakLen = Math.abs(_consecutive);
        if (_currentTier === TIERS.NEUTRAL) {
            _labelEl.textContent = 'NEUTRAL';
        } else {
            _labelEl.textContent = _currentTier.label + ' \u00D7' + streakLen;
        }

        // Swap tier class
        var tierClasses = [
            TIERS.DIAMOND.cssClass, TIERS.ON_FIRE.cssClass, TIERS.HOT.cssClass,
            TIERS.NEUTRAL.cssClass, TIERS.COLD.cssClass, TIERS.ICE_COLD.cssClass
        ];
        for (var i = 0; i < tierClasses.length; i++) {
            _containerEl.classList.remove(tierClasses[i]);
        }
        _containerEl.classList.add(_currentTier.cssClass);

        // Compact vs expanded
        if (_currentTier === TIERS.NEUTRAL) {
            _containerEl.classList.add('hc-compact');
        } else {
            _containerEl.classList.remove('hc-compact');
        }

        // Show/hide container
        if (_history.length === 0) {
            _containerEl.classList.remove('hc-visible');
        } else {
            _containerEl.classList.add('hc-visible');
        }

        // Restart messages if tier changed
        if (prev !== _currentTier) {
            startMessageRotation();
        }
    }

    // ── Outcome recording ────────────────────────────────────────
    function recordOutcome(isWin, gameObj) {
        var gid   = resolveGameId(gameObj);
        var gname = resolveGameName(gameObj);

        _history.push({ win: isWin, gameId: gid, gameName: gname });
        if (_history.length > STREAK_HISTORY_MAX) {
            _history.shift();
        }

        // Update consecutive counter
        if (isWin) {
            if (_consecutive >= 0) {
                _consecutive++;
            } else {
                _consecutive = 1;
            }
        } else {
            if (_consecutive <= 0) {
                _consecutive--;
            } else {
                _consecutive = -1;
            }
        }

        updateIndicator();
    }

    // ── Hook displayServerWinResult ──────────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Call original first
            _orig.call(this, result, game);

            // Determine win/loss
            var isWin = !!(result && result.winAmount > 0);
            recordOutcome(isWin, game);
        };
    }

    // ── Initialization ───────────────────────────────────────────
    function init() {
        injectStyles();
        buildContainer();
        hookWinResult();
        updateIndicator();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 500);
        });
    } else {
        setTimeout(init, 500);
    }

}());
