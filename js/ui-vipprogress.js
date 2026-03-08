(function() {
    'use strict';

    var STORAGE_KEY = 'ms_vipProgressData';
    var XP_KEY = typeof STORAGE_KEY_XP !== 'undefined' ? STORAGE_KEY_XP : 'casinoXP';

    var TIERS = [
        { name: 'Bronze',   min: 0,     max: 999,   perk: '2% Cashback',                      color: '#cd7f32' },
        { name: 'Silver',   min: 1000,  max: 4999,  perk: '5% Cashback + Priority',            color: '#c0c0c0' },
        { name: 'Gold',     min: 5000,  max: 14999, perk: '10% Cashback + Free Spins',         color: '#ffd700' },
        { name: 'Platinum', min: 15000, max: 49999, perk: '15% Cashback + VIP Host',           color: '#e5e4e2' },
        { name: 'Diamond',  min: 50000, max: Infinity, perk: '25% Cashback + Exclusive',       color: '#b9f2ff' }
    ];

    var CIRCLE_CIRCUMFERENCE = 175.93;
    var _currentXP = 0;

    function _isQA() {
        return window.location.search.indexOf('noBonus=1') !== -1;
    }

    function _getTier(xp) {
        for (var i = TIERS.length - 1; i >= 0; i--) {
            if (xp >= TIERS[i].min) return { tier: TIERS[i], index: i };
        }
        return { tier: TIERS[0], index: 0 };
    }

    function _getProgressPct(xp, tier) {
        if (tier.max === Infinity) return 100;
        var range = tier.max - tier.min + 1;
        var progress = xp - tier.min;
        return Math.min(100, Math.round((progress / range) * 100));
    }

    function _loadXP() {
        var stored = localStorage.getItem(XP_KEY);
        if (!stored) return 0;
        try {
            var parsed = JSON.parse(stored);
            if (typeof parsed === 'object' && parsed !== null && typeof parsed.xp === 'number') {
                return parsed.xp;
            }
            if (typeof parsed === 'number') return parsed;
            return 0;
        } catch (e) {
            var num = parseInt(stored, 10);
            return isNaN(num) ? 0 : num;
        }
    }

    function _saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp: _currentXP, ts: Date.now() }));
        } catch (e) { /* quota */ }
    }

    function _ensureContainer() {
        var el = document.getElementById('vipProgressMeter');
        if (el) return el;

        el = document.createElement('div');
        el.id = 'vipProgressMeter';
        el.className = 'vip-progress-meter';

        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '56');
        svg.setAttribute('height', '56');
        svg.setAttribute('viewBox', '0 0 60 60');

        var bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('cx', '30');
        bgCircle.setAttribute('cy', '30');
        bgCircle.setAttribute('r', '28');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        bgCircle.setAttribute('stroke-width', '4');
        svg.appendChild(bgCircle);

        var progress = document.createElementNS(svgNS, 'circle');
        progress.id = 'vpmProgress';
        progress.setAttribute('cx', '30');
        progress.setAttribute('cy', '30');
        progress.setAttribute('r', '28');
        progress.setAttribute('fill', 'none');
        progress.setAttribute('stroke', '#ffd700');
        progress.setAttribute('stroke-width', '4');
        progress.setAttribute('stroke-dasharray', String(CIRCLE_CIRCUMFERENCE));
        progress.setAttribute('stroke-dashoffset', String(CIRCLE_CIRCUMFERENCE));
        progress.setAttribute('stroke-linecap', 'round');
        progress.setAttribute('transform', 'rotate(-90 30 30)');
        svg.appendChild(progress);

        var levelText = document.createElementNS(svgNS, 'text');
        levelText.id = 'vpmLevel';
        levelText.setAttribute('x', '30');
        levelText.setAttribute('y', '34');
        levelText.setAttribute('text-anchor', 'middle');
        levelText.setAttribute('fill', '#fff');
        levelText.setAttribute('font-size', '14');
        levelText.setAttribute('font-weight', 'bold');
        levelText.textContent = '1';
        svg.appendChild(levelText);

        el.appendChild(svg);

        var info = document.createElement('div');
        info.className = 'vpm-info';

        var tierName = document.createElement('span');
        tierName.id = 'vpmTierName';
        tierName.className = 'vpm-tier-name';
        tierName.textContent = 'Bronze';
        info.appendChild(tierName);

        var xpLabel = document.createElement('span');
        xpLabel.id = 'vpmXP';
        xpLabel.className = 'vpm-xp';
        xpLabel.textContent = '0 XP';
        info.appendChild(xpLabel);

        var perkLabel = document.createElement('span');
        perkLabel.id = 'vpmNextPerk';
        perkLabel.className = 'vpm-next-perk';
        perkLabel.textContent = '';
        info.appendChild(perkLabel);

        el.appendChild(info);
        document.body.appendChild(el);
        return el;
    }

    function _render() {
        var result = _getTier(_currentXP);
        var tier = result.tier;
        var idx = result.index;
        var pct = _getProgressPct(_currentXP, tier);
        var offset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * pct / 100);

        var progressEl = document.getElementById('vpmProgress');
        if (progressEl) {
            progressEl.setAttribute('stroke-dashoffset', String(offset));
            progressEl.setAttribute('stroke', tier.color);
        }

        var levelEl = document.getElementById('vpmLevel');
        if (levelEl) levelEl.textContent = String(idx + 1);

        var tierEl = document.getElementById('vpmTierName');
        if (tierEl) {
            tierEl.textContent = tier.name;
            tierEl.style.color = tier.color;
        }

        var xpEl = document.getElementById('vpmXP');
        if (xpEl) xpEl.textContent = _currentXP.toLocaleString() + ' XP';

        var perkEl = document.getElementById('vpmNextPerk');
        if (perkEl) {
            if (idx < TIERS.length - 1) {
                perkEl.textContent = 'Next: ' + TIERS[idx + 1].perk;
            } else {
                perkEl.textContent = '\u2B50 Max Tier \u2014 ' + tier.perk;
            }
        }
    }

    window._vipProgressTrackXP = function(xpGain) {
        if (!xpGain || xpGain <= 0) return;
        _currentXP += xpGain;
        try { localStorage.setItem(XP_KEY, String(_currentXP)); } catch (e) { /* quota */ }
        _saveData();
        _render();
    };

    function _init() {
        if (_isQA()) return;
        _currentXP = _loadXP();
        _ensureContainer();
        _render();
        _saveData();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
