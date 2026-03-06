(function () {
  'use strict';

  var SITE_URL  = window.location.origin;
  var SITE_NAME = 'Matrix Spins';

  var _shareBtn = null;
  var _copyBtn  = null;
  var _injected = false;
  var _observer = null;

  function getWinInfo() {
    var amtEl   = document.getElementById('bigWinAmount');
    var multEl  = document.getElementById('bigWinMultiplier');
    var amount  = amtEl  ? amtEl.textContent.trim()  : '';
    var mult    = multEl ? multEl.textContent.trim()  : '';
    var game    = (typeof currentGame !== 'undefined' && currentGame && currentGame.name)
      ? currentGame.name : SITE_NAME;
    return { amount: amount, mult: mult, game: game };
  }

  function buildShareText(info) {
    return '\uD83C\uDFB0 Just won ' + info.amount + ' (' + info.mult + ') playing '
      + info.game + ' on ' + SITE_NAME + '! Try your luck \u2192 ' + SITE_URL;
  }

  function openTwitterShare(text) {
    var url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=450');
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (_copyBtn) {
      var orig = _copyBtn.textContent;
      _copyBtn.textContent = '\u2713 Copied!';
      setTimeout(function () { if (_copyBtn) _copyBtn.textContent = orig; }, 2000);
    }
  }

  function injectButtons() {
    if (_injected) return;
    var modal = document.querySelector('#bigWinOverlay .bigwin-modal');
    if (!modal) return;
    _injected = true;

    var wrap = document.createElement('div');
    wrap.id = 'bwShareWrap';
    wrap.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:10px';

    _shareBtn = document.createElement('button');
    _shareBtn.style.cssText = [
      'background:linear-gradient(135deg,#1da1f2,#0d8ecf);color:#fff',
      'border:none;border-radius:8px;padding:7px 14px;font-size:12px',
      'font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px'
    ].join(';');
    _shareBtn.textContent = '\uD83D\uDCF1 Share on X';
    _shareBtn.addEventListener('click', function () {
      openTwitterShare(buildShareText(getWinInfo()));
    });

    _copyBtn = document.createElement('button');
    _copyBtn.style.cssText = [
      'background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)',
      'border:1px solid rgba(255,255,255,.15);border-radius:8px',
      'padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer'
    ].join(';');
    _copyBtn.textContent = '\uD83D\uDCCB Copy';
    _copyBtn.addEventListener('click', function () {
      copyText(buildShareText(getWinInfo()));
    });

    wrap.appendChild(_shareBtn);
    wrap.appendChild(_copyBtn);
    modal.appendChild(wrap);
  }

  function onOverlayChange() {
    var overlay = document.getElementById('bigWinOverlay');
    if (!overlay) return;
    var visible = overlay.style.display !== 'none' && overlay.style.display !== '';

    if (visible) {
      injectButtons();
      var wrap = document.getElementById('bwShareWrap');
      if (wrap) wrap.style.display = 'flex';
      if (_copyBtn) _copyBtn.textContent = '\uD83D\uDCCB Copy';
    } else {
      var wrap2 = document.getElementById('bwShareWrap');
      if (wrap2) wrap2.style.display = 'none';
    }
  }

  function init() {
    var overlay = document.getElementById('bigWinOverlay');
    if (!overlay) return;

    _observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'style') onOverlayChange();
      });
    });
    _observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });

    onOverlayChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
