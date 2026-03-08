(function(){ 'use strict';

/* =====================================================
   ui-winwheel.js \u2014 Win Multiplier Wheel
   Sprint 39 \u00b7 Matrix Spins Casino
   Post-win bonus: 20% chance on wins >= $10
   ===================================================== */

var STORAGE_KEY = 'ms_winWheel';
var SEGMENTS = [1.5, 2, 1.2, 3, 1.5, 2, 5, 1.2];
var SEGMENT_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#ff6348','#00cec9'];
var TRIGGER_MIN_WIN = 10;
var TRIGGER_CHANCE = 0.02;
var COOLDOWN_MS = 10 * 60 * 1000; /* 10 minutes */
var SPIN_DURATION_MS = 4000;

/* ---------- state ---------- */

function _loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var p = JSON.parse(raw);
      return { lastTrigger: p.lastTrigger || 0 };
    }
  } catch (e) { /* ignore */ }
  return { lastTrigger: 0 };
}

function _saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ---------- balance helper ---------- */

function _creditBalance(amount) {
  if (amount <= 0) return;
  if (typeof balance !== 'undefined' && typeof updateBalance === 'function') {
    balance = (typeof balance === 'number' ? balance : 0) + amount;
    updateBalance();
  }
  if (typeof saveBalance === 'function') saveBalance();
}

/* ---------- DOM helpers ---------- */

function _el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/* ---------- overlay ---------- */

var _overlay = null;

function _buildOverlay() {
  if (_overlay) return _overlay;

  var ov = _el('div', 'ww-overlay');
  ov.id = 'winWheelOverlay';
  ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:13000;background:rgba(0,0,0,0.88);' +
    'align-items:center;justify-content:center;flex-direction:column;';

  var title = _el('div', 'ww-title', '\uD83C\uDFA1 Multiplier Wheel!');
  title.style.cssText = 'color:#ffd700;font-size:1.6rem;font-weight:bold;margin-bottom:20px;' +
    'text-shadow:0 0 10px rgba(255,215,0,0.5);';

  /* wheel container */
  var wheelWrap = _el('div', 'ww-wheel-wrap');
  wheelWrap.style.cssText = 'position:relative;width:280px;height:280px;margin-bottom:24px;';

  /* pointer */
  var pointer = _el('div', 'ww-pointer', '\u25BC');
  pointer.style.cssText = 'position:absolute;top:-18px;left:50%;transform:translateX(-50%);z-index:2;' +
    'font-size:2rem;color:#ffd700;text-shadow:0 2px 6px rgba(0,0,0,0.5);';

  /* wheel ring */
  var ring = _el('div', 'ww-ring');
  ring.style.cssText = 'width:280px;height:280px;border-radius:50%;position:relative;overflow:hidden;' +
    'border:4px solid rgba(255,215,0,0.5);box-shadow:0 0 30px rgba(255,215,0,0.2);' +
    'transition:transform ' + (SPIN_DURATION_MS / 1000) + 's cubic-bezier(0.17,0.67,0.12,0.99);';

  /* segments */
  for (var i = 0; i < SEGMENTS.length; i++) {
    var seg = _el('div', 'ww-seg');
    var angle = (360 / SEGMENTS.length);
    var rot = angle * i;
    seg.style.cssText = 'position:absolute;width:50%;height:50%;top:0;left:50%;' +
      'transform-origin:0% 100%;transform:rotate(' + (rot - 90) + 'deg) skewY(' + (-(90 - angle)) + 'deg);' +
      'background:' + SEGMENT_COLORS[i] + ';overflow:hidden;';

    var label = _el('span', 'ww-seg-label', SEGMENTS[i] + 'x');
    label.style.cssText = 'position:absolute;bottom:8px;left:6px;color:#fff;font-weight:bold;font-size:0.75rem;' +
      'transform:skewY(' + (90 - angle) + 'deg) rotate(' + (angle / 2) + 'deg);text-shadow:0 1px 3px rgba(0,0,0,0.6);';
    seg.appendChild(label);
    ring.appendChild(seg);
  }

  /* center cap */
  var cap = _el('div', 'ww-cap');
  cap.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;' +
    'border-radius:50%;background:linear-gradient(135deg,#1a1a2e,#16213e);border:3px solid #ffd700;z-index:1;' +
    'display:flex;align-items:center;justify-content:center;';
  var capIcon = _el('span', '', '\u2B50');
  capIcon.style.cssText = 'font-size:1.2rem;';
  cap.appendChild(capIcon);

  wheelWrap.appendChild(pointer);
  wheelWrap.appendChild(ring);
  wheelWrap.appendChild(cap);

  /* result */
  var result = _el('div', 'ww-result');
  result.style.cssText = 'color:#fff;font-size:1.3rem;font-weight:bold;text-align:center;' +
    'min-height:40px;opacity:0;transition:opacity 0.4s;';

  /* spin button */
  var spinBtn = _el('button', 'ww-spin-btn', 'SPIN');
  spinBtn.style.cssText = 'padding:12px 40px;border:none;border-radius:10px;font-size:1.1rem;' +
    'font-weight:bold;cursor:pointer;background:linear-gradient(135deg,#ffd700,#ffaa00);color:#000;' +
    'box-shadow:0 4px 16px rgba(255,215,0,0.3);transition:transform 0.15s;';

  ov.appendChild(title);
  ov.appendChild(wheelWrap);
  ov.appendChild(result);
  ov.appendChild(spinBtn);

  document.body.appendChild(ov);
  _overlay = { el: ov, ring: ring, result: result, spinBtn: spinBtn };
  return _overlay;
}

