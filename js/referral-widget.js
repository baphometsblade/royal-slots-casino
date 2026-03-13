(function() {
    var WIDGET_ID = 'royal-referral-widget';
    var MODAL_ID = 'royal-referral-modal';
    var CONTAINER_ID = 'royal-referral-container';
    var REFERRAL_DATA_KEY = 'royal_referral_data';
    var API_ENDPOINT = '/api/referrals';
    var BASE_URL = 'https://msaart.online/';

    // API Helper
    async function api(path, opts) {
        opts = opts || {};
        if (typeof apiRequest === 'function') return apiRequest(path, opts);
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return null;
        var res = await fetch(path, Object.assign({}, opts, {
            headers: Object.assign({ 'Content-Type': 'application/json' },
                token ? { Authorization: 'Bearer ' + token } : {},
                opts.headers || {})
        }));
        return res.json();
    }

    // Utility Functions
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
        if (html) {
            el.innerHTML = html;
        }
        return el;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
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

    function showNotification(message, type) {
        type = type || 'success';
        var notif = createElement('div', {
            style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: type === 'success' ? '#ffd700' : '#ff6b6b',
                color: type === 'success' ? '#000' : '#fff',
                padding: '12px 20px',
                borderRadius: '4px',
                fontWeight: 'bold',
                zIndex: '10001',
                animation: 'slideIn 0.3s ease-out',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }
        }, message);
        document.body.appendChild(notif);
        setTimeout(function() {
            notif.remove();
        }, 3000);
    }

    function formatCurrency(amount) {
        return '$' + parseFloat(amount || 0).toFixed(2);
    }

    // Fetch Referral Data
    async function fetchReferralData() {
        try {
            var data = await api(API_ENDPOINT);
            if (data && !data.error) {
                localStorage.setItem(REFERRAL_DATA_KEY, JSON.stringify(data));
                return data;
            } else {
                console.warn('Failed to fetch referral data:', data);
                var cached = localStorage.getItem(REFERRAL_DATA_KEY);
                return cached ? JSON.parse(cached) : null;
            }
        } catch (err) {
            console.warn('Error fetching referral data:', err);
            var cached = localStorage.getItem(REFERRAL_DATA_KEY);
            return cached ? JSON.parse(cached) : null;
        }
    }

    // Create Button HTML
    function createButton() {
        var styles = {
            position: 'fixed',
            bottom: '120px',
            right: '20px',
            zIndex: '1000',
            padding: '12px 20px',
            backgroundColor: '#ffd700',
            color: '#000',
            border: 'none',
            borderRadius: '50px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'nowrap',
            animation: 'referralPulse 2s ease-in-out infinite'
        };

        var button = createElement('button', {
            id: WIDGET_ID,
            style: styles
        }, '🎁 Invite Friends');

        return button;
    }

    // Create Modal HTML
    function createModal(data) {
        data = data || {};
        var referralCode = data.referralCode || 'LOADING';
        var totalReferred = data.totalReferred || 0;
        var totalEarned = data.totalEarned || 0;
        var referrals = data.referrals || [];
        var shareLink = BASE_URL + '?ref=' + referralCode;

        var modalStyles = {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10000',
            animation: 'fadeIn 0.3s ease-out'
        };

        var contentStyles = {
            backgroundColor: 'rgba(20, 10, 40, 0.95)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1)',
            color: '#fff',
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
            animation: 'slideUp 0.3s ease-out'
        };

        var headerStyles = {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
            paddingBottom: '15px'
        };

        var closeButtonStyles = {
            background: 'none',
            border: 'none',
            color: '#ffd700',
            fontSize: '28px',
            cursor: 'pointer',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };

        var titleStyles = {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffd700',
            margin: '0'
        };

        var sectionStyles = {
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: 'rgba(255, 215, 0, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 215, 0, 0.15)'
        };

        var codeBoxStyles = {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 215, 0, 0.2)'
        };

        var codeTextStyles = {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffd700',
            letterSpacing: '2px',
            flex: '1'
        };

        var copyButtonStyles = {
            padding: '8px 12px',
            backgroundColor: '#ff8c00',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            marginLeft: '10px',
            transition: 'background-color 0.2s'
        };

        var linkBoxStyles = Object.assign({}, codeBoxStyles, {
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start'
        });

        var statsRowStyles = {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '15px',
            marginBottom: '0'
        };

        var statStyles = {
            flex: '1',
            textAlign: 'center',
            padding: '10px',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 215, 0, 0.2)'
        };

        var statLabelStyles = {
            fontSize: '12px',
            color: '#aaa',
            marginBottom: '5px'
        };

        var statValueStyles = {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffd700'
        };

        var sectionLabelStyles = {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#ffd700',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        };

        var shareButtonsStyles = {
            display: 'flex',
            gap: '10px',
            marginBottom: '0'
        };

        var shareButtonBaseStyles = {
            flex: '1',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s',
            color: '#000'
        };

        var copyLinkButtonStyles = Object.assign({}, shareButtonBaseStyles, {
            backgroundColor: '#ffd700'
        });

        var nativeShareButtonStyles = Object.assign({}, shareButtonBaseStyles, {
            backgroundColor: '#ff8c00'
        });

        var referralListStyles = {
            marginBottom: '0'
        };

        var referralItemStyles = {
            padding: '12px',
            marginBottom: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            borderLeft: '3px solid #ffd700',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px'
        };

        var referralNameStyles = {
            flex: '1'
        };

        var referralStatusStyles = {
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        };

        var pendingStatusStyles = Object.assign({}, referralStatusStyles, {
            backgroundColor: 'rgba(255, 140, 0, 0.3)',
            color: '#ff8c00'
        });

        var rewardedStatusStyles = Object.assign({}, referralStatusStyles, {
            backgroundColor: 'rgba(0, 200, 100, 0.3)',
            color: '#00c864'
        });

        var emptyMessageStyles = {
            textAlign: 'center',
            color: '#999',
            padding: '20px',
            fontSize: '14px'
        };

        var modal = createElement('div', {
            id: MODAL_ID,
            style: modalStyles
        });

        var content = createElement('div', {
            style: contentStyles
        });

        // Header
        var header = createElement('div', {
            style: headerStyles
        });
        var title = createElement('h2', {
            style: titleStyles
        }, '🎁 Referral Program');
        var closeBtn = createElement('button', {
            style: closeButtonStyles
        }, '✕');
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Referral Code Section
        var codeSection = createElement('div', {
            style: sectionStyles
        });
        var codeLabel = createElement('div', {
            style: sectionLabelStyles
        }, 'Your Referral Code');
        var codeBox = createElement('div', {
            style: codeBoxStyles
        });
        var codeText = createElement('span', {
            style: codeTextStyles
        }, referralCode);
        var copyBtn = createElement('button', {
            style: copyButtonStyles
        }, 'Copy');
        codeBox.appendChild(codeText);
        codeBox.appendChild(copyBtn);
        codeSection.appendChild(codeLabel);
        codeSection.appendChild(codeBox);

        // Share Link Section
        var linkSection = createElement('div', {
            style: sectionStyles
        });
        var linkLabel = createElement('div', {
            style: sectionLabelStyles
        }, 'Share Link');
        var linkBox = createElement('div', {
            style: linkBoxStyles
        });
        var linkText = createElement('div', {
            style: {
                wordBreak: 'break-all',
                color: '#ddd',
                fontSize: '12px',
                marginBottom: '10px',
                fontFamily: 'monospace'
            }
        }, shareLink);
        var shareButtonsContainer = createElement('div', {
            style: shareButtonsStyles
        });
        var copyLinkBtn = createElement('button', {
            style: copyLinkButtonStyles
        }, '📋 Copy Link');
        var nativeShareBtn = createElement('button', {
            style: nativeShareButtonStyles
        }, '📤 Share');
        shareButtonsContainer.appendChild(copyLinkBtn);
        if (navigator.share) {
            shareButtonsContainer.appendChild(nativeShareBtn);
        }
        linkBox.appendChild(linkText);
        linkBox.appendChild(shareButtonsContainer);
        linkSection.appendChild(linkLabel);
        linkSection.appendChild(linkBox);

        // Stats Section
        var statsSection = createElement('div', {
            style: sectionStyles
        });
        var statsLabel = createElement('div', {
            style: sectionLabelStyles
        }, 'Your Stats');
        var statsRow = createElement('div', {
            style: statsRowStyles
        });

        var referredStat = createElement('div', {
            style: statStyles
        });
        referredStat.appendChild(createElement('div', {
            style: statLabelStyles
        }, 'Total Referred'));
        referredStat.appendChild(createElement('div', {
            style: statValueStyles
        }, String(totalReferred)));

        var earnedStat = createElement('div', {
            style: statStyles
        });
        earnedStat.appendChild(createElement('div', {
            style: statLabelStyles
        }, 'Total Earned'));
        earnedStat.appendChild(createElement('div', {
            style: statValueStyles
        }, formatCurrency(totalEarned)));

        statsRow.appendChild(referredStat);
        statsRow.appendChild(earnedStat);
        statsSection.appendChild(statsLabel);
        statsSection.appendChild(statsRow);

        // Referrals List Section
        var listSection = createElement('div', {
            style: Object.assign({}, sectionStyles, referralListStyles)
        });
        var listLabel = createElement('div', {
            style: sectionLabelStyles
        }, 'Recent Referrals');

        if (referrals.length === 0) {
            var emptyMsg = createElement('div', {
                style: emptyMessageStyles
            }, 'No referrals yet. Share your code to get started!');
            listSection.appendChild(listLabel);
            listSection.appendChild(emptyMsg);
        } else {
            listSection.appendChild(listLabel);
            referrals.slice(0, 5).forEach(function(ref) {
                var statusColor = ref.status === 'rewarded' ? rewardedStatusStyles : pendingStatusStyles;
                var item = createElement('div', {
                    style: referralItemStyles
                });
                var name = createElement('div', {
                    style: referralNameStyles
                }, ref.playerName || 'Anonymous');
                var status = createElement('div', {
                    style: statusColor
                }, ref.status || 'pending');
                item.appendChild(name);
                item.appendChild(status);
                listSection.appendChild(item);
            });
            if (referrals.length > 5) {
                var moreMsg = createElement('div', {
                    style: {
                        textAlign: 'center',
                        color: '#999',
                        fontSize: '12px',
                        padding: '10px 0',
                        marginTop: '10px',
                        borderTop: '1px solid rgba(255, 215, 0, 0.1)'
                    }
                }, 'and ' + (referrals.length - 5) + ' more...');
                listSection.appendChild(moreMsg);
            }
        }

        // Assemble modal
        content.appendChild(header);
        content.appendChild(codeSection);
        content.appendChild(linkSection);
        content.appendChild(statsSection);
        content.appendChild(listSection);
        modal.appendChild(content);

        // Event listeners
        closeBtn.addEventListener('click', function() {
            closeModal();
        });

        copyBtn.addEventListener('click', function() {
            copyToClipboard(referralCode).then(function() {
                showNotification('Code copied to clipboard!', 'success');
                copyBtn.textContent = '✓ Copied';
                setTimeout(function() {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            }).catch(function() {
                showNotification('Failed to copy code', 'error');
            });
        });

        copyLinkBtn.addEventListener('click', function() {
            copyToClipboard(shareLink).then(function() {
                showNotification('Link copied to clipboard!', 'success');
                copyLinkBtn.textContent = '✓ Copied';
                setTimeout(function() {
                    copyLinkBtn.textContent = '📋 Copy Link';
                }, 2000);
            }).catch(function() {
                showNotification('Failed to copy link', 'error');
            });
        });

        if (navigator.share) {
            nativeShareBtn.addEventListener('click', function() {
                navigator.share({
                    title: 'Join Royal Slots Casino',
                    text: 'Come play with me at Royal Slots Casino! Use my referral code: ' + referralCode,
                    url: shareLink
                }).catch(function(err) {
                    if (err.name !== 'AbortError') {
                        console.warn('Error sharing:', err);
                    }
                });
            });
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        return modal;
    }

    function closeModal() {
        var modal = $(('#' + MODAL_ID));
        if (modal) {
            modal.remove();
        }
    }

    function showModal() {
        closeModal();
        fetchReferralData().then(function(data) {
            var modal = createModal(data);
            document.body.appendChild(modal);
            injectStyles();
        });
    }

    function injectStyles() {
        var styleId = 'royal-referral-styles';
        if (document.getElementById(styleId)) {
            return;
        }

        var style = createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes referralPulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
                }
                50% {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
                }
            }
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            #${WIDGET_ID}:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
            }
            #${WIDGET_ID}:active {
                transform: scale(0.98);
            }
            #${MODAL_ID} button:hover {
                opacity: 0.9;
            }
            #${MODAL_ID} button:active {
                transform: scale(0.98);
            }
            /* Scrollbar styling */
            #${MODAL_ID} > div::-webkit-scrollbar {
                width: 6px;
            }
            #${MODAL_ID} > div::-webkit-scrollbar-track {
                background: rgba(255, 215, 0, 0.1);
                border-radius: 10px;
            }
            #${MODAL_ID} > div::-webkit-scrollbar-thumb {
                background: rgba(255, 215, 0, 0.3);
                border-radius: 10px;
            }
            #${MODAL_ID} > div::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 215, 0, 0.5);
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        var container = $(('#' + CONTAINER_ID));
        if (container) {
            return;
        }

        container = createElement('div', {
            id: CONTAINER_ID
        });
        document.body.appendChild(container);

        var button = createButton();
        container.appendChild(button);

        button.addEventListener('click', function() {
            showModal();
        });

        injectStyles();

        // Optional: Auto-load data on init
        fetchReferralData().catch(function() {
            console.warn('Failed to preload referral data');
        });
    }

    // Public API
    window.ReferralWidget = {
        init: init,
        showModal: showModal
    };
})();
