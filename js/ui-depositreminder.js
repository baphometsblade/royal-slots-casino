(function() {
    'use strict';

    var ELEMENT_ID = 'depositReminder';
    var Z_INDEX = 10400;
    var BALANCE_THRESHOLD = 5;
    var POLL_INTERVAL = 30000;

    var panelEl = null;
    var hasShownThisSession = false;
    var pollTimer = null;

    function createPanel() {
        if (document.getElementById(ELEMENT_ID)) return;

        panelEl = document.createElement('div');
        panelEl.id = ELEMENT_ID;
        panelEl.style.cssText = 'position:fixed;bottom:-180px;left:50%;transform:translateX(-50%);width:380px;max-width:92%;z-index:' + Z_INDEX + ';font-family:Arial,Helvetica,sans-serif;transition:bottom 0.6s ease;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ffd700;border-radius:14px 14px 0 0;padding:20px;box-shadow:0 -4px 25px rgba(255,215,0,0.25),0 -2px 15px rgba(0,0,0,0.5);text-align:center;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:32px;margin-bottom:8px;';
        icon.textContent = '\uD83D\uDCB0';

        var message = document.createElement('div');
        message.style.cssText = 'color:#fff;font-size:15px;margin-bottom:16px;line-height:1.4;';
        message.textContent = 'Running low? Top up to keep the action going!';

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;align-items:center;';

        var depositBtn = document.createElement('button');
        depositBtn.style.cssText = 'background:linear-gradient(135deg,#ffd700,#daa520);color:#1a1a2e;border:none;padding:10px 28px;font-size:15px;font-weight:bold;border-radius:8px;cursor:pointer;box-shadow:0 0 12px rgba(255,215,0,0.3);transition:transform 0.2s,box-shadow 0.2s;';
        depositBtn.textContent = 'Deposit Now';
        depositBtn.onmouseenter = function() { depositBtn.style.transform = 'scale(1.05)'; depositBtn.style.boxShadow = '0 0 20px rgba(255,215,0,0.5)'; };
        depositBtn.onmouseleave = function() { depositBtn.style.transform = 'scale(1)'; depositBtn.style.boxShadow = '0 0 12px rgba(255,215,0,0.3)'; };
        depositBtn.addEventListener('click', function() {
            hidePanel();
        });

        var dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = 'background:transparent;color:#888;border:1px solid #444;padding:8px 16px;font-size:12px;border-radius:6px;cursor:pointer;transition:color 0.2s,border-color 0.2s;';
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.onmouseenter = function() { dismissBtn.style.color = '#ccc'; dismissBtn.style.borderColor = '#777'; };
        dismissBtn.onmouseleave = function() { dismissBtn.style.color = '#888'; dismissBtn.style.borderColor = '#444'; };
        dismissBtn.addEventListener('click', function() {
            hidePanel();
        });

        btnRow.appendChild(depositBtn);
        btnRow.appendChild(dismissBtn);

        card.appendChild(icon);
        card.appendChild(message);
        card.appendChild(btnRow);
        panelEl.appendChild(card);
        document.body.appendChild(panelEl);
    }

    function showPanel() {
        createPanel();
        if (panelEl) {
            panelEl.style.bottom = '0';
            hasShownThisSession = true;
        }
    }

    function hidePanel() {
        if (panelEl) {
            panelEl.style.bottom = '-180px';
        }
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function checkBalance() {
        if (hasShownThisSession) return;
        if (typeof balance !== 'undefined' && balance < BALANCE_THRESHOLD) {
            showPanel();
        }
    }

    function init() {
        createPanel();
        pollTimer = setInterval(checkBalance, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 10000);
        });
    } else {
        setTimeout(init, 10000);
    }
})();