/* ---------- spin logic ---------- */

var _spinning = false;

function _spinWheel(winAmount) {
  if (_spinning) return;
  _spinning = true;

  var ov = _buildOverlay();
  ov.spinBtn.style.display = 'none';

  /* pick winning segment */
  var winIdx = Math.floor(Math.random() * SEGMENTS.length);
  var multiplier = SEGMENTS[winIdx];

  /* calculate rotation: multiple full turns + land on segment */
  var segAngle = 360 / SEGMENTS.length;
  var targetAngle = 360 * (5 + Math.random() * 3) + (360 - (winIdx * segAngle + segAngle / 2));

  ov.ring.style.transform = 'rotate(0deg)';
  /* force reflow */
  void ov.ring.offsetWidth;
  ov.ring.style.transform = 'rotate(' + targetAngle + 'deg)';

  var bonusAmount = Math.round((winAmount * multiplier - winAmount) * 100) / 100;
  var totalWin = Math.round(winAmount * multiplier * 100) / 100;

  setTimeout(function() {
    _creditBalance(bonusAmount);

    ov.result.textContent = multiplier + 'x \u2192 $' + totalWin.toFixed(2) + ' (+$' + bonusAmount.toFixed(2) + ')';
    ov.result.style.opacity = '1';
    ov.result.style.color = '#ffd700';

    /* auto-close after 3s */
    setTimeout(function() {
      _hideOverlay();
      _spinning = false;
    }, 3000);
  }, SPIN_DURATION_MS + 300);
}

function _showOverlay(winAmount) {
  var ov = _buildOverlay();
  ov.result.style.opacity = '0';
  ov.result.textContent = '';
  ov.ring.style.transition = 'none';
  ov.ring.style.transform = 'rotate(0deg)';
  void ov.ring.offsetWidth;
  ov.ring.style.transition = 'transform ' + (SPIN_DURATION_MS / 1000) + 's cubic-bezier(0.17,0.67,0.12,0.99)';

  ov.spinBtn.style.display = '';
  ov.spinBtn.onclick = function() { _spinWheel(winAmount); };
  ov.el.style.display = 'flex';
}

function _hideOverlay() {
  if (_overlay) _overlay.el.style.display = 'none';
}

/* ---------- public API ---------- */

window._winWheelTryTrigger = function(winAmount) {
  if (typeof winAmount !== 'number' || winAmount < TRIGGER_MIN_WIN) return false;

  var state = _loadState();
  var now = Date.now();
  if (now - state.lastTrigger < COOLDOWN_MS) return false;

  if (Math.random() > TRIGGER_CHANCE) return false;

  state.lastTrigger = now;
  _saveState(state);

  _showOverlay(winAmount);
  return true;
};

/* ---------- init ---------- */

function _init() {
  try {
    if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
  } catch (e) {}

  /* pre-build overlay on DOM ready so styles are cached */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { _buildOverlay(); });
  } else {
    _buildOverlay();
  }
}

_init();

})();
