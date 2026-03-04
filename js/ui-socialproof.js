(function() {
  'use strict';

  var _bar = null;
  var _onlineEl = null;
  var _spinsEl = null;
  var _membersEl = null;
  var _pollTimer = null;
  var _stylesInjected = false;

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'socialProofStyles';
    s.textContent = [
      '#socialProofBar{display:flex;align-items:center;justify-content:center;gap:18px;height:32px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.06);font-size:12px;color:rgba(255,255,255,.55);padding:0 12px;overflow:hidden;white-space:nowrap}',
      '#socialProofBar .sp-stat{display:inline-flex;align-items:center;gap:4px;transition:color .3s}',
      '#socialProofBar .sp-stat.flash{color:#ffd700}',
      '#socialProofBar .sp-num{font-weight:700;color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums;min-width:1ch}',
      '#socialProofBar .sp-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 4px #22c55e;animation:spPulse 2s ease-in-out infinite}',
      '@keyframes spPulse{0%,100%{opacity:1}50%{opacity:.4}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmtNum(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function buildBar() {
    if (_bar) return;

    _bar = document.createElement('div');
    _bar.id = 'socialProofBar';

    // Online now
    var s1 = document.createElement('span');
    s1.className = 'sp-stat';
    var dot = document.createElement('span');
    dot.className = 'sp-dot';
    var lbl1 = document.createTextNode(' ');
    _onlineEl = document.createElement('span');
    _onlineEl.className = 'sp-num';
    _onlineEl.textContent = '---';
    var txt1 = document.createTextNode(' playing now');
    s1.appendChild(dot);
    s1.appendChild(lbl1);
    s1.appendChild(_onlineEl);
    s1.appendChild(txt1);

    // Spins today
    var s2 = document.createElement('span');
    s2.className = 'sp-stat';
    var ico2 = document.createTextNode('\uD83C\uDFB0 ');
    _spinsEl = document.createElement('span');
    _spinsEl.className = 'sp-num';
    _spinsEl.textContent = '---';
    var txt2 = document.createTextNode(' spins today');
    s2.appendChild(ico2);
    s2.appendChild(_spinsEl);
    s2.appendChild(txt2);

    // Members
    var s3 = document.createElement('span');
    s3.className = 'sp-stat';
    var ico3 = document.createTextNode('\uD83D\uDC65 ');
    _membersEl = document.createElement('span');
    _membersEl.className = 'sp-num';
    _membersEl.textContent = '---';
    var txt3 = document.createTextNode(' members');
    s3.appendChild(ico3);
    s3.appendChild(_membersEl);
    s3.appendChild(txt3);

    var sep1 = document.createTextNode('  \u00B7  ');
    var sep2 = document.createTextNode('  \u00B7  ');

    _bar.appendChild(s1);
    _bar.appendChild(sep1);
    _bar.appendChild(s2);
    _bar.appendChild(sep2);
    _bar.appendChild(s3);

    // Insert after header, before container
    var header = document.querySelector('.casino-header') || document.querySelector('header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(_bar, header.nextSibling);
    } else {
      var container = document.querySelector('.container');
      if (container) {
        container.parentNode.insertBefore(_bar, container);
      }
    }
  }

  function animateValue(el, newVal) {
    if (!el) return;
    var current = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
    if (current === newVal) return;
    el.textContent = fmtNum(newVal);
    // Flash effect
    var parent = el.parentElement;
    if (parent) {
      parent.classList.add('flash');
      setTimeout(function() { parent.classList.remove('flash'); }, 800);
    }
  }

  function poll() {
    fetch('/api/socialproof')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      animateValue(_onlineEl, data.onlineNow || 0);
      animateValue(_spinsEl, data.spinsToday || 0);
      animateValue(_membersEl, data.registeredUsers || 0);
    })
    .catch(function() {});
  }

  function hideWhenSlotOpen() {
    if (!_bar) return;
    var slotModal = document.getElementById('slotModal');
    _bar.style.display = (slotModal && slotModal.classList.contains('active')) ? 'none' : 'flex';
  }

  function init() {
    injectStyles();
    buildBar();
    setTimeout(function() {
      poll();
      _pollTimer = setInterval(poll, 45000);
    }, 4000);

    // Observe slot modal changes to auto-hide bar
    var slotModal = document.getElementById('slotModal');
    if (slotModal) {
      var obs = new MutationObserver(hideWhenSlotOpen);
      obs.observe(slotModal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

}());
