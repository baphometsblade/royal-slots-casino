(function() {
  'use strict';

  async function api(path, opts) {
    opts = opts || {};
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    var token = localStorage.getItem(tokenKey);
    if (!token) return null;
    var res = await fetch(path, Object.assign({}, opts, {
      headers: Object.assign({ 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {},
        opts.headers || {})
    }));
    return res.json();
  }

  var bannerEl = null;
  var campaigns = [];

  function createBanner() {
    if (bannerEl) return;
    bannerEl = document.createElement('div');
    bannerEl.id = 'campaignBanner';
    bannerEl.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:9980;display:none;max-width:500px;width:92%;';
    document.body.appendChild(bannerEl);
  }

  function renderBanner(campaign) {
    if (!bannerEl || !campaign) return;

    var endDate = new Date(campaign.end_at || campaign.endAt);
    var now = new Date();
    var hoursLeft = Math.max(0, Math.round((endDate - now) / 3600000));
    var timeLabel = hoursLeft > 48 ? Math.round(hoursLeft / 24) + ' days' : hoursLeft + 'h';

    bannerEl.style.display = 'block';
    bannerEl.innerHTML = '<div style="background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,140,0,0.15));border:1px solid rgba(255,215,0,0.4);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(12px);animation:campaignPulse 3s infinite;">' +
      '<div style="flex-shrink:0;width:44px;height:44px;background:linear-gradient(135deg,#ffd700,#ff8c00);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;">🔥</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:700;color:#ffd700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (campaign.name || 'Special Offer') + '</div>' +
        '<div style="font-size:11px;color:#ddd;margin-top:2px;">' + campaign.match_percent + '% match up to $' + campaign.max_bonus + ' • Min $' + campaign.min_deposit + '</div>' +
        '<div style="font-size:10px;color:#ff8c00;margin-top:2px;">⏰ ' + timeLabel + ' remaining</div>' +
      '</div>' +
      '<button id="campaignDepositBtn" style="flex-shrink:0;padding:8px 14px;background:linear-gradient(135deg,#ffd700,#ff8c00);border:none;border-radius:8px;color:#000;font-weight:700;font-size:11px;cursor:pointer;white-space:nowrap;">DEPOSIT NOW</button>' +
      '<span id="campaignDismiss" style="flex-shrink:0;cursor:pointer;color:#666;font-size:18px;line-height:1;padding:0 4px;">&times;</span>' +
    '</div>';

    // Add CSS animation
    if (!document.getElementById('campaignBannerStyle')) {
      var style = document.createElement('style');
      style.id = 'campaignBannerStyle';
      style.textContent = '@keyframes campaignPulse{0%,100%{box-shadow:0 0 10px rgba(255,215,0,0.2)}50%{box-shadow:0 0 20px rgba(255,215,0,0.4)}}';
      document.head.appendChild(style);
    }

    document.getElementById('campaignDepositBtn').addEventListener('click', function() {
      // Navigate to wallet/deposit
      if (typeof openWalletDeposit === 'function') {
        openWalletDeposit();
      } else if (document.querySelector('[data-tab="wallet"]')) {
        document.querySelector('[data-tab="wallet"]').click();
      }
      bannerEl.style.display = 'none';
    });

    document.getElementById('campaignDismiss').addEventListener('click', function() {
      bannerEl.style.display = 'none';
      sessionStorage.setItem('campaignDismissed_' + campaign.id, '1');
    });
  }

  async function fetchCampaigns() {
    try {
      var data = await api('/api/campaigns/active');
      if (!data || data.error || !data.campaigns) return;
      campaigns = data.campaigns;

      // Show first non-dismissed campaign
      for (var i = 0; i < campaigns.length; i++) {
        if (!sessionStorage.getItem('campaignDismissed_' + campaigns[i].id)) {
          renderBanner(campaigns[i]);
          return;
        }
      }
    } catch (e) {
      console.warn('[Campaigns] fetch error:', e.message || e);
    }
  }

  function init() {
    createBanner();
    // Delay to not compete with page load
    setTimeout(fetchCampaigns, 3000);
    // Refresh hourly
    setInterval(fetchCampaigns, 3600000);
  }

  window.CampaignBanner = { init: init, refresh: fetchCampaigns };
})();
