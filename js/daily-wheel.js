(function() {
    'use strict';

    var PRIZES = ['$0.50', '$1.00', '$2.00', '$5.00', '$10.00', '$25.00', '$50.00', '$0.25'];
    var COLORS = ['#cd7f32', '#ffd700', '#4a148c', '#1a237e', '#cd7f32', '#ffd700', '#4a148c', '#1a237e'];
    var API_ENDPOINT = '/api/daily-wheel';

    var wheelState = {
        canSpin: false,
        lastSpin: null,
        streak: 0,
        nextAvailableAt: null
    };

    var wheelData = {
        spinInProgress: false,
        currentRotation: 0,
        winningSegment: -1
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

    function createBadge() {
        var badge = document.createElement('div');
        badge.id = 'daily-wheel-badge';
        badge.style.cssText = 'position:fixed;top:70px;right:16px;background:rgba(20,10,40,0.95);border:2px solid #ffd700;border-radius:50%;width:80px;height:80px;display:none;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;z-index:9999;font-weight:bold;color:#ffd700;font-size:14px;text-align:center;padding:8px;box-sizing:border-box;box-shadow:0 0 20px rgba(255,215,0,0.6),inset 0 0 15px rgba(255,215,0,0.2);animation:wheelBadgePulse 1.5s ease-in-out infinite;font-family:Arial,sans-serif;';

        var text = document.createElement('div');
        text.style.cssText = 'font-size:12px;line-height:1.2;';
        text.textContent = 'FREE\nSPIN!';
        badge.appendChild(text);

        badge.addEventListener('click', function(e) {
            e.stopPropagation();
            showWheel();
        });

        document.body.appendChild(badge);
        injectStyles();
        return badge;
    }

    function injectStyles() {
        if (document.getElementById('daily-wheel-styles')) return;
        var style = document.createElement('style');
        style.id = 'daily-wheel-styles';
        style.textContent = '@keyframes wheelBadgePulse{0%{box-shadow:0 0 20px rgba(255,215,0,0.6),inset 0 0 15px rgba(255,215,0,0.2);}50%{box-shadow:0 0 40px rgba(255,215,0,1),inset 0 0 20px rgba(255,215,0,0.4);}100%{box-shadow:0 0 20px rgba(255,215,0,0.6),inset 0 0 15px rgba(255,215,0,0.2);}}@keyframes wheelSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}@keyframes confetti{0%{opacity:1;transform:translate(0,0) rotateZ(0deg);}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotateZ(360deg);}}@keyframes popIn{0%{opacity:0;transform:scale(0.3);}50%{opacity:1;}100%{transform:scale(1);}}@keyframes fadeOut{0%{opacity:1;}100%{opacity:0;}}';
        document.head.appendChild(style);
    }

    function updateBadgeVisibility() {
        var badge = document.getElementById('daily-wheel-badge');
        if (!badge) return;
        if (wheelState.canSpin) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function createModal() {
        var modal = document.createElement('div');
        modal.id = 'daily-wheel-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:none;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'background:rgba(20,10,40,0.95);border:3px solid #ffd700;border-radius:20px;padding:30px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 0 50px rgba(255,215,0,0.3);';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;color:#ffd700;font-size:32px;cursor:pointer;padding:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;';
        closeBtn.addEventListener('click', hideWheel);
        container.appendChild(closeBtn);

        var title = document.createElement('h2');
        title.textContent = 'Daily Bonus Wheel';
        title.style.cssText = 'color:#ffd700;text-align:center;margin:0 0 20px 0;font-size:28px;text-shadow:0 0 10px rgba(255,215,0,0.5);';
        container.appendChild(title);

        var streakDiv = document.createElement('div');
        streakDiv.id = 'daily-wheel-streak';
        streakDiv.style.cssText = 'color:#ffd700;text-align:center;margin-bottom:15px;font-size:14px;';
        container.appendChild(streakDiv);

        var wheelContainer = document.createElement('div');
        wheelContainer.style.cssText = 'position:relative;width:400px;height:420px;margin:0 auto 20px;';

        var pointer = document.createElement('div');
        pointer.style.cssText = 'position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:25px solid #ffd700;z-index:10;filter:drop-shadow(0 0 5px rgba(255,215,0,0.8));';
        wheelContainer.appendChild(pointer);

        var canvas = document.createElement('canvas');
        canvas.id = 'daily-wheel-canvas';
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.cssText = 'display:block;margin:0 auto;';
        wheelContainer.appendChild(canvas);

        container.appendChild(wheelContainer);

        var spinBtn = document.createElement('button');
        spinBtn.id = 'daily-wheel-spin-btn';
        spinBtn.textContent = 'SPIN';
        spinBtn.style.cssText = 'width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg, #ffd700, #ff8c00);border:3px solid #fff;color:#000;font-weight:bold;font-size:24px;cursor:pointer;margin:0 auto;display:block;box-shadow:0 0 20px rgba(255,215,0,0.5),inset -2px -2px 5px rgba(0,0,0,0.3);transition:transform 0.2s;';
        spinBtn.addEventListener('mouseover', function() { this.style.transform = 'scale(1.05)'; });
        spinBtn.addEventListener('mouseout', function() { this.style.transform = 'scale(1)'; });
        spinBtn.addEventListener('click', performSpin);
        container.appendChild(spinBtn);

        var resultDiv = document.createElement('div');
        resultDiv.id = 'daily-wheel-result';
        resultDiv.style.cssText = 'margin-top:20px;text-align:center;color:#ffd700;font-size:24px;font-weight:bold;display:none;min-height:60px;';
        container.appendChild(resultDiv);

        var countdownDiv = document.createElement('div');
        countdownDiv.id = 'daily-wheel-countdown';
        countdownDiv.style.cssText = 'margin-top:15px;text-align:center;color:#ff8c00;font-size:14px;display:none;';
        container.appendChild(countdownDiv);

        modal.appendChild(container);
        document.body.appendChild(modal);
        return modal;
    }

    function drawWheel() {
        var canvas = document.getElementById('daily-wheel-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var centerX = canvas.width / 2;
        var centerY = canvas.height / 2;
        var radius = 180;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(wheelData.currentRotation * Math.PI / 180);

        var sliceAngle = 360 / PRIZES.length;
        for (var i = 0; i < PRIZES.length; i++) {
            var startAngle = (i * sliceAngle) * Math.PI / 180;
            var endAngle = ((i + 1) * sliceAngle) * Math.PI / 180;

            ctx.fillStyle = COLORS[i];
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            var textAngle = (startAngle + endAngle) / 2;
            var textX = Math.cos(textAngle) * (radius * 0.65);
            var textY = Math.sin(textAngle) * (radius * 0.65);

            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(PRIZES[i], 0, 0);
            ctx.restore();
        }

        ctx.restore();

        ctx.fillStyle = 'rgba(255,215,0,0.9)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPIN', centerX, centerY);
    }

    function getSegmentPrizeValue(segment) {
        if (segment < 0 || segment >= PRIZES.length) return 0;
        var prizeStr = PRIZES[segment].replace('$', '');
        return parseFloat(prizeStr);
    }

    async function performSpin() {
        if (wheelData.spinInProgress || !wheelState.canSpin) {
            console.warn('Spin already in progress or wheel not available');
            return;
        }

        wheelData.spinInProgress = true;
        var spinBtn = document.getElementById('daily-wheel-spin-btn');
        if (spinBtn) spinBtn.disabled = true;

        try {
            var result = await api(API_ENDPOINT + '/spin', { method: 'POST' });
            if (!result || result.error) {
                console.warn('Spin API error:', result ? result.error : 'no response');
                wheelData.spinInProgress = false;
                if (spinBtn) spinBtn.disabled = false;
                return;
            }

            wheelData.winningSegment = result.segment || 0;
            animateSpin(wheelData.winningSegment, result.prize || 0);
        } catch (e) {
            console.warn('Spin request failed:', e.message);
            wheelData.spinInProgress = false;
            if (spinBtn) spinBtn.disabled = false;
        }
    }

    function animateSpin(winningSegment, prizeAmount) {
        var sliceAngle = 360 / PRIZES.length;
        var segmentAngleStart = winningSegment * sliceAngle;
        var segmentAngleEnd = (winningSegment + 1) * sliceAngle;
        var segmentCenter = (segmentAngleStart + segmentAngleEnd) / 2;

        var targetRotation = 3600 + (360 - segmentCenter);

        var startTime = Date.now();
        var duration = 4500;
        var startRotation = wheelData.currentRotation;

        var easeOutCubic = function(t) {
            return 1 - Math.pow(1 - t, 3);
        };

        var animate = function() {
            var now = Date.now();
            var elapsed = now - startTime;
            var progress = Math.min(elapsed / duration, 1);

            wheelData.currentRotation = startRotation + (targetRotation - startRotation) * easeOutCubic(progress);
            drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                wheelData.currentRotation = targetRotation;
                drawWheel();
                wheelData.spinInProgress = false;
                showWinResult(winningSegment, prizeAmount);
                updateWheelState();
            }
        };

        animate();
    }

    function showWinResult(segment, prizeAmount) {
        var resultDiv = document.getElementById('daily-wheel-result');
        if (!resultDiv) return;

        resultDiv.style.display = 'block';
        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight;
        resultDiv.style.animation = 'popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        resultDiv.innerHTML = 'You won $' + prizeAmount.toFixed(2) + '!';

        createConfetti();

        if (typeof updateBalance === 'function') {
            updateBalance(prizeAmount);
        }

        wheelState.canSpin = false;
        var spinBtn = document.getElementById('daily-wheel-spin-btn');
        if (spinBtn) spinBtn.disabled = true;

        setTimeout(function() {
            showCountdown();
        }, 1500);
    }

    function createConfetti() {
        for (var i = 0; i < 30; i++) {
            var confetti = document.createElement('div');
            confetti.style.cssText = 'position:fixed;width:10px;height:10px;border-radius:50%;pointer-events:none;';

            var colors = ['#ffd700', '#ff8c00', '#4a148c', '#1a237e'];
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            var startX = Math.random() * window.innerWidth;
            var startY = window.innerHeight / 2;
            confetti.style.left = startX + 'px';
            confetti.style.top = startY + 'px';

            var tx = (Math.random() - 0.5) * 400;
            var ty = (Math.random() - 0.5) * 600 - 200;
            confetti.style.setProperty('--tx', tx + 'px');
            confetti.style.setProperty('--ty', ty + 'px');

            confetti.style.animation = 'confetti 2s ease-out forwards';

            document.body.appendChild(confetti);
            setTimeout(function(c) {
                c.remove();
            }, 2000, confetti);
        }
    }

    function showCountdown() {
        var countdownDiv = document.getElementById('daily-wheel-countdown');
        if (!countdownDiv) return;

        countdownDiv.style.display = 'block';
        countdownDiv.innerHTML = '<div>Come back tomorrow!</div>';

        if (wheelState.nextAvailableAt) {
            var updateCountdown = function() {
                var now = Date.now();
                var timeLeft = wheelState.nextAvailableAt - now;

                if (timeLeft <= 0) {
                    countdownDiv.innerHTML = '<div>Wheel is now available!</div>';
                    return;
                }

                var hours = Math.floor(timeLeft / 3600000);
                var minutes = Math.floor((timeLeft % 3600000) / 60000);
                var seconds = Math.floor((timeLeft % 60000) / 1000);

                countdownDiv.innerHTML = '<div>Next spin in: ' + hours + 'h ' + minutes + 'm ' + seconds + 's</div>';
            };

            updateCountdown();
            var countdownInterval = setInterval(updateCountdown, 1000);

            var modal = document.getElementById('daily-wheel-modal');
            if (modal && modal._countdownInterval) {
                clearInterval(modal._countdownInterval);
            }
            if (modal) modal._countdownInterval = countdownInterval;
        }
    }

    function updateStreakDisplay() {
        var streakDiv = document.getElementById('daily-wheel-streak');
        if (!streakDiv) return;

        var daysCompleted = Math.min(wheelState.streak, 7);
        var dots = '';
        for (var i = 0; i < 7; i++) {
            if (i < daysCompleted) {
                dots += '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#ffd700;margin:0 3px;box-shadow:0 0 5px rgba(255,215,0,0.6);"></span>';
            } else {
                dots += '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:rgba(255,215,0,0.3);margin:0 3px;"></span>';
            }
        }

        var streakText = 'Day ' + daysCompleted + '/7';
        if (daysCompleted === 7) {
            streakText += ' <span style="display:inline-block;margin-left:10px;padding:3px 8px;background:#ff8c00;border-radius:12px;font-size:12px;font-weight:bold;">2x BONUS</span>';
        }

        streakDiv.innerHTML = '<div>' + streakText + '</div><div style="margin-top:8px;">' + dots + '</div>';
    }

    function showWheel() {
        var modal = document.getElementById('daily-wheel-modal');
        if (!modal) {
            modal = createModal();
        }

        modal.style.display = 'flex';
        updateStreakDisplay();
        drawWheel();

        var spinBtn = document.getElementById('daily-wheel-spin-btn');
        if (spinBtn) {
            spinBtn.disabled = !wheelState.canSpin;
        }

        var resultDiv = document.getElementById('daily-wheel-result');
        if (resultDiv) {
            resultDiv.style.display = 'none';
            resultDiv.innerHTML = '';
        }

        var countdownDiv = document.getElementById('daily-wheel-countdown');
        if (countdownDiv) {
            countdownDiv.style.display = 'none';
            if (modal._countdownInterval) {
                clearInterval(modal._countdownInterval);
                modal._countdownInterval = null;
            }
        }
    }

    function hideWheel() {
        var modal = document.getElementById('daily-wheel-modal');
        if (modal) {
            modal.style.display = 'none';
            if (modal._countdownInterval) {
                clearInterval(modal._countdownInterval);
                modal._countdownInterval = null;
            }
        }
    }

    async function updateWheelState() {
        try {
            var status = await api(API_ENDPOINT);
            if (status) {
                wheelState.canSpin = status.canSpin || false;
                wheelState.streak = status.streak || 0;
                wheelState.lastSpin = status.lastSpin;
                wheelState.nextAvailableAt = status.nextAvailableAt ? new Date(status.nextAvailableAt).getTime() : null;
                updateBadgeVisibility();
                updateStreakDisplay();
            }
        } catch (e) {
            console.warn('Failed to update wheel state:', e.message);
        }
    }

    async function init() {
        try {
            await updateWheelState();
            createBadge();
            createModal();
        } catch (e) {
            console.warn('Daily wheel initialization failed:', e.message);
        }
    }

    window.DailyWheel = {
        init: init,
        showWheel: showWheel
    };
})();
