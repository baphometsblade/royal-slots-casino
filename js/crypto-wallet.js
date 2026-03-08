/**
 * MetaMask / Ethereum Wallet Integration
 *
 * Provides:
 *   - MetaMask detection and connection
 *   - ETH balance display
 *   - Send-ETH-to-deposit flow with live confirmation tracking
 *   - ETH/AUD rate fetching
 *
 * Dependencies: ethers.js v6 (loaded via CDN in index.html)
 * All functions are global-scope for compatibility with the existing codebase.
 */

'use strict';

// ─── State ───
let cryptoProvider = null;
let cryptoSigner = null;
let cryptoConnectedAddress = null;
let cryptoWalletAddress = null;   // Casino's receiving wallet
let cryptoChainId = 1;             // Expected chain ID
let cryptoChainName = 'Ethereum Mainnet';
let cryptoEthRate = 0;             // Current ETH/AUD rate
let cryptoMinDeposit = 5;
let cryptoMaxDeposit = 100000;
let cryptoMinConfirmations = 2;
let cryptoConfigLoaded = false;

// ─── Config Loading ───

async function cryptoLoadConfig() {
    if (cryptoConfigLoaded) return true;
    try {
        const res = await apiRequest('/api/crypto/config');
        if (res.error) {
            console.warn('[Crypto] Not configured:', res.error);
            return false;
        }
        cryptoWalletAddress = res.walletAddress;
        cryptoChainId = res.chainId;
        cryptoChainName = res.chainName;
        cryptoMinDeposit = res.minDepositAUD || 5;
        cryptoMaxDeposit = res.maxDepositAUD || 100000;
        cryptoMinConfirmations = res.minConfirmations || 2;
        cryptoConfigLoaded = true;
        return true;
    } catch (err) {
        console.warn('[Crypto] Config load failed:', err.message);
        return false;
    }
}

// ─── MetaMask Detection ───

function cryptoIsMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
}

function cryptoIsEthersLoaded() {
    return typeof ethers !== 'undefined' && typeof ethers.BrowserProvider === 'function';
}

// ─── Wallet Connection ───

async function cryptoConnectWallet() {
    if (!cryptoIsEthersLoaded()) {
        showToast('Ethereum library not loaded. Please refresh the page.', 'error');
        return null;
    }

    if (!cryptoIsMetaMaskInstalled()) {
        showToast('MetaMask is not installed. Please install it from metamask.io', 'error');
        window.open('https://metamask.io/download/', '_blank');
        return null;
    }

    try {
        cryptoProvider = new ethers.BrowserProvider(window.ethereum);
        cryptoSigner = await cryptoProvider.getSigner();
        cryptoConnectedAddress = await cryptoSigner.getAddress();

        // Verify correct network
        const network = await cryptoProvider.getNetwork();
        const currentChainId = Number(network.chainId);

        if (currentChainId !== cryptoChainId) {
            showToast(`Please switch MetaMask to ${cryptoChainName} (Chain ID: ${cryptoChainId})`, 'error', 6000);

            // Try to switch network
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + cryptoChainId.toString(16) }]
                });
                // Re-connect after chain switch
                cryptoProvider = new ethers.BrowserProvider(window.ethereum);
                cryptoSigner = await cryptoProvider.getSigner();
                cryptoConnectedAddress = await cryptoSigner.getAddress();
            } catch (switchErr) {
                console.warn('[Crypto] Chain switch failed:', switchErr);
                return null;
            }
        }

        return cryptoConnectedAddress;
    } catch (err) {
        if (err.code === 4001) {
            showToast('MetaMask connection was rejected.', 'error');
        } else {
            showToast('Failed to connect MetaMask: ' + (err.message || 'Unknown error'), 'error');
        }
        console.error('[Crypto] Connect error:', err);
        return null;
    }
}

// ─── Balance ───

async function cryptoGetBalance() {
    if (!cryptoProvider || !cryptoConnectedAddress) return '0';
    try {
        const wei = await cryptoProvider.getBalance(cryptoConnectedAddress);
        return ethers.formatEther(wei);
    } catch (err) {
        console.warn('[Crypto] Balance fetch failed:', err);
        return '0';
    }
}

// ─── Price ───

