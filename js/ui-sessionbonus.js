// Sprint 87: Session Time Bonus
// Rewards players for extended play sessions with escalating bonus credits.
// Creates a reason to keep playing longer — the longer you stay, the more you earn.
// Milestones: 10min ($0.25), 30min ($1.00), 60min ($2.50), 120min ($5.00).
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
    var MILESTONES = [
        { minutes: 10,  amount: 0.25, label: 'Warm-Up Bonus',          icon: '\uD83D\uDD25' },
        { minutes: 30,  amount: 1.00, label: 'Session Bonus',          icon: '\u2B50' },
        { minutes: 60,  amount: 2.50, label: 'Dedicated Player Bonus', icon: '\uD83C\uDFC6' },
        { minutes: 120, amount: 5.00, label: 'Marathon Bonus',         icon: '\uD83D\uDC8E' }
    ];

    // ── State ─────────────────────────────────────────────────
    var _sessionStart    = Date.now();
    var _claimedIndex    = -1; // Index of highest milestone claimed this session
    var _intervalId      = null;
    var _stylesInjected  = false;
    var _toastEl         = null;
    var _dismissTimer    = null;

    // ── QA suppression ───────────────────────────────────────
    function isSuppressed() {
        var search = window.location.search || '';
        return search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1;
    }

    // ── Styles ────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'sessionBonusStyles';
        s.textContent = [
            '#sbToast{position:fixed;bottom:90px;left:16px;z-index:25000;' +
                'background:linear-gradient(160deg,#064e3b,#065f46,#047857);' +
                'border:2px solid rgba(52,211,153,.6);border-radius:16px;' +
                'padding:16px 20px;max-width:290px;' +
                'box-shadow:0 0 30px rgba(16,185,129,.35);' +
                'color:#d1fae5;font-family:inherit;' +
                'transform:translateX(-120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
                'pointer-events:auto}',
            '#sbToast.active{transform:translateX(0)}',
            '.sb-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
            '.sb-icon{font-size:24px}',
            '.sb-title{font-size:13px;font-weight:800;color:#6ee7b7;letter-spacing:.5px;text-transform:uppercase}',
            '.sb-body{font-size:12px;color:rgba(255,255,255,.7);line-height:1.5;margin-bottom:8px}',
            '.sb-amount{color:#fbbf24;font-weight:800;font-size:16px}',
            '.sb-label{color:#a7f3d0;font-weight:700}',
            '.sb-dismiss{padding:5px 14px;border-radius:8px;font-size:11px;font-weight:700;' +
                'cursor:pointer;border:none;background:rgba(255,255,255,.15);color:rgba(255,255,255,.7);' +
                'transition:opacity .15s}',
            '.sb-dismiss:hover{opacity:.8}',
            '.sb-progress{margin-top:8px;display:flex;gap:4px}',
            '.sb-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);transition:background .3s}',
            '.sb-dot.claimed{background:#34d399}',
            '.sb-dot.current{background:#fbbf24;box-shadow:0 0 6px rgba(251,191,36,.6)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Toast UI ──────────────────────────────────────────────
    function showBonusToast(milestone, index) {
        injectStyles();

        // Remove existing toast if any
        dismissToast();

        _toastEl = document.createElement('div');
        _toastEl.id = 'sbToast';

        // Header
        var header = document.createElement('div');
        header.className = 'sb-header';
        var icon = document.createElement('span');
        icon.className = 'sb-icon';
        icon.textContent = milestone.icon;
        var title = document.createElement('span');
        title.className = 'sb-title';
        title.textContent = 'Time Bonus!';
        header.appendChild(icon);
        header.appendChild(title);

        // Body
        var body = document.createElement('div');
        body.className = 'sb-body';
        var labelSpan = document.createElement('span');
        labelSpan.className = 'sb-label';
        labelSpan.textContent = milestone.label;
        var amtSpan = document.createElement('span');
        amtSpan.className = 'sb-amount';
        amtSpan.textContent = '+$' + milestone.amount.toFixed(2);
        body.appendChild(labelSpan);
        body.appendChild(document.createElement('br'));
        body.appendChild(amtSpan);
        body.appendChild(document.createTextNode(' added to your balance!'));

        // Progress dots
        var progress = document.createElement('div');
        progress.className = 'sb-progress';
        for (var i = 0; i < MILESTONES.length; i++) {
            var dot = document.createElement('div');
            dot.className = 'sb-dot';
            if (i <= index) dot.classList.add('claimed');
            if (i === index) dot.classList.add('current');
            dot.title = MILESTONES[i].minutes + 'min: $' + MILESTONES[i].amount.toFixed(2);
            progress.appendChild(dot);
        }

        // Dismiss button
        var btn = document.createElement('button');
        btn.className = 'sb-dismiss';
        btn.textContent = 'Nice!';
        btn.addEventListener('click', dismissToast);

        _toastEl.appendChild(header);
        _toastEl.appendChild(body);
        _toastEl.appendChild(progress);
        _toastEl.appendChild(btn);
        document.body.appendChild(_toastEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_toastEl) _toastEl.classList.add('active');
            });
        });

        // Auto-dismiss after 8 seconds
        _dismissTimer = setTimeout(dismissToast, 8000);
    }

    function dismissToast() {
        if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }
        if (_toastEl) {
            _toastEl.classList.remove('active');
            var el = _toastEl;
            _toastEl = null;
            setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
        }
    }

    // ── Credit bonus ─────────────────────────────────────────
    function creditBonus(milestone) {
        if (typeof balance !== 'undefined') {
            balance += milestone.amount;
            balance = Math.round(balance * 100) / 100;
        }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
    }

    // ── Time check ───────────────────────────────────────────
    function checkMilestones() {
        if (isSuppressed()) return;

        var elapsedMs = Date.now() - _sessionStart;
        var elapsedMin = elapsedMs / 60000;

        // Find the highest unclaimed milestone we've reached
        for (var i = MILESTONES.length - 1; i >= 0; i--) {
            if (i <= _claimedIndex) break; // Already claimed this and below
            if (elapsedMin >= MILESTONES[i].minutes) {
                // Claim all milestones up to this one (in case we skipped)
                for (var j = _claimedIndex + 1; j <= i; j++) {
                    creditBonus(MILESTONES[j]);
                }
                _claimedIndex = i;

                // Show toast for the highest one
                showBonusToast(MILESTONES[i], i);

                // Also show via showWinToast if available
                if (typeof showWinToast === 'function') {
                    showWinToast(
                        MILESTONES[i].icon + ' ' + MILESTONES[i].label + ': +$' + MILESTONES[i].amount.toFixed(2),
                        'big',
                        'Session Bonus'
                    );
                }
                break;
            }
        }

        // Stop checking if all milestones claimed
        if (_claimedIndex >= MILESTONES.length - 1) {
            if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
        }
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        if (isSuppressed()) return;
        _sessionStart = Date.now();
        _intervalId = setInterval(checkMilestones, CHECK_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
