(function(){ 'use strict';

/* =====================================================
   ui-autocashout.js \u2014 Auto-Cashout Target
   Sprint 39 \u00b7 Matrix Spins Casino
   Set a balance goal; celebrate when reached
   ===================================================== */

var STORAGE_KEY = 'ms_autoCashout';
var CELEBRATION_DURATION_MS = 6000;

/* ---------- state ---------- */

function _loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var p = JSON.parse(raw);
      return {
        target: typeof p.target === 'number' ? p.target : 0,
        enabled: !!p.enabled,
        celebrated: !!p.celebrated
      };
    }
  } catch (e) { /* ignore */ }
  return { target: 0, enabled: false, celebrated: false };
}

function _saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ---------- DOM helpers ---------- */

function _el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/* ---------- panel ---------- */

var _panel = null;
var _progressBar = null;
var _progressLabel = null;
var _toggleBtn = null;
var _targetInput = null;

function _buildPanel() {
  if (_panel) return;

  var panel = _el('div', 'ac-panel');
  panel.id = 'autoCashoutPanel';
  panel.style.cssText = 'position:fixed;top:80px;right:16px;z-index:10400;width:210px;' +
    'background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;padding:14px;' +
    'border:1px solid rgba(255,215,0,0.2);box-shadow:0 4px 20px rgba(0,0,0,0.4);' +
    'color:#fff;font-family:inherit;font-size:0.85rem;display:none;';

  /* header */
  var hdr = _el('div', 'ac-hdr');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

  var title = _el('span', '', '\uD83C\uDFAF Auto-Cashout');
  title.style.cssText = 'font-weight:bold;color:#ffd700;font-size:0.9rem;';

  var closeBtn = _el('button', '', '\u2715');
  closeBtn.style.cssText = 'background:none;border:none;color:#888;font-size:1rem;cursor:pointer;padding:0;';
  closeBtn.addEventListener('click', function() { panel.style.display = 'none'; });

  hdr.appendChild(title);
  hdr.appendChild(closeBtn);

  /* target input */
  var inputRow = _el('div', 'ac-input-row');
  inputRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;';

  var dollarSign = _el('span', '', '$');
  dollarSign.style.cssText = 'color:#ffd700;font-weight:bold;';

  var input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.step = '1';
  input.style.cssText = 'flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,215,0,0.2);' +
    'border-radius:6px;padding:6px 8px;color:#fff;font-size:0.85rem;outline:none;width:80px;';
  input.placeholder = 'Target';

  var state = _loadState();
  if (state.target > 0) {
    input.value = String(state.target);
  } else {
    var curBal = typeof balance === 'number' ? balance : 100;
    input.value = String(Math.round(curBal * 2));
  }
  _targetInput = input;

  input.addEventListener('change', function() {
    var val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      var s = _loadState();
      s.target = val;
      s.celebrated = false;
      _saveState(s);
      _updateProgress();
    }
  });

  inputRow.appendChild(dollarSign);
  inputRow.appendChild(input);

  /* progress bar */
  var progressWrap = _el('div', 'ac-progress-wrap');
  progressWrap.style.cssText = 'background:rgba(255,255,255,0.08);border-radius:6px;height:18px;' +
    'position:relative;overflow:hidden;margin-bottom:10px;';

  var progressFill = _el('div', 'ac-progress-fill');
  progressFill.style.cssText = 'background:linear-gradient(90deg,#ffd700,#ffaa00);height:100%;' +
    'border-radius:6px;transition:width 0.5s ease;width:0%;';
  _progressBar = progressFill;

  var progressText = _el('span', 'ac-progress-text', '0%');
  progressText.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;' +
    'justify-content:center;font-size:0.7rem;font-weight:bold;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);';
  _progressLabel = progressText;

  progressWrap.appendChild(progressFill);
  progressWrap.appendChild(progressText);

  /* toggle button */
  var toggle = _el('button', 'ac-toggle');
  toggle.style.cssText = 'width:100%;padding:7px;border:none;border-radius:8px;font-weight:bold;' +
    'font-size:0.82rem;cursor:pointer;transition:background 0.2s;';
  _toggleBtn = toggle;

  toggle.addEventListener('click', function() {
    var s = _loadState();
    s.enabled = !s.enabled;
    if (s.enabled) {
      var val = parseFloat(_targetInput.value);
      if (!isNaN(val) && val > 0) s.target = val;
      s.celebrated = false;
    }
    _saveState(s);
    _syncToggle(s.enabled);
    _updateProgress();
  });

  panel.appendChild(hdr);
  panel.appendChild(inputRow);
  panel.appendChild(progressWrap);
  panel.appendChild(toggle);

  document.body.appendChild(panel);
  _panel = panel;

  _syncToggle(state.enabled);
  _updateProgress();
}

function _syncToggle(enabled) {
  if (!_toggleBtn) return;
  if (enabled) {
    _toggleBtn.textContent = '\u2705 Tracking ON';
    _toggleBtn.style.background = 'rgba(46,204,113,0.25)';
    _toggleBtn.style.color = '#2ecc71';
  } else {
    _toggleBtn.textContent = '\u25B6 Enable Tracking';
    _toggleBtn.style.background = 'rgba(255,215,0,0.15)';
    _toggleBtn.style.color = '#ffd700';
  }
}

