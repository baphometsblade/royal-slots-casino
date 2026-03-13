/**
 * Live Wins Social Proof Ticker
 * Displays a scrolling ticker of recent big wins to create FOMO and social proof
 * Fetches from GET /api/spins/recent-wins or generates simulated wins
 */

(function() {
  'use strict';

  var GAME_NAMES = [
    'Pharaoh\'s Gold',
    'Lucky 7s',
    'Dragon Fortune',
    'Neon Nights',
    'Wild West',
    'Mystic Gems',
    'Ocean\'s Treasure',
    'Cosmic Spins',
    'Golden Empire',
    'Thunder Strike'
  ];

  var USERNAMES = [
    'J***n', 'M***k', 'S***a', 'D***d', 'A***x', 'L***e', 'R***l', 'C***e',
    'B***y', 'T***y', 'P***a', 'N***h', 'K***n', 'E***n', 'G***t', 'V***a'
  ];

  var WIN_AMOUNTS = [
    // Weighted: mostly $5-50
    { min: 5, max: 50, weight: 0.60 },
    // Some $50-200
    { min: 50, max: 200, weight: 0.25 },
    // Rare $200-1000
    { min: 200, max: 1000, weight: 0.12 },
    // Very rare $1000+
    { min: 1000, max: 5000, weight: 0.03 }
  ];

  var TICKER_ELEMENT = null;
  var WINS_CONTAINER = null;
  var LIVE_INDICATOR = null;
  var PLAYER_COUNT_EL = null;
  var MINIMIZE_BTN = null;
  var TICKER_BAR = null;

  var isMinimized = false;
  var recentWins = [];
  var playerCount = 287;
  var tickerInterval = null;
  var playerCountInterval = null;
  var fetchInterval = null;
  var isSimulating = false;

  /**
   * Initialize the live wins ticker on page load
   */
  function init() {
    createTickerBar();
    loadMinimizedState();

    // Start fetching wins
    fetchRecentWins();
    tickerInterval = setInterval(fetchRecentWins, 8000 + Math.random() * 7000); // 8-15s

    // Start updating player count
    updatePlayerCount();
    playerCountInterval = setInterval(updatePlayerCount, 30000);

    // Add CSS animations if not already present
    injectStyles();

    console.warn('[LiveWinsTicker] Initialized');
  }

  /**
   * Create the ticker bar HTML structure
   */
  function createTickerBar() {
    TICKER_BAR = document.createElement('div');
    TICKER_BAR.id = 'liveWinsTickerBar';
    TICKER_BAR.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:36px;background:rgba(10,5,20,0.9);border-top:1px solid rgba(255,215,0,0.3);z-index:9999;display:flex;align-items:center;padding:0 16px;gap:12px;font-family:Arial,sans-serif;font-size:13px;color:#ddd;overflow:hidden;box-sizing:border-box;transition:transform 0.3s ease;';
    document.body.appendChild(TICKER_BAR);

    // Live indicator
    LIVE_INDICATOR = document.createElement('div');
    LIVE_INDICATOR.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';
    LIVE_INDICATOR.innerHTML = '<div style="width:8px;height:8px;background:#e63946;border-radius:50%;animation:liveWinsPulse 1.5s infinite;"></div><span style="color:#e63946;font-weight:700;font-size:11px;letter-spacing:0.5px;">LIVE</span>';
    TICKER_BAR.appendChild(LIVE_INDICATOR);

    // Wins container (scrollable area)
    WINS_CONTAINER = document.createElement('div');
    WINS_CONTAINER.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;';
    TICKER_BAR.appendChild(WINS_CONTAINER);

    // Player count
    PLAYER_COUNT_EL = document.createElement('div');
    PLAYER_COUNT_EL.style.cssText = 'flex-shrink:0;white-space:nowrap;color:#ddd;font-size:12px;';
    PLAYER_COUNT_EL.textContent = '👥 ' + playerCount + ' players online';
    TICKER_BAR.appendChild(PLAYER_COUNT_EL);

    // Minimize button
    MINIMIZE_BTN = document.createElement('button');
    MINIMIZE_BTN.style.cssText = 'flex-shrink:0;background:none;border:none;color:#666;cursor:pointer;padding:4px;font-size:14px;transition:color 0.2s;';
    MINIMIZE_BTN.textContent = '▼';
    MINIMIZE_BTN.addEventListener('click', toggleMinimize);
    MINIMIZE_BTN.addEventListener('mouseenter', function() {
      this.style.color = '#ffd700';
    });
    MINIMIZE_BTN.addEventListener('mouseleave', function() {
      this.style.color = isMinimized ? '#666' : '#666';
    });
    TICKER_BAR.appendChild(MINIMIZE_BTN);
  }

  /**
   * Fetch recent wins from API or use simulated data
   */
  async function fetchRecentWins() {
    try {
      var response = await fetch('/api/spins/recent-wins', {
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error('API returned ' + response.status);
      }

      var data = await response.json();
      if (data.wins && Array.isArray(data.wins)) {
        recentWins = data.wins;
        isSimulating = false;
        displayNextWin();
        return;
      }
    } catch (err) {
      console.warn('[LiveWinsTicker] API fetch failed:', err.message);
    }

    // Fall back to simulated wins
    if (!isSimulating) {
      isSimulating = true;
    }
    generateSimulatedWin();
  }

  /**
   * Generate a random simulated win
   */
  function generateSimulatedWin() {
    var username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
    var gameName = GAME_NAMES[Math.floor(Math.random() * GAME_NAMES.length)];
    var amount = getRandomWinAmount();

    var win = {
      username: username,
      game: gameName,
      amount: amount,
      timestamp: Date.now()
    };

    recentWins.push(win);
    if (recentWins.length > 50) {
      recentWins.shift();
    }

    displayWin(win);
  }

  /**
   * Get a weighted random win amount
   */
  function getRandomWinAmount() {
    var rand = Math.random();
    var cumulative = 0;

    for (var i = 0; i < WIN_AMOUNTS.length; i++) {
      cumulative += WIN_AMOUNTS[i].weight;
      if (rand <= cumulative) {
        var bucket = WIN_AMOUNTS[i];
        var amount = bucket.min + Math.random() * (bucket.max - bucket.min);
        return Math.round(amount * 100) / 100;
      }
    }

    return WIN_AMOUNTS[WIN_AMOUNTS.length - 1].min;
  }

  /**
   * Display the next win in the queue
   */
  function displayNextWin() {
    if (recentWins.length === 0) return;
    var win = recentWins.shift();
    displayWin(win);
  }

  /**
   * Display a single win in the ticker
   */
  function displayWin(win) {
    var winEl = document.createElement('div');
    var isLargeWin = win.amount >= 500;
    var isMediumWin = win.amount >= 100;

    var glowColor = isLargeWin ? 'rgba(255,215,0,0.6)' : (isMediumWin ? 'rgba(0,255,0,0.4)' : 'none');
    var textColor = isLargeWin ? '#ffd700' : (isMediumWin ? '#00ff00' : '#ddd');

    winEl.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:0 16px;white-space:nowrap;color:' + textColor + ';animation:liveWinsSlideIn 0.6s ease-out forwards;' + (isLargeWin ? 'text-shadow:0 0 20px ' + glowColor + ';' : '') + 'position:relative;';

    var amountStr = '$' + win.amount.toFixed(2);
    winEl.textContent = '🎰 ' + win.username + ' won ' + amountStr + ' on ' + win.game + '!';

    WINS_CONTAINER.appendChild(winEl);

    // Schedule removal
    setTimeout(function() {
      winEl.style.animation = 'liveWinsSlideOut 0.6s ease-in forwards';
      setTimeout(function() {
        if (winEl.parentNode) {
          winEl.parentNode.removeChild(winEl);
        }
      }, 600);
    }, 5000);

    // Flash ticker bar for big wins
    if (isLargeWin) {
      flashTickerBar();
    }
  }

  /**
   * Flash the ticker bar gold for big wins
   */
  function flashTickerBar() {
    var originalBg = TICKER_BAR.style.background;
    TICKER_BAR.style.background = 'rgba(255,215,0,0.15)';
    setTimeout(function() {
      TICKER_BAR.style.background = originalBg;
    }, 600);
  }

  /**
   * Update player count with slight fluctuation
   */
  function updatePlayerCount() {
    var fluctuation = Math.floor((Math.random() - 0.5) * 10); // ±5
    playerCount = Math.max(100, Math.min(500, playerCount + fluctuation));
    if (PLAYER_COUNT_EL) {
      PLAYER_COUNT_EL.textContent = '👥 ' + playerCount + ' players online';
    }
  }

  /**
   * Toggle minimize state
   */
  function toggleMinimize() {
    isMinimized = !isMinimized;
    sessionStorage.setItem('liveWinsTickerMinimized', isMinimized ? '1' : '0');

    if (isMinimized) {
      TICKER_BAR.style.transform = 'translateY(36px)';
      MINIMIZE_BTN.textContent = '▲';
    } else {
      TICKER_BAR.style.transform = 'translateY(0)';
      MINIMIZE_BTN.textContent = '▼';
    }
  }

  /**
   * Load minimized state from sessionStorage
   */
  function loadMinimizedState() {
    var saved = sessionStorage.getItem('liveWinsTickerMinimized');
    if (saved === '1') {
      isMinimized = true;
      setTimeout(function() {
        if (TICKER_BAR) {
          TICKER_BAR.style.transform = 'translateY(36px)';
        }
        if (MINIMIZE_BTN) {
          MINIMIZE_BTN.textContent = '▲';
        }
      }, 0);
    }
  }

  /**
   * Inject CSS animations
   */
  function injectStyles() {
    if (document.getElementById('liveWinsTickerStyles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'liveWinsTickerStyles';
    style.textContent = '' +
      '@keyframes liveWinsPulse {' +
      '  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(230,57,70,0.6); }' +
      '  50% { opacity: 0.6; box-shadow: 0 0 16px rgba(230,57,70,0.8); }' +
      '}' +
      '@keyframes liveWinsSlideIn {' +
      '  from { opacity: 0; transform: translateX(100%); }' +
      '  to { opacity: 1; transform: translateX(0); }' +
      '}' +
      '@keyframes liveWinsSlideOut {' +
      '  from { opacity: 1; transform: translateX(0); }' +
      '  to { opacity: 0; transform: translateX(-100%); }' +
      '}';
    document.head.appendChild(style);
  }

  window.LiveWinsTicker = { init: init };
})();
