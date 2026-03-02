/* ui-referral.js -- Referral System modal
 * Exposes: window.openReferralModal(), window.closeReferralModal()
 * No ES modules -- runs in global scope after globals.js
 */
(function () {
    'use strict';

    // -- Auth helpers --

    function _getAuthToken() {
        var key = (typeof STORAGE_KEY_TOKEN !== 'undefined')
            ? STORAGE_KEY_TOKEN
            : 'casinoToken';
        return localStorage.getItem(key);
    }

    function _authHeaders() {
        var token = _getAuthToken();
        if (!token) return {};
        return { 'Authorization': 'Bearer ' + token };
    }

    function _isLoggedIn() {
        return !!_getAuthToken();
    }

    // -- Toast helper --

    function _toast(msg, type) {
        if (typeof showToast === 'function') {
            showToast(msg, type || 'info');
        } else {
            console.log('[Referral] ' + msg);
        }
    }

    // -- DOM creation --

    var _overlay = null;

    function _howCard(icon, title, desc) {
        return [
            '<div style="flex:1;text-align:center;">',
                '<div style="font-size:1.6rem;margin-bottom:6px;">', icon, '</div>',
                '<div style="font-size:0.8rem;font-weight:600;color:#e2e8f0;margin-bottom:4px;">', title, '</div>',
                '<div style="font-size:0.72rem;color:#64748b;line-height:1.4;">', desc, '</div>',
            '</div>'
        ].join('');
    }

    function _buildModal() {
        if (_overlay) return;
        _overlay = document.createElement('div');
        _overlay.id = 'referralModalOverlay';
        _overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:10000',
            'background:rgba(0,0,0,0.75)', 'display:none',
            'align-items:center', 'justify-content:center',
            'padding:16px', 'box-sizing:border-box'
        ].join(';');

        _overlay.innerHTML = [
            '<div id="referralPanel" style="',
                'background:#1a1a2e;border:1px solid #7c3aed;border-radius:16px;',
                'max-width:480px;width:100%;max-height:90vh;overflow-y:auto;',
                'padding:24px;box-sizing:border-box;font-family:inherit;',
                'color:#e2e8f0;position:relative',
            '">',
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">',
                '<h2 style="margin:0;font-size:1.35rem;color:#a78bfa;letter-spacing:1px;">',
                    '&#x1F465; REFER &amp; EARN',
                '</h2>',
                '<button id="referralCloseBtn" style="background:none;border:none;color:#94a3b8;font-size:1.4rem;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1;">&times;</button>',
            '</div>',
            '<div style="display:flex;gap:12px;margin-bottom:24px;background:#0f172a;border-radius:12px;padding:16px;">',
                _howCard('&#x1F517;', 'Share your link', 'Send your unique link to friends'),
                _howCard('&#x1F464;', 'Friend registers', 'They sign up using your link'),
                _howCard('&#x1F381;', 'Both earn rewards!', 'Bonus credited on first deposit'),
            '</div>',
            '<div style="margin-bottom:20px;">',
                '<label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Your Referral Link</label>',
                '<div style="display:flex;gap:8px;">',
                    '<input id="referralLinkInput" type="text" readonly style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 12px;color:#e2e8f0;font-size:0.85rem;outline:none;cursor:default;min-width:0;" value="Loading..." />',
                    '<button id="referralCopyBtn" style="background:#7c3aed;border:none;color:#fff;border-radius:8px;padding:10px 16px;cursor:pointer;white-space:nowrap;font-size:0.85rem;">&#x1F4CB; Copy</button>',
                '</div>',
                '<div id="referralCopyMsg" style="font-size:0.78rem;color:#34d399;margin-top:6px;min-height:18px;"></div>',
            '</div>',
            '<div style="display:flex;gap:16px;margin-bottom:20px;background:#0f172a;border-radius:12px;padding:14px 16px;">',
                '<div style="flex:1;text-align:center;">',
                    '<div id="referralStatFriends" style="font-size:1.5rem;font-weight:700;color:#a78bfa;">&#x2014;</div>',
                    '<div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Friends Referred</div>',
                '</div>',
                '<div style="width:1px;background:#1e293b;"></div>',
                '<div style="flex:1;text-align:center;">',
                    '<div id="referralStatEarned" style="font-size:1.5rem;font-weight:700;color:#34d399;">&#x2014;</div>',
                    '<div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Total Earned</div>',
                '</div>',
            '</div>',
            '<div style="margin-bottom:20px;">',
                '<label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Apply a Referral Code</label>',
                '<div style="display:flex;gap:8px;">',
                    '<input id="referralApplyInput" type="text" placeholder="Enter code e.g. AB12CD" style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 12px;color:#e2e8f0;font-size:0.85rem;outline:none;min-width:0;" maxlength="10" />',
                    '<button id="referralApplyBtn" style="background:#0f172a;border:1px solid #7c3aed;color:#a78bfa;border-radius:8px;padding:10px 16px;cursor:pointer;white-space:nowrap;font-size:0.85rem;">Apply</button>',
                '</div>',
                '<div id="referralApplyMsg" style="font-size:0.78rem;margin-top:6px;min-height:18px;"></div>',
            '</div>',
            '<div>',
                '<label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Referral History</label>',
                '<div style="background:#0f172a;border-radius:10px;overflow:hidden;border:1px solid #1e293b;">',
                    '<div id="referralHistoryBody" style="font-size:0.82rem;">',
                        '<div style="padding:16px;text-align:center;color:#475569;">Loading&#x2026;</div>',
                    '</div>',
                '</div>',
            '</div>',
            '<div id="referralAuthWall" style="display:none;position:absolute;inset:0;background:rgba(15,23,42,0.92);border-radius:16px;align-items:center;justify-content:center;text-align:center;padding:32px;flex-direction:column;gap:12px;">',
                '<div style="font-size:2rem;">&#x1F512;</div>',
                '<div style="font-size:1rem;color:#94a3b8;">Log in to access your referral link</div>',
            '</div>',
            '</div>'
        ].join('');

        document.body.appendChild(_overlay);
        document.getElementById('referralCloseBtn').addEventListener('click', closeReferralModal);
        _overlay.addEventListener('click', function (e) {
            if (e.target === _overlay) closeReferralModal();
        });
        document.getElementById('referralCopyBtn').addEventListener('click', _onCopy);
        document.getElementById('referralApplyBtn').addEventListener('click', _onApply);
        var applyInput = document.getElementById('referralApplyInput');
        applyInput.addEventListener('input', function () {
            var pos = applyInput.selectionStart;
            applyInput.value = applyInput.value.toUpperCase();
            applyInput.setSelectionRange(pos, pos);
        });
    }

    // -- Data loading --

    function _loadInfo() {
        fetch('/api/referral/info', {
            headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeaders())
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) throw new Error(data.error);
            var input = document.getElementById('referralLinkInput');
            if (input) input.value = data.referralUrl || '';
            var sf = document.getElementById('referralStatFriends');
            if (sf) sf.textContent = data.totalReferrals || 0;
            var se = document.getElementById('referralStatEarned');
            if (se) se.textContent = '$' + (data.totalEarned || 0).toFixed(2);
        })
        .catch(function (err) {
            console.error('[Referral] loadInfo error:', err.message);
            var input = document.getElementById('referralLinkInput');
            if (input) input.value = 'Could not load link';
        });
    }

    function _loadHistory() {
        fetch('/api/referral/stats', {
            headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeaders())
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) throw new Error(data.error);
            _renderHistory(data.referrals || []);
        })
        .catch(function (err) {
            console.error('[Referral] loadHistory error:', err.message);
            var body = document.getElementById('referralHistoryBody');
            if (body) body.innerHTML = '<div style="padding:16px;text-align:center;color:#ef4444;">Failed to load history</div>';
        });
    }

    function _escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function _renderHistory(referrals) {
        var body = document.getElementById('referralHistoryBody');
        if (!body) return;
        if (!referrals.length) {
            body.innerHTML = '<div style="padding:16px;text-align:center;color:#475569;">No referrals yet -- share your link!</div>';
            return;
        }
        var rows = referrals.map(function (r) {
            var statusStyle = r.status === 'completed'
                ? 'background:#14532d;color:#34d399;'
                : 'background:#1e293b;color:#94a3b8;';
            var bonusText = r.bonus_paid > 0
                ? '$' + Number(r.bonus_paid).toFixed(2)
                : '&mdash;';
            return [
                '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #1e293b;">',
                    '<div style="font-size:0.82rem;color:#cbd5e1;">', _escHtml(r.referee_username), '</div>',
                    '<div style="display:flex;align-items:center;gap:10px;">',
                        '<span style="font-size:0.7rem;padding:2px 8px;border-radius:20px;', statusStyle, '">',
                            _escHtml(r.status),
                        '</span>',
                        '<span style="font-size:0.82rem;color:#a78bfa;min-width:48px;text-align:right;">',
                            bonusText,
                        '</span>',
                    '</div>',
                '</div>'
            ].join('');
        });
        body.innerHTML = rows.join('');
    }

    // -- Event handlers --

    function _onCopy() {
        var input = document.getElementById('referralLinkInput');
        var msg   = document.getElementById('referralCopyMsg');
        if (!input || !input.value) return;
        var url = input.value;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
                _showCopyMsg(msg, 'Copied!', false);
            }).catch(function () {
                _fallbackCopy(input, msg);
            });
        } else {
            _fallbackCopy(input, msg);
        }
    }

    function _fallbackCopy(input, msg) {
        try {
            input.select();
            document.execCommand('copy');
            _showCopyMsg(msg, 'Copied!', false);
        } catch (e) {
            _showCopyMsg(msg, 'Copy failed -- select the link manually', true);
        }
    }

    function _showCopyMsg(el, text, isError) {
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? '#ef4444' : '#34d399';
        setTimeout(function () { if (el) el.textContent = ''; }, 2000);
    }

    function _onApply() {
        var input = document.getElementById('referralApplyInput');
        var msg   = document.getElementById('referralApplyMsg');
        if (!input) return;
        var code = input.value.trim().toUpperCase();
        if (!code) {
            _setApplyMsg(msg, 'Please enter a referral code.', true);
            return;
        }
        var btn = document.getElementById('referralApplyBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
        fetch('/api/referral/apply', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, _authHeaders()),
            body: JSON.stringify({ code: code })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (btn) { btn.disabled = false; btn.textContent = 'Apply'; }
            if (data.success) {
                _setApplyMsg(msg, data.message || 'Referral code applied!', false);
                input.value = '';
                _toast('Referral code applied successfully!', 'success');
            } else {
                _setApplyMsg(msg, data.error || 'Failed to apply code.', true);
            }
        })
        .catch(function (err) {
            if (btn) { btn.disabled = false; btn.textContent = 'Apply'; }
            _setApplyMsg(msg, 'Network error. Please try again.', true);
            console.error('[Referral] apply error:', err.message);
        });
    }

    function _setApplyMsg(el, text, isError) {
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? '#ef4444' : '#34d399';
    }

    // -- Public API --

    function openReferralModal() {
        _buildModal();
        _overlay.style.display = 'flex';
        var authWall = document.getElementById('referralAuthWall');
        if (!_isLoggedIn()) {
            if (authWall) authWall.style.display = 'flex';
            return;
        }
        if (authWall) authWall.style.display = 'none';
        _loadInfo();
        _loadHistory();
    }

    function closeReferralModal() {
        if (_overlay) {
            _overlay.style.display = 'none';
        }
    }

    window.openReferralModal  = openReferralModal;
    window.closeReferralModal = closeReferralModal;

}());
