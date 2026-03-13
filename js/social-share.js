/**
 * Social Share Module
 * Displays a celebratory share prompt when players hit big wins (>= 50x bet)
 */

window.SocialShare = (function() {
    'use strict';

    const BIG_WIN_MULTIPLIER = 50;
    const CASINO_NAME = 'Matrix Spins Casino';
    const CASINO_URL = 'msaart.online';
    const GAME_TAG = '#MatrixSpins';
    const WIN_TAG = '#BigWin';

    /**
     * Creates and displays the share modal
     */
    function showShareModal(winAmount, betAmount, gameName) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'social-share-modal';
        modal.innerHTML = `
            <div class="social-share-overlay"></div>
            <div class="social-share-container">
                <button class="social-share-close" aria-label="Close share modal">×</button>
                <div class="social-share-content">
                    <div class="social-share-header">
                        <h2>HUGE WIN!</h2>
                        <div class="social-share-amount">$${winAmount.toLocaleString()}</div>
                    </div>
                    <p class="social-share-prompt">Share your victory!</p>
                    <div class="social-share-buttons">
                        <button class="social-share-btn social-share-twitter" data-platform="twitter">
                            <span class="social-share-icon">𝕏</span>
                            <span>Share on X</span>
                        </button>
                        <button class="social-share-btn social-share-facebook" data-platform="facebook">
                            <span class="social-share-icon">f</span>
                            <span>Share on Facebook</span>
                        </button>
                        <button class="social-share-btn social-share-copy" data-platform="copy">
                            <span class="social-share-icon">📋</span>
                            <span>Copy Link</span>
                        </button>
                    </div>
                    <button class="social-share-dismiss">No thanks</button>
                </div>
            </div>
        `;

        // Add styles
        injectStyles();

        // Append to document
        document.body.appendChild(modal);

        // Generate share text
        const shareText = generateShareText(winAmount, gameName);

        // Set up event listeners
        const closeBtn = modal.querySelector('.social-share-close');
        const dismissBtn = modal.querySelector('.social-share-dismiss');
        const shareButtons = modal.querySelectorAll('.social-share-btn');

        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        dismissBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Close on overlay click
        modal.querySelector('.social-share-overlay').addEventListener('click', () => {
            modal.remove();
        });

        shareButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                handleShare(platform, shareText, betAmount, winAmount);
                modal.remove();
            });
        });
    }

    /**
     * Generates the share message text
     */
    function generateShareText(winAmount, gameName) {
        const game = gameName || 'the slots';
        return `I just won $${winAmount} on ${game} at ${CASINO_NAME}! 🎰🔥 Play now at ${CASINO_URL} ${GAME_TAG} ${WIN_TAG}`;
    }

    /**
     * Handles sharing to various platforms
     */
    function handleShare(platform, shareText, betAmount, winAmount) {
        // Use Web Share API if available
        if (navigator.share && (platform === 'twitter' || platform === 'facebook')) {
            navigator.share({
                title: 'Big Win!',
                text: shareText,
                url: `https://${CASINO_URL}`
            }).catch(err => {
                // User cancelled share or error occurred
                console.warn('Share API error:', err);
            });
            return;
        }

        // Fallback to window.open for specific platforms
        switch (platform) {
            case 'twitter':
                shareToTwitter(shareText);
                break;
            case 'facebook':
                shareToFacebook(shareText);
                break;
            case 'copy':
                copyToClipboard(shareText);
                break;
            default:
                console.warn('Unknown share platform:', platform);
        }
    }

    /**
     * Opens Twitter/X share dialog
     */
    function shareToTwitter(text) {
        const encodedText = encodeURIComponent(text);
        const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(url, 'twitter-share', 'width=550,height=420');
    }

    /**
     * Opens Facebook share dialog
     */
    function shareToFacebook(text) {
        const url = `https://www.facebook.com/sharer/sharer.php?u=https://${CASINO_URL}&quote=${encodeURIComponent(text)}`;
        window.open(url, 'facebook-share', 'width=550,height=420');
    }

    /**
     * Copies share text to clipboard
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.warn('Share link copied to clipboard');
        }).catch(err => {
            console.warn('Failed to copy to clipboard:', err);
        });
    }

    /**
     * Injects modal styles into the page
     */
    function injectStyles() {
        if (document.getElementById('social-share-styles')) {
            return; // Styles already injected
        }

        const style = document.createElement('style');
        style.id = 'social-share-styles';
        style.textContent = `
            .social-share-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 9998;
            }

            .social-share-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .social-share-container {
                position: relative;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #fbbf24;
                border-radius: 12px;
                padding: 32px;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8),
                           0 0 30px rgba(251, 191, 36, 0.3);
                animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .social-share-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                border: none;
                background: transparent;
                color: #fbbf24;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .social-share-close:hover {
                color: #fff;
                transform: scale(1.2);
            }

            .social-share-content {
                text-align: center;
            }

            .social-share-header {
                margin-bottom: 24px;
            }

            .social-share-header h2 {
                margin: 0 0 12px 0;
                font-size: 32px;
                font-weight: bold;
                color: #fbbf24;
                text-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
                letter-spacing: 2px;
            }

            .social-share-amount {
                font-size: 40px;
                font-weight: bold;
                color: #fff;
                text-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.85; }
            }

            .social-share-prompt {
                margin: 0 0 24px 0;
                color: #d0d0d0;
                font-size: 16px;
            }

            .social-share-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 16px;
            }

            .social-share-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 12px 20px;
                border: 2px solid #fbbf24;
                background: rgba(251, 191, 36, 0.1);
                color: #fbbf24;
                font-size: 16px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none;
            }

            .social-share-btn:hover {
                background: rgba(251, 191, 36, 0.2);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
            }

            .social-share-btn:active {
                transform: translateY(0);
            }

            .social-share-icon {
                font-size: 20px;
                font-weight: bold;
            }

            .social-share-dismiss {
                width: 100%;
                padding: 10px;
                border: 1px solid #666;
                background: transparent;
                color: #999;
                font-size: 14px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none;
            }

            .social-share-dismiss:hover {
                color: #bbb;
                border-color: #888;
            }

            .social-share-dismiss:active {
                opacity: 0.8;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Initializes the social share module
     */
    function init() {
        window.addEventListener('spin:complete', function(event) {
            const detail = event.detail;

            if (!detail || !detail.won) {
                return; // No win, ignore
            }

            const winAmount = detail.winAmount || 0;
            const betAmount = detail.betAmount || 0;

            if (betAmount === 0) {
                return; // Avoid division by zero
            }

            const multiplier = winAmount / betAmount;

            if (multiplier >= BIG_WIN_MULTIPLIER) {
                // Get game name from the slot machine if available
                const gameName = detail.gameName || 'Slots';
                showShareModal(winAmount, betAmount, gameName);
            }
        });

        console.warn('SocialShare module initialized');
    }

    return {
        init: init
    };
})();
