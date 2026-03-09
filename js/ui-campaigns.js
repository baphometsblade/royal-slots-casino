(function () {
    'use strict';

    var _countdownInterval = null;
    var _refreshInterval   = null;
    var _endTimes          = {};

    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    function _injectStyles() {
        if (document.getElementById('campaignStyles')) return;
        var s = document.createElement('style');
        s.id = 'campaignStyles';
        s.textContent = [
            '#campaignsOverlay{display:none;position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);align-items:center;justify-content:center}',
            '#campaignsOverlay.active{display:flex}',
            '#campaignsModal{position:relative;width:90%;max-width:560px;max-height:85vh;overflow-y:auto;background:#0d0d1a;border-radius:16px;border:1px solid rgba(255,215,0,.2);box-shadow:0 20px 60px rgba(0,0,0,.8);padding:24px}',
            '.cmp-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}',
            '.cmp-title{font-size:22px;font-weight:900;color:#ffd700;letter-spacing:1px}',
            '.cmp-sub{font-size:12px;color:rgba(255,255,255,.45);margin-top:4px}',
            '.cmp-close{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
            '.cmp-close:hover{background:rgba(255,255,255,.15)}',
            '.cmp-card{background:linear-gradient(135deg,#0f1a0f,#1a1a2e);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;margin-bottom:14px;transition:border-color .2s}',
            '.cmp-card:hover{border-color:rgba(255,255,255,.25)}',
            '.cmp-card.claimed{opacity:.5}',
            '.cmp-type{display:inline-block;font-size:11px;padding:3px 10px;border-radius:12px;font-weight:700;margin-bottom:10px}',
            '.cmp-type-deposit{background:rgba(59,130,246,.3);color:#93c5fd;border:1px solid rgba(59,130,246,.4)}',
            '.cmp-type-reload{background:rgba(139,92,246,.3);color:#c4b5fd;border:1px solid rgba(139,92,246,.4)}',
            '.cmp-type-promo{background:rgba(249,115,22,.3);color:#fdba74;border:1px solid rgba(249,115,22,.4)}',
            '.cmp-offer{font-size:22px;font-weight:800;color:#ffd700;margin-bottom:6px}',
            '.cmp-details{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:10px}',
            '.cmp-expiry{font-size:13px;color:#f87171;margin-bottom:12px;font-weight:600}',
            '.cmp-claim-btn{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;width:100%}',
            '.cmp-claim-btn:hover{filter:brightness(1.15)}',
            '.cmp-status{display:inline-block;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;width:100%;text-align:center;box-sizing:border-box}',
            '.cmp-status-ok{background:rgba(34,197,94,.2);color:#4ade80;border:1px solid rgba(34,197,94,.4)}',
            '.cmp-status-sold{background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3)}',
            '.cmp-code-row{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.2);border-radius:8px;padding:12px 16px;margin-bottom:12px}',
            '.cmp-code-text{font-family:monospace;font-size:20px;font-weight:800;color:#ffd700;letter-spacing:3px;flex:1}',
            '.cmp-copy-btn{background:none;border:1px solid rgba(255,255,255,.3);color:#ccc;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;white-space:nowrap}',
            '.cmp-copy-btn:hover{border-color:rgba(255,255,255,.6);color:#fff}',
            '.cmp-empty{text-align:center;padding:40px 20px;border-radius:12px;border:1px dashed rgba(255,215,0,.2)}',
            '.cmp-empty-icon{font-size:40px;margin-bottom:12px}',
            '.cmp-empty-title{font-size:16px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:6px}',
            '.cmp-empty-sub{font-size:13px;color:rgba(255,255,255,.3)}',
            '.campaign-badge{background:#ef4444;color:#fff;border-radius:10px;font-size:10px;padding:1px 5px;margin-left:4px;font-weight:700}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function _formatSecs(secs) {
        secs = Math.max(0, secs);
        var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
        if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }

    function _buildCard(c) {
        var isClaimed = c.userClaimed > 0;
        var isSoldOut = c.max_claims > 0 && c.claims_count >= c.max_claims;
        var isPromo   = c.type === 'promo_code';

        var card = document.createElement('div');
        card.className = 'cmp-card' + (isClaimed ? ' claimed' : '');

        // Type badge
        var typeBadge = document.createElement('span');
        typeBadge.className = 'cmp-type ' + (isPromo ? 'cmp-type-promo' : c.type === 'reload_bonus' ? 'cmp-type-reload' : 'cmp-type-deposit');
        typeBadge.textContent = isPromo ? '🎟️ Promo Code' : c.type === 'reload_bonus' ? '🔄 Reload Bonus' : '💳 Deposit Match';
        card.appendChild(typeBadge);

        if (isPromo && c.promoCode) {
            // Promo code row
            var codeRow = document.createElement('div');
            codeRow.className = 'cmp-code-row';
            var codeText = document.createElement('span');
            codeText.className = 'cmp-code-text';
            codeText.textContent = c.promoCode;
            var copyBtn = document.createElement('button');
            copyBtn.className = 'cmp-copy-btn';
            copyBtn.textContent = '📋 Copy';
            (function(ct, cb) {
                cb.addEventListener('click', function() {
                    navigator.clipboard && navigator.clipboard.writeText(ct.textContent).then(function() {
                        cb.textContent = '✓ Copied!'; setTimeout(function() { cb.textContent = '📋 Copy'; }, 2000);
                    });
                });
            }(codeText, copyBtn));
            codeRow.appendChild(codeText);
            codeRow.appendChild(copyBtn);
            card.appendChild(codeRow);
        } else {
            // Offer headline
            var offer = document.createElement('div');
            offer.className = 'cmp-offer';
            offer.textContent = c.bonusPct + '% Match Up To $' + parseFloat(c.maxBonus || c.max_bonus || 0).toFixed(0);
            card.appendChild(offer);
        }

        // Name
        var nameEl = document.createElement('div');
        nameEl.className = 'cmp-details';
        nameEl.textContent = c.name;
        card.appendChild(nameEl);

        // Details
        var det = document.createElement('div');
        det.className = 'cmp-details';
        det.textContent = 'Min deposit: $' + parseFloat(c.minDeposit || c.min_deposit || 0).toFixed(2) + '  ·  Wagering: ' + (c.wageringMult || c.wagering_mult || 0) + '×';
        card.appendChild(det);

        // Expiry countdown
        var expEl = document.createElement('div');
        expEl.className = 'cmp-expiry';
        expEl.id = 'cmpExp-' + c.id;
        var endMs = new Date(c.endAt || c.end_at).getTime();
        _endTimes[c.id] = endMs;
        var secsLeft = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        expEl.textContent = 'Expires in ' + _formatSecs(secsLeft);
        card.appendChild(expEl);

        // CTA
        if (isSoldOut) {
            var sold = document.createElement('div');
            sold.className = 'cmp-status cmp-status-sold';
            sold.textContent = '⌛ Sold Out';
            card.appendChild(sold);
        } else if (isClaimed) {
            var claimedBadge = document.createElement('div');
            claimedBadge.className = 'cmp-status cmp-status-ok';
            claimedBadge.textContent = '✓ Already Claimed';
            card.appendChild(claimedBadge);
        } else {
            var btn = document.createElement('button');
            btn.className = 'cmp-claim-btn';
            btn.textContent = 'CLAIM BONUS →';
            btn.addEventListener('click', function() {
                closeCampaignsModal();
                if (typeof openWalletModal === 'function') openWalletModal();
            });
            card.appendChild(btn);
        }

        return card;
    }

    function _renderCampaigns(campaigns) {
        var body = document.getElementById('campaignsBody');
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);
        _endTimes = {};

        if (!campaigns || campaigns.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'cmp-empty';
            var ico = document.createElement('div'); ico.className = 'cmp-empty-icon'; ico.textContent = '🎁';
            var t = document.createElement('div'); t.className = 'cmp-empty-title'; t.textContent = 'No active bonus offers right now.';
            var sub = document.createElement('div'); sub.className = 'cmp-empty-sub'; sub.textContent = 'Check back soon for new promotions!';
            empty.appendChild(ico); empty.appendChild(t); empty.appendChild(sub);
            body.appendChild(empty);
            return;
        }

        campaigns.forEach(function(c) { body.appendChild(_buildCard(c)); });
        _startCountdown();
    }

    function _startCountdown() {
        if (_countdownInterval) clearInterval(_countdownInterval);
        _countdownInterval = setInterval(function() {
            Object.keys(_endTimes).forEach(function(id) {
                var el = document.getElementById('cmpExp-' + id);
                if (!el) return;
                var secs = Math.max(0, Math.floor((_endTimes[id] - Date.now()) / 1000));
                el.textContent = 'Expires in ' + _formatSecs(secs);
            });
        }, 1000);
    }

    function _fetchCampaigns(callback) {
        var token = _getToken();
        if (!token) { if (callback) callback([]); return; }
        fetch('/api/campaigns', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
            .then(function(d) { if (callback) callback(d.campaigns || []); })
            .catch(function() { if (callback) callback([]); });
    }

    function _ensureModal() {
        if (document.getElementById('campaignsOverlay')) return;
        _injectStyles();

        var overlay = document.createElement('div');
        overlay.id = 'campaignsOverlay';
        overlay.addEventListener('click', function(e) { if (e.target === overlay) closeCampaignsModal(); });

        var modal = document.createElement('div');
        modal.id = 'campaignsModal';
        modal.className = 'modal';

        // Header
        var hdr = document.createElement('div');
        hdr.className = 'cmp-header';
        var titleWrap = document.createElement('div');
        var title = document.createElement('div'); title.className = 'cmp-title'; title.textContent = '🎁 BONUS OFFERS';
        var sub = document.createElement('div'); sub.className = 'cmp-sub'; sub.textContent = 'Limited-time promotions — claim before they expire!';
        titleWrap.appendChild(title); titleWrap.appendChild(sub);
        var closeBtn = document.createElement('button');
        closeBtn.className = 'cmp-close'; closeBtn.textContent = '×';
        closeBtn.addEventListener('click', closeCampaignsModal);
        hdr.appendChild(titleWrap); hdr.appendChild(closeBtn);

        // Body
        var body = document.createElement('div');
        body.id = 'campaignsBody';

        modal.appendChild(hdr);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function openCampaignsModal() {
        _ensureModal();
        var overlay = document.getElementById('campaignsOverlay');
        overlay.classList.add('active');
        document.addEventListener('keydown', _onEsc);

        _fetchCampaigns(function(campaigns) {
            _renderCampaigns(campaigns);
        });

        // Auto-refresh while open
        if (_refreshInterval) clearInterval(_refreshInterval);
        _refreshInterval = setInterval(function() {
            _fetchCampaigns(function(campaigns) { _renderCampaigns(campaigns); });
        }, 60000);
    }

    function closeCampaignsModal() {
        var overlay = document.getElementById('campaignsOverlay');
        if (overlay) overlay.classList.remove('active');
        if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
        if (_refreshInterval)   { clearInterval(_refreshInterval);   _refreshInterval = null; }
        document.removeEventListener('keydown', _onEsc);
    }

    function _onEsc(e) { if (e.key === 'Escape') closeCampaignsModal(); }

    function checkActiveCampaigns() {
        var token = _getToken();
        if (!token) return;
        fetch('/api/campaigns', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function(d) {
                var camps = d.campaigns || [];
                var unclaimed = camps.filter(function(c) { return !c.userClaimed || c.userClaimed < 1; });
                if (unclaimed.length > 0) {
                    _updateNavBadge(unclaimed.length);
                    _showCampaignToast(unclaimed.length);
                }
            })
            .catch(function() { /* silent */ });
    }

    function _updateNavBadge(count) {
        document.querySelectorAll('.nav-btn').forEach(function(btn) {
            if (btn.textContent.indexOf('Bonuses') === -1) return;
            var badge = btn.querySelector('.campaign-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'campaign-badge';
                btn.appendChild(badge);
            }
            badge.textContent = count;
        });
    }

    function _showCampaignToast(count) {
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10400;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.5);animation:cmpToastIn .3s ease';
        var style = document.createElement('style');
        style.textContent = '@keyframes cmpToastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
        document.head.appendChild(style);
        t.textContent = '🎁 ' + count + ' bonus offer' + (count > 1 ? 's' : '') + ' available!';
        document.body.appendChild(t);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 5000);
    }

    // Auto-check on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(checkActiveCampaigns, 3000); });
    } else {
        setTimeout(checkActiveCampaigns, 3000);
    }

    window.openCampaignsModal    = openCampaignsModal;
    window.closeCampaignsModal   = closeCampaignsModal;
    window.checkActiveCampaigns  = checkActiveCampaigns;
}());
