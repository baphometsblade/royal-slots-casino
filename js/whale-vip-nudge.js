(function() {
  var WhaleVipNudge = {
    // Configuration
    config: {
      whaleThreshold: 60,
      progressShowThreshold: 40,
      tooltipShowThreshold: 30,
      checkIntervalMs: 120000, // 2 minutes
      tooltipDurationMs: 4000,
      tooltipCooldownMs: 300000, // 5 minutes
      sessionStorageKey: 'whale_vip_shown',
      sessionStartTime: Date.now()
    },

    // State
    state: {
      currentScore: 0,
      modalShown: false,
      lastTooltipTime: 0,
      metricsRefresh: 0
    },

    // ==================== WHALE SCORE CALCULATION ====================
    calculateScore: function() {
      var stats = window.stats || {};
      var balance = window.balance || 0;
      var sessionDuration = (Date.now() - this.config.sessionStartTime) / 1000 / 60; // minutes

      // Normalize values
      var wageredScore = Math.min((stats.totalWagered || 0) / 5000 * 100, 100);
      var spinsScore = Math.min((stats.totalSpins || 0) / 200 * 100, 100);
      var balanceScore = Math.min((balance / 500) * 100, 100);
      var sessionScore = Math.min((sessionDuration / 30) * 100, 100);
      var gameVarietyScore = Math.min((Object.keys(stats.gamesPlayed || {}).length / 3) * 100, 100);

      // Weighted calculation
      var totalScore =
        (wageredScore * 0.35) +
        (spinsScore * 0.20) +
        (balanceScore * 0.20) +
        (sessionScore * 0.15) +
        (gameVarietyScore * 0.10);

      this.state.currentScore = Math.round(totalScore);
      return this.state.currentScore;
    },

    getScore: function() {
      return this.calculateScore();
    },

    // ==================== MODAL CREATION ====================
    createVipModal: function() {
      var self = this;

      // Overlay
      var overlay = document.createElement('div');
      overlay.id = 'whale-vip-overlay';
      overlay.style.cssText =
        'position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
        'background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); ' +
        'z-index: 9998; cursor: pointer; opacity: 0; transition: opacity 0.4s ease;';

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          self.dismissModal();
        }
      });

      // Modal container
      var modal = document.createElement('div');
      modal.id = 'whale-vip-modal';
      modal.style.cssText =
        'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
        'background: linear-gradient(135deg, #1a0033 0%, #0a0a1a 100%); ' +
        'border: 2px solid #d4af37; border-radius: 16px; ' +
        'width: 90%; max-width: 500px; z-index: 9999; ' +
        'box-shadow: 0 0 40px rgba(212, 175, 55, 0.5), inset 0 0 20px rgba(155, 89, 182, 0.2); ' +
        'opacity: 0; transform: translate(-50%, -50%) scale(0.9); ' +
        'transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); ' +
        'overflow: hidden;';

      // Header with diamonds
      var header = document.createElement('div');
      header.style.cssText =
        'background: linear-gradient(135deg, #9b59b6 0%, #d4af37 100%); ' +
        'padding: 24px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3);';
      header.innerHTML = '<div style="font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">💎 EXCLUSIVE VIP INVITATION 💎</div>';

      // Content
      var content = document.createElement('div');
      content.style.cssText = 'padding: 32px 24px;';

      var subtitle = document.createElement('p');
      subtitle.style.cssText =
        'color: #d4af37; font-size: 16px; text-align: center; margin: 0 0 20px 0; ' +
        'font-weight: 600;';
      subtitle.textContent = "You've been identified as one of our top players!";

      var stats = document.createElement('div');
      stats.style.cssText =
        'background: rgba(155, 89, 182, 0.1); border: 1px solid rgba(212, 175, 55, 0.2); ' +
        'border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;';

      var wagered = window.stats && window.stats.totalWagered ? window.stats.totalWagered.toLocaleString('en-US', {style: 'currency', currency: 'USD'}) : '$0';
      var gamesCount = window.stats && window.stats.gamesPlayed ? Object.keys(window.stats.gamesPlayed).length : 0;

      stats.innerHTML =
        '<div style="color: #ffffff; font-size: 14px; margin-bottom: 8px;">' +
        'You\'ve wagered ' + wagered + ' across ' + gamesCount + ' games' +
        '</div>' +
        '<div style="color: #9b59b6; font-size: 12px;">VIP Score: ' + this.state.currentScore + '/100</div>';

      var benefitsTitle = document.createElement('div');
      benefitsTitle.style.cssText =
        'color: #d4af37; font-weight: 600; font-size: 14px; margin-bottom: 12px; ' +
        'text-transform: uppercase; letter-spacing: 1px;';
      benefitsTitle.textContent = '✨ VIP BENEFITS ✨';

      var benefits = document.createElement('ul');
      benefits.style.cssText =
        'list-style: none; padding: 0; margin: 0 0 24px 0; color: #ffffff;';

      var benefitsList = [
        '15% Daily Cashback',
        'Priority Withdrawals',
        'Personal Account Manager',
        'Exclusive Bonus Codes',
        'Higher Table Limits'
      ];

      benefitsList.forEach(function(benefit) {
        var li = document.createElement('li');
        li.style.cssText =
          'padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(212, 175, 55, 0.1); ' +
          'display: flex; align-items: center;';
        li.innerHTML = '<span style="color: #d4af37; margin-right: 8px;">🔹</span>' + benefit;
        benefits.appendChild(li);
      });

      // Buttons container
      var buttonContainer = document.createElement('div');
      buttonContainer.style.cssText =
        'display: flex; gap: 12px; margin-top: 24px;';

      var activateBtn = document.createElement('button');
      activateBtn.id = 'whale-vip-activate-btn';
      activateBtn.style.cssText =
        'flex: 1; padding: 12px 24px; background: linear-gradient(135deg, #d4af37 0%, #f4df9e 100%); ' +
        'color: #000000; border: none; border-radius: 8px; font-weight: 700; ' +
        'font-size: 13px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; ' +
        'transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);';
      activateBtn.textContent = '🚀 ACTIVATE VIP STATUS';
      activateBtn.addEventListener('mouseover', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.5)';
      });
      activateBtn.addEventListener('mouseout', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)';
      });
      activateBtn.addEventListener('click', function() {
        self.handleActivateVip();
      });

      var dismissBtn = document.createElement('button');
      dismissBtn.id = 'whale-vip-dismiss-btn';
      dismissBtn.style.cssText =
        'flex: 1; padding: 12px 24px; background: transparent; ' +
        'color: #d4af37; border: 1px solid #d4af37; border-radius: 8px; ' +
        'font-weight: 600; font-size: 13px; cursor: pointer; text-transform: uppercase; ' +
        'letter-spacing: 1px; transition: all 0.3s ease;';
      dismissBtn.textContent = 'Not Now';
      dismissBtn.addEventListener('mouseover', function() {
        this.style.background = 'rgba(212, 175, 55, 0.1)';
      });
      dismissBtn.addEventListener('mouseout', function() {
        this.style.background = 'transparent';
      });
      dismissBtn.addEventListener('click', function() {
        self.dismissModal();
      });

      buttonContainer.appendChild(activateBtn);
      buttonContainer.appendChild(dismissBtn);

      // Assemble modal
      content.appendChild(subtitle);
      content.appendChild(stats);
      content.appendChild(benefitsTitle);
      content.appendChild(benefits);
      content.appendChild(buttonContainer);

      modal.appendChild(header);
      modal.appendChild(content);

      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      // Trigger animation
      setTimeout(function() {
        overlay.style.opacity = '1';
        modal.style.opacity = '1';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 10);

      return { modal: modal, overlay: overlay };
    },

    showModal: function() {
      var alreadyShown = sessionStorage.getItem(this.config.sessionStorageKey);
      if (alreadyShown || this.state.modalShown) {
        return;
      }

      this.createVipModal();
      this.state.modalShown = true;
      sessionStorage.setItem(this.config.sessionStorageKey, 'true');
      console.warn('[WhaleVipNudge] VIP Modal shown to whale (score: ' + this.state.currentScore + ')');
    },

    dismissModal: function() {
      var modal = document.getElementById('whale-vip-modal');
      var overlay = document.getElementById('whale-vip-overlay');

      if (modal && overlay) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
        overlay.style.opacity = '0';

        setTimeout(function() {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 300);
      }
    },

    handleActivateVip: function() {
      console.warn('[WhaleVipNudge] Whale activated VIP (score: ' + this.state.currentScore + ')');

      // Close modal
      this.dismissModal();

      // Trigger wallet/deposit modal
      if (typeof window.openWalletModal === 'function') {
        window.openWalletModal();
      } else if (typeof window.showDepositModal === 'function') {
        window.showDepositModal();
      } else {
        console.warn('[WhaleVipNudge] No wallet/deposit modal function found');
      }
    },

    // ==================== PROGRESS METER ====================
    createProgressMeter: function() {
      var self = this;

      var meter = document.createElement('div');
      meter.id = 'whale-vip-meter';
      meter.style.cssText =
        'position: fixed; right: 20px; bottom: 100px; ' +
        'background: linear-gradient(135deg, #1a0033 0%, #0a0a1a 100%); ' +
        'border: 1px solid #d4af37; border-radius: 12px; ' +
        'padding: 12px 16px; width: 200px; z-index: 1000; ' +
        'opacity: 0; visibility: hidden; transition: all 0.3s ease; ' +
        'box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2); cursor: pointer;';

      var label = document.createElement('div');
      label.style.cssText =
        'color: #d4af37; font-size: 12px; font-weight: 600; ' +
        'margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;';
      label.textContent = '💎 VIP Status';

      var progress = document.createElement('div');
      progress.style.cssText =
        'width: 100%; height: 8px; background: rgba(155, 89, 182, 0.2); ' +
        'border-radius: 4px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.2);';

      var progressBar = document.createElement('div');
      progressBar.id = 'whale-vip-meter-bar';
      progressBar.style.cssText =
        'height: 100%; width: 0%; background: linear-gradient(90deg, #9b59b6 0%, #d4af37 100%); ' +
        'transition: width 0.4s ease; box-shadow: 0 0 10px rgba(212, 175, 55, 0.6);';
      progress.appendChild(progressBar);

      var text = document.createElement('div');
      text.id = 'whale-vip-meter-text';
      text.style.cssText =
        'color: #ffffff; font-size: 11px; margin-top: 6px; text-align: center;';
      text.textContent = 'VIP Status: 0%';

      meter.appendChild(label);
      meter.appendChild(progress);
      meter.appendChild(text);

      meter.addEventListener('click', function() {
        self.showModal();
      });

      document.body.appendChild(meter);
      return meter;
    },

    updateProgressMeter: function() {
      var meter = document.getElementById('whale-vip-meter');
      if (!meter) return;

      var score = this.state.currentScore;
      var threshold = this.config.progressShowThreshold;

      if (score >= threshold) {
        meter.style.opacity = '1';
        meter.style.visibility = 'visible';

        // Pulse animation if close to whale threshold
        if (score > 50) {
          meter.style.animation = 'whale-pulse 2s infinite';
        }
      } else {
        meter.style.opacity = '0';
        meter.style.visibility = 'hidden';
      }

      var percentage = Math.min((score / this.config.whaleThreshold) * 100, 100);
      var bar = document.getElementById('whale-vip-meter-bar');
      var text = document.getElementById('whale-vip-meter-text');

      if (bar) bar.style.width = percentage + '%';
      if (text) text.textContent = 'VIP Status: ' + Math.round(percentage) + '%';
    },

    // ==================== TOOLTIP ====================
    showTooltip: function() {
      var now = Date.now();
      var timeSinceLastTooltip = now - this.state.lastTooltipTime;

      if (timeSinceLastTooltip < this.config.tooltipCooldownMs) {
        return;
      }

      var existingTooltip = document.getElementById('whale-vip-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }

      var tooltip = document.createElement('div');
      tooltip.id = 'whale-vip-tooltip';
      tooltip.style.cssText =
        'position: fixed; bottom: 120px; right: 20px; ' +
        'background: linear-gradient(135deg, #9b59b6 0%, #d4af37 100%); ' +
        'color: #ffffff; padding: 12px 16px; border-radius: 8px; ' +
        'font-size: 12px; font-weight: 600; z-index: 1001; ' +
        'box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4); ' +
        'opacity: 0; animation: whale-fade-in 0.3s ease forwards;';
      tooltip.textContent = '💎 Higher bets unlock VIP rewards!';

      document.body.appendChild(tooltip);
      this.state.lastTooltipTime = now;

      setTimeout(function() {
        tooltip.style.animation = 'whale-fade-out 0.3s ease forwards';
        setTimeout(function() {
          if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        }, 300);
      }, this.config.tooltipDurationMs);
    },

    // ==================== INITIALIZATION & MONITORING ====================
    injectStyles: function() {
      var style = document.createElement('style');
      style.id = 'whale-vip-styles';
      style.textContent =
        '@keyframes whale-pulse { ' +
          '0%, 100% { box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2); } ' +
          '50% { box-shadow: 0 4px 30px rgba(212, 175, 55, 0.6); } ' +
        '} ' +
        '@keyframes whale-fade-in { ' +
          'from { opacity: 0; transform: translateY(10px); } ' +
          'to { opacity: 1; transform: translateY(0); } ' +
        '} ' +
        '@keyframes whale-fade-out { ' +
          'from { opacity: 1; transform: translateY(0); } ' +
          'to { opacity: 0; transform: translateY(10px); } ' +
        '}';
      document.head.appendChild(style);
    },

    startMonitoring: function() {
      var self = this;

      // Initial check
      this.updateScore();

      // Periodic checks
      this.monitorInterval = setInterval(function() {
        self.updateScore();
      }, this.config.checkIntervalMs);

      console.warn('[WhaleVipNudge] Monitoring started');
    },

    updateScore: function() {
      var previousScore = this.state.currentScore;
      var newScore = this.calculateScore();

      // Update meter
      this.updateProgressMeter();

      // Show modal when threshold is reached
      if (newScore >= this.config.whaleThreshold && previousScore < this.config.whaleThreshold) {
        this.showModal();
      }

      // Show tooltip for progressive nudging
      if (newScore >= this.config.tooltipShowThreshold && newScore < this.config.whaleThreshold) {
        if (Math.random() < 0.1) { // 10% chance per check
          this.showTooltip();
        }
      }
    },

    onSpin: function() {
      // Called after each spin to recalculate score
      this.updateScore();
    },

    init: function() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          this.init();
        }.bind(this));
        return;
      }

      this.injectStyles();
      this.createProgressMeter();
      this.startMonitoring();

      console.warn('[WhaleVipNudge] Initialized');
    },

    destroy: function() {
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval);
      }

      var elementsToRemove = [
        'whale-vip-modal',
        'whale-vip-overlay',
        'whale-vip-meter',
        'whale-vip-tooltip',
        'whale-vip-styles'
      ];

      elementsToRemove.forEach(function(id) {
        var elem = document.getElementById(id);
        if (elem && elem.parentNode) {
          elem.parentNode.removeChild(elem);
        }
      });

      console.warn('[WhaleVipNudge] Destroyed');
    }
  };

  window.WhaleVipNudge = WhaleVipNudge;
})();
