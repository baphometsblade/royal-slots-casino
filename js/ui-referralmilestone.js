/**
 * Sprint 63 — Referral Milestone Progress Bar
 * Fixed bottom bar showing referral milestone progress.
 */
(function() {
    'use strict';

    var ELEMENT_ID = 'referralMilestoneBar';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_referralCount';
    var BAR_HEIGHT = 36;
    var MILESTONES = [
        { count: 3, reward: 5 },
        { count: 5, reward: 15 },
        { count: 10, reward: 50 },
        { count: 25, reward: 200 }
    ];

    function getReferralCount() {
        return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    }

    function getNextMilestone(count) {
        for (var i = 0; i < MILESTONES.length; i++) {
            if (count < MILESTONES[i].count) return MILESTONES[i];
        }
        return null;
    }

    function getProgressPct(count) {
        var next = getNextMilestone(count);
        if (!next) return 100;
        var prev = 0;
        for (var i = 0; i < MILESTONES.length; i++) {
            if (MILESTONES[i].count === next.count) break;
            prev = MILESTONES[i].count;
        }
        return Math.min(100, Math.round(((count - prev) / (next.count - prev)) * 100));
    }

    function createBar() {
        if (document.getElementById(ELEMENT_ID)) return;

        var referralCount = getReferralCount();
        var isExpanded = false;

        var container = document.createElement('div');
        container.id = ELEMENT_ID;
        container.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:' + Z_INDEX + ';'
            + 'font-family:system-ui,-apple-system,sans-serif;user-select:none;';

        // Collapsed bar
        var bar = document.createElement('div');
        bar.style.cssText = 'height:' + BAR_HEIGHT + 'px;background:linear-gradient(90deg,#1a1a2e,#16213e);'
            + 'display:flex;align-items:center;padding:0 16px;cursor:pointer;'
            + 'border-top:1px solid rgba(255,215,0,0.2);transition:background 0.2s;';

        var nextMs = getNextMilestone(referralCount);
        var progressPct = getProgressPct(referralCount);

        var icon = document.createElement('span');
        icon.style.cssText = 'font-size:16px;margin-right:8px;';
        icon.textContent = '\uD83D\uDC65';

        var textEl = document.createElement('span');
        textEl.style.cssText = 'font-size:12px;color:#ccc;margin-right:12px;white-space:nowrap;';
        if (nextMs) {
            textEl.textContent = 'Referrals: ' + referralCount + '/' + nextMs.count
                + ' \u2192 $' + nextMs.reward + ' Bonus';
        } else {
            textEl.textContent = 'Referrals: ' + referralCount + ' \u2014 All milestones complete!';
        }

        var progressTrack = document.createElement('div');
        progressTrack.style.cssText = 'flex:1;height:8px;background:rgba(255,255,255,0.1);'
            + 'border-radius:4px;overflow:hidden;margin-right:12px;';

        var progressFill = document.createElement('div');
        progressFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#ffd700,#daa520);'
            + 'border-radius:4px;transition:width 0.5s ease;width:' + progressPct + '%;';

        progressTrack.appendChild(progressFill);

        var arrow = document.createElement('span');
        arrow.style.cssText = 'font-size:12px;color:#888;transition:transform 0.3s;';
        arrow.textContent = '\u25B2';

        bar.appendChild(icon);
        bar.appendChild(textEl);
        bar.appendChild(progressTrack);
        bar.appendChild(arrow);

        // Expanded panel
        var expandedPanel = document.createElement('div');
        expandedPanel.style.cssText = 'max-height:0;overflow:hidden;transition:max-height 0.4s ease;'
            + 'background:linear-gradient(180deg,#16213e,#1a1a2e);border-top:1px solid rgba(255,215,0,0.15);';

        var panelInner = document.createElement('div');
        panelInner.style.cssText = 'padding:16px 20px;';

        var panelTitle = document.createElement('div');
        panelTitle.style.cssText = 'font-size:14px;font-weight:700;color:#ffd700;margin-bottom:12px;';
        panelTitle.textContent = 'Referral Milestones';

        panelInner.appendChild(panelTitle);

        for (var i = 0; i < MILESTONES.length; i++) {
            var ms = MILESTONES[i];
            var isComplete = referralCount >= ms.count;

            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;padding:8px 0;'
                + 'border-bottom:1px solid rgba(255,255,255,0.05);';

            var check = document.createElement('span');
            check.style.cssText = 'font-size:16px;margin-right:10px;width:22px;text-align:center;';
            check.textContent = isComplete ? '\u2705' : '\u2B1C';

            var msText = document.createElement('span');
            msText.style.cssText = 'flex:1;font-size:13px;color:' + (isComplete ? '#2ecc71' : '#ccc') + ';';
            msText.textContent = ms.count + ' referrals';

            var msReward = document.createElement('span');
            msReward.style.cssText = 'font-size:13px;font-weight:700;color:' + (isComplete ? '#2ecc71' : '#ffd700') + ';';
            msReward.textContent = '$' + ms.reward + (isComplete ? ' \u2713' : '');

            row.appendChild(check);
            row.appendChild(msText);
            row.appendChild(msReward);
            panelInner.appendChild(row);
        }

        var shareHint = document.createElement('div');
        shareHint.style.cssText = 'margin-top:12px;font-size:11px;color:#888;text-align:center;';
        shareHint.textContent = 'Share your referral link to earn rewards!';

        panelInner.appendChild(shareHint);
        expandedPanel.appendChild(panelInner);

        bar.onmouseenter = function() {
            bar.style.background = 'linear-gradient(90deg,#1e2040,#1a2848)';
        };
        bar.onmouseleave = function() {
            bar.style.background = 'linear-gradient(90deg,#1a1a2e,#16213e)';
        };

        bar.onclick = function() {
            isExpanded = !isExpanded;
            if (isExpanded) {
                expandedPanel.style.maxHeight = '300px';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                expandedPanel.style.maxHeight = '0';
                arrow.style.transform = 'rotate(0deg)';
            }
        };

        container.appendChild(expandedPanel);
        container.appendChild(bar);
        document.body.appendChild(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createBar, 6000);
        });
    } else {
        setTimeout(createBar, 6000);
    }
})();
