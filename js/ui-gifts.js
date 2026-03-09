/* ui-gifts.js - Player Gift System
 * Exposes: window.openGiftsModal(), window.closeGiftsModal(), window.checkGiftInbox()
 * No ES modules - runs in global scope after globals.js
 */
(function () {
    'use strict';

    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    function _authHeaders() {
        var t = _getToken();
        return t
            ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }
            : { 'Content-Type': 'application/json' };
    }

    function _isLoggedIn() { return !!_getToken(); }

    function _esc(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _fmt(n) { return '$'+Number(n).toFixed(2); }

    function _toast(msg,type) {
        if (typeof showToast==='function') { showToast(msg,type||'info'); }
        else { console.log('[Gifts] '+msg); }
    }

    function _injectStyles() {
        if (document.getElementById('giftsStyles')) return;
        var s = document.createElement('style');
        s.id = 'giftsStyles';
        s.textContent = [
            '#giftsOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,0.78);display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}',
            '.gifts-modal{background:#1a1a2e;border:1px solid #d4a032;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-sizing:border-box;font-family:inherit;color:#e2e8f0;position:relative;}',
            '.gifts-modal h2{margin:0;font-size:1.35rem;color:#f0c040;letter-spacing:1px;}',
            '.gifts-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}',
            '.gifts-close-btn{background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;padding:2px 8px;border-radius:8px;line-height:1;}',
            '.gifts-tabs{display:flex;gap:8px;margin-bottom:18px;}',
            '.gifts-tab-pill{flex:1;padding:9px 0;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#94a3b8;font-size:0.85rem;cursor:pointer;text-align:center;transition:background 0.15s,color 0.15s;}',
            '.gifts-tab-pill.active{background:#d4a032;color:#1a1a2e;border-color:#d4a032;font-weight:700;}',
            '.gifts-tab-content{display:none;}',
            '.gifts-tab-content.active{display:block;}',
            '.gift-form-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;}',
            '.gift-form-label{font-size:0.78rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;display:block;}',
            '.gift-text-input{width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 12px;color:#e2e8f0;font-size:0.88rem;outline:none;}',
            '.gift-text-input:focus{border-color:#d4a032;}',
            '.gift-amount-ctrl{display:flex;align-items:center;gap:6px;}',
            '.gift-amount-ctrl button{background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;width:32px;height:32px;font-size:1.1rem;cursor:pointer;}',
            '.gift-amount-input{width:80px;text-align:center;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 8px;color:#e2e8f0;font-size:0.9rem;outline:none;}',
            '.gift-balance-display{font-size:0.78rem;color:#64748b;margin-left:4px;}',
            '.gift-message-area{width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 12px;color:#e2e8f0;font-size:0.85rem;outline:none;resize:vertical;min-height:60px;}',
            '.gift-send-btn{width:100%;padding:13px;background:linear-gradient(135deg,#d4a032,#f0c040);color:#1a1a2e;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:4px;}',
            '.gift-send-btn:disabled{opacity:0.55;cursor:not-allowed;}',
            '.gift-status-msg{margin-top:10px;font-size:0.85rem;min-height:20px;text-align:center;}',
            '.gift-inbox-row{display:flex;align-items:center;gap:12px;padding:11px 12px;background:#0f172a;border-radius:8px;margin-bottom:6px;}',
            '.gift-inbox-icon{font-size:1.5rem;flex-shrink:0;}',
            '.gift-inbox-text{flex:1;min-width:0;}',
            '.gift-inbox-text .gift-from{font-size:0.88rem;color:#e2e8f0;font-weight:600;}',
            '.gift-inbox-text .gift-msg{font-style:italic;font-size:0.78rem;color:#64748b;margin-top:3px;word-break:break-word;}',
            '.gift-claim-btn{flex-shrink:0;background:#14532d;border:1px solid #22c55e;color:#22c55e;border-radius:8px;padding:7px 12px;font-size:0.82rem;font-weight:700;cursor:pointer;}',
            '.gift-claim-btn:disabled{opacity:0.5;cursor:not-allowed;}',
            '.gift-claimed-label{flex-shrink:0;font-size:0.8rem;color:#64748b;font-style:italic;}',
            '.gift-empty-state{text-align:center;padding:24px 0;color:#475569;font-size:0.88rem;}',
            '.gift-sent-toggle{margin-top:14px;text-align:center;}',
            '.gift-sent-toggle a{color:#64748b;font-size:0.78rem;cursor:pointer;text-decoration:underline;}',
            '.gift-sent-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#0f172a;border-radius:7px;margin-bottom:5px;font-size:0.83rem;}',
            '.gift-sent-row .gift-to{color:#cbd5e1;}',
            '.gift-sent-row .gift-amt{color:#a78bfa;font-weight:700;margin:0 8px;}',
            '.gift-status-pending{background:#78350f;color:#fbbf24;border-radius:12px;padding:2px 8px;font-size:0.72rem;font-weight:600;}',
            '.gift-status-claimed{background:#14532d;color:#34d399;border-radius:12px;padding:2px 8px;font-size:0.72rem;font-weight:600;}',
            '.gift-badge{display:inline-block;font-size:11px;background:#ff4444;color:#fff;border-radius:10px;padding:1px 5px;margin-left:4px;vertical-align:middle;font-weight:700;line-height:1.4;}',
            '.gifts-section-title{font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;}',
            '.gifts-inbox-loading{text-align:center;padding:20px;color:#475569;font-size:0.85rem;}'
        ].join('\n');
        document.head.appendChild(s);
    }

    var _overlay = null;
    var _activeTab = 'send';
    var _sentVisible = false;

    function _buildModal() {
        if (_overlay) return;
        _injectStyles();
        _overlay = document.createElement('div');
        _overlay.id = 'giftsOverlay';
        _overlay.className = 'modal-overlay';
        var modal = document.createElement('div');
        modal.id = 'giftsModal';
        modal.className = 'modal gifts-modal';
        // Header
        var header = document.createElement('div');
        header.className = 'gifts-header';
        var title = document.createElement('h2');
        title.textContent = '🎁 GIFTS';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'gifts-close-btn';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', closeGiftsModal);
        header.appendChild(title);
        header.appendChild(closeBtn);
        // Tabs
        var tabs = document.createElement('div');
        tabs.className = 'gifts-tabs';
        var tabSend = document.createElement('button');
        tabSend.className = 'gifts-tab-pill active';
        tabSend.id = 'giftsTabSend';
        tabSend.textContent = 'Send a Gift';
        tabSend.addEventListener('click', function () { _switchTab('send'); });
        var tabInbox = document.createElement('button');
        tabInbox.className = 'gifts-tab-pill';
        tabInbox.id = 'giftsTabInbox';
        tabInbox.textContent = 'Inbox';
        tabInbox.addEventListener('click', function () { _switchTab('inbox'); });
        tabs.appendChild(tabSend);
        tabs.appendChild(tabInbox);
        // Send tab content
        var sendContent = document.createElement('div');
        sendContent.className = 'gifts-tab-content active';
        sendContent.id = 'giftsSendContent';
        var userLabel = document.createElement('label');
        userLabel.className = 'gift-form-label';
        userLabel.textContent = 'Recipient Username';
        var userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.id = 'giftUsername';
        userInput.className = 'gift-text-input';
        userInput.placeholder = 'Recipient username';
        userInput.autocomplete = 'off';
        var amountLabel = document.createElement('label');
        amountLabel.className = 'gift-form-label';
        amountLabel.style.marginTop = '10px';
        amountLabel.textContent = 'Gift Amount ($1 - $500)';
        var amountRow = document.createElement('div');
        amountRow.className = 'gift-form-row';
        var amountCtrl = document.createElement('div');
        amountCtrl.className = 'gift-amount-ctrl';
        var minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.textContent = '−';
        minusBtn.addEventListener('click', function () {
            var inp = document.getElementById('giftAmount');
            var v = parseFloat(inp.value) || 10;
            inp.value = Math.max(1, Math.round((v - 0.5) * 10) / 10).toFixed(2);
        });
        var amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.id = 'giftAmount';
        amountInput.className = 'gift-amount-input';
        amountInput.min = '1';
        amountInput.max = '500';
        amountInput.step = '0.5';
        amountInput.value = '10.00';
        var plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', function () {
            var inp = document.getElementById('giftAmount');
            var v = parseFloat(inp.value) || 10;
            inp.value = Math.min(500, Math.round((v + 0.5) * 10) / 10).toFixed(2);
        });
        amountCtrl.appendChild(minusBtn);
        amountCtrl.appendChild(amountInput);
        amountCtrl.appendChild(plusBtn);
        var balanceDisplay = document.createElement('span');
        balanceDisplay.className = 'gift-balance-display';
        balanceDisplay.id = 'giftBalanceDisplay';
        balanceDisplay.textContent = '';
        amountRow.appendChild(amountCtrl);
        amountRow.appendChild(balanceDisplay);
        var msgLabel = document.createElement('label');
        msgLabel.className = 'gift-form-label';
        msgLabel.style.marginTop = '10px';
        msgLabel.textContent = 'Message (optional)';
        var msgArea = document.createElement('textarea');
        msgArea.id = 'giftMessage';
        msgArea.className = 'gift-message-area';
        msgArea.placeholder = 'Optional message... (max 100 chars)';
        msgArea.maxLength = 100;
        var sendBtn = document.createElement('button');
        sendBtn.id = 'giftSendBtn';
        sendBtn.className = 'gift-send-btn';
        sendBtn.textContent = 'SEND GIFT 🎁';
        sendBtn.addEventListener('click', _onSendGift);
        var statusDiv = document.createElement('div');
        statusDiv.id = 'giftSendStatus';
        statusDiv.className = 'gift-status-msg';
        sendContent.appendChild(userLabel);
        sendContent.appendChild(userInput);
        sendContent.appendChild(amountLabel);
        sendContent.appendChild(amountRow);
        sendContent.appendChild(msgLabel);
        sendContent.appendChild(msgArea);
        sendContent.appendChild(sendBtn);
        sendContent.appendChild(statusDiv);
        // Inbox tab content
        var inboxContent = document.createElement('div');
        inboxContent.className = 'gifts-tab-content';
        inboxContent.id = 'giftsInboxContent';
        var inboxTitle = document.createElement('div');
        inboxTitle.className = 'gifts-section-title';
        inboxTitle.textContent = 'Pending Gifts';
        var inboxList = document.createElement('div');
        inboxList.id = 'giftsInboxList';
        inboxList.innerHTML = '<div class="gifts-inbox-loading">Loading...</div>';
        var sentToggle = document.createElement('div');
        sentToggle.className = 'gift-sent-toggle';
        var sentLink = document.createElement('a');
        sentLink.id = 'giftsSentLink';
        sentLink.textContent = 'View sent gifts ▼';
        sentLink.addEventListener('click', _toggleSentGifts);
        sentToggle.appendChild(sentLink);
        var sentList = document.createElement('div');
        sentList.className = 'gift-sent-list';
        sentList.id = 'giftsSentList';
        sentList.style.display = 'none';
        inboxContent.appendChild(inboxTitle);
        inboxContent.appendChild(inboxList);
        inboxContent.appendChild(sentToggle);
        inboxContent.appendChild(sentList);
        // Assemble
        modal.appendChild(header);
        modal.appendChild(tabs);
        modal.appendChild(sendContent);
        modal.appendChild(inboxContent);
        _overlay.appendChild(modal);
        document.body.appendChild(_overlay);
        _overlay.addEventListener('click', function (e) {
            if (e.target === _overlay) closeGiftsModal();
        });
        document.addEventListener('keydown', _onKeyDown);
    }

    function _onKeyDown(e) {
        if (e.key === 'Escape' && _overlay && _overlay.style.display === 'flex') {
            closeGiftsModal();
        }
    }

    function _switchTab(tab) {
        _activeTab = tab;
        var sp = document.getElementById('giftsTabSend');
        var ip = document.getElementById('giftsTabInbox');
        var sc = document.getElementById('giftsSendContent');
        var ic = document.getElementById('giftsInboxContent');
        if (!sp) return;
        if (tab === 'send') {
            sp.classList.add('active'); ip.classList.remove('active');
            sc.classList.add('active'); ic.classList.remove('active');
        } else {
            ip.classList.add('active'); sp.classList.remove('active');
            ic.classList.add('active'); sc.classList.remove('active');
            _loadInbox();
        }
    }

    function _onSendGift() {
        if (!_isLoggedIn()) {
            _setStatus('giftSendStatus', 'Please log in to send gifts', '#ef4444');
            return;
        }
        var toUsername = (document.getElementById('giftUsername').value || '').trim();
        var amount = parseFloat(document.getElementById('giftAmount').value);
        var message = (document.getElementById('giftMessage').value || '').trim().slice(0, 100);
        if (!toUsername) {
            _setStatus('giftSendStatus', 'Please enter a recipient username', '#ef4444');
            return;
        }
        if (isNaN(amount) || amount < 1 || amount > 500) {
            _setStatus('giftSendStatus', 'Amount must be between $1 and $500', '#ef4444');
            return;
        }
        var btn = document.getElementById('giftSendBtn');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        _setStatus('giftSendStatus', '', '');
        fetch('/api/gifts/send', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify({ toUsername: toUsername, amount: amount, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            btn.disabled = false;
            btn.textContent = 'SEND GIFT 🎁';
            if (result.ok && result.data.ok) {
                var nb = Number(result.data.newBalance).toFixed(2);
                _setStatus('giftSendStatus', 'Gift sent! 🎉 Your new balance: $' + nb, '#34d399');
                document.getElementById('giftUsername').value = '';
                document.getElementById('giftAmount').value = '10.00';
                document.getElementById('giftMessage').value = '';
                _updateBalanceDisplay(result.data.newBalance);
                if (typeof updateBalance === 'function') { updateBalance(result.data.newBalance); }
                else if (typeof window.balance !== 'undefined') { window.balance = result.data.newBalance; }
            } else {
                var em = (result.data && result.data.error) ? result.data.error : 'Failed to send gift';
                _setStatus('giftSendStatus', em, '#ef4444');
            }
        })
        .catch(function (err) {
            btn.disabled = false;
            btn.textContent = 'SEND GIFT 🎁';
            _setStatus('giftSendStatus', 'Network error. Please try again.', '#ef4444');
            console.error('[Gifts] send error:', err.message);
        });
    }

    function _loadInbox() {
        var list = document.getElementById('giftsInboxList');
        if (!list) return;
        list.innerHTML = '<div class="gifts-inbox-loading">Loading...</div>';
        if (!_isLoggedIn()) {
            list.innerHTML = '<div class="gift-empty-state">Please log in to view your gifts.</div>';
            return;
        }
        fetch('/api/gifts/inbox', { headers: _authHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) { throw new Error(data.error); }
            _renderInbox(data.gifts || []);
        })
        .catch(function (err) {
            var l2 = document.getElementById('giftsInboxList');
            if (l2) l2.innerHTML = '<div class="gift-empty-state" style="color:#ef4444;">Failed to load inbox</div>';
            console.error('[Gifts] inbox error:', err.message);
        });
    }

    function _renderInbox(gifts) {
        var list = document.getElementById('giftsInboxList');
        if (!list) return;
        if (!gifts.length) {
            list.innerHTML = '<div class="gift-empty-state">🎁 No pending gifts</div>';
            return;
        }
        list.innerHTML = '';
        gifts.forEach(function (gift) {
            var row = document.createElement('div');
            row.className = 'gift-inbox-row';
            row.id = 'giftRow_' + gift.id;
            var icon = document.createElement('div');
            icon.className = 'gift-inbox-icon';
            icon.textContent = '🎁';
            var textCol = document.createElement('div');
            textCol.className = 'gift-inbox-text';
            var fromLine = document.createElement('div');
            fromLine.className = 'gift-from';
            fromLine.textContent = gift.fromUsername + ' sent you ' + _fmt(gift.amount);
            textCol.appendChild(fromLine);
            if (gift.message) {
                var ml = document.createElement('div');
                ml.className = 'gift-msg';
                ml.textContent = '“' + gift.message + '”';
                textCol.appendChild(ml);
            }
            var claimBtn = document.createElement('button');
            claimBtn.className = 'gift-claim-btn';
            claimBtn.textContent = 'CLAIM ' + _fmt(gift.amount);
            (function (gid, gamt, cb, rw) {
                cb.addEventListener('click', function () { _onClaimGift(gid, gamt, cb, rw); });
            }(gift.id, gift.amount, claimBtn, row));
            row.appendChild(icon);
            row.appendChild(textCol);
            row.appendChild(claimBtn);
            list.appendChild(row);
        });
    }

    function _onClaimGift(giftId, amount, btn, row) {
        btn.disabled = true;
        btn.textContent = 'Claiming...';
        fetch('/api/gifts/claim/' + giftId, { method: 'POST', headers: _authHeaders() })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            if (result.ok && result.data.ok) {
                var nb = Number(result.data.newBalance).toFixed(2);
                row.removeChild(btn);
                var cl = document.createElement('div');
                cl.className = 'gift-claimed-label';
                cl.textContent = '✓ Claimed — Balance updated to $' + nb;
                row.appendChild(cl);
                row.style.opacity = '0.6';
                if (typeof updateBalance === 'function') { updateBalance(result.data.newBalance); }
                else if (typeof window.balance !== 'undefined') { window.balance = result.data.newBalance; }
                _toast('🎁 Gift of ' + _fmt(amount) + ' claimed! New balance: $' + nb, 'success');
            } else {
                btn.disabled = false;
                btn.textContent = 'CLAIM ' + _fmt(amount);
                var em = (result.data && result.data.error) ? result.data.error : 'Claim failed';
                _toast(em, 'error');
            }
        })
        .catch(function (err) {
            btn.disabled = false;
            btn.textContent = 'CLAIM ' + _fmt(amount);
            _toast('Network error while claiming gift.', 'error');
            console.error('[Gifts] claim error:', err.message);
        });
    }

    function _toggleSentGifts() {
        _sentVisible = !_sentVisible;
        var list = document.getElementById('giftsSentList');
        var link = document.getElementById('giftsSentLink');
        if (!list) return;
        if (_sentVisible) {
            list.style.display = 'block';
            if (link) link.textContent = 'Hide sent gifts ▲';
            _loadSentGifts();
        } else {
            list.style.display = 'none';
            if (link) link.textContent = 'View sent gifts ▼';
        }
    }

    function _loadSentGifts() {
        var list = document.getElementById('giftsSentList');
        if (!list) return;
        list.innerHTML = '<div class="gifts-inbox-loading">Loading sent gifts...</div>';
        fetch('/api/gifts/sent', { headers: _authHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) throw new Error(data.error);
            _renderSentGifts(data.gifts || []);
        })
        .catch(function (err) {
            var l2 = document.getElementById('giftsSentList');
            if (l2) l2.innerHTML = '<div class="gift-empty-state" style="color:#ef4444;">Failed to load sent gifts</div>';
            console.error('[Gifts] sent error:', err.message);
        });
    }

    function _renderSentGifts(gifts) {
        var list = document.getElementById('giftsSentList');
        if (!list) return;
        if (!gifts.length) {
            list.innerHTML = '<div class="gift-empty-state">No sent gifts yet.</div>';
            return;
        }
        list.innerHTML = '';
        gifts.forEach(function (gift) {
            var row = document.createElement('div');
            row.className = 'gift-sent-row';
            var toSpan = document.createElement('span');
            toSpan.className = 'gift-to';
            toSpan.textContent = 'To: ' + gift.toUsername;
            var amtSpan = document.createElement('span');
            amtSpan.className = 'gift-amt';
            amtSpan.textContent = _fmt(gift.amount);
            var statusSpan = document.createElement('span');
            if (gift.status === 'claimed') {
                statusSpan.className = 'gift-status-claimed';
                statusSpan.textContent = 'Claimed';
            } else {
                statusSpan.className = 'gift-status-pending';
                statusSpan.textContent = 'Awaiting';
            }
            row.appendChild(toSpan);
            row.appendChild(amtSpan);
            row.appendChild(statusSpan);
            list.appendChild(row);
        });
    }

    function _updateBalanceDisplay(bal) {
        var el = document.getElementById('giftBalanceDisplay');
        if (el) el.textContent = 'Balance: ' + _fmt(bal);
    }

    function _refreshBalanceDisplay() {
        var bal = (typeof window.balance !== 'undefined') ? window.balance : null;
        if (bal !== null) _updateBalanceDisplay(bal);
    }

    function _setStatus(id, msg, color) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.style.color = color || '';
    }

    function checkGiftInbox() {
        if (!_isLoggedIn()) return;
        fetch('/api/gifts/inbox', { headers: _authHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) return;
            var count = (data.gifts || []).length;
            _updateGiftBadge(count);
            if (count > 0) _showGiftToast(count);
        })
        .catch(function () {
            // silently swallow — gifts endpoint may not be available
        });
    }

    function _updateGiftBadge(count) {
        var navBtns = document.querySelectorAll('.nav-btn');
        for (var i = 0; i < navBtns.length; i++) {
            var btn = navBtns[i];
            if (btn.textContent && btn.textContent.indexOf('Gifts') !== -1) {
                var old = btn.querySelector('.gift-badge');
                if (old) btn.removeChild(old);
                if (count > 0) {
                    var badge = document.createElement('span');
                    badge.className = 'gift-badge';
                    badge.textContent = String(count);
                    btn.appendChild(badge);
                }
                break;
            }
        }
    }

    function _showGiftToast(count) {
        var msg = '🎁 You have ' + count + ' gift' + (count === 1 ? '' : 's') + ' waiting!';
        if (typeof showToast === 'function') {
            showToast(msg, 'info');
        } else {
            var ex = document.getElementById('giftNotificationToast');
            if (ex && ex.parentNode) ex.parentNode.removeChild(ex);
            var toast = document.createElement('div');
            toast.id = 'giftNotificationToast';
            toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:10400;background:#d4a032;color:#1a1a2e;border-radius:10px;padding:12px 20px;font-size:0.9rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.5);cursor:pointer;';
            toast.textContent = msg;
            toast.addEventListener('click', function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                openGiftsModal();
            });
            document.body.appendChild(toast);
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 5000);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(checkGiftInbox, 2000);
    });

    function openGiftsModal() {
        _buildModal();
        _overlay.style.display = 'flex';
        _sentVisible = false;
        var sl = document.getElementById('giftsSentList');
        var lk = document.getElementById('giftsSentLink');
        if (sl) sl.style.display = 'none';
        if (lk) lk.textContent = 'View sent gifts ▼';
        _switchTab('send');
        _refreshBalanceDisplay();
    }

    function closeGiftsModal() {
        if (_overlay) _overlay.style.display = 'none';
    }

    window.openGiftsModal  = openGiftsModal;
    window.closeGiftsModal = closeGiftsModal;
    window.checkGiftInbox  = checkGiftInbox;

}());