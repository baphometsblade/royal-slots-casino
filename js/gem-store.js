window.GemStore = (function() {
  var state = {
    gems: 0,
    packages: [],
    dailyDeal: null,
    resetTime: 0,
    isModalOpen: false
  };

  var DOM = {};

  // API helper
  var api = async function(path, opts) {
    opts = opts || {};
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    var token = localStorage.getItem(tokenKey);
    if (!token) return null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.headers) Object.assign(headers, opts.headers);
    var res = await fetch(path, Object.assign({}, opts, { headers: headers }));
    return res.json();
  };

  // Helper: get CSRF token
  var getCsrfToken = async function() {
    var res = await fetch('/api/csrf-token', { method: 'GET' });
    var data = await res.json();
    return data.token || '';
  };

  // Initialize styles
  var injectStyles = function() {
    var style = document.createElement('style');
    style.textContent = `
      @keyframes sparkle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes rainingGems {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes slideInDown {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes countdownFade {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .gem-store-btn {
        position: fixed;
        bottom: 240px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4fc3f7, #0288d1);
        border: 3px solid #d4af37;
        color: white;
        font-size: 32px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(79, 195, 247, 0.4);
        transition: all 0.3s ease;
        animation: sparkle 2s infinite;
      }
      .gem-store-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(79, 195, 247, 0.6);
      }
      .gem-store-btn:active {
        transform: scale(0.95);
      }

      .gem-store-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2000;
        display: none;
      }
      .gem-store-overlay.open {
        display: block;
      }

      .gem-store-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #0a0a1a, #1a1a2e);
        border: 2px solid #d4af37;
        border-radius: 12px;
        padding: 30px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        z-index: 2001;
        box-shadow: 0 0 40px rgba(212, 175, 55, 0.3);
        animation: slideInDown 0.3s ease;
      }

      .gem-store-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        border-bottom: 1px solid #d4af37;
        padding-bottom: 15px;
      }
      .gem-store-title {
        font-size: 28px;
        color: #d4af37;
        margin: 0;
        font-weight: bold;
      }
      .gem-store-close {
        background: none;
        border: none;
        color: #d4af37;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gem-store-close:hover {
        color: #fff;
      }

      .gem-balance-display {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        background: rgba(79, 195, 247, 0.1);
        border: 1px solid #4fc3f7;
        border-radius: 8px;
      }
      .gem-balance-label {
        color: #aaa;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }
      .gem-balance-amount {
        font-size: 48px;
        color: #4fc3f7;
        font-weight: bold;
        animation: sparkle 2s infinite;
      }
      .gem-balance-icon {
        font-size: 48px;
        margin-right: 10px;
      }

      .gem-packages-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      @media (max-width: 600px) {
        .gem-packages-grid {
          grid-template-columns: 1fr;
        }
      }

      .gem-package-card {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #333;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        position: relative;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .gem-package-card:hover {
        border-color: #4fc3f7;
        box-shadow: 0 0 20px rgba(79, 195, 247, 0.2);
        transform: translateY(-5px);
      }
      .gem-package-card.daily {
        border-color: #d4af37;
        background: linear-gradient(135deg, #2a2a1a, #1a1a0a);
        box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
      }

      .gem-package-ribbon {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #d4af37;
        color: #0a0a1a;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        animation: countdownFade 2s infinite;
      }
      .gem-package-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: #4fc3f7;
        color: #0a0a1a;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .gem-package-gems {
        font-size: 36px;
        color: #4fc3f7;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .gem-package-icon {
        font-size: 36px;
        margin-right: 8px;
      }
      .gem-package-name {
        color: #d4af37;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .gem-package-price {
        color: #999;
        font-size: 14px;
        margin-bottom: 12px;
      }
      .gem-package-bonus {
        color: #4fc3f7;
        font-size: 12px;
        margin-bottom: 15px;
        font-style: italic;
      }

      .gem-package-btn {
        background: linear-gradient(135deg, #4fc3f7, #0288d1);
        color: #0a0a1a;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .gem-package-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(79, 195, 247, 0.4);
      }
      .gem-package-btn:active {
        transform: scale(0.98);
      }

      .gem-countdown {
        text-align: center;
        color: #4fc3f7;
        font-size: 12px;
        margin-top: 10px;
        font-weight: bold;
      }

      .gem-confirm-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #0a0a1a, #1a1a2e);
        border: 2px solid #d4af37;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        z-index: 3000;
        box-shadow: 0 0 40px rgba(212, 175, 55, 0.3);
        animation: slideInDown 0.3s ease;
        display: none;
      }
      .gem-confirm-dialog.open {
        display: block;
      }

      .gem-confirm-title {
        font-size: 22px;
        color: #d4af37;
        margin-bottom: 20px;
        text-align: center;
      }
      .gem-confirm-details {
        background: rgba(79, 195, 247, 0.1);
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
      }
      .gem-confirm-gems {
        font-size: 32px;
        color: #4fc3f7;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .gem-confirm-price {
        color: #999;
        font-size: 14px;
      }

      .gem-confirm-buttons {
        display: flex;
        gap: 10px;
      }
      .gem-confirm-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.3s ease;
      }
      .gem-confirm-btn.confirm {
        background: linear-gradient(135deg, #4fc3f7, #0288d1);
        color: #0a0a1a;
      }
      .gem-confirm-btn.confirm:hover {
        transform: scale(1.05);
      }
      .gem-confirm-btn.cancel {
        background: #333;
        color: #d4af37;
        border: 1px solid #d4af37;
      }
      .gem-confirm-btn.cancel:hover {
        background: #444;
      }

      .gem-raining {
        position: fixed;
        pointer-events: none;
        z-index: 2500;
        font-size: 24px;
        animation: rainingGems 2s ease-in forwards;
      }

      .gem-store-success {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4fc3f7, #0288d1);
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        z-index: 3001;
        animation: slideInDown 0.3s ease;
        box-shadow: 0 4px 15px rgba(79, 195, 247, 0.4);
      }
      .gem-store-success-message {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .gem-store-success-gems {
        font-size: 14px;
        color: #d4af37;
      }

      .gem-store-loading {
        text-align: center;
        color: #4fc3f7;
        padding: 30px;
      }
    `;
    document.head.appendChild(style);
  };

  // Create floating button
  var createButton = function() {
    var btn = document.createElement('button');
    btn.className = 'gem-store-btn';
    btn.innerHTML = '💎';
    btn.onclick = openModal;
    document.body.appendChild(btn);
    DOM.button = btn;
  };

  // Create modal structure
  var createModal = function() {
    var overlay = document.createElement('div');
    overlay.className = 'gem-store-overlay';
    overlay.onclick = closeModal;
    document.body.appendChild(overlay);
    DOM.overlay = overlay;

    var modal = document.createElement('div');
    modal.className = 'gem-store-modal';
    modal.onclick = function(e) { e.stopPropagation(); };
    document.body.appendChild(modal);
    DOM.modal = modal;

    var confirmDialog = document.createElement('div');
    confirmDialog.className = 'gem-confirm-dialog';
    confirmDialog.onclick = function(e) { e.stopPropagation(); };
    document.body.appendChild(confirmDialog);
    DOM.confirmDialog = confirmDialog;
  };

  // Load packages
  var loadPackages = async function() {
    try {
      var res = await fetch('/api/gem-store/packages');
      var data = await res.json();
      if (data.success) {
        state.packages = data.packages || [];
        state.dailyDeal = data.dailyDeal || null;
        state.resetTime = data.resetTime || 0;
      }
    } catch (err) {
      console.warn('loadPackages error:', err);
    }
  };

  // Load gems balance
  var loadBalance = async function() {
    try {
      var data = await api('/api/gem-store/balance', {});
      if (data && data.success) {
        state.gems = data.gems || 0;
      }
    } catch (err) {
      console.warn('loadBalance error:', err);
    }
  };

  // Render modal content
  var renderModal = function() {
    if (!DOM.modal) return;

    var html = '<div class="gem-store-header">';
    html += '<h2 class="gem-store-title">💎 Gem Store</h2>';
    html += '<button class="gem-store-close" onclick="window.GemStore.closeModal()">×</button>';
    html += '</div>';

    html += '<div class="gem-balance-display">';
    html += '<div class="gem-balance-label">Your Gems</div>';
    html += '<div class="gem-balance-amount"><span class="gem-balance-icon">💎</span>' + state.gems + '</div>';
    html += '</div>';

    html += '<div class="gem-packages-grid">';

    if (state.dailyDeal) {
      var deal = state.dailyDeal;
      var hoursLeft = Math.max(0, Math.floor((state.resetTime - Date.now()) / 3600000));
      html += '<div class="gem-package-card daily">';
      html += '<div class="gem-package-ribbon">TODAY ONLY</div>';
      html += '<div class="gem-package-gems"><span class="gem-package-icon">💎</span>' + deal.gems.toLocaleString() + '</div>';
      html += '<div class="gem-package-name">' + deal.name + '</div>';
      html += '<div class="gem-package-price">$' + deal.price.toFixed(2) + '</div>';
      html += '<div class="gem-package-bonus">+' + deal.bonus + '% bonus</div>';
      html += '<button class="gem-package-btn" onclick="window.GemStore.purchase(\'' + deal.id + '\')">Buy Now</button>';
      html += '<div class="gem-countdown">Resets in ' + hoursLeft + ' hours</div>';
      html += '</div>';
    }

    state.packages.forEach(function(pkg) {
      var isBest = pkg.id === 'premium' || pkg.id === 'whale';
      html += '<div class="gem-package-card">';
      if (isBest) {
        html += '<div class="gem-package-badge">Best Value</div>';
      }
      html += '<div class="gem-package-gems"><span class="gem-package-icon">💎</span>' + pkg.gems.toLocaleString() + '</div>';
      html += '<div class="gem-package-name">' + pkg.name + '</div>';
      html += '<div class="gem-package-price">$' + pkg.price.toFixed(2) + '</div>';
      if (pkg.bonus > 0) {
        html += '<div class="gem-package-bonus">+' + pkg.bonus + '% bonus</div>';
      }
      html += '<button class="gem-package-btn" onclick="window.GemStore.purchase(\'' + pkg.id + '\')">Buy</button>';
      html += '</div>';
    });

    html += '</div>';

    DOM.modal.innerHTML = html;
  };

  // Show confirmation dialog
  var showConfirmDialog = function(packageId) {
    var pkg = null;
    if (packageId === 'daily-deal') {
      pkg = state.dailyDeal;
    } else {
      pkg = state.packages.find(function(p) { return p.id === packageId; });
    }

    if (!pkg) return;

    var html = '<div class="gem-confirm-title">Confirm Purchase</div>';
    html += '<div class="gem-confirm-details">';
    html += '<div class="gem-confirm-gems"><span class="gem-balance-icon">💎</span>' + pkg.gems.toLocaleString() + '</div>';
    html += '<div class="gem-confirm-price">$' + pkg.price.toFixed(2) + '</div>';
    html += '</div>';
    html += '<div class="gem-confirm-buttons">';
    html += '<button class="gem-confirm-btn confirm" onclick="window.GemStore._doPurchase(\'' + packageId + '\')">Confirm</button>';
    html += '<button class="gem-confirm-btn cancel" onclick="window.GemStore._closeConfirm()">Cancel</button>';
    html += '</div>';

    DOM.confirmDialog.innerHTML = html;
    DOM.confirmDialog.classList.add('open');
  };

  // Execute purchase
  var doPurchase = async function(packageId) {
    _closeConfirm();

    try {
      var csrf = await getCsrfToken();
      var headers = { 'Content-Type': 'application/json' };
      if (csrf) headers['x-csrf-token'] = csrf;

      var data = await api('/api/gem-store/purchase', {
        method: 'POST',
        body: JSON.stringify({ packageId: packageId }),
        headers: headers
      });

      if (data && data.success) {
        state.gems = data.gems;
        createGemsRain();
        showSuccessMessage(data.gemsAdded);
        renderModal();
      } else {
        console.warn('Purchase error:', data && data.error);
      }
    } catch (err) {
      console.warn('Purchase error:', err);
    }
  };

  // Create gems rain animation
  var createGemsRain = function() {
    for (var i = 0; i < 10; i++) {
      setTimeout(function() {
        var gem = document.createElement('div');
        gem.className = 'gem-raining';
        gem.textContent = '💎';
        gem.style.left = Math.random() * 100 + '%';
        gem.style.top = '-50px';
        document.body.appendChild(gem);
        setTimeout(function() { gem.remove(); }, 2000);
      }, i * 50);
    }
  };

  // Show success message
  var showSuccessMessage = function(gemsAdded) {
    var msg = document.createElement('div');
    msg.className = 'gem-store-success';
    msg.innerHTML = '<div class="gem-store-success-message">Purchase Successful! 🎉</div>';
    msg.innerHTML += '<div class="gem-store-success-gems">+' + gemsAdded.toLocaleString() + ' gems</div>';
    document.body.appendChild(msg);
    setTimeout(function() { msg.remove(); }, 3000);
  };

  // Modal control
  var openModal = async function() {
    if (state.isModalOpen) return;
    state.isModalOpen = true;
    await loadPackages();
    await loadBalance();
    renderModal();
    DOM.overlay.classList.add('open');
  };

  var closeModal = function() {
    state.isModalOpen = false;
    DOM.overlay.classList.remove('open');
  };

  var _closeConfirm = function() {
    DOM.confirmDialog.classList.remove('open');
  };

  // Public API
  var init = function() {
    injectStyles();
    createButton();
    createModal();
  };

  return {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    purchase: showConfirmDialog,
    _doPurchase: doPurchase,
    _closeConfirm: _closeConfirm
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    window.GemStore.init();
  });
} else {
  window.GemStore.init();
}
