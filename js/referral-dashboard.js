/**
 * Royal Slots Casino - Referral Dashboard
 * Dark casino theme with gold accents (#fbbf24)
 * Mobile responsive IIFE
 */

(function () {
    'use strict';

    const TIER_REWARDS = [
        { min: 1, max: 5, bonus: 1 },
        { min: 6, max: 15, bonus: 2 },
        { min: 16, max: Infinity, bonus: 5 }
    ];

    const DOMAIN = 'https://msaart.online/';

    let modalElement = null;
    let dashboardData = null;
    let isInitialized = false;

    /**
     * Create and inject modal HTML
     */
    function createModal() {
        if (modalElement) return modalElement;

        const html = `
            <div id="referral-modal-backdrop" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9998;
            ">
                <div id="referral-modal" style="
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    border: 2px solid #fbbf24;
                    border-radius: 12px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 8px 32px rgba(251, 191, 36, 0.15);
                    z-index: 9999;
                    color: #fff;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                ">
                    <!-- Header -->
                    <div style="
                        padding: 24px;
                        border-bottom: 1px solid rgba(251, 191, 36, 0.3);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="
                            margin: 0;
                            font-size: 28px;
                            color: #fbbf24;
                            text-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
                        ">💰 Referral Program</h2>
                        <button id="referral-close-btn" style="
                            background: none;
                            border: none;
                            color: #fbbf24;
                            font-size: 28px;
                            cursor: pointer;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>

                    <!-- Content -->
                    <div style="padding: 24px; max-width: 600px;">
                        <!-- Referral Link Section -->
                        <div style="
                            background: rgba(251, 191, 36, 0.08);
                            border: 1px solid rgba(251, 191, 36, 0.3);
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 24px;
                        ">
                            <h3 style="
                                margin: 0 0 12px 0;
                                color: #fbbf24;
                                font-size: 14px;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            ">Your Referral Link</h3>
                            <div style="
                                display: flex;
                                gap: 8px;
                                flex-wrap: wrap;
                                align-items: center;
                                margin-bottom: 12px;
                            ">
                                <input id="referral-link-input" type="text" readonly style="
                                    flex: 1;
                                    min-width: 200px;
                                    background: rgba(0, 0, 0, 0.3);
                                    border: 1px solid rgba(251, 191, 36, 0.5);
                                    color: #fbbf24;
                                    padding: 10px 12px;
                                    border-radius: 6px;
                                    font-family: 'Courier New', monospace;
                                    font-size: 12px;
                                " />
                                <button id="referral-copy-btn" style="
                                    background: #fbbf24;
                                    border: none;
                                    color: #000;
                                    padding: 10px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-weight: 600;
                                    font-size: 13px;
                                    white-space: nowrap;
                                    transition: all 0.3s ease;
                                ">Copy</button>
                            </div>

                            <!-- Share Buttons -->
                            <div style="
                                display: flex;
                                gap: 8px;
                                flex-wrap: wrap;
                            ">
                                <button id="referral-share-twitter" class="share-btn" style="
                                    background: #1da1f2;
                                    border: none;
                                    color: white;
                                    padding: 8px 12px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: 500;
                                    transition: all 0.3s ease;
                                ">Twitter</button>
                                <button id="referral-share-facebook" class="share-btn" style="
                                    background: #1877f2;
                                    border: none;
                                    color: white;
                                    padding: 8px 12px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: 500;
                                    transition: all 0.3s ease;
                                ">Facebook</button>
                                <button id="referral-share-whatsapp" class="share-btn" style="
                                    background: #25d366;
                                    border: none;
                                    color: white;
                                    padding: 8px 12px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: 500;
                                    transition: all 0.3s ease;
                                ">WhatsApp</button>
                                <button id="referral-share-email" class="share-btn" style="
                                    background: #666;
                                    border: none;
                                    color: white;
                                    padding: 8px 12px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: 500;
                                    transition: all 0.3s ease;
                                ">Email</button>
                            </div>
                        </div>

                        <!-- Stats Section -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                            gap: 12px;
                            margin-bottom: 24px;
                        ">
                            <div class="stat-card" style="
                                background: rgba(251, 191, 36, 0.08);
                                border: 1px solid rgba(251, 191, 36, 0.3);
                                border-radius: 8px;
                                padding: 16px;
                                text-align: center;
                            ">
                                <div style="
                                    color: #999;
                                    font-size: 12px;
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                    margin-bottom: 8px;
                                ">Total Referrals</div>
                                <div id="stat-total-referrals" style="
                                    color: #fbbf24;
                                    font-size: 28px;
                                    font-weight: bold;
                                ">0</div>
                            </div>

                            <div class="stat-card" style="
                                background: rgba(251, 191, 36, 0.08);
                                border: 1px solid rgba(251, 191, 36, 0.3);
                                border-radius: 8px;
                                padding: 16px;
                                text-align: center;
                            ">
                                <div style="
                                    color: #999;
                                    font-size: 12px;
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                    margin-bottom: 8px;
                                ">Total Earned</div>
                                <div id="stat-total-earned" style="
                                    color: #fbbf24;
                                    font-size: 28px;
                                    font-weight: bold;
                                ">$0</div>
                            </div>

                            <div class="stat-card" style="
                                background: rgba(251, 191, 36, 0.08);
                                border: 1px solid rgba(251, 191, 36, 0.3);
                                border-radius: 8px;
                                padding: 16px;
                                text-align: center;
                            ">
                                <div style="
                                    color: #999;
                                    font-size: 12px;
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                    margin-bottom: 8px;
                                ">Pending</div>
                                <div id="stat-pending-referrals" style="
                                    color: #fbbf24;
                                    font-size: 28px;
                                    font-weight: bold;
                                ">0</div>
                            </div>
                        </div>

                        <!-- Tier Rewards Section -->
                        <div style="
                            background: rgba(251, 191, 36, 0.08);
                            border: 1px solid rgba(251, 191, 36, 0.3);
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 24px;
                        ">
                            <h3 style="
                                margin: 0 0 16px 0;
                                color: #fbbf24;
                                font-size: 14px;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            ">🎁 Tier Rewards</h3>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    padding: 8px;
                                    background: rgba(0, 0, 0, 0.2);
                                    border-radius: 6px;
                                    border-left: 3px solid #fbbf24;
                                ">
                                    <span style="font-size: 13px;">1-5 referrals</span>
                                    <span style="color: #fbbf24; font-weight: bold;">$1 each</span>
                                </div>
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    padding: 8px;
                                    background: rgba(0, 0, 0, 0.2);
                                    border-radius: 6px;
                                    border-left: 3px solid #fbbf24;
                                ">
                                    <span style="font-size: 13px;">6-15 referrals</span>
                                    <span style="color: #fbbf24; font-weight: bold;">$2 each</span>
                                </div>
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    padding: 8px;
                                    background: rgba(0, 0, 0, 0.2);
                                    border-radius: 6px;
                                    border-left: 3px solid #fbbf24;
                                ">
                                    <span style="font-size: 13px;">16+ referrals</span>
                                    <span style="color: #fbbf24; font-weight: bold;">$5 each</span>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Activity Section -->
                        <div style="
                            background: rgba(251, 191, 36, 0.08);
                            border: 1px solid rgba(251, 191, 36, 0.3);
                            border-radius: 8px;
                            padding: 20px;
                        ">
                            <h3 style="
                                margin: 0 0 16px 0;
                                color: #fbbf24;
                                font-size: 14px;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            ">📊 Recent Referral Activity</h3>
                            <div id="referral-activity-list" style="
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                            ">
                                <div style="
                                    padding: 12px;
                                    background: rgba(0, 0, 0, 0.2);
                                    border-radius: 6px;
                                    text-align: center;
                                    color: #999;
                                    font-size: 13px;
                                ">Loading activity...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        modalElement = tempDiv.querySelector('#referral-modal-backdrop');
        document.body.appendChild(modalElement);

        attachEventListeners();
        return modalElement;
    }

    /**
     * Attach event listeners to modal elements
     */
    function attachEventListeners() {
        const closeBtn = document.getElementById('referral-close-btn');
        const backdrop = document.getElementById('referral-modal-backdrop');

        if (closeBtn) {
            closeBtn.addEventListener('click', hide);
        }

        if (backdrop) {
            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop) {
                    hide();
                }
            });
        }

        // Copy button
        const copyBtn = document.getElementById('referral-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', copyToClipboard);
        }

        // Share buttons
        const shareTwitter = document.getElementById('referral-share-twitter');
        const shareFacebook = document.getElementById('referral-share-facebook');
        const shareWhatsApp = document.getElementById('referral-share-whatsapp');
        const shareEmail = document.getElementById('referral-share-email');

        if (shareTwitter) {
            shareTwitter.addEventListener('click', function () {
                shareVia('twitter');
            });
        }

        if (shareFacebook) {
            shareFacebook.addEventListener('click', function () {
                shareVia('facebook');
            });
        }

        if (shareWhatsApp) {
            shareWhatsApp.addEventListener('click', function () {
                shareVia('whatsapp');
            });
        }

        if (shareEmail) {
            shareEmail.addEventListener('click', function () {
                shareVia('email');
            });
        }
    }

    /**
     * Copy referral link to clipboard
     */
    function copyToClipboard() {
        const input = document.getElementById('referral-link-input');
        if (!input) return;

        input.select();
        document.execCommand('copy');

        const btn = document.getElementById('referral-copy-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(function () {
                btn.textContent = originalText;
            }, 2000);
        }
    }

    /**
     * Share referral link via social media or email
     */
    function shareVia(platform) {
        if (!dashboardData) {
            console.warn('[ReferralDashboard] No data available to share');
            return;
        }

        const url = dashboardData.referralUrl;
        const text = 'Join me at Royal Slots Casino and get a bonus! Use my referral link:';

        switch (platform) {
            case 'twitter':
                window.open(
                    'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text),
                    '_blank',
                    'width=600,height=400'
                );
                break;
            case 'facebook':
                window.open(
                    'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
                    '_blank',
                    'width=600,height=400'
                );
                break;
            case 'whatsapp':
                window.open(
                    'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url),
                    '_blank'
                );
                break;
            case 'email':
                window.location.href = 'mailto:?subject=' + encodeURIComponent('Join Royal Slots Casino') +
                    '&body=' + encodeURIComponent(text + '\n\n' + url);
                break;
        }
    }

    /**
     * Format date string
     */
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Get tier bonus for referral count
     */
    function getTierBonus(count) {
        for (let i = 0; i < TIER_REWARDS.length; i++) {
            if (count >= TIER_REWARDS[i].min && count <= TIER_REWARDS[i].max) {
                return TIER_REWARDS[i].bonus;
            }
        }
        return 0;
    }

    /**
     * Populate dashboard with data from API
     */
    function populateDashboard(data) {
        dashboardData = data;

        // Set referral link
        const linkInput = document.getElementById('referral-link-input');
        if (linkInput) {
            linkInput.value = data.referralUrl || DOMAIN + '?ref=' + data.code;
        }

        // Update stats
        const totalReferrals = data.totalReferrals || 0;
        const totalEarned = data.totalEarned || 0;
        const pendingReferrals = data.pendingReferrals || 0;

        const statTotal = document.getElementById('stat-total-referrals');
        if (statTotal) {
            statTotal.textContent = totalReferrals;
        }

        const statEarned = document.getElementById('stat-total-earned');
        if (statEarned) {
            statEarned.textContent = '$' + totalEarned.toFixed(2);
        }

        const statPending = document.getElementById('stat-pending-referrals');
        if (statPending) {
            statPending.textContent = pendingReferrals;
        }

        // Populate activity list
        if (data.referrals && data.referrals.length > 0) {
            const activityList = document.getElementById('referral-activity-list');
            if (activityList) {
                activityList.innerHTML = data.referrals.map(function (referral) {
                    const statusColor = referral.status === 'completed' ? '#4ade80' : '#fbbf24';
                    const statusText = referral.status === 'completed' ? 'Completed' : 'Pending';
                    return `
                        <div style="
                            padding: 12px;
                            background: rgba(0, 0, 0, 0.2);
                            border-radius: 6px;
                            border-left: 3px solid ${statusColor};
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-weight: 500;">${referral.referee_username}</span>
                                <span style="color: ${statusColor}; font-size: 12px; font-weight: 600;">${statusText}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #999;">
                                <span>${formatDate(referral.created_at)}</span>
                                <span style="color: #fbbf24; font-weight: bold;">+$${referral.bonus_paid.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            const activityList = document.getElementById('referral-activity-list');
            if (activityList) {
                activityList.innerHTML = `
                    <div style="
                        padding: 12px;
                        background: rgba(0, 0, 0, 0.2);
                        border-radius: 6px;
                        text-align: center;
                        color: #999;
                        font-size: 13px;
                    ">No referrals yet. Share your link to get started!</div>
                `;
            }
        }
    }

    /**
     * Fetch data from API
     */
    async function fetchDashboardData() {
        try {
            const infoResponse = await fetch('/api/referral/info', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!infoResponse.ok) {
                console.warn('[ReferralDashboard] Failed to fetch referral info:', infoResponse.status);
                return;
            }

            const infoData = await infoResponse.json();

            // Fetch activity stats
            const statsResponse = await fetch('/api/referral/stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            let referrals = [];
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                referrals = statsData.referrals || [];
            }

            const combinedData = {
                ...infoData,
                referrals: referrals
            };

            populateDashboard(combinedData);
        } catch (err) {
            console.warn('[ReferralDashboard] Error fetching dashboard data:', err.message);
        }
    }

    /**
     * Show the referral dashboard modal
     */
    function show() {
        if (!isInitialized) {
            console.warn('[ReferralDashboard] Dashboard not initialized. Call init() first.');
            return;
        }

        createModal();
        fetchDashboardData();

        const backdrop = document.getElementById('referral-modal-backdrop');
        if (backdrop) {
            backdrop.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide the referral dashboard modal
     */
    function hide() {
        const backdrop = document.getElementById('referral-modal-backdrop');
        if (backdrop) {
            backdrop.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Initialize the dashboard
     */
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Create modal early but don't show it
        createModal();
    }

    /**
     * Export public API
     */
    window.ReferralDashboard = {
        show: show,
        init: init
    };

})();
