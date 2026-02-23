// ═══════════════════════════════════════════════════════
// UI-MODALS MODULE
// ═══════════════════════════════════════════════════════


        function updateStatsSummary() {
            const biggestWinEl = document.getElementById('biggestWin');
            if (biggestWinEl) {
                biggestWinEl.textContent = Math.round(stats.biggestWin).toLocaleString();
            }
            updateStatsModal();
        }


        function updateStatsModal() {
            const totalSpinsEl = document.getElementById('statsTotalSpins');
            if (!totalSpinsEl) return;

            const totalWageredEl = document.getElementById('statsTotalWagered');
            const totalWonEl = document.getElementById('statsTotalWon');
            const biggestWinEl = document.getElementById('statsBiggestWin');
            const netEl = document.getElementById('statsNet');
            const gamesListEl = document.getElementById('statsGamesList');
            const net = stats.totalWon - stats.totalWagered;

            totalSpinsEl.textContent = Math.round(stats.totalSpins).toLocaleString();
            totalWageredEl.textContent = `$${formatMoney(stats.totalWagered)}`;
            totalWonEl.textContent = `$${formatMoney(stats.totalWon)}`;
            biggestWinEl.textContent = `$${formatMoney(stats.biggestWin)}`;
            netEl.textContent = `${net >= 0 ? '+' : '-'}$${formatMoney(Math.abs(net))}`;
            netEl.style.color = net >= 0 ? '#34d399' : '#fca5a5';

            const playedGames = Object.entries(stats.gamesPlayed || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            if (playedGames.length === 0) {
                gamesListEl.innerHTML = '<li class="stats-empty">No games played yet.</li>';
            } else {
                gamesListEl.innerHTML = playedGames
                    .map(([gameId, plays]) => {
                        const game = games.find((item) => item.id === gameId);
                        const gameName = game ? game.name : gameId;
                        return `<li><span>${gameName}</span><strong>${plays} ${plays === 1 ? 'play' : 'plays'}</strong></li>`;
                    })
                    .join('');
            }

            // Update achievements
            updateAchievements();
        }


        function updateAchievements() {
            const achievementsListEl = document.getElementById('achievementsList');
            if (!achievementsListEl) return;

            if (!stats.achievements) {
                stats.achievements = [];
            }

            const html = ACHIEVEMENTS.map(achievement => {
                const isUnlocked = stats.achievements.includes(achievement.id);
                const canUnlock = !isUnlocked && achievement.requirement(stats);

                if (canUnlock) {
                    stats.achievements.push(achievement.id);
                    saveStats();
                    showAchievementNotification(achievement);
                }

                const unlocked = stats.achievements.includes(achievement.id);

                return `
                    <div style="
                        background: ${unlocked ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))' : 'rgba(15, 23, 42, 0.8)'};
                        border: 2px solid ${unlocked ? '#fbbf24' : '#475569'};
                        border-radius: 12px;
                        padding: 12px;
                        text-align: center;
                        opacity: ${unlocked ? '1' : '0.5'};
                        transition: all 0.3s;
                    ">
                        <div style="font-size: 32px; margin-bottom: 6px;">${achievement.icon}</div>
                        <div style="font-size: 11px; font-weight: 700; color: ${unlocked ? '#fbbf24' : '#94a3b8'}; margin-bottom: 4px;">${achievement.name}</div>
                        <div style="font-size: 9px; color: #64748b;">${achievement.desc}</div>
                        ${unlocked ? '<div style="font-size: 10px; color: #10b981; margin-top: 4px; font-weight: 700;">\u2705 UNLOCKED</div>' : ''}
                    </div>
                `;
            }).join('');

            achievementsListEl.innerHTML = html;
        }


        function showAchievementNotification(achievement) {
            playSound('bigwin');

            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #000;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(251,191,36,0.6);
                z-index: 10001;
                font-weight: 900;
                animation: slideInRight 0.5s ease-out;
                max-width: 300px;
            `;
            notification.innerHTML = `
                <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">${achievement.icon}</div>
                <div style="font-size: 14px; margin-bottom: 4px;">\u{1F3C6} ACHIEVEMENT UNLOCKED!</div>
                <div style="font-size: 18px; margin-bottom: 4px;">${achievement.name}</div>
                <div style="font-size: 12px; opacity: 0.8;">${achievement.desc}</div>
            `;

            document.body.appendChild(notification);

            createConfetti();

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-out';
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }


        function openStatsModal() {
            updateStatsModal();
            refreshQaStateDisplay();
            document.getElementById('statsModal').classList.add('active');
        }


        function closeStatsModal() {
            document.getElementById('statsModal').classList.remove('active');
        }


        function loadSettings() {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                try { return Object.assign({}, settingsDefaults, JSON.parse(saved)); }
                catch (e) { return { ...settingsDefaults }; }
            }
            return { ...settingsDefaults };
        }


        function saveSettings() {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appSettings));
        }


        function openSettingsModal() {
            // Sync UI with current settings
            const modal = document.getElementById('settingsModal');
            document.getElementById('settingSoundEnabled').checked = typeof SoundManager !== 'undefined' ? SoundManager.soundEnabled : appSettings.soundEnabled;
            document.getElementById('settingVolume').value = typeof SoundManager !== 'undefined' ? Math.round(SoundManager.soundVolume * 100) : appSettings.volume;
            document.getElementById('settingVolumeLabel').textContent = (typeof SoundManager !== 'undefined' ? Math.round(SoundManager.soundVolume * 100) : appSettings.volume) + '%';
            document.getElementById('settingParticles').checked = appSettings.particles;
            document.getElementById('settingAnimations').checked = appSettings.animations;
            document.getElementById('settingConfetti').checked = appSettings.confetti;
            document.getElementById('settingTurbo').checked = appSettings.turboDefault;
            document.getElementById('settingAutoSpeed').value = appSettings.autoSpinSpeed;
            document.getElementById('settingAutoSpeedLabel').textContent = (appSettings.autoSpinSpeed / 1000).toFixed(1) + 's';
            modal.classList.add('active');
            playSound('click');
        }


        function closeSettingsModal() {
            document.getElementById('settingsModal').classList.remove('active');
        }


        function settingsToggleSound(enabled) {
            appSettings.soundEnabled = enabled;
            if (typeof SoundManager !== 'undefined') {
                SoundManager.setSoundEnabled(enabled);
            }
            saveSettings();
        }


        function settingsSetVolume(val) {
            const v = parseInt(val, 10);
            appSettings.volume = v;
            document.getElementById('settingVolumeLabel').textContent = v + '%';
            if (typeof setSoundVolume === 'function') {
                setSoundVolume(v / 100);
            }
            saveSettings();
        }


        function settingsToggleParticles(enabled) {
            appSettings.particles = enabled;
            saveSettings();
        }


        function settingsToggleAnimations(enabled) {
            appSettings.animations = enabled;
            saveSettings();
        }


        function settingsToggleConfetti(enabled) {
            appSettings.confetti = enabled;
            saveSettings();
        }


        function settingsToggleTurbo(enabled) {
            appSettings.turboDefault = enabled;
            saveSettings();
        }


        function settingsSetAutoSpeed(val) {
            const v = parseInt(val, 10);
            appSettings.autoSpinSpeed = v;
            document.getElementById('settingAutoSpeedLabel').textContent = (v / 1000).toFixed(1) + 's';
            saveSettings();
        }


        function settingsResetAll() {
            appSettings = { ...settingsDefaults };
            window.appSettings = appSettings;
            saveSettings();
            if (typeof SoundManager !== 'undefined') {
                SoundManager.setSoundEnabled(true);
                setSoundVolume(0.5);
            }
            // Refresh the panel UI
            openSettingsModal();
            if (typeof showToast === 'function') showToast('Settings reset to defaults', 'info');
        }


        function addFunds() {
            if (typeof showWalletModal === 'function' && currentUser) {
                showWalletModal();
            } else {
                // Fallback to old deposit modal if wallet not loaded or not logged in
                const dm = document.getElementById('depositModal');
                if (dm) dm.classList.add('active');
            }
        }


        async function confirmDeposit(amount) {
            balance += amount;
            updateBalance();
            saveBalance();
            closeDepositModal();
            showToast(`$${amount.toLocaleString()} deposited!`, 'success');
            playSound('win');
        }


        function closeDepositModal() {
            document.getElementById('depositModal').classList.remove('active');
        }


        function getXPForLevel(level) {
            return Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_LEVEL_GROWTH_RATE, level - 1));
        }


        function getTier(level) {
            let tier = XP_TIERS[0];
            for (const t of XP_TIERS) {
                if (level >= t.minLevel) tier = t;
            }
            return tier;
        }


        function loadXP() {
            const saved = localStorage.getItem(XP_STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    playerXP = parseStoredNumber(data.xp, 0);
                    playerLevel = parseStoredNumber(data.level, 1);
                    if (playerLevel < 1) playerLevel = 1;
                } catch { playerXP = 0; playerLevel = 1; }
            }
        }


        function saveXP() {
            localStorage.setItem(XP_STORAGE_KEY, JSON.stringify({ xp: playerXP, level: playerLevel }));
        }


        function awardXP(amount) {
            playerXP += amount;
            let levelledUp = false;
            let needed = getXPForLevel(playerLevel);
            while (playerXP >= needed) {
                playerXP -= needed;
                playerLevel++;
                levelledUp = true;
                needed = getXPForLevel(playerLevel);
            }
            saveXP();
            updateXPDisplay();
            if (levelledUp) {
                // Award free spins on level up — scales slightly with level
                const freeSpinsCount = 5 + Math.floor((playerLevel - 1) / 5); // 5 base, +1 every 5 levels
                if (currentGame && !freeSpinsActive) {
                    // Slot is open and idle — start free spins immediately
                    triggerFreeSpins(currentGame, freeSpinsCount);
                    showToast(`🎉 Level Up! Level ${playerLevel}! ${freeSpinsCount} FREE SPINS!`, 'levelup');
                } else if (currentGame && freeSpinsActive) {
                    // Already in free spins — top them up
                    freeSpinsRemaining += freeSpinsCount;
                    updateFreeSpinsDisplay();
                    showToast(`🎉 Level Up! Level ${playerLevel}! +${freeSpinsCount} FREE SPINS added!`, 'levelup');
                } else {
                    // Not in a slot — award a small balance bonus instead
                    const bonus = Math.round(playerLevel * 5 * 100) / 100; // $5 × level
                    balance += bonus;
                    saveBalance();
                    updateBalance();
                    showToast(`🎉 Level Up! Level ${playerLevel}! +$${bonus.toFixed(2)} BONUS!`, 'levelup');
                }
            }
        }


        function updateXPDisplay() {
            const tier = getTier(playerLevel);
            const needed = getXPForLevel(playerLevel);
            const pct = Math.min(100, (playerXP / needed) * 100);

            const badge = document.getElementById('levelBadge');
            const tierLabel = document.getElementById('tierLabel');
            const fill = document.getElementById('xpBarFill');
            const text = document.getElementById('xpBarText');

            if (badge) {
                badge.textContent = playerLevel;
                badge.style.borderColor = tier.color;
            }
            if (tierLabel) {
                tierLabel.textContent = tier.name;
                tierLabel.style.color = tier.color;
            }
            if (fill) fill.style.width = pct + '%';
            if (text) text.textContent = `${playerXP} / ${needed} XP`;
        }


        // ===== Toast System =====
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 400);
            }, 3500);
        }


        function loadDailyBonus() {
            const saved = localStorage.getItem(DAILY_BONUS_KEY);
            if (saved) {
                try {
                    dailyBonusState = JSON.parse(saved);
                } catch { dailyBonusState = { streak: 0, lastClaim: null, claimedToday: false }; }
            }
            checkDailyBonusReset();
        }


        function saveDailyBonus() {
            localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify(dailyBonusState));
        }


        function getTodayStr() {
            return new Date().toISOString().slice(0, 10);
        }


        function checkDailyBonusReset() {
            const today = getTodayStr();
            if (dailyBonusState.lastClaim === today) {
                dailyBonusState.claimedToday = true;
                return;
            }

            dailyBonusState.claimedToday = false;

            if (dailyBonusState.lastClaim) {
                const last = new Date(dailyBonusState.lastClaim);
                const now = new Date(today);
                const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diffDays > 1) {
                    dailyBonusState.streak = 0;
                }
            }
        }


        function showDailyBonusModal() {
            checkDailyBonusReset();
            renderDailyCalendar();
            document.getElementById('dailyBonusModal').classList.add('active');
        }


        function closeDailyBonusModal() {
            document.getElementById('dailyBonusModal').classList.remove('active');
        }


        function renderDailyCalendar() {
            const cal = document.getElementById('dailyCalendar');
            const streakEl = document.getElementById('streakCount');
            const claimBtn = document.getElementById('dailyClaimBtn');
            if (!cal) return;

            streakEl.textContent = dailyBonusState.streak;
            claimBtn.disabled = dailyBonusState.claimedToday;
            claimBtn.textContent = dailyBonusState.claimedToday ? 'CLAIMED TODAY' : 'CLAIM BONUS';

            let html = '';
            for (let i = 0; i < 7; i++) {
                const reward = DAILY_REWARDS[i];
                const isClaimed = i < dailyBonusState.streak;
                const isToday = i === dailyBonusState.streak && !dailyBonusState.claimedToday;
                const isLocked = i > dailyBonusState.streak;
                const isTodayClaimed = i === dailyBonusState.streak - 1 && dailyBonusState.claimedToday;

                let cls = 'daily-day';
                if (isClaimed || isTodayClaimed) cls += ' day-claimed';
                else if (isToday) cls += ' day-today';
                else if (isLocked) cls += ' day-locked';

                html += `
                    <div class="${cls}">
                        <div class="day-number">DAY ${i + 1}</div>
                        <div class="day-reward">$${reward.amount.toLocaleString()}</div>
                        <div class="day-xp">+${reward.xp} XP</div>
                    </div>
                `;
            }
            cal.innerHTML = html;
        }


        function claimDailyBonus() {
            if (dailyBonusState.claimedToday) return;

            const dayIndex = Math.min(dailyBonusState.streak, DAILY_REWARDS.length - 1);
            const reward = DAILY_REWARDS[dayIndex];

            balance += reward.amount;
            updateBalance();
            awardXP(reward.xp);

            dailyBonusState.streak++;
            if (dailyBonusState.streak > 7) dailyBonusState.streak = 7;
            dailyBonusState.lastClaim = getTodayStr();
            dailyBonusState.claimedToday = true;
            saveDailyBonus();

            playSound('bigwin');
            showToast(`Daily Bonus: +$${reward.amount.toLocaleString()} and +${reward.xp} XP!`, 'win');
            createConfetti();

            renderDailyCalendar();

            setTimeout(() => closeDailyBonusModal(), 2000);
        }


        function loadWheelState() {
            const saved = localStorage.getItem(WHEEL_STORAGE_KEY);
            if (saved) {
                try { wheelState = JSON.parse(saved); } catch { wheelState = { lastSpin: null }; }
            }
        }


        function saveWheelState() {
            localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(wheelState));
        }


        function canSpinWheel() {
            if (!wheelState.lastSpin) return true;
            const last = new Date(wheelState.lastSpin);
            const now = new Date();
            const diffHours = (now - last) / (1000 * 60 * 60);
            return diffHours >= BONUS_WHEEL_COOLDOWN_HOURS;
        }


        function drawWheel(highlightIndex = -1) {
            const canvas = document.getElementById('wheelCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = cx - 4;
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            WHEEL_SEGMENTS.forEach((seg, i) => {
                const startAngle = wheelAngle + i * segAngle;
                const endAngle = startAngle + segAngle;

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = i === highlightIndex ? '#fff' : seg.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = i === highlightIndex ? '#000' : '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText(seg.label, r - 12, 5);
                ctx.restore();
            });

            // Center circle
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.stroke();
        }


        function showBonusWheelModal() {
            loadWheelState();
            const spinBtn = document.getElementById('wheelSpinBtn');
            if (!canSpinWheel()) {
                spinBtn.disabled = true;
                spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';
            } else {
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN THE WHEEL';
            }
            drawWheel();
            document.getElementById('bonusWheelModal').classList.add('active');
        }


        function closeBonusWheelModal() {
            document.getElementById('bonusWheelModal').classList.remove('active');
        }


        function spinBonusWheel() {
            if (wheelSpinning || !canSpinWheel()) return;
            wheelSpinning = true;

            const spinBtn = document.getElementById('wheelSpinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = 'SPINNING...';

            playSound('spin');

            const winIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
            // We want the winning segment at the top (270deg / -PI/2)
            // The pointer is at top, reading from angle -PI/2
            const targetAngle = -(winIndex * segAngle + segAngle / 2) - Math.PI / 2;
            const totalRotation = targetAngle + Math.PI * 2 * (5 + Math.random() * 3);

            const startAngle = wheelAngle;
            const duration = 4000;
            const startTime = performance.now();

            function animateWheel(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - t, 3);
                wheelAngle = startAngle + (totalRotation - startAngle) * ease;

                drawWheel();

                if (t < 1) {
                    requestAnimationFrame(animateWheel);
                } else {
                    // Landed
                    wheelAngle = totalRotation % (2 * Math.PI);
                    const seg = WHEEL_SEGMENTS[winIndex];

                    balance += seg.value;
                    updateBalance();
                    awardXP(seg.xp);

                    wheelState.lastSpin = new Date().toISOString();
                    saveWheelState();

                    playSound('bigwin');
                    showToast(`Bonus Wheel: +$${seg.value.toLocaleString()} and +${seg.xp} XP!`, 'win');
                    createConfetti();

                    drawWheel(winIndex);

                    wheelSpinning = false;
                    spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';

                    setTimeout(() => closeBonusWheelModal(), 3000);
                }
            }

            requestAnimationFrame(animateWheel);
        }