function _updateProgress() {
  if (!_progressBar || !_progressLabel) return;
  var state = _loadState();
  var curBal = typeof balance === 'number' ? balance : 0;
  var pct = state.target > 0 ? Math.min(100, Math.round((curBal / state.target) * 100)) : 0;
  _progressBar.style.width = pct + '%';
  _progressLabel.textContent = '$' + curBal.toFixed(0) + ' / $' + (state.target || 0).toFixed(0) + ' (' + pct + '%)';
}

/* ---------- FAB ---------- */

function _createFab() {
  var fab = _el('button', 'ac-fab', '\uD83C\uDFAF');
  fab.style.cssText = 'position:fixed;top:80px;right:16px;z-index:10400;width:40px;height:40px;' +
    'border-radius:50%;border:2px solid rgba(255,215,0,0.3);background:linear-gradient(135deg,#1a1a2e,#16213e);' +
    'color:#ffd700;font-size:1.1rem;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,0.3);' +
    'display:flex;align-items:center;justify-content:center;transition:transform 0.15s;';

  fab.addEventListener('click', function() {
    _buildPanel();
    if (_panel.style.display === 'none' || !_panel.style.display) {
      _updateProgress();
      _panel.style.display = 'block';
      fab.style.display = 'none';
    }
  });

  document.body.appendChild(fab);

  /* re-show fab when panel closes */
  var observer = new MutationObserver(function() {
    if (_panel && (_panel.style.display === 'none')) {
      fab.style.display = 'flex';
    }
  });
  setTimeout(function() {
    if (_panel) observer.observe(_panel, { attributes: true, attributeFilter: ['style'] });
  }, 500);
}

/* ---------- celebration ---------- */

function _showCelebration(targetAmount) {
  var ov = _el('div', 'ac-celebration');
  ov.id = 'autoCashoutCelebration';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,0.85);' +
    'display:flex;align-items:center;justify-content:center;flex-direction:column;';

  var emoji = _el('div', '', '\uD83C\uDF89');
  emoji.style.cssText = 'font-size:4rem;margin-bottom:16px;animation:ac-bounce 0.6s ease infinite alternate;';

  var congrats = _el('div', '', 'GOAL REACHED!');
  congrats.style.cssText = 'color:#ffd700;font-size:2rem;font-weight:bold;margin-bottom:8px;' +
    'text-shadow:0 0 20px rgba(255,215,0,0.5);';

  var amountText = _el('div', '', 'You hit $' + targetAmount.toFixed(2) + '!');
  amountText.style.cssText = 'color:#fff;font-size:1.2rem;margin-bottom:20px;';

  /* confetti-like divs */
  var confettiWrap = _el('div', 'ac-confetti');
  confettiWrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  var confettiColors = ['#ffd700','#ff6348','#2ecc71','#3498db','#9b59b6','#ff9ff3','#00cec9'];
  for (var i = 0; i < 40; i++) {
    var piece = _el('div', '');
    var sz = 6 + Math.random() * 10;
    var left = Math.random() * 100;
    var delay = Math.random() * 2;
    var dur = 2 + Math.random() * 3;
    piece.style.cssText = 'position:absolute;top:-20px;left:' + left + '%;width:' + sz + 'px;height:' + sz + 'px;' +
      'background:' + confettiColors[i % confettiColors.length] + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';' +
      'animation:ac-fall ' + dur + 's ' + delay + 's linear infinite;opacity:0.8;';
    confettiWrap.appendChild(piece);
  }

  ov.appendChild(confettiWrap);
  ov.appendChild(emoji);
  ov.appendChild(congrats);
  ov.appendChild(amountText);

  /* inject keyframes if not yet present */
  if (!document.getElementById('ac-keyframes')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'ac-keyframes';
    styleEl.textContent = '@keyframes ac-fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1;}' +
      '100%{transform:translateY(100vh) rotate(720deg);opacity:0;}}' +
      '@keyframes ac-bounce{0%{transform:scale(1);}100%{transform:scale(1.15);}}';
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(ov);

  setTimeout(function() {
    if (ov.parentNode) ov.parentNode.removeChild(ov);
  }, CELEBRATION_DURATION_MS);
}

/* ---------- public API ---------- */

window._autoCashoutCheck = function(currentBalance) {
  if (typeof currentBalance !== 'number') return;
  var state = _loadState();
  if (!state.enabled || state.target <= 0 || state.celebrated) return;

  _updateProgress();

  if (currentBalance >= state.target) {
    state.celebrated = true;
    _saveState(state);
    _showCelebration(state.target);
  }
};

window._autoCashoutSetTarget = function(amount) {
  if (typeof amount !== 'number' || amount <= 0) return;
  var state = _loadState();
  state.target = amount;
  state.celebrated = false;
  _saveState(state);
  if (_targetInput) _targetInput.value = String(amount);
  _updateProgress();
};

/* ---------- init ---------- */

function _init() {
  try {
    if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
  } catch (e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { _createFab(); });
  } else {
    _createFab();
  }
}

_init();

})();
