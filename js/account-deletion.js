/**
 * GDPR-Compliant Account Deletion Module
 * Provides secure account deletion with 14-day grace period
 * Exposes window.AccountDeletion = { showDeleteModal(), checkStatus() }
 */

(function() {
    'use strict';

    /**
     * Show account deletion confirmation modal
     * Requires password input for security verification
     */
    function showDeleteModal() {
        // Create modal container
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'account-deletion-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create modal dialog
        const modalDialog = document.createElement('div');
        modalDialog.style.cssText = `
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        `;

        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Delete Your Account';
        title.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 24px;
            color: #222;
            font-weight: 600;
        `;

        // Create warning section
        const warningBox = document.createElement('div');
        warningBox.style.cssText = `
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
            color: #856404;
        `;

        const warningTitle = document.createElement('strong');
        warningTitle.textContent = 'Warning: This action is serious';
        warningTitle.style.display = 'block';
        warningTitle.style.marginBottom = '8px';

        const warningText = document.createElement('p');
        warningText.style.cssText = `
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
        `;
        warningText.innerHTML = `
            Deleting your account will permanently erase all your data including:
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Account information and profile</li>
                <li>Balance and transaction history</li>
                <li>Game statistics and achievements</li>
                <li>Bonuses and rewards</li>
            </ul>
            This action <strong>cannot be undone</strong>.
        `;

        warningBox.appendChild(warningTitle);
        warningBox.appendChild(warningText);

        // Create grace period info
        const graceBox = document.createElement('div');
        graceBox.style.cssText = `
            background-color: #d1ecf1;
            border: 1px solid #0c5460;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
            color: #0c5460;
        `;

        const graceTitle = document.createElement('strong');
        graceTitle.textContent = '14-Day Grace Period';
        graceTitle.style.display = 'block';
        graceTitle.style.marginBottom = '8px';

        const graceText = document.createElement('p');
        graceText.style.cssText = `
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
        `;
        graceText.textContent = 'Your account will be scheduled for deletion. You have 14 days to change your mind and cancel the deletion before your account is permanently removed.';

        graceBox.appendChild(graceTitle);
        graceBox.appendChild(graceText);

        // Create password input section
        const passwordSection = document.createElement('div');
        passwordSection.style.marginBottom = '20px';

        const passwordLabel = document.createElement('label');
        passwordLabel.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #222;
            font-size: 14px;
        `;
        passwordLabel.textContent = 'Enter your password to confirm:';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.id = 'deletion-password-input';
        passwordInput.placeholder = 'Your password';
        passwordInput.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            font-family: inherit;
        `;
        passwordInput.setAttribute('aria-label', 'Password confirmation for account deletion');

        passwordSection.appendChild(passwordLabel);
        passwordSection.appendChild(passwordInput);

        // Create error message container
        const errorContainer = document.createElement('div');
        errorContainer.id = 'deletion-error-message';
        errorContainer.style.cssText = `
            display: none;
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 15px;
            font-size: 14px;
        `;

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        `;

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            padding: 10px 20px;
            border: 1px solid #ddd;
            background-color: #f5f5f5;
            color: #222;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s;
        `;
        cancelButton.onmouseover = () => {
            cancelButton.style.backgroundColor = '#e0e0e0';
        };
        cancelButton.onmouseout = () => {
            cancelButton.style.backgroundColor = '#f5f5f5';
        };
        cancelButton.onclick = () => {
            modalOverlay.remove();
        };

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete My Account';
        deleteButton.style.cssText = `
            padding: 10px 20px;
            border: none;
            background-color: #dc3545;
            color: #ffffff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s;
        `;
        deleteButton.onmouseover = () => {
            deleteButton.style.backgroundColor = '#c82333';
        };
        deleteButton.onmouseout = () => {
            deleteButton.style.backgroundColor = '#dc3545';
        };
        deleteButton.onclick = () => {
            handleDeleteSubmission(passwordInput.value, errorContainer, deleteButton);
        };

        // Allow Enter key to submit
        passwordInput.onkeypress = (event) => {
            if (event.key === 'Enter') {
                handleDeleteSubmission(passwordInput.value, errorContainer, deleteButton);
            }
        };

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(deleteButton);

        // Assemble modal
        modalDialog.appendChild(title);
        modalDialog.appendChild(warningBox);
        modalDialog.appendChild(graceBox);
        modalDialog.appendChild(errorContainer);
        modalDialog.appendChild(passwordSection);
        modalDialog.appendChild(buttonContainer);
        modalOverlay.appendChild(modalDialog);

        // Add to page
        document.body.appendChild(modalOverlay);

        // Focus password input
        passwordInput.focus();

        // Close modal when clicking overlay
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }

    /**
     * Handle account deletion submission
     */
    function handleDeleteSubmission(password, errorContainer, deleteButton) {
        if (!password) {
            showError(errorContainer, 'Please enter your password');
            return;
        }

        // Disable delete button during submission
        deleteButton.disabled = true;
        deleteButton.textContent = 'Processing...';

        // Send deletion request to backend
        fetch('/api/account/request-deletion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ password })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to schedule deletion');
                });
            }
            return response.json();
        })
        .then(data => {
            console.warn('[AccountDeletion] Account deletion scheduled:', data.message);

            // Show success message and close modal
            const modal = document.getElementById('account-deletion-modal-overlay');
            if (modal) {
                modal.remove();
            }

            // Show success notification
            showSuccessNotification(data.message, data.scheduledFor);
        })
        .catch(error => {
            console.warn('[AccountDeletion] Deletion request error:', error.message);
            deleteButton.disabled = false;
            deleteButton.textContent = 'Delete My Account';
            showError(errorContainer, error.message);
        });
    }

    /**
     * Show error message in modal
     */
    function showError(errorContainer, message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }

    /**
     * Show success notification after deletion is scheduled
     */
    function showSuccessNotification(message, scheduledDate) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: #ffffff;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            z-index: 10001;
        `;

        const title = document.createElement('strong');
        title.style.display = 'block';
        title.style.marginBottom = '8px';
        title.textContent = 'Account Deletion Scheduled';

        const text = document.createElement('p');
        text.style.cssText = 'margin: 0; font-size: 14px; line-height: 1.5;';
        text.textContent = message;

        notification.appendChild(title);
        notification.appendChild(text);
        document.body.appendChild(notification);

        // Auto-remove after 6 seconds
        setTimeout(() => {
            notification.remove();
        }, 6000);
    }

    /**
     * Check deletion status and display info if pending
     */
    function checkStatus() {
        fetch('/api/account/deletion-status', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to check deletion status');
            }
            return response.json();
        })
        .then(data => {
            if (data.pending) {
                console.warn('[AccountDeletion] Account has pending deletion scheduled for:', data.scheduledFor);
                displayPendingDeletionBanner(data.scheduledFor);
            }
        })
        .catch(error => {
            console.warn('[AccountDeletion] Status check error:', error.message);
        });
    }

    /**
     * Display banner indicating pending account deletion
     */
    function displayPendingDeletionBanner(scheduledDate) {
        const banner = document.createElement('div');
        banner.style.cssText = `
            background-color: #f8d7da;
            border-bottom: 2px solid #f5c6cb;
            color: #721c24;
            padding: 15px 20px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
        `;

        const text = document.createElement('p');
        text.style.margin = '0 0 10px 0';
        text.innerHTML = `<strong>⚠️ Your account is scheduled for deletion on ${new Date(scheduledDate).toLocaleDateString()}.</strong>`;

        const subtext = document.createElement('p');
        subtext.style.cssText = 'margin: 0; font-size: 13px;';
        subtext.textContent = 'You have 14 days to cancel this deletion.';

        const cancelLink = document.createElement('button');
        cancelLink.style.cssText = `
            background-color: transparent;
            color: #721c24;
            border: 1px solid #721c24;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            margin-top: 10px;
            transition: background-color 0.2s;
        `;
        cancelLink.textContent = 'Cancel Deletion';
        cancelLink.onmouseover = () => {
            cancelLink.style.backgroundColor = '#721c24';
            cancelLink.style.color = '#ffffff';
        };
        cancelLink.onmouseout = () => {
            cancelLink.style.backgroundColor = 'transparent';
            cancelLink.style.color = '#721c24';
        };
        cancelLink.onclick = () => {
            handleCancelDeletion(banner);
        };

        banner.appendChild(text);
        banner.appendChild(subtext);
        banner.appendChild(document.createElement('br'));
        banner.appendChild(cancelLink);

        // Insert at top of body or after header
        const header = document.querySelector('header') || document.querySelector('[role="banner"]');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(banner, header.nextSibling);
        } else {
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }

    /**
     * Handle cancellation of deletion
     */
    function handleCancelDeletion(banner) {
        if (!confirm('Are you sure you want to cancel the account deletion? Your account will remain active.')) {
            return;
        }

        fetch('/api/account/cancel-deletion', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to cancel deletion');
                });
            }
            return response.json();
        })
        .then(data => {
            console.warn('[AccountDeletion] Deletion cancelled:', data.message);
            banner.remove();

            // Show success notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #28a745;
                color: #ffffff;
                padding: 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                z-index: 10001;
            `;

            const title = document.createElement('strong');
            title.style.display = 'block';
            title.style.marginBottom = '8px';
            title.textContent = 'Deletion Cancelled';

            const text = document.createElement('p');
            text.style.cssText = 'margin: 0; font-size: 14px;';
            text.textContent = data.message;

            notification.appendChild(title);
            notification.appendChild(text);
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 4000);
        })
        .catch(error => {
            console.warn('[AccountDeletion] Cancel deletion error:', error.message);
            alert('Failed to cancel deletion: ' + error.message);
        });
    }

    // Public API
    window.AccountDeletion = {
        showDeleteModal: showDeleteModal,
        checkStatus: checkStatus
    };

    console.warn('[AccountDeletion] Module loaded. Use window.AccountDeletion.showDeleteModal() or window.AccountDeletion.checkStatus()');
})();
