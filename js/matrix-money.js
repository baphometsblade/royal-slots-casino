/**
 * Matrix Money System Module
 * Matrix Spins Casino - msaart.online
 *
 * Manages virtual currency purchases and withdrawals
 * Implements purchase/sale of NFTs representing entertainment credits
 */

const MatrixMoney = (() => {
  'use strict';

  // Configuration
  const CONFIG = {
    storageName: 'matrixMoneyTransactions',
    packages: [
      { price: 5, credits: 500, label: '$5 Package' },
      { price: 10, credits: 1100, label: '$10 Package' },
      { price: 25, credits: 3000, label: '$25 Package' },
      { price: 50, credits: 6500, label: '$50 Package' },
      { price: 100, credits: 14000, label: '$100 Package' }
    ]
  };

  /**
   * Loads transaction history from localStorage
   */
  function loadTransactionHistory() {
    try {
      const stored = localStorage.getItem(CONFIG.storageName);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading transaction history:', error);
      return [];
    }
  }

  /**
   * Saves transaction to localStorage
   */
  function saveTransaction(transaction) {
    try {
      const history = loadTransactionHistory();
      history.push({
        ...transaction,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(CONFIG.storageName, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('Error saving transaction:', error);
      return false;
    }
  }

  /**
   * Displays the purchase Matrix Money modal with package options
   */
  function showPurchaseModal() {
    try {
      const existingModal = document.getElementById('matrix-money-purchase-modal');
      if (existingModal) existingModal.remove();

      const overlay = document.createElement('div');
      overlay.id = 'matrix-money-purchase-modal';
      overlay.className = 'modal-overlay active';

      let packagesHtml = CONFIG.packages.map(pkg => `
        <div style="background: rgba(86,210,160,0.1); border: 2px solid rgba(86,210,160,0.3); border-radius: 10px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease;"
             class="matrix-package-option"
             onmouseover="this.style.borderColor='rgba(249,202,36,0.5)'; this.style.background='rgba(249,202,36,0.1)'"
             onmouseout="this.style.borderColor='rgba(86,210,160,0.3)'; this.style.background='rgba(86,210,160,0.1)'"
             onclick="MatrixMoney.confirmPurchase(${pkg.price}, ${pkg.credits}, '${pkg.label}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #f9ca24; font-weight: 700; font-size: 16px;">${pkg.label}</div>
              <div style="color: #56d2a0; font-size: 14px; margin-top: 4px;">NFT Value: $${pkg.price.toFixed(2)}</div>
              <div style="color: #aaa; font-size: 12px; margin-top: 2px;">Get ${pkg.credits.toLocaleString()} Matrix Money</div>
            </div>
            <div style="background: linear-gradient(135deg, #f9ca24, #f0932b); color: #000; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 14px;">
              Buy Now
            </div>
          </div>
        </div>
      `).join('');

      overlay.innerHTML = `
        <div style="max-width: 600px; width: 100%; background: rgba(15,23,42,0.95); border: 1px solid rgba(249,202,36,0.2); border-radius: 14px; padding: 32px; color: #e0e0e0;">
          <button class="modal-close" aria-label="Close" onclick="this.closest('.modal-overlay').remove()">×</button>

          <h1 style="font-size: 24px; margin-bottom: 8px; color: #56d2a0; font-weight: 700;">Purchase Matrix Money</h1>
          <p style="color: #aaa; font-size: 13px; margin-bottom: 24px;">Select a package to buy entertainment credits</p>

          <div style="background: rgba(86,210,160,0.15); border-left: 3px solid #56d2a0; padding: 12px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
            <strong style="color: #56d2a0;">ℹ About Matrix Money NFTs:</strong>
            <p style="color: #aaa; margin-top: 6px;">When you purchase Matrix Money, you are purchasing a digital collectible (NFT) representing entertainment credits. This NFT has no value outside this Platform and cannot be traded or transferred. Matrix Money has NO real monetary value—it is for entertainment only.</p>
          </div>

          ${packagesHtml}

          <div style="background: rgba(249,202,36,0.1); border-left: 3px solid #f9ca24; padding: 12px 14px; border-radius: 6px; margin-top: 20px; font-size: 12px;">
            <strong style="color: #f9ca24;">⚠ Important Disclaimer:</strong>
            <p style="color: #aaa; margin-top: 6px;">• All purchases are final and cannot be refunded<br>
            • Matrix Money has no real-world monetary value<br>
            • Games are for entertainment with no guarantee of winnings<br>
            • You must be 18+ to use this Platform<br>
            • By purchasing, you accept our Terms of Service</p>
          </div>

          <button onclick="this.closest('.modal-overlay').remove()" style="width: 100%; margin-top: 20px; padding: 10px 20px; background: rgba(255,255,255,0.1); color: #aaa; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (error) {
      console.error('Error displaying purchase modal:', error);
    }
  }

  /**
   * Displays confirmation dialog for purchase
   */
  function confirmPurchase(price, credits, label) {
    try {
      const existingConfirm = document.getElementById('matrix-money-confirm-modal');
      if (existingConfirm) existingConfirm.remove();

      const overlay = document.createElement('div');
      overlay.id = 'matrix-money-confirm-modal';
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div style="max-width: 500px; width: 100%; background: rgba(15,23,42,0.95); border: 1px solid rgba(249,202,36,0.3); border-radius: 14px; padding: 32px; color: #e0e0e0; text-align: center;">
          <h2 style="font-size: 22px; margin-bottom: 20px; color: #56d2a0; font-weight: 700;">Confirm Purchase</h2>

          <div style="background: rgba(86,210,160,0.15); border: 1px solid rgba(86,210,160,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">You are purchasing an NFT for:</div>
            <div style="color: #56d2a0; font-size: 28px; font-weight: 700; margin-bottom: 12px;">${label}</div>
            <div style="color: #f9ca24; font-size: 18px; margin-bottom: 8px;">$${price.toFixed(2)} USD</div>
            <div style="color: #aaa; font-size: 13px; border-top: 1px solid rgba(86,210,160,0.3); padding-top: 12px; margin-top: 12px;">
              You will receive<br>
              <strong style="color: #56d2a0; font-size: 20px;">${credits.toLocaleString()} MM</strong>
            </div>
          </div>

          <div style="background: rgba(249,202,36,0.1); border-left: 3px solid #f9ca24; padding: 12px 14px; border-radius: 6px; margin-bottom: 20px; text-align: left; font-size: 12px;">
            <strong style="color: #f9ca24;">⚠ Final Confirmation:</strong>
            <p style="color: #aaa; margin-top: 6px;">
              • This transaction is <strong>FINAL</strong> and cannot be reversed<br>
              • Matrix Money NFT has no resale value outside this Platform<br>
              • You are 18+ and accept these terms<br>
              • Gaming is for entertainment only
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button onclick="document.getElementById('matrix-money-confirm-modal').remove()" style="padding: 12px 20px; background: rgba(255,255,255,0.1); color: #aaa; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="MatrixMoney.processPurchase(${price}, ${credits}, '${label}')" style="padding: 12px 20px; background: linear-gradient(135deg, #f9ca24, #f0932b); color: #000; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Confirm Purchase</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (error) {
      console.error('Error displaying confirmation modal:', error);
    }
  }

  /**
   * Processes the purchase (saves transaction and shows success)
   */
  function processPurchase(price, credits, label) {
    try {
      // Save transaction
      const success = saveTransaction({
        type: 'purchase',
        price,
        credits,
        label,
        status: 'completed'
      });

      if (!success) {
        showErrorModal('Error processing purchase. Please try again.');
        return;
      }

      // Close confirmation
      const confirmModal = document.getElementById('matrix-money-confirm-modal');
      if (confirmModal) confirmModal.remove();

      // Show success message
      showSuccessModal(
        'Purchase Successful!',
        `You have purchased a digital collectible (NFT) worth $${price.toFixed(2)}.<br>Your account has been credited with ${credits.toLocaleString()} Matrix Money credits.`,
        'You can now use your Matrix Money to play games on the Platform!'
      );
    } catch (error) {
      console.error('Error processing purchase:', error);
      showErrorModal('An error occurred while processing your purchase.');
    }
  }

  /**
   * Displays the withdrawal / sell NFT modal
   */
  function showWithdrawModal() {
    try {
      const existingModal = document.getElementById('matrix-money-withdraw-modal');
      if (existingModal) existingModal.remove();

      // Generate withdrawal options based on current balance (simulated)
      const withdrawalOptions = [100, 250, 500, 1000, 2500, 5000].map(amount => ({
        amount,
        usdValue: (amount / 1000).toFixed(2)
      }));

      let withdrawHtml = withdrawalOptions.map(opt => `
        <div style="background: rgba(86,210,160,0.1); border: 2px solid rgba(86,210,160,0.3); border-radius: 10px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease;"
             class="matrix-withdraw-option"
             onmouseover="this.style.borderColor='rgba(249,202,36,0.5)'; this.style.background='rgba(249,202,36,0.1)'"
             onmouseout="this.style.borderColor='rgba(86,210,160,0.3)'; this.style.background='rgba(86,210,160,0.1)'"
             onclick="MatrixMoney.confirmWithdraw(${opt.amount}, ${opt.usdValue})">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #56d2a0; font-weight: 700; font-size: 16px;">${opt.amount.toLocaleString()} MM</div>
              <div style="color: #aaa; font-size: 12px; margin-top: 4px;">Sell your NFT worth $${opt.usdValue}</div>
            </div>
            <div style="background: linear-gradient(135deg, #f9ca24, #f0932b); color: #000; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 13px;">
              Withdraw
            </div>
          </div>
        </div>
      `).join('');

      const overlay = document.createElement('div');
      overlay.id = 'matrix-money-withdraw-modal';
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div style="max-width: 600px; width: 100%; background: rgba(15,23,42,0.95); border: 1px solid rgba(249,202,36,0.2); border-radius: 14px; padding: 32px; color: #e0e0e0;">
          <button class="modal-close" aria-label="Close" onclick="this.closest('.modal-overlay').remove()">×</button>

          <h1 style="font-size: 24px; margin-bottom: 8px; color: #f9ca24; font-weight: 700;">Withdraw Matrix Money</h1>
          <p style="color: #aaa; font-size: 13px; margin-bottom: 24px;">Select how much of your NFT to sell back to the Platform</p>

          <div style="background: rgba(249,202,36,0.15); border-left: 3px solid #f9ca24; padding: 12px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
            <strong style="color: #f9ca24;">ℹ How Withdrawals Work:</strong>
            <p style="color: #aaa; margin-top: 6px;">When you withdraw Matrix Money, you are selling your digital collectible (NFT) back to the Platform at its stated value. Funds will be transferred to your registered payment method within 3-5 business days.</p>
          </div>

          ${withdrawHtml}

          <div style="background: rgba(249,202,36,0.1); border-left: 3px solid #f9ca24; padding: 12px 14px; border-radius: 6px; margin-top: 20px; font-size: 12px;">
            <strong style="color: #f9ca24;">⚠ Important:</strong>
            <p style="color: #aaa; margin-top: 6px;">• Withdrawals are final and cannot be reversed<br>
            • Processing time: 3-5 business days<br>
            • You can only withdraw from your current balance<br>
            • No partial refunds of gaming losses<br>
            • Matrix Money has no value outside this Platform</p>
          </div>

          <button onclick="this.closest('.modal-overlay').remove()" style="width: 100%; margin-top: 20px; padding: 10px 20px; background: rgba(255,255,255,0.1); color: #aaa; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (error) {
      console.error('Error displaying withdrawal modal:', error);
    }
  }

  /**
   * Displays confirmation dialog for withdrawal
   */
  function confirmWithdraw(mmAmount, usdValue) {
    try {
      const existingConfirm = document.getElementById('matrix-money-withdraw-confirm-modal');
      if (existingConfirm) existingConfirm.remove();

      const overlay = document.createElement('div');
      overlay.id = 'matrix-money-withdraw-confirm-modal';
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div style="max-width: 500px; width: 100%; background: rgba(15,23,42,0.95); border: 1px solid rgba(249,202,36,0.3); border-radius: 14px; padding: 32px; color: #e0e0e0; text-align: center;">
          <h2 style="font-size: 22px; margin-bottom: 20px; color: #f9ca24; font-weight: 700;">Confirm Withdrawal</h2>

          <div style="background: rgba(249,202,36,0.15); border: 1px solid rgba(249,202,36,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">You are selling back your NFT worth:</div>
            <div style="color: #f9ca24; font-size: 28px; font-weight: 700; margin-bottom: 12px;">$${usdValue}</div>
            <div style="color: #56d2a0; font-size: 16px; margin-bottom: 8px;">(${mmAmount.toLocaleString()} Matrix Money)</div>
            <div style="color: #aaa; font-size: 12px; border-top: 1px solid rgba(249,202,36,0.3); padding-top: 12px; margin-top: 12px;">
              Processing time:<br>
              <strong style="color: #f9ca24;">3-5 business days</strong>
            </div>
          </div>

          <div style="background: rgba(249,202,36,0.1); border-left: 3px solid #f9ca24; padding: 12px 14px; border-radius: 6px; margin-bottom: 20px; text-align: left; font-size: 12px;">
            <strong style="color: #f9ca24;">⚠ Final Confirmation:</strong>
            <p style="color: #aaa; margin-top: 6px;">
              • This withdrawal is <strong>FINAL</strong> and cannot be reversed<br>
              • Your Matrix Money balance will be reduced by ${mmAmount.toLocaleString()}<br>
              • Funds will be sent to your registered payment method<br>
              • No refunds for gaming losses are available
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button onclick="document.getElementById('matrix-money-withdraw-confirm-modal').remove()" style="padding: 12px 20px; background: rgba(255,255,255,0.1); color: #aaa; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="MatrixMoney.processWithdraw(${mmAmount}, ${usdValue})" style="padding: 12px 20px; background: linear-gradient(135deg, #f9ca24, #f0932b); color: #000; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Confirm Withdrawal</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (error) {
      console.error('Error displaying withdrawal confirmation:', error);
    }
  }

  /**
   * Processes the withdrawal (saves transaction and shows success)
   */
  function processWithdraw(mmAmount, usdValue) {
    try {
      // Save transaction
      const success = saveTransaction({
        type: 'withdrawal',
        mmAmount,
        usdValue,
        status: 'pending'
      });

      if (!success) {
        showErrorModal('Error processing withdrawal. Please try again.');
        return;
      }

      // Close confirmation
      const confirmModal = document.getElementById('matrix-money-withdraw-confirm-modal');
      if (confirmModal) confirmModal.remove();

      // Show success message
      showSuccessModal(
        'Withdrawal Initiated!',
        `You have sold your NFT worth $${usdValue} USD.<br>${mmAmount.toLocaleString()} Matrix Money has been removed from your account.`,
        'Your funds will arrive in 3-5 business days. You will receive an email confirmation.'
      );
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      showErrorModal('An error occurred while processing your withdrawal.');
    }
  }

  /**
   * Shows success modal dialog
   */
  function showSuccessModal(title, message, additionalInfo) {
    try {
      const existingModal = document.getElementById('matrix-money-success-modal');
      if (existingModal) existingModal.remove();

      const overlay = document.createElement('div');
      overlay.id = 'matrix-money-success-modal';
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div style="max-width: 500px; width: 100%; background: rgba(15,23,42,0.95); border: 1px solid rgba(86,210,160,0.3); border-radius: 14px; padding: 32px; color: #e0e0e0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
          <h2 style="font-size: 24px; margin-bottom: 16px; color: #56d2a0; font-weight: 700;">${title}</h2>
          <p style="color: #aaa; font-size: 14px; margin-bottom: 16px; line-height: 1.6;">${message}</p>
          <div style="background: rgba(86,210,160,0.1); border-left: 3px solid #56d2a0; padding: 12px 14px; border-radius: 6px; margin-bottom: 20px; text-align: left; font-size: 12px;">
            <p style="color: #aaa;">${additionalInfo}</p>
          </div>
          <button onclick="this.closest('.modal-overlay').remove()" style="width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #56d2a0, #4ecdc4); color: #000; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Continue</button>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (error) {
      console.error('Error showing success modal:', error);
    }
  }

  /**
   * Shows error modal dialog
   */
  function showErrorModal(message) {
    try {
      const existingModal = document.getElementById('matrix-money-error-modal');
      if (existingModal) existingModal.remove();

      const overlay = document.createElement('div');
      overlay.id = 'matrix-money-error-modal';
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div style="max-width: 500px; width: 100%; background: rgba(15,23,42,0.95); border: 1px solid rgba(255,70,70,0.3); border-radius: 14px; padding: 32px; color: #e0e0e0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠</div>
          <h2 style="font-size: 22px; margin-bottom: 16px; color: #ff4646; font-weight: 700;">Error</h2>
          <p style="color: #aaa; font-size: 14px; margin-bottom: 20px;">${message}</p>
          <button onclick="this.closest('.modal-overlay').remove()" style="width: 100%; padding: 12px 20px; background: rgba(255,70,70,0.3); color: #ff4646; border: 1px solid rgba(255,70,70,0.5); border-radius: 6px; font-weight: 700; cursor: pointer;">Close</button>
        </div>
      `;

      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (error) {
      console.error('Error showing error modal:', error);
    }
  }

  /**
   * Gets transaction history
   */
  function getTransactionHistory() {
    return loadTransactionHistory();
  }

  /**
   * Clears transaction history (admin function)
   */
  function clearTransactionHistory() {
    try {
      localStorage.removeItem(CONFIG.storageName);
      return true;
    } catch (error) {
      console.error('Error clearing transaction history:', error);
      return false;
    }
  }

  // Public API
  return {
    showPurchaseModal,
    confirmPurchase,
    processPurchase,
    showWithdrawModal,
    confirmWithdraw,
    processWithdraw,
    showSuccessModal,
    showErrorModal,
    getTransactionHistory,
    clearTransactionHistory
  };
})();

// Make functions available globally for onclick handlers and button clicks
window.MatrixMoney = MatrixMoney;

// Hook into existing deposit button if present (integrate with existing site)
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Look for deposit buttons and wire up Matrix Money modals
    const depositButtons = document.querySelectorAll('[data-action="deposit"], .deposit-btn, .deposit-button');
    depositButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        MatrixMoney.showPurchaseModal();
      });
    });

    // Look for withdraw buttons
    const withdrawButtons = document.querySelectorAll('[data-action="withdraw"], .withdraw-btn, .withdraw-button');
    withdrawButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        MatrixMoney.showWithdrawModal();
      });
    });
  } catch (error) {
    console.error('Error initializing Matrix Money event listeners:', error);
  }
});
