(function() {
    'use strict';

    var LossInsurance = {
        config: {
            apiBase: '/api/loss-insurance',
            csrfPath: '/api/csrf-token',
            position: {
                bottom: '180px',
                left: '20px'
            },
            colors: {
                dark: '#0a0a1a',
                gold: '#d4af37',
                darkGold: '#b89c23',
                lightGold: '#e5c158',
                danger: '#e74c3c',
                success: '#27ae60'
            }
        },
        state: {
            activePolicy: null,
            tiers: null,
            csrfToken: null,
            modalOpen: false,
            currentTab: 'purchase'
        },

        init: function() {
            this.createShieldIcon();
            this.loadInitialData();
            this.setupEventListeners();
        },

        createShieldIcon: function() {
            var self = this;
            var container = document.createElement('div');
            container.id = 'loss-insurance-shield-container';
            container.style.cssText = 'position: fixed; bottom: ' + this.config.position.bottom + '; left: ' + this.config.position.left + '; z-index: 999; cursor: pointer;';

            var shield = document.createElement('div');
            shield.id = 'loss-insurance-shield';
            shield.innerHTML = '🛡️';
            shield.style.cssText = 'font-size: 40px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: ' + this.config.colors.dark + '; border: 2px solid ' + this.config.colors.gold + '; border-radius: 50%; cursor: pointer; user-select: none; transition: all 0.3s ease;';

            shield.addEventListener('mouseenter', function() {
                shield.style.transform = 'scale(1.1)';
            });

            shield.addEventListener('mouseleave', function() {
                shield.style.transform = 'scale(1)';
            });

            shield.addEventListener('click', function() {
                self.openModal();
            });

            container.appendChild(shield);
            document.body.appendChild(container);

            this.shieldElement = shield;
            this.updateShieldState();
        },

        updateShieldState: function() {
            var self = this;
            if (!this.activePolicy && this.shieldElement) {
                this.shieldElement.style.animation = 'loss-insurance-pulse 2s infinite';
                this.ensureStylesheet();
            } else if (this.shieldElement) {
                this.shieldElement.style.animation = 'none';
            }
        },

        ensureStylesheet: function() {
            if (document.getElementById('loss-insurance-styles')) return;

            var style = document.createElement('style');
            style.id = 'loss-insurance-styles';
            style.textContent = '@keyframes loss-insurance-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7); } 50% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); } } @keyframes loss-insurance-slideIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } } @keyframes loss-insurance-success { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }';
            document.head.appendChild(style);
        },

        loadInitialData: function() {
            var self = this;
            this.apiRequest(this.config.apiBase, {})
                .then(function(data) {
                    if (data) {
                        self.state.activePolicy = data.activePolicy || null;
                        self.state.tiers = data.tiers || {};
                        self.updateShieldState();
                    }
                })
                .catch(function(err) {
                    console.warn('Loss insurance: failed to load initial data', err);
                });
        },

        openModal: function() {
            var self = this;
            if (this.state.modalOpen) return;

            this.state.modalOpen = true;
            this.state.currentTab = 'purchase';

            var modal = document.createElement('div');
            modal.id = 'loss-insurance-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: loss-insurance-slideIn 0.3s ease;';

            var content = document.createElement('div');
            content.style.cssText = 'background: ' + this.config.colors.dark + '; border: 2px solid ' + this.config.colors.gold + '; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; color: #fff; padding: 30px; position: relative;';

            var closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: ' + this.config.colors.gold + '; font-size: 32px; cursor: pointer; padding: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;';
            closeBtn.addEventListener('click', function() {
                self.closeModal();
            });

            content.appendChild(closeBtn);

            var header = document.createElement('h2');
            header.style.cssText = 'margin: 0 0 20px 0; color: ' + this.config.colors.gold + '; font-size: 24px; text-align: center;';
            header.textContent = '🛡️ Loss Streak Insurance';
            content.appendChild(header);

            if (this.state.activePolicy) {
                this.renderActivePolicyView(content);
            } else {
                this.renderTiersView(content);
            }

            var tabContainer = document.createElement('div');
            tabContainer.style.cssText = 'margin-top: 20px; border-top: 1px solid ' + this.config.colors.gold + '; padding-top: 15px;';

            var historyTabBtn = document.createElement('button');
            historyTabBtn.textContent = 'Policy History';
            historyTabBtn.style.cssText = 'background: transparent; border: none; color: ' + this.config.colors.gold + '; cursor: pointer; text-decoration: underline; font-size: 14px;';
            historyTabBtn.addEventListener('click', function() {
                self.state.currentTab = 'history';
                self.renderHistoryView(content, tabContainer);
            });

            tabContainer.appendChild(historyTabBtn);
            content.appendChild(tabContainer);

            modal.appendChild(content);
            document.body.appendChild(modal);

            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    self.closeModal();
                }
            });

            this.modalElement = modal;
            this.ensureStylesheet();
        },

        renderTiersView: function(container) {
            var self = this;
            var tiersDiv = document.createElement('div');
            tiersDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;';

            var tierNames = ['bronze', 'silver', 'gold'];
            tierNames.forEach(function(tierName) {
                var tier = self.state.tiers[tierName];
                if (!tier) return;

                var card = document.createElement('div');
                card.style.cssText = 'background: rgba(212, 175, 55, 0.1); border: 2px solid ' + self.config.colors.gold + '; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s ease;';

                var tierLabel = document.createElement('div');
                tierLabel.style.cssText = 'font-weight: bold; color: ' + self.config.colors.gold + '; font-size: 18px; margin-bottom: 10px; text-transform: uppercase;';
                tierLabel.textContent = tierName;

                var tierIcon = document.createElement('div');
                tierIcon.style.cssText = 'font-size: 30px; margin-bottom: 10px;';
                tierIcon.textContent = tierName === 'bronze' ? '🥉' : tierName === 'silver' ? '🥈' : '🏆';

                var cost = document.createElement('div');
                cost.style.cssText = 'color: #fff; font-size: 14px; margin: 8px 0;';
                cost.innerHTML = '<strong>Cost:</strong> ' + tier.cost;

                var coverage = document.createElement('div');
                coverage.style.cssText = 'color: #fff; font-size: 12px; margin: 8px 0;';
                coverage.innerHTML = '<strong>Threshold:</strong> ' + tier.threshold + '<br/><strong>Refund:</strong> ' + tier.refund_pct + '%';

                var buyBtn = document.createElement('button');
                buyBtn.textContent = 'BUY';
                buyBtn.style.cssText = 'background: ' + self.config.colors.gold + '; color: ' + self.config.colors.dark + '; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; margin-top: 12px; font-weight: bold; width: 100%; transition: all 0.3s ease;';

                buyBtn.addEventListener('mouseenter', function() {
                    buyBtn.style.background = self.config.colors.lightGold;
                });

                buyBtn.addEventListener('mouseleave', function() {
                    buyBtn.style.background = self.config.colors.gold;
                });

                buyBtn.addEventListener('click', function() {
                    self.purchaseTier(tierName, tier);
                });

                card.appendChild(tierLabel);
                card.appendChild(tierIcon);
                card.appendChild(cost);
                card.appendChild(coverage);
                card.appendChild(buyBtn);

                card.addEventListener('mouseenter', function() {
                    card.style.background = 'rgba(212, 175, 55, 0.2)';
                    card.style.transform = 'translateY(-5px)';
                });

                card.addEventListener('mouseleave', function() {
                    card.style.background = 'rgba(212, 175, 55, 0.1)';
                    card.style.transform = 'translateY(0)';
                });

                tiersDiv.appendChild(card);
            });

            container.appendChild(tiersDiv);
        },

        renderActivePolicyView: function(container) {
            var self = this;
            var policy = this.state.activePolicy;

            var policyDiv = document.createElement('div');
            policyDiv.style.cssText = 'background: rgba(39, 174, 96, 0.1); border: 2px solid ' + this.config.colors.success + '; border-radius: 8px; padding: 20px; margin-top: 20px;';

            var statusLabel = document.createElement('div');
            statusLabel.style.cssText = 'color: ' + this.config.colors.success + '; font-size: 14px; font-weight: bold; margin-bottom: 12px;';
            statusLabel.textContent = '✓ ACTIVE POLICY';

            var tierDisplay = document.createElement('div');
            tierDisplay.style.cssText = 'color: ' + this.config.colors.gold + '; font-size: 20px; font-weight: bold; margin-bottom: 15px;';
            tierDisplay.textContent = policy.tier ? policy.tier.toUpperCase() + ' tier' : 'Unknown tier';

            var details = document.createElement('div');
            details.style.cssText = 'color: #fff; font-size: 14px; line-height: 1.8; margin-bottom: 15px;';
            details.innerHTML = '<div><strong>Threshold:</strong> ' + (policy.threshold || 'N/A') + '</div><div><strong>Refund Rate:</strong> ' + (policy.refund_pct || 'N/A') + '%</div><div><strong>Active Until:</strong> ' + (policy.expires_at || 'N/A') + '</div>';

            var claimBtn = document.createElement('button');
            claimBtn.textContent = policy.eligible_for_claim ? 'CLAIM NOW' : 'NOT ELIGIBLE';
            claimBtn.disabled = !policy.eligible_for_claim;
            claimBtn.style.cssText = 'background: ' + (policy.eligible_for_claim ? this.config.colors.success : '#555') + '; color: #fff; border: none; border-radius: 4px; padding: 10px 20px; cursor: ' + (policy.eligible_for_claim ? 'pointer' : 'not-allowed') + '; font-weight: bold; width: 100%; margin-top: 12px; transition: all 0.3s ease;';

            if (policy.eligible_for_claim) {
                claimBtn.addEventListener('mouseenter', function() {
                    claimBtn.style.background = '#229954';
                });

                claimBtn.addEventListener('mouseleave', function() {
                    claimBtn.style.background = self.config.colors.success;
                });

                claimBtn.addEventListener('click', function() {
                    self.claimInsurance();
                });
            }

            policyDiv.appendChild(statusLabel);
            policyDiv.appendChild(tierDisplay);
            policyDiv.appendChild(details);
            policyDiv.appendChild(claimBtn);

            container.appendChild(policyDiv);
        },

        renderHistoryView: function(container, tabContainer) {
            var self = this;
            container.innerHTML = '';

            var header = document.createElement('h2');
            header.style.cssText = 'margin: 0 0 20px 0; color: ' + this.config.colors.gold + '; font-size: 24px; text-align: center;';
            header.textContent = '📋 Policy History';
            container.appendChild(header);

            var backBtn = document.createElement('button');
            backBtn.textContent = '← Back';
            backBtn.style.cssText = 'background: transparent; border: 1px solid ' + this.config.colors.gold + '; color: ' + this.config.colors.gold + '; cursor: pointer; padding: 8px 16px; border-radius: 4px; margin-bottom: 15px;';
            backBtn.addEventListener('click', function() {
                self.state.currentTab = 'purchase';
                self.openModal();
                self.closeModal();
                self.openModal();
            });
            container.appendChild(backBtn);

            var loading = document.createElement('div');
            loading.style.cssText = 'color: #ccc; text-align: center; padding: 20px;';
            loading.textContent = 'Loading history...';
            container.appendChild(loading);

            this.apiRequest(this.config.apiBase + '/history', {})
                .then(function(data) {
                    loading.remove();
                    if (data && data.length > 0) {
                        var historyList = document.createElement('div');
                        historyList.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

                        data.forEach(function(entry) {
                            var item = document.createElement('div');
                            item.style.cssText = 'background: rgba(212, 175, 55, 0.1); border-left: 3px solid ' + self.config.colors.gold + '; padding: 12px; border-radius: 4px;';
                            item.innerHTML = '<div style="color: ' + self.config.colors.gold + '; font-weight: bold;">' + (entry.tier ? entry.tier.toUpperCase() : 'Unknown') + '</div><div style="color: #ccc; font-size: 12px;">Date: ' + (entry.created_at || 'N/A') + '</div>';
                            historyList.appendChild(item);
                        });

                        container.appendChild(historyList);
                    } else {
                        var empty = document.createElement('div');
                        empty.style.cssText = 'color: #999; text-align: center; padding: 20px;';
                        empty.textContent = 'No policy history yet.';
                        container.appendChild(empty);
                    }
                })
                .catch(function(err) {
                    console.warn('Loss insurance: failed to load history', err);
                    loading.textContent = 'Failed to load history';
                });
        },

        purchaseTier: function(tierName, tier) {
            var self = this;
            var confirmed = confirm('Purchase ' + tierName.toUpperCase() + ' policy for ' + tier.cost + ' coins?');
            if (!confirmed) return;

            this.getCsrfToken()
                .then(function(token) {
                    return self.apiRequest(self.config.apiBase + '/purchase', {
                        method: 'POST',
                        body: JSON.stringify({ tier: tierName }),
                        headers: { 'X-CSRF-Token': token }
                    });
                })
                .then(function(data) {
                    if (data && data.success) {
                        self.state.activePolicy = data.policy || {};
                        self.showSuccessAnimation('Insurance purchased!');
                        self.updateShieldState();
                        setTimeout(function() {
                            self.closeModal();
                        }, 1500);
                    } else {
                        console.warn('Loss insurance: purchase failed', data);
                    }
                })
                .catch(function(err) {
                    console.warn('Loss insurance: purchase error', err);
                });
        },

        claimInsurance: function() {
            var self = this;
            var confirmed = confirm('Claim insurance payout?');
            if (!confirmed) return;

            this.getCsrfToken()
                .then(function(token) {
                    return self.apiRequest(self.config.apiBase + '/claim', {
                        method: 'POST',
                        body: JSON.stringify({}),
                        headers: { 'X-CSRF-Token': token }
                    });
                })
                .then(function(data) {
                    if (data && data.success) {
                        self.state.activePolicy = null;
                        self.showSuccessAnimation('Claim successful! Payout received.');
                        self.updateShieldState();
                        setTimeout(function() {
                            self.closeModal();
                        }, 1500);
                    } else {
                        console.warn('Loss insurance: claim failed', data);
                    }
                })
                .catch(function(err) {
                    console.warn('Loss insurance: claim error', err);
                });
        },

        showSuccessAnimation: function(message) {
            var self = this;
            var notification = document.createElement('div');
            notification.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: ' + this.config.colors.success + '; color: #fff; padding: 20px 30px; border-radius: 8px; z-index: 10001; font-weight: bold; text-align: center; animation: loss-insurance-success 0.6s ease;';
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(function() {
                notification.remove();
            }, 2000);
        },

        closeModal: function() {
            if (this.modalElement) {
                this.modalElement.remove();
                this.modalElement = null;
            }
            this.state.modalOpen = false;
        },

        getCsrfToken: function() {
            var self = this;
            if (this.state.csrfToken) {
                return Promise.resolve(this.state.csrfToken);
            }

            return this.apiRequest(this.config.csrfPath, {})
                .then(function(data) {
                    if (data && data.token) {
                        self.state.csrfToken = data.token;
                        return data.token;
                    }
                    return null;
                })
                .catch(function(err) {
                    console.warn('Loss insurance: failed to get CSRF token', err);
                    return null;
                });
        },

        apiRequest: function(path, opts) {
            opts = opts || {};
            var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
            var token = localStorage.getItem(tokenKey);

            if (!token && !opts.noAuth) {
                return Promise.resolve(null);
            }

            var headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;
            if (opts.headers) Object.assign(headers, opts.headers);

            var fetchOpts = Object.assign({}, opts, { headers: headers });
            return fetch(path, fetchOpts).catch(function(err) {
                console.warn('Loss insurance: API request failed', err);
                return null;
            }).then(function(res) {
                if (!res) return null;
                return res.json().catch(function() {
                    return null;
                });
            });
        },

        setupEventListeners: function() {
            var self = this;
            window.addEventListener('beforeunload', function() {
                self.closeModal();
            });
        }
    };

    window.LossInsurance = LossInsurance;

})();
