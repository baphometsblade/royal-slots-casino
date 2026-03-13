/**
 * Game Rating Module
 *
 * Provides a 1-5 star rating system with optional text reviews.
 * Exposes window.GameRating = { showRateModal(gameId, gameName), init() }
 *
 * Features:
 * - Star rating widget (click to rate)
 * - Optional text review field
 * - Shows average rating and total count
 * - Prompts user to rate after 10+ spins on a game
 * - Dark theme with gold stars
 */

(function() {
    'use strict';

    // Track spin counts per game and rating state
    const spinCountByGame = {};
    const ratedGames = new Set();

    /**
     * Create and show the rating modal for a game.
     * @param {string} gameId - Unique game identifier
     * @param {string} gameName - Display name of the game
     */
    function showRateModal(gameId, gameName) {
        // Prevent showing modal multiple times for same game
        if (document.getElementById('rating-modal-overlay')) {
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'rating-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #d4af37;
            border-radius: 12px;
            padding: 28px;
            width: 90%;
            max-width: 450px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.3);
            font-family: 'Arial', sans-serif;
            color: #fff;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Rate ' + gameName;
        title.style.cssText = `
            margin: 0 0 8px 0;
            font-size: 20px;
            color: #d4af37;
            text-align: center;
        `;

        // Subtitle
        const subtitle = document.createElement('p');
        subtitle.textContent = 'How did you like this game?';
        subtitle.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 14px;
            color: #b0b0b0;
            text-align: center;
        `;

        // Star rating widget
        const starContainer = document.createElement('div');
        starContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
        `;

        let selectedRating = 0;
        const stars = [];

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.textContent = '★';
            star.style.cssText = `
                font-size: 40px;
                cursor: pointer;
                color: #444;
                transition: all 0.2s ease;
                user-select: none;
            `;
            star.dataset.rating = i;

            star.addEventListener('mouseover', () => {
                for (let j = 0; j < stars.length; j++) {
                    stars[j].style.color = j < i ? '#d4af37' : '#444';
                }
            });

            star.addEventListener('mouseleave', () => {
                for (let j = 0; j < stars.length; j++) {
                    stars[j].style.color = j < selectedRating ? '#d4af37' : '#444';
                }
            });

            star.addEventListener('click', () => {
                selectedRating = i;
                for (let j = 0; j < stars.length; j++) {
                    stars[j].style.color = j < selectedRating ? '#d4af37' : '#444';
                }
            });

            starContainer.appendChild(star);
            stars.push(star);
        }

        // Review text field
        const reviewLabel = document.createElement('label');
        reviewLabel.textContent = 'Optional Review';
        reviewLabel.style.cssText = `
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            color: #d4af37;
        `;

        const reviewInput = document.createElement('textarea');
        reviewInput.placeholder = 'Share your thoughts about this game...';
        reviewInput.maxLength = '1000';
        reviewInput.style.cssText = `
            width: 100%;
            padding: 10px;
            border: 1px solid #d4af37;
            border-radius: 6px;
            background: #0f0f1e;
            color: #fff;
            font-family: 'Arial', sans-serif;
            font-size: 13px;
            resize: vertical;
            min-height: 80px;
            box-sizing: border-box;
            transition: border-color 0.2s ease;
        `;

        reviewInput.addEventListener('focus', () => {
            reviewInput.style.borderColor = '#ffd700';
            reviewInput.style.boxShadow = '0 0 8px rgba(212, 175, 55, 0.5)';
        });

        reviewInput.addEventListener('blur', () => {
            reviewInput.style.borderColor = '#d4af37';
            reviewInput.style.boxShadow = 'none';
        });

        // Character count
        const charCount = document.createElement('div');
        charCount.textContent = '0 / 1000';
        charCount.style.cssText = `
            text-align: right;
            font-size: 11px;
            color: #888;
            margin-top: 4px;
            margin-bottom: 16px;
        `;

        reviewInput.addEventListener('input', () => {
            charCount.textContent = reviewInput.value.length + ' / 1000';
        });

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit Rating';
        submitBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
            color: #1a1a2e;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        submitBtn.addEventListener('mouseover', () => {
            submitBtn.style.transform = 'scale(1.02)';
            submitBtn.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.5)';
        });

        submitBtn.addEventListener('mouseleave', () => {
            submitBtn.style.transform = 'scale(1)';
            submitBtn.style.boxShadow = 'none';
        });

        submitBtn.addEventListener('click', () => {
            if (selectedRating === 0) {
                console.warn('[GameRating] Please select a rating');
                return;
            }
            submitRating(gameId, selectedRating, reviewInput.value);
        });

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #333;
            color: #d4af37;
            border: 1px solid #d4af37;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.background = '#444';
        });

        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = '#333';
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            ratedGames.add(gameId);
        });

        buttonContainer.appendChild(submitBtn);
        buttonContainer.appendChild(cancelBtn);

        // Assemble modal
        modal.appendChild(title);
        modal.appendChild(subtitle);
        modal.appendChild(starContainer);
        modal.appendChild(reviewLabel);
        modal.appendChild(reviewInput);
        modal.appendChild(charCount);
        modal.appendChild(buttonContainer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Focus on review field for convenience
        setTimeout(() => reviewInput.focus(), 100);
    }

    /**
     * Submit rating to backend.
     * @param {string} gameId
     * @param {number} rating (1-5)
     * @param {string} review (optional)
     */
    function submitRating(gameId, rating, review) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[GameRating] Not authenticated, cannot submit rating');
            return;
        }

        fetch('/api/feedback/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                gameId,
                rating,
                review: review && review.trim() ? review.trim() : undefined
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                console.warn('[GameRating] Rating submitted for', gameId);
                const overlay = document.getElementById('rating-modal-overlay');
                if (overlay) overlay.remove();
                ratedGames.add(gameId);

                // Show brief success message
                showSuccessMessage('Rating submitted! Thanks for your feedback.');
            } else {
                console.warn('[GameRating] Failed to submit rating:', data.error);
            }
        })
        .catch(err => {
            console.warn('[GameRating] Error submitting rating:', err.message);
        });
    }

    /**
     * Show brief success notification.
     * @param {string} message
     */
    function showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
            color: #1a1a2e;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.5);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    /**
     * Initialize the rating system.
     * Listens for spin:complete events and prompts user to rate after 10+ spins.
     * Uses window.currentGame to track the active game.
     */
    function init() {
        // Listen for spin completion
        window.addEventListener('spin:complete', function(evt) {
            try {
                // Get current game from global variable
                if (typeof currentGame === 'undefined' || !currentGame) {
                    return;
                }

                const gameId = currentGame.id;
                const gameName = currentGame.name;

                if (!gameId) return;

                // Track spin count
                spinCountByGame[gameId] = (spinCountByGame[gameId] || 0) + 1;

                // Check if user should be prompted to rate
                const spinCount = spinCountByGame[gameId];
                const shouldPrompt = spinCount >= 10 && !ratedGames.has(gameId);

                if (shouldPrompt) {
                    // Show subtle prompt after a brief delay
                    setTimeout(() => {
                        showRatingPrompt(gameId, gameName);
                    }, 500);
                }
            } catch (err) {
                console.warn('[GameRating] Error processing spin:complete:', err.message);
            }
        });

        console.warn('[GameRating] Module initialized');
    }

    /**
     * Show subtle rating prompt to user.
     * @param {string} gameId
     * @param {string} gameName
     */
    function showRatingPrompt(gameId, gameName) {
        // Prevent duplicate prompts
        if (document.getElementById('rating-prompt')) {
            return;
        }

        const prompt = document.createElement('div');
        prompt.id = 'rating-prompt';
        prompt.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #d4af37;
            border-radius: 8px;
            padding: 16px;
            max-width: 300px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.2);
            z-index: 9999;
            font-family: 'Arial', sans-serif;
            color: #fff;
        `;

        const text = document.createElement('p');
        text.textContent = 'Enjoyed ' + gameName + '? Share your rating!';
        text.style.cssText = `
            margin: 0 0 12px 0;
            font-size: 13px;
            color: #d4af37;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        const rateBtn = document.createElement('button');
        rateBtn.textContent = 'Rate Now';
        rateBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #d4af37;
            color: #1a1a2e;
            border: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        rateBtn.addEventListener('mouseover', () => {
            rateBtn.style.background = '#ffd700';
        });

        rateBtn.addEventListener('mouseleave', () => {
            rateBtn.style.background = '#d4af37';
        });

        rateBtn.addEventListener('click', () => {
            prompt.remove();
            showRateModal(gameId, gameName);
        });

        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Later';
        dismissBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: transparent;
            color: #d4af37;
            border: 1px solid #d4af37;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        dismissBtn.addEventListener('mouseover', () => {
            dismissBtn.style.background = 'rgba(212, 175, 55, 0.1)';
        });

        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.background = 'transparent';
        });

        dismissBtn.addEventListener('click', () => {
            prompt.remove();
        });

        buttonContainer.appendChild(rateBtn);
        buttonContainer.appendChild(dismissBtn);

        prompt.appendChild(text);
        prompt.appendChild(buttonContainer);
        document.body.appendChild(prompt);

        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            if (prompt.parentElement) {
                prompt.remove();
            }
        }, 8000);
    }

    // Public API
    window.GameRating = {
        showRateModal,
        init
    };

})();
