(function() {
  'use strict';

  var SmartRecommend = {
    config: {
      maxRecommendations: 6,
      consecutiveLossThreshold: 3,
      discoveryProbability: 0.25,
      hotGameWindow: 3600000, // 1 hour in ms
      qaMode: false,
      suppressPopups: false
    },

    state: {
      consecutiveLosses: 0,
      lastGameResult: null,
      sessionGames: [],
      playerStats: null,
      globalHotGames: {}
    },

    init: function() {
      this.config.qaMode = window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1;
      this.config.suppressPopups = this.config.qaMode;

      this.loadPlayerStats();
      this.initializeHotGames();
      this.injectLobbyRecommendationRow();

      console.warn('[SmartRecommend] Module initialized. QA Mode: ' + this.config.qaMode);
    },

    loadPlayerStats: function() {
      var statsStr = localStorage.getItem('casinoStats');
      this.state.playerStats = statsStr ? JSON.parse(statsStr) : {
        gameStats: {},
        totalSpins: 0,
        totalWagered: 0,
        totalWon: 0
      };

      if (!this.state.playerStats.gameStats) {
        this.state.playerStats.gameStats = {};
      }
    },

    initializeHotGames: function() {
      var hotGamesStr = localStorage.getItem('hotGames');
      this.state.globalHotGames = hotGamesStr ? JSON.parse(hotGamesStr) : {};

      var now = Date.now();
      for (var gameId in this.state.globalHotGames) {
        if (now - this.state.globalHotGames[gameId].timestamp > this.config.hotGameWindow) {
          delete this.state.globalHotGames[gameId];
        }
      }
    },

    getGameList: function() {
      var games = [];

      if (window.GAMES && Array.isArray(window.GAMES)) {
        games = window.GAMES;
      } else if (window.games && Array.isArray(window.games)) {
        games = window.games;
      } else {
        var gameElements = document.querySelectorAll('.game-card');
        games = Array.prototype.map.call(gameElements, function(el) {
          return {
            id: el.getAttribute('data-game-id') || el.textContent.trim(),
            name: el.getAttribute('data-game-name') || el.textContent.trim(),
            volatility: el.getAttribute('data-volatility') || 'medium'
          };
        });
      }

      return games;
    },

    getRecommendations: function(count) {
      count = count || this.config.maxRecommendations;
      var recommendations = [];
      var gameList = this.getGameList();
      var stats = this.state.playerStats.gameStats;
      var self = this;

      var scoredGames = gameList.map(function(game) {
        var gameId = game.id;
        var gameStats = stats[gameId] || {
          spins: 0,
          wins: 0,
          totalBet: 0,
          totalWon: 0,
          lastPlayed: 0,
          volatility: game.volatility || 'medium'
        };

        var score = 0;
        var metadata = {
          gameId: gameId,
          gameName: game.name,
          volatility: gameStats.volatility || 'medium',
          badges: []
        };

        // Recency-weighted favorites
        if (gameStats.spins > 0) {
          var recencyWeight = Math.exp(-((Date.now() - gameStats.lastPlayed) / 86400000));
          score += gameStats.spins * 2 * recencyWeight;
          metadata.played = true;
        }

        // Win-rate affinity
        if (gameStats.spins > 5) {
          var winRate = gameStats.wins / gameStats.spins;
          score += winRate * 30;
          metadata.winRate = Math.round(winRate * 100);
          if (winRate > 0.5) {
            metadata.badges.push('HIGH WIN RATE');
          }
        }

        // Similar volatility matching
        if (self.state.playerStats.gameStats && Object.keys(self.state.playerStats.gameStats).length > 0) {
          var playerVolatilityPref = self.getPlayerVolatilityPreference();
          if (playerVolatilityPref && playerVolatilityPref === gameStats.volatility) {
            score += 15;
          }
        }

        // Hot games boost
        if (self.state.globalHotGames[gameId]) {
          score += 10;
          metadata.badges.push('HOT');
        }

        // Never played discovery bonus
        if (gameStats.spins === 0) {
          metadata.badges.push('NEW FOR YOU');
          score += 5;
          metadata.isNew = true;
        } else {
          metadata.isNew = false;
        }

        return {
          game: game,
          score: score,
          metadata: metadata
        };
      });

      // Sort by score descending
      scoredGames.sort(function(a, b) {
        return b.score - a.score;
      });

      // Apply discovery probability
      var numDiscovery = Math.floor(count * this.config.discoveryProbability);
      var discoveryGames = scoredGames.filter(function(sg) { return sg.metadata.isNew; });
      var regularGames = scoredGames.filter(function(sg) { return !sg.metadata.isNew; });

      regularGames = regularGames.slice(0, count - numDiscovery);
      discoveryGames = discoveryGames.slice(0, numDiscovery);

      var finalGames = regularGames.concat(discoveryGames);

      recommendations = finalGames.slice(0, count).map(function(sg) {
        return sg.metadata;
      });

      return recommendations;
    },

    getPlayerVolatilityPreference: function() {
      var stats = this.state.playerStats.gameStats;
      var volatilityCounts = { low: 0, medium: 0, high: 0 };
      var volatilityScores = { low: 0, medium: 0, high: 0 };

      for (var gameId in stats) {
        var gameStats = stats[gameId];
        var vol = gameStats.volatility || 'medium';
        volatilityCounts[vol] = (volatilityCounts[vol] || 0) + gameStats.spins;
        volatilityScores[vol] = (volatilityScores[vol] || 0) + (gameStats.wins / Math.max(gameStats.spins, 1));
      }

      var totalSpins = volatilityCounts.low + volatilityCounts.medium + volatilityCounts.high;
      if (totalSpins === 0) return null;

      var preference = 'medium';
      var maxScore = volatilityScores.medium;

      if (volatilityScores.high > maxScore) {
        preference = 'high';
        maxScore = volatilityScores.high;
      }
      if (volatilityScores.low > maxScore) {
        preference = 'low';
      }

      return preference;
    },

    onGameEnd: function(gameId, result) {
      this.updateStats(gameId, result);
      this.state.lastGameResult = result;

      if (result && result.won) {
        this.state.consecutiveLosses = 0;
      } else {
        this.state.consecutiveLosses += 1;
      }

      if (!this.config.suppressPopups) {
        if (this.state.consecutiveLosses >= this.config.consecutiveLossThreshold) {
          this.showPostLossSuggestion();
        } else {
          this.showPostGameRecommendationCard(gameId);
        }
      }

      console.warn('[SmartRecommend] Game ended. Consecutive losses: ' + this.state.consecutiveLosses);
    },

    updateStats: function(gameId, result) {
      var stats = this.state.playerStats.gameStats;
      if (!stats[gameId]) {
        stats[gameId] = {
          spins: 0,
          wins: 0,
          totalBet: 0,
          totalWon: 0,
          lastPlayed: 0,
          volatility: 'medium'
        };
      }

      var gameStats = stats[gameId];
      gameStats.spins += 1;
      gameStats.lastPlayed = Date.now();

      if (result && result.won) {
        gameStats.wins += 1;
      }

      if (result && result.bet) {
        gameStats.totalBet += result.bet;
      }

      if (result && result.payout) {
        gameStats.totalWon += result.payout;
      }

      localStorage.setItem('casinoStats', JSON.stringify(this.state.playerStats));
    },

    showPostGameRecommendationCard: function(currentGameId) {
      var recommendations = this.getRecommendations(3);
      var self = this;

      // Remove existing card if present
      var existingCard = document.getElementById('smart-recommend-card');
      if (existingCard) {
        existingCard.remove();
      }

      var cardContainer = document.createElement('div');
      cardContainer.id = 'smart-recommend-card';
      cardContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%); border: 2px solid #ffd700; border-radius: 12px; padding: 20px; max-width: 400px; box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2); z-index: 10000; font-family: Arial, sans-serif; color: #ffffff;';

      var title = document.createElement('h3');
      title.textContent = 'Recommended for You';
      title.style.cssText = 'margin: 0 0 15px 0; color: #ffd700; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;';
      cardContainer.appendChild(title);

      var gamesContainer = document.createElement('div');
      gamesContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;';

      recommendations.forEach(function(rec) {
        var gameCard = self.createGameCardElement(rec);
        gamesContainer.appendChild(gameCard);
      });

      cardContainer.appendChild(gamesContainer);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ffd700; font-size: 20px; cursor: pointer;';
      closeBtn.onclick = function() {
        cardContainer.remove();
      };
      cardContainer.appendChild(closeBtn);

      document.body.appendChild(cardContainer);
    },

    createGameCardElement: function(recommendation) {
      var card = document.createElement('div');
      card.style.cssText = 'background: #16213e; border: 1px solid #ffd700; border-radius: 8px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.3s ease;';
      card.onmouseover = function() {
        card.style.background = '#0f3460';
        card.style.borderColor = '#00ff41';
      };
      card.onmouseout = function() {
        card.style.background = '#16213e';
        card.style.borderColor = '#ffd700';
      };

      var thumbnail = document.createElement('div');
      thumbnail.style.cssText = 'width: 100%; height: 80px; background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 100%); border-radius: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #0a0a1a; font-size: 14px; overflow: hidden;';
      thumbnail.textContent = recommendation.gameName || recommendation.gameId;
      card.appendChild(thumbnail);

      var gameName = document.createElement('div');
      gameName.textContent = recommendation.gameName || recommendation.gameId;
      gameName.style.cssText = 'font-size: 12px; color: #ffd700; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;';
      card.appendChild(gameName);

      if (recommendation.winRate) {
        var winRateBadge = document.createElement('div');
        winRateBadge.textContent = recommendation.winRate + '% WIN RATE';
        winRateBadge.style.cssText = 'font-size: 10px; color: #00ff41; background: rgba(0, 255, 65, 0.2); padding: 2px 4px; border-radius: 3px; margin-bottom: 6px;';
        card.appendChild(winRateBadge);
      }

      var badges = document.createElement('div');
      badges.style.cssText = 'font-size: 10px; margin-bottom: 8px;';
      recommendation.badges.forEach(function(badge) {
        var badgeEl = document.createElement('span');
        badgeEl.textContent = badge;
        badgeEl.style.cssText = 'display: inline-block; background: #ffd700; color: #0a0a1a; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-weight: bold;';
        badges.appendChild(badgeEl);
      });
      card.appendChild(badges);

      var tryBtn = document.createElement('button');
      tryBtn.textContent = 'TRY NOW';
      tryBtn.style.cssText = 'width: 100%; background: #ffd700; color: #0a0a1a; border: none; border-radius: 4px; padding: 6px; font-weight: bold; cursor: pointer; font-size: 11px; text-transform: uppercase;';
      tryBtn.onclick = function(e) {
        e.stopPropagation();
        console.warn('[SmartRecommend] Player clicked: ' + recommendation.gameId);
        if (window.SlotMachine && typeof window.SlotMachine.loadGame === 'function') {
          window.SlotMachine.loadGame(recommendation.gameId);
        }
      };
      card.appendChild(tryBtn);

      return card;
    },

    showPostLossSuggestion: function() {
      var recommendations = this.getRecommendations(1);
      if (recommendations.length === 0) return;

      var rec = recommendations[0];
      var suggestionDiv = document.createElement('div');
      suggestionDiv.id = 'smart-recommend-loss-suggestion';
      suggestionDiv.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: linear-gradient(135deg, #2d1b3d 0%, #1a0a1a 100%); border: 2px solid #ff6b6b; border-radius: 10px; padding: 20px; max-width: 350px; box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3); z-index: 10000; font-family: Arial, sans-serif; color: #ffffff;';

      var suggestionText = document.createElement('p');
      suggestionText.textContent = 'Try a change of luck! Players like you who switched to ' + (rec.gameName || rec.gameId) + ' won 47% more!';
      suggestionText.style.cssText = 'margin: 0 0 15px 0; font-size: 14px; line-height: 1.5; color: #ffffff;';
      suggestionDiv.appendChild(suggestionText);

      var tryBtn = document.createElement('button');
      tryBtn.textContent = 'SWITCH NOW';
      tryBtn.style.cssText = 'width: 100%; background: #ff6b6b; color: #ffffff; border: none; border-radius: 6px; padding: 10px; font-weight: bold; cursor: pointer; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;';
      tryBtn.onclick = function() {
        console.warn('[SmartRecommend] Player switched after losses to: ' + rec.gameId);
        if (window.SlotMachine && typeof window.SlotMachine.loadGame === 'function') {
          window.SlotMachine.loadGame(rec.gameId);
        }
        suggestionDiv.remove();
      };
      suggestionDiv.appendChild(tryBtn);

      var dismissBtn = document.createElement('button');
      dismissBtn.textContent = 'Dismiss';
      dismissBtn.style.cssText = 'width: 100%; background: transparent; color: #ff6b6b; border: 1px solid #ff6b6b; border-radius: 6px; padding: 8px; font-weight: bold; cursor: pointer; font-size: 12px;';
      dismissBtn.onclick = function() {
        suggestionDiv.remove();
      };
      suggestionDiv.appendChild(dismissBtn);

      document.body.appendChild(suggestionDiv);
    },

    injectLobbyRecommendationRow: function() {
      var lobbyContainer = document.querySelector('[data-role="lobby"], .lobby, .games-lobby, #games-container');
      if (!lobbyContainer) return;

      var existingRow = document.getElementById('smart-recommend-lobby-row');
      if (existingRow) {
        existingRow.remove();
      }

      var recommendations = this.getRecommendations(6);
      if (recommendations.length === 0) return;

      var self = this;
      var rowContainer = document.createElement('div');
      rowContainer.id = 'smart-recommend-lobby-row';
      rowContainer.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%); padding: 25px 20px; margin: 20px 0; border-top: 2px solid #ffd700; border-bottom: 2px solid #ffd700;';

      var title = document.createElement('h2');
      title.textContent = 'RECOMMENDED FOR YOU';
      title.style.cssText = 'color: #ffd700; font-size: 20px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif;';
      rowContainer.appendChild(title);

      var subtitle = document.createElement('p');
      subtitle.textContent = 'Based on your play style';
      subtitle.style.cssText = 'color: #00ff41; font-size: 12px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;';
      rowContainer.appendChild(subtitle);

      var gamesScroller = document.createElement('div');
      gamesScroller.style.cssText = 'display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;';

      recommendations.forEach(function(rec) {
        var gameCard = self.createGameCardElement(rec);
        gameCard.style.cssText = gameCard.style.cssText + '; min-width: 160px; flex-shrink: 0;';
        gamesScroller.appendChild(gameCard);
      });

      rowContainer.appendChild(gamesScroller);

      if (lobbyContainer.firstChild) {
        lobbyContainer.insertBefore(rowContainer, lobbyContainer.firstChild);
      } else {
        lobbyContainer.appendChild(rowContainer);
      }
    }
  };

  // Expose to global scope
  window.SmartRecommend = SmartRecommend;

  // Auto-init if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SmartRecommend.init();
    });
  } else {
    SmartRecommend.init();
  }

})();
