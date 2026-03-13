(function() {
  'use strict';

  // API helper function
  async function api(path, opts = {}) {
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    const tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    const token = localStorage.getItem(tokenKey);
    const res = await fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(opts.headers || {})
      }
    });
    return res.json();
  }

  // Initialize styles once
  let stylesInitialized = false;
  function initializeStyles() {
    if (stylesInitialized) return;
    stylesInitialized = true;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes sparklesFall {
        0% {
          opacity: 1;
          transform: translateY(0) translateX(0);
        }
        100% {
          opacity: 0;
          transform: translateY(100vh) translateX(var(--tx));
        }
      }

      @keyframes pulsing {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }

      @keyframes coinShower {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateY(-100px) scale(0.5);
        }
      }

      .onboarding-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .onboarding-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%);
        border: 2px solid #ffd700;
        border-radius: 16px;
        padding: 40px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
        position: relative;
        animation: slideIn 0.4s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .onboarding-sparkle {
        position: absolute;
        pointer-events: none;
      }

      .onboarding-sparkle::before {
        content: '✨';
        font-size: 20px;
        color: #ffd700;
        display: block;
        animation: sparklesFall linear forwards;
      }

      .onboarding-modal h1 {
        color: #ffd700;
        font-size: 32px;
        margin: 0 0 20px 0;
        text-align: center;
        text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      }

      .onboarding-modal h2 {
        color: #ffd700;
        font-size: 24px;
        margin: 0 0 15px 0;
        text-align: center;
      }

      .onboarding-balance {
        text-align: center;
        margin: 20px 0 30px 0;
      }

      .onboarding-balance-label {
        color: #b0b0c0;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .onboarding-balance-amount {
        color: #56d2a0;
        font-size: 40px;
        font-weight: bold;
        text-shadow: 0 0 15px rgba(86, 210, 160, 0.4);
      }

      .onboarding-benefits {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin: 30px 0;
      }

      .onboarding-benefit-card {
        background: rgba(255, 215, 0, 0.08);
        border: 1px solid #ffd700;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: all 0.3s ease;
      }

      .onboarding-benefit-card:hover {
        background: rgba(255, 215, 0, 0.15);
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
      }

      .onboarding-benefit-icon {
        font-size: 32px;
        margin-bottom: 10px;
      }

      .onboarding-benefit-title {
        color: #ffd700;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }

      .onboarding-benefit-desc {
        color: #b0b0c0;
        font-size: 12px;
      }

      .onboarding-reward-progress {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin: 30px 0;
      }

      .onboarding-reward-day {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid #56d2a0;
        background: rgba(86, 210, 160, 0.1);
        color: #56d2a0;
        transition: all 0.3s ease;
      }

      .onboarding-reward-day.completed {
        background: #56d2a0;
        color: #0d0d1a;
      }

      .onboarding-reward-day.current {
        background: rgba(255, 215, 0, 0.2);
        border-color: #ffd700;
        color: #ffd700;
        animation: pulsing 1.5s ease-in-out infinite;
      }

      .onboarding-reward-day.future {
        opacity: 0.4;
        border-color: #404050;
        color: #808090;
      }

      .onboarding-current-reward {
        background: rgba(255, 215, 0, 0.1);
        border: 2px solid #ffd700;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        text-align: center;
      }

      .onboarding-reward-emoji {
        font-size: 48px;
        margin-bottom: 10px;
      }

      .onboarding-reward-label {
        color: #b0b0c0;
        font-size: 12px;
        margin-bottom: 8px;
      }

      .onboarding-reward-amount {
        color: #ffd700;
        font-size: 28px;
        font-weight: bold;
        text-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
      }

      .onboarding-buttons {
        display: flex;
        gap: 12px;
        margin-top: 30px;
      }

      .onboarding-button {
        flex: 1;
        padding: 14px 20px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .onboarding-button-primary {
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #0d0d1a;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
      }

      .onboarding-button-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
      }

      .onboarding-button-primary:active {
        transform: translateY(0);
      }

      .onboarding-button-secondary {
        background: linear-gradient(135deg, #56d2a0 0%, #7fe0b0 100%);
        color: #0d0d1a;
        box-shadow: 0 0 20px rgba(86, 210, 160, 0.3);
      }

      .onboarding-button-secondary:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(86, 210, 160, 0.5);
      }

      .onboarding-button-secondary:active {
        transform: translateY(0);
      }

      .onboarding-button-disabled {
        background: #404050;
        color: #808090;
        cursor: not-allowed;
        box-shadow: none;
      }

      .onboarding-message {
        color: #b0b0c0;
        text-align: center;
        font-size: 16px;
        margin: 20px 0;
      }

      .onboarding-next-reward {
        background: rgba(86, 210, 160, 0.08);
        border: 1px solid #56d2a0;
        border-radius: 8px;
        padding: 15px;
        margin-top: 15px;
        text-align: center;
      }

      .onboarding-next-reward-label {
        color: #b0b0c0;
        font-size: 12px;
        margin-bottom: 5px;
      }

      .onboarding-next-reward-content {
        color: #56d2a0;
        font-size: 16px;
        font-weight: bold;
      }

      .onboarding-coin {
        position: fixed;
        pointer-events: none;
        z-index: 10001;
      }

      .onboarding-coin::before {
        content: '💰';
        font-size: 24px;
        display: block;
        animation: coinShower 1s ease-out forwards;
      }

      .onboarding-close-btn {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        color: #ffd700;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .onboarding-close-btn:hover {
        transform: rotate(90deg);
      }
    `;
    document.head.appendChild(style);
  }

  function closeModal(overlay) {
    overlay.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }

  function createSparkles(container) {
    const sparkleCount = 30;
    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'onboarding-sparkle';
      const x = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 2 + Math.random() * 1;
      const tx = (Math.random() - 0.5) * 100;
      sparkle.style.left = x + '%';
      sparkle.style.top = '-20px';
      sparkle.style.setProperty('--tx', tx + 'px');
      sparkle.style.animation = `sparklesFall ${duration}s linear ${delay}s forwards`;
      container.appendChild(sparkle);
    }
  }

  function createCoinShower(count = 15) {
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('div');
      coin.className = 'onboarding-coin';
      const x = Math.random() * window.innerWidth;
      const y = window.innerHeight / 2;
      coin.style.left = x + 'px';
      coin.style.top = y + 'px';
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 1000);
    }
  }

  function showWelcomeModal(userData) {
    initializeStyles();

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'onboarding-modal';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'onboarding-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => closeModal(overlay);

    const heading = document.createElement('h1');
    heading.textContent = 'Welcome to Matrix Spins!';

    const balanceSection = document.createElement('div');
    balanceSection.className = 'onboarding-balance';
    const balanceLabel = document.createElement('div');
    balanceLabel.className = 'onboarding-balance-label';
    balanceLabel.textContent = 'Starting Balance';
    const balanceAmount = document.createElement('div');
    balanceAmount.className = 'onboarding-balance-amount';
    balanceAmount.textContent = '$' + (userData?.balance || '50.00');
    balanceSection.appendChild(balanceLabel);
    balanceSection.appendChild(balanceAmount);

    const benefitsContainer = document.createElement('div');
    benefitsContainer.className = 'onboarding-benefits';

    const benefits = [
      { icon: '🎰', title: '150 Free Spins', desc: 'Use immediately' },
      { icon: '👑', title: 'VIP Rewards', desc: 'Exclusive perks' },
      { icon: '🎁', title: 'Daily Bonuses', desc: 'Every day' }
    ];

    benefits.forEach(benefit => {
      const card = document.createElement('div');
      card.className = 'onboarding-benefit-card';
      card.innerHTML = `
        <div class="onboarding-benefit-icon">${benefit.icon}</div>
        <div class="onboarding-benefit-title">${benefit.title}</div>
        <div class="onboarding-benefit-desc">${benefit.desc}</div>
      `;
      benefitsContainer.appendChild(card);
    });

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'onboarding-buttons';

    const startBtn = document.createElement('button');
    startBtn.className = 'onboarding-button onboarding-button-primary';
    startBtn.textContent = 'Start Playing';
    startBtn.onclick = () => closeModal(overlay);

    const depositBtn = document.createElement('button');
    depositBtn.className = 'onboarding-button onboarding-button-secondary';
    depositBtn.textContent = 'Make First Deposit';
    depositBtn.onclick = () => {
      if (typeof showWalletDeposit === 'function') {
        showWalletDeposit();
      }
      closeModal(overlay);
    };

    buttonsContainer.appendChild(startBtn);
    buttonsContainer.appendChild(depositBtn);

    modal.appendChild(closeBtn);
    modal.appendChild(heading);
    modal.appendChild(balanceSection);
    modal.appendChild(benefitsContainer);
    modal.appendChild(buttonsContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    createSparkles(modal);

    const autoCloseTimer = setTimeout(() => {
      if (overlay.parentNode) {
        closeModal(overlay);
      }
    }, 15000);

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        clearTimeout(autoCloseTimer);
        closeModal(overlay);
      }
    };
  }

  function showDailyLoginModal(data) {
    initializeStyles();

    const rewardSchedule = [
      { day: 1, reward: '$0.50', emoji: '💵' },
      { day: 2, reward: '$1.00', emoji: '💵' },
      { day: 3, reward: '100 Gems', emoji: '💎' },
      { day: 4, reward: '$2.00', emoji: '💵' },
      { day: 5, reward: '200 Gems', emoji: '💎' },
      { day: 6, reward: '$5.00', emoji: '💵' },
      { day: 7, reward: '$10 + 500 Gems', emoji: '🏆' }
    ];

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'onboarding-modal';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'onboarding-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => closeModal(overlay);

    const heading = document.createElement('h2');
    heading.textContent = `Daily Reward - Day ${data?.reward?.day || 1}`;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'onboarding-reward-progress';

    for (let i = 1; i <= 7; i++) {
      const dayCircle = document.createElement('div');
      dayCircle.className = 'onboarding-reward-day';
      dayCircle.textContent = i;

      if (i < (data?.streak || 1)) {
        dayCircle.classList.add('completed');
      } else if (i === (data?.reward?.day || 1)) {
        dayCircle.classList.add('current');
      } else {
        dayCircle.classList.add('future');
      }

      progressContainer.appendChild(dayCircle);
    }

    const currentDayIndex = (data?.reward?.day || 1) - 1;
    const currentReward = rewardSchedule[currentDayIndex];

    const rewardSection = document.createElement('div');
    rewardSection.className = 'onboarding-current-reward';
    rewardSection.innerHTML = `
      <div class="onboarding-reward-emoji">${currentReward.emoji}</div>
      <div class="onboarding-reward-label">Today's Reward</div>
      <div class="onboarding-reward-amount">${currentReward.reward}</div>
    `;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'onboarding-buttons';
    buttonsContainer.style.flexDirection = 'column';

    if (data?.canClaim) {
      const claimBtn = document.createElement('button');
      claimBtn.className = 'onboarding-button onboarding-button-primary';
      claimBtn.textContent = 'Claim Reward';
      claimBtn.onclick = async () => {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claiming...';
        try {
          const result = await api('/api/daily-login/claim', { method: 'POST' });
          if (result.success) {
            createCoinShower();
            if (typeof updateBalance === 'function' && result.balance) {
              updateBalance(result.balance);
            }
            setTimeout(() => {
              closeModal(overlay);
            }, 3000);
          }
        } catch (err) {
          console.error('Failed to claim reward:', err);
          claimBtn.disabled = false;
          claimBtn.textContent = 'Claim Reward';
        }
      };
      buttonsContainer.appendChild(claimBtn);
    } else {
      const message = document.createElement('div');
      message.className = 'onboarding-message';
      message.textContent = 'Come back tomorrow!';
      buttonsContainer.appendChild(message);

      const nextRewardDay = ((data?.streak || 1) % 7) + 1;
      const nextRewardData = rewardSchedule[nextRewardDay - 1];
      const nextSection = document.createElement('div');
      nextSection.className = 'onboarding-next-reward';
      nextSection.innerHTML = `
        <div class="onboarding-next-reward-label">Next Reward - Day ${nextRewardDay}</div>
        <div class="onboarding-next-reward-content">${nextRewardData.emoji} ${nextRewardData.reward}</div>
      `;
      buttonsContainer.appendChild(nextSection);
    }

    modal.appendChild(closeBtn);
    modal.appendChild(heading);
    modal.appendChild(progressContainer);
    modal.appendChild(rewardSection);
    modal.appendChild(buttonsContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    };
  }

  // Expose API
  window.Onboarding = {
    showWelcomeModal,
    showDailyLoginModal
  };
})();
