/* =====================================================================
 *  Deposit Match Bonus — auto-fire celebration overlay
 *  50% match up to $5 on eligible deposits
 *  IIFE — no globals polluted, hooks window.updateBalance
 * ===================================================================== */
(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var DM_SHOWN_KEY = 'dmShown';
  var COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
  var CHECK_DELAY_MS = 3000;

  // ---- helpers ----

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function isCoolingDown() {
    try {
      var ts = localStorage.getItem(DM_SHOWN_KEY);
      if (!ts) return false;
      return (Date.now() - Number(ts)) < COOLDOWN_MS;
    } catch(e) { return false; }
  }

  function markShown() {
    try { localStorage.setItem(DM_SHOWN_KEY, String(Date.now())); } catch(e) {}
  }

  function apiFetch(method, path) {
    var token = getToken();
    if (!token) return Promise.resolve(null);
    var opts = {
      method: method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    };
    return fetch(path, opts)
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; });
  }

  // ---- overlay builder (pure DOM) ----

  function buildOverlay(depositAmount, matchAmount) {
    // Backdrop
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:20500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.82);opacity:0;transition:opacity 0.4s ease;';

    // Card
    var card = document.createElement('div');
    card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:2px solid #ffd700;border-radius:20px;padding:40px 48px;text-align:center;max-width:420px;width:90%;box-shadow:0 0 60px rgba(255,215,0,0.3),0 20px 60px rgba(0,0,0,0.6);transform:scale(0.7);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);';

    // Confetti top
    var confettiTop = document.createElement('div');
    confettiTop.style.cssText = 'font-size:36px;margin-bottom:8px;';
    confettiTop.textContent = '🎉✨🎊';
    card.appendChild(confettiTop);

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'font-size:28px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.5);margin-bottom:16px;letter-spacing:1px;';
    header.textContent = '💰 DEPOSIT MATCHED!';
    card.appendChild(header);

    // Description
    var desc = document.createElement('div');
    desc.style.cssText = 'font-size:17px;color:#e0e0e0;margin-bottom:8px;line-height:1.5;';
    var descText = 'Your $' + depositAmount.toFixed(2) + ' deposit earns';
    desc.textContent = descText;
    card.appendChild(desc);

    // Bonus amount
    var bonusLine = document.createElement('div');
    bonusLine.style.cssText = 'font-size:38px;font-weight:900;color:#00ff88;text-shadow:0 0 30px rgba(0,255,136,0.5);margin:12px 0 20px;';
    bonusLine.textContent = '+$' + matchAmount.toFixed(2) + ' bonus credits!';
    card.appendChild(bonusLine);

    // Confetti middle
    var confettiMid = document.createElement('div');
    confettiMid.style.cssText = 'font-size:24px;margin-bottom:20px;';
    confettiMid.textContent = '🎉💸✨💰🎊';
    card.appendChild(confettiMid);

    // Claim button
    var btn = document.createElement('button');
    btn.style.cssText = 'background:linear-gradient(135deg,#00c853,#00e676);color:#000;font-size:20px;font-weight:900;padding:16px 48px;border:none;border-radius:12px;cursor:pointer;text-transform:uppercase;letter-spacing:2px;box-shadow:0 4px 20px rgba(0,200,83,0.4);transition:transform 0.15s ease,box-shadow 0.15s ease;';
    btn.textContent = 'CLAIM NOW';
    btn.addEventListener('mouseenter', function() {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 30px rgba(0,200,83,0.6)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 20px rgba(0,200,83,0.4)';
    });
    card.appendChild(btn);

    // Rate info
    var info = document.createElement('div');
    info.style.cssText = 'font-size:12px;color:#888;margin-top:16px;';
    info.textContent = '50% match • up to $5.00 per deposit';
    card.appendChild(info);

    overlay.appendChild(card);

    // Wire claim
    btn.addEventListener('click', function() {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.textContent = 'CLAIMING...';
      claimMatch(overlay, card, matchAmount);
    });

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeOverlay(overlay);
      }
    });

    return overlay;
  }

  function showOverlay(overlay, card) {
    document.body.appendChild(overlay);
    // Force reflow then animate in
    void overlay.offsetHeight;
    overlay.style.opacity = '1';
    if (card) card.style.transform = 'scale(1)';
  }

  function closeOverlay(overlay) {
    overlay.style.opacity = '0';
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 400);
  }

  function claimMatch(overlay, card, matchAmount) {
    apiFetch('POST', '/api/depositmatch/claim').then(function(data) {
      if (!data || !data.success) {
        closeOverlay(overlay);
        return;
      }

      // Update balance if updateBalance exists
      if (typeof window.updateBalance === 'function') {
        window.updateBalance(data.newBalance);
      } else if (typeof balance !== 'undefined') {
        balance = data.newBalance;
      }

      // Replace card content with success message
      while (card.firstChild) card.removeChild(card.firstChild);

      var checkmark = document.createElement('div');
      checkmark.style.cssText = 'font-size:48px;margin-bottom:12px;';
      checkmark.textContent = '✅';
      card.appendChild(checkmark);

      var successMsg = document.createElement('div');
      successMsg.style.cssText = 'font-size:24px;font-weight:900;color:#00ff88;text-shadow:0 0 20px rgba(0,255,136,0.4);';
      successMsg.textContent = '+$' + matchAmount.toFixed(2) + ' credited!';
      card.appendChild(successMsg);

      var confettiEnd = document.createElement('div');
      confettiEnd.style.cssText = 'font-size:28px;margin-top:12px;';
      confettiEnd.textContent = '🎉✨🎊';
      card.appendChild(confettiEnd);

      markShown();

      setTimeout(function() {
        closeOverlay(overlay);
      }, 2000);
    }).catch(function() {
      closeOverlay(overlay);
    });
  }

  // ---- main check ----

  function checkAndShow() {
    if (isCoolingDown()) return;
    var token = getToken();
    if (!token) return;

    apiFetch('GET', '/api/depositmatch/status').then(function(data) {
      if (!data || !data.eligible || data.matchAmount <= 0) return;

      var overlay = buildOverlay(data.lastDeposit, data.matchAmount);
      var card = overlay.firstChild;
      showOverlay(overlay, card);
    }).catch(function() {});
  }

  // ---- poll for deposit match eligibility ----

  var _prevBalance = null;
  var _pollTimer = null;

  function startPolling() {
    // Capture initial balance
    if (typeof balance !== 'undefined') {
      _prevBalance = balance;
    }

    // Poll every 8 seconds; compare balance to detect deposits
    _pollTimer = setInterval(function() {
      var cur = (typeof balance !== 'undefined') ? balance : null;
      if (cur !== null && _prevBalance !== null && cur > _prevBalance) {
        _prevBalance = cur;
        if (!isCoolingDown()) {
          checkAndShow();
        }
      } else if (cur !== null) {
        _prevBalance = cur;
      }
    }, 8000);
  }

  // ---- init ----

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(startPolling, 3000);
      });
    } else {
      setTimeout(startPolling, 3000);
    }
  }

  init();

})();
