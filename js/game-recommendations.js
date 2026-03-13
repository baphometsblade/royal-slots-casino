/**
 * Game Recommendations Engine
 * Suggests games based on player behavior and game properties
 * IIFE pattern with window.GameRecommendations API
 */

window.GameRecommendations = (function() {
  'use strict';

  // State
  let recentlyPlayedGames = [];
  let allGames = [];

  /**
   * Initialize the recommendations engine
   * Loads play history from localStorage and syncs with available games
   */
  function init() {
    try {
      // Access global GAMES array from game-definitions.js
      if (typeof GAMES === 'undefined') {
        console.warn('GameRecommendations: GAMES array not found. Ensure game-definitions.js is loaded first.');
        return false;
      }

      allGames = GAMES;

      // Load recently played games from localStorage
      const stored = localStorage.getItem('recentlyPlayed');
      if (stored) {
        try {
          recentlyPlayedGames = JSON.parse(stored);
          // Filter to ensure all games exist in GAMES array
          recentlyPlayedGames = recentlyPlayedGames.filter(gameId =>
            allGames.some(g => g.id === gameId)
          );
        } catch (e) {
          console.warn('GameRecommendations: Failed to parse stored play history:', e.message);
          recentlyPlayedGames = [];
        }
      }

      return true;
    } catch (error) {
      console.warn('GameRecommendations: Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Get recommendations based on play history
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Array} Array of recommendation objects with reasoning
   */
  function getRecommendations(limit = 5) {
    if (allGames.length === 0) {
      console.warn('GameRecommendations: No games available.');
      return [];
    }

    const recommendations = [];

    // If no play history, return popular games
    if (recentlyPlayedGames.length === 0) {
      return getPopularGames(limit);
    }

    // Build recommendation set with reasoning
    const gameScores = new Map();

    recentlyPlayedGames.forEach(playedGameId => {
      const playedGame = allGames.find(g => g.id === playedGameId);
      if (!playedGame) return;

      // Find similar games
      allGames.forEach(candidateGame => {
        // Skip games already played
        if (recentlyPlayedGames.includes(candidateGame.id)) return;

        let score = 0;
        let reasons = [];

        // Same provider (strong signal)
        if (candidateGame.provider === playedGame.provider) {
          score += 3;
          reasons.push(`provider:${playedGame.provider}`);
        }

        // Same volatility (strong signal)
        if (candidateGame.volatility === playedGame.volatility) {
          score += 3;
          reasons.push(`volatility:${playedGame.volatility}`);
        }

        // Similar RTP range (within 1%)
        if (Math.abs(candidateGame.rtp - playedGame.rtp) <= 1) {
          score += 2;
          reasons.push(`rtp:similar`);
        }

        // Same category/template (medium signal)
        if (candidateGame.template === playedGame.template) {
          score += 1;
          reasons.push(`template:${playedGame.template}`);
        }

        // Same bonus type (if applicable)
        if (candidateGame.bonusType === playedGame.bonusType) {
          score += 1;
          reasons.push(`bonusType:${playedGame.bonusType}`);
        }

        // Store or update score
        if (score > 0) {
          const existing = gameScores.get(candidateGame.id);
          if (!existing || existing.score < score) {
            gameScores.set(candidateGame.id, {
              game: candidateGame,
              score,
              reasons,
              basedOn: playedGame
            });
          }
        }
      });
    });

    // Sort by score and convert to recommendations
    const sorted = Array.from(gameScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    sorted.forEach(item => {
      recommendations.push({
        game: item.game,
        reason: `Because you played "${item.basedOn.name}", try this!`,
        basedOnGame: item.basedOn.name
      });
    });

    return recommendations;
  }

  /**
   * Get popular/hot games when no play history exists
   * @param {number} limit - Number of games to return
   * @returns {Array} Array of popular game recommendation objects
   */
  function getPopularGames(limit = 5) {
    const hotGames = allGames
      .filter(g => g.hot === true || g.tag === 'HOT' || g.jackpot > 0)
      .sort((a, b) => (b.jackpot || 0) - (a.jackpot || 0))
      .slice(0, limit);

    return hotGames.map(game => ({
      game,
      reason: 'Popular This Week',
      basedOnGame: null
    }));
  }

  /**
   * Render the recommendations widget in the DOM
   * Inserts below the main game grid with responsive design
   */
  function renderWidget() {
    try {
      const recommendations = getRecommendations(5);

      if (recommendations.length === 0) {
        console.warn('GameRecommendations: No recommendations generated.');
        return false;
      }

      // Find or create container after main game grid
      let container = document.getElementById('game-recommendations-widget');
      if (!container) {
        const gameGrid = document.querySelector('[data-game-grid], .game-grid, #games-grid');
        if (!gameGrid) {
          console.warn('GameRecommendations: Game grid not found in DOM.');
          return false;
        }

        container = document.createElement('div');
        container.id = 'game-recommendations-widget';
        gameGrid.parentNode.insertBefore(container, gameGrid.nextSibling);
      }

      // Build widget HTML
      const title = recommendations[0].basedOnGame
        ? 'Recommended For You'
        : 'Popular This Week';

      let html = `
        <div class="recommendations-section">
          <h2 class="recommendations-title">${title}</h2>
          <p class="recommendations-subtitle">Handpicked games just for you</p>
          <div class="recommendations-grid">
      `;

      recommendations.forEach(rec => {
        const { game, reason, basedOnGame } = rec;
        html += renderGameCard(game, reason, basedOnGame);
      });

      html += `
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Attach click handlers
      document.querySelectorAll('[data-game-launch]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const gameId = btn.dataset.gameLaunch;
          launchGame(gameId);
        });
      });

      return true;
    } catch (error) {
      console.warn('GameRecommendations: Widget render failed:', error.message);
      return false;
    }
  }

  /**
   * Render individual game card HTML
   * @param {Object} game - Game object from GAMES array
   * @param {string} reason - Recommendation reason text
   * @param {string} basedOnGame - Name of game this recommendation is based on
   * @returns {string} HTML string for the card
   */
  function renderGameCard(game, reason, basedOnGame) {
    const badgeText = basedOnGame ? 'Try This' : 'Hot';
    const subtitle = basedOnGame
      ? `Because you played<br><strong>${basedOnGame}</strong>`
      : 'Popular right now';

    return `
      <div class="recommendation-card">
        <div class="card-badge">${badgeText}</div>
        <div class="card-image" style="background-image: url('${game.thumbnail}'); background-color: ${game.accentColor}20;">
          <div class="card-overlay"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${game.name}</h3>
          <p class="card-provider">${game.provider}</p>
          <div class="card-stats">
            <span class="stat">
              <strong>${game.rtp}%</strong> RTP
            </span>
            <span class="stat">
              <strong>${game.volatility}</strong>
            </span>
          </div>
          <p class="card-reason">${subtitle}</p>
          <button class="card-button" data-game-launch="${game.id}">
            Play Now
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Launch a game (compatibility with existing playGame function)
   * @param {string} gameId - The game ID to launch
   */
  function launchGame(gameId) {
    try {
      // Track this play in recently played
      if (!recentlyPlayedGames.includes(gameId)) {
        recentlyPlayedGames.unshift(gameId);
        // Keep only last 20 games
        recentlyPlayedGames = recentlyPlayedGames.slice(0, 20);
        localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayedGames));
      }

      // Call global playGame if available, otherwise navigate
      if (typeof playGame === 'function') {
        playGame(gameId);
      } else {
        // Fallback: trigger click on game card or navigate
        const gameCard = document.querySelector(`[data-game-id="${gameId}"]`);
        if (gameCard && gameCard.querySelector('button')) {
          gameCard.querySelector('button').click();
        } else {
          console.warn(`GameRecommendations: Could not launch game ${gameId}`);
        }
      }
    } catch (error) {
      console.warn('GameRecommendations: Launch failed:', error.message);
    }
  }

  // Public API
  return {
    init,
    getRecommendations,
    renderWidget
  };
})();

/**
 * Styles for the recommendations widget
 * Injected inline to avoid CSS file dependencies
 */
(function injectStyles() {
  const styles = `
    #game-recommendations-widget {
      margin-top: 3rem;
      padding: 0 1rem;
    }

    .recommendations-section {
      background: linear-gradient(135deg, rgba(20, 10, 20, 0.9) 0%, rgba(40, 20, 40, 0.9) 100%);
      border: 2px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      padding: 2rem 1.5rem;
      backdrop-filter: blur(10px);
    }

    .recommendations-title {
      color: #d4af37;
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .recommendations-subtitle {
      color: #b8860b;
      font-size: 0.95rem;
      margin: 0 0 1.5rem 0;
      opacity: 0.9;
    }

    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .recommendation-card {
      background: linear-gradient(135deg, rgba(30, 15, 35, 0.8) 0%, rgba(50, 25, 50, 0.8) 100%);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 10px;
      overflow: hidden;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .recommendation-card:hover {
      transform: translateY(-6px);
      border-color: rgba(212, 175, 55, 0.5);
      box-shadow: 0 12px 30px rgba(212, 175, 55, 0.15);
    }

    .card-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: linear-gradient(135deg, #d4af37 0%, #f5c842 100%);
      color: #1a1a2e;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      z-index: 10;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    .card-image {
      position: relative;
      width: 100%;
      height: 140px;
      background-size: cover;
      background-position: center;
      overflow: hidden;
    }

    .card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent 0%, rgba(20, 10, 20, 0.7) 100%);
    }

    .card-content {
      padding: 1rem;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }

    .card-title {
      color: #d4af37;
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 0.3rem 0;
      line-height: 1.2;
    }

    .card-provider {
      color: #888;
      font-size: 0.8rem;
      margin: 0 0 0.7rem 0;
      opacity: 0.8;
    }

    .card-stats {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.8rem;
    }

    .stat {
      background: rgba(212, 175, 55, 0.1);
      color: #d4af37;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      flex: 1;
      text-align: center;
    }

    .stat strong {
      display: block;
      font-size: 0.9rem;
    }

    .card-reason {
      color: #aaa;
      font-size: 0.8rem;
      margin: 0.5rem 0 0.8rem 0;
      line-height: 1.3;
    }

    .card-reason strong {
      color: #d4af37;
      display: block;
      margin-top: 0.3rem;
    }

    .card-button {
      background: linear-gradient(135deg, #d4af37 0%, #f5c842 100%);
      color: #1a1a2e;
      border: none;
      padding: 0.7rem 1rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: auto;
    }

    .card-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
    }

    .card-button:active {
      transform: scale(0.98);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .recommendations-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
      }

      .recommendations-section {
        padding: 1.5rem 1rem;
      }

      .recommendations-title {
        font-size: 1.4rem;
      }

      .card-image {
        height: 120px;
      }

      .card-title {
        font-size: 0.9rem;
      }
    }

    @media (max-width: 480px) {
      .recommendations-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.8rem;
      }

      .recommendations-section {
        padding: 1rem;
      }

      .recommendations-title {
        font-size: 1.2rem;
      }

      .recommendations-subtitle {
        font-size: 0.85rem;
      }

      .card-content {
        padding: 0.8rem;
      }

      .card-button {
        padding: 0.6rem 0.8rem;
        font-size: 0.8rem;
      }
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
})();
