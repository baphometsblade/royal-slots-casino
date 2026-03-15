(function() {
  'use strict';

  var state = {
    consecutiveWins: 0,
    currentStreak: 'none',
    isVisible: false,
    dismissTimeout: null,
    lastBet: 0,
    lastWinAmount: 0
  };

  var config = {
    dismissDelay: 10000,
    streakThresholds: {
      wave: 2,
      hot: 3,
      legendary: 5
    }
  };

  var streakConfig = {
    none: { label: '', emoji: '', multiplier: 0, color: '#666666', glowColor: 'rgba(102,102,102,0.5)' },
    wave: { label: 'RIDE THE WAVE', emoji: '🌊', multiplier: 2, color: '#d4af37', glowColor: 'rgba(212,175,55,0.6)' },
    hot: { label: 'HOT STREAK', emoji: '🔥', multiplier: 3, color: '#ff6b35', glowColor: 'rgba(255,107,53,0.6)' },
    legendary: { label: 'LEGENDARY STREAK', emoji: '⚡', multiplier: 5, color: '#a78bfa', glowColor: 'rgba(167,139,250,0.6)' }
  };

  function injectStyles() {
    if (document.getElementById('bet-escalator-styles')) {
      return;
    }

    var styleContent = `
      #bet-escalator-bar {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: min(500px, 90vw);
        background: rgba(10, 5, 20, 0.95);
        border: 2px solid #d4af37;
        border-radius: 12px;
        padding: 16px 20px;
        z-index: 9996;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: slideInDown 0.4s ease-out;
        backdrop-filter: blur(10px);
      }

      #bet-escalator-bar.hidden {
        display: none;
      }

      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .bet-escalator-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .bet-escalator-info {
        flex: 1;
        color: #ffffff;
      }

      .bet-escalator-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .bet-escalator-label {
        color: #ffd700;
      }

      .bet-escalator-stats {
        display: flex;
        gap: 20px;
        font-size: 13px;
        margin-top: 4px;
      }

      .bet-escalator-stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .bet-escalator-stat-label {
        color: #888888;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .bet-escalator-stat-value {
        color: #00ff41;
        font-weight: 600;
        font-size: 14px;
      }

      .bet-escalator-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .bet-escalator-cta {
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #1a0a2e;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .bet-escalator-cta:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
      }

      .bet-escalator-cta:active {
        transform: scale(0.98);
      }

      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }
        50% {
          box-shadow: 0 4px 25px rgba(255, 215, 0, 0.6);
        }
      }

      .bet-escalator-dismiss {
        background: transparent;
        border: none;
        color: #888888;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }

      .bet-escalator-dismiss:hover {
        color: #ffffff;
      }

      @media (max-width: 480px) {
        #bet-escalator-bar {
          top: 70px;
          padding: 12px 16px;
        }

        .bet-escalator-content {
          flex-direction: column;
          gap: 12px;
        }

        .bet-escalator-actions {
          width: 100%;
          flex-direction: column;
        }

        .bet-escalator-cta {
          width: 100%;
          padding: 14px 16px;
        }

        .bet-escalator-stats {
          gap: 12px;
        }

        .bet-escalator-header {
          font-size: 14px;
        }
      }
    `;

    var style = document.createElement('style');
    style.id = 'bet-escalator-styles';
    style.textContent = styleContent;
    document.head.appendChild(style);
  }

  function determineStreak(wins) {
    if (wins >= config.streakThresholds.legendary) {
      return 'legendary';
    }
    if (wins >= config.streakThresholds.hot) {
      return 'hot';
    }
    if (wins >= config.streakThresholds.wave) {
      return 'wave';
    }
    return 'none';
  }

  function getOrCreateBar() {
    var existing = document.getElementById('bet-escalator-bar');
    if (existing) {
      return existing;
    }

    var slotArea = document.querySelector('[data-slot-area], .slot-area, #slot-container');
    var container = slotArea || document.body;

    var bar = document.createElement('div');
    bar.id = 'bet-escalator-bar';
    bar.className = 'hidden';
    bar.innerHTML = `
      <div class="bet-escalator-content">
        <div class="bet-escalator-info">
          <div class="bet-escalator-header">
            <span class="bet-escalator-emoji"></span>
            <span class="bet-escalator-label"></span>
          </div>
          <div class="bet-escalator-stats">
            <div class="bet-escalator-stat">
              <span class="bet-escalator-stat-label">Win Streak</span>
              <span class="bet-escalator-stat-value bet-escalator-streak-count">0</span>
            </div>
            <div class="bet-escalator-stat">
              <span class="bet-escalator-stat-label">Suggested Bet</span>
              <span class="bet-escalator-stat-value bet-escalator-suggested-bet">0</span>
            </div>
            <div class="bet-escalator-stat">
              <span class="bet-escalator-stat-label">Potential Win</span>
              <span class="bet-escalator-stat-value bet-escalator-potential-win">0</span>
            </div>
          </div>
        </div>
        <div class="bet-escalator-actions">
          <button class="bet-escalator-cta bet-escalator-double-btn"></button>
          <button class="bet-escalator-dismiss" aria-label="Dismiss">×</button>
        </div>
      </div>
    `;

    container.appendChild(bar);
    return bar;
  }

  function updateBarDisplay() {
    var bar = document.getElementById('bet-escalator-bar');
    if (!bar) return;

    var config = streakConfig[state.currentStreak];
    var suggestedBet = state.lastBet * config.multiplier;
    var potentialWin = Math.round(suggestedBet * (state.lastWinAmount / state.lastBet || 1));

    bar.style.borderColor = config.color;
    bar.style.boxShadow = '0 8px 32px ' + config.glowColor;

    var emojiEl = bar.querySelector('.bet-escalator-emoji');
    emojiEl.textContent = config.emoji;

    var labelEl = bar.querySelector('.bet-escalator-label');
    labelEl.textContent = config.label;
    labelEl.style.color = config.color;

    var streakCountEl = bar.querySelector('.bet-escalator-streak-count');
    streakCountEl.textContent = state.consecutiveWins;

    var suggestedEl = bar.querySelector('.bet-escalator-suggested-bet');
    suggestedEl.textContent = suggestedBet.toFixed(2);

    var potentialEl = bar.querySelector('.bet-escalator-potential-win');
    potentialEl.textContent = potentialWin.toFixed(2);

    var ctaBtn = bar.querySelector('.bet-escalator-cta');
    ctaBtn.textContent = 'DOUBLE YOUR BET (' + config.multiplier + 'x)';
  }

  function showBar() {
    var bar = document.getElementById('bet-escalator-bar');
    if (!bar) {
      bar = getOrCreateBar();
    }

    bar.classList.remove('hidden');
    state.isVisible = true;

    clearTimeout(state.dismissTimeout);
    state.dismissTimeout = setTimeout(function() {
      if (state.isVisible && state.consecutiveWins > 0) {
        hideBar();
      }
    }, config.dismissDelay);

    updateBarDisplay();
  }

  function hideBar() {
    var bar = document.getElementById('bet-escalator-bar');
    if (bar) {
      bar.classList.add('hidden');
    }
    state.isVisible = false;
    clearTimeout(state.dismissTimeout);
  }

  function attachEventListeners() {
    var bar = document.getElementById('bet-escalator-bar');
    if (!bar) return;

    var ctaBtn = bar.querySelector('.bet-escalator-cta');
    var dismissBtn = bar.querySelector('.bet-escalator-dismiss');

    ctaBtn.addEventListener('click', function() {
      var config = streakConfig[state.currentStreak];
      var suggestedBet = state.lastBet * config.multiplier;

      if (typeof window.changeBet === 'function') {
        window.changeBet(suggestedBet);
      } else if (typeof window.setBet === 'function') {
        window.setBet(suggestedBet);
      } else {
        window.currentBet = suggestedBet;
      }

      hideBar();
    });

    dismissBtn.addEventListener('click', function() {
      hideBar();
    });
  }

  function shouldSuppress() {
    return window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1;
  }

  var publicAPI = {
    init: function() {
      if (shouldSuppress()) {
        return;
      }

      injectStyles();
      getOrCreateBar();
      attachEventListeners();
    },

    onSpinResult: function(result) {
      if (shouldSuppress() || !result) {
        return;
      }

      state.lastBet = result.bet || state.lastBet;
      state.lastWinAmount = result.amount || 0;

      if (result.won) {
        state.consecutiveWins += 1;
      } else {
        state.consecutiveWins = 0;
        hideBar();
        return;
      }

      var newStreak = determineStreak(state.consecutiveWins);

      if (newStreak !== 'none') {
        state.currentStreak = newStreak;
        showBar();
      } else {
        hideBar();
      }
    },

    dismiss: function() {
      hideBar();
    },

    getStreak: function() {
      return state.consecutiveWins;
    }
  };

  window.BetEscalator = publicAPI;

})();
