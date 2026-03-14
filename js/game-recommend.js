(function() {
  'use strict';

  // API helper
  function api(path, opts) {
    opts = opts || {};
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    var token = localStorage.getItem(tokenKey);
    if (!token) return Promise.resolve(null);
    var res = fetch(path, Object.assign({}, opts, {
      headers: Object.assign({ 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {},
        opts.headers || {})
    }));
    return res.then(function(r) { return r.json(); });
  }

  // State
  var recommendationData = null;
  var cacheTime = 0;
  var currentTab = 'forYou';
  var lastSuggestionTime = 0;
  var spinCountOnGame = 0;
  var currentGameId = null;
  var stripEl = null;
  var floatingEl = null;

  // Cache duration: 5 minutes
  var CACHE_DURATION = 5 * 60 * 1000;
  var SUGGESTION_COOLDOWN = 5 * 60 * 1000;
  var SUGGESTION_TRIGGER_SPINS = 3;

  // ─── Create Recommendation Strip ───
  function createStrip() {
    if (stripEl) return stripEl;

    stripEl = document.createElement('div');
    stripEl.id = 'gameRecommendationStrip';
    stripEl.style.cssText = 'width:100%;background:linear-gradient(135deg,rgba(20,20,30,0.95),rgba(30,15,40,0.95));border-top:1px solid rgba(255,215,0,0.2);border-bottom:1px solid rgba(255,215,0,0.1);padding:16px 0;margin-top:24px;';

    // Tabs container
    var tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = 'display:flex;gap:12px;padding:0 16px;margin-bottom:14px;overflow-x:auto;border-bottom:1px solid rgba(255,215,0,0.15);padding-bottom:10px;';

    var tabs = [
      { id: 'forYou', label: 'For You', icon: '★' },
      { id: 'trendingNow', label: 'Trending', icon: '🔥' },
      { id: 'tryNew', label: 'New Games', icon: '✨' },
      { id: 'topPicks', label: 'Top Picks', icon: '👑' }
    ];

    tabs.forEach(function(tab) {
      var btn = document.createElement('button');
      btn.style.cssText = 'border:none;background:none;color:#aaa;cursor:pointer;font-weight:600;font-size:13px;padding:4px 12px;white-space:nowrap;border-radius:4px;transition:all 0.3s;';
      btn.innerHTML = tab.icon + ' ' + tab.label;
      btn.className = 'rec-tab';
      btn.dataset.tab = tab.id;

      btn.addEventListener('click', function() {
        currentTab = tab.id;
        document.querySelectorAll('.rec-tab').forEach(function(t) {
          t.style.color = '#aaa';
          t.style.background = 'transparent';
        });
        btn.style.color = '#ffd700';
        btn.style.background = 'rgba(255,215,0,0.1)';
        renderGameCards();
      });

      tabsContainer.appendChild(btn);
    });

    // Set initial tab active
    setTimeout(function() {
      var firstTab = tabsContainer.querySelector('[data-tab="forYou"]');
      if (firstTab) {
        firstTab.style.color = '#ffd700';
        firstTab.style.background = 'rgba(255,215,0,0.1)';
      }
    }, 0);

    stripEl.appendChild(tabsContainer);

    // Games scroll container
    var scrollContainer = document.createElement('div');
    scrollContainer.id = 'gameCardsScroll';
    scrollContainer.style.cssText = 'display:flex;gap:12px;overflow-x:auto;padding:0 16px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;';
    stripEl.appendChild(scrollContainer);

    // Add some CSS for smooth scrolling
    if (!document.getElementById('gameRecommendStyle')) {
      var style = document.createElement('style');
      style.id = 'gameRecommendStyle';
      style.textContent = `
        #gameRecommendationStrip {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,215,0,0.3) transparent;
        }
        #gameCardsScroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,215,0,0.3) transparent;
        }
        #gameCardsScroll::-webkit-scrollbar {
          height: 6px;
        }
        #gameCardsScroll::-webkit-scrollbar-track {
          background: transparent;
        }
        #gameCardsScroll::-webkit-scrollbar-thumb {
          background: rgba(255,215,0,0.3);
          border-radius: 3px;
        }
        .rec-game-card {
          flex-shrink: 0;
          width: 140px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(50,30,60,0.8), rgba(30,20,40,0.8));
          border: 1px solid rgba(255,215,0,0.2);
          border-radius: 8px;
          transition: all 0.3s;
          cursor: pointer;
        }
        .rec-game-card:hover {
          border-color: rgba(255,215,0,0.5);
          background: linear-gradient(135deg, rgba(60,40,70,0.9), rgba(40,30,50,0.9));
          box-shadow: 0 0 12px rgba(255,215,0,0.2);
          transform: translateY(-2px);
        }
        .rec-game-name {
          font-weight: 600;
          color: #ffd700;
          font-size: 13px;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rec-game-stat {
          font-size: 11px;
          color: #999;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rec-game-reason {
          font-size: 10px;
          color: #ff8c00;
          margin-top: 6px;
          line-height: 1.3;
        }
        .rec-play-btn {
          width: 100%;
          margin-top: 8px;
          padding: 6px 8px;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          border: none;
          border-radius: 4px;
          color: #000;
          font-weight: 600;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rec-play-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(255,215,0,0.4);
        }
        .floating-suggestion {
          position: fixed;
          right: 20px;
          bottom: 80px;
          width: 280px;
          background: linear-gradient(135deg, rgba(50,30,60,0.95), rgba(30,20,40,0.95));
          border: 1px solid rgba(255,215,0,0.3);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          z-index: 9970;
          animation: slideInRight 0.4s ease-out;
          backdrop-filter: blur(8px);
        }
        @keyframes slideInRight {
          from {
            transform: translateX(320px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .floating-suggestion-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: #666;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .floating-suggestion-close:hover {
          color: #999;
        }
        .floating-suggestion-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .floating-suggestion-title {
          color: #ffd700;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .floating-suggestion-text {
          color: #ccc;
          font-size: 12px;
          line-height: 1.4;
          margin-bottom: 10px;
        }
        .floating-suggestion-btn {
          width: 100%;
          padding: 8px;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          border: none;
          border-radius: 6px;
          color: #000;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .floating-suggestion-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(255,215,0,0.3);
        }
      `;
      document.head.appendChild(style);
    }

    return stripEl;
  }

  // ─── Render Game Cards ───
  function renderGameCards() {
    var scrollContainer = document.getElementById('gameCardsScroll');
    if (!scrollContainer || !recommendationData) return;

    scrollContainer.innerHTML = '';

    var games = recommendationData[currentTab] || [];
    if (!Array.isArray(games) || games.length === 0) {
      scrollContainer.innerHTML = '<div style="color:#666;padding:16px;">No recommendations available</div>';
      return;
    }

    games.forEach(function(game) {
      var card = document.createElement('div');
      card.className = 'rec-game-card';
      card.innerHTML = '<div class="rec-game-name">' + (game.name || game.game_id) + '</div>' +
        '<div class="rec-game-stat">' + (game.play_count ? 'Played ' + game.play_count + 'x' : 'New') + '</div>' +
        (game.avg_win ? '<div class="rec-game-stat">Avg: $' + game.avg_win.toFixed(2) + '</div>' : '') +
        '<div class="rec-game-reason">' + (game.reason || '') + '</div>' +
        '<button class="rec-play-btn">PLAY NOW</button>';

      card.querySelector('.rec-play-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        playGame(game.game_id);
      });

      scrollContainer.appendChild(card);
    });

    // Auto-scroll animation (gentle pulse if idle for 5 seconds)
    clearTimeout(window.gameRecommendAutoScrollTimer);
    window.gameRecommendAutoScrollTimer = setTimeout(function() {
      if (scrollContainer && scrollContainer.scrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth) {
        var targetScroll = Math.min(scrollContainer.scrollLeft + 160, scrollContainer.scrollWidth - scrollContainer.clientWidth);
        var start = scrollContainer.scrollLeft;
        var distance = targetScroll - start;
        var duration = 800;
        var startTime = Date.now();

        function animateScroll() {
          var elapsed = Date.now() - startTime;
          var progress = Math.min(elapsed / duration, 1);
          scrollContainer.scrollLeft = start + distance * progress;
          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        }
        animateScroll();
      }
    }, 5000);
  }

  // ─── Play Game ───
  function playGame(gameId) {
    if (typeof window.openGame === 'function') {
      window.openGame(gameId);
    } else if (document.querySelector('[data-game="' + gameId + '"]')) {
      document.querySelector('[data-game="' + gameId + '"]').click();
    } else {
      // Dispatch custom event
      var evt = new CustomEvent('gameRecommend:play', { detail: { gameId: gameId } });
      document.dispatchEvent(evt);
    }
  }

  // ─── Show Floating Suggestion ───
  function showFloatingSuggestion(gameId) {
    if (floatingEl && floatingEl.parentNode) {
      floatingEl.parentNode.removeChild(floatingEl);
      floatingEl = null;
    }

    floatingEl = document.createElement('div');
    floatingEl.className = 'floating-suggestion';
    floatingEl.innerHTML = '<button class="floating-suggestion-close">&times;</button>' +
      '<div class="floating-suggestion-icon">🎰</div>' +
      '<div class="floating-suggestion-title">Try ' + gameId + '?</div>' +
      '<div class="floating-suggestion-text">Players like you love this game!</div>' +
      '<button class="floating-suggestion-btn">Try it!</button>';

    var closeBtn = floatingEl.querySelector('.floating-suggestion-close');
    var tryBtn = floatingEl.querySelector('.floating-suggestion-btn');

    closeBtn.addEventListener('click', function() {
      if (floatingEl.parentNode) {
        floatingEl.parentNode.removeChild(floatingEl);
      }
      floatingEl = null;
      lastSuggestionTime = Date.now();
    });

    tryBtn.addEventListener('click', function() {
      playGame(gameId);
      if (floatingEl.parentNode) {
        floatingEl.parentNode.removeChild(floatingEl);
      }
      floatingEl = null;
      lastSuggestionTime = Date.now();
    });

    document.body.appendChild(floatingEl);
    lastSuggestionTime = Date.now();
  }

  // ─── Track Spins ───
  function onSpinComplete() {
    spinCountOnGame++;
    if (spinCountOnGame >= SUGGESTION_TRIGGER_SPINS && Date.now() - lastSuggestionTime > SUGGESTION_COOLDOWN) {
      if (recommendationData && recommendationData.tryNew && recommendationData.tryNew.length > 0) {
        var randomGame = recommendationData.tryNew[Math.floor(Math.random() * recommendationData.tryNew.length)];
        showFloatingSuggestion(randomGame.game_id || randomGame.name);
      }
      spinCountOnGame = 0;
    }
  }

  // ─── Fetch Recommendations ───
  async function fetchRecommendations() {
    try {
      var now = Date.now();
      if (recommendationData && (now - cacheTime) < CACHE_DURATION) {
        return recommendationData;
      }

      var data = await api('/api/recommend');
      if (!data || data.error) {
        console.warn('[GameRecommend] API error:', data ? data.error : 'No response');
        return null;
      }

      recommendationData = {
        forYou: data.forYou || [],
        trendingNow: data.trendingNow || [],
        tryNew: data.tryNew || [],
        topPicks: data.topPicks || []
      };
      cacheTime = now;

      return recommendationData;
    } catch (e) {
      console.warn('[GameRecommend] Fetch error:', e.message || e);
      return null;
    }
  }

  // ─── Find Game Grid and Insert Strip ───
  function insertStripIntoPage() {
    var gridEl = document.getElementById('gameGrid') ||
                 document.getElementById('game-grid') ||
                 document.querySelector('.game-list') ||
                 document.querySelector('[data-component="game-grid"]');

    var strip = createStrip();

    if (gridEl && gridEl.parentNode) {
      gridEl.parentNode.insertBefore(strip, gridEl.nextSibling);
    } else {
      var mainContent = document.querySelector('main') ||
                        document.querySelector('[role="main"]') ||
                        document.body;
      mainContent.appendChild(strip);
    }
  }

  // ─── Initialize ───
  async function init() {
    try {
      // Fetch recommendations
      var recs = await fetchRecommendations();
      if (!recs) {
        console.warn('[GameRecommend] No recommendations data');
        return;
      }

      // Create and insert strip into page
      insertStripIntoPage();

      // Render initial cards
      renderGameCards();

      // Listen for spin complete events
      document.addEventListener('spin:complete', onSpinComplete);
      window.addEventListener('spin:complete', onSpinComplete);

      // Refresh recommendations every 30 minutes
      setInterval(function() {
        cacheTime = 0; // Invalidate cache
        fetchRecommendations().then(function() {
          renderGameCards();
        });
      }, 30 * 60 * 1000);

    } catch (e) {
      console.warn('[GameRecommend] Init error:', e.message || e);
    }
  }

  // Expose public API
  window.GameRecommend = { init: init, refresh: fetchRecommendations };

})();
