(function() {
    'use strict';

    var ELEMENT_ID = 'luckyNumberGame2';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_luckyNumber2';
    var NUM_COUNT = 10;
    var SHUFFLE_DURATION = 2000;
    var SHUFFLE_INTERVAL = 80;

    var overlayEl = null;

    function getTodayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function hasPlayedToday() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            return saved === getTodayKey();
        } catch (e) {
            return false;
        }
    }

    function markPlayed() {
        try {
            localStorage.setItem(STORAGE_KEY, getTodayKey());
        } catch (e) { /* silent */ }
    }

    function creditBalance(amount) {
        if (typeof balance !== 'undefined') {
            balance += amount;
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
        }
    }

    function formatCurrency(val) {
        return '$' + val.toFixed(2);
    }

    function showGame() {
        if (document.getElementById(ELEMENT_ID)) return;

        overlayEl = document.createElement('div');
        overlayEl.id = ELEMENT_ID;
        overlayEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
            'background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;' +
            'z-index:' + Z_INDEX + ';font-family:Arial,sans-serif;opacity:0;transition:opacity 0.4s ease;';

        var style = document.createElement('style');
        style.textContent = '@keyframes luckyBounceIn{0%{transform:scale(0.3);opacity:0}' +
            '60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}' +
            '@keyframes luckyGlow{0%{box-shadow:0 0 8px rgba(155,89,182,0.4)}' +
            '100%{box-shadow:0 0 24px rgba(155,89,182,0.9)}}' +
            '@keyframes luckyWinPulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}';
        overlayEl.appendChild(style);

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e 0%,#2d1b4e 50%,#16213e 100%);' +
            'border:2px solid #9b59b6;border-radius:20px;padding:28px;text-align:center;color:#fff;' +
            'max-width:400px;width:92%;box-shadow:0 8px 40px rgba(155,89,182,0.4);' +
            'animation:luckyBounceIn 0.6s ease forwards;';

        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:24px;font-weight:bold;color:#ffd700;margin-bottom:6px;';
        titleEl.textContent = '\uD83D\uDD2E Lucky Number';
        card.appendChild(titleEl);

        var subtitleEl = document.createElement('div');
        subtitleEl.style.cssText = 'font-size:13px;color:#bbb;margin-bottom:20px;';
        subtitleEl.textContent = 'Pick your lucky number!';
        card.appendChild(subtitleEl);

        var gridEl = document.createElement('div');
        gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;';

        var circles = [];
        var playerPick = null;
        var revealed = false;

        for (var i = 1; i <= NUM_COUNT; i++) {
            (function(num) {
                var circle = document.createElement('div');
                circle.style.cssText = 'width:54px;height:54px;border-radius:50%;' +
                    'background:linear-gradient(135deg,#2d1b4e 0%,#3d2b5e 100%);' +
                    'border:2px solid #9b59b6;display:flex;align-items:center;justify-content:center;' +
                    'font-size:20px;font-weight:bold;color:#e8d5f5;cursor:pointer;' +
                    'transition:all 0.25s ease;user-select:none;margin:0 auto;';
                circle.textContent = String(num);
                circle.addEventListener('mouseenter', function() {
                    if (!revealed && playerPick === null) {
                        circle.style.borderColor = '#ffd700';
                        circle.style.transform = 'scale(1.1)';
                    }
                });
                circle.addEventListener('mouseleave', function() {
                    if (!revealed && playerPick === null) {
                        circle.style.borderColor = '#9b59b6';
                        circle.style.transform = 'scale(1)';
                    }
                });
                circle.addEventListener('click', function() {
                    if (revealed || playerPick !== null) return;
                    playerPick = num;
                    circle.style.background = 'linear-gradient(135deg,#6c3483 0%,#9b59b6 100%)';
                    circle.style.borderColor = '#ffd700';
                    circle.style.transform = 'scale(1.1)';
                    circle.style.color = '#ffd700';
                    startReveal();
                });
                circles.push({ el: circle, num: num });
                gridEl.appendChild(circle);
            })(i);
        }

        card.appendChild(gridEl);

        var resultEl = document.createElement('div');
        resultEl.style.cssText = 'font-size:16px;color:#bbb;min-height:28px;margin-bottom:16px;';
        resultEl.textContent = 'Tap a number to play';
        card.appendChild(resultEl);

        var collectBtn = document.createElement('button');
        collectBtn.style.cssText = 'background:linear-gradient(135deg,#daa520 0%,#ffd700 100%);color:#1a1a2e;' +
            'border:none;border-radius:8px;padding:12px 32px;font-size:16px;font-weight:bold;cursor:pointer;' +
            'display:none;transition:transform 0.2s,box-shadow 0.2s;';
        collectBtn.textContent = 'Collect';
        collectBtn.addEventListener('mouseenter', function() {
            collectBtn.style.transform = 'scale(1.05)';
            collectBtn.style.boxShadow = '0 4px 16px rgba(255,215,0,0.5)';
        });
        collectBtn.addEventListener('mouseleave', function() {
            collectBtn.style.transform = 'scale(1)';
            collectBtn.style.boxShadow = 'none';
        });
        card.appendChild(collectBtn);

        overlayEl.appendChild(card);
        document.body.appendChild(overlayEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                overlayEl.style.opacity = '1';
            });
        });

        function startReveal() {
            resultEl.textContent = 'Revealing...';
            var winningNum = 1 + Math.floor(Math.random() * NUM_COUNT);
            var shuffleCount = Math.floor(SHUFFLE_DURATION / SHUFFLE_INTERVAL);
            var step = 0;

            var shuffleId = setInterval(function() {
                var randomHighlight = 1 + Math.floor(Math.random() * NUM_COUNT);
                for (var j = 0; j < circles.length; j++) {
                    var c = circles[j];
                    if (c.num === playerPick) continue;
                    if (c.num === randomHighlight) {
                        c.el.style.background = 'linear-gradient(135deg,#3d5a80 0%,#5a8ab5 100%)';
                    } else {
                        c.el.style.background = 'linear-gradient(135deg,#2d1b4e 0%,#3d2b5e 100%)';
                    }
                }
                step++;
                if (step >= shuffleCount) {
                    clearInterval(shuffleId);
                    finishReveal(winningNum);
                }
            }, SHUFFLE_INTERVAL);
        }

        function finishReveal(winningNum) {
            revealed = true;
            for (var j = 0; j < circles.length; j++) {
                var c = circles[j];
                if (c.num === playerPick) continue;
                c.el.style.background = 'linear-gradient(135deg,#2d1b4e 0%,#3d2b5e 100%)';
                c.el.style.cursor = 'default';
            }

            var winCircle = circles[winningNum - 1];
            if (winningNum !== playerPick) {
                winCircle.el.style.background = 'linear-gradient(135deg,#e74c3c 0%,#c0392b 100%)';
                winCircle.el.style.borderColor = '#ff6b6b';
                winCircle.el.style.color = '#fff';
                winCircle.el.style.transform = 'scale(1.15)';
            }

            var diff = Math.abs(playerPick - winningNum);
            var prize = 0;
            var msg = '';

            if (diff === 0) {
                prize = 5 + Math.random() * 20;
                msg = '\uD83C\uDF1F EXACT MATCH! You win ' + formatCurrency(prize) + '!';
                winCircle.el.style.background = 'linear-gradient(135deg,#2ecc71 0%,#27ae60 100%)';
                winCircle.el.style.borderColor = '#2ecc71';
                winCircle.el.style.animation = 'luckyWinPulse 0.5s ease 3';
            } else if (diff === 1) {
                prize = 1 + Math.random() * 4;
                msg = '\u2728 So close! Adjacent number! You win ' + formatCurrency(prize) + '!';
                circles[playerPick - 1].el.style.borderColor = '#ffd700';
                winCircle.el.style.borderColor = '#ffd700';
            } else {
                prize = 0.25;
                msg = 'Not this time. Consolation: ' + formatCurrency(prize);
                circles[playerPick - 1].el.style.borderColor = '#666';
            }

            resultEl.style.color = diff === 0 ? '#2ecc71' : (diff === 1 ? '#ffd700' : '#999');
            resultEl.style.fontWeight = 'bold';
            resultEl.textContent = msg;

            collectBtn.textContent = 'Collect ' + formatCurrency(prize);
            collectBtn.style.display = 'inline-block';

            var prizeToCredit = prize;
            collectBtn.addEventListener('click', function() {
                creditBalance(prizeToCredit);
                markPlayed();
                dismissOverlay();
            });
        }
    }

    function dismissOverlay() {
        if (!overlayEl) return;
        overlayEl.style.opacity = '0';
        var el = overlayEl;
        setTimeout(function() {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 500);
        overlayEl = null;
    }

    function init() {
        if (hasPlayedToday()) return;
        showGame();
    }

    function cleanup() {
        dismissOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 7000);
        });
    } else {
        setTimeout(init, 7000);
    }

    window._luckyNumber2 = { cleanup: cleanup, show: showGame };
})();
