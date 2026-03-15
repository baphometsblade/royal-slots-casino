(function() {
  'use strict';

  /**
   * Re-Engagement Handler
   *
   * Client-side module that:
   * - Fetches pending re-engagement campaigns from the server
   * - Displays the best pending campaign in a modal
   * - Tracks opens and conversions
   * - Awards bonuses when player converts
   *
   * Public API:
   *   window.ReEngagementHandler.init()     — Initialize on page load
   *   window.ReEngagementHandler.refresh()  — Refresh campaigns from server
   *   window.ReEngagementHandler.close()    — Close modal
   */

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────

  var state = {
    campaigns: [],
    currentCampaign: null,
    modalOpen: false,
    token: null,
    isLoggedIn: false
  };

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  /**
   * Get auth token from localStorage
   */
  function getToken() {
    var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(tokenKey);
  }

  /**
   * Make API request with auth header
   */
  async function apiRequest(path, opts) {
    opts = opts || {};
    var token = getToken();

    if (!token) {
      console.warn('[ReEngagementHandler] No auth token found');
      return null;
    }

    var headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(opts.headers || {})
    };

    try {
      var res = await fetch(path, {
        ...opts,
        headers: headers
      });

      if (!res.ok) {
        console.warn('[ReEngagementHandler] API error:', res.status, res.statusText);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.warn('[ReEngagementHandler] API request failed:', err.message);
      return null;
    }
  }

  /**
   * Get CSRF token from meta tag or cookie
   */
  function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');

    // Fallback to cookie
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.startsWith('XSRF-TOKEN=')) {
        return cookie.substring('XSRF-TOKEN='.length);
      }
    }
    return '';
  }

  /**
   * Get best campaign to show (prioritize by offer value)
   */
  function getBestCampaign() {
    if (!state.campaigns || state.campaigns.length === 0) {
      return null;
    }

    // Sort by offer value (descending) and return first that hasn't been opened
    var pending = state.campaigns.filter(function(c) {
      return !c.openedAt;
    });

    if (pending.length === 0) return null;

    pending.sort(function(a, b) {
      return (b.offerValue || 0) - (a.offerValue || 0);
    });

    return pending[0];
  }

  /**
   * Format currency
   */
  function formatCurrency(amount) {
    if (amount === 0 || !amount) return 'Free';
    return '$' + (Math.round(amount * 100) / 100).toFixed(2);
  }

  // ─────────────────────────────────────────────────────────────
  // UI Rendering
  // ─────────────────────────────────────────────────────────────

  /**
   * Inject modal styles
   */
  function injectStyles() {
    var styleId = 're-engagement-handler-styles';
    if (document.getElementById(styleId)) return;

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .re-engagement-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9900;
        display: none;
        align-items: center;
        justify-content: center;
      }

      .re-engagement-overlay.open {
        display: flex;
      }

      .re-engagement-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #ffd700;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .re-engagement-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: #ffd700;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }

      .re-engagement-close:hover {
        color: #ffed4e;
      }

      .re-engagement-header {
        margin-bottom: 24px;
      }

      .re-engagement-badge {
        display: inline-block;
        background: #ffd700;
        color: #1a1a2e;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .re-engagement-title {
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 28px;
        font-weight: bold;
      }

      .re-engagement-subtitle {
        margin: 0;
        color: #b0b0b0;
        font-size: 14px;
        line-height: 1.5;
      }

      .re-engagement-offer {
        background: rgba(255, 215, 0, 0.1);
        border-left: 4px solid #ffd700;
        padding: 16px;
        margin: 24px 0;
        border-radius: 8px;
      }

      .re-engagement-offer-label {
        font-size: 12px;
        color: #ffd700;
        text-transform: uppercase;
        font-weight: bold;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }

      .re-engagement-offer-value {
        font-size: 24px;
        color: #ffd700;
        font-weight: bold;
      }

      .re-engagement-offer-description {
        font-size: 13px;
        color: #b0b0b0;
        margin-top: 8px;
        line-height: 1.4;
      }

      .re-engagement-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }

      .re-engagement-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .re-engagement-btn-primary {
        background: #ffd700;
        color: #1a1a2e;
      }

      .re-engagement-btn-primary:hover {
        background: #ffed4e;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(255, 215, 0, 0.3);
      }

      .re-engagement-btn-primary:active {
        transform: translateY(0);
      }

      .re-engagement-btn-secondary {
        background: transparent;
        color: #ffd700;
        border: 1px solid #ffd700;
      }

      .re-engagement-btn-secondary:hover {
        background: rgba(255, 215, 0, 0.1);
      }

      .re-engagement-loading {
        text-align: center;
        padding: 20px;
        color: #b0b0b0;
      }

      .re-engagement-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255, 215, 0, 0.3);
        border-top-color: #ffd700;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create modal HTML
   */
  function createModal() {
    var container = document.createElement('div');
    container.id = 're-engagement-container';
    container.innerHTML = `
      <div class="re-engagement-overlay" id="re-engagement-overlay">
        <div class="re-engagement-modal" id="re-engagement-modal">
          <button class="re-engagement-close" id="re-engagement-close" aria-label="Close">×</button>
          <div id="re-engagement-content">
            <div class="re-engagement-loading">
              <div class="re-engagement-spinner"></div>
              <p>Loading special offer...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    return container;
  }

  /**
   * Render campaign in modal
   */
  function renderCampaign(campaign) {
    if (!campaign) {
      closeCampaignModal();
      return;
    }

    var offerLabel = '';
    switch (campaign.offerType) {
      case 'free_coins':
        offerLabel = 'Free Coins';
        break;
      case 'deposit_match':
        offerLabel = 'Deposit Match';
        break;
      case 'bonus_multiplier':
        offerLabel = 'Bonus Multiplier';
        break;
      case 'info':
        offerLabel = 'Weekly Digest';
        break;
      default:
        offerLabel = 'Special Offer';
    }

    var offerValue = campaign.offerType === 'info' ? '—' : formatCurrency(campaign.offerValue);

    var contentHtml = `
      <div class="re-engagement-header">
        <div class="re-engagement-badge">${offerLabel}</div>
        <h2 class="re-engagement-title">${campaign.campaignName}</h2>
        <p class="re-engagement-subtitle">${campaign.description}</p>
      </div>

      <div class="re-engagement-offer">
        <div class="re-engagement-offer-label">${offerLabel}</div>
        <div class="re-engagement-offer-value">${offerValue}</div>
        <div class="re-engagement-offer-description">${campaign.offerDescription}</div>
      </div>

      <div class="re-engagement-actions">
        <button class="re-engagement-btn re-engagement-btn-primary" id="re-engagement-claim-btn">
          Claim Offer
        </button>
        <button class="re-engagement-btn re-engagement-btn-secondary" id="re-engagement-later-btn">
          Maybe Later
        </button>
      </div>
    `;

    var contentDiv = document.getElementById('re-engagement-content');
    if (contentDiv) {
      contentDiv.innerHTML = contentHtml;

      // Attach event listeners
      var claimBtn = document.getElementById('re-engagement-claim-btn');
      var laterBtn = document.getElementById('re-engagement-later-btn');
      var closeBtn = document.getElementById('re-engagement-close');

      if (claimBtn) {
        claimBtn.addEventListener('click', function() {
          convertCampaign(campaign);
        });
      }

      if (laterBtn) {
        laterBtn.addEventListener('click', function() {
          closeCampaignModal();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          closeCampaignModal();
        });
      }
    }
  }

  /**
   * Show campaign modal
   */
  function showCampaignModal(campaign) {
    state.currentCampaign = campaign;
    state.modalOpen = true;

    var overlay = document.getElementById('re-engagement-overlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeCampaignModal();
        }
      });
    }

    renderCampaign(campaign);

    // Mark campaign as opened
    markCampaignOpened(campaign.id);
  }

  /**
   * Close campaign modal
   */
  function closeCampaignModal() {
    state.modalOpen = false;
    state.currentCampaign = null;

    var overlay = document.getElementById('re-engagement-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Campaign Actions
  // ─────────────────────────────────────────────────────────────

  /**
   * Mark campaign as opened
   */
  async function markCampaignOpened(campaignId) {
    var result = await apiRequest('/api/re-engagement/mark-opened/' + campaignId, {
      method: 'POST'
    });

    if (result && result.success) {
      console.warn('[ReEngagementHandler] Campaign ' + campaignId + ' marked as opened');
    }
  }

  /**
   * Convert campaign offer
   */
  async function convertCampaign(campaign) {
    var claimBtn = document.getElementById('re-engagement-claim-btn');
    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.textContent = 'Processing...';
    }

    var result = await apiRequest('/api/re-engagement/convert/' + campaign.id, {
      method: 'POST'
    });

    if (result && result.success) {
      console.warn('[ReEngagementHandler] Campaign ' + campaign.id + ' converted');

      // Show success message
      var contentDiv = document.getElementById('re-engagement-content');
      if (contentDiv) {
        var successHtml = `
          <div class="re-engagement-header" style="text-align: center;">
            <h2 class="re-engagement-title" style="color: #90ee90;">Success!</h2>
            <p class="re-engagement-subtitle" style="color: #b0b0b0;">
              ${result.message || 'Your bonus has been applied!'}
            </p>
            <button class="re-engagement-btn re-engagement-btn-primary" id="re-engagement-done-btn" style="margin-top: 20px;">
              Got It
            </button>
          </div>
        `;
        contentDiv.innerHTML = successHtml;

        var doneBtn = document.getElementById('re-engagement-done-btn');
        if (doneBtn) {
          doneBtn.addEventListener('click', function() {
            closeCampaignModal();
          });
        }
      }

      // Trigger balance update if callback exists
      if (typeof updateBalance === 'function') {
        setTimeout(updateBalance, 500);
      }
    } else {
      if (claimBtn) {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim Offer';
      }
      console.warn('[ReEngagementHandler] Campaign conversion failed:', result?.error || 'Unknown error');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Fetch campaigns from server
   */
  async function fetchCampaigns() {
    var result = await apiRequest('/api/re-engagement/my-campaigns');

    if (result && result.success && result.campaigns) {
      state.campaigns = result.campaigns;
      console.warn('[ReEngagementHandler] Fetched ' + state.campaigns.length + ' campaigns');
      return true;
    }

    return false;
  }

  /**
   * Refresh campaigns and show modal if available
   */
  async function refresh() {
    var token = getToken();
    if (!token) {
      state.isLoggedIn = false;
      return;
    }

    state.isLoggedIn = true;

    var success = await fetchCampaigns();
    if (success) {
      var best = getBestCampaign();
      if (best && !state.modalOpen) {
        // Add small delay to let page settle
        setTimeout(function() {
          showCampaignModal(best);
        }, 1000);
      }
    }
  }

  /**
   * Initialize handler on page load
   */
  async function init() {
    console.warn('[ReEngagementHandler] Initializing...');

    // Inject styles
    injectStyles();

    // Create modal
    createModal();

    // Check if user is logged in
    var token = getToken();
    if (!token) {
      console.warn('[ReEngagementHandler] User not logged in, skipping initialization');
      return;
    }

    // Fetch and display campaigns
    await refresh();

    // Poll for new campaigns every 5 minutes (only if logged in)
    setInterval(function() {
      if (getToken()) {
        refresh();
      }
    }, 300000); // 5 minutes
  }

  /**
   * Close current modal (public method)
   */
  function close() {
    closeCampaignModal();
  }

  // ─────────────────────────────────────────────────────────────
  // Expose Public API
  // ─────────────────────────────────────────────────────────────

  window.ReEngagementHandler = {
    init: init,
    refresh: refresh,
    close: close,
    fetchCampaigns: fetchCampaigns
  };

  console.warn('[ReEngagementHandler] Module loaded, call window.ReEngagementHandler.init() to start');
})();
