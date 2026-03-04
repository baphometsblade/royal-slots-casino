(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#refOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:19200;display:none;align-items:center;justify-content:center}',
      '#refOverlay.active{display:flex}',
      '#refModal{background:linear-gradient(135deg,#0f172a,#1e1b4b);border:2px solid rgba(99,102,241,.4);border-radius:18px;padding:28px 32px;max-width:420px;width:90%;text-align:center}',
      '#refModal h2{color:#818cf8;font-size:20px;margin:0 0 6px}',
      '#refModal .ref-sub{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:18px}',
      '#refModal .ref-code-box{background:rgba(99,102,241,.1);border:2px dashed rgba(99,102,241,.4);border-radius:10px;padding:14px;margin-bottom:16px}',
      '#refModal .ref-code{font-size:26px;font-weight:900;color:#a5b4fc;letter-spacing:3px;font-family:monospace}',
      '#refModal .ref-count{font-size:12px;color:rgba(255,255,255,.4);margin-top:4px}',
      '#refCopyBtn{background:linear-gradient(135deg,#4f46e5,#3730a3);color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;width:100%;margin-bottom:8px}',
      '#refCopyBtn:active{transform:scale(0.98)}',
      '#refMsg{font-size:13px;color:#818cf8;min-height:18px;margin-bottom:10px}',
      '#refClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
      '#refModal .ref-reward{font-size:12px;color:rgba(255,255,255,.35);margin-top:12px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'refOverlay';

    var modal = document.createElement('div');
    modal.id = 'refModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:8px';
    icon.textContent = '\uD83D\uDC65';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'Refer a Friend';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'ref-sub';
    sub.textContent = 'Share your code and both get $2.00 when they join';
    modal.appendChild(sub);

    var codeBox = document.createElement('div');
    codeBox.className = 'ref-code-box';

    var codeEl = document.createElement('div');
    codeEl.className = 'ref-code';
    codeEl.id = 'refCode';
    codeEl.textContent = 'Loading...';
    codeBox.appendChild(codeEl);

    var countEl = document.createElement('div');
    countEl.className = 'ref-count';
    countEl.id = 'refCount';
    codeBox.appendChild(countEl);

    modal.appendChild(codeBox);

    var copyBtn = document.createElement('button');
    copyBtn.id = 'refCopyBtn';
    copyBtn.textContent = '\uD83D\uDCCB COPY CODE';
    copyBtn.addEventListener('click', function() {
      var codeText = document.getElementById('refCode');
      if (!codeText || codeText.textContent === 'Loading...') return;
      var txt = codeText.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function() {
          copyBtn.textContent = '\u2705 Copied!';
          setTimeout(function() { copyBtn.textContent = '\uD83D\uDCCB COPY CODE'; }, 2000);
        }).catch(function() { fallbackCopy(txt, copyBtn); });
      } else {
        fallbackCopy(txt, copyBtn);
      }
    });
    modal.appendChild(copyBtn);

    var msg = document.createElement('div');
    msg.id = 'refMsg';
    modal.appendChild(msg);

    var reward = document.createElement('div');
    reward.className = 'ref-reward';
    reward.textContent = 'Both you and your friend receive $2.00 bonus credits on registration';
    modal.appendChild(reward);

    var close = document.createElement('button');
    close.id = 'refClose';
    close.textContent = 'Close';
    close.addEventListener('click', closeReferralModal);
    modal.appendChild(close);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeReferralModal();
    });
    document.body.appendChild(_overlay);
  }

  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = '\u2705 Copied!';
      setTimeout(function() { btn.textContent = '\uD83D\uDCCB COPY CODE'; }, 2000);
    } catch(e) {}
    document.body.removeChild(ta);
  }

  function openReferralModal() {
    injectStyles();
    buildModal();
    var token = getToken();
    if (!token) return;

    var codeEl = document.getElementById('refCode');
    var countEl = document.getElementById('refCount');
    var msg = document.getElementById('refMsg');
    if (msg) msg.textContent = '';

    fetch('/api/referralbonus/mycode', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      if (codeEl) codeEl.textContent = data.code || '---';
      if (countEl) {
        var c = data.referralCount || 0;
        var earned = parseFloat(data.bonusEarned || 0).toFixed(2);
        countEl.textContent = c + ' friend' + (c === 1 ? '' : 's') + ' referred \u2022 $' + earned + ' earned';
      }
    })
    .catch(function() {
      if (codeEl) codeEl.textContent = 'Unavailable';
    });

    _overlay.classList.add('active');
  }

  function closeReferralModal() {
    if (_overlay) _overlay.classList.remove('active');
  }

  window.openReferralModal  = openReferralModal;
  window.closeReferralModal = closeReferralModal;

}());
