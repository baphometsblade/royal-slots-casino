(function () {
    'use strict';

    var _stylesInjected = false;
    var _spinCheckCount = 0;

    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var style = document.createElement('style');
        style.id = 'mysteryDropStyles';
        style.textContent = [
            '#mysteryDropOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;animation:mdFadeIn .4s ease}',
            '@keyframes mdFadeIn{from{opacity:0}to{opacity:1}}',
            '#mysteryDropCard{background:linear-gradient(135deg,#1a0533,#2d1b69);border:2px solid rgba(139,92,246,.6);border-radius:20px;padding:32px 28px;text-align:center;max-width:320px;width:90%;box-shadow:0 0 60px rgba(139,92,246,.4)}',
            '.md-chest{font-size:72px;display:block;margin-bottom:16px;animation:mdChestPop .6s ease .5s both}',
            '@keyframes mdChestPop{0%{transform:scale(1)}50%{transform:scale(1.4) rotate(-5deg)}100%{transform:scale(1.1)}}',
            '.md-title{font-size:26px;font-weight:900;color:#ffd700;letter-spacing:2px;margin-bottom:8px;text-shadow:0 0 20px rgba(255,215,0,.5)}',
            '.md-sub{font-size:14px;color:rgba(255,255,255,.5);margin-bottom:20px}',
            '.md-reward-pill{background:rgba(139,92,246,.25);border:1px solid rgba(139,92,246,.5);border-radius:12px;padding:14px 20px;font-size:22px;font-weight:800;color:#c4b5fd;margin-bottom:20px;min-height:56px;display:flex;align-items:center;justify-content:center}',
            '.md-claim-btn{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:none;padding:14px 28px;border-radius:10px;font-size:17px;font-weight:800;cursor:pointer;width:100%;box-shadow:0 4px 20px rgba(139,92,246,.4)}',
            '.md-claim-btn:hover{filter:brightness(1.15)}',
            '.md-dismiss{margin-top:12px;font-size:12px;color:rgba(255,255,255,.3);cursor:pointer;background:none;border:none}'
        ].join('');
        document.head.appendChild(style);
    }
    function _rewardText(reward) {
        if (!reward) return '🎁 Surprise!';
        if (reward.type === 'credits') return '💰 +$' + parseFloat(reward.amount).toFixed(2) + ' CREDITS';
        if (reward.type === 'gems') return '💎 +' + reward.amount + ' GEMS';
        if (reward.type === 'wheel_spins') return '🎡 +' + reward.amount + ' WHEEL SPINS';
        if (reward.type === 'promo') return '🎫 PROMO CODE: ' + reward.code;
        return '🎁 Mystery Reward!';
    }

    function _showToast(msg) {
        var toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(139,92,246,.95);color:#fff;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;z-index:10400;pointer-events:none;transition:opacity .4s';
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 500);
        }, 4000);
    }

    function _showIncomingBadge(spinsLeft) {
        var navBtns = document.querySelectorAll('button, a, [role="button"]');
        var target = null;
        for (var i = 0; i < navBtns.length; i++) {
            if (navBtns[i].textContent && navBtns[i].textContent.indexOf('Bonuses') !== -1) {
                target = navBtns[i];
                break;
            }
        }
        if (target) {
            var existing = target.querySelector('.mystery-incoming-badge');
            if (!existing) {
                existing = document.createElement('span');
                existing.className = 'mystery-incoming-badge';
                existing.style.cssText = 'background:#8b5cf6;color:#fff;border-radius:10px;font-size:10px;padding:1px 5px;margin-left:4px;font-weight:800';
                target.appendChild(existing);
            }
            existing.textContent = '🎁 ' + spinsLeft;
        }
        _showToast('🎁 Mystery drop incoming in ' + spinsLeft + ' spins!');
    }

    function _removeOverlay() {
        var overlay = document.getElementById('mysteryDropOverlay');
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function _claimDrop() {
        var token = _getToken();
        var overlay = document.getElementById('mysteryDropOverlay');
        var pill = overlay ? overlay.querySelector('.md-reward-pill') : null;
        var claimBtn = overlay ? overlay.querySelector('.md-claim-btn') : null;

        if (!token) {
            if (pill) pill.textContent = 'Come back when you are logged in!';
            setTimeout(_removeOverlay, 2000);
            return;
        }

        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming...';
        }

        fetch('/api/mystery/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.success) {
                if (pill) pill.textContent = data.error || 'Could not claim right now.';
                setTimeout(_removeOverlay, 2500);
                return;
            }

            if (typeof triggerConfetti === 'function') {
                triggerConfetti();
            } else if (typeof burstParticles === 'function') {
                burstParticles(window.innerWidth / 2, window.innerHeight / 2, 60);
            }

            if (pill) pill.textContent = _rewardText(data.reward);

            setTimeout(function () {
                if (typeof updateBalance === 'function') updateBalance(data.newBalance);
            }, 1500);

            setTimeout(_removeOverlay, 2500);
        })
        .catch(function () {});
    }
    function triggerMysteryDrop(statusData) {
        if (document.getElementById('mysteryDropOverlay')) return;

        _injectStyles();

        var overlay = document.createElement('div');
        overlay.id = 'mysteryDropOverlay';

        var card = document.createElement('div');
        card.id = 'mysteryDropCard';

        var chest = document.createElement('span');
        chest.className = 'md-chest';
        chest.textContent = '🎁';

        var title = document.createElement('div');
        title.className = 'md-title';
        title.textContent = 'MYSTERY DROP!';

        var sub = document.createElement('div');
        sub.className = 'md-sub';
        sub.textContent = 'You have unlocked a secret reward';

        var pill = document.createElement('div');
        pill.className = 'md-reward-pill';
        pill.textContent = 'Opening...';

        var claimBtn = document.createElement('button');
        claimBtn.className = 'md-claim-btn';
        claimBtn.textContent = 'CLAIM YOUR REWARD!';
        claimBtn.addEventListener('click', _claimDrop);

        var dismissBtn = document.createElement('button');
        dismissBtn.className = 'md-dismiss';
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.addEventListener('click', _removeOverlay);

        card.appendChild(chest);
        card.appendChild(title);
        card.appendChild(sub);
        card.appendChild(pill);
        card.appendChild(claimBtn);
        card.appendChild(dismissBtn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var autoDismiss = setTimeout(_removeOverlay, 30000);

        claimBtn.addEventListener('click', function () {
            clearTimeout(autoDismiss);
        });
    }
    function checkMysteryStatus() {
        var token = _getToken();
        if (!token) return;

        fetch('/api/mystery', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.pending === true) {
                triggerMysteryDrop(data);
            } else if (data.spinsUntilDrop <= 20) {
                _showIncomingBadge(data.spinsUntilDrop);
            }
        })
        .catch(function () {});
    }

    var _prevUpdateBalance = window.updateBalance;
    window.updateBalance = function (newBal) {
        if (_prevUpdateBalance) _prevUpdateBalance.apply(this, arguments);
        _spinCheckCount = (_spinCheckCount || 0) + 1;
        if (_spinCheckCount % 10 === 0) checkMysteryStatus();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(checkMysteryStatus, 5000); });
    } else {
        setTimeout(checkMysteryStatus, 5000);
    }

    window.triggerMysteryDrop = triggerMysteryDrop;
    window.checkMysteryStatus = checkMysteryStatus;

}());
