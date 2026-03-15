window.NearMissAmplifier = (function() {
  var config = {
    isQaMode: window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1,
    maxBannerFrequency: 5,
    maxWarmingUpFrequency: 15,
    minNearMissesForWarming: 3,
    premiumSymbols: ['7', 'diamond', 'crown', 'star'],
    storageKey: 'nma_session_stats',
    darkColor: '#1a1a2e',
    goldColor: '#ffd700',
    accentColor: '#d4af37'
  };

  var state = {
    nearMissCount: 0,
    totalSpinsCount: 0,
    lastBannerSpin: -999,
    lastWarmingUpSpin: -999,
    bannerCooldown: false,
    warmingUpCooldown: false,
    recentNearMisses: []
  };

  var init = function() {
    if (config.isQaMode) {
      console.warn('[NearMissAmplifier] QA Mode detected - amplification suppressed');
      return;
    }

    loadSessionStats();
    setupStyles();
    setupDOM();
    console.warn('[NearMissAmplifier] Initialized successfully');
  };

  var loadSessionStats = function() {
    var stored = localStorage.getItem(config.storageKey);
    if (stored) {
      try {
        var stats = JSON.parse(stored);
        state.nearMissCount = stats.nearMissCount || 0;
        state.recentNearMisses = stats.recentNearMisses || [];
      } catch (e) {
        console.warn('[NearMissAmplifier] Failed to load stats:', e);
      }
    }
  };

  var saveSessionStats = function() {
    var stats = {
      nearMissCount: state.nearMissCount,
      recentNearMisses: state.recentNearMisses.slice(-20),
      timestamp: new Date().getTime()
    };
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(stats));
    } catch (e) {
      console.warn('[NearMissAmplifier] Failed to save stats:', e);
    }
  };

  var setupStyles = function() {
    var style = document.createElement('style');
    style.textContent = '\
      .nma-banner {\
        position: fixed;\
        top: 20px;\
        left: 50%;\
        transform: translateX(-50%);\
        background: linear-gradient(135deg, ' + config.darkColor + ', #2d2d44);\
        border: 2px solid ' + config.goldColor + ';\
        border-radius: 8px;\
        padding: 16px 32px;\
        color: ' + config.goldColor + ';\
        font-size: 18px;\
        font-weight: bold;\
        z-index: 10000;\
        text-align: center;\
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.1);\
        animation: nmaPulse 0.6s ease-in-out infinite;\
      }\
      @keyframes nmaPulse {\
        0%, 100% { opacity: 0.8; box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.1); }\
        50% { opacity: 1; box-shadow: 0 0 30px rgba(255, 215, 0, 0.7), inset 0 0 15px rgba(255, 215, 0, 0.2); }\
      }\
      .nma-counter-badge {\
        position: relative;\
        background: ' + config.accentColor + ';\
        color: ' + config.darkColor + ';\
        padding: 8px 16px;\
        border-radius: 20px;\
        font-size: 14px;\
        font-weight: bold;\
        display: inline-block;\
        margin-top: 12px;\
        box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);\
      }\
      .nma-spin-glow {\
        animation: nmaSpinGlow 0.8s ease-in-out;\
      }\
      @keyframes nmaSpinGlow {\
        0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }\
        50% { box-shadow: 0 0 20px 10px rgba(255, 215, 0, 0.4); }\
        100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }\
      }\
      .nma-nudge-text {\
        position: absolute;\
        font-size: 12px;\
        color: ' + config.goldColor + ';\
        font-weight: bold;\
        animation: nmaNudgeFloat 2s ease-in-out;\
        pointer-events: none;\
      }\
      @keyframes nmaNudgeFloat {\
        0% { opacity: 1; transform: translateY(0); }\
        100% { opacity: 0; transform: translateY(-30px); }\
      }\
    ';
    document.head.appendChild(style);
  };

  var setupDOM = function() {
    var container = document.getElementById('nma-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nma-container';
      document.body.appendChild(container);
    }
  };

  var detectNearMiss = function(reels, won, amount) {
    var isNearMiss = false;
    var matchInfo = {
      type: '',
      symbols: []
    };

    if (!reels || reels.length < 3) {
      return { isNearMiss: false, matchInfo: matchInfo };
    }

    if (won && amount > 0) {
      return { isNearMiss: false, matchInfo: matchInfo };
    }

    for (var i = 0; i < reels.length; i++) {
      var reel = reels[i];
      if (!reel || typeof reel !== 'object') continue;

      var symbols = Array.isArray(reel) ? reel : [reel];

      for (var j = 0; j < symbols.length - 1; j++) {
        var sym1 = String(symbols[j]).toLowerCase();
        var sym2 = String(symbols[j + 1]).toLowerCase();

        if (sym1 === sym2 && sym1 !== 'blank' && sym1 !== '') {
          isNearMiss = true;
          matchInfo.type = isPremiumSymbol(sym1) ? 'premium-pair' : 'regular-pair';
          matchInfo.symbols = [sym1, sym2];
          break;
        }
      }

      if (isNearMiss) break;
    }

    if (!isNearMiss) {
      var premiumCount = 0;
      var premiumSymbols = [];

      for (var k = 0; k < reels.length; k++) {
        var reelSymbols = Array.isArray(reels[k]) ? reels[k] : [reels[k]];
        for (var l = 0; l < reelSymbols.length; l++) {
          var sym = String(reelSymbols[l]).toLowerCase();
          if (isPremiumSymbol(sym)) {
            premiumCount++;
            premiumSymbols.push(sym);
          }
        }
      }

      if (premiumCount >= 2) {
        isNearMiss = true;
        matchInfo.type = 'almost-jackpot';
        matchInfo.symbols = premiumSymbols.slice(0, 2);
      }
    }

    if (!isNearMiss) {
      var scatterCount = 0;
      for (var m = 0; m < reels.length; m++) {
        var reelSym = Array.isArray(reels[m]) ? reels[m][0] : reels[m];
        var symStr = String(reelSym).toLowerCase();
        if (symStr === 'scatter' || symStr === 'bonus') {
          scatterCount++;
        }
      }

      if (scatterCount >= 2) {
        isNearMiss = true;
        matchInfo.type = 'bonus-scatter-near';
        matchInfo.symbols = ['scatter', 'scatter'];
      }
    }

    return { isNearMiss: isNearMiss, matchInfo: matchInfo };
  };

  var isPremiumSymbol = function(symbol) {
    var sym = String(symbol).toLowerCase();
    for (var i = 0; i < config.premiumSymbols.length; i++) {
      if (sym.indexOf(config.premiumSymbols[i]) !== -1) {
        return true;
      }
    }
    return false;
  };

  var showBanner = function(matchInfo) {
    var container = document.getElementById('nma-container');
    if (!container) return;

    var banner = document.createElement('div');
    banner.className = 'nma-banner';

    var messageMap = {
      'premium-pair': 'SO CLOSE! 🔥 Two premium symbols aligned... almost!',
      'almost-jackpot': 'SO CLOSE! 🔥 Just one away from the jackpot!',
      'regular-pair': 'SO CLOSE! 🔥 So tantalizingly close...',
      'bonus-scatter-near': 'SO CLOSE! 🔥 Nearly triggered the bonus!'
    };

    banner.textContent = messageMap[matchInfo.type] || 'SO CLOSE! 🔥 Just one more...';
    container.appendChild(banner);

    setTimeout(function() {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 2000);
  };

  var updateCounter = function() {
    var existingBadge = document.getElementById('nma-counter-badge');
    if (existingBadge) {
      existingBadge.parentNode.removeChild(existingBadge);
    }

    var badge = document.createElement('div');
    badge.id = 'nma-counter-badge';
    badge.className = 'nma-counter-badge';
    badge.textContent = 'Near Wins Today: ' + state.nearMissCount;

    var reelsArea = document.querySelector('[data-slot-reels], .slot-reels, .reels-container, [class*="reel"]');
    if (reelsArea) {
      reelsArea.parentNode.insertBefore(badge, reelsArea.nextSibling);
    } else {
      document.body.appendChild(badge);
    }
  };

  var applySpinButtonGlow = function() {
    var spinButton = document.querySelector('[data-action="spin"], .spin-button, button[class*="spin"], button[class*="Spin"]');
    if (!spinButton) return;

    spinButton.classList.add('nma-spin-glow');

    var nudge = document.createElement('div');
    nudge.className = 'nma-nudge-text';
    nudge.textContent = 'Spin again!';
    nudge.style.left = spinButton.offsetLeft + (spinButton.offsetWidth / 2) - 25 + 'px';
    nudge.style.top = spinButton.offsetTop - 40 + 'px';

    document.body.appendChild(nudge);

    setTimeout(function() {
      spinButton.classList.remove('nma-spin-glow');
      if (nudge.parentNode) {
        nudge.parentNode.removeChild(nudge);
      }
    }, 3000);
  };

  var showWarmingUpMessage = function() {
    var container = document.getElementById('nma-container');
    if (!container) return;

    var banner = document.createElement('div');
    banner.className = 'nma-banner';
    banner.textContent = 'The machine is warming up! 🌡️ A big win is coming...';
    banner.style.borderColor = config.accentColor;
    banner.style.color = config.accentColor;

    container.appendChild(banner);

    setTimeout(function() {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 2500);
  };

  var onSpinResult = function(reels, won, amount, bet) {
    if (config.isQaMode) return;

    state.totalSpinsCount++;

    var detection = detectNearMiss(reels, won, amount);

    if (detection.isNearMiss) {
      state.nearMissCount++;
      state.recentNearMisses.push({
        spin: state.totalSpinsCount,
        type: detection.matchInfo.type,
        symbols: detection.matchInfo.symbols,
        timestamp: new Date().getTime()
      });

      saveSessionStats();

      applySpinButtonGlow();
      updateCounter();

      if (state.totalSpinsCount - state.lastBannerSpin >= config.maxBannerFrequency) {
        showBanner(detection.matchInfo);
        state.lastBannerSpin = state.totalSpinsCount;
      }

      if (state.nearMissCount >= config.minNearMissesForWarming &&
          state.totalSpinsCount - state.lastWarmingUpSpin >= config.maxWarmingUpFrequency) {
        showWarmingUpMessage();
        state.lastWarmingUpSpin = state.totalSpinsCount;
      }

      console.warn('[NearMissAmplifier] Near-miss detected:', detection.matchInfo.type);
    }
  };

  var getStats = function() {
    return {
      nearMissCount: state.nearMissCount,
      totalSpins: state.totalSpinsCount,
      recentNearMisses: state.recentNearMisses
    };
  };

  var resetSessionStats = function() {
    state.nearMissCount = 0;
    state.totalSpinsCount = 0;
    state.lastBannerSpin = -999;
    state.lastWarmingUpSpin = -999;
    state.recentNearMisses = [];
    saveSessionStats();
    console.warn('[NearMissAmplifier] Session stats reset');
  };

  return {
    init: init,
    onSpinResult: onSpinResult,
    getStats: getStats,
    resetSessionStats: resetSessionStats
  };
})();

if (typeof window.SmartRecommend !== 'undefined' && window.SmartRecommend.registerModule) {
  window.SmartRecommend.registerModule('NearMissAmplifier', window.NearMissAmplifier);
}
