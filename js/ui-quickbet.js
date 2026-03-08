(function () {
  'use strict';

  /* Sprint 42 -- Quick Bet Presets Strip */

  var _strip = null;
  var _stylesInjected = false;
  var _observer = null;
  var _buttons = [];

  var PRESETS = [
    { label: 'Min', value: 0.20 },
    { label: '$1', value: 1.00 },
    { label: '$5', value: 5.00 },
    { label: 'Max', value: 500.00 }
  ];

  /* ---- QA bypass ---- */
  function _shouldBypass() {
    try {
      return new URLSearchParams(window.location.search).get('noBonus') === '1';
    } catch (e) {
      return false;
    }
  }

  /* ---- Styles ---- */
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 's42QuickBetStyles';
    s.textContent = [
      '#quickBetStrip{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);',
      'z-index:17500;display:none;align-items:center;gap:6px;',
      'background:linear-gradient(135deg,rgba(13,13,26,.92) 0%,rgba(26,16,53,.92) 100%);',
      'border:1px solid rgba(255,215,0,.2);border-radius:12px;',
      'padding:6px 10px;backdrop-filter:blur(8px)}',
      '#quickBetStrip.active{display:flex}',
      '.qb-btn{border:none;border-radius:8px;padding:7px 14px;',
      'font-size:12px;font-weight:700;cursor:pointer;',
      'background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);',
      'transition:all .2s ease;min-width:48px;text-align:center;',
      'font-family:inherit}',
      '.qb-btn:hover{background:rgba(255,255,255,.15);color:rgba(255,255,255,.9)}',
      '.qb-btn.active{background:linear-gradient(135deg,#ffd700,#f59e0b);',
      'color:#000;box-shadow:0 2px 8px rgba(255,215,0,.3)}',
      '.qb-label{color:rgba(255,255,255,.35);font-size:10px;',
      'text-transform:uppercase;letter-spacing:.5px;padding:0 4px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---- Build strip ---- */
  function _buildStrip() {
    if (_strip) return;

    _strip = document.createElement('div');
    _strip.id = 'quickBetStrip';

    var label = document.createElement('span');
    label.className = 'qb-label';
    label.textContent = 'BET';
    _strip.appendChild(label);

    _buttons = [];

    for (var i = 0; i < PRESETS.length; i++) {
      (function (preset, idx) {
        var btn = document.createElement('button');
        btn.className = 'qb-btn';
        btn.setAttribute('data-qb-value', String(preset.value));
        btn.textContent = preset.label;
        btn.addEventListener('click', function () {
          _selectPreset(idx, preset.value);
        });
        _buttons.push(btn);
        _strip.appendChild(btn);
      })(PRESETS[i], i);
    }

    document.body.appendChild(_strip);
  }

  /* ---- Select preset ---- */
  function _selectPreset(activeIdx, value) {
    /* Update active state */
    for (var i = 0; i < _buttons.length; i++) {
      if (i === activeIdx) {
        _buttons[i].classList.add('active');
      } else {
        _buttons[i].classList.remove('active');
      }
    }

    /* Set the bet */
    if (typeof window.currentBet !== 'undefined') {
      window.currentBet = value;
    }

    /* Update display if available */
    if (typeof window.updateBetDisplay === 'function') {
      window.updateBetDisplay();
    }
  }

  /* ---- Sync active button with current bet ---- */
  function _syncActiveButton() {
    if (typeof window.currentBet === 'undefined') return;
    var current = window.currentBet;
    var matched = false;

    for (var i = 0; i < PRESETS.length; i++) {
      if (Math.abs(PRESETS[i].value - current) < 0.001) {
        _buttons[i].classList.add('active');
        matched = true;
      } else {
        _buttons[i].classList.remove('active');
      }
    }

    /* No exact match -- clear all active */
    if (!matched) {
      for (var j = 0; j < _buttons.length; j++) {
        _buttons[j].classList.remove('active');
      }
    }
  }

  /* ---- Visibility ---- */
  function _showStrip() {
    if (!_strip) return;
    _strip.classList.add('active');
    _syncActiveButton();
  }

  function _hideStrip() {
    if (!_strip) return;
    _strip.classList.remove('active');
  }

  function _isSlotModalActive() {
    var modal = document.getElementById('slotModal');
    return modal && modal.classList.contains('active');
  }

  /* ---- MutationObserver for slot modal ---- */
  function _setupObserver() {
    var target = document.getElementById('slotModal');
    if (!target) {
      /* Retry a few times if slotModal not in DOM yet */
      var retries = 0;
      var retryId = setInterval(function () {
        retries++;
        target = document.getElementById('slotModal');
        if (target) {
          clearInterval(retryId);
          _attachObserver(target);
        } else if (retries > 20) {
          clearInterval(retryId);
        }
      }, 500);
      return;
    }
    _attachObserver(target);
  }

  function _attachObserver(target) {
    if (_observer) return;

    _observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'class') {
          if (_isSlotModalActive()) {
            _showStrip();
          } else {
            _hideStrip();
          }
          break;
        }
      }
    });

    _observer.observe(target, { attributes: true, attributeFilter: ['class'] });

    /* Initial check */
    if (_isSlotModalActive()) {
      _showStrip();
    }
  }

  /* ---- Public API ---- */
  function dismissQuickBet() {
    _hideStrip();
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }
  }

  /* ---- Init ---- */
  function _init() {
    if (_shouldBypass()) return;

    _injectStyles();
    _buildStrip();
    _setupObserver();
  }

  /* ---- Expose ---- */
  window.dismissQuickBet = dismissQuickBet;

  /* ---- Delayed init ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_init, 2200);
    });
  } else {
    setTimeout(_init, 2200);
  }

})();
