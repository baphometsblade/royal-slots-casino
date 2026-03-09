(function() {
    'use strict';

    var STORAGE_KEY = 'ms_vipLounge';
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;
    var SPIN_THRESHOLD = 1000;
    var BONUS_AMOUNT = 25;

    var TIERS = [
        { name: 'Platinum', min: 20000, color: '#E5E4E2', benefits: ['5x XP boost', 'Exclusive games', 'Personal host', 'Priority withdrawals', 'Monthly cashback 10%'] },
        { name: 'Gold', min: 5000, color: '#FFD700', benefits: ['3x XP boost', 'Weekly cashback 5%', 'Higher bet limits', 'Birthday bonus'] },
        { name: 'Silver', min: 1000, color: '#C0C0C0', benefits: ['2x XP boost', 'Monthly cashback 3%', 'Faster withdrawals'] },
        { name: 'Bronze', min: 0, color: '#CD7F32', benefits: ['1.5x XP boost', 'Welcome bonus', 'Daily free spins'] }
    ];

    function getTier(totalWagered) {
        for (var i = 0; i < TIERS.length; i++) {
            if (totalWagered >= TIERS[i].min) {
                return TIERS[i];
            }
        }
        return TIERS[TIERS.length - 1];
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { lastShown: 0, claimed: false, totalSpins: 0, totalWagered: 0 };
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function createModal(tier, state) {
        var overlay = document.createElement('div');
        overlay.id = 'vipLoungeInvite';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10400;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s ease;';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:linear-gradient(145deg,#1a1a2e,#16213e);border:2px solid ' + tier.color + ';border-radius:16px;padding:32px;max-width:420px;width:90%;text-align:center;box-shadow:0 0 40px ' + tier.color + '44;position:relative;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;';
        closeBtn.addEventListener('click', function() { dismissModal(overlay); });

        var crownIcon = document.createElement('div');
        crownIcon.textContent = '\uD83D\uDC51';
        crownIcon.style.cssText = 'font-size:48px;margin-bottom:12px;';

        var title = document.createElement('h2');
        title.style.cssText = 'color:' + tier.color + ';margin:0 0 8px 0;font-size:24px;font-family:inherit;';
        title.textContent = 'VIP Lounge Invitation';

        var tierBadge = document.createElement('div');
        tierBadge.style.cssText = 'display:inline-block;background:' + tier.color + '22;border:1px solid ' + tier.color + ';border-radius:20px;padding:4px 16px;color:' + tier.color + ';font-size:14px;font-weight:bold;margin-bottom:16px;';
        tierBadge.textContent = tier.name + ' Tier';

        var desc = document.createElement('p');
        desc.style.cssText = 'color:#ccc;font-size:14px;margin:0 0 16px 0;line-height:1.5;';
        desc.textContent = 'Congratulations! Your dedication has earned you a spot in our exclusive VIP program.';

        var benefitsTitle = document.createElement('div');
        benefitsTitle.style.cssText = 'color:#fff;font-size:13px;font-weight:bold;margin-bottom:8px;text-align:left;';
        benefitsTitle.textContent = 'Your ' + tier.name + ' Benefits:';

        var benefitsList = document.createElement('ul');
        benefitsList.style.cssText = 'list-style:none;padding:0;margin:0 0 20px 0;text-align:left;';
        for (var i = 0; i < tier.benefits.length; i++) {
            var li = document.createElement('li');
            li.style.cssText = 'color:#aaa;font-size:13px;padding:4px 0;';
            li.textContent = '\u2713 ' + tier.benefits[i];
            benefitsList.appendChild(li);
        }

        var statsRow = document.createElement('div');
        statsRow.style.cssText = 'display:flex;justify-content:center;gap:24px;margin-bottom:20px;';

        var spinsStat = document.createElement('div');
        spinsStat.style.cssText = 'text-align:center;';
        var spinsVal = document.createElement('div');
        spinsVal.style.cssText = 'color:#fff;font-size:18px;font-weight:bold;';
        spinsVal.textContent = state.totalSpins.toLocaleString();
        var spinsLabel = document.createElement('div');
        spinsLabel.style.cssText = 'color:#888;font-size:11px;';
        spinsLabel.textContent = 'Total Spins';
        spinsStat.appendChild(spinsVal);
        spinsStat.appendChild(spinsLabel);

        var wageredStat = document.createElement('div');
        wageredStat.style.cssText = 'text-align:center;';
        var wageredVal = document.createElement('div');
        wageredVal.style.cssText = 'color:#fff;font-size:18px;font-weight:bold;';
        wageredVal.textContent = '$' + state.totalWagered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var wageredLabel = document.createElement('div');
        wageredLabel.style.cssText = 'color:#888;font-size:11px;';
        wageredLabel.textContent = 'Total Wagered';
        wageredStat.appendChild(wageredVal);
        wageredStat.appendChild(wageredLabel);

        statsRow.appendChild(spinsStat);
        statsRow.appendChild(wageredStat);

        var ctaBtn = document.createElement('button');
        ctaBtn.style.cssText = 'background:linear-gradient(135deg,' + tier.color + ',' + tier.color + 'aa);color:#000;border:none;border-radius:8px;padding:12px 32px;font-size:16px;font-weight:bold;cursor:pointer;width:100%;transition:transform 0.2s,box-shadow 0.2s;';
        ctaBtn.textContent = 'Claim $' + BONUS_AMOUNT + ' VIP Welcome Bonus';
        ctaBtn.addEventListener('mouseenter', function() { ctaBtn.style.transform = 'scale(1.03)'; ctaBtn.style.boxShadow = '0 4px 20px ' + tier.color + '66'; });
        ctaBtn.addEventListener('mouseleave', function() { ctaBtn.style.transform = 'scale(1)'; ctaBtn.style.boxShadow = 'none'; });
        ctaBtn.addEventListener('click', function() {
            if (typeof window.balance === 'number') {
                window.balance += BONUS_AMOUNT;
                if (typeof window.updateBalanceDisplay === 'function') {
                    window.updateBalanceDisplay();
                }
            }
            state.claimed = true;
            saveState(state);
            ctaBtn.textContent = '\u2713 Bonus Claimed!';
            ctaBtn.style.background = '#2d5a2d';
            ctaBtn.style.color = '#4ade80';
            ctaBtn.disabled = true;
            setTimeout(function() { dismissModal(overlay); }, 1500);
        });

        if (state.claimed) {
            ctaBtn.textContent = '\u2713 Already Claimed';
            ctaBtn.style.background = '#333';
            ctaBtn.style.color = '#888';
            ctaBtn.disabled = true;
        }

        modal.appendChild(closeBtn);
        modal.appendChild(crownIcon);
        modal.appendChild(title);
        modal.appendChild(tierBadge);
        modal.appendChild(desc);
        modal.appendChild(benefitsTitle);
        modal.appendChild(benefitsList);
        modal.appendChild(statsRow);
        modal.appendChild(ctaBtn);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) dismissModal(overlay);
        });

        return overlay;
    }

    function dismissModal(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    window.dismissVipLounge = function() {
        var el = document.getElementById('vipLoungeInvite');
        if (el) dismissModal(el);
    };

    function tryShow() {
        var state = loadState();
        if (state.totalSpins < SPIN_THRESHOLD) return;
        var now = Date.now();
        if (now - state.lastShown < COOLDOWN_MS) return;
        if (document.getElementById('vipLoungeInvite')) return;

        var tier = getTier(state.totalWagered);
        state.lastShown = now;
        saveState(state);

        var modal = createModal(tier, state);
        document.body.appendChild(modal);
    }

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        document.addEventListener('spinComplete', function(e) {
            var state = loadState();
            state.totalSpins++;
            var bet = 0;
            if (e && e.detail && typeof e.detail.bet === 'number') {
                bet = e.detail.bet;
            } else if (typeof window.currentBet === 'number') {
                bet = window.currentBet;
            }
            state.totalWagered += bet;
            saveState(state);

            if (state.totalSpins === SPIN_THRESHOLD) {
                setTimeout(tryShow, 2000);
            }
        });

        setTimeout(function() { tryShow(); }, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
