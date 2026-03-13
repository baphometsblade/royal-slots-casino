(function() {
    'use strict';

    var API_ENDPOINT = '/api/premium-tournaments';
    var UPDATE_INTERVAL = 60000; // 60 seconds
    var TIMER_UPDATE_INTERVAL = 1000; // 1 second

    var state = {
        tournaments: [],
        joinedTournaments: {},
        currentUser: null,
        currentBalance: 0,
        refreshTimerId: null,
        timerTimerId: null,
        selectedTournament: null
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
        if (document.getElementById('premium-tournaments-styles')) return;
        var style = document.createElement('style');
        style.id = 'premium-tournaments-styles';
        style.textContent = '@keyframes tournamentPulse{0%{box-shadow:0 0 20px rgba(255,215,0,0.6),inset 0 0 15px rgba(255,215,0,0.2);}50%{box-shadow:0 0 40px rgba(255,215,0,1),inset 0 0 20px rgba(255,215,0,0.4);}100%{box-shadow:0 0 20px rgba(255,215,0,0.6),inset 0 0 15px rgba(255,215,0,0.2);}}@keyframes confetti{0%{opacity:1;transform:translate(0,0) rotateZ(0deg);}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotateZ(360deg);}}@keyframes fadeIn{0%{opacity:0;transform:scale(0.95);}100%{opacity:1;transform:scale(1);}}@keyframes slideIn{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}';
        document.head.appendChild(style);
    }

    function createFloatingButton() {
        var btn = document.createElement('div');
        btn.id = 'premium-tournaments-button';
        btn.style.cssText = 'position:fixed;bottom:80px;right:16px;width:70px;height:70px;background:linear-gradient(135deg,#ffd700,#ffed4e);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9998;font-size:36px;box-shadow:0 0 30px rgba(255,215,0,0.5);border:3px solid rgba(255,255,255,0.3);transition:all 0.3s ease;font-family:Arial,sans-serif;';
        btn.innerHTML = '🏆';

        var badge = document.createElement('div');
        badge.id = 'premium-tournaments-badge';
        badge.style.cssText = 'position:absolute;top:-8px;right:-8px;background:#ff4444;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;border:2px solid #fff;display:none;';
        badge.textContent = '0';
        btn.appendChild(badge);

        btn.addEventListener('mouseenter', function() {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 0 50px rgba(255,215,0,0.8)';
        });
        btn.addEventListener('mouseleave', function() {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 0 30px rgba(255,215,0,0.5)';
        });

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showTournaments();
        });

        document.body.appendChild(btn);
        updateButtonPulse();
    }

    function updateButtonPulse() {
        var btn = document.getElementById('premium-tournaments-button');
        if (!btn) return;

        var activeCount = state.tournaments.filter(function(t) { return !t.ended; }).length;
        if (activeCount > 0) {
            btn.style.animation = 'tournamentPulse 1.5s ease-in-out infinite';
        } else {
            btn.style.animation = 'none';
        }

        var badge = document.getElementById('premium-tournaments-badge');
        if (badge) {
            if (activeCount > 0) {
                badge.textContent = activeCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    function formatTimeRemaining(endTime) {
        var now = new Date().getTime();
        var end = new Date(endTime).getTime();
        var diff = end - now;

        if (diff <= 0) return 'ENDED';

        var hours = Math.floor(diff / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);

        if (hours > 24) {
            var days = Math.floor(hours / 24);
            return days + 'd ' + (hours % 24) + 'h';
        }
        return hours + 'h ' + minutes + 'm ' + seconds + 's';
    }

    function createTournamentCard(tournament) {
        var card = document.createElement('div');
        card.style.cssText = 'background:rgba(30,20,50,0.8);border:2px solid #ffd700;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 4px 15px rgba(0,0,0,0.4);transition:all 0.3s ease;cursor:pointer;';

        card.addEventListener('mouseenter', function() {
            card.style.boxShadow = '0 8px 30px rgba(255,215,0,0.3)';
            card.style.transform = 'translateY(-2px)';
        });
        card.addEventListener('mouseleave', function() {
            card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
            card.style.transform = 'translateY(0)';
        });

        var name = document.createElement('h3');
        name.style.cssText = 'color:#fff;margin:0 0 10px 0;font-size:18px;font-weight:bold;';
        name.textContent = tournament.name;
        card.appendChild(name);

        var entryFee = document.createElement('div');
        entryFee.style.cssText = 'color:#ffd700;font-size:14px;margin-bottom:8px;font-weight:bold;';
        entryFee.textContent = '$' + tournament.entryFee + ' ENTRY';
        card.appendChild(entryFee);

        var prizePool = document.createElement('div');
        prizePool.style.cssText = 'color:#4ade80;font-size:18px;font-weight:bold;margin-bottom:12px;';
        prizePool.textContent = '$' + tournament.prizePool + ' PRIZE POOL';
        card.appendChild(prizePool);

        var playersDiv = document.createElement('div');
        playersDiv.style.cssText = 'margin-bottom:12px;';

        var playersText = document.createElement('div');
        playersText.style.cssText = 'color:#ccc;font-size:12px;margin-bottom:4px;';
        playersText.textContent = tournament.currentPlayers + '/' + tournament.maxPlayers + ' players';
        playersDiv.appendChild(playersText);

        var progressBar = document.createElement('div');
        progressBar.style.cssText = 'width:100%;height:6px;background:rgba(255,255,255,0.2);border-radius:3px;overflow:hidden;';

        var progressFill = document.createElement('div');
        var percentage = (tournament.currentPlayers / tournament.maxPlayers) * 100;
        progressFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#ffd700,#ffed4e);width:' + percentage + '%;border-radius:3px;transition:width 0.3s ease;';
        progressBar.appendChild(progressFill);
        playersDiv.appendChild(progressBar);
        card.appendChild(playersDiv);

        var timeRemaining = document.createElement('div');
        timeRemaining.className = 'tournament-timer-' + tournament.id;
        var isUrgent = formatTimeRemaining(tournament.endsAt).indexOf('0h') === 0 || formatTimeRemaining(tournament.endsAt).indexOf('1h') === 0;
        timeRemaining.style.cssText = 'color:' + (isUrgent ? '#ff4444' : '#4ade80') + ';font-size:13px;margin-bottom:12px;font-weight:bold;';
        timeRemaining.textContent = 'Ends in: ' + formatTimeRemaining(tournament.endsAt);
        card.appendChild(timeRemaining);

        var isJoined = state.joinedTournaments[tournament.id];
        var button = document.createElement('button');
        button.style.cssText = 'width:100%;padding:10px;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;transition:all 0.3s ease;font-family:Arial,sans-serif;';

        if (isJoined) {
            button.style.cssText += 'background:#4ade80;color:#000;';
            button.textContent = 'JOINED';
            button.disabled = true;
            button.style.cursor = 'default';
        } else {
            button.style.cssText += 'background:#ffd700;color:#000;';
            button.textContent = 'JOIN NOW';
            button.addEventListener('mouseenter', function() {
                button.style.background = '#ffed4e';
                button.style.boxShadow = '0 0 20px rgba(255,215,0,0.5)';
            });
            button.addEventListener('mouseleave', function() {
                button.style.background = '#ffd700';
                button.style.boxShadow = 'none';
            });
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                showJoinConfirmation(tournament);
            });
        }

        card.appendChild(button);

        card.addEventListener('click', function() {
            if (isJoined) {
                showLeaderboard(tournament);
            }
        });

        return card;
    }

    function showJoinConfirmation(tournament) {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #ffd700;border-radius:16px;padding:30px;max-width:400px;width:90%;box-shadow:0 0 50px rgba(255,215,0,0.3);animation:fadeIn 0.3s ease;';

        var title = document.createElement('h3');
        title.style.cssText = 'color:#ffd700;font-size:20px;margin:0 0 15px 0;text-align:center;';
        title.textContent = 'Join ' + tournament.name + '?';
        container.appendChild(title);

        var fee = document.createElement('div');
        fee.style.cssText = 'color:#fff;font-size:16px;margin-bottom:15px;text-align:center;';
        fee.textContent = 'Entry Fee: $' + tournament.entryFee;
        container.appendChild(fee);

        var balance = document.createElement('div');
        balance.style.cssText = 'color:#4ade80;font-size:14px;margin-bottom:20px;text-align:center;';
        balance.textContent = 'Current Balance: $' + state.currentBalance.toFixed(2);
        container.appendChild(balance);

        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display:flex;gap:10px;';

        var payBtn = document.createElement('button');
        payBtn.textContent = 'PAY & JOIN';
        payBtn.style.cssText = 'flex:1;padding:12px;background:#ffd700;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;transition:all 0.3s ease;font-family:Arial,sans-serif;';
        payBtn.addEventListener('mouseenter', function() {
            payBtn.style.background = '#ffed4e';
            payBtn.style.boxShadow = '0 0 20px rgba(255,215,0,0.5)';
        });
        payBtn.addEventListener('mouseleave', function() {
            payBtn.style.background = '#ffd700';
            payBtn.style.boxShadow = 'none';
        });
        payBtn.addEventListener('click', function() {
            joinTournament(tournament, modal);
        });
        buttonContainer.appendChild(payBtn);

        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'flex:1;padding:12px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid #ffd700;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;transition:all 0.3s ease;font-family:Arial,sans-serif;';
        cancelBtn.addEventListener('click', function() {
            modal.remove();
        });
        buttonContainer.appendChild(cancelBtn);

        container.appendChild(buttonContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    async function joinTournament(tournament, confirmModal) {
        if (state.currentBalance < tournament.entryFee) {
            confirmModal.remove();
            showInsufficientFundsModal(tournament);
            return;
        }

        confirmModal.style.opacity = '0.5';
        confirmModal.style.pointerEvents = 'none';

        var result = await api(API_ENDPOINT + '/' + tournament.id + '/join', {
            method: 'POST',
            body: JSON.stringify({})
        });

        confirmModal.remove();

        if (result && result.success) {
            state.joinedTournaments[tournament.id] = true;
            state.currentBalance -= tournament.entryFee;

            if (typeof updateBalance === 'function') {
                updateBalance(state.currentBalance);
            }

            showSuccessModal(tournament);
            refreshTournaments();
        } else {
            showErrorModal(result && result.message ? result.message : 'Failed to join tournament');
        }
    }

    function showInsufficientFundsModal(tournament) {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #ff4444;border-radius:16px;padding:30px;max-width:400px;width:90%;box-shadow:0 0 50px rgba(255,68,68,0.3);animation:fadeIn 0.3s ease;text-align:center;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;margin-bottom:15px;';
        icon.textContent = '💰';
        container.appendChild(icon);

        var title = document.createElement('h3');
        title.style.cssText = 'color:#ff4444;font-size:18px;margin:0 0 10px 0;';
        title.textContent = 'Insufficient Balance';
        container.appendChild(title);

        var msg = document.createElement('p');
        msg.style.cssText = 'color:#ccc;margin:0 0 20px 0;font-size:14px;';
        msg.textContent = 'You need $' + tournament.entryFee + ' to join. Current balance: $' + state.currentBalance.toFixed(2);
        container.appendChild(msg);

        var depositBtn = document.createElement('button');
        depositBtn.textContent = 'Deposit Now';
        depositBtn.style.cssText = 'width:100%;padding:12px;background:#ffd700;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;margin-bottom:10px;font-family:Arial,sans-serif;';
        depositBtn.addEventListener('click', function() {
            modal.remove();
            if (typeof showDepositModal === 'function') {
                showDepositModal();
            } else {
                console.warn('Deposit modal not available');
            }
        });
        container.appendChild(depositBtn);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cancel';
        closeBtn.style.cssText = 'width:100%;padding:10px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;';
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        container.appendChild(closeBtn);

        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    function showSuccessModal(tournament) {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #4ade80;border-radius:16px;padding:40px;max-width:400px;width:90%;box-shadow:0 0 50px rgba(74,222,128,0.3);animation:fadeIn 0.3s ease;text-align:center;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:64px;margin-bottom:15px;';
        icon.textContent = '🎉';
        container.appendChild(icon);

        var title = document.createElement('h3');
        title.style.cssText = 'color:#4ade80;font-size:20px;margin:0 0 10px 0;';
        title.textContent = "You're In!";
        container.appendChild(title);

        var msg = document.createElement('p');
        msg.style.cssText = 'color:#ccc;margin:0 0 20px 0;font-size:14px;';
        msg.textContent = 'Good luck in ' + tournament.name + '! Check the leaderboard to see your position.';
        container.appendChild(msg);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'width:100%;padding:12px;background:#4ade80;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-family:Arial,sans-serif;';
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        container.appendChild(closeBtn);

        modal.appendChild(container);
        document.body.appendChild(modal);

        // Trigger confetti
        triggerConfetti();

        setTimeout(function() {
            if (modal.parentNode) modal.remove();
        }, 3000);
    }

    function showErrorModal(message) {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #ff4444;border-radius:16px;padding:30px;max-width:400px;width:90%;box-shadow:0 0 50px rgba(255,68,68,0.3);';

        var title = document.createElement('h3');
        title.style.cssText = 'color:#ff4444;font-size:16px;margin:0 0 10px 0;';
        title.textContent = 'Error';
        container.appendChild(title);

        var msg = document.createElement('p');
        msg.style.cssText = 'color:#ccc;margin:0 0 20px 0;';
        msg.textContent = message;
        container.appendChild(msg);

        var btn = document.createElement('button');
        btn.textContent = 'Close';
        btn.style.cssText = 'width:100%;padding:10px;background:#ff4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;';
        btn.addEventListener('click', function() {
            modal.remove();
        });
        container.appendChild(btn);

        modal.appendChild(container);
        document.body.appendChild(modal);

        setTimeout(function() {
            if (modal.parentNode) modal.remove();
        }, 5000);
    }

    function showLeaderboard(tournament) {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #ffd700;border-radius:16px;padding:30px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 0 50px rgba(255,215,0,0.3);';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;color:#ffd700;font-size:32px;cursor:pointer;padding:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;';
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        container.appendChild(closeBtn);

        var title = document.createElement('h2');
        title.style.cssText = 'color:#ffd700;margin:0 0 20px 0;font-size:22px;text-align:center;';
        title.textContent = tournament.name + ' - Leaderboard';
        container.appendChild(title);

        var prizeDiv = document.createElement('div');
        prizeDiv.style.cssText = 'background:rgba(255,215,0,0.1);border:1px solid #ffd700;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;color:#ffd700;';
        prizeDiv.innerHTML = '<strong>Prize Distribution:</strong> 1st: 50% | 2nd: 25% | 3rd: 15%';
        container.appendChild(prizeDiv);

        var leaderboard = document.createElement('div');
        leaderboard.style.cssText = 'color:#fff;';

        for (var i = 0; i < Math.min(10, tournament.leaderboard.length); i++) {
            var entry = tournament.leaderboard[i];
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;padding:10px;margin-bottom:8px;background:rgba(255,215,0,0.05);border-radius:6px;border-left:4px solid ' + (i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666') + ';';

            var rank = document.createElement('div');
            rank.style.cssText = 'width:30px;font-weight:bold;color:#ffd700;font-size:14px;';
            rank.textContent = (i + 1) + '.';
            row.appendChild(rank);

            var username = document.createElement('div');
            username.style.cssText = 'flex:1;margin-left:10px;';
            username.textContent = entry.username;
            row.appendChild(username);

            var score = document.createElement('div');
            score.style.cssText = 'color:#4ade80;font-weight:bold;';
            score.textContent = entry.score;
            row.appendChild(score);

            leaderboard.appendChild(row);
        }

        container.appendChild(leaderboard);
        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    function triggerConfetti() {
        var confettiCount = 30;
        for (var i = 0; i < confettiCount; i++) {
            var confetti = document.createElement('div');
            var tx = (Math.random() - 0.5) * 400;
            var ty = Math.random() * 400 + 100;
            confetti.style.cssText = 'position:fixed;width:8px;height:8px;background:' + ['#ffd700', '#ffed4e', '#4ade80', '#ff4444'][Math.floor(Math.random() * 4)] + ';border-radius:50%;pointer-events:none;--tx:' + tx + 'px;--ty:' + ty + 'px;left:50%;top:50%;animation:confetti 2s ease-out forwards;';
            document.body.appendChild(confetti);
            setTimeout(function(el) {
                if (el.parentNode) el.remove();
            }, 2000, confetti);
        }
    }

    function showTournaments() {
        var existingModal = document.getElementById('premium-tournaments-modal');
        if (existingModal) {
            existingModal.remove();
        }

        var modal = document.createElement('div');
        modal.id = 'premium-tournaments-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #ffd700;border-radius:16px;padding:30px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 0 50px rgba(255,215,0,0.3);animation:slideIn 0.4s ease;position:relative;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;color:#ffd700;font-size:32px;cursor:pointer;padding:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;';
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        container.appendChild(closeBtn);

        var header = document.createElement('h1');
        header.style.cssText = 'color:#ffd700;margin:0 0 5px 0;font-size:28px;display:flex;align-items:center;gap:10px;';
        header.innerHTML = '🏆 PREMIUM TOURNAMENTS';
        container.appendChild(header);

        var subtitle = document.createElement('p');
        subtitle.style.cssText = 'color:#999;margin:0 0 20px 0;font-size:13px;';
        subtitle.textContent = 'Compete with players worldwide and win big prizes';
        container.appendChild(subtitle);

        if (state.tournaments.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
            empty.textContent = 'No active tournaments at the moment.';
            container.appendChild(empty);
        } else {
            var tournamentsDiv = document.createElement('div');
            tournamentsDiv.id = 'premium-tournaments-list';
            state.tournaments.forEach(function(tournament) {
                if (!tournament.ended) {
                    tournamentsDiv.appendChild(createTournamentCard(tournament));
                }
            });
            container.appendChild(tournamentsDiv);
        }

        modal.appendChild(container);
        document.body.appendChild(modal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    function updateTimers() {
        state.tournaments.forEach(function(tournament) {
            var timerEl = document.querySelector('.tournament-timer-' + tournament.id);
            if (timerEl) {
                var timeStr = formatTimeRemaining(tournament.endsAt);
                timerEl.textContent = 'Ends in: ' + timeStr;
                var isUrgent = timeStr.indexOf('0h') === 0 || timeStr.indexOf('1h') === 0;
                timerEl.style.color = isUrgent ? '#ff4444' : '#4ade80';
            }
        });
    }

    async function refreshTournaments() {
        var result = await api(API_ENDPOINT);
        if (result && result.tournaments) {
            state.tournaments = result.tournaments;
            if (result.user) {
                state.currentUser = result.user;
                state.currentBalance = result.user.balance || 0;
            }
            if (result.joined) {
                result.joined.forEach(function(id) {
                    state.joinedTournaments[id] = true;
                });
            }
            updateButtonPulse();
            updateTimers();
        } else {
            console.warn('Failed to refresh tournaments');
        }
    }

    function init() {
        injectStyles();
        createFloatingButton();
        refreshTournaments();

        // Clear any existing timers
        if (state.refreshTimerId) clearInterval(state.refreshTimerId);
        if (state.timerTimerId) clearInterval(state.timerTimerId);

        // Refresh tournaments every 60 seconds
        state.refreshTimerId = setInterval(refreshTournaments, UPDATE_INTERVAL);

        // Update timers every second
        state.timerTimerId = setInterval(updateTimers, TIMER_UPDATE_INTERVAL);
    }

    window.PremiumTournaments = {
        init: init,
        showTournaments: showTournaments
    };
})();
