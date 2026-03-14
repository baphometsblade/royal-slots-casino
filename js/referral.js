/**
 * Royal Slots Casino - Referral System
 * IIFE module exposing window.Referral
 * Floating FAB with share modal, code display, and leaderboard
 */

var Referral = (function() {
    'use strict';

    // ── Module State ──
    var _initialized = false;
    var _modalOpen = false;
    var _userCode = null;
    var _stats = null;
    var _leaderboard = null;
    var _baseUrl = window.location.origin;

    // ── Configuration ──
    var CONFIG = {
        FAB_ID: 'referral-fab',
        MODAL_ID: 'referral-modal',
        OVERLAY_ID: 'referral-overlay',
        API_ENDPOINT: '/api/referral'
    };

    // ── Utility Functions ──
    function $(selector) {
        return document.querySelector(selector);
    }

    function $$(selector) {
        return document.querySelectorAll(selector);
    }

    function createElement(tag, attrs, html) {
        var el = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(key) {
                if (key === 'class') {
                    el.className = attrs[key];
                } else if (key === 'style') {
                    Object.assign(el.style, attrs[key]);
                } else {
                    el.setAttribute(key, attrs[key]);
                }
            });
        }
        if (html) el.innerHTML = html;
        return el;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        } else {
            return new Promise(function(resolve, reject) {
                var textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    resolve();
                } catch (err) {
                    document.body.removeChild(textArea);
                    reject(err);
                }
            });
        }
    }

    function showToast(message, type) {
        type = type || 'success';
        var toast = createElement('div', {
            style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: type === 'success' ? '#fbbf24' : '#ef4444',
                color: type === 'success' ? '#000' : '#fff',
                padding: '14px 20px',
                borderRadius: '6px',
                fontWeight: 'bold',
                zIndex: '10001',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: 'slideInRight 0.3s ease-out',
                maxWidth: '90vw'
            }
        }, message);
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.remove();
        }, 3000);
    }

    // ── API Calls ──
    async function _api(path, opts) {
        opts = opts || {};
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) {
            throw new Error('Not authenticated');
        }

        var headers = Object.assign(
            { 'Content-Type': 'application/json' },
            { 'Authorization': 'Bearer ' + token },
            opts.headers || {}
        );

        // Add CSRF token for POST/PUT/DELETE
        if (opts.method && ['POST', 'PUT', 'DELETE'].includes(opts.method)) {
            var csrfToken = localStorage.getItem('csrfToken');
            if (csrfToken) {
                headers['x-csrf-token'] = csrfToken;
            }
        }

        var response = await fetch(path, Object.assign({}, opts, { headers: headers }));
        if (!response.ok) {
            var errBody = await response.text();
            throw new Error(errBody || ('HTTP ' + response.status));
        }
        return await response.json();
    }

    async function _fetchCode() {
        try {
            var result = await _api(CONFIG.API_ENDPOINT + '/code');
            _userCode = result.code;
            return result.code;
        } catch (err) {
            console.warn('[Referral] fetch code error:', err.message);
            throw err;
        }
    }

    async function _fetchStats() {
        try {
            var result = await _api(CONFIG.API_ENDPOINT + '/stats');
            _stats = result;
            return result;
        } catch (err) {
            console.warn('[Referral] fetch stats error:', err.message);
            throw err;
        }
    }

    async function _fetchLeaderboard() {
        try {
            var result = await _api(CONFIG.API_ENDPOINT + '/leaderboard');
            _leaderboard = result.leaderboard || [];
            return _leaderboard;
        } catch (err) {
            console.warn('[Referral] fetch leaderboard error:', err.message);
            throw err;
        }
    }

    // ── Check for ?ref= parameter on first load (new users) ──
    function _checkReferralParam() {
        var urlParams = new URLSearchParams(window.location.search);
        var refCode = urlParams.get('ref');
        if (!refCode) return;

        // Apply referral code
        _api(CONFIG.API_ENDPOINT + '/apply', {
            method: 'POST',
            body: JSON.stringify({ code: refCode })
        }).then(function() {
            showToast('Referral applied! You received 200 bonus gems.', 'success');
            // Clean URL
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }).catch(function(err) {
            console.warn('[Referral] Failed to apply referral code:', err.message);
        });
    }

    // ── Modal Creation ──
    function _createModal() {
        var code = _userCode || 'LOADING...';
        var stats = _stats || { totalReferrals: 0, totalGemsEarned: 0 };
        var leaderboard = _leaderboard || [];
        var referralUrl = _baseUrl + '?ref=' + code;

        // Create overlay
        var overlay = createElement('div', {
            id: CONFIG.OVERLAY_ID,
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '9998',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            }
        });

        // Create modal
        var modal = createElement('div', {
            id: CONFIG.MODAL_ID,
            style: {
                backgroundColor: '#0a0e27',
                border: '2px solid #fbbf24',
                borderRadius: '12px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(251, 191, 36, 0.2)',
                color: '#fff',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                zIndex: '9999'
            }
        });

        // Header
        var header = createElement('div', {
            style: {
                padding: '24px',
                borderBottom: '1px solid rgba(251, 191, 36, 0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        });

        var title = createElement('h2', {
            style: {
                margin: '0',
                fontSize: '26px',
                fontWeight: 'bold',
                color: '#fbbf24',
                textShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
            }
        }, '💰 Referral Program');

        var closeBtn = createElement('button', {
            style: {
                background: 'none',
                border: 'none',
                color: '#fbbf24',
                fontSize: '28px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px'
            }
        }, '×');

        closeBtn.onclick = closeModal;
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Content
        var content = createElement('div', { style: { padding: '24px' } });

        // Referral Code Section
        var codeSection = createElement('div', {
            style: {
                backgroundColor: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
            }
        });

        var codeLabel = createElement('div', {
            style: {
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#fbbf24',
                marginBottom: '12px'
            }
        }, 'Your Referral Code');

        var codeDisplay = createElement('div', {
            style: {
                display: 'flex',
                gap: '8px',
                marginBottom: '12px'
            }
        });

        var codeInput = createElement('input', {
            type: 'text',
            value: code,
            readonly: 'readonly',
            style: {
                flex: '1',
                padding: '10px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '6px',
                color: '#fbbf24',
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'monospace'
            }
        });

        var copyBtn = createElement('button', {
            style: {
                padding: '10px 16px',
                backgroundColor: '#fbbf24',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }
        }, 'Copy');

        copyBtn.onmouseover = function() { this.style.backgroundColor = '#f59e0b'; };
        copyBtn.onmouseout = function() { this.style.backgroundColor = '#fbbf24'; };
        copyBtn.onclick = function() {
            copyToClipboard(code).then(function() {
                showToast('Code copied!', 'success');
            }).catch(function() {
                showToast('Failed to copy', 'error');
            });
        };

        codeDisplay.appendChild(codeInput);
        codeDisplay.appendChild(copyBtn);

        // Share URL
        var urlLabel = createElement('div', {
            style: {
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#fbbf24',
                marginBottom: '8px'
            }
        }, 'Share Link');

        var urlDisplay = createElement('div', {
            style: {
                display: 'flex',
                gap: '8px'
            }
        });

        var urlInput = createElement('input', {
            type: 'text',
            value: referralUrl,
            readonly: 'readonly',
            style: {
                flex: '1',
                padding: '10px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '6px',
                color: '#ccc',
                fontSize: '12px',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }
        });

        var shareBtn = createElement('button', {
            style: {
                padding: '10px 16px',
                backgroundColor: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }
        }, 'Share');

        shareBtn.onmouseover = function() { this.style.backgroundColor = '#4f46e5'; };
        shareBtn.onmouseout = function() { this.style.backgroundColor = '#6366f1'; };
        shareBtn.onclick = function() {
            copyToClipboard(referralUrl).then(function() {
                showToast('Referral link copied!', 'success');
            }).catch(function() {
                showToast('Failed to copy link', 'error');
            });
        };

        urlDisplay.appendChild(urlInput);
        urlDisplay.appendChild(shareBtn);

        codeSection.appendChild(codeLabel);
        codeSection.appendChild(codeDisplay);
        codeSection.appendChild(urlLabel);
        codeSection.appendChild(urlDisplay);

        // Stats Section
        var statsSection = createElement('div', {
            style: {
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
            }
        });

        var statBox1 = createElement('div', {
            style: {
                textAlign: 'center',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '6px'
            }
        });
        statBox1.innerHTML = '<div style="font-size: 24px; font-weight: bold; color: #fbbf24;">' + stats.totalReferrals + '</div><div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-top: 4px;">Total Referrals</div>';

        var statBox2 = createElement('div', {
            style: {
                textAlign: 'center',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '6px'
            }
        });
        statBox2.innerHTML = '<div style="font-size: 24px; font-weight: bold; color: #6366f1;">' + stats.totalGemsEarned + '</div><div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-top: 4px;">Gems Earned</div>';

        statsSection.appendChild(statBox1);
        statsSection.appendChild(statBox2);

        // Leaderboard Section
        var leaderboardSection = createElement('div');

        var leaderboardTitle = createElement('div', {
            style: {
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#fbbf24',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }
        }, '🏆 Top Referrers');

        leaderboardSection.appendChild(leaderboardTitle);

        if (leaderboard && leaderboard.length > 0) {
            var leaderboardTable = createElement('div', {
                style: {
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    overflow: 'hidden'
                }
            });

            leaderboard.forEach(function(entry, idx) {
                var row = createElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: '30px 1fr 60px 80px',
                        alignItems: 'center',
                        padding: '12px 12px',
                        borderBottom: idx < leaderboard.length - 1 ? '1px solid rgba(251, 191, 36, 0.1)' : 'none',
                        fontSize: '13px'
                    }
                });

                var rankBadge = createElement('div', {
                    style: {
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: idx === 0 ? '#fbbf24' : idx === 1 ? '#c0caf5' : '#a3a76d'
                    }
                }, (idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉') + ' ' + entry.rank);

                var username = createElement('div', {
                    style: { color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis' }
                }, entry.username);

                var referrals = createElement('div', {
                    style: { textAlign: 'center', color: '#6366f1', fontWeight: 'bold' }
                }, entry.referrals);

                var gems = createElement('div', {
                    style: { textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }
                }, entry.gemsEarned + ' 💎');

                row.appendChild(rankBadge);
                row.appendChild(username);
                row.appendChild(referrals);
                row.appendChild(gems);
                leaderboardTable.appendChild(row);
            });

            leaderboardSection.appendChild(leaderboardTable);
        } else {
            var noData = createElement('div', {
                style: {
                    padding: '16px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '13px'
                }
            }, 'No referrals yet. Start sharing to climb the leaderboard!');
            leaderboardSection.appendChild(noData);
        }

        content.appendChild(codeSection);
        content.appendChild(statsSection);
        content.appendChild(leaderboardSection);

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);

        overlay.onclick = function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        };

        return overlay;
    }

    function _createFAB() {
        var fab = createElement('button', {
            id: CONFIG.FAB_ID,
            style: {
                position: 'fixed',
                bottom: '140px',
                left: '20px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
                border: 'none',
                color: '#000',
                fontSize: '24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                zIndex: '1000',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }
        }, '🎁');

        fab.onmouseover = function() {
            this.style.backgroundColor = '#f59e0b';
            this.style.transform = 'scale(1.1)';
        };

        fab.onmouseout = function() {
            this.style.backgroundColor = '#fbbf24';
            this.style.transform = 'scale(1)';
        };

        fab.onclick = function(e) {
            e.preventDefault();
            showModal();
        };

        return fab;
    }

    // ── Modal Control ──
    function showModal() {
        if (_modalOpen) return;
        _modalOpen = true;

        var existing = $(CONFIG.OVERLAY_ID);
        if (existing) existing.remove();

        var overlay = _createModal();
        document.body.appendChild(overlay);

        // Trigger animation
        setTimeout(function() {
            overlay.style.opacity = '1';
        }, 10);
    }

    function closeModal() {
        _modalOpen = false;
        var overlay = $(CONFIG.OVERLAY_ID);
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(function() {
                overlay.remove();
            }, 300);
        }
    }

    // ── Public API ──
    function init() {
        if (_initialized) return;
        _initialized = true;

        // Only init if user is authenticated
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return;

        // Check for referral param on first load
        _checkReferralParam();

        // Load referral data
        Promise.all([
            _fetchCode(),
            _fetchStats(),
            _fetchLeaderboard()
        ]).then(function() {
            // Create and add FAB
            var fab = _createFAB();
            document.body.appendChild(fab);
        }).catch(function(err) {
            console.warn('[Referral] init error:', err.message);
        });
    }

    // Return public API
    return {
        init: init,
        showModal: showModal,
        closeModal: closeModal
    };
})();
