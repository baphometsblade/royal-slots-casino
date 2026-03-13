(function() {
    var state = {
        isShowing: false,
        currentWithdrawalAmount: 0,
        originalWithdrawFn: null,
        interceptedElement: null
    };

    var colors = {
        dark: '#0a0e27',
        gold: '#d4af37',
        darkGlass: 'rgba(10, 14, 39, 0.95)',
        goldBorder: 'rgba(212, 175, 55, 0.6)',
        text: '#f0f0f0',
        gold2: '#ffd700',
        gray: '#888888',
        lightGray: '#cccccc'
    };

    var config = {
        feePercentage: 5,
        spinnerDurationMs: 2000
    };

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

    function injectStyles() {
        if (document.getElementById('withdrawal-enhance-styles')) {
            return;
        }

        var style = document.createElement('style');
        style.id = 'withdrawal-enhance-styles';
        style.textContent = '@keyframes weWithdrawalSpinner{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
            '@keyframes weConfetti{0%{opacity:1;transform:translate(0,0) rotateZ(0deg);}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotateZ(360deg);}}' +
            '@keyframes weSlideUp{0%{opacity:0;transform:translateY(30px);}100%{opacity:1;transform:translateY(0);}}' +
            '@keyframes wePulse{0%{box-shadow:0 0 20px rgba(212,175,55,0.5);}50%{box-shadow:0 0 40px rgba(212,175,55,0.8);}100%{box-shadow:0 0 20px rgba(212,175,55,0.5);}}' +
            '.we-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99998;backdrop-filter:blur(5px);animation:weFadeIn 0.3s ease;}' +
            '@keyframes weFadeIn{from{opacity:0;}to{opacity:1;}}' +
            '.we-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.85);z-index:99999;width:90%;max-width:500px;background:' + colors.darkGlass + ';border:2px solid ' + colors.goldBorder + ';border-radius:14px;padding:40px 30px;box-shadow:0 25px 70px rgba(0,0,0,0.9),inset 0 1px 0 rgba(212,175,55,0.3);backdrop-filter:blur(10px);font-family:"Segoe UI",Tahoma,Geneva,sans-serif;color:' + colors.text + ';opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}' +
            '.we-modal.active{opacity:1;transform:translate(-50%,-50%) scale(1);}' +
            '.we-close{position:absolute;top:15px;right:15px;width:32px;height:32px;border:none;background:rgba(212,175,55,0.2);color:' + colors.gold + ';border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease;}' +
            '.we-close:hover{background:rgba(212,175,55,0.4);transform:rotate(90deg);}' +
            '.we-spinner{width:50px;height:50px;border:4px solid rgba(212,175,55,0.3);border-top:4px solid ' + colors.gold2 + ';border-radius:50%;margin:30px auto;animation:weWithdrawalSpinner 1s linear infinite;}' +
            '.we-title{font-size:28px;color:' + colors.gold + ';margin:0 0 20px 0;text-align:center;font-weight:bold;}' +
            '.we-subtitle{font-size:16px;text-align:center;margin:0 0 30px 0;line-height:1.6;}' +
            '.we-offer-card{background:rgba(212,175,55,0.08);border:1px solid ' + colors.goldBorder + ';border-radius:10px;padding:25px;margin:25px 0;text-align:center;}' +
            '.we-offer-title{font-size:18px;color:' + colors.gold2 + ';margin:0 0 15px 0;font-weight:bold;}' +
            '.we-offer-amount{font-size:42px;color:' + colors.gold2 + ';font-weight:bold;margin:15px 0;text-shadow:0 0 20px rgba(255,215,0,0.5);}' +
            '.we-offer-desc{font-size:14px;color:' + colors.text + ';line-height:1.6;margin:15px 0;}' +
            '.we-fee-info{background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:15px;margin:20px 0;font-size:13px;line-height:1.8;text-align:center;}' +
            '.we-fee-line{margin:8px 0;color:' + colors.text + ';}' +
            '.we-fee-amount{color:' + colors.gold2 + ';font-weight:bold;font-size:16px;}' +
            '.we-net-amount{color:' + colors.gold + ';font-weight:bold;font-size:18px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(212,175,55,0.3);}' +
            '.we-button-group{display:flex;flex-direction:column;gap:12px;margin-top:25px;}' +
            '.we-button{padding:14px 24px;border:none;border-radius:6px;font-size:15px;font-weight:bold;cursor:pointer;transition:all 0.3s ease;width:100%;}' +
            '.we-button-primary{background:linear-gradient(135deg,' + colors.gold2 + ',' + colors.gold + ');color:#000;box-shadow:0 0 20px rgba(212,175,55,0.5);animation:wePulse 2s infinite;}' +
            '.we-button-primary:hover{transform:scale(1.03);box-shadow:0 0 40px rgba(212,175,55,0.8);}' +
            '.we-button-secondary{background:transparent;color:' + colors.gray + ';border:1px solid ' + colors.gray + ';font-size:14px;padding:10px 16px;}' +
            '.we-button-secondary:hover{color:' + colors.lightGray + ';border-color:' + colors.lightGray + ';}' +
            '.we-message{text-align:center;padding:20px;font-size:16px;line-height:1.8;}' +
            '.we-success{color:' + colors.gold2 + ';font-weight:bold;}' +
            '.we-warning{color:#ff9800;font-weight:bold;}' +
            '.we-blocked{color:#ff6b6b;font-weight:bold;}' +
            '.we-loading-text{text-align:center;font-size:16px;margin-top:20px;color:' + colors.gold2 + ';animation:weSlideUp 0.6s ease;}';
        document.head.appendChild(style);
    }

    function createModal(content) {
        var container = document.createElement('div');
        container.className = 'we-modal-container';
        container.setAttribute('data-we-modal', 'true');

        var overlay = document.createElement('div');
        overlay.className = 'we-overlay';
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });

        var modal = document.createElement('div');
        modal.className = 'we-modal';
        modal.innerHTML = content;

        container.appendChild(overlay);
        container.appendChild(modal);
        document.body.appendChild(container);

        setTimeout(function() {
            modal.classList.add('active');
        }, 50);

        return { container: container, modal: modal, overlay: overlay };
    }

    function closeModal() {
        var container = document.querySelector('[data-we-modal="true"]');
        if (container) {
            var modal = container.querySelector('.we-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(function() {
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }, 400);
            }
        }
        state.isShowing = false;
    }

    function showLoadingStep() {
        injectStyles();
        state.isShowing = true;

        var content = '<button class="we-close">&times;</button>' +
            '<div class="we-title">Processing your request...</div>' +
            '<div class="we-spinner"></div>' +
            '<div class="we-loading-text">Checking eligibility...</div>';

        var parts = createModal(content);
        var closeBtn = parts.modal.querySelector('.we-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        return parts;
    }

    async function checkWithdrawalEligibility() {
        try {
            var result = await api('/api/withdrawal-enhance/check', {});
            return result || { canWithdraw: true };
        } catch (err) {
            console.warn('withdrawal-enhance: error checking eligibility', err);
            return { canWithdraw: true };
        }
    }

    async function fetchRetentionOffer(amount) {
        try {
            var result = await api('/api/withdrawal-enhance/offer', {
                method: 'POST',
                body: JSON.stringify({ withdrawalAmount: amount })
            });
            return result || {};
        } catch (err) {
            console.warn('withdrawal-enhance: error fetching offer', err);
            return {};
        }
    }

    async function acceptRetentionOffer(offerId) {
        try {
            var result = await api('/api/withdrawal-enhance/accept-offer', {
                method: 'POST',
                body: JSON.stringify({ offerId: offerId })
            });
            return result || { success: false };
        } catch (err) {
            console.warn('withdrawal-enhance: error accepting offer', err);
            return { success: false };
        }
    }

    function createConfetti() {
        var confettiPieces = [];
        for (var i = 0; i < 40; i++) {
            confettiPieces.push(document.createElement('div'));
        }

        var colors_list = [colors.gold2, colors.gold, '#ff6b9d', '#4ecdc4', '#ffe66d'];

        confettiPieces.forEach(function(piece) {
            piece.style.cssText = 'position:fixed;width:8px;height:8px;border-radius:50%;pointer-events:none;';
            piece.style.backgroundColor = colors_list[Math.floor(Math.random() * colors_list.length)];

            var startX = Math.random() * window.innerWidth;
            var startY = window.innerHeight / 2;
            piece.style.left = startX + 'px';
            piece.style.top = startY + 'px';

            var tx = (Math.random() - 0.5) * 400;
            var ty = (Math.random() - 0.5) * 500 - 200;

            piece.style.setProperty('--tx', tx + 'px');
            piece.style.setProperty('--ty', ty + 'px');
            piece.style.animation = 'weConfetti 2.5s ease-out forwards';

            document.body.appendChild(piece);

            setTimeout(function() {
                if (piece.parentNode) {
                    piece.parentNode.removeChild(piece);
                }
            }, 2500);
        });
    }

    function calculateFeeAndNet(amount) {
        var fee = amount * (config.feePercentage / 100);
        var net = amount - fee;
        return { fee: fee, net: net };
    }

    function showBlockedWithdrawal(reason) {
        var content = '<button class="we-close">&times;</button>' +
            '<div class="we-title">Withdrawal Unavailable</div>' +
            '<div class="we-message">' +
            '<div class="we-blocked">' + reason + '</div>' +
            '</div>' +
            '<div class="we-button-group">' +
            '<button class="we-button we-button-secondary" id="we-ok-btn">OK</button>' +
            '</div>';

        var parts = createModal(content);
        var closeBtn = parts.modal.querySelector('.we-close');
        var okBtn = parts.modal.querySelector('#we-ok-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        if (okBtn) {
            okBtn.addEventListener('click', closeModal);
        }
    }

    function showRetentionOffer(amount, offerData) {
        var calculation = calculateFeeAndNet(amount);
        var offerAmount = offerData.bonusAmount || 0;
        var offerDescription = offerData.description || 'Bonus credits waiting for you!';
        var offerId = offerData.id || 'unknown';

        var content = '<button class="we-close">&times;</button>' +
            '<div class="we-title">Before you go...</div>' +
            '<div class="we-subtitle">We have a special offer just for you!</div>' +
            '<div class="we-offer-card">' +
            '<div class="we-offer-title">WAIT! Here\'s a special offer just for you!</div>' +
            '<div class="we-offer-desc">' + offerDescription + '</div>' +
            '<div class="we-offer-amount">+$' + offerAmount.toFixed(2) + '</div>' +
            '</div>' +
            '<div class="we-button-group">' +
            '<button class="we-button we-button-primary" id="we-claim-btn">CLAIM BONUS</button>' +
            '<button class="we-button we-button-secondary" id="we-continue-btn">Continue Withdrawal</button>' +
            '</div>';

        var parts = createModal(content);
        var closeBtn = parts.modal.querySelector('.we-close');
        var claimBtn = parts.modal.querySelector('#we-claim-btn');
        var continueBtn = parts.modal.querySelector('#we-continue-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        if (claimBtn) {
            claimBtn.addEventListener('click', function() {
                claimBtn.disabled = true;
                claimBtn.textContent = 'Processing...';

                acceptRetentionOffer(offerId).then(function(result) {
                    if (result.success) {
                        createConfetti();
                        var modal = parts.modal;
                        modal.innerHTML = '<button class="we-close">&times;</button>' +
                            '<div class="we-title">Bonus Credited!</div>' +
                            '<div style="text-align:center;padding:40px 20px;font-size:20px;color:' + colors.gold2 + ';font-weight:bold;">' +
                            'Your bonus has been added to your account!' +
                            '</div>' +
                            '<div class="we-button-group">' +
                            '<button class="we-button we-button-secondary" id="we-close-modal">Close</button>' +
                            '</div>';

                        var newCloseBtn = modal.querySelector('.we-close');
                        var closeModalBtn = modal.querySelector('#we-close-modal');
                        if (newCloseBtn) {
                            newCloseBtn.addEventListener('click', closeModal);
                        }
                        if (closeModalBtn) {
                            closeModalBtn.addEventListener('click', closeModal);
                        }

                        if (typeof updateBalance === 'function') {
                            updateBalance();
                        }

                        setTimeout(closeModal, 3000);
                    } else {
                        claimBtn.disabled = false;
                        claimBtn.textContent = 'CLAIM BONUS';
                        alert('Error accepting offer. Please try again.');
                    }
                });
            });
        }

        if (continueBtn) {
            continueBtn.addEventListener('click', function() {
                showWithdrawalConfirmation(amount, calculation);
            });
        }
    }

    function showWithdrawalConfirmation(amount, calculation) {
        var content = '<button class="we-close">&times;</button>' +
            '<div class="we-title">Confirm Withdrawal</div>' +
            '<div class="we-fee-info">' +
            '<div class="we-fee-line">Withdrawal amount: <strong>$' + amount.toFixed(2) + '</strong></div>' +
            '<div class="we-fee-line">Fee (' + config.feePercentage + '%): <span class="we-fee-amount">$' + calculation.fee.toFixed(2) + '</span></div>' +
            '<div class="we-net-amount">You receive: $' + calculation.net.toFixed(2) + '</div>' +
            '</div>' +
            '<div class="we-button-group">' +
            '<button class="we-button we-button-primary" id="we-confirm-btn">CONFIRM WITHDRAWAL</button>' +
            '<button class="we-button we-button-secondary" id="we-back-btn">Go Back</button>' +
            '</div>';

        var parts = createModal(content);
        var closeBtn = parts.modal.querySelector('.we-close');
        var confirmBtn = parts.modal.querySelector('#we-confirm-btn');
        var backBtn = parts.modal.querySelector('#we-back-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                closeModal();
                document.dispatchEvent(new CustomEvent('withdrawal:confirmed', {
                    detail: { amount: amount, net: calculation.net, fee: calculation.fee }
                }));

                if (state.originalWithdrawFn && typeof state.originalWithdrawFn === 'function') {
                    state.originalWithdrawFn(amount);
                } else if (state.interceptedElement) {
                    state.interceptedElement.click();
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', function() {
                closeModal();
                showPreWithdrawal(amount);
            });
        }
    }

    function showPreWithdrawal(amount) {
        if (state.isShowing) {
            return;
        }

        state.currentWithdrawalAmount = amount;
        showLoadingStep();

        setTimeout(async function() {
            var eligibility = await checkWithdrawalEligibility();

            if (!eligibility.canWithdraw) {
                closeModal();
                showBlockedWithdrawal(eligibility.reason || 'You are not eligible to withdraw at this time.');
                return;
            }

            var offerData = await fetchRetentionOffer(amount);

            closeModal();
            if (offerData && offerData.bonusAmount > 0) {
                showRetentionOffer(amount, offerData);
            } else {
                var calculation = calculateFeeAndNet(amount);
                showWithdrawalConfirmation(amount, calculation);
            }
        }, config.spinnerDurationMs);
    }

    function interceptWithdrawalElement(element) {
        var originalOnClick = element.onclick;

        element.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            var amount = 0;
            if (element.dataset.amount) {
                amount = parseFloat(element.dataset.amount);
            } else if (element.getAttribute('data-withdrawal-amount')) {
                amount = parseFloat(element.getAttribute('data-withdrawal-amount'));
            }

            if (!amount && typeof getWithdrawalAmount === 'function') {
                amount = getWithdrawalAmount();
            }

            if (amount > 0) {
                state.interceptedElement = element;
                state.originalWithdrawFn = originalOnClick;
                showPreWithdrawal(amount);
            } else {
                console.warn('withdrawal-enhance: could not determine withdrawal amount');
            }
        }, true);
    }

    function findWithdrawalElements() {
        var selectors = [
            '#withdrawBtn',
            '#withdraw-btn',
            '.withdraw-button',
            '[data-action="withdraw"]'
        ];

        var elements = [];
        selectors.forEach(function(selector) {
            var found = document.querySelectorAll(selector);
            found.forEach(function(el) {
                if (elements.indexOf(el) === -1) {
                    elements.push(el);
                }
            });
        });

        return elements;
    }

    function init() {
        injectStyles();

        var withdrawalElements = findWithdrawalElements();
        withdrawalElements.forEach(function(element) {
            interceptWithdrawalElement(element);
        });

        document.addEventListener('withdrawal:initiated', function(e) {
            var amount = e.detail ? e.detail.amount : 0;
            if (amount > 0) {
                showPreWithdrawal(amount);
            }
        });

        console.warn('withdrawal-enhance: initialized');
    }

    window.WithdrawalEnhance = {
        init: init,
        showPreWithdrawal: showPreWithdrawal
    };
})();
