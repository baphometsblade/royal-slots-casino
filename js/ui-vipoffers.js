/**
 * Sprint 64 — VIP Exclusive Offer Modal
 * Time-limited VIP modal showing exclusive deal with countdown timer.
 */
(function() {
    'use strict';

    var ELEMENT_ID = 'vipExclusiveOffer';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_vipOffer';
    var OFFER_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

    var OFFERS = [
        { title: '200% Deposit Match', desc: 'Triple your next deposit!', bonus: 25, color: '#ffd700' },
        { title: '50 Free Spins', desc: 'On any premium slot game', bonus: 10, color: '#2ecc71' },
        { title: '$25 Bonus Credit', desc: 'Added directly to your balance', bonus: 25, color: '#3498db' },
        { title: 'Cashback Weekend 20%', desc: 'Get 20% back on all weekend losses', bonus: 15, color: '#e74c3c' }
    ];

    function getTodayStr() {
        return new Date().toDateString();
    }

    function getStoredState() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function pickOffer() {
        var day = new Date().getDay() + new Date().getDate();
        return OFFERS[day % OFFERS.length];
    }

    function formatCountdown(ms) {
        if (ms <= 0) return '00:00:00';
        var h = Math.floor(ms / 3600000);
        var m = Math.floor((ms % 3600000) / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function createModal() {
        if (document.getElementById(ELEMENT_ID)) return;

        var state = getStoredState();
        var today = getTodayStr();

        // Already shown today
        if (state.shownDate === today) return;

        var offer = pickOffer();

        // Set countdown start if not set
        if (!state.countdownStart || state.offerDate !== today) {
            state.countdownStart = Date.now();
            state.offerDate = today;
            saveState(state);
        }

        var endTime = state.countdownStart + OFFER_DURATION_MS;

        // Overlay
        var overlay = document.createElement('div');
        overlay.id = ELEMENT_ID;
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:' + Z_INDEX + ';'
            + 'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;'
            + 'opacity:0;transition:opacity 0.4s;font-family:system-ui,-apple-system,sans-serif;'
            + 'backdrop-filter:blur(4px);';

        // Modal card
        var modal = document.createElement('div');
        modal.style.cssText = 'width:380px;max-width:90vw;background:linear-gradient(160deg,#4a1a6b 0%,#2d1450 40%,#1a1a2e 100%);'
            + 'border-radius:20px;border:2px solid rgba(255,215,0,0.4);'
            + 'box-shadow:0 16px 64px rgba(0,0,0,0.6),0 0 40px rgba(124,58,237,0.2),0 0 60px rgba(255,215,0,0.1);'
            + 'overflow:hidden;transform:scale(0.85) translateY(30px);'
            + 'transition:transform 0.5s cubic-bezier(0.22,1,0.36,1);';

        // VIP Badge header
        var badgeSection = document.createElement('div');
        badgeSection.style.cssText = 'text-align:center;padding:20px 20px 10px;'
            + 'background:linear-gradient(180deg,rgba(255,215,0,0.15),transparent);';

        var vipBadge = document.createElement('div');
        vipBadge.style.cssText = 'display:inline-block;background:linear-gradient(135deg,#ffd700,#daa520);'
            + 'color:#1a1a2e;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:800;'
            + 'letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;';
        vipBadge.textContent = '\u2B50 VIP EXCLUSIVE';

        var offerTitle = document.createElement('div');
        offerTitle.style.cssText = 'font-size:26px;font-weight:800;color:#ffd700;'
            + 'text-shadow:0 0 20px rgba(255,215,0,0.4);margin-bottom:6px;';
        offerTitle.textContent = offer.title;

        var offerDesc = document.createElement('div');
        offerDesc.style.cssText = 'font-size:14px;color:#ccc;';
        offerDesc.textContent = offer.desc;

        badgeSection.appendChild(vipBadge);
        badgeSection.appendChild(offerTitle);
        badgeSection.appendChild(offerDesc);

        // Timer section
        var timerSection = document.createElement('div');
        timerSection.style.cssText = 'text-align:center;padding:16px 20px;';

        var timerLabel = document.createElement('div');
        timerLabel.style.cssText = 'font-size:11px;color:#888;text-transform:uppercase;'
            + 'letter-spacing:1.5px;margin-bottom:8px;';
        timerLabel.textContent = 'Offer expires in';

        var timerDisplay = document.createElement('div');
        timerDisplay.style.cssText = 'font-size:36px;font-weight:800;color:#fff;'
            + 'font-variant-numeric:tabular-nums;letter-spacing:2px;'
            + 'text-shadow:0 0 16px rgba(124,58,237,0.5);';
        timerDisplay.textContent = formatCountdown(endTime - Date.now());

        timerSection.appendChild(timerLabel);
        timerSection.appendChild(timerDisplay);

        // Update timer every second
        var timerInterval = setInterval(function() {
            var remaining = endTime - Date.now();
            timerDisplay.textContent = formatCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(timerInterval);
                dismissModal();
            }
        }, 1000);

        // Bonus amount highlight
        var bonusSection = document.createElement('div');
        bonusSection.style.cssText = 'margin:0 20px;padding:14px;text-align:center;'
            + 'background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(255,215,0,0.1));'
            + 'border:1px solid rgba(255,215,0,0.2);border-radius:12px;';

        var bonusLabel = document.createElement('div');
        bonusLabel.style.cssText = 'font-size:11px;color:#aaa;margin-bottom:4px;';
        bonusLabel.textContent = 'Bonus Credit';

        var bonusAmount = document.createElement('div');
        bonusAmount.style.cssText = 'font-size:32px;font-weight:800;color:#ffd700;'
            + 'text-shadow:0 0 16px rgba(255,215,0,0.5);';
        bonusAmount.textContent = '$' + offer.bonus + '.00';

        bonusSection.appendChild(bonusLabel);
        bonusSection.appendChild(bonusAmount);

        // Buttons
        var btnSection = document.createElement('div');
        btnSection.style.cssText = 'padding:20px;display:flex;flex-direction:column;gap:10px;';

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = 'width:100%;padding:14px 0;'
            + 'background:linear-gradient(135deg,#ffd700,#daa520);color:#1a1a2e;'
            + 'border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;'
            + 'transition:transform 0.15s,box-shadow 0.15s;letter-spacing:1px;'
            + 'box-shadow:0 4px 20px rgba(255,215,0,0.35);text-transform:uppercase;';
        claimBtn.textContent = 'Claim Offer';
        claimBtn.onmouseenter = function() {
            claimBtn.style.transform = 'scale(1.03)';
            claimBtn.style.boxShadow = '0 6px 24px rgba(255,215,0,0.5)';
        };
        claimBtn.onmouseleave = function() {
            claimBtn.style.transform = 'scale(1)';
            claimBtn.style.boxShadow = '0 4px 20px rgba(255,215,0,0.35)';
        };
        claimBtn.onclick = function() {
            if (typeof balance !== 'undefined') {
                balance += offer.bonus;
            }
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
            claimBtn.textContent = '\u2713 Claimed!';
            claimBtn.style.background = 'linear-gradient(135deg,#2ecc71,#27ae60)';
            claimBtn.style.color = '#fff';
            claimBtn.disabled = true;
            state.shownDate = today;
            saveState(state);
            setTimeout(function() { dismissModal(); }, 1000);
        };

        var laterBtn = document.createElement('button');
        laterBtn.style.cssText = 'width:100%;padding:10px 0;background:transparent;'
            + 'color:#888;border:1px solid rgba(255,255,255,0.1);border-radius:10px;'
            + 'font-size:13px;cursor:pointer;transition:color 0.2s,border-color 0.2s;';
        laterBtn.textContent = 'Maybe Later';
        laterBtn.onmouseenter = function() {
            laterBtn.style.color = '#ccc';
            laterBtn.style.borderColor = 'rgba(255,255,255,0.25)';
        };
        laterBtn.onmouseleave = function() {
            laterBtn.style.color = '#888';
            laterBtn.style.borderColor = 'rgba(255,255,255,0.1)';
        };
        laterBtn.onclick = function() {
            state.shownDate = today;
            saveState(state);
            dismissModal();
        };

        btnSection.appendChild(claimBtn);
        btnSection.appendChild(laterBtn);

        modal.appendChild(badgeSection);
        modal.appendChild(timerSection);
        modal.appendChild(bonusSection);
        modal.appendChild(btnSection);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1) translateY(0)';
            });
        });

        function dismissModal() {
            clearInterval(timerInterval);
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.85) translateY(30px)';
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 500);
        }

        // Click overlay to close
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                state.shownDate = today;
                saveState(state);
                dismissModal();
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createModal, 8000);
        });
    } else {
        setTimeout(createModal, 8000);
    }
})();