async function cryptoFetchRate() {
    try {
        const res = await apiRequest('/api/crypto/rate');
        if (res.eth_aud) {
            cryptoEthRate = res.eth_aud;
        }
        return cryptoEthRate;
    } catch (err) {
        console.warn('[Crypto] Rate fetch failed:', err);
        return cryptoEthRate || 5000;
    }
}

function cryptoAudToEth(audAmount) {
    if (!cryptoEthRate || cryptoEthRate <= 0) return 0;
    return audAmount / cryptoEthRate;
}

function cryptoEthToAud(ethAmount) {
    if (!cryptoEthRate || cryptoEthRate <= 0) return 0;
    return ethAmount * cryptoEthRate;
}

// ─── Send ETH (Deposit) ───

/**
 * Send ETH from the user's MetaMask to the casino wallet.
 * Returns the transaction hash on success, or null on failure.
 */
async function cryptoSendDeposit(audAmount) {
    if (!cryptoSigner) {
        showToast('Connect MetaMask first.', 'error');
        return null;
    }

    if (!cryptoWalletAddress) {
        showToast('Crypto payments are not configured.', 'error');
        return null;
    }

    // Fetch latest rate
    await cryptoFetchRate();

    const ethAmount = cryptoAudToEth(audAmount);
    if (ethAmount <= 0) {
        showToast('Unable to calculate ETH amount. Please try again.', 'error');
        return null;
    }

    // Round to 8 decimal places for ETH precision
    const ethString = ethAmount.toFixed(8);

    try {
        const tx = await cryptoSigner.sendTransaction({
            to: cryptoWalletAddress,
            value: ethers.parseEther(ethString)
        });

        return tx.hash;
    } catch (err) {
        if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
            showToast('Transaction was rejected in MetaMask.', 'error');
        } else if (err.code === 'INSUFFICIENT_FUNDS') {
            showToast('Insufficient ETH balance for this transaction.', 'error');
        } else {
            showToast('Transaction failed: ' + (err.shortMessage || err.message || 'Unknown error'), 'error');
        }
        console.error('[Crypto] Send error:', err);
        return null;
    }
}

// ─── Verify Deposit ───

/**
 * Submit tx hash to server for on-chain verification and balance credit.
 * Returns the server response (with balance, amount, etc.) or null.
 */
async function cryptoVerifyDeposit(txHash) {
    try {
        const res = await apiRequest('/api/crypto/verify-deposit', {
            method: 'POST',
            body: { txHash },
            requireAuth: true
        });
        return res;
    } catch (err) {
        // 202 = still pending/confirming, not a real error
        if (err.status === 202) {
            return { status: 'confirming', message: err.message };
        }
        throw err;
    }
}

/**
 * Poll for deposit confirmation (retries until confirmed or timeout).
 */
async function cryptoPollDeposit(txHash, onProgress, maxAttempts) {
    maxAttempts = maxAttempts || 30;
    let attempt = 0;

    while (attempt < maxAttempts) {
        attempt++;
        try {
            const result = await cryptoVerifyDeposit(txHash);

            if (result.deposit && result.deposit.status === 'completed') {
                if (onProgress) onProgress({ status: 'completed', result });
                return result;
            }

            if (result.status === 'confirming' || result.status === 'pending') {
                if (onProgress) onProgress({
                    status: result.status,
                    confirmations: result.confirmations || 0,
                    required: result.required || cryptoMinConfirmations
                });
            }
        } catch (err) {
            if (onProgress) onProgress({ status: 'checking', attempt });
        }

        // Wait 10 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    return null; // Timed out
}

// ─── Account Change Listeners ───

if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
            cryptoConnectedAddress = null;
            cryptoSigner = null;
        } else {
            cryptoConnectedAddress = accounts[0];
        }
        // Refresh wallet UI if open
        if (typeof renderDepositForm === 'function') {
            var walletContent = document.getElementById('walletContent');
            if (walletContent && walletContent.querySelector('.crypto-deposit-section')) {
                renderDepositForm();
            }
        }
    });

    window.ethereum.on('chainChanged', function () {
        // Reset provider on chain change
        cryptoProvider = null;
        cryptoSigner = null;
        cryptoConnectedAddress = null;
    });
}
