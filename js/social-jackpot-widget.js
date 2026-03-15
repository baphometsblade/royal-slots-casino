/**
 * Social Jackpot Widget
 * Community-driven jackpot pools for engagement & deposits
 * Displays live counters, odds, and win celebrations
 */

(function () {
  'use strict';

  var SocialJackpotWidget = {
    apiBase: '/api/social-jackpot',
    pools: [],
    userOdds: {},
    animationFrameIds: {},
    displayCounts: {},
    containerEl: null,
    isInitialized: false,

    /**
     * Initialize widget: fetch pools, render UI, start animations
     */
    init: function () {
      var self = this;

      if (self.isInitialized) return Promise.resolve();

      return self._fetchPools()
        .then(function () {
          self._injectStyles();
          self._renderWidget();
          self._startAnimations();
          self.isInitialized = true;
          console.log('[SocialJackpot] Widget initialized');
          return self;
        })
        .catch(function (err) {
          console.warn('[SocialJackpot] Init error:', err);
        });
    },

    /**
     * Fetch active pools from backend
     */
    _fetchPools: function () {
      var self = this;
      return fetch(self.apiBase + '/pools', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          self.pools = data.pools || [];
          // Initialize display counts to match current amounts
          self.pools.forEach(function (pool) {
            self.displayCounts[pool.id] = pool.currentAmount;
          });
        });
    },

    /**
     * Auto-contribute to pools when a spin result is received
     * Called from game engine with {bet, won}
     */
    onSpinResult: function (spinResult) {
      var self = this;
      var bet = spinResult.bet || 0;

      if (!bet || bet <= 0) return;

      // Get auth token
      var token = localStorage.getItem('authToken');
      if (!token) return;

      // Call backend to contribute
      return fetch(self.apiBase + '/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ betAmount: bet }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          // Update local pool amounts
          if (data.contributions) {
            data.contributions.forEach(function (contrib) {
              var pool = self.pools.find(function (p) {
                return p.id === contrib.poolId;
              });
              if (pool) {
                pool.currentAmount += contrib.contributedAmount;
              }
            });
          }
          // Refresh odds
          self._updateOdds();
        })
        .catch(function (err) {
          console.warn('[SocialJackpot] Contribution error:', err);
        });
    },

    /**
     * Check if this spin triggers a jackpot win
     */
    checkForWin: function (poolId) {
      var self = this;
      var token = localStorage.getItem('authToken');

      if (!token || !poolId) return Promise.resolve(null);

      return fetch(self.apiBase + '/check-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ poolId: poolId }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data.won) {
            // Show celebration
            self.showWinCelebration(data.poolName, data.amount, data.winnerName);
            return data;
          }
          return null;
        })
        .catch(function (err) {
          console.warn('[SocialJackpot] Win check error:', err);
          return null;
        });
    },

    /**
     * Render the widget into the DOM
     */
    _renderWidget: function () {
      var self = this;

      // Create container
      var container = document.createElement('div');
      container.id = 'social-jackpot-widget';
      container.className = 'sjw-container';

      // Build pools HTML
      var poolsHtml = '';
      self.pools.forEach(function (pool) {
        var progressPercent = pool.progressPercent || 0;
        var odds = (self.userOdds[pool.id] || 0).toFixed(2);

        poolsHtml += `
          <div class="sjw-pool" data-pool-id="${pool.id}">
            <div class="sjw-pool-name">${self._escapeHtml(pool.poolName)}</div>

            <div class="sjw-counter">
              $<span class="sjw-amount" data-pool-id="${pool.id}">0</span>
            </div>

            <div class="sjw-progress-container">
              <div class="sjw-progress-bar" style="width: ${Math.min(progressPercent, 100)}%"></div>
            </div>

            <div class="sjw-footer">
              <span class="sjw-progress-text">${Math.round(progressPercent)}%</span>
              <span class="sjw-odds">YOUR ODDS: ${odds}%</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = `
        <div class="sjw-header">
          <span class="sjw-title">🎰 Community Jackpot Pools</span>
        </div>
        <div class="sjw-pools">${poolsHtml}</div>
      `;

      // Insert into page
      var gameArea = document.querySelector('.game-area') || document.querySelector('main') || document.body;
      gameArea.insertBefore(container, gameArea.firstChild);

      self.containerEl = container;
    },

    /**
     * Start animated counter updates for all pools
     */
    _startAnimations: function () {
      var self = this;

      var animateFrame = function () {
        self.pools.forEach(function (pool) {
          var targetAmount = pool.currentAmount;
          var displayAmount = self.displayCounts[pool.id] || 0;

          // Smoothly increment towards target
          var diff = targetAmount - displayAmount;
          if (Math.abs(diff) > 0.01) {
            var nextDisplay = displayAmount + diff * 0.1;
            self.displayCounts[pool.id] = nextDisplay;

            var amountEl = self.containerEl.querySelector(
              `.sjw-amount[data-pool-id="${pool.id}"]`
            );
            if (amountEl) {
              amountEl.textContent = Math.round(nextDisplay * 100) / 100;
            }
          }

          // Update progress bar with pulse effect if >80%
          var progressPercent = pool.progressPercent || 0;
          var poolEl = self.containerEl.querySelector(`[data-pool-id="${pool.id}"]`);
          if (poolEl) {
            var barEl = poolEl.querySelector('.sjw-progress-bar');
            if (barEl) {
              barEl.style.width = Math.min(progressPercent, 100) + '%';
              if (progressPercent > 80) {
                barEl.classList.add('sjw-pulse');
              } else {
                barEl.classList.remove('sjw-pulse');
              }
            }
          }
        });

        self.animationFrameIds.mainLoop = requestAnimationFrame(animateFrame);
      };

      // Start animation loop
      self.animationFrameIds.mainLoop = requestAnimationFrame(animateFrame);

      // Refresh pool data every 5 seconds
      setInterval(function () {
        self._fetchPools().catch(function (err) {
          console.warn('[SocialJackpot] Poll error:', err);
        });
      }, 5000);
    },

    /**
     * Update user's odds for each pool
     */
    _updateOdds: function () {
      var self = this;
      var token = localStorage.getItem('authToken');

      if (!token) return;

      fetch(self.apiBase + '/my-contributions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data.contributions) {
            data.contributions.forEach(function (contrib) {
              self.userOdds[contrib.poolId] = contrib.estimatedOdds;

              var poolEl = self.containerEl.querySelector(
                `[data-pool-id="${contrib.poolId}"] .sjw-odds`
              );
              if (poolEl) {
                poolEl.textContent = 'YOUR ODDS: ' + contrib.estimatedOdds.toFixed(2) + '%';
              }
            });
          }
        })
        .catch(function (err) {
          console.warn('[SocialJackpot] Odds update error:', err);
        });
    },

    /**
     * Show full-screen jackpot win celebration
     */
    showWinCelebration: function (poolName, amount, winnerName) {
      var self = this;

      // Create overlay
      var overlay = document.createElement('div');
      overlay.className = 'sjw-celebration-overlay';
      overlay.innerHTML = `
        <div class="sjw-celebration-content">
          <div class="sjw-celebration-text">
            <h1 class="sjw-win-amount">$${Math.round(amount * 100) / 100}</h1>
            <h2 class="sjw-win-subtitle">WON BY ${self._escapeHtml(winnerName)}</h2>
            <p class="sjw-win-pool">${self._escapeHtml(poolName)}</p>
            <p class="sjw-win-cta">Could be YOU next!</p>
            <button class="sjw-deposit-btn">Deposit Now</button>
          </div>
          <div class="sjw-confetti-container"></div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Play confetti animation
      self._playConfetti(overlay.querySelector('.sjw-confetti-container'));

      // Play sound if available
      self._playWinSound();

      // Auto-dismiss after 8 seconds
      setTimeout(function () {
        overlay.classList.add('sjw-fade-out');
        setTimeout(function () {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 500);
      }, 8000);

      // Deposit button click
      var depositBtn = overlay.querySelector('.sjw-deposit-btn');
      if (depositBtn) {
        depositBtn.addEventListener('click', function () {
          window.location.hash = '#deposit';
        });
      }
    },

    /**
     * Play confetti particle animation
     */
    _playConfetti: function (container) {
      if (!container) return;

      for (var i = 0; i < 50; i++) {
        var particle = document.createElement('div');
        particle.className = 'sjw-confetti';

        var randomColor = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#95E1D3'][
          Math.floor(Math.random() * 5)
        ];
        particle.style.backgroundColor = randomColor;

        var randomLeft = Math.random() * 100;
        var randomDelay = Math.random() * 0.5;
        var randomDuration = 2 + Math.random() * 1;

        particle.style.left = randomLeft + '%';
        particle.style.animation = `sjw-fall ${randomDuration}s linear ${randomDelay}s forwards`;

        container.appendChild(particle);
      }
    },

    /**
     * Play win sound
     */
    _playWinSound: function () {
      // Audio context win sound (simple sine wave beeps)
      try {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var now = audioCtx.currentTime;

        for (var i = 0; i < 3; i++) {
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();

          osc.frequency.value = 800 + i * 200;
          osc.connect(gain);
          gain.connect(audioCtx.destination);

          var startTime = now + i * 0.1;
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

          osc.start(startTime);
          osc.stop(startTime + 0.2);
        }
      } catch (err) {
        // Audio context not supported or blocked
      }
    },

    /**
     * Inject CSS styles
     */
    _injectStyles: function () {
      var style = document.createElement('style');
      style.textContent = `
        /* Social Jackpot Widget Styles */

        .sjw-container {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid #FFD700;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
        }

        .sjw-header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid rgba(255, 215, 0, 0.3);
        }

        .sjw-title {
          font-size: 22px;
          font-weight: bold;
          color: #FFD700;
          text-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
          letter-spacing: 1px;
        }

        .sjw-pools {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .sjw-pool {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .sjw-pool:hover {
          border-color: #FFD700;
          box-shadow: 0 4px 16px rgba(255, 215, 0, 0.15);
          transform: translateY(-2px);
        }

        .sjw-pool-name {
          font-size: 16px;
          font-weight: bold;
          color: #FFFFFF;
          margin-bottom: 12px;
          text-align: center;
        }

        .sjw-counter {
          text-align: center;
          margin-bottom: 15px;
        }

        .sjw-amount {
          font-size: 28px;
          font-weight: bold;
          color: #FFD700;
          text-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
          display: inline-block;
          min-width: 100px;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .sjw-progress-container {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 215, 0, 0.15);
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .sjw-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
          width: 0%;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
        }

        .sjw-progress-bar.sjw-pulse {
          animation: sjw-glow 1s ease-in-out infinite;
        }

        @keyframes sjw-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 1);
          }
        }

        .sjw-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #CCCCCC;
        }

        .sjw-progress-text {
          font-weight: bold;
          color: #FFD700;
        }

        .sjw-odds {
          color: #95E1D3;
          font-weight: bold;
        }

        /* Celebration Overlay */

        .sjw-celebration-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: sjw-overlay-appear 0.3s ease-out;
        }

        @keyframes sjw-overlay-appear {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .sjw-celebration-overlay.sjw-fade-out {
          animation: sjw-overlay-fade 0.5s ease-out forwards;
        }

        @keyframes sjw-overlay-fade {
          to {
            opacity: 0;
          }
        }

        .sjw-celebration-content {
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .sjw-win-amount {
          font-size: 120px;
          font-weight: bold;
          color: #FFD700;
          margin: 0;
          text-shadow: 0 4px 20px rgba(255, 215, 0, 0.8);
          animation: sjw-bounce 0.6s ease-out;
        }

        @keyframes sjw-bounce {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .sjw-win-subtitle {
          font-size: 36px;
          color: #FFFFFF;
          margin: 20px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }

        .sjw-win-pool {
          font-size: 24px;
          color: #95E1D3;
          margin: 15px 0;
          font-weight: bold;
        }

        .sjw-win-cta {
          font-size: 18px;
          color: #CCCCCC;
          margin: 20px 0 30px;
          font-style: italic;
        }

        .sjw-deposit-btn {
          padding: 15px 40px;
          font-size: 18px;
          font-weight: bold;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #000000;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .sjw-deposit-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
        }

        .sjw-deposit-btn:active {
          transform: scale(0.98);
        }

        /* Confetti Animation */

        .sjw-confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }

        .sjw-confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        @keyframes sjw-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        /* Responsive */

        @media (max-width: 768px) {
          .sjw-pools {
            grid-template-columns: 1fr;
          }

          .sjw-win-amount {
            font-size: 72px;
          }

          .sjw-win-subtitle {
            font-size: 24px;
          }

          .sjw-win-pool {
            font-size: 18px;
          }
        }
      `;

      document.head.appendChild(style);
    },

    /**
     * Utility: escape HTML to prevent XSS
     */
    _escapeHtml: function (text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Destroy widget and cleanup
     */
    destroy: function () {
      var self = this;

      // Cancel animation frames
      Object.keys(self.animationFrameIds).forEach(function (key) {
        if (self.animationFrameIds[key]) {
          cancelAnimationFrame(self.animationFrameIds[key]);
        }
      });

      // Remove container
      if (self.containerEl && self.containerEl.parentNode) {
        self.containerEl.parentNode.removeChild(self.containerEl);
      }

      self.isInitialized = false;
    },
  };

  // Export to window
  window.SocialJackpotWidget = SocialJackpotWidget;
})();
