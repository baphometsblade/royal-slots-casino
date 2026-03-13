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

  var TIER_COLORS = {
    none: '#666',
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
    diamond: '#b9f2ff'
  };

  var widgetEl = null;

  function createWidget() {
    if (widgetEl) return;
    widgetEl = document.createElement('div');
    widgetEl.id = 'milestoneWidget';
    widgetEl.style.cssText = 'position:fixed;bottom:80px;left:16px;width:280px;background:rgba(20,10,40,0.95);border:1px solid rgba(255,215,0,0.3);border-radius:12px;padding:14px;z-index:9990;font-family:inherit;color:#fff;backdrop-filter:blur(10px);display:none;transition:all 0.3s ease;cursor:pointer;';
    widgetEl.innerHTML = '<div style="font-size:12px;font-weight:600;color:#ffd700;margin-bottom:8px;">VIP PROGRESS</div>' +
      '<div id="milestoneBarWrap" style="background:rgba(255,255,255,0.1);border-radius:8px;height:18px;overflow:hidden;position:relative;margin-bottom:6px;">' +
        '<div id="milestoneBar" style="height:100%;border-radius:8px;transition:width 0.8s ease;background:linear-gradient(90deg,#cd7f32,#ffd700);width:0%"></div>' +
        '<span id="milestoneBarText" style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:10px;line-height:18px;color:#fff;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,0.5)">0%</span>' +
      '</div>' +
      '<div id="milestoneInfo" style="font-size:11px;color:#ccc;"></div>' +
      '<div id="milestoneClaim" style="display:none;margin-top:8px;">' +
        '<button id="milestoneClaimBtn" style="width:100%;padding:8px;background:linear-gradient(135deg,#ffd700,#ff8c00);border:none;border-radius:6px;color:#000;font-weight:700;font-size:12px;cursor:pointer;">CLAIM REWARD</button>' +
      '</div>';
    document.body.appendChild(widgetEl);

    widgetEl.addEventListener('click', function(e) {
      if (e.target.id !== 'milestoneClaimBtn') showFullModal();
    });
  }

  var modalEl = null;

  function showFullModal() {
    if (modalEl) { modalEl.style.display = 'flex'; refresh(); return; }
    modalEl = document.createElement('div');
    modalEl.id = 'milestoneModal';
    modalEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
    modalEl.innerHTML = '<div style="background:linear-gradient(135deg,#1a0a2e,#16213e);border:1px solid rgba(255,215,0,0.3);border-radius:16px;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;color:#fff;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="margin:0;color:#ffd700;font-size:18px;">Spend Milestones</h3>' +
        '<span id="milestoneModalClose" style="cursor:pointer;font-size:24px;color:#888;line-height:1;">&times;</span>' +
      '</div>' +
      '<div id="milestoneModalBody" style="font-size:13px;"></div>' +
    '</div>';
    document.body.appendChild(modalEl);

    document.getElementById('milestoneModalClose').addEventListener('click', function() {
      modalEl.style.display = 'none';
    });
    modalEl.addEventListener('click', function(e) {
      if (e.target === modalEl) modalEl.style.display = 'none';
    });

    refresh();
  }

  var lastData = null;

  async function refresh() {
    try {
      var data = await api('/api/milestones');
      if (!data || data.error) return;
      lastData = data;
      renderWidget(data);
      if (modalEl && modalEl.style.display !== 'none') renderModal(data);
    } catch (e) {
      console.warn('[Milestones] refresh error:', e.message || e);
    }
  }

  function renderWidget(data) {
    if (!widgetEl) return;
    widgetEl.style.display = 'block';

    var next = data.nextMilestone;
    var bar = document.getElementById('milestoneBar');
    var barText = document.getElementById('milestoneBarText');
    var info = document.getElementById('milestoneInfo');
    var claimWrap = document.getElementById('milestoneClaim');

    if (next) {
      var pct = Math.min(100, Math.round((data.totalWagered / next.threshold) * 100));
      bar.style.width = pct + '%';
      bar.style.background = 'linear-gradient(90deg,' + (TIER_COLORS[data.currentTier] || '#cd7f32') + ',' + (TIER_COLORS[next.vipTier] || '#ffd700') + ')';
      barText.textContent = pct + '%';
      var remaining = Math.max(0, next.threshold - data.totalWagered);
      info.innerHTML = 'Next: <b style="color:' + (TIER_COLORS[next.vipTier] || '#ffd700') + '">' + next.label + '</b> — $' + remaining.toFixed(0) + ' to go<br><span style="font-size:10px;color:#999;">Reward: $' + next.reward + ' bonus</span>';
    } else {
      bar.style.width = '100%';
      bar.style.background = 'linear-gradient(90deg,#b9f2ff,#ffd700)';
      barText.textContent = 'MAX';
      info.innerHTML = '<b style="color:#b9f2ff">Diamond VIP</b> — All milestones claimed!';
    }

    // Check for claimable milestones
    var claimable = (data.milestones || []).filter(function(m) { return m.reached && !m.claimed; });
    if (claimable.length > 0) {
      claimWrap.style.display = 'block';
      var btn = document.getElementById('milestoneClaimBtn');
      btn.textContent = 'CLAIM $' + claimable[0].reward + ' — ' + claimable[0].label;
      btn.onclick = function(e) {
        e.stopPropagation();
        claimMilestone(claimable[0].id);
      };
    } else {
      claimWrap.style.display = 'none';
    }
  }

  function renderModal(data) {
    var body = document.getElementById('milestoneModalBody');
    if (!body) return;
    var html = '<div style="margin-bottom:12px;color:#ccc;">Total wagered: <b style="color:#ffd700;">$' + (data.totalWagered || 0).toFixed(2) + '</b> | Tier: <b style="color:' + (TIER_COLORS[data.currentTier] || '#666') + '">' + (data.currentTier || 'none').toUpperCase() + '</b></div>';

    (data.milestones || []).forEach(function(m) {
      var pct = Math.min(100, Math.round((data.totalWagered / m.threshold) * 100));
      var borderColor = m.claimed ? '#4caf50' : m.reached ? '#ffd700' : 'rgba(255,255,255,0.15)';
      var bg = m.claimed ? 'rgba(76,175,80,0.1)' : m.reached ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)';
      html += '<div style="border:1px solid ' + borderColor + ';background:' + bg + ';border-radius:10px;padding:12px;margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span style="font-weight:600;color:' + (TIER_COLORS[m.vipTier] || '#fff') + ';">' + m.label + '</span>' +
          '<span style="font-size:11px;color:' + (m.claimed ? '#4caf50' : m.reached ? '#ffd700' : '#888') + ';">' + (m.claimed ? 'CLAIMED' : m.reached ? 'READY' : pct + '%') + '</span>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.1);border-radius:6px;height:6px;margin:8px 0;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;background:' + (TIER_COLORS[m.vipTier] || '#ffd700') + ';border-radius:6px;transition:width 0.5s;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#999;">' +
          '<span>$' + m.threshold.toLocaleString() + ' wagered</span>' +
          '<span>Reward: $' + m.reward + '</span>' +
        '</div>' +
        (m.reached && !m.claimed ? '<button onclick="window.MilestoneProgress.claim(\'' + m.id + '\')" style="width:100%;margin-top:8px;padding:6px;background:linear-gradient(135deg,#ffd700,#ff8c00);border:none;border-radius:6px;color:#000;font-weight:700;font-size:11px;cursor:pointer;">CLAIM $' + m.reward + '</button>' : '') +
      '</div>';
    });

    body.innerHTML = html;
  }

  async function claimMilestone(milestoneId) {
    try {
      var result = await api('/api/milestones/claim', {
        method: 'POST',
        body: JSON.stringify({ milestoneId: milestoneId })
      });
      if (result && result.success) {
        if (typeof updateBalance === 'function') updateBalance();
        refresh();
      } else {
        console.warn('[Milestones] claim failed:', result && result.error);
      }
    } catch (e) {
      console.warn('[Milestones] claim error:', e.message || e);
    }
  }

  function init() {
    createWidget();
    refresh();
    // Refresh on spins and balance updates
    document.addEventListener('spin:complete', function() { setTimeout(refresh, 1000); });
    setInterval(refresh, 60000);
  }

  window.MilestoneProgress = { init: init, refresh: refresh, claim: claimMilestone, showModal: showFullModal };
})();
