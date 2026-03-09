(function() {
    'use strict';

    var ELEMENT_ID = 'lossRecoveryWheel';
    var Z_INDEX = 10400;
    var LOSS_THRESHOLD = 5;
    var SEGMENTS = [
        { label: '10% Back', pct: 0.10 },
        { label: '25% Back', pct: 0.25 },
        { label: '50% Back', pct: 0.50 },
        { label: 'Free Spin', pct: 0 },
        { label: 'Better Luck', pct: 0 },
        { label: '5% Back', pct: 0.05 }
    ];
    var SEGMENT_COLORS = ['#e74c3c', '#ffd700', '#e74c3c', '#2ecc71', '#555', '#daa520'];

    var consecutiveLosses = 0;
    var totalLostAmount = 0;
    var wheelShown = false;
    var lastKnownStreak = 0;
    var overlayEl = null;

    function createOverlay() {
        if (document.getElementById(ELEMENT_ID)) return;

        overlayEl = document.createElement('div');
        overlayEl.id = ELEMENT_ID;
        overlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:' + Z_INDEX + ';display:none;align-items:center;justify-content:center;flex-direction:column;font-family:Arial,Helvetica,sans-serif;';

        var container = document.createElement('div');
        container.style.cssText = 'text-align:center;padding:30px;background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ffd700;border-radius:16px;box-shadow:0 0 40px rgba(255,215,0,0.3);max-width:420px;width:90%;position:relative;';

        var title = document.createElement('h2');
        title.style.cssText = 'color:#ffd700;font-size:24px;margin:0 0 8px 0;text-shadow:0 0 10px rgba(255,215,0,0.5);';
        title.textContent = 'Recovery Wheel';

        var subtitle = document.createElement('p');
        subtitle.style.cssText = 'color:#ccc;font-size:14px;margin:0 0 20px 0;';
        subtitle.textContent = 'Tough streak! Spin for a chance to recover some losses.';

        var wheelWrap = document.createElement('div');
        wheelWrap.style.cssText = 'position:relative;width:260px;height:260px;margin:0 auto 20px auto;';

        var pointer = document.createElement('div');
        pointer.style.cssText = 'position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:20px solid #ffd700;z-index:10400;filter:drop-shadow(0 0 6px rgba(255,215,0,0.7));';

        var canvas = document.createElement('canvas');
        canvas.width = 260;
        canvas.height = 260;
        canvas.style.cssText = 'width:260px;height:260px;border-radius:50%;box-shadow:0 0 20px rgba(255,215,0,0.4);transition:transform 3s cubic-bezier(0.17,0.67,0.12,0.99);';
        canvas.setAttribute('data-rotation', '0');

        drawWheel(canvas);

        wheelWrap.appendChild(pointer);
        wheelWrap.appendChild(canvas);

        var spinBtn = document.createElement('button');
        spinBtn.style.cssText = 'background:linear-gradient(135deg,#ffd700,#daa520);color:#1a1a2e;border:none;padding:14px 36px;font-size:18px;font-weight:bold;border-radius:8px;cursor:pointer;text-transform:uppercase;letter-spacing:1px;box-shadow:0 0 15px rgba(255,215,0,0.4);transition:transform 0.2s,box-shadow 0.2s;';
        spinBtn.textContent = 'SPIN THE WHEEL';
        spinBtn.onmouseenter = function() { spinBtn.style.transform = 'scale(1.05)'; spinBtn.style.boxShadow = '0 0 25px rgba(255,215,0,0.6)'; };
        spinBtn.onmouseleave = function() { spinBtn.style.transform = 'scale(1)'; spinBtn.style.boxShadow = '0 0 15px rgba(255,215,0,0.4)'; };

        var resultDiv = document.createElement('div');
        resultDiv.style.cssText = 'color:#ffd700;font-size:20px;font-weight:bold;margin-top:16px;min-height:28px;text-shadow:0 0 8px rgba(255,215,0,0.5);';

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = 'display:none;background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff;border:none;padding:12px 32px;font-size:16px;font-weight:bold;border-radius:8px;cursor:pointer;margin-top:12px;box-shadow:0 0 12px rgba(46,204,113,0.4);transition:transform 0.2s;';
        claimBtn.textContent = 'CLAIM REWARD';
        claimBtn.onmouseenter = function() { claimBtn.style.transform = 'scale(1.05)'; };
        claimBtn.onmouseleave = function() { claimBtn.style.transform = 'scale(1)'; };

        spinBtn.addEventListener('click', function() {
            if (spinBtn.disabled) return;
            spinBtn.disabled = true;
            spinBtn.style.opacity = '0.5';
            spinBtn.style.cursor = 'default';

            var segCount = SEGMENTS.length;
            var segAngle = 360 / segCount;
            var winIndex = weightedRandom();
            var extraRotations = (3 + Math.floor(Math.random() * 4)) * 360;
            var targetAngle = extraRotations + (360 - (winIndex * segAngle + segAngle / 2));
            var currentRot = parseFloat(canvas.getAttribute('data-rotation')) || 0;
            var finalRot = currentRot + targetAngle;

            canvas.style.transform = 'rotate(' + finalRot + 'deg)';
            canvas.setAttribute('data-rotation', String(finalRot));

            setTimeout(function() {
                var seg = SEGMENTS[winIndex];
                var reward = 0;
                if (seg.label === 'Free Spin') {
                    resultDiv.textContent = 'You won a FREE SPIN!';
                    resultDiv.style.color = '#2ecc71';
                } else if (seg.label === 'Better Luck') {
                    resultDiv.textContent = 'Better luck next time!';
                    resultDiv.style.color = '#e74c3c';
                } else {
                    reward = Math.round(totalLostAmount * seg.pct * 100) / 100;
                    if (reward < 0.01) reward = 0.50;
                    resultDiv.textContent = seg.label + ' — $' + reward.toFixed(2) + ' recovered!';
                    resultDiv.style.color = '#2ecc71';
                }

                claimBtn.style.display = 'inline-block';
                claimBtn.onclick = function() {
                    if (reward > 0) {
                        if (typeof balance !== 'undefined') {
                            balance += reward;
                            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                        }
                    }
                    hideOverlay();
                    consecutiveLosses = 0;
                    totalLostAmount = 0;
                    wheelShown = false;
                };
            }, 3200);
        });

        container.appendChild(title);
        container.appendChild(subtitle);
        container.appendChild(wheelWrap);
        container.appendChild(spinBtn);
        container.appendChild(resultDiv);
        container.appendChild(claimBtn);
        overlayEl.appendChild(container);
        document.body.appendChild(overlayEl);
    }

    function drawWheel(canvas) {
        var ctx = canvas.getContext('2d');
        var cx = 130, cy = 130, r = 125;
        var segCount = SEGMENTS.length;
        var segAngle = (2 * Math.PI) / segCount;

        for (var i = 0; i < segCount; i++) {
            var startAngle = i * segAngle - Math.PI / 2;
            var endAngle = startAngle + segAngle;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = SEGMENT_COLORS[i];
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(startAngle + segAngle / 2);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(SEGMENTS[i].label, r * 0.6, 0);
            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function weightedRandom() {
        var weights = [20, 15, 5, 10, 30, 20];
        var total = 0;
        for (var i = 0; i < weights.length; i++) total += weights[i];
        var r = Math.random() * total;
        var cum = 0;
        for (var j = 0; j < weights.length; j++) {
            cum += weights[j];
            if (r <= cum) return j;
        }
        return weights.length - 1;
    }

    function showOverlay() {
        createOverlay();
        if (overlayEl) {
            overlayEl.style.display = 'flex';
            wheelShown = true;
        }
    }

    function hideOverlay() {
        if (overlayEl) {
            overlayEl.style.display = 'none';
        }
    }

    function checkLossStreak() {
        var currentStreak = typeof window._winStreak !== 'undefined' ? window._winStreak : 0;

        if (currentStreak < lastKnownStreak && currentStreak < 0) {
            consecutiveLosses = Math.abs(currentStreak);
            totalLostAmount += (typeof window._lastBetAmount !== 'undefined' ? window._lastBetAmount : 1);
        } else if (currentStreak >= 0 && lastKnownStreak < 0) {
            consecutiveLosses = 0;
            totalLostAmount = 0;
        } else if (currentStreak < 0) {
            consecutiveLosses = Math.abs(currentStreak);
        }

        lastKnownStreak = currentStreak;

        if (consecutiveLosses >= LOSS_THRESHOLD && !wheelShown) {
            showOverlay();
        }
    }

    function init() {
        setInterval(checkLossStreak, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 4000);
        });
    } else {
        setTimeout(init, 4000);
    }
})();
