/**
 * VIP Tier Progress Dashboard
 * Displays VIP tier status, progress, and benefits
 * Exposes window.VipDashboard = { init }
 */

(function() {
  'use strict';

  // Configuration
  var VIP_TIERS_CONFIG = [
    { name: 'Bronze',   icon: '🥉', threshold: 0,     bonus: 10,  color: '#cd7f32', gradient: 'linear-gradient(135deg, #8B4513, #cd7f32)' },
    { name: 'Silver',   icon: '🥈', threshold: 500,   bonus: 15,  color: '#c0c0c0', gradient: 'linear-gradient(135deg, #808080, #c0c0c0)' },
    { name: 'Gold',     icon: '🥇', threshold: 2000,  bonus: 20,  color: '#ffd700', gradient: 'linear-gradient(135deg, #daa520, #ffd700)' },
    { name: 'Platinum', icon: '💎', threshold: 10000, bonus: 35,  color: '#e5e4e2', gradient: 'linear-gradient(135deg, #b8b8b8, #e5e4e2)' },
    { name: 'Diamond',  icon: '👑', threshold: 50000, bonus: 50,  color: '#b9f2ff', gradient: 'linear-gradient(135deg, #0088cc, #b9f2ff)' }
  ];

  var STORAGE_KEY_TOKEN = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var badgeButton = null;
  var modalOverlay = null;
  var currentData = null;
  var refreshInterval = null;

  // API helper
  async function api(path, opts) {
    opts = opts || {};
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    var token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return null;
    var res = await fetch(path, Object.assign({}, opts, {
      headers: Object.assign({ 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {},
        opts.headers || {})
    }));
    return res.json();
  }

  // Get VIP tier by deposit/wagered amount
  function getTierByThreshold(amount) {
    var tier = VIP_TIERS_CONFIG[0];
    for (var i = VIP_TIERS_CONFIG.length - 1; i >= 0; i--) {
      if (amount >= VIP_TIERS_CONFIG[i].threshold) {
        tier = VIP_TIERS_CONFIG[i];
        break;
      }
    }
    return tier;
  }

  // Get next tier
  function getNextTier(currentTierName) {
    var idx = VIP_TIERS_CONFIG.findIndex(function(t) { return t.name === currentTierName; });
    return idx >= 0 && idx < VIP_TIERS_CONFIG.length - 1 ? VIP_TIERS_CONFIG[idx + 1] : null;
  }

  // Format currency
  function formatCurrency(val) {
    var num = parseFloat(val) || 0;
    return '$' + num.toFixed(2);
  }

  // Load VIP data from both endpoints
  async function loadVipData() {
    try {
      var milestonesData = await api('/api/milestones');
      var statusData = await api('/api/vip/status');

      if (!milestonesData || !milestonesData.success) {
        console.warn('[VipDashboard] Failed to load milestones data');
        return null;
      }

      // Fallback to milestones data if status endpoint is unavailable
      var vipTierName = milestonesData.currentVipTier || 'bronze';
      var totalWagered = milestonesData.totalWagered || 0;

      var currentTier = getTierByThreshold(totalWagered);
      var nextTier = getNextTier(currentTier.name);

      var combined = {
        totalWagered: totalWagered,
        currentTier: currentTier,
        nextTier: nextTier,
        progressPercent: nextTier ? Math.min(100, (totalWagered / nextTier.threshold) * 100) : 100,
        remainingToNextTier: nextTier ? Math.max(0, nextTier.threshold - totalWagered) : 0,
        allTiers: VIP_TIERS_CONFIG,
        milestones: milestonesData.milestones || [],
        statusData: statusData || {}
      };

      return combined;
    } catch (err) {
      console.warn('[VipDashboard] loadVipData error:', err.message);
      return null;
    }
  }

  // Create badge button (fixed position, bottom-right)
  function createBadgeButton() {
    var btn = document.createElement('button');
    btn.id = 'vip-dashboard-badge';
    btn.setAttribute('aria-label', 'VIP Dashboard');
    btn.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 1000;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: ${currentData ? currentData.currentTier.gradient : '#333'};
      color: white;
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      font-family: inherit;
      padding: 0;
    `;

    // Set pulsing animation if close to next tier
    if (currentData && currentData.nextTier && currentData.progressPercent >= 80) {
      var style = document.createElement('style');
      style.textContent = `
        @keyframes vip-pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4); }
          50% { box-shadow: 0 4px 20px rgba(255, 215, 0, 0.7); }
        }
        #vip-dashboard-badge.pulse-close {
          animation: vip-pulse 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
      btn.classList.add('pulse-close');
    }

    btn.textContent = currentData ? currentData.currentTier.icon : '💎';

    btn.addEventListener('mouseover', function() {
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseout', function() {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', openDashboardModal);

    return btn;
  }

  // Create and open modal
  function openDashboardModal() {
    if (modalOverlay) {
      modalOverlay.remove();
    }

    // Overlay
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'vip-dashboard-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    // Modal content
    var modal = document.createElement('div');
    modal.id = 'vip-dashboard-modal';
    modal.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      max-width: 600px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      border: 1px solid rgba(255, 215, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e0e0e0;
    `;

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      color: #ffd700;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    `;
    closeBtn.addEventListener('click', function() { modalOverlay.remove(); });

    // Header with current tier
    var header = document.createElement('div');
    header.style.cssText = `
      ${currentData ? currentData.currentTier.gradient : 'background: #333'};
      padding: 40px 30px 30px;
      border-radius: 16px 16px 0 0;
      text-align: center;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
    `;

    var tierIcon = document.createElement('div');
    tierIcon.style.cssText = `
      font-size: 72px;
      margin-bottom: 10px;
    `;
    tierIcon.textContent = currentData ? currentData.currentTier.icon : '💎';

    var tierName = document.createElement('h2');
    tierName.style.cssText = `
      margin: 0;
      font-size: 32px;
      color: white;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    `;
    tierName.textContent = currentData ? currentData.currentTier.name.toUpperCase() : 'VIP';

    var tierSubtitle = document.createElement('p');
    tierSubtitle.style.cssText = `
      margin: 8px 0 0 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    `;
    tierSubtitle.textContent = currentData ? formatCurrency(currentData.totalWagered) + ' wagered' : 'Loading...';

    header.appendChild(tierIcon);
    header.appendChild(tierName);
    header.appendChild(tierSubtitle);

    // Content wrapper
    var content = document.createElement('div');
    content.style.cssText = `
      padding: 30px;
      position: relative;
    `;

    // Progress section (if not at max tier)
    if (currentData && currentData.nextTier) {
      var progressSection = document.createElement('div');
      progressSection.style.cssText = `
        margin-bottom: 30px;
        padding-bottom: 30px;
        border-bottom: 1px solid rgba(255, 215, 0, 0.2);
      `;

      var progressTitle = document.createElement('h3');
      progressTitle.style.cssText = `
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #ffd700;
        font-weight: 600;
      `;
      progressTitle.textContent = 'Progress to Next Tier';

      // Progress bar
      var progressBarContainer = document.createElement('div');
      progressBarContainer.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        height: 24px;
        overflow: hidden;
        margin-bottom: 12px;
        border: 1px solid rgba(255, 215, 0, 0.2);
      `;

      var progressBarFill = document.createElement('div');
      progressBarFill.style.cssText = `
        height: 100%;
        width: ${currentData.progressPercent}%;
        background: linear-gradient(90deg, #ffd700, #ffed4e);
        border-radius: 10px;
        transition: width 0.6s ease;
        position: relative;
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      `;

      var shimmerStyle = document.createElement('style');
      shimmerStyle.textContent = `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `;
      document.head.appendChild(shimmerStyle);

      progressBarContainer.appendChild(progressBarFill);

      var progressText = document.createElement('p');
      progressText.style.cssText = `
        margin: 0;
        font-size: 13px;
        color: #b0b0b0;
        text-align: center;
      `;
      progressText.textContent = formatCurrency(currentData.totalWagered) + ' / ' + formatCurrency(currentData.nextTier.threshold);

      progressSection.appendChild(progressTitle);
      progressSection.appendChild(progressBarContainer);
      progressSection.appendChild(progressText);

      // Motivational text
      var motivationalText = document.createElement('p');
      motivationalText.style.cssText = `
        margin: 15px 0 0 0;
        font-size: 14px;
        color: #ffd700;
        font-weight: 600;
        text-align: center;
      `;
      motivationalText.textContent = 'You need ' + formatCurrency(currentData.remainingToNextTier) + ' more to reach ' + currentData.nextTier.name + '!';

      progressSection.appendChild(motivationalText);
      content.appendChild(progressSection);
    }

    // Benefits section
    var benefitsSection = document.createElement('div');
    benefitsSection.style.cssText = `
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.2);
    `;

    var benefitsTitle = document.createElement('h3');
    benefitsTitle.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #ffd700;
      font-weight: 600;
    `;
    benefitsTitle.textContent = 'Current Tier Benefits';

    var benefitsList = document.createElement('ul');
    benefitsList.style.cssText = `
      margin: 0;
      padding: 0;
      list-style: none;
    `;

    var bonusItem = document.createElement('li');
    bonusItem.style.cssText = `
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 14px;
      color: #e0e0e0;
    `;
    bonusItem.textContent = '✓ ' + currentData.currentTier.bonus + '% Bonus on Deposits';

    benefitsList.appendChild(bonusItem);

    benefitsSection.appendChild(benefitsTitle);
    benefitsSection.appendChild(benefitsList);
    content.appendChild(benefitsSection);

    // All tiers section
    var allTiersSection = document.createElement('div');
    allTiersSection.style.cssText = `
      margin-bottom: 20px;
    `;

    var allTiersTitle = document.createElement('h3');
    allTiersTitle.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #ffd700;
      font-weight: 600;
    `;
    allTiersTitle.textContent = 'All VIP Tiers';

    var tiersList = document.createElement('div');
    tiersList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    for (var i = 0; i < VIP_TIERS_CONFIG.length; i++) {
      var tier = VIP_TIERS_CONFIG[i];
      var tierCard = document.createElement('div');
      tierCard.style.cssText = `
        padding: 12px 15px;
        background: ${currentData && tier.name === currentData.currentTier.name ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
        border: 1px solid ${currentData && tier.name === currentData.currentTier.name ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 215, 0, 0.1)'};
        border-radius: 8px;
        font-size: 13px;
        color: #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      var tierInfo = document.createElement('div');
      tierInfo.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
      `;

      var tierIconSmall = document.createElement('span');
      tierIconSmall.style.cssText = `
        font-size: 20px;
      `;
      tierIconSmall.textContent = tier.icon;

      var tierDetails = document.createElement('div');
      tierDetails.innerHTML = '<strong>' + tier.name + '</strong><br/><span style="font-size: 12px; color: #999;">' + formatCurrency(tier.threshold) + ' wagered</span>';

      tierInfo.appendChild(tierIconSmall);
      tierInfo.appendChild(tierDetails);

      var tierStatus = document.createElement('div');
      tierStatus.style.cssText = `
        font-weight: 600;
        color: ${currentData && currentData.totalWagered >= tier.threshold ? '#4ade80' : '#999'};
        font-size: 12px;
      `;
      tierStatus.textContent = currentData && currentData.totalWagered >= tier.threshold ? '✓ Unlocked' : currentData && tier.name === currentData.currentTier.name ? '◆ Current' : '◯ Locked';

      tierCard.appendChild(tierInfo);
      tierCard.appendChild(tierStatus);
      tiersList.appendChild(tierCard);
    }

    allTiersSection.appendChild(allTiersTitle);
    allTiersSection.appendChild(tiersList);
    content.appendChild(allTiersSection);

    // Assemble modal
    modal.style.position = 'relative';
    modal.appendChild(closeBtn);
    modal.appendChild(header);
    modal.appendChild(content);

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // Close on overlay click
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        modalOverlay.remove();
      }
    });
  }

  // Refresh data
  async function refreshData() {
    var data = await loadVipData();
    if (data) {
      currentData = data;
      updateBadgeButton();
    }
  }

  // Update badge button appearance
  function updateBadgeButton() {
    if (!badgeButton) return;
    if (currentData) {
      badgeButton.style.background = currentData.currentTier.gradient;
      badgeButton.textContent = currentData.currentTier.icon;

      // Update pulse animation
      badgeButton.classList.remove('pulse-close');
      if (currentData.nextTier && currentData.progressPercent >= 80) {
        badgeButton.classList.add('pulse-close');
      }
    }
  }

  // Initialize widget
  async function init() {
    try {
      // Load initial data
      currentData = await loadVipData();

      // Create and attach badge button
      badgeButton = createBadgeButton();

      // Adjust position if milestone widget exists
      var milestoneWidget = document.getElementById('milestone-widget');
      if (milestoneWidget) {
        badgeButton.style.bottom = 'auto';
        badgeButton.style.top = '30px';
      }

      document.body.appendChild(badgeButton);

      // Listen for spin:complete event
      window.addEventListener('spin:complete', function() {
        refreshData();
      });

      // Refresh every 60 seconds
      refreshInterval = setInterval(function() {
        refreshData();
      }, 60000);

    } catch (err) {
      console.warn('[VipDashboard] init error:', err.message);
    }
  }

  // Cleanup
  function destroy() {
    if (badgeButton && badgeButton.parentNode) {
      badgeButton.parentNode.removeChild(badgeButton);
    }
    if (modalOverlay && modalOverlay.parentNode) {
      modalOverlay.parentNode.removeChild(modalOverlay);
    }
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  }

  // Expose to window
  window.VipDashboard = {
    init: init,
    destroy: destroy,
    refresh: refreshData
  };

})();
